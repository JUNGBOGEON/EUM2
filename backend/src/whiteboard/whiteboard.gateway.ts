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
    namespace: 'whiteboard',
    cors: {
        origin: '*', // Adjust for production
    },
})
export class WhiteboardGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly whiteboardService: WhiteboardService) { }

    private logger: Logger = new Logger('WhiteboardGateway');

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
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
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('add_item', data);
        }
        // Persist
        try {
            await this.whiteboardService.create(data);
        } catch (e) {
            this.logger.error(`Failed to create item: ${e.message}`);
        }
    }

    @SubscribeMessage('update_item')
    async handleUpdateItem(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('update_item', data);
        }
        // Persist
        try {
            await this.whiteboardService.update(data.id, data.changes);
        } catch (e) {
            this.logger.error(`Failed to update item: ${e.message}`);
        }
    }

    @SubscribeMessage('delete_item')
    async handleDeleteItem(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        const room = Array.from(client.rooms).find((r) => r !== client.id);
        if (room) {
            client.to(room).emit('delete_item', data);
        }
        // Persist
        try {
            await this.whiteboardService.remove(data.id);
        } catch (e) {
            this.logger.error(`Failed to delete item: ${e.message}`);
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
        // Persist
        if (data.meetingId) {
            await this.whiteboardService.clearAll(data.meetingId);
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
}
