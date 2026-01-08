import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface SessionUpdatePayload {
  workspaceId: string;
  session: {
    id: string;
    title: string;
    status: string;
    hostId: string;
    startedAt: Date;
    participantCount?: number;
    host?: {
      id: string;
      name: string;
      profileImage?: string;
    };
  } | null;
}

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
export class WorkspaceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WorkspaceGateway.name);

  // 연결된 클라이언트 추적 (socketId -> workspaceIds)
  private clientWorkspaces = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clientWorkspaces.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 모든 워크스페이스 room에서 나가기
    const workspaces = this.clientWorkspaces.get(client.id);
    if (workspaces) {
      workspaces.forEach((workspaceId) => {
        client.leave(`workspace:${workspaceId}`);
      });
    }
    this.clientWorkspaces.delete(client.id);
  }

  /**
   * 클라이언트가 워크스페이스 room에 참가
   */
  @SubscribeMessage('joinWorkspace')
  handleJoinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() workspaceId: string,
  ) {
    const roomName = `workspace:${workspaceId}`;
    client.join(roomName);

    // 클라이언트의 워크스페이스 목록에 추가
    const workspaces = this.clientWorkspaces.get(client.id);
    if (workspaces) {
      workspaces.add(workspaceId);
    }

    this.logger.log(`Client ${client.id} joined ${roomName}`);

    return { success: true, workspaceId };
  }

  /**
   * 클라이언트가 워크스페이스 room에서 나가기
   */
  @SubscribeMessage('leaveWorkspace')
  handleLeaveWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() workspaceId: string,
  ) {
    const roomName = `workspace:${workspaceId}`;
    client.leave(roomName);

    // 클라이언트의 워크스페이스 목록에서 제거
    const workspaces = this.clientWorkspaces.get(client.id);
    if (workspaces) {
      workspaces.delete(workspaceId);
    }

    this.logger.log(`Client ${client.id} left ${roomName}`);

    return { success: true, workspaceId };
  }

  /**
   * 워크스페이스에 세션 상태 변경 브로드캐스트
   * - 세션 시작/종료 시 호출
   */
  broadcastSessionUpdate(payload: SessionUpdatePayload) {
    const roomName = `workspace:${payload.workspaceId}`;
    this.server.to(roomName).emit('sessionUpdate', payload);
    this.logger.log(
      `Broadcasted session update to ${roomName}: ${payload.session ? 'active' : 'ended'}`,
    );
  }

  /**
   * 워크스페이스의 현재 연결된 클라이언트 수 조회
   */
  async getWorkspaceClientCount(workspaceId: string): Promise<number> {
    const roomName = `workspace:${workspaceId}`;
    const sockets = await this.server.in(roomName).fetchSockets();
    return sockets.length;
  }
}
