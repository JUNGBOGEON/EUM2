'use client';

/**
 * 미팅 요약 관리 훅
 *
 * 새 API 클라이언트와 에러 핸들링 유틸리티를 사용합니다.
 * WebSocket을 통해 실시간 상태 업데이트를 수신합니다.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { meetingsApi } from '@/lib/api';
import { handleError, getErrorMessage } from '@/lib/utils/error';
import { config } from '@/lib/config';
import type { MeetingSummary, SummaryStatus } from '@/lib/types';

interface SummaryStatusPayload {
  type: 'summary_status_update';
  workspaceId: string;
  sessionId: string;
  status: SummaryStatus;
  message?: string;
}

export interface UseMeetingSummaryReturn {
  summary: MeetingSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  regenerate: () => Promise<void>;
  isRegenerating: boolean;
}

export function useMeetingSummary(
  sessionId: string | null,
  workspaceId?: string | null
): UseMeetingSummaryReturn {
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

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

  // WebSocket 이벤트 수신 - 실시간 상태 업데이트
  useEffect(() => {
    if (!sessionId || !workspaceId) return;

    const socket = io(config.socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[useMeetingSummary] WebSocket connected');
      socket.emit('joinWorkspace', workspaceId);
    });

    // 요약 상태 업데이트 이벤트 수신
    socket.on('summaryStatusUpdate', (payload: SummaryStatusPayload) => {
      console.log('[useMeetingSummary] Summary status update:', payload);

      if (payload.sessionId !== sessionId) return;

      // 상태 업데이트
      setSummary((prev) =>
        prev ? { ...prev, status: payload.status } : null
      );

      // 완료 또는 실패 시 데이터 다시 조회
      if (payload.status === 'completed' || payload.status === 'failed') {
        console.log('[useMeetingSummary] Fetching updated summary...');
        fetchSummary();
      }
    });

    return () => {
      if (socket.connected) {
        socket.emit('leaveWorkspace', workspaceId);
      }
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, workspaceId, fetchSummary]);

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

  // processing 상태일 때 폴링 (WebSocket 백업용, workspaceId 없을 때도 동작)
  useEffect(() => {
    if (!sessionId || !summary) return;

    if (summary.status === 'processing' || summary.status === 'pending') {
      // WebSocket이 없으면 3초, 있으면 10초 간격으로 폴링 (백업)
      const pollInterval = setInterval(() => {
        fetchSummary();
      }, workspaceId ? 10000 : 3000);

      return () => clearInterval(pollInterval);
    }
  }, [sessionId, summary?.status, workspaceId, fetchSummary]);

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
