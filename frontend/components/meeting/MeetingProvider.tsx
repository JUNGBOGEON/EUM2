'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  MeetingProvider as ChimeMeetingProvider,
  useMeetingManager,
  useAudioVideo,
} from 'amazon-chime-sdk-component-library-react';
import { MeetingSessionConfiguration } from 'amazon-chime-sdk-js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MeetingContextType {
  isInMeeting: boolean;
  isLoading: boolean;
  error: string | null;
  startMeeting: (meetingId: string) => Promise<void>;
  joinMeeting: (meetingId: string) => Promise<void>;
  leaveMeeting: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | null>(null);

export function useMeetingContext() {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeetingContext must be used within MeetingContextProvider');
  }
  return context;
}

function MeetingContextProviderInner({ children }: { children: React.ReactNode }) {
  const meetingManager = useMeetingManager();
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startMeeting = useCallback(async (meetingId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 백엔드에서 미팅 시작 요청
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}/start`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '미팅 시작에 실패했습니다.');
      }

      const data = await response.json();
      const { meeting, attendee } = data;

      // Chime 세션 설정
      const meetingSessionConfiguration = new MeetingSessionConfiguration(
        {
          MeetingId: meeting.chimeMeetingId,
          ExternalMeetingId: meeting.externalMeetingId,
          MediaPlacement: meeting.mediaPlacement,
          MediaRegion: meeting.mediaRegion,
        },
        {
          AttendeeId: attendee.attendeeId,
          JoinToken: attendee.joinToken,
        }
      );

      await meetingManager.join(meetingSessionConfiguration);
      await meetingManager.start();

      setIsInMeeting(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [meetingManager]);

  const joinMeeting = useCallback(async (meetingId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 백엔드에서 미팅 참가 요청
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}/join`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '미팅 참가에 실패했습니다.');
      }

      const data = await response.json();
      const { meeting, attendee } = data;

      // Chime 세션 설정
      const meetingSessionConfiguration = new MeetingSessionConfiguration(
        {
          MeetingId: meeting.chimeMeetingId,
          ExternalMeetingId: meeting.externalMeetingId,
          MediaPlacement: meeting.mediaPlacement,
          MediaRegion: meeting.mediaRegion,
        },
        {
          AttendeeId: attendee.attendeeId,
          JoinToken: attendee.joinToken,
        }
      );

      await meetingManager.join(meetingSessionConfiguration);
      await meetingManager.start();

      setIsInMeeting(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [meetingManager]);

  const leaveMeeting = useCallback(async () => {
    try {
      await meetingManager.leave();
      setIsInMeeting(false);
    } catch (err) {
      console.error('Failed to leave meeting:', err);
    }
  }, [meetingManager]);

  return (
    <MeetingContext.Provider
      value={{
        isInMeeting,
        isLoading,
        error,
        startMeeting,
        joinMeeting,
        leaveMeeting,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
}

export function MeetingContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChimeMeetingProvider>
      <MeetingContextProviderInner>{children}</MeetingContextProviderInner>
    </ChimeMeetingProvider>
  );
}
