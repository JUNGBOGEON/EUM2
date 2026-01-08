'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MeetingSummary, SummaryStatus } from '@/components/workspace/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UseMeetingSummaryReturn {
  summary: MeetingSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  regenerate: () => Promise<void>;
  isRegenerating: boolean;
}

export function useMeetingSummary(
  sessionId: string | null
): UseMeetingSummaryReturn {
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!sessionId) {
      setSummary(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/meetings/${sessionId}/summary`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('요약 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '요약 정보를 불러오는데 실패했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const regenerateSummary = useCallback(async () => {
    if (!sessionId) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/meetings/${sessionId}/summary/regenerate`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('요약 재생성 요청에 실패했습니다.');
      }

      // 요약 재생성 후 상태 업데이트를 위해 폴링 시작
      setSummary((prev) =>
        prev ? { ...prev, status: 'processing' as SummaryStatus } : null
      );

      // 3초 후에 다시 조회
      setTimeout(() => {
        fetchSummary();
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '요약 재생성 요청에 실패했습니다.'
      );
    } finally {
      setIsRegenerating(false);
    }
  }, [sessionId, fetchSummary]);

  // sessionId 변경 시 요약 데이터 로드
  useEffect(() => {
    if (sessionId) {
      fetchSummary();
    } else {
      setSummary(null);
    }
  }, [sessionId, fetchSummary]);

  // processing 상태일 때 폴링
  useEffect(() => {
    if (!sessionId || !summary) return;

    if (summary.status === 'processing' || summary.status === 'pending') {
      const pollInterval = setInterval(() => {
        fetchSummary();
      }, 5000); // 5초마다 폴링

      return () => clearInterval(pollInterval);
    }
  }, [sessionId, summary?.status, fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refetch: fetchSummary,
    regenerate: regenerateSummary,
    isRegenerating,
  };
}
