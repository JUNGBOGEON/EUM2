'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMeetingManager, useAudioInputs } from 'amazon-chime-sdk-component-library-react';
import { apiClient } from '@/lib/api';
import {
  TranscribeStreamingClient,
  TranscriptResult,
} from '@/lib/transcribe-streaming';
import type { TranscriptItem } from '@/lib/types';
import { useParticipants } from './useParticipants';

// ==========================================
// 타입 정의
// ==========================================

// 지원 언어 코드 (단일 소스)
const SUPPORTED_LANGUAGE_CODES = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export type SessionState = 'idle' | 'connecting' | 'streaming' | 'reconnecting' | 'error';

export interface UseBrowserTranscriptionOptions {
  sessionId: string | undefined;
  meetingStartTime: number | null;
  currentUserName?: string;
  currentUserProfileImage?: string;
  currentAttendeeId?: string | null;
  userId?: string | null;
  enabled: boolean;
  /** 마이크 음소거 상태 (Chime 음소거와 연동) */
  isMuted?: boolean;
  /** WebSocket 세션 룸 참가 완료 여부 (동기화 준비 상태) */
  isRoomJoined?: boolean;
  /** 로컬 트랜스크립트 추가 콜백 (실시간 동기화용) */
  onLocalTranscript?: (item: TranscriptItem) => void;
  /** 서버 타임스탬프 보정 콜백 */
  onTimestampCorrection?: (id: string, serverTimestamp: number) => void;
  /** 히스토리 로드 완료 콜백 */
  onHistoryLoaded?: (history: TranscriptItem[]) => void;
}

export interface UseBrowserTranscriptionReturn {
  // 상태
  sessionState: SessionState;
  isStreaming: boolean;
  transcripts: TranscriptItem[];
  isLoadingHistory: boolean;

  // 언어
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  isChangingLanguage: boolean;

  // VAD
  isSpeaking: boolean;
  silenceSeconds: number;

  // 액션
  startTranscription: () => Promise<void>;
  stopTranscription: () => void;

  // 에러
  error: Error | null;
  /** 히스토리 로드 실패 에러 */
  historyError: Error | null;
  /** 언어 변경 실패 에러 */
  languageChangeError: Error | null;
  /** 저장 실패한 트랜스크립트 수 */
  failedSaveCount: number;
  /** 저장 재시도 진행 중 */
  isRetryingSaves: boolean;
  /** 실패한 저장 수동 재시도 */
  retryFailedSaves: () => Promise<void>;

  // 참가자 조회
  getParticipantByAttendeeId: (attendeeId: string) => { name: string; profileImage?: string };

  // Ref for auto-scroll
  transcriptContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface TranscribeUrlResponse {
  url: string;
  languageCode: SupportedLanguage;
  expiresIn: number;
}

/**
 * 트랜스크립션 히스토리 아이템 (서버 응답)
 */
interface TranscriptionHistoryItem {
  id: string;
  resultId?: string;
  originalText: string;
  speakerId?: string;
  chimeAttendeeId?: string;
  startTimeMs: number;
  endTimeMs: number;
  relativeStartSec?: number;
  speaker?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// 지원 언어 목록
export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'ko-KR', label: '한국어', flag: '🇰🇷' },
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
];

// ==========================================
// useBrowserTranscription Hook
// ==========================================

