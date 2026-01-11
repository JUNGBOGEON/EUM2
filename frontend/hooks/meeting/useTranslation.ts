'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import type { TranslatedTranscript } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// LRU 캐시 최대 크기 (메모리 무한 증가 방지)
const MAX_TRANSLATIONS_CACHE_SIZE = 100;

// 플로팅 자막 설정
const SUBTITLE_DISPLAY_DURATION = 5000; // 5초 후 자동 숨김
const SUBTITLE_EXIT_ANIMATION_DURATION = 300; // 퇴장 애니메이션 시간 (ms)
const MAX_VISIBLE_SUBTITLES = 2; // 최대 2개 동시 표시

export interface UseTranslationOptions {
  meetingId: string | undefined;
  userId: string | null | undefined;
}

/**
 * 플로팅 자막용 최근 번역 (본인 발화 제외)
 */
export interface RecentTranslation extends TranslatedTranscript {
  expiresAt: number; // 자동 숨김 타이머
  isExiting?: boolean; // 퇴장 애니메이션 상태
}

export interface UseTranslationReturn {
  // 번역 상태
  translationEnabled: boolean;
  isTogglingTranslation: boolean;
  // 번역된 자막 (resultId -> translation)
  translations: Map<string, TranslatedTranscript>;
  // 플로팅 자막용 최근 번역 (본인 제외)
  recentTranslations: RecentTranslation[];
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
  
  // 플로팅 자막용 최근 번역 (본인 발화 제외)
  const [recentTranslations, setRecentTranslations] = useState<RecentTranslation[]>([]);

  const hasLoadedStatusRef = useRef(false);
  const hasAuthenticatedRef = useRef(false);
  // setTimeout ID 추적 (cleanup용)
  const subtitleTimersRef = useRef<Map<string, NodeJS.Timeout[]>>(new Map());
  // 컴포넌트 마운트 상태 추적
  const isMountedRef = useRef(true);

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
      // 컴포넌트 언마운트 시 상태 업데이트 방지
      if (!isMountedRef.current) {
        console.log('[Translation] 🛑 Ignoring payload - component unmounted');
        return;
      }

      console.log('[Translation] 📥 Received:', payload);

      // 1. 기존 translations Map 업데이트 (LRU 캐시)
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

      // 2. 플로팅 자막: 본인 발화가 아닌 경우만 추가
      // speakerUserId로 본인 필터링 (speakerId는 attendeeId임)
      if (payload.speakerUserId !== userId) {
        const newSubtitle: RecentTranslation = {
          ...payload,
          expiresAt: Date.now() + SUBTITLE_DISPLAY_DURATION,
          isExiting: false,
        };

        setRecentTranslations((prev) => {
          // 중복 방지: 이미 같은 resultId가 있으면 추가하지 않음
          if (prev.some((t) => t.resultId === payload.resultId)) {
            console.log('[Translation] 🔄 Duplicate subtitle ignored:', payload.resultId);
            return prev;
          }

          // 최대 개수 초과 시 오래된 것 제거
          const filtered = prev.slice(-(MAX_VISIBLE_SUBTITLES - 1));
          return [...filtered, newSubtitle];
        });

        // 타이머 저장 배열 생성
        const timers: NodeJS.Timeout[] = [];

        // 퇴장 애니메이션 시작 (표시 시간 - 애니메이션 시간 후)
        const exitTimer = setTimeout(() => {
          if (!isMountedRef.current) return;
          setRecentTranslations((prev) =>
            prev.map((t) =>
              t.resultId === payload.resultId ? { ...t, isExiting: true } : t
            )
          );
        }, SUBTITLE_DISPLAY_DURATION - SUBTITLE_EXIT_ANIMATION_DURATION);
        timers.push(exitTimer);

        // 실제 제거 (표시 시간 후)
        const removeTimer = setTimeout(() => {
          if (!isMountedRef.current) return;
          setRecentTranslations((prev) =>
            prev.filter((t) => t.resultId !== payload.resultId)
          );
          // 타이머 맵에서 제거
          subtitleTimersRef.current.delete(payload.resultId);
        }, SUBTITLE_DISPLAY_DURATION);
        timers.push(removeTimer);

        // 타이머 저장 (cleanup용)
        subtitleTimersRef.current.set(payload.resultId, timers);

        console.log('[Translation] 🎬 Added to floating subtitle:', payload.translatedText);
      }
    });

    return unsubscribe;
  }, [isConnected, on, userId]);

  // meetingId 변경 시 상태 초기화
  useEffect(() => {
    return () => {
      // 모든 타이머 정리
      subtitleTimersRef.current.forEach((timers) => {
        timers.forEach((timer) => clearTimeout(timer));
      });
      subtitleTimersRef.current.clear();

      // 상태 초기화
      setTranslations(new Map());
      setRecentTranslations([]);
      hasLoadedStatusRef.current = false;
      hasAuthenticatedRef.current = false;
    };
  }, [meetingId]);

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // 모든 타이머 정리
      subtitleTimersRef.current.forEach((timers) => {
        timers.forEach((timer) => clearTimeout(timer));
      });
      subtitleTimersRef.current.clear();
      console.log('[Translation] 🧹 Cleaned up on unmount');
    };
  }, []);

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
    recentTranslations,
    toggleTranslation,
    getTranslation,
  };
}
