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
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WorkspaceRolesService } from '../workspaces/workspace-roles.service';

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

    constructor(
        private readonly chatService: ChatService,
        @Inject(forwardRef(() => WorkspaceRolesService))
        private readonly rolesService: WorkspaceRolesService,
    ) { }

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
            // 1. Get channel to check workspace
            const channel = await this.chatService.getChannelById(data.channelId);
            if (!channel) {
                client.emit('error', { message: 'Channel not found' });
                return;
            }

            // 2. Check sendMessages permission
            const hasPermission = await this.rolesService.checkPermission(
                channel.workspaceId,
                data.senderId,
                'sendMessages',
            );

            if (!hasPermission) {
                this.logger.warn(`User ${data.senderId} does not have sendMessages permission in workspace ${channel.workspaceId}`);
                client.emit('error', { message: 'You do not have permission to send messages' });
                return;
            }

            // 3. Save to DB
            this.logger.log(`[DEBUG] Saving message to DB...`);
            const savedMessage = await this.chatService.saveMessage(
                data.channelId,
                data.senderId,
                data.content,
            );
            this.logger.log(`[DEBUG] Message saved with ID: ${savedMessage.id}`);

            // 4. Broadcast to room
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

