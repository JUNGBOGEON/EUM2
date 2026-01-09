'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import type { TranslatedTranscript } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// LRU 캐시 최대 크기 (메모리 무한 증가 방지)
const MAX_TRANSLATIONS_CACHE_SIZE = 100;

export interface UseTranslationOptions {
  meetingId: string | undefined;
  userId: string | null | undefined;
}

export interface UseTranslationReturn {
  // 번역 상태
  translationEnabled: boolean;
  isTogglingTranslation: boolean;
  // 번역된 자막 (resultId -> translation)
  translations: Map<string, TranslatedTranscript>;
  // 액션
  toggleTranslation: () => Promise<void>;
  getTranslation: (resultId: string) => TranslatedTranscript | undefined;
}

/**
 * 실시간 번역 기능 훅
 *
 * - 번역 활성화/비활성화 토글
 * - WebSocket으로 번역된 자막 수신
 * - resultId 기반 번역 조회
 */
export function useTranslation({
  meetingId,
  userId,
}: UseTranslationOptions): UseTranslationReturn {
  const { on, emit, isConnected } = useSocket();

  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [isTogglingTranslation, setIsTogglingTranslation] = useState(false);
  const [translations, setTranslations] = useState<Map<string, TranslatedTranscript>>(new Map());

  const hasLoadedStatusRef = useRef(false);
  const hasAuthenticatedRef = useRef(false);

  // 초기 번역 상태 로드
  const loadTranslationStatus = useCallback(async () => {
    if (!meetingId || hasLoadedStatusRef.current) return;

    hasLoadedStatusRef.current = true;

    try {
      const response = await fetch(
        `${API_URL}/api/meetings/${meetingId}/translation/status`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const status = await response.json();
        setTranslationEnabled(status.enabled);
      }
    } catch (error) {
      console.error('[Translation] Failed to load status:', error);
    }
  }, [meetingId]);

  // 미팅 참여 시 번역 상태 로드
  useEffect(() => {
    if (meetingId && !hasLoadedStatusRef.current) {
      loadTranslationStatus();
    }
  }, [meetingId, loadTranslationStatus]);

  // WebSocket 인증 (사용자별 룸 참가)
  useEffect(() => {
    console.log('[Translation] Auth check - userId:', userId, 'isConnected:', isConnected, 'hasAuthenticated:', hasAuthenticatedRef.current);

    if (!userId || !isConnected || hasAuthenticatedRef.current) {
      console.log('[Translation] Auth skipped - missing requirements');
      return;
    }

    hasAuthenticatedRef.current = true;
    emit('authenticate', userId);
    console.log('[Translation] ✅ Authenticated with userId:', userId);

    return () => {
      hasAuthenticatedRef.current = false;
    };
  }, [userId, isConnected, emit]);

  // 번역된 자막 WebSocket 리스너 (LRU 캐시 적용)
  useEffect(() => {
    console.log('[Translation] Setting up listener - isConnected:', isConnected);
    if (!isConnected) return;

    console.log('[Translation] 📡 Listener registered for translatedTranscript');

    const unsubscribe = on<TranslatedTranscript>('translatedTranscript', (payload) => {
      console.log('[Translation] 📥 Received:', payload);

      setTranslations((prev) => {
        const next = new Map(prev);

        // LRU 구현: 캐시가 최대 크기를 초과하면 가장 오래된 항목 제거
        if (next.size >= MAX_TRANSLATIONS_CACHE_SIZE && !next.has(payload.resultId)) {
          // Map은 삽입 순서를 유지하므로 첫 번째 항목이 가장 오래됨
          const firstKey = next.keys().next().value;
          if (firstKey) {
            next.delete(firstKey);
          }
        }

        next.set(payload.resultId, payload);
        return next;
      });
    });

    return unsubscribe;
  }, [isConnected, on]);

  // 번역 토글
  const toggleTranslation = useCallback(async () => {
    if (!meetingId || isTogglingTranslation) return;

    setIsTogglingTranslation(true);
    const newEnabled = !translationEnabled;

    try {
      const response = await fetch(
        `${API_URL}/api/meetings/${meetingId}/translation/toggle`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ enabled: newEnabled }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setTranslationEnabled(result.enabled);
        console.log(`[Translation] ${result.enabled ? 'Enabled' : 'Disabled'}`);
      }
    } catch (error) {
      console.error('[Translation] Failed to toggle:', error);
    } finally {
      setIsTogglingTranslation(false);
    }
  }, [meetingId, translationEnabled, isTogglingTranslation]);

  // resultId로 번역 조회
  const getTranslation = useCallback((resultId: string): TranslatedTranscript | undefined => {
    return translations.get(resultId);
  }, [translations]);

  return {
    translationEnabled,
    isTogglingTranslation,
    translations,
    toggleTranslation,
    getTranslation,
  };
}
