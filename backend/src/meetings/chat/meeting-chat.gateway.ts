import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MeetingChatService } from './meeting-chat.service';

@WebSocketGateway({
    namespace: '/workspace',
    cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true,
    },
})
export class MeetingChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(MeetingChatGateway.name);

    constructor(private readonly meetingChatService: MeetingChatService) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('meeting-chat:join_meeting')
    handleJoinMeeting(
        @MessageBody() data: { meetingId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `meeting:${data.meetingId}`;
        client.join(room);
        this.logger.log(`Client ${client.id} joined ${room}`);
    }

    @SubscribeMessage('meeting-chat:send_message')
    async handleSendMessage(
        @MessageBody() data: { meetingId: string; content: string; senderId: string; sourceLanguage: string; senderName: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            // 1. Save original message
            const savedMessage = await this.meetingChatService.saveMessage(
                data.meetingId,
                data.senderId,
                data.content,
                data.sourceLanguage,
            );

            // 2. Process translations
            const translations = await this.meetingChatService.processTranslations(
                data.meetingId,
                data.content,
                data.sourceLanguage,
            );

            // 3. Update message with translations (async)
            await this.meetingChatService.updateMessageTranslations(savedMessage.id, translations);

            // 4. Construct payload
            const payload = {
                id: savedMessage.id,
                senderId: data.senderId,
                senderName: data.senderName, // Pass sender name for immediate display
                content: data.content,
                sourceLanguage: data.sourceLanguage,
                translations,
                createdAt: savedMessage.createdAt,
            };

            // 5. Broadcast to room
            this.server.to(`meeting:${data.meetingId}`).emit('meeting-chat:new_message', payload);

        } catch (error) {
            this.logger.error(`Error processing message: ${error.message}`);
            client.emit('error', { message: 'Failed to process message' });
        }
    }
}
