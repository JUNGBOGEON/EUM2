'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface WorkspaceInvitation {
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
  createdAt: string;
}

export interface PendingInvitation {
  id: string;
  invitee: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  status: string;
  createdAt: string;
}

interface UseInvitationsProps {
  userId?: string;
}

interface UseInvitationsReturn {
  // 내가 받은 초대 목록
  pendingInvitations: WorkspaceInvitation[];
  // 초대 수락
  acceptInvitation: (invitationId: string) => Promise<void>;
  // 초대 거절
  rejectInvitation: (invitationId: string) => Promise<void>;
  // 로딩 상태
  isLoading: boolean;
  // 초대 갱신
  refreshInvitations: () => Promise<void>;
  // WebSocket 연결 상태
  isConnected: boolean;
}

export function useInvitations({ userId }: UseInvitationsProps): UseInvitationsReturn {
  const [pendingInvitations, setPendingInvitations] = useState<WorkspaceInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // 초대 목록 조회
  const fetchInvitations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/invitations/pending`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setPendingInvitations([]);
        return;
      }

      const data = await response.json();
      setPendingInvitations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setPendingInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초대 수락
  const acceptInvitation = useCallback(async (invitationId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '초대 수락에 실패했습니다');
      }

      const data = await response.json();
      toast.success(`${data.workspace.name} 워크스페이스에 참여했습니다!`);

      // 목록에서 제거
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error(error instanceof Error ? error.message : '초대 수락에 실패했습니다');
      throw error;
    }
  }, []);

  // 초대 거절
  const rejectInvitation = useCallback(async (invitationId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reject' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '초대 거절에 실패했습니다');
      }

      toast.success('초대를 거절했습니다');

      // 목록에서 제거
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error(error instanceof Error ? error.message : '초대 거절에 실패했습니다');
      throw error;
    }
  }, []);

  // WebSocket 연결
  useEffect(() => {
    if (!userId) return;

    const socket = io(`${API_URL}/workspace`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Invitations] WebSocket connected');
      setIsConnected(true);

      // 사용자 인증
      socket.emit('authenticate', userId, (response: any) => {
        console.log('[Invitations] Authenticated:', response);
      });
    });

    socket.on('disconnect', () => {
      console.log('[Invitations] WebSocket disconnected');
      setIsConnected(false);
    });

    // 초대 알림 수신
    socket.on('invitationNotification', (payload: any) => {
      console.log('[Invitations] Notification received:', payload);

      switch (payload.type) {
        case 'invitation_received':
          // 새 초대 추가
          setPendingInvitations((prev) => {
            const exists = prev.some((inv) => inv.id === payload.invitation.id);
            if (exists) return prev;
            return [payload.invitation, ...prev];
          });
          toast.info(`${payload.invitation.inviter.name}님이 ${payload.invitation.workspace.name}에 초대했습니다`, {
            duration: 5000,
          });
          break;

        case 'invitation_cancelled':
          // 취소된 초대 제거
          setPendingInvitations((prev) =>
            prev.filter((inv) => inv.id !== payload.invitationId)
          );
          toast.info('초대가 취소되었습니다');
          break;

        case 'invitation_accepted':
          toast.success(`${payload.user?.name || '사용자'}님이 초대를 수락했습니다`);
          break;

        case 'invitation_rejected':
          toast.info('초대가 거절되었습니다');
          break;
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('invitationNotification');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  // 초기 로드
  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    pendingInvitations,
    acceptInvitation,
    rejectInvitation,
    isLoading,
    refreshInvitations: fetchInvitations,
    isConnected,
  };
}
