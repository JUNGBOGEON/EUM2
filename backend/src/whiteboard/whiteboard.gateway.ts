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
import { WhiteboardService } from './whiteboard.service';

@WebSocketGateway({
    namespace: '/whiteboard',
    transports: ['websocket', 'polling'],
})
export class WhiteboardGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly whiteboardService: WhiteboardService) { }

    private logger: Logger = new Logger('WhiteboardGateway');

    handleConnection(client: Socket) {
        console.log(`[WhiteboardGateway] Client connected: ${client.id}, Origin: ${client.handshake.headers.origin}`);
        this.logger.log(`Client connected: ${client.id}, Origin: ${client.handshake.headers.origin}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        // Notify all rooms this client was in
        for (const room of client.rooms) {
            if (room !== client.id) {
                client.to(room).emit('user_left', { socketId: client.id });
            }
        }
    }

    @SubscribeMessage('join')
    handleJoin(
        @MessageBody() data: { room: string; user?: any },
        @ConnectedSocket() client: Socket,
    ) {
        console.log(`[WhiteboardGateway] Client ${client.id} joining room ${data.room}`);
        client.join(data.room);
        this.logger.log(`Client ${client.id} joined room ${data.room}`);

        // Optional: Send initial data here if not fetched via REST? 
        // Frontend fetches via REST, so we just join room.
    }

    @SubscribeMessage('leave')
    handleLeave(
        @MessageBody() data: { room: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(data.room);
        client.to(data.room).emit('user_left', { socketId: client.id });
        this.logger.log(`Client ${client.id} left room ${data.room}`);
    }

    // Relay generic events to everyone in the room EXCEPT the sender
    @SubscribeMessage('cursor')
    handleCursor(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('cursor', { ...data, socketId: client.id });
        }
    }

    @SubscribeMessage('draw_batch')
    handleDrawBatch(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('draw_batch', data);
        }
    }


    @SubscribeMessage('add_item')
    async handleAddItem(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.debug(`[Gateway] Received add_item for ${data?.id} from ${client.id}`);
        // Log the meetingId specifically
        if (!data.meetingId) {
            console.warn(`[Gateway] Item ${data?.id} missing meetingId! Defaulting to 'default'`);
            this.logger.warn(`[Gateway] Item ${data?.id} missing meetingId! Defaulting to 'default'`);
            data.meetingId = 'default';
        } else {
            console.log(`[Gateway] Item meetingId: ${data.meetingId}`);
            this.logger.debug(`[Gateway] Item meetingId: ${data.meetingId}`);
        }

        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('add_item', data);
        }

        // Persistence: Save to DB
        try {
            await this.whiteboardService.create(data);
            this.logger.log(`Persisted add_item: ${data.id}`);
        } catch (error) {
            this.logger.error(`Failed to persist add_item: ${error.message}`);
        }
    }

    @SubscribeMessage('update_item')
    async handleUpdateItem(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.debug(`[Gateway] Received update_item for ${data.id}`);
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('update_item', data);
        }

        // Persistence: Update DB
        try {
            await this.whiteboardService.update(data.id, data);
            this.logger.log(`Persisted update_item: ${data.id}`);
        } catch (error) {
            this.logger.error(`Failed to persist update_item: ${error.message}`);
        }
    }

    @SubscribeMessage('delete_item')
    async handleDeleteItem(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.debug(`[Gateway] Received delete_item for ${data.id}`);
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('delete_item', data);
        }

        // Persistence: Soft Delete
        try {
            await this.whiteboardService.remove(data.id);
            this.logger.log(`Persisted delete_item: ${data.id}`);
        } catch (error) {
            this.logger.error(`Failed to persist delete_item: ${error.message}`);
        }
    }

    @SubscribeMessage('clear')
    async handleClear(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('clear', data);
        }

        // Persistence: Clear All for Meeting
        // data should contain meetingId. If not, we might be in trouble.
        // The client broadcastEvent sends { meetingId, ... }
        if (data.meetingId) {
            try {
                await this.whiteboardService.clearAll(data.meetingId);
                this.logger.log(`Persisted clear for meeting: ${data.meetingId}`);
            } catch (error) {
                this.logger.error(`Failed to persist clear: ${error.message}`);
            }
        } else {
            this.logger.warn('Clear event missing meetingId, cannot persist.');
        }
    }

    @SubscribeMessage('refetch')
    handleRefetch(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('refetch', data);
        }
    }

    @SubscribeMessage('stroke_end')
    handleStrokeEnd(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('stroke_end', data);
        }
    }
}
