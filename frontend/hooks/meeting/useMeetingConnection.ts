'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMeetingManager } from 'amazon-chime-sdk-component-library-react';
import { MeetingSessionConfiguration, AudioVideoObserver } from 'amazon-chime-sdk-js';
import type { MeetingInfo } from '@/app/workspaces/[id]/meeting/[meetingId]/types';
import { setCurrentUserCache, clearCurrentUserCache } from '@/lib/meeting/current-user-cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UseMeetingConnectionOptions {
  meetingId: string | undefined; // sessionId
  workspaceId: string | undefined;
}

export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  profileImage?: string;
}

export interface UseMeetingConnectionReturn {
  meeting: MeetingInfo | null;
  isJoining: boolean;
  error: string | null;
  userId: string | null;
  currentUser: UserInfo | null;
  currentAttendeeId: string | null;  // 현재 사용자의 Chime attendeeId
  isHost: boolean;
  handleLeave: () => Promise<void>;
  handleEndMeeting: () => Promise<void>;
}

export function useMeetingConnection({
  meetingId: sessionId,
  workspaceId,
}: UseMeetingConnectionOptions): UseMeetingConnectionReturn {
  const router = useRouter();
  const meetingManager = useMeetingManager();
  const hasJoinedRef = useRef(false);
  const observerRef = useRef<AudioVideoObserver | null>(null);

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [currentAttendeeId, setCurrentAttendeeId] = useState<string | null>(null);

  // 호스트 여부 체크
  const isHost = !!(userId && meeting?.hostId && userId === meeting.hostId);

  // 세션 참가 또는 시작
  const joinOrStartSession = useCallback(async () => {
    try {
      // 사용자 정보 가져오기
      const userRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUserId(userData.id);
      setCurrentUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        profileImage: userData.profileImage,
      });

      // 동기적으로 현재 사용자 정보 캐시 설정 (이름)
      setCurrentUserCache({
        name: userData.name,
        profileImage: userData.profileImage,
      });

      // 세션 정보 가져오기 (존재하면)
      let sessionData = null;
      if (sessionId) {
        const sessionRes = await fetch(`${API_URL}/api/meetings/sessions/${sessionId}`, {
          credentials: 'include',
        });
        if (sessionRes.ok) {
          sessionData = await sessionRes.json();
        }
      }

      let response;
      if (sessionData) {
        // 기존 세션에 참가
        response = await fetch(`${API_URL}/api/meetings/sessions/${sessionId}/join`, {
          method: 'POST',
          credentials: 'include',
        });
      } else if (workspaceId) {
        // 새 세션 시작 (워크스페이스 기반)
        response = await fetch(`${API_URL}/api/meetings/sessions/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ workspaceId }),
        });
      } else {
        throw new Error('세션 또는 워크스페이스 정보가 필요합니다.');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '세션 참가에 실패했습니다.');
      }

      const data = await response.json();
      const { session: sessionInfo, attendee } = data;

      // Chime 세션 설정
      const meetingSessionConfiguration = new MeetingSessionConfiguration(
        {
          MeetingId: sessionInfo.chimeMeetingId,
          ExternalMeetingId: sessionInfo.externalMeetingId,
          MediaPlacement: sessionInfo.mediaPlacement,
          MediaRegion: sessionInfo.mediaRegion,
        },
        {
          AttendeeId: attendee.attendeeId,
          JoinToken: attendee.joinToken,
        }
      );

      // attendeeId 먼저 저장 (트랜스크립션 이벤트보다 먼저 설정되어야 함)
      setCurrentAttendeeId(attendee.attendeeId);

      // 동기적으로 현재 사용자 정보 캐시 설정 (attendeeId)
      setCurrentUserCache({ attendeeId: attendee.attendeeId });

      await meetingManager.join(meetingSessionConfiguration);

      // Debug Observer - Register BEFORE start
      // Store in ref for cleanup
      observerRef.current = {
        audioVideoDidStart: () => {
          console.log('[MeetingConnection] AudioVideo started');
        },
        videoTileDidAdd: (tileState: any) => {
          console.log('[MeetingConnection] Video tile added:', {
            tileId: tileState.tileId,
            isLocal: tileState.localTile,
            isContent: tileState.isContent,
            boundAttendeeId: tileState.boundAttendeeId
          });
        },
        videoTileDidRemove: (tileState: any) => {
          console.log('[MeetingConnection] Video tile removed:', tileState.tileId);
        }
      };
      meetingManager.audioVideo?.addObserver(observerRef.current);

      await meetingManager.start();

      setMeeting(sessionInfo);
      setIsJoining(false);
    } catch (err) {
      console.error('Failed to join session:', err);
      setError(err instanceof Error ? err.message : '세션 참가에 실패했습니다.');
      setIsJoining(false);
    }
  }, [sessionId, workspaceId, meetingManager, router]);

  useEffect(() => {
    // React Strict Mode에서 두 번 실행되는 것 방지
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    joinOrStartSession();

    // Cleanup observer on unmount
    return () => {
      if (observerRef.current && meetingManager.audioVideo) {
        console.log('[MeetingConnection] Removing observer');
        meetingManager.audioVideo.removeObserver(observerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 회의 나가기 (본인만)
  const handleLeave = useCallback(async () => {
    try {
      clearCurrentUserCache();  // 캐시 초기화
      const response = await fetch(`${API_URL}/api/meetings/sessions/${sessionId}/leave`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to leave session: ${response.status}`);
      }
      await meetingManager.leave();
      router.push(`/workspaces/${workspaceId}`);
    } catch (err) {
      console.error('Failed to leave session:', err);
      // Failsafe: Redirect anyway
      router.push(`/workspaces/${workspaceId}`);
    }
  }, [sessionId, workspaceId, meetingManager, router]);

  // 회의 종료 (호스트 전용 - 모든 참가자 종료)
  const handleEndMeeting = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/meetings/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.status}`);
      }
      await meetingManager.leave();
      router.push(`/workspaces/${workspaceId}`);
    } catch (err) {
      console.error('Failed to end session (server request failed):', err);
      // Failsafe: Still try to leave locally and redirect
      try { await meetingManager.leave(); } catch (e) { console.warn('Local leave failed:', e); }
      router.push(`/workspaces/${workspaceId}`);
    }
  }, [sessionId, workspaceId, meetingManager, router]);

  return {
    meeting,
    isJoining,
    error,
    userId,
    currentUser,
    currentAttendeeId,
    isHost,
    handleLeave,
    handleEndMeeting,
  };
}
