'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

export interface UseWorkspaceSocketOptions {
  workspaceId: string | undefined;
  onSessionUpdate?: (session: SessionInfo | null) => void;
}

export interface UseWorkspaceSocketReturn {
  isConnected: boolean;
  activeSession: SessionInfo | null;
}

export function useWorkspaceSocket({
  workspaceId,
  onSessionUpdate,
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

  useEffect(() => {
    if (!workspaceId) return;

    // 소켓 연결
    const socket = io(`${API_URL}/workspace`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    // 연결 이벤트
    socket.on('connect', () => {
      console.log('[WebSocket] Connected to workspace namespace');
      setIsConnected(true);

      // 워크스페이스 room 참가
      socket.emit('joinWorkspace', workspaceId, (response: any) => {
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
      console.error('[WebSocket] Connection error:', error);
      setIsConnected(false);
    });

    // 세션 업데이트 이벤트 수신
    socket.on('sessionUpdate', handleSessionUpdate);

    // Cleanup
    return () => {
      if (socket.connected) {
        socket.emit('leaveWorkspace', workspaceId);
      }
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('sessionUpdate');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [workspaceId, handleSessionUpdate]);

  return {
    isConnected,
    activeSession,
  };
}
