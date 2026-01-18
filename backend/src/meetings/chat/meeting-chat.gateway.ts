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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

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

    constructor(
        private readonly meetingChatService: MeetingChatService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

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

            // 2. Fetch sender's profile image
            const sender = await this.userRepository.findOne({ where: { id: data.senderId } });
            const senderProfileImage = sender?.profileImage || null;

            // 3. Process translations
            const translations = await this.meetingChatService.processTranslations(
                data.meetingId,
                data.content,
                data.sourceLanguage,
            );

            // 4. Update message with translations (async)
            await this.meetingChatService.updateMessageTranslations(savedMessage.id, translations);

            // 5. Construct payload with profile image
            const payload = {
                id: savedMessage.id,
                senderId: data.senderId,
                senderName: data.senderName,
                senderProfileImage, // Include profile image
                content: data.content,
                sourceLanguage: data.sourceLanguage,
                translations,
                createdAt: savedMessage.createdAt,
            };

            // 6. Broadcast to room
            this.server.to(`meeting:${data.meetingId}`).emit('meeting-chat:new_message', payload);

        } catch (error) {
            this.logger.error(`Error processing message: ${error.message}`);
            client.emit('error', { message: 'Failed to process message' });
        }
    }
}
