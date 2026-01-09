'use client';

/**
 * 미팅 요약 관리 훅
 * 
 * 새 API 클라이언트와 에러 핸들링 유틸리티를 사용합니다.
 */

import { useState, useEffect, useCallback } from 'react';
import { meetingsApi } from '@/lib/api';
import { handleError, getErrorMessage } from '@/lib/utils/error';
import type { MeetingSummary, SummaryStatus } from '@/lib/types';

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
      const data = await meetingsApi.getSummary(sessionId);
      setSummary(data);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      handleError(err, { showToast: false, context: 'fetchSummary' });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const regenerateSummary = useCallback(async () => {
    if (!sessionId) return;

    setIsRegenerating(true);
    setError(null);

    try {
      await meetingsApi.regenerateSummary(sessionId);

      // 요약 재생성 후 상태 업데이트를 위해 processing으로 설정
      setSummary((prev) =>
        prev ? { ...prev, status: 'processing' as SummaryStatus } : null
      );

      // 3초 후에 다시 조회
      setTimeout(() => {
        fetchSummary();
      }, 3000);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      handleError(err, { showToast: true, context: 'regenerateSummary' });
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

export default useMeetingSummary;
