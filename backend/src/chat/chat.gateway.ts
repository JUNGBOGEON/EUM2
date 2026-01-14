import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

@WebSocketGateway({
    namespace: '/chat',
    cors: {
        origin: [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ],
        credentials: true,
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('ChatGateway');

    constructor(private readonly chatService: ChatService) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_channel')
    handleJoinChannel(
        @MessageBody() data: { channelId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `channel:${data.channelId}`;
        client.join(room);
        this.logger.log(`[DEBUG] Client ${client.id} joined ${room}. Data: ${JSON.stringify(data)}`);
    }

    @SubscribeMessage('leave_channel')
    handleLeaveChannel(
        @MessageBody() data: { channelId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `channel:${data.channelId}`;
        client.leave(room);
        this.logger.log(`[DEBUG] Client ${client.id} left ${room}`);
    }

    @SubscribeMessage('send_message')
    async handleSendMessage(
        @MessageBody() data: { channelId: string; content: string; senderId: string },
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.log(`[DEBUG] Received message from ${client.id}: ${JSON.stringify(data)}`);
        try {
            // 1. Save to DB
            this.logger.log(`[DEBUG] Saving message to DB...`);
            const savedMessage = await this.chatService.saveMessage(
                data.channelId,
                data.senderId,
                data.content,
            );
            this.logger.log(`[DEBUG] Message saved with ID: ${savedMessage.id}`);

            // 2. Broadcast to room
            const fullMessage = await this.chatService.getMessageWithSender(savedMessage.id);
            const room = `channel:${data.channelId}`;
            this.logger.log(`[DEBUG] Broadcasting to room ${room}: ${JSON.stringify(fullMessage)}`);

            this.server.to(room).emit('new_message', fullMessage);
        } catch (error) {
            this.logger.error(`[DEBUG] Error sending message: ${error.message} - Stack: ${error.stack}`);
            client.emit('error', { message: 'Failed to send message' });
        }
    }
}
