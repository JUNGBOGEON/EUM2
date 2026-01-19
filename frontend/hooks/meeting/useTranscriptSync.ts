'use client';

/**
 * 트랜스크립트 실시간 동기화 훅
 *
 * 같은 회의에 참가한 모든 사용자들 간에 트랜스크립트를 실시간으로 동기화합니다.
 * - 세션 룸에 참가하여 다른 사용자의 트랜스크립트를 수신
 * - 자신의 트랜스크립트와 다른 사용자의 트랜스크립트를 병합
 * - 서버에서 계산된 타임스탬프 사용 (클라이언트 시계 오차 방지)
 * - 중복 방지 (resultId 기반)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import type { TranscriptItem } from '@/lib/types';
import { transcriptDebugLog } from '@/lib/meeting/debug-logger';

/**
 * 트랜스크립트 정렬 함수
 * timestamp 기준 정렬, 같으면 ID로 보조 정렬 (강제 분할 순서 보장)
 */
function sortTranscripts(transcripts: TranscriptItem[]): TranscriptItem[] {
  return transcripts.sort((a, b) => {
    const timeDiff = a.timestamp - b.timestamp;
    if (timeDiff !== 0) return timeDiff;
    // timestamp가 같으면 ID로 정렬 (abc < abc-cont-001 < abc-cont-002)
    return a.id.localeCompare(b.id);
  });
}

/**
 * 새 트랜스크립트 WebSocket 페이로드
 */
interface NewTranscriptPayload {
  type: 'new_transcript';
  resultId: string;
  sessionId: string;
  speakerId: string;
  speakerUserId: string;
  speakerName: string;
  speakerProfileImage?: string;
  text: string;
  timestamp: number;
  isPartial: boolean;
  languageCode: string;
}

/**
 * 언어 변경 WebSocket 페이로드
 */
interface LanguageChangedPayload {
  type: 'language_changed';
  sessionId: string;
  userId: string;
  attendeeId?: string;
  userName: string;
  languageCode: string;
  timestamp: number;
}

/**
 * 세션 종료 WebSocket 페이로드
 */
export interface SessionEndedPayload {
  sessionId: string;
  reason: 'host_ended' | 'timeout' | 'error';
  timestamp: number;
  meetingTitle?: string;
  hostName?: string;
  willGenerateSummary: boolean;
}

export interface UseTranscriptSyncOptions {
  /** 미팅 세션 ID */
  sessionId: string | undefined;
  /** 현재 사용자 ID (자기 트랜스크립트 필터링용) */
  currentUserId: string | null | undefined;
  /** 현재 사용자 attendeeId (자기 트랜스크립트 필터링용) */
  currentAttendeeId: string | null | undefined;
  /** 세션 종료 시 콜백 (호스트가 회의를 종료했을 때) */
  onSessionEnded?: (payload: SessionEndedPayload) => void;
}

export interface UseTranscriptSyncReturn {
  /** 동기화된 트랜스크립트 목록 (시간순 정렬) */
  transcripts: TranscriptItem[];
  /** WebSocket 세션 룸 참가 완료 여부 */
  isRoomJoined: boolean;
  /** 로컬 트랜스크립트 추가 (자신의 발화) */
  addLocalTranscript: (item: TranscriptItem) => void;
  /** 로컬 트랜스크립트 업데이트 (partial -> final 등) */
  updateLocalTranscript: (id: string, updates: Partial<TranscriptItem>) => void;
  /** 히스토리 로드 (늦은 참가자용) */
  loadHistory: (history: TranscriptItem[]) => void;
  /** 트랜스크립트 초기화 */
  clearTranscripts: () => void;
  /** 발화자 언어 조회 (userId -> languageCode) */
  getSpeakerLanguage: (userId: string) => string | undefined;
  /** 발화자 언어 맵 (userId -> languageCode) */
  speakerLanguages: Map<string, string>;
}

/**
 * 트랜스크립트 실시간 동기화 훅
 */