export function useBrowserTranscription({
  sessionId,
  meetingStartTime,
  currentUserName,
  currentUserProfileImage,
  currentAttendeeId,
  userId,
  enabled,
  isMuted = false,
  isRoomJoined = false,
  onLocalTranscript,
  onTimestampCorrection,
  onHistoryLoaded,
}: UseBrowserTranscriptionOptions): UseBrowserTranscriptionReturn {
  const meetingManager = useMeetingManager();
  const { selectedDevice: selectedAudioDevice } = useAudioInputs();

  const { getParticipantByAttendeeId } = useParticipants({
    meetingId: sessionId,
    currentUserName,
    currentUserProfileImage,
    currentAttendeeId,
  });

  // State
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedLanguage, setSelectedLanguageState] = useState<SupportedLanguage>('ko-KR');
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [silenceSeconds, setSilenceSeconds] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [historyError, setHistoryError] = useState<Error | null>(null);
  const [languageChangeError, setLanguageChangeError] = useState<Error | null>(null);
  const [failedSaveCount, setFailedSaveCount] = useState(0);
  const [isRetryingSaves, setIsRetryingSaves] = useState(false);

  // Refs
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<TranscribeStreamingClient | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const hasLoadedHistoryRef = useRef(false);
  const isManualStopRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const lastSuccessfulConnectionRef = useRef<number>(0);
  const isMutedRef = useRef(isMuted);
  const isMountedRef = useRef(true);
  const maxReconnectAttempts = 10; // 재연결 시도 횟수 증가 (3 → 10)
  const reconnectResetTimeMs = 60000; // 1분 동안 연결 유지 시 재연결 카운터 리셋

  // 저장 실패한 트랜스크립트 추적 (재시도용)
  interface FailedSaveData {
    resultId: string;
    isPartial: boolean;
    transcript: string;
    attendeeId: string;
    startTimeMs: number;
    endTimeMs: number;
    confidence: number;
    languageCode: string;
    retryCount: number;
  }
  const failedSavesRef = useRef<Map<string, FailedSaveData>>(new Map());

  // 음소거 상태 동기화 - 음소거 시 연결 종료, 언뮤트 시 재연결
  useEffect(() => {
    isMutedRef.current = isMuted;

    if (isMuted) {
      console.log('[BrowserTranscription] Muted - stopping transcription to avoid timeout');

      // 현재 스트리밍 중이면 정상적으로 종료 (15초 타임아웃 방지)
      if (sessionState === 'streaming' || sessionState === 'connecting') {
        // stopTranscription()은 아직 선언되지 않았으므로 직접 처리
        isManualStopRef.current = true;
        try {
          if (clientRef.current) {
            clientRef.current.stop();
            clientRef.current = null;
          }
        } catch (error) {
          console.error('[BrowserTranscription] Error stopping on mute:', error);
        }
        setSessionState('idle');
        console.log('[BrowserTranscription] Muted - transcription stopped gracefully');
      }
    } else {
      console.log('[BrowserTranscription] Unmuted - will restart transcription');
      // 언뮤트 시 자동 시작은 auto-start effect에서 처리됨
      // sessionState가 idle로 변경되면 자동으로 재시작됨
    }
  }, [isMuted, sessionState]);

  // 저장된 언어 설정 로드 (마운트 시)
  useEffect(() => {
    if (!sessionId || !userId) return;

    const loadSavedLanguage = async () => {
      try {
        // 사용자별 언어 설정 조회
        const response = await fetch(`${API_URL}/api/meetings/${sessionId}/translation/status`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.userLanguage && SUPPORTED_LANGUAGE_CODES.includes(data.userLanguage)) {
            console.log(`[BrowserTranscription] Loaded saved language: ${data.userLanguage}`);
            setSelectedLanguageState(data.userLanguage as SupportedLanguage);
          }
        }
      } catch (err) {
        console.warn('[BrowserTranscription] Failed to load saved language:', err);
      }
    };

    loadSavedLanguage();
  }, [sessionId, userId]);

  // 현재 사용자 정보 (자기 자신의 트랜스크립션용) - useMemo로 안정화
  const currentSpeakerInfo = useMemo(() => ({
    name: currentUserName || '나',
    profileImage: currentUserProfileImage,
    attendeeId: currentAttendeeId || 'local-user',
  }), [currentUserName, currentUserProfileImage, currentAttendeeId]);

  // Pre-signed URL 요청
  const getPresignedUrl = useCallback(async (language: SupportedLanguage): Promise<string> => {
    if (!sessionId) throw new Error('Session ID is required');

    const response = await apiClient.get<TranscribeUrlResponse>(
      `/meetings/sessions/${sessionId}/transcribe-url`,
      { params: { languageCode: language } }
    );

    // 응답 유효성 검사
    if (!response?.url) {
      throw new Error('서버에서 유효한 트랜스크립션 URL을 반환하지 않았습니다.');
    }

    if (!response.url.startsWith('wss://')) {
      throw new Error('서버에서 잘못된 WebSocket URL 형식을 반환했습니다.');
    }

    console.log(`[BrowserTranscription] Got pre-signed URL for ${language}`);
    return response.url;
  }, [sessionId]);

  // 마이크 스트림 획득
  const getMicrophoneStream = useCallback(async (): Promise<MediaStream> => {
    // 기존 스트림이 있으면 재사용
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getAudioTracks();
      if (tracks.length > 0 && tracks[0].readyState === 'live') {
        return mediaStreamRef.current;
      }
    }

    // 새 스트림 생성
    const constraints: MediaStreamConstraints = {
      audio: selectedAudioDevice && typeof selectedAudioDevice === 'string'
        ? { deviceId: { exact: selectedAudioDevice } }
        : true,
      video: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    mediaStreamRef.current = stream;
    return stream;
  }, [selectedAudioDevice]);

  // 트랜스크립션 결과 처리
  const handleTranscriptResult = useCallback((result: TranscriptResult) => {
    // attendeeId가 유효하지 않으면 로그만 남기고 계속 진행
    // (백엔드에서 참가자 조회 실패해도 트랜스크립트는 저장/브로드캐스트됨)
    if (!currentSpeakerInfo.attendeeId || currentSpeakerInfo.attendeeId === 'local-user') {
      console.warn('[BrowserTranscription] attendeeId not set, using fallback:', currentSpeakerInfo.attendeeId);
    }

    // 임시 타임스탬프 (서버에서 보정됨)
    const elapsedMs = meetingStartTime
      ? Date.now() - meetingStartTime
      : result.startTimeMs;

    const newItem: TranscriptItem = {
      id: result.resultId,
      speakerName: currentSpeakerInfo.name,
      speakerId: currentSpeakerInfo.attendeeId,
      speakerProfileImage: currentSpeakerInfo.profileImage,
      text: result.transcript,
      timestamp: elapsedMs > 0 ? elapsedMs : 0,
      isPartial: result.isPartial,
      attendeeId: currentSpeakerInfo.attendeeId,
      languageCode: selectedLanguage, // 발화자 언어
    };

    // 동기화 훅에 로컬 트랜스크립트 전달 (있는 경우)
    if (onLocalTranscript) {
      onLocalTranscript(newItem);
    } else {
      // 콜백이 없으면 내부 상태에 직접 저장
      setTranscripts((prev) => {
        const existingIndex = prev.findIndex((t) => t.id === newItem.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newItem;
          return updated;
        }
        return [...prev, newItem];
      });
    }

    // 서버에 저장 (partial 포함 - 실시간 동기화용)
    if (sessionId) {
      const avgConfidence = result.items && result.items.length > 0
        ? result.items.reduce((sum, item) => sum + (item.confidence || 0), 0) / result.items.length
        : 0;

      // 서버에 저장 (비동기, 실패 시 재시도 큐에 저장)
      // AWS Transcribe의 startTimeMs는 WebSocket 연결 시작 이후의 상대 시간
      // sessionStartTimeRef는 이 사용자의 Transcribe WebSocket이 연결된 시간
      // 백엔드는 절대 epoch time을 기대하므로 변환 필요
      const absoluteStartTimeMs = sessionStartTimeRef.current
        ? sessionStartTimeRef.current + result.startTimeMs
        : Date.now();
      const absoluteEndTimeMs = sessionStartTimeRef.current
        ? sessionStartTimeRef.current + result.endTimeMs
        : Date.now();

      // 백엔드 DTO에 맞는 필드만 포함 (retryCount 등 클라이언트 전용 필드 제외)
      const savePayload = {
        sessionId,
        resultId: result.resultId,
        isPartial: result.isPartial,
        transcript: result.transcript,
        attendeeId: currentSpeakerInfo.attendeeId,
        startTimeMs: absoluteStartTimeMs,
        endTimeMs: absoluteEndTimeMs,
        confidence: avgConfidence,
        languageCode: selectedLanguage,
        isStable: true,
      };

      // 재시도 큐용 데이터 (retryCount 포함)
      const failedSaveData = {
        ...savePayload,
        retryCount: 0,
      };

      (async () => {
        try {
          const response = await fetch(`${API_URL}/api/meetings/${sessionId}/transcriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(savePayload),
          });

          if (response.ok) {
            const data = await response.json();
            // 저장 성공 시 실패 큐에서 제거 (이전에 실패했던 경우)
            if (failedSavesRef.current.has(result.resultId)) {
              failedSavesRef.current.delete(result.resultId);
              if (isMountedRef.current) {
                setFailedSaveCount(failedSavesRef.current.size);
              }
            }
            // 서버에서 계산된 타임스탬프로 보정
            if (data.serverTimestamp !== undefined && onTimestampCorrection) {
              onTimestampCorrection(result.resultId, data.serverTimestamp);
            }
          } else {
            console.error(`[BrowserTranscription] Failed to save transcript: ${response.status} ${response.statusText}`);
            // Final 트랜스크립트만 재시도 큐에 저장 (partial은 덮어쓰기 되므로)
            if (!result.isPartial) {
              failedSavesRef.current.set(result.resultId, failedSaveData);
              if (isMountedRef.current) {
                setFailedSaveCount(failedSavesRef.current.size);
              }
            }
          }
        } catch (err) {
          console.error('[BrowserTranscription] Network error saving transcript:', err);
          // Final 트랜스크립트만 재시도 큐에 저장
          if (!result.isPartial) {
            failedSavesRef.current.set(result.resultId, failedSaveData);
            if (isMountedRef.current) {
              setFailedSaveCount(failedSavesRef.current.size);
            }
          }
        }
      })();

      if (!result.isPartial) {
        console.log(`[BrowserTranscription] Final transcript: "${result.transcript}"`);
      }
    }

    // 음성 활동 감지 - 무음 타이머 리셋
    if (result.transcript.trim()) {
      setSilenceSeconds(0);
      setIsSpeaking(true);
    }

    // 자동 스크롤
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [meetingStartTime, sessionId, selectedLanguage, currentSpeakerInfo, onLocalTranscript, onTimestampCorrection]);

  // 트랜스크립션 시작
  const startTranscription = useCallback(async () => {
    if (!enabled || !sessionId || sessionState === 'streaming' || sessionState === 'connecting') {
      console.log('[BrowserTranscription] Cannot start:', { enabled, sessionId, sessionState });
      return;
    }

    console.log('[BrowserTranscription] Starting transcription...');
    setSessionState('connecting');
    setError(null);
    isManualStopRef.current = false;

    try {
      // 1. Pre-signed URL 획득
      const presignedUrl = await getPresignedUrl(selectedLanguage);

      // 2. 마이크 스트림 획득
      const stream = await getMicrophoneStream();

      // 3. Transcribe 클라이언트 생성
      const client = new TranscribeStreamingClient({
        presignedUrl,
        sampleRate: 16000,
        onTranscript: handleTranscriptResult,
        onOpen: () => {
          if (!isMountedRef.current) return;
          console.log('[BrowserTranscription] WebSocket connected');
          setSessionState('streaming');
          sessionStartTimeRef.current = Date.now();
          lastSuccessfulConnectionRef.current = Date.now();
          reconnectAttemptsRef.current = 0; // 연결 성공 시 즉시 리셋

          // 무음 감지 타이머 시작
          if (silenceTimerRef.current) {
            clearInterval(silenceTimerRef.current);
          }
          silenceTimerRef.current = setInterval(() => {
            if (!isMountedRef.current) {
              if (silenceTimerRef.current) {
                clearInterval(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
              return;
            }

            // 음소거 상태에서는 무음이 당연하므로 카운터 리셋 (재연결 방지)
            if (isMutedRef.current) {
              setSilenceSeconds(0);
              return;
            }

            setSilenceSeconds((prev) => {
              const newVal = prev + 1;
              // 14초 무음 시 경고 (15초 타임아웃 전 선제적 처리)
              if (newVal >= 14 && !isManualStopRef.current) {
                console.log('[BrowserTranscription] 14s silence - reconnecting...');
                // 현재 세션 종료하고 재연결
                client.stop();
              }
              return newVal;
            });
          }, 1000);
        },
        onError: (err) => {
          if (!isMountedRef.current) return;
          console.error('[BrowserTranscription] Error:', err);
          setError(err);
          setSessionState('error');
        },
        onClose: () => {
          console.log('[BrowserTranscription] WebSocket closed');

          if (silenceTimerRef.current) {
            clearInterval(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          // 마운트 해제된 경우 재연결 시도하지 않음
          if (!isMountedRef.current) {
            console.log('[BrowserTranscription] Component unmounted, skipping reconnect');
            return;
          }

          // 연결이 충분히 유지되었으면 (1분 이상) 재연결 카운터 리셋
          const connectionDuration = Date.now() - lastSuccessfulConnectionRef.current;
          if (connectionDuration >= reconnectResetTimeMs) {
            console.log(`[BrowserTranscription] Connection was stable for ${Math.round(connectionDuration / 1000)}s, resetting reconnect counter`);
            reconnectAttemptsRef.current = 0;
          }

          // 자동 재연결 (수동 종료가 아니고, 음소거 상태가 아닌 경우)
          // 음소거 중에는 오디오를 전송하지 않으므로 재연결할 필요 없음
          if (!isManualStopRef.current && enabled && !isMutedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            console.log(`[BrowserTranscription] Auto-reconnecting (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
            setSessionState('reconnecting');
            setTimeout(() => {
              if (!isMountedRef.current) return;
              startTranscription();
            }, 1000);
          } else if (isMutedRef.current) {
            // 음소거 상태에서는 idle로 전환 (언뮤트 시 재연결됨)
            console.log('[BrowserTranscription] Muted - staying disconnected until unmute');
            setSessionState('idle');
          } else {
            // 재연결 시도 횟수 초과 시 에러 표시
            if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
              setError(new Error('트랜스크립션 연결이 끊어졌습니다. 다시 시작해주세요.'));
              setSessionState('error');
            } else {
              setSessionState('idle');
            }
          }
        },
      });

      clientRef.current = client;

      // 4. 스트리밍 시작
      await client.start(stream);

    } catch (err) {
      console.error('[BrowserTranscription] Failed to start:', err);

      // 에러 발생 시 리소스 정리
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      setError(err instanceof Error ? err : new Error(String(err)));
      setSessionState('error');
    }
  }, [enabled, sessionId, sessionState, selectedLanguage, getPresignedUrl, getMicrophoneStream, handleTranscriptResult]);

  // 트랜스크립션 중지
  const stopTranscription = useCallback(() => {
    console.log('[BrowserTranscription] Stopping transcription...');
    isManualStopRef.current = true;

    // 클라이언트 정리 (에러 발생해도 계속 진행)
    try {
      if (clientRef.current) {
        clientRef.current.stop();
      }
    } catch (error) {
      console.error('[BrowserTranscription] Error stopping transcription client:', error);
    } finally {
      clientRef.current = null;
    }

    // 타이머 정리 (에러 발생해도 계속 진행)
    try {
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
    } catch (error) {
      console.error('[BrowserTranscription] Error clearing silence timer:', error);
    } finally {
      silenceTimerRef.current = null;
    }

    setSessionState('idle');
    setSilenceSeconds(0);
    setIsSpeaking(false);
  }, []);

  // 언어 변경
  const setSelectedLanguage = useCallback(async (languageCode: string) => {
    // 지원 언어 유효성 검사 (SUPPORTED_LANGUAGE_CODES 사용)
    if (!SUPPORTED_LANGUAGE_CODES.includes(languageCode as SupportedLanguage)) {
      console.warn(`[BrowserTranscription] Unsupported language: ${languageCode}`);
      return;
    }

    const language = languageCode as SupportedLanguage;
    if (language === selectedLanguage || isChangingLanguage) return;

    console.log(`[BrowserTranscription] Changing language to ${language}`);
    setIsChangingLanguage(true);
    setLanguageChangeError(null); // 이전 에러 초기화

    // 현재 세션 중지
    const wasStreaming = sessionState === 'streaming';
    if (wasStreaming) {
      stopTranscription();
    }

    // 언어 상태 업데이트
    setSelectedLanguageState(language);

    // 서버에 언어 설정 저장
    if (sessionId) {
      try {
        const response = await fetch(`${API_URL}/api/meetings/${sessionId}/transcription/change-language`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ languageCode: language }),
        });

        if (!response.ok) {
          const errorMessage = `언어 변경 실패: ${response.status} ${response.statusText}`;
          console.error(`[BrowserTranscription] Failed to save language setting: ${response.status}`);
          if (isMountedRef.current) {
            setLanguageChangeError(new Error(errorMessage));
          }
        }
      } catch (err) {
        console.error('[BrowserTranscription] Network error saving language:', err);
        if (isMountedRef.current) {
          setLanguageChangeError(err instanceof Error ? err : new Error('언어 설정 저장 중 네트워크 오류'));
        }
      }
    }

    if (isMountedRef.current) {
      setIsChangingLanguage(false);
    }

    // 다시 시작 (이전에 스트리밍 중이었다면)
    if (wasStreaming && enabled) {
      setTimeout(() => {
        if (!isMountedRef.current) return;
        startTranscription();
      }, 500);
    }
  }, [selectedLanguage, isChangingLanguage, sessionState, sessionId, enabled, stopTranscription, startTranscription]);

  // 실패한 저장 재시도
  const retryFailedSaves = useCallback(async () => {
    if (failedSavesRef.current.size === 0 || isRetryingSaves || !sessionId) {
      return;
    }

    console.log(`[BrowserTranscription] Retrying ${failedSavesRef.current.size} failed saves...`);
    setIsRetryingSaves(true);

    const maxRetries = 3;
    const entriesToRetry = Array.from(failedSavesRef.current.entries());

    for (const [resultId, saveData] of entriesToRetry) {
      if (!isMountedRef.current) break;

      // 최대 재시도 횟수 초과 시 건너뛰기
      if (saveData.retryCount >= maxRetries) {
        console.warn(`[BrowserTranscription] Max retries exceeded for ${resultId}, removing from queue`);
        failedSavesRef.current.delete(resultId);
        continue;
      }

      try {
        const response = await fetch(`${API_URL}/api/meetings/${sessionId}/transcriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sessionId,
            resultId: saveData.resultId,
            isPartial: saveData.isPartial,
            transcript: saveData.transcript,
            attendeeId: saveData.attendeeId,
            startTimeMs: saveData.startTimeMs,
            endTimeMs: saveData.endTimeMs,
            confidence: saveData.confidence,
            languageCode: saveData.languageCode,
            isStable: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[BrowserTranscription] Successfully retried save for ${resultId}`);
          failedSavesRef.current.delete(resultId);

          // 서버 타임스탬프로 보정
          if (data.serverTimestamp !== undefined && onTimestampCorrection) {
            onTimestampCorrection(resultId, data.serverTimestamp);
          }
        } else {
          console.error(`[BrowserTranscription] Retry failed for ${resultId}: ${response.status}`);
          // 재시도 횟수 증가
          failedSavesRef.current.set(resultId, {
            ...saveData,
            retryCount: saveData.retryCount + 1,
          });
        }
      } catch (err) {
        console.error(`[BrowserTranscription] Retry network error for ${resultId}:`, err);
        // 재시도 횟수 증가
        failedSavesRef.current.set(resultId, {
          ...saveData,
          retryCount: saveData.retryCount + 1,
        });
      }
    }

    if (isMountedRef.current) {
      setFailedSaveCount(failedSavesRef.current.size);
      setIsRetryingSaves(false);
    }

    console.log(`[BrowserTranscription] Retry complete. Remaining failed: ${failedSavesRef.current.size}`);
  }, [sessionId, isRetryingSaves, onTimestampCorrection]);

  // 기존 자막 히스토리 로드
  const loadTranscriptionHistory = useCallback(async () => {
    if (!sessionId || hasLoadedHistoryRef.current) return;

    hasLoadedHistoryRef.current = true;
    setIsLoadingHistory(true);
    setHistoryError(null); // 이전 에러 초기화

    try {
      const response = await fetch(
        `${API_URL}/api/meetings/${sessionId}/transcriptions/final`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error(`히스토리 로드 실패: ${response.status} ${response.statusText}`);
      }

      const historyItems: TranscriptionHistoryItem[] = await response.json();

      // 응답이 배열인지 확인
      if (!Array.isArray(historyItems)) {
        console.error('[BrowserTranscription] Expected array, got:', typeof historyItems);
        throw new Error('서버에서 잘못된 형식의 응답을 반환했습니다.');
      }

      if (historyItems.length > 0) {
        const sessionStartMs = meetingStartTime || Date.now();

        const historyTranscripts: TranscriptItem[] = historyItems.map((item) => ({
          id: item.resultId || item.id,
          speakerName: item.speaker?.name || '참가자',
          speakerId: item.speakerId || item.chimeAttendeeId || 'unknown',
          speakerProfileImage: item.speaker?.profileImage,
          text: item.originalText,
          timestamp: item.relativeStartSec
            ? item.relativeStartSec * 1000
            : (item.startTimeMs - sessionStartMs),
          isPartial: false,
          attendeeId: item.chimeAttendeeId,
        }));

        // 동기화 훅에 히스토리 전달 (있는 경우)
        if (onHistoryLoaded) {
          onHistoryLoaded(historyTranscripts);
        } else {
          setTranscripts(historyTranscripts);
        }
        console.log(`[BrowserTranscription] Loaded ${historyTranscripts.length} historical transcripts`);
      }
    } catch (error) {
      console.error('[BrowserTranscription] Failed to load history:', error);
      // 에러 상태 저장 (사용자에게 표시 가능)
      if (isMountedRef.current) {
        setHistoryError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingHistory(false);
      }
    }
  }, [sessionId, meetingStartTime, onHistoryLoaded]);

  // 미팅 참여 시 기존 자막 로드
  useEffect(() => {
    if (sessionId && !hasLoadedHistoryRef.current) {
      loadTranscriptionHistory();
    }
  }, [sessionId, loadTranscriptionHistory]);

  // 자동 시작 트리거 ref (의존성 변경 시 타이머 취소 방지)
  const autoStartTriggeredRef = useRef(false);
  const autoStartTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 최신 startTranscription 함수를 항상 참조하기 위한 ref
  const startTranscriptionRef = useRef(startTranscription);
  // startTranscription이 변경될 때마다 ref 업데이트
  useEffect(() => {
    startTranscriptionRef.current = startTranscription;
  }, [startTranscription]);

  // enabled 변경, 언뮤트, 또는 룸 참가 완료 시 자동 시작/중지
  useEffect(() => {
    console.log('[BrowserTranscription] Auto-start effect running:', {
      isMuted,
      isRoomJoined,
      enabled,
      sessionId: !!sessionId,
      hasAudioVideo: !!meetingManager.audioVideo,
      sessionState,
      autoStartTriggered: autoStartTriggeredRef.current,
    });

    // 1. 먼저 중지 조건 체크 (비활성화 시 스트리밍 중지)
    if (!enabled && sessionState === 'streaming') {
      console.log('[BrowserTranscription] Disabled while streaming - stopping');
      stopTranscription();
      autoStartTriggeredRef.current = false;
      return;
    }

    // 2. 시작 조건 체크

    // 음소거 상태에서는 시작하지 않음
    if (isMuted) {
      console.log('[BrowserTranscription] Skipping - muted');
      return;
    }

    // WebSocket 룸 참가가 완료될 때까지 대기 (다른 사용자들이 브로드캐스트를 받을 준비가 될 때까지)
    if (!isRoomJoined) {
      console.log('[BrowserTranscription] Waiting for WebSocket room join before starting transcription');
      return;
    }

    // 이미 시작 중이거나 스트리밍 중이면 스킵
    if (autoStartTriggeredRef.current || sessionState === 'streaming' || sessionState === 'connecting') {
      console.log('[BrowserTranscription] Already starting or streaming, skipping');
      return;
    }

    if (enabled && sessionId && meetingManager.audioVideo && sessionState === 'idle') {
      console.log('[BrowserTranscription] All conditions met, scheduling transcription start...');
      autoStartTriggeredRef.current = true;

      // 이전 타이머 정리
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
      }

      // 약간의 딜레이 후 시작 (오디오 설정 완료 대기)
      autoStartTimerRef.current = setTimeout(() => {
        autoStartTimerRef.current = null;

        if (!isMountedRef.current) {
          console.log('[BrowserTranscription] Component unmounted, skipping start');
          autoStartTriggeredRef.current = false;
          return;
        }
        if (isMutedRef.current) {
          console.log('[BrowserTranscription] Muted during delay, skipping start');
          autoStartTriggeredRef.current = false;
          return;
        }
        console.log('[BrowserTranscription] ✅ Room joined and ready - starting transcription');
        startTranscriptionRef.current();
      }, 500);
    } else {
      console.log('[BrowserTranscription] Conditions not met for auto-start:', {
        enabled,
        hasSessionId: !!sessionId,
        hasAudioVideo: !!meetingManager.audioVideo,
        sessionState,
      });
    }

    // Cleanup: 의존성 변경 시 타이머 취소 및 플래그 리셋
    return () => {
      if (autoStartTimerRef.current) {
        console.log('[BrowserTranscription] Cleanup: cancelling pending auto-start timer');
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
        // 타이머가 취소되면 다음 effect 실행에서 다시 시작할 수 있도록 리셋
        autoStartTriggeredRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- startTranscription은 ref로 관리됨
  }, [enabled, sessionId, meetingManager.audioVideo, sessionState, isMuted, isRoomJoined, stopTranscription]);

  // sessionState가 idle로 리셋되면 autoStartTriggered도 리셋
  useEffect(() => {
    if (sessionState === 'idle') {
      autoStartTriggeredRef.current = false;
    }
  }, [sessionState]);

  // sessionId 변경 시 상태 초기화
  useEffect(() => {
    // sessionId가 변경되면 히스토리 로드 플래그 리셋
    hasLoadedHistoryRef.current = false;
    reconnectAttemptsRef.current = 0;
  }, [sessionId]);

  // 클린업
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      isManualStopRef.current = true;
      console.log('[BrowserTranscription] 🧹 Cleaning up on unmount');

      if (clientRef.current) {
        clientRef.current.stop();
        clientRef.current = null;
      }

      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // 자동 시작 타이머 정리
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
      autoStartTriggeredRef.current = false;

      // 상태 리셋 플래그
      hasLoadedHistoryRef.current = false;
      reconnectAttemptsRef.current = 0;
    };
  }, []);

  return {
    // 상태
    sessionState,
    isStreaming: sessionState === 'streaming',
    transcripts,
    isLoadingHistory,

    // 언어
    selectedLanguage,
    setSelectedLanguage,
    isChangingLanguage,

    // VAD
    isSpeaking,
    silenceSeconds,

    // 액션
    startTranscription,
    stopTranscription,

    // 에러
    error,
    historyError,
    languageChangeError,
    failedSaveCount,
    isRetryingSaves,
    retryFailedSaves,

    // 참가자 조회
    getParticipantByAttendeeId,

    // Ref
    transcriptContainerRef,
  };
}
