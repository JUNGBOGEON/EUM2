'use client';

/**
 * 워크스페이스 소켓 훅
 * 
 * 워크스페이스의 실시간 세션 업데이트를 수신합니다.
 * SocketProvider가 있으면 공유 소켓을 사용하고,
 * 없으면 독립 소켓을 생성합니다 (하위 호환).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '@/lib/config';

export interface SessionInfo {
  id: string;
  title: string;
  status: string;
  hostId: string;
  startedAt: string;
  participantCount?: number;
  host?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export interface SessionUpdatePayload {
  workspaceId: string;
  session: SessionInfo | null;
}

export interface InvitationNotification {
  type: 'invitation_received' | 'invitation_cancelled' | 'invitation_accepted' | 'invitation_rejected';
  invitation?: {
    id: string;
    workspace: {
      id: string;
      name: string;
      icon?: string;
    };
    inviter: {
      id: string;
      name: string;
      profileImage?: string;
    };
    message?: string;
    createdAt: string;
  };
  invitationId?: string;
  userId?: string;
  workspaceId?: string;
}

export interface UseWorkspaceSocketOptions {
  workspaceId: string | undefined;
  onSessionUpdate?: (session: SessionInfo | null) => void;
  onInvitationNotification?: (notification: InvitationNotification) => void;
}

export interface UseWorkspaceSocketReturn {
  isConnected: boolean;
  activeSession: SessionInfo | null;
}

/**
 * 워크스페이스 소켓 훅
 * 
 * @example
 * const { isConnected, activeSession } = useWorkspaceSocket({
 *   workspaceId: 'workspace-123',
 *   onSessionUpdate: (session) => {
 *     console.log('Session updated:', session);
 *   },
 * });
 */
export function useWorkspaceSocket({
  workspaceId,
  onSessionUpdate,
  onInvitationNotification,
}: UseWorkspaceSocketOptions): UseWorkspaceSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);

  // 세션 업데이트 핸들러
  const handleSessionUpdate = useCallback(
    (payload: SessionUpdatePayload) => {
      console.log('[WebSocket] Session update received:', payload);

      if (payload.workspaceId === workspaceId) {
        setActiveSession(payload.session);
        onSessionUpdate?.(payload.session);
      }
    },
    [workspaceId, onSessionUpdate]
  );

  // 초대 알림 핸들러
  const handleInvitationNotification = useCallback(
    (notification: InvitationNotification) => {
      console.log('[WebSocket] Invitation notification received:', notification);
      onInvitationNotification?.(notification);
    },
    [onInvitationNotification]
  );

  useEffect(() => {
    if (!workspaceId) return;

    // 소켓 연결 (config.socketUrl에 이미 /workspace 네임스페이스 포함)
    const socket = io(config.socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: config.socketReconnectAttempts,
      reconnectionDelay: config.socketReconnectDelay,
    });

    socketRef.current = socket;

    // 연결 이벤트
    socket.on('connect', () => {
      console.log('[WebSocket] Connected to workspace namespace');
      setIsConnected(true);

      // 워크스페이스 room 참가
      socket.emit('joinWorkspace', workspaceId, (response: unknown) => {
        console.log('[WebSocket] Joined workspace room:', response);
      });
    });

    // 연결 해제 이벤트
    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    // 연결 에러
    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      setIsConnected(false);
    });

    // 재연결 이벤트
    socket.on('reconnect', () => {
      console.log('[WebSocket] Reconnected');
      // 재연결 시 룸 다시 참가
      socket.emit('joinWorkspace', workspaceId);
    });

    // 세션 업데이트 이벤트 수신
    socket.on('sessionUpdate', handleSessionUpdate);

    // 초대 알림 이벤트 수신
    socket.on('invitationNotification', handleInvitationNotification);

    // Cleanup
    return () => {
      if (socket.connected) {
        socket.emit('leaveWorkspace', workspaceId);
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [workspaceId, handleSessionUpdate, handleInvitationNotification]);

  return {
    isConnected,
    activeSession,
  };
}

export default useWorkspaceSocket;
