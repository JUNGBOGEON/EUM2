'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  MeetingSession,
  SessionParticipant,
  MeetingTranscription,
} from '@/components/workspace/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface MeetingDetailData {
  session: MeetingSession | null;
  participants: SessionParticipant[];
  transcriptions: MeetingTranscription[];
}

export interface UseMeetingDetailReturn {
  data: MeetingDetailData;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMeetingDetail(
  sessionId: string | null
): UseMeetingDetailReturn {
  const [data, setData] = useState<MeetingDetailData>({
    session: null,
    participants: [],
    transcriptions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!sessionId) {
      setData({ session: null, participants: [], transcriptions: [] });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 3개 API 병렬 호출
      const [sessionRes, participantsRes, transcriptionsRes] = await Promise.all([
        fetch(`${API_URL}/api/meetings/sessions/${sessionId}`, {
          credentials: 'include',
        }),
        fetch(`${API_URL}/api/meetings/sessions/${sessionId}/participants`, {
          credentials: 'include',
        }),
        fetch(`${API_URL}/api/meetings/${sessionId}/transcriptions/final`, {
          credentials: 'include',
        }),
      ]);

      if (!sessionRes.ok) {
        throw new Error('회의 정보를 불러오는데 실패했습니다.');
      }

      const session = await sessionRes.json();
      const participants = participantsRes.ok ? await participantsRes.json() : [];
      const transcriptions = transcriptionsRes.ok
        ? await transcriptionsRes.json()
        : [];

      setData({
        session,
        participants,
        transcriptions,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '회의 정보를 불러오는데 실패했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // sessionId 변경 시 데이터 다시 로드
  useEffect(() => {
    if (sessionId) {
      fetchData();
    } else {
      setData({ session: null, participants: [], transcriptions: [] });
    }
  }, [sessionId, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
