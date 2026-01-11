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

export interface InvitationNotificationPayload {
  type:
    | 'invitation_received'
    | 'invitation_cancelled'
    | 'invitation_accepted'
    | 'invitation_rejected';
  invitation?: {
    id: string;
    workspace: {
      id: string;
      name: string;
      icon?: string;
      thumbnail?: string;
    };
    inviter: {
      id: string;
      name: string;
      profileImage?: string;
    };
    message?: string;
    createdAt: Date;
  };
  invitationId?: string;
  user?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  userId?: string;
  workspaceId?: string;
}

/**
 * 번역된 자막 WebSocket 페이로드
 */
export interface TranslatedTranscriptPayload {
  type: 'translated_transcript';
  resultId: string;
  speakerId: string;
  speakerName: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
}

/**
 * 새 트랜스크립트 WebSocket 페이로드 (원본, 실시간 동기화용)
 */
export interface NewTranscriptPayload {
  type: 'new_transcript';
  resultId: string;
  sessionId: string;
  speakerId: string; // attendeeId (for roster lookup)
  speakerUserId: string; // userId (for self-filtering)
  speakerName: string;
  speakerProfileImage?: string;
  text: string;
  timestamp: number; // 서버 계산 상대 타임스탬프 (ms)
  isPartial: boolean;
  languageCode: string;
}

/**
 * AI 요약 상태 업데이트 페이로드
 */
export interface SummaryStatusPayload {
  type: 'summary_status_update';
  workspaceId: string;
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  message?: string;
}

/**
 * 언어 변경 WebSocket 페이로드
 */
export interface LanguageChangedPayload {
  type: 'language_changed';
  sessionId: string;
  userId: string;
  attendeeId?: string;
  userName: string;
  languageCode: string;
  timestamp: number;
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
export class WorkspaceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WorkspaceGateway.name);

  // 연결된 클라이언트 추적 (socketId -> workspaceIds)
  private clientWorkspaces = new Map<string, Set<string>>();

  // 사용자 ID -> Socket ID 매핑 (초대 알림용)
  private userSockets = new Map<string, Set<string>>();

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

    // 모든 워크스페이스 room에서 나가기
    const workspaces = this.clientWorkspaces.get(client.id);
    if (workspaces) {
      workspaces.forEach((workspaceId) => {
        client.leave(`workspace:${workspaceId}`);
      });
    }
    this.clientWorkspaces.delete(client.id);

    // 사용자 소켓 매핑에서 제거
    this.userSockets.forEach((sockets, userId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    });
  }

  /**
   * 사용자 인증 및 소켓 매핑 등록
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: string,
  ) {
    if (!userId) {
      return { success: false, error: 'userId is required' };
    }

    // 사용자 ID와 소켓 매핑
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // 사용자 전용 room에 참가
    client.join(`user:${userId}`);

    this.logger.log(`User ${userId} authenticated with socket ${client.id}`);

    return { success: true, userId };
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
   * 세션 참가자들에게 세션 종료 알림 브로드캐스트
   * - 호스트가 회의를 종료할 때 모든 참가자에게 알림
   * - 참가자들은 이 이벤트를 받으면 자동으로 미팅에서 나가야 함
   */
  broadcastSessionEnded(sessionId: string, reason: string = 'host_ended') {
    const roomName = `session:${sessionId}`;
    const clientCount =
      this.server?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;

    this.logger.log(
      `[Session Ended] Broadcasting to ${roomName}: ${clientCount} clients, reason: ${reason}`,
    );

    this.server.to(roomName).emit('sessionEnded', {
      sessionId,
      reason,
      timestamp: Date.now(),
    });
  }

  /**
   * AI 요약 상태 업데이트 브로드캐스트
   * - 요약 생성 시작/완료/실패 시 호출
   */
  broadcastSummaryStatus(payload: SummaryStatusPayload) {
    const roomName = `workspace:${payload.workspaceId}`;
    this.server.to(roomName).emit('summaryStatusUpdate', payload);
    this.logger.log(
      `Broadcasted summary status to ${roomName}: session=${payload.sessionId}, status=${payload.status}`,
    );
  }

  /**
   * 특정 사용자에게 초대 알림 전송
   */
  sendInvitationNotification(
    userId: string,
    payload: InvitationNotificationPayload,
  ) {
    const roomName = `user:${userId}`;
    this.server.to(roomName).emit('invitationNotification', payload);
    this.logger.log(
      `Sent invitation notification to user ${userId}: ${payload.type}`,
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

  /**
   * 사용자가 현재 온라인인지 확인
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * 특정 사용자에게 번역된 자막 전송
   */
  sendTranslatedTranscript(
    userId: string,
    payload: TranslatedTranscriptPayload,
  ) {
    const roomName = `user:${userId}`;

    // 룸에 있는 클라이언트 수 확인
    const clientCount =
      this.server?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;

    this.logger.log(
      `[Translated Transcript] 📤 Room: ${roomName}, Clients: ${clientCount}, ${payload.sourceLanguage} → ${payload.targetLanguage}`,
    );

    if (clientCount === 0) {
      this.logger.warn(
        `[Translated Transcript] ⚠️ No clients in room ${roomName}! Translation will not be delivered.`,
      );
    }

    this.server.to(roomName).emit('translatedTranscript', payload);
  }

  /**
   * 디버그용 ping 핸들러
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    this.logger.log(
      `[PING] Received ping from ${client.id}: ${JSON.stringify(data)}`,
    );
    return { success: true, pong: true, clientId: client.id };
  }

  /**
   * 클라이언트가 미팅 세션 room에 참가 (실시간 트랜스크립트 동기화용)
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

    // client.join()이 비동기일 수 있으므로 await 처리
    await client.join(roomName);

    // 참가 후 룸 상태 확인 (adapter가 없을 수 있으므로 안전하게 접근)
    const clientCount =
      this.server?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;

    this.logger.log(
      `[Session Join] Client ${client.id} joined room ${roomName}. Total clients in room: ${clientCount}`,
    );

    return { success: true, sessionId };
  }

  /**
   * 클라이언트가 미팅 세션 room에서 나가기
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
   * 세션의 모든 참가자에게 새 트랜스크립트 브로드캐스트 (실시간 동기화)
   */
  broadcastNewTranscript(sessionId: string, payload: NewTranscriptPayload) {
    const roomName = `session:${sessionId}`;

    // 룸에 있는 클라이언트 수 확인 (adapter가 없을 수 있으므로 안전하게 접근)
    const clientCount =
      this.server?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;

    this.logger.log(
      `[Transcript Broadcast] Room: ${roomName}, Clients: ${clientCount}, Speaker: ${payload.speakerName}, Text: "${payload.text.substring(0, 30)}..."`,
    );

    if (clientCount === 0) {
      this.logger.warn(
        `[Transcript Broadcast] No clients in room ${roomName}! Broadcast will have no recipients.`,
      );
    }

    this.server.to(roomName).emit('newTranscript', payload);
  }

  /**
   * 세션 참가자들에게 언어 변경 알림
   */
  broadcastLanguageChange(sessionId: string, payload: LanguageChangedPayload) {
    const roomName = `session:${sessionId}`;

    const clientCount =
      this.server?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;

    this.logger.log(
      `[Language Change] Room: ${roomName}, Clients: ${clientCount}, User: ${payload.userName}, Language: ${payload.languageCode}`,
    );

    this.server.to(roomName).emit('languageChanged', payload);
  }
}
