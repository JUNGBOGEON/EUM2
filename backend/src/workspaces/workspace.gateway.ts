import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import {
  GatewayBroadcastService,
  SessionUpdatePayload,
  InvitationNotificationPayload,
  TranslatedTranscriptPayload,
  NewTranscriptPayload,
  SummaryStatusPayload,
  LanguageChangedPayload,
  TTSReadyPayload,
} from './services/gateway-broadcast.service';

// Re-export payload types for external use
export type {
  SessionUpdatePayload,
  InvitationNotificationPayload,
  TranslatedTranscriptPayload,
  NewTranscriptPayload,
  SummaryStatusPayload,
  LanguageChangedPayload,
  TTSReadyPayload,
} from './services/gateway-broadcast.service';

@WebSocketGateway({
  namespace: '/workspace',
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  },
})
export class WorkspaceGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WorkspaceGateway.name);

  // Connected client tracking (socketId -> workspaceIds)
  private clientWorkspaces = new Map<string, Set<string>>();

  // User ID -> Socket ID mapping (for invitation notifications)
  private userSockets = new Map<string, Set<string>>();

  constructor(private broadcastService: GatewayBroadcastService) {}

  // ==========================================
  // Gateway Lifecycle
  // ==========================================

  afterInit(server: Server) {
    this.broadcastService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(
      `Client connected: ${client.id}, namespace: ${client.nsp.name}`,
    );
    this.clientWorkspaces.set(client.id, new Set());

    // Debug: log all incoming events
    client.onAny((event, ...args) => {
      this.logger.log(
        `[DEBUG] Received event '${event}' from ${client.id}: ${JSON.stringify(args).substring(0, 100)}`,
      );
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Leave all workspace rooms
    const workspaces = this.clientWorkspaces.get(client.id);
    if (workspaces) {
      workspaces.forEach((workspaceId) => {
        client.leave(`workspace:${workspaceId}`);
      });
    }
    this.clientWorkspaces.delete(client.id);

    // Remove from user socket mapping
    this.userSockets.forEach((sockets, userId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    });
  }

  // ==========================================
  // Message Handlers
  // ==========================================

  /**
   * User authentication and socket mapping
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: string,
  ) {
    if (!userId) {
      return { success: false, error: 'userId is required' };
    }

    // Map user ID to socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Join user-specific room
    client.join(`user:${userId}`);

    this.logger.log(`User ${userId} authenticated with socket ${client.id}`);

    return { success: true, userId };
  }

  /**
   * Client joins workspace room
   */
  @SubscribeMessage('joinWorkspace')
  handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() workspaceId: string,
  ) {
    const roomName = `workspace:${workspaceId}`;
    client.join(roomName);

    // Add to client's workspace list
    const workspaces = this.clientWorkspaces.get(client.id);
    if (workspaces) {
      workspaces.add(workspaceId);
    }

    this.logger.log(`Client ${client.id} joined ${roomName}`);

    return { success: true, workspaceId };
  }

  /**
   * Client leaves workspace room
   */
  @SubscribeMessage('leaveWorkspace')
  handleLeaveWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() workspaceId: string,
  ) {
    const roomName = `workspace:${workspaceId}`;
    client.leave(roomName);

    // Remove from client's workspace list
    const workspaces = this.clientWorkspaces.get(client.id);
    if (workspaces) {
      workspaces.delete(workspaceId);
    }

    this.logger.log(`Client ${client.id} left ${roomName}`);

    return { success: true, workspaceId };
  }

  /**
   * Client joins session room (for real-time transcript sync)
   */
  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() sessionId: string,
  ) {
    if (!sessionId) {
      return { success: false, error: 'sessionId is required' };
    }

    const roomName = `session:${sessionId}`;
    await client.join(roomName);

    const clientCount = this.broadcastService.getRoomClientCount(roomName);

    this.logger.log(
      `[Session Join] Client ${client.id} joined room ${roomName}. Total clients: ${clientCount}`,
    );

    return { success: true, sessionId };
  }

  /**
   * Client leaves session room
   */
  @SubscribeMessage('leaveSession')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() sessionId: string,
  ) {
    if (!sessionId) {
      return { success: false, error: 'sessionId is required' };
    }

    const roomName = `session:${sessionId}`;
    client.leave(roomName);

    this.logger.log(`Client ${client.id} left session room ${roomName}`);

    return { success: true, sessionId };
  }

  /**
   * Debug ping handler
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    this.logger.log(
      `[PING] Received ping from ${client.id}: ${JSON.stringify(data)}`,
    );
    return { success: true, pong: true, clientId: client.id };
  }

  // ==========================================
  // Broadcast Methods (delegated to service)
  // ==========================================

  broadcastSessionUpdate(payload: SessionUpdatePayload) {
    this.broadcastService.broadcastSessionUpdate(payload);
  }

  broadcastSessionEnded(sessionId: string, reason: string = 'host_ended') {
    this.broadcastService.broadcastSessionEnded(sessionId, reason);
  }

  broadcastSummaryStatus(payload: SummaryStatusPayload) {
    this.broadcastService.broadcastSummaryStatus(payload);
  }

  sendInvitationNotification(
    userId: string,
    payload: InvitationNotificationPayload,
  ) {
    this.broadcastService.sendInvitationNotification(userId, payload);
  }

  sendTranslatedTranscript(
    userId: string,
    payload: TranslatedTranscriptPayload,
  ) {
    this.broadcastService.sendTranslatedTranscript(userId, payload);
  }

  broadcastNewTranscript(sessionId: string, payload: NewTranscriptPayload) {
    this.broadcastService.broadcastNewTranscript(sessionId, payload);
  }

  broadcastLanguageChange(sessionId: string, payload: LanguageChangedPayload) {
    this.broadcastService.broadcastLanguageChange(sessionId, payload);
  }

  sendTTSReady(userId: string, payload: TTSReadyPayload) {
    this.broadcastService.sendTTSReady(userId, payload);
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  async getWorkspaceClientCount(workspaceId: string): Promise<number> {
    return this.broadcastService.getWorkspaceClientCount(workspaceId);
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }
}