export function useTranscriptSync({
  sessionId,
  currentUserId,
  currentAttendeeId,
  onSessionEnded,
}: UseTranscriptSyncOptions): UseTranscriptSyncReturn {
  const { on, emit, emitWithAck, isConnected } = useSocket();

  // Debug: Log every render with full details
  console.log('[TranscriptSync] 🔄 Hook render:', { 
    sessionId, 
    isConnected, 
    currentUserId,
    currentAttendeeId,
    socketReady: !!on && !!emit && !!emitWithAck,
  });
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isRoomJoined, setIsRoomJoined] = useState(false);
  
  // 발화자별 언어 설정 (userId -> languageCode)
  const [speakerLanguages, setSpeakerLanguages] = useState<Map<string, string>>(new Map());

  // 처리된 resultId 추적 (중복 방지)
  const processedIdsRef = useRef<Set<string>>(new Set());
  // 현재 참가한 세션 ID 추적 (세션 변경 감지용)
  const joinedSessionIdRef = useRef<string | null>(null);
  // 컴포넌트 마운트 상태 추적
  const isMountedRef = useRef(true);
  // 룸 참가 진행 중 플래그 (중복 요청 방지)
  const isJoiningRef = useRef(false);
  // 현재 join 요청 취소용 AbortController
  const joinAbortControllerRef = useRef<AbortController | null>(null);

  // 세션 룸 참가/나가기 (서버 확인 대기)
  useEffect(() => {
    console.log('[TranscriptSync] 🎯 Session join effect triggered:', {
      sessionId,
      isConnected,
      joinedSession: joinedSessionIdRef.current,
      isJoining: isJoiningRef.current,
      hasEmit: !!emit,
      hasEmitWithAck: !!emitWithAck,
    });

    if (!sessionId) {
      console.log('[TranscriptSync] ❌ Cannot join session - sessionId is falsy:', sessionId);
      setIsRoomJoined(false);
      return;
    }

    if (!isConnected) {
      console.log('[TranscriptSync] ❌ Cannot join session - not connected');
      // 연결이 끊어지면 재참가가 필요하므로 상태 리셋
      setIsRoomJoined(false);
      joinedSessionIdRef.current = null;
      return;
    }

    // 이미 같은 세션에 참가한 경우 스킵
    // 소켓 재연결 시 joinedSessionIdRef는 null로 리셋되므로 재참가됨 (line 147)
    if (joinedSessionIdRef.current === sessionId) {
      console.log('[TranscriptSync] Already joined this session, skipping');
      return;
    }

    // 중복 요청 방지 (같은 세션에 대한 요청만)
    if (isJoiningRef.current) {
      console.log('[TranscriptSync] Already joining, skipping');
      return;
    }

    // 이전 join 요청 취소
    if (joinAbortControllerRef.current) {
      joinAbortControllerRef.current.abort();
    }

    // 새 AbortController 생성
    const abortController = new AbortController();
    joinAbortControllerRef.current = abortController;

    // 비동기 함수로 세션 참가 처리
    const joinSession = async () => {
      isJoiningRef.current = true;
      setIsRoomJoined(false);

      // 이전 세션에서 나가기 (다른 세션인 경우에만)
      if (joinedSessionIdRef.current && joinedSessionIdRef.current !== sessionId) {
        emit('leaveSession', joinedSessionIdRef.current);
        console.log('[TranscriptSync] Left previous session room:', joinedSessionIdRef.current);
        // 세션 변경 시 상태 초기화 (메모리 누수 방지)
        processedIdsRef.current.clear();
        setTranscripts([]);
      }

      // 새 세션에 참가 (서버 확인 대기)
      try {
        console.log('[TranscriptSync] 🚀 Sending joinSession event for:', sessionId);
        const response = await emitWithAck<{ success: boolean; sessionId?: string; error?: string }>('joinSession', sessionId);
        console.log('[TranscriptSync] 📥 joinSession response:', response);

        // 요청이 취소되었거나 컴포넌트가 언마운트된 경우 무시
        if (abortController.signal.aborted || !isMountedRef.current) {
          console.log('[TranscriptSync] Join request cancelled or component unmounted, ignoring response');
          return;
        }

        if (response.success) {
          joinedSessionIdRef.current = sessionId;
          setIsRoomJoined(true);
          console.log('[TranscriptSync] ✅ Successfully joined session room:', sessionId);
          transcriptDebugLog.sessionEvent('join', sessionId, 'room join success');
        } else {
          console.error('[TranscriptSync] Failed to join session:', response.error);
          joinedSessionIdRef.current = null;
          setIsRoomJoined(false);
          transcriptDebugLog.sessionEvent('error', sessionId, response.error || 'unknown error');
        }
      } catch (err) {
        // 요청이 취소된 경우 에러 로깅 스킵
        if (abortController.signal.aborted) {
          console.log('[TranscriptSync] Join request aborted');
          return;
        }
        console.error('[TranscriptSync] Failed to join session:', err);
        if (isMountedRef.current) {
          joinedSessionIdRef.current = null;
          setIsRoomJoined(false);
        }
      } finally {
        isJoiningRef.current = false;
      }
    };

    joinSession();

    return () => {
      // join 요청 취소
      abortController.abort();

      if (joinedSessionIdRef.current) {
        // fire-and-forget - emit doesn't throw synchronously
        emit('leaveSession', joinedSessionIdRef.current);
        console.log('[TranscriptSync] Left session room:', joinedSessionIdRef.current);
        joinedSessionIdRef.current = null;
        setIsRoomJoined(false);
      }
    };
  // 주의: isRoomJoined를 deps에 넣지 않음 - effect 내에서 setIsRoomJoined를 호출하므로 무한 루프 방지
  // 소켓 재연결 시 joinedSessionIdRef를 null로 리셋하여 재참가 트리거
  }, [sessionId, isConnected, emit, emitWithAck]);

  // 원격 트랜스크립트 수신
  useEffect(() => {
    if (!isConnected) {
      console.log('[TranscriptSync] Socket not connected, skipping newTranscript subscription');
      return;
    }

    console.log('[TranscriptSync] Setting up newTranscript listener, isRoomJoined:', isRoomJoined, 'sessionId:', sessionId);

    const unsubscribe = on<NewTranscriptPayload>('newTranscript', (payload) => {
      console.log('[TranscriptSync] Received newTranscript event:', {
        resultId: payload?.resultId,
        speakerName: payload?.speakerName,
        speakerUserId: payload?.speakerUserId,
        speakerId: payload?.speakerId,
        sessionId: payload?.sessionId,
        isPartial: payload?.isPartial,
        text: payload?.text?.substring(0, 30),
        currentUserId,
        currentAttendeeId,
      });

      try {
        // 페이로드 유효성 검사
        if (!payload || !payload.resultId || !payload.text) {
          console.warn('[TranscriptSync] Invalid payload received:', payload);
          return;
        }

        // 화자 식별자 누락 경고 (디버깅용)
        if (!payload.speakerId && !payload.speakerUserId) {
          console.warn('[TranscriptSync] ⚠️ Transcript missing speaker identifiers:', {
            resultId: payload.resultId,
            speakerName: payload.speakerName,
          });
        }

        // 자신의 발화는 스킵 (로컬에서 이미 처리됨)
        // 단, currentUserId/currentAttendeeId가 유효할 때만 체크
        const isOwnTranscript =
          (currentUserId && payload.speakerUserId === currentUserId) ||
          (currentAttendeeId && payload.speakerId === currentAttendeeId);

        if (isOwnTranscript) {
          console.log('[TranscriptSync] Skipping own transcript:', payload.resultId);
          transcriptDebugLog.speakerEvent('identified', {
            expectedSpeakerId: currentAttendeeId || undefined,
            actualSpeakerId: payload.speakerId,
            speakerName: payload.speakerName,
            resultId: payload.resultId,
          });
          return;
        }

        // 중복 방지 로직 수정:
        // - Final 트랜스크립트가 이미 처리된 경우에만 스킵
        // - Partial은 항상 업데이트 허용 (같은 resultId로 final이 올 수 있음)
        const alreadyProcessedAsFinal = processedIdsRef.current.has(payload.resultId);

        if (alreadyProcessedAsFinal && !payload.isPartial) {
          // Final이 이미 처리되었고, 또 Final이 오는 경우에만 스킵
          console.log('[TranscriptSync] Skipping duplicate final:', payload.resultId);
          return;
        }

        // Final 트랜스크립트만 processedIds에 추가 (partial은 추가하지 않음)
        if (!payload.isPartial) {
          processedIdsRef.current.add(payload.resultId);

          // 메모리 관리: 처리된 ID가 너무 많아지면 오래된 것 제거
          const MAX_PROCESSED_IDS = 1000;
          if (processedIdsRef.current.size > MAX_PROCESSED_IDS) {
            const ids = Array.from(processedIdsRef.current);
            processedIdsRef.current = new Set(ids.slice(-500)); // 최근 500개만 유지
            console.log('[TranscriptSync] Pruned processedIds, kept:', processedIdsRef.current.size);
          }
        }

        console.log('[TranscriptSync] Processing remote transcript:', {
          resultId: payload.resultId,
          isPartial: payload.isPartial,
          speaker: payload.speakerName,
          speakerId: payload.speakerId,
          speakerUserId: payload.speakerUserId,
        });

        // speakerId: Chime attendeeId 사용 (로컬 트랜스크립트와 일관성 유지)
        // attendeeId: 동일하게 Chime attendeeId 사용
        // getParticipantByAttendeeId()가 Chime attendeeId로 조회하므로 일관성 필요
        const newItem: TranscriptItem = {
          id: payload.resultId,
          speakerName: payload.speakerName,
          speakerId: payload.speakerId, // Chime attendeeId (로컬과 일관성)
          speakerProfileImage: payload.speakerProfileImage,
          text: payload.text,
          timestamp: payload.timestamp, // 서버 계산 타임스탬프 사용!
          isPartial: payload.isPartial,
          attendeeId: payload.speakerId, // Chime attendeeId
          languageCode: payload.languageCode, // 발화자 언어
        };

        // 마운트 상태 확인 후 상태 업데이트
        if (!isMountedRef.current) return;

        setTranscripts((prev) => {
          // 같은 ID가 있으면 업데이트 (partial -> final, 또는 partial -> partial)
          const existingIndex = prev.findIndex((t) => t.id === newItem.id);

          if (existingIndex >= 0) {
            const existing = prev[existingIndex];
            // Final이 이미 있는데 partial이 오면 무시 (역순 도착 방지)
            if (!existing.isPartial && newItem.isPartial) {
              console.log('[TranscriptSync] Ignoring late partial after final:', payload.resultId);
              return prev;
            }
            const result = [...prev];
            result[existingIndex] = newItem;
            // 항상 정렬 (강제 분할 시 순서 보장)
            console.log('[TranscriptSync] Updated transcript:', payload.resultId);
            return sortTranscripts(result);
          }

          // 새로 추가 후 항상 정렬
          console.log('[TranscriptSync] Added new transcript:', payload.resultId, newItem.isPartial ? 'partial' : 'final');
          const result = [...prev, newItem];
          return sortTranscripts(result);
        });
      } catch (err) {
        console.error('[TranscriptSync] Error processing transcript:', err, payload);
      }
    });

    return () => {
      console.log('[TranscriptSync] Cleaning up newTranscript listener');
      unsubscribe();
    };
  }, [isConnected, on, currentUserId, currentAttendeeId]);

  // 언어 변경 이벤트 수신
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    console.log('[TranscriptSync] Setting up languageChanged listener');

    const unsubscribe = on<LanguageChangedPayload>('languageChanged', (payload) => {
      console.log('[TranscriptSync] Received languageChanged event:', {
        userId: payload?.userId,
        userName: payload?.userName,
        languageCode: payload?.languageCode,
      });

      if (!payload || !payload.userId || !payload.languageCode) {
        console.warn('[TranscriptSync] Invalid languageChanged payload:', payload);
        return;
      }

      // 발화자 언어 맵 업데이트
      setSpeakerLanguages((prev) => {
        const newMap = new Map(prev);
        newMap.set(payload.userId, payload.languageCode);
        console.log('[TranscriptSync] Updated speaker language:', payload.userId, '->', payload.languageCode);
        return newMap;
      });
    });

    return () => {
      console.log('[TranscriptSync] Cleaning up languageChanged listener');
      unsubscribe();
    };
  }, [isConnected, on]);

  // 세션 종료 이벤트 수신 (호스트가 회의를 종료했을 때)
  useEffect(() => {
    if (!isConnected || !onSessionEnded) {
      return;
    }

    console.log('[TranscriptSync] Setting up sessionEnded listener');

    const unsubscribe = on<SessionEndedPayload>(
      'sessionEnded',
      (payload) => {
        console.log('[TranscriptSync] 🛑 Session ended event received:', payload);

        // 현재 세션과 일치하는지 확인
        if (payload.sessionId === sessionId) {
          console.log('[TranscriptSync] 🚪 Current session ended, triggering callback');
          onSessionEnded(payload);
        }
      }
    );

    return () => {
      console.log('[TranscriptSync] Cleaning up sessionEnded listener');
      unsubscribe();
    };
  }, [isConnected, on, sessionId, onSessionEnded]);

  // 컴포넌트 언마운트 시 전체 cleanup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      console.log('[TranscriptSync] 🧹 Component unmounting, cleaning up...');

      // 진행 중인 join 요청 취소
      if (joinAbortControllerRef.current) {
        joinAbortControllerRef.current.abort();
        joinAbortControllerRef.current = null;
      }

      // isJoiningRef 리셋 (재마운트 시 문제 방지)
      isJoiningRef.current = false;

      // 상태 초기화 (leaveSession은 세션 join effect의 cleanup에서 처리됨)
      processedIdsRef.current.clear();
    };
  }, []);

  // 로컬 트랜스크립트 추가 (자신의 발화)
  const addLocalTranscript = useCallback((item: TranscriptItem) => {
    if (!isMountedRef.current) return;

    // Final 트랜스크립트만 processedIds에 추가 (partial은 업데이트 허용)
    if (!item.isPartial) {
      processedIdsRef.current.add(item.id);
    }

    setTranscripts((prev) => {
      // 같은 ID가 있으면 업데이트 (partial -> final)
      const existingIndex = prev.findIndex((t) => t.id === item.id);

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        // Final이 이미 있는데 partial이 오면 무시 (역순 도착 방지)
        if (!existing.isPartial && item.isPartial) {
          return prev;
        }
        const result = [...prev];
        result[existingIndex] = item;
        // 항상 정렬 (강제 분할 시 순서 보장)
        return sortTranscripts(result);
      }

      // 새로 추가 후 항상 정렬 (강제 분할 시 Partial도 올바른 위치에)
      const result = [...prev, item];
      return sortTranscripts(result);
    });
  }, []);

  // 로컬 트랜스크립트 업데이트
  const updateLocalTranscript = useCallback(
    (id: string, updates: Partial<TranscriptItem>) => {
      if (!isMountedRef.current) return;

      setTranscripts((prev) => {
        const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
        // timestamp가 변경될 수 있으므로 항상 정렬
        return sortTranscripts(updated);
      });
    },
    []
  );

  // 히스토리 로드 (늦은 참가자용) - 기존 트랜스크립트와 병합
  const loadHistory = useCallback((history: TranscriptItem[]) => {
    if (!isMountedRef.current) return;

    // 모든 히스토리 ID를 처리됨으로 표시
    history.forEach((item) => processedIdsRef.current.add(item.id));

    setTranscripts((prev) => {
      // 기존 트랜스크립트와 히스토리 병합 (중복 제거)
      const merged = [...history];
      prev.forEach((item) => {
        // 히스토리에 없는 실시간 트랜스크립트 추가
        if (!history.some((h) => h.id === item.id)) {
          merged.push(item);
        }
      });
      // 시간순 정렬
      return sortTranscripts(merged);
    });

    console.log('[TranscriptSync] Loaded history:', history.length, 'items');
  }, []);

  // 트랜스크립트 초기화
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    processedIdsRef.current.clear();
    console.log('[TranscriptSync] Cleared all transcripts');
  }, []);

  // 발화자 언어 조회
  const getSpeakerLanguage = useCallback((userId: string): string | undefined => {
    return speakerLanguages.get(userId);
  }, [speakerLanguages]);

  return {
    transcripts,
    isRoomJoined,
    addLocalTranscript,
    updateLocalTranscript,
    loadHistory,
    clearTranscripts,
    getSpeakerLanguage,
    speakerLanguages,
  };
}

export default useTranscriptSync;
