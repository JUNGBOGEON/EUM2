'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMeetingManager } from 'amazon-chime-sdk-component-library-react';
import { MeetingSessionConfiguration } from 'amazon-chime-sdk-js';
import type { MeetingInfo } from '@/app/workspaces/[id]/meeting/[meetingId]/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UseMeetingConnectionOptions {
  meetingId: string | undefined;
  workspaceId: string | undefined;
}

export interface UseMeetingConnectionReturn {
  meeting: MeetingInfo | null;
  isJoining: boolean;
  error: string | null;
  userId: string | null;
  handleLeave: () => Promise<void>;
}

export function useMeetingConnection({
  meetingId,
  workspaceId,
}: UseMeetingConnectionOptions): UseMeetingConnectionReturn {
  const router = useRouter();
  const meetingManager = useMeetingManager();
  const hasJoinedRef = useRef(false);

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // 미팅 참가 또는 시작
  const joinOrStartMeeting = useCallback(async () => {
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

      // 미팅 정보 가져오기
      const meetingRes = await fetch(`${API_URL}/api/meetings/${meetingId}`, {
        credentials: 'include',
      });

      if (!meetingRes.ok) {
        throw new Error('미팅을 찾을 수 없습니다.');
      }

      const meetingData = await meetingRes.json();
      setMeeting(meetingData);

      // 호스트인 경우 미팅 시작, 아닌 경우 참가
      const isHost = meetingData.hostId === userData.id;
      const endpoint =
        isHost && !meetingData.chimeMeetingId
          ? `${API_URL}/api/meetings/${meetingId}/start`
          : `${API_URL}/api/meetings/${meetingId}/join`;

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '미팅 참가에 실패했습니다.');
      }

      const data = await response.json();
      const { meeting: meetingInfo, attendee } = data;

      // Chime 세션 설정
      const meetingSessionConfiguration = new MeetingSessionConfiguration(
        {
          MeetingId: meetingInfo.chimeMeetingId,
          ExternalMeetingId: meetingInfo.externalMeetingId,
          MediaPlacement: meetingInfo.mediaPlacement,
          MediaRegion: meetingInfo.mediaRegion,
        },
        {
          AttendeeId: attendee.attendeeId,
          JoinToken: attendee.joinToken,
        }
      );

      await meetingManager.join(meetingSessionConfiguration);
      await meetingManager.start();

      setMeeting(meetingInfo);
      setIsJoining(false);
    } catch (err) {
      console.error('Failed to join meeting:', err);
      setError(err instanceof Error ? err.message : '미팅 참가에 실패했습니다.');
      setIsJoining(false);
    }
  }, [meetingId, meetingManager, router]);

  useEffect(() => {
    // React Strict Mode에서 두 번 실행되는 것 방지
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    joinOrStartMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLeave = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/meetings/${meetingId}/leave`, {
        method: 'POST',
        credentials: 'include',
      });
      await meetingManager.leave();
      router.push(`/workspaces/${workspaceId}`);
    } catch (err) {
      console.error('Failed to leave meeting:', err);
      router.push(`/workspaces/${workspaceId}`);
    }
  }, [meetingId, workspaceId, meetingManager, router]);

  return {
    meeting,
    isJoining,
    error,
    userId,
    handleLeave,
  };
}
