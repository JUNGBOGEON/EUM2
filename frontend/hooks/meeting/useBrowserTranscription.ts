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
import { transcriptDebugLog } from '@/lib/meeting/debug-logger';

// ==========================================
// 타입 정의
// ==========================================

// 지원 언어 코드 (단일 소스)
const SUPPORTED_LANGUAGE_CODES = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN'] as const;

// ==========================================
// 강제 분할 설정 (긴 발화 처리)
// ==========================================

/**
 * 강제 분할 설정
 * AWS Transcribe가 final을 주지 않을 때 프론트엔드에서 강제로 분할
 */
const FORCE_SPLIT_CONFIG = {
  /** 이 글자 수 초과 시 강제 분할 */
  MAX_CHARS: 80,
  /** 이 시간(ms) 경과 시 강제 분할 */
  MAX_DURATION_MS: 5000,
  /** 최소 이 글자 수 이상일 때만 분할 (너무 짧은 분할 방지) */
  MIN_CHARS_FOR_SPLIT: 15,
  /** 분할 체크 간격 (ms) */
  CHECK_INTERVAL_MS: 500,
  /** 문장 완료 신뢰도 임계값 (이 이상이면 즉시 분할) */
  SENTENCE_CONFIDENCE_THRESHOLD: 0.7,
  /** 무음 후 partial 강제 확정 (초) */
  SILENCE_FINALIZE_SECONDS: 2,
} as const;

/**
 * Partial 버퍼 상태 타입
 */
interface PartialBuffer {
  resultId: string;
  text: string;
  startTime: number;
  lastUpdateTime: number;
  startTimeMs: number;  // AWS Transcribe 타임스탬프
  endTimeMs: number;
  forceSplitCount: number;  // 해당 발화에서 강제 분할된 횟수
  /** 이미 분할되어 전송된 텍스트 길이 (중복 방지용) */
  splitTextLength: number;
}

/**
 * 문장 분석 결과 타입
 */
interface SentenceAnalysis {
  isComplete: boolean;
  confidence: number;
  reason: string;
}

// ==========================================
// 문장 감지 유틸리티 (다국어 지원)
// ==========================================

/**
 * 한국어 종결어미 패턴
 */
const KOREAN_SENTENCE_PATTERNS = {
  // 정중어 종결어미 (가장 확실)
  formal: ['습니다', '입니다', '합니다', '됩니다', '있습니다', '없습니다', '였습니다', '었습니다', '겠습니다', '봅니다', '옵니다', '줍니다'],
  // 비격식 종결어미
  informal: ['해요', '에요', '세요', '네요', '죠', '어요', '아요', '예요', '래요', '데요'],
  // 평서형 종결어미
  plain: ['다', '까', '네', '나', '지', '군', '구나', '라'],
  // 의문형
  question: ['니까', '나요', '까요', '을까요', '을까', '건가요'],
  // 연결어미 (미완성 표시)
  connectives: ['고', '며', '면서', '어서', '아서', '니까', '면', '려고', '도록', '는데', '은데', '지만', '더라도', '으면', '거나', '든지', '라서', '해서'],
  // 조사 (미완성 가능성 높음)
  particles: ['을', '를', '이', '가', '은', '는', '에', '의', '와', '과', '로', '으로', '에서', '까지', '부터'],
};

/**
 * 일본어 종결어미 패턴
 */
const JAPANESE_ENDINGS = ['です', 'ます', 'した', 'ました', 'だ', 'である', 'よ', 'ね', 'か', 'わ'];

/**
 * 문장 완료 여부를 분석합니다 (프론트엔드용 경량 버전)
 */
function analyzeSentence(text: string, languageCode: string): SentenceAnalysis {
  const trimmed = text.trim();

  if (!trimmed || trimmed.length < 5) {
    return { isComplete: false, confidence: 0, reason: 'Too short' };
  }

  // 1. 명확한 종결 부호 확인 (모든 언어)
  if (/[.?!。？！]$/.test(trimmed)) {
    return { isComplete: true, confidence: 0.95, reason: 'Punctuation ending' };
  }

  // 2. 언어별 분석
  if (languageCode.startsWith('ko')) {
    return analyzeKorean(trimmed);
  } else if (languageCode.startsWith('en')) {
    return analyzeEnglish(trimmed);
  } else if (languageCode.startsWith('ja')) {
    return analyzeJapanese(trimmed);
  } else if (languageCode.startsWith('zh')) {
    return analyzeChinese(trimmed);
  }

  return { isComplete: false, confidence: 0.3, reason: 'Unknown language' };
}

/**
 * 한국어 문장 분석
 */
function analyzeKorean(text: string): SentenceAnalysis {
  // 정중어 종결어미 (가장 신뢰도 높음)
  for (const ending of KOREAN_SENTENCE_PATTERNS.formal) {
    if (text.endsWith(ending)) {
      return { isComplete: true, confidence: 0.9, reason: `Formal ending: ${ending}` };
    }
  }

  // 비격식 종결어미
  for (const ending of KOREAN_SENTENCE_PATTERNS.informal) {
    if (text.endsWith(ending)) {
      return { isComplete: true, confidence: 0.85, reason: `Informal ending: ${ending}` };
    }
  }

  // 평서형 종결어미 (짧은 텍스트에서는 신뢰도 낮음)
  for (const ending of KOREAN_SENTENCE_PATTERNS.plain) {
    if (text.endsWith(ending) && text.length > 10) {
      return { isComplete: true, confidence: 0.65, reason: `Plain ending: ${ending}` };
    }
  }

  // 의문형 종결어미
  for (const ending of KOREAN_SENTENCE_PATTERNS.question) {
    if (text.endsWith(ending)) {
      return { isComplete: true, confidence: 0.8, reason: `Question ending: ${ending}` };
    }
  }

  // 연결어미로 끝남 (미완성)
  for (const conn of KOREAN_SENTENCE_PATTERNS.connectives) {
    if (text.endsWith(conn)) {
      return { isComplete: false, confidence: 0.8, reason: `Connective: ${conn}` };
    }
  }

  // 조사로 끝남 (미완성 가능성 높음)
  for (const particle of KOREAN_SENTENCE_PATTERNS.particles) {
    if (text.endsWith(particle)) {
      return { isComplete: false, confidence: 0.7, reason: `Particle: ${particle}` };
    }
  }

  return { isComplete: false, confidence: 0.4, reason: 'Unknown pattern' };
}

/**
 * 영어 문장 분석
 */
function analyzeEnglish(text: string): SentenceAnalysis {
  // 완전한 문장 구조 (주어 + 동사)
  const hasSubjectVerb = /\b(I|you|he|she|it|we|they|this|that|there)\s+(am|is|are|was|were|have|has|had|do|does|did|will|would|can|could|should|must|may|might)\b/i.test(text);

  if (hasSubjectVerb && text.length > 30) {
    return { isComplete: true, confidence: 0.6, reason: 'Complete sentence structure' };
  }

  // 미완성 구조 (전치사, 접속사로 끝남)
  if (/\b(and|or|but|so|because|if|when|while|that|which|who|to|for|with|in|on|at)$/i.test(text)) {
    return { isComplete: false, confidence: 0.8, reason: 'Incomplete structure' };
  }

  return { isComplete: false, confidence: 0.4, reason: 'Unknown pattern' };
}

/**
 * 일본어 문장 분석
 */
function analyzeJapanese(text: string): SentenceAnalysis {
  for (const ending of JAPANESE_ENDINGS) {
    if (text.endsWith(ending)) {
      return { isComplete: true, confidence: 0.85, reason: `Japanese ending: ${ending}` };
    }
  }

  // 조사로 끝남 (미완성)
  if (/[はがをにでとへもや]$/.test(text)) {
    return { isComplete: false, confidence: 0.75, reason: 'Particle ending' };
  }

  return { isComplete: false, confidence: 0.4, reason: 'Unknown pattern' };
}

/**
 * 중국어 문장 분석
 */
function analyzeChinese(text: string): SentenceAnalysis {
  // 문장 종결 표현
  if (/[了吗呢吧啊呀哦哇嘛]$/.test(text)) {
    return { isComplete: true, confidence: 0.8, reason: 'Sentence-final particle' };
  }

  return { isComplete: false, confidence: 0.4, reason: 'Unknown pattern' };
}

/**
 * 강제 분할 시 사용할 표시 ID를 생성합니다.
 * - 첫 번째 분할 (forceSplitCount===0): 원본 ID 사용 → 기존 partial을 final로 업데이트
 * - 후속 분할: 연속 ID 사용 → 새로운 항목으로 추가
 *
 * partial 표시와 forced final 모두 동일한 ID 전략을 사용하여
 * partial → final 전환이 자연스럽게 이루어지도록 합니다.
 */
function getDisplayId(resultId: string, forceSplitCount: number): string {
  if (forceSplitCount === 0) {
    // 첫 번째 분할: 원본 ID 사용 (기존 partial 업데이트)
    return resultId;
  }
  // 후속 분할: 연속 ID 사용 (새 항목 추가)
  // 숫자를 3자리로 패딩하여 정렬 시 순서 보장 (001, 002, ...)
  return `${resultId}-cont-${String(forceSplitCount).padStart(3, '0')}`;
}

/**
 * 트랜스크립트 정렬 함수
 * timestamp 기준 정렬, 같으면 ID로 보조 정렬 (분할 순서 보장)
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
 * 강제 분할이 필요한지 판단합니다.
 * @returns { shouldSplit: boolean, reason: string }
 */
function shouldForceSplit(
  buffer: PartialBuffer,
  languageCode: string,
  now: number = Date.now()
): { shouldSplit: boolean; reason: string } {
  const { text, startTime } = buffer;
  const duration = now - startTime;

  // 1. 텍스트가 너무 짧으면 분할하지 않음
  if (text.length < FORCE_SPLIT_CONFIG.MIN_CHARS_FOR_SPLIT) {
    return { shouldSplit: false, reason: 'Text too short' };
  }

  // 2. 문장 감지
  const analysis = analyzeSentence(text, languageCode);

  // 문장이 완료되었고 신뢰도가 높으면 즉시 분할
  if (analysis.isComplete && analysis.confidence >= FORCE_SPLIT_CONFIG.SENTENCE_CONFIDENCE_THRESHOLD) {
    return { shouldSplit: true, reason: `Sentence complete: ${analysis.reason}` };
  }

  // 3. 글자 수 초과
  if (text.length > FORCE_SPLIT_CONFIG.MAX_CHARS) {
    // 문장이 미완성이더라도 너무 길면 분할
    return { shouldSplit: true, reason: `Max chars exceeded: ${text.length}` };
  }

  // 4. 시간 초과 (문장이 미완성이어도 오래되면 분할)
  if (duration > FORCE_SPLIT_CONFIG.MAX_DURATION_MS) {
    return { shouldSplit: true, reason: `Max duration exceeded: ${duration}ms` };
  }

  // 5. 중간 신뢰도 문장 완료 + 일정 시간 경과
  if (analysis.isComplete && analysis.confidence >= 0.5 && duration > 2000) {
    return { shouldSplit: true, reason: `Likely complete sentence after ${duration}ms` };
  }

  return { shouldSplit: false, reason: 'No split needed' };
}
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

  // ==========================================
  // 강제 분할 관련 Refs
  // ==========================================

  /** Partial 트랜스크립트 버퍼 (강제 분할용) */
  const partialBufferRef = useRef<PartialBuffer>({
    resultId: '',
    text: '',
    startTime: 0,
    lastUpdateTime: 0,
    startTimeMs: 0,
    endTimeMs: 0,
    forceSplitCount: 0,
    splitTextLength: 0,
  });

  /** 강제 분할 체크 타이머 */
  const forceSplitTimerRef = useRef<NodeJS.Timeout | null>(null);

  /** 강제 분할 진행 중 플래그 (중복 방지) */
  const isForceSplittingRef = useRef(false);

  // 이전 음소거 상태 추적 (불필요한 effect 실행 방지)
  const prevMutedRef = useRef(isMuted);

  // 음소거 상태 동기화 - 음소거 시 연결 종료, 언뮤트 시 재연결
  useEffect(() => {
    const wasMuted = prevMutedRef.current;
    prevMutedRef.current = isMuted;
    isMutedRef.current = isMuted;

    // 실제 음소거 상태 변경이 있을 때만 처리 (sessionState 변경만으로는 실행 안 함)
    if (wasMuted === isMuted) {
      return;
    }

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
  const currentSpeakerInfo = useMemo(() => {
    const info = {
      name: currentUserName || '나',
      profileImage: currentUserProfileImage,
      attendeeId: currentAttendeeId || 'local-user',
    };
    // 디버깅: attendeeId가 설정되지 않은 경우 경고
    if (!currentAttendeeId) {
      console.warn('[BrowserTranscription] ⚠️ currentAttendeeId is not set, using fallback:', info.attendeeId);
    }
    return info;
  }, [currentUserName, currentUserProfileImage, currentAttendeeId]);

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

  // ==========================================
  // 강제 분할 처리 함수
  // ==========================================

  /**
   * 강제 분할된 텍스트를 "가상 final"로 서버에 전송합니다.
   * partial이 너무 길어지거나 문장이 완료된 것으로 판단될 때 호출됩니다.
   */
  const sendForcedFinal = useCallback(async (
    forcedResult: {
      resultId: string;
      transcript: string;
      startTimeMs: number;
      endTimeMs: number;
    },
    reason: string
  ) => {
    if (!sessionId || !currentSpeakerInfo.attendeeId || isForceSplittingRef.current) {
      return;
    }

    isForceSplittingRef.current = true;

    console.log(`[ForceSplit] 🔪 Sending forced final: "${forcedResult.transcript.substring(0, 30)}..." (reason: ${reason})`);

    // 서버에 저장할 타임스탬프 계산
    const absoluteStartTimeMs = sessionStartTimeRef.current
      ? sessionStartTimeRef.current + forcedResult.startTimeMs
      : Date.now();
    const absoluteEndTimeMs = sessionStartTimeRef.current
      ? sessionStartTimeRef.current + forcedResult.endTimeMs
      : Date.now();

    // UI 타임스탬프 계산 - 통합 타임라인 (채팅과 동일한 기준)
    // meetingStartTime 기준 현재 경과 시간 사용 (클라이언트-서버 시계 차이 해소)
    const elapsedMs = meetingStartTime
      ? Date.now() - meetingStartTime
      : 0;

    // UI에 먼저 표시 (로컬 트랜스크립트로)
    const forcedItem: TranscriptItem = {
      id: forcedResult.resultId,
      speakerName: currentSpeakerInfo.name,
      speakerId: currentSpeakerInfo.attendeeId,
      speakerProfileImage: currentSpeakerInfo.profileImage,
      text: forcedResult.transcript,
      timestamp: elapsedMs > 0 ? elapsedMs : 0,
      isPartial: false, // final로 표시
      attendeeId: currentSpeakerInfo.attendeeId,
      languageCode: selectedLanguage,
    };

    if (onLocalTranscript) {
      onLocalTranscript(forcedItem);
    } else {
      setTranscripts((prev) => {
        // 같은 ID가 있으면 업데이트 (partial -> final 전환)
        const existingIndex = prev.findIndex((t) => t.id === forcedItem.id);
        if (existingIndex >= 0) {
          const result = [...prev];
          result[existingIndex] = forcedItem;
          // Final 전환 시 정렬 (순서 보장)
          return sortTranscripts(result);
        }
        // 새로 추가 후 정렬
        const result = [...prev, forcedItem];
        return sortTranscripts(result);
      });
    }

    // 서버에 저장 (isPartial: false로 전송하여 번역 트리거)
    const savePayload = {
      sessionId,
      resultId: forcedResult.resultId,
      isPartial: false, // 중요: final로 전송하여 번역이 트리거되도록
      transcript: forcedResult.transcript,
      attendeeId: currentSpeakerInfo.attendeeId,
      startTimeMs: absoluteStartTimeMs,
      endTimeMs: absoluteEndTimeMs,
      confidence: 0.8, // 강제 분할이므로 약간 낮은 신뢰도
      languageCode: selectedLanguage,
      isStable: true,
    };

    try {
      const response = await fetch(`${API_URL}/api/meetings/${sessionId}/transcriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(savePayload),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[ForceSplit] ✅ Forced final saved successfully`);

        // 서버 타임스탬프로 보정
        if (data.serverTimestamp !== undefined && onTimestampCorrection) {
          onTimestampCorrection(forcedResult.resultId, data.serverTimestamp);
        }
      } else {
        console.error(`[ForceSplit] ❌ Failed to save: ${response.status}`);
        // 실패 시 재시도 큐에 추가
        failedSavesRef.current.set(forcedResult.resultId, {
          ...savePayload,
          retryCount: 0,
        });
        if (isMountedRef.current) {
          setFailedSaveCount(failedSavesRef.current.size);
        }
      }
    } catch (err) {
      console.error('[ForceSplit] ❌ Network error:', err);
      failedSavesRef.current.set(forcedResult.resultId, {
        ...savePayload,
        retryCount: 0,
      });
      if (isMountedRef.current) {
        setFailedSaveCount(failedSavesRef.current.size);
      }
    } finally {
      isForceSplittingRef.current = false;
    }
  }, [sessionId, currentSpeakerInfo, selectedLanguage, meetingStartTime, onLocalTranscript, onTimestampCorrection]);

  /**
   * 강제 분할 체크 및 실행
   * 타이머에 의해 주기적으로 호출됩니다.
   */
  const checkAndForceSplit = useCallback(() => {
    const buffer = partialBufferRef.current;

    // 버퍼가 비어있으면 스킵
    if (!buffer.resultId || !buffer.text) {
      return;
    }

    const now = Date.now();
    const { shouldSplit, reason } = shouldForceSplit(buffer, selectedLanguage, now);

    if (shouldSplit) {
      console.log(`[ForceSplit] 🎯 Timer split: "${buffer.text.substring(0, 30)}..." (reason: ${reason}, splitCount: ${buffer.forceSplitCount})`);

      // 표시 ID 생성 (첫 분할은 원본 ID로 기존 partial 업데이트, 후속은 연속 ID)
      const forcedResultId = getDisplayId(buffer.resultId, buffer.forceSplitCount);

      // 강제 분할 전송
      sendForcedFinal({
        resultId: forcedResultId,
        transcript: buffer.text,
        startTimeMs: buffer.startTimeMs,
        endTimeMs: buffer.endTimeMs,
      }, reason);

      // 버퍼 초기화 (새로운 partial을 받을 준비)
      // splitTextLength 업데이트: 현재까지 분할된 텍스트 길이 누적
      const currentResultId = buffer.resultId;
      const newSplitTextLength = buffer.splitTextLength + buffer.text.length;

      partialBufferRef.current = {
        resultId: currentResultId,
        text: '',
        startTime: now,
        lastUpdateTime: now,
        startTimeMs: buffer.endTimeMs,
        endTimeMs: buffer.endTimeMs,
        forceSplitCount: buffer.forceSplitCount + 1,
        splitTextLength: newSplitTextLength, // 분할된 텍스트 길이 누적
      };
    }
  }, [selectedLanguage, sendForcedFinal]);

  /**
   * 강제 분할 타이머 시작
   */
  const startForceSplitTimer = useCallback(() => {
    if (forceSplitTimerRef.current) {
      clearInterval(forceSplitTimerRef.current);
    }

    forceSplitTimerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        checkAndForceSplit();
      }
    }, FORCE_SPLIT_CONFIG.CHECK_INTERVAL_MS);

    console.log('[ForceSplit] ⏱️ Timer started');
  }, [checkAndForceSplit]);

  /**
   * 강제 분할 타이머 중지
   */
  const stopForceSplitTimer = useCallback(() => {
    if (forceSplitTimerRef.current) {
      clearInterval(forceSplitTimerRef.current);
      forceSplitTimerRef.current = null;
      console.log('[ForceSplit] ⏱️ Timer stopped');
    }
  }, []);

  // 트랜스크립션 결과 처리
  const handleTranscriptResult = useCallback((result: TranscriptResult) => {
    const now = Date.now();

    // ==========================================
    // 강제 분할을 위한 Partial 버퍼 관리
    // ==========================================
    if (result.isPartial) {
      const buffer = partialBufferRef.current;

      // 새로운 resultId면 버퍼 초기화
      if (buffer.resultId !== result.resultId) {
        partialBufferRef.current = {
          resultId: result.resultId,
          text: result.transcript,
          startTime: now,
          lastUpdateTime: now,
          startTimeMs: result.startTimeMs,
          endTimeMs: result.endTimeMs,
          forceSplitCount: 0,
          splitTextLength: 0,
        };
        console.log(`[ForceSplit] 📝 New partial buffer: "${result.transcript.substring(0, 30)}..."`);
      } else {
        // 같은 resultId - 이미 분할된 부분을 제외한 새 텍스트만 추출
        // AWS Transcribe는 전체 텍스트를 계속 보내므로, 이미 처리된 부분 제외
        const newText = result.transcript.substring(buffer.splitTextLength);

        // 새 텍스트가 없거나 너무 짧으면 UI 업데이트만 하고 분할 체크 스킵
        if (newText.trim().length < 3) {
          // UI에는 표시하되 분할 체크는 하지 않음
          partialBufferRef.current = {
            ...buffer,
            lastUpdateTime: now,
            endTimeMs: result.endTimeMs,
          };
          // 기존 로직으로 진행 (UI 표시용)
        } else {
          partialBufferRef.current = {
            ...buffer,
            text: newText,
            lastUpdateTime: now,
            endTimeMs: result.endTimeMs,
          };

          // 즉시 분할 체크 (새 텍스트에 대해서만)
          const { shouldSplit, reason } = shouldForceSplit(partialBufferRef.current, selectedLanguage, now);
          if (shouldSplit) {
            // 시간 초과 또는 문자 수 초과인 경우 무조건 분할
            // 문장 완료 감지인 경우에만 confidence 체크
            const isTimeOrCharExceeded = reason.includes('Max chars') || reason.includes('Max duration');
            const analysis = analyzeSentence(newText, selectedLanguage);
            const shouldImmediateSplit = isTimeOrCharExceeded ||
              (analysis.isComplete && analysis.confidence >= FORCE_SPLIT_CONFIG.SENTENCE_CONFIDENCE_THRESHOLD);

            if (shouldImmediateSplit) {
              console.log(`[ForceSplit] 🎯 Immediate split: "${newText.substring(0, 30)}..." (reason: ${reason}, splitCount: ${buffer.forceSplitCount})`);

              // 표시 ID 생성 (첫 분할은 원본 ID로 기존 partial 업데이트, 후속은 연속 ID)
              const forcedResultId = getDisplayId(result.resultId, buffer.forceSplitCount);
              sendForcedFinal({
                resultId: forcedResultId,
                transcript: newText,
                startTimeMs: buffer.startTimeMs,
                endTimeMs: result.endTimeMs,
              }, reason);

              // 버퍼 업데이트: 분할된 텍스트 길이 기록
              partialBufferRef.current = {
                resultId: result.resultId,
                text: '',
                startTime: now,
                lastUpdateTime: now,
                startTimeMs: result.endTimeMs,
                endTimeMs: result.endTimeMs,
                forceSplitCount: buffer.forceSplitCount + 1,
                splitTextLength: result.transcript.length, // 전체 텍스트 길이 기록
              };

              // partial이 강제 분할되었으므로 이번 결과는 UI에 표시하지 않음
              return;
            }
          }
        }
      }
    } else {
      // Final 결과 수신
      const buffer = partialBufferRef.current;

      // 강제 분할 정보 저장 (버퍼 초기화 전에 저장)
      const hadForceSplit = buffer.resultId === result.resultId && buffer.splitTextLength > 0;
      const savedForceSplitCount = hadForceSplit ? buffer.forceSplitCount : 0;

      // 이미 강제 분할로 처리된 텍스트가 있는지 체크
      if (hadForceSplit) {
        // 강제 분할 후 남은 새 텍스트만 처리
        const remainingText = result.transcript.substring(buffer.splitTextLength);

        if (remainingText.trim().length < 3) {
          console.log(`[ForceSplit] 📋 Final received, but already fully split (${buffer.forceSplitCount} splits)`);
          // 버퍼 초기화하고 종료 (중복 방지)
          partialBufferRef.current = {
            resultId: '',
            text: '',
            startTime: 0,
            lastUpdateTime: 0,
            startTimeMs: 0,
            endTimeMs: 0,
            forceSplitCount: 0,
            splitTextLength: 0,
          };
          return;
        }

        console.log(`[ForceSplit] 📋 Final with remainder: "${remainingText.substring(0, 30)}..." (will use cont-${savedForceSplitCount})`);
        // 남은 텍스트로 result 수정하여 계속 처리
        // resultId도 연속 ID로 변경하여 기존 강제 분할과 충돌 방지
        result = {
          ...result,
          resultId: getDisplayId(result.resultId, savedForceSplitCount),
          transcript: remainingText,
        };
      }

      // 버퍼 완전 초기화
      partialBufferRef.current = {
        resultId: '',
        text: '',
        startTime: 0,
        lastUpdateTime: 0,
        startTimeMs: 0,
        endTimeMs: 0,
        forceSplitCount: 0,
        splitTextLength: 0,
      };
    }

    // ==========================================
    // 기존 로직: attendeeId 검증
    // ==========================================
    // attendeeId가 유효하지 않으면 로그만 남기고 계속 진행
    // (백엔드에서 참가자 조회 실패해도 트랜스크립트는 저장/브로드캐스트됨)
    if (!currentSpeakerInfo.attendeeId || currentSpeakerInfo.attendeeId === 'local-user') {
      console.warn('[BrowserTranscription] attendeeId not set, using fallback:', currentSpeakerInfo.attendeeId);
    }

    // 표시용 ID 및 텍스트 결정
    // - partial이고 이미 강제 분할이 발생한 경우: 연속 ID 사용 및 새 텍스트만 표시
    // - final이거나 첫 번째 partial: 원본 ID와 전체 텍스트 사용
    const buffer = partialBufferRef.current;
    const hasForceSplit = buffer.forceSplitCount > 0 && buffer.resultId === result.resultId;

    const displayId = result.isPartial && hasForceSplit
      ? getDisplayId(result.resultId, buffer.forceSplitCount)
      : result.resultId;

    // 분할 후 partial인 경우 새 텍스트만 표시 (이미 분할된 부분 제외)
    const displayText = result.isPartial && hasForceSplit
      ? result.transcript.substring(buffer.splitTextLength)
      : result.transcript;

    // 표시할 텍스트가 없으면 UI 업데이트 스킵 (빈 partial 방지)
    if (!displayText.trim()) {
      return;
    }

    // 타임스탬프 계산 - 통합 타임라인 (채팅과 동일한 기준)
    // meetingStartTime 기준 현재 경과 시간 사용 (클라이언트-서버 시계 차이 해소)
    const elapsedMs = meetingStartTime
      ? Date.now() - meetingStartTime
      : 0;

    const newItem: TranscriptItem = {
      id: displayId,
      speakerName: currentSpeakerInfo.name,
      speakerId: currentSpeakerInfo.attendeeId,
      speakerProfileImage: currentSpeakerInfo.profileImage,
      text: displayText,
      timestamp: elapsedMs > 0 ? elapsedMs : 0,
      isPartial: result.isPartial,
      attendeeId: currentSpeakerInfo.attendeeId,
      languageCode: selectedLanguage, // 발화자 언어
    };

    // 프로덕션 디버깅 로그 (민감 정보 마스킹)
    transcriptDebugLog.debug('Local transcript created', {
      event: 'local_created',
      resultId: displayId,
      speakerId: currentSpeakerInfo.attendeeId,
      speakerName: currentSpeakerInfo.name,
      isPartial: result.isPartial,
    });

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
          // 항상 정렬 (강제 분할 시 순서 보장)
          return sortTranscripts(updated);
        }
        // 새로 추가 후 항상 정렬
        const result = [...prev, newItem];
        return sortTranscripts(result);
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
  }, [meetingStartTime, sessionId, selectedLanguage, currentSpeakerInfo, onLocalTranscript, onTimestampCorrection, sendForcedFinal]);

  // 트랜스크립션 시작
  const startTranscription = useCallback(async () => {
    if (!enabled || !sessionId || sessionState === 'streaming' || sessionState === 'connecting') {
      console.log('[BrowserTranscription] Cannot start:', { enabled, sessionId, sessionState });
      return;
    }

    // currentAttendeeId 유효성 검사 (화자 식별에 필수)
    if (!currentAttendeeId || currentAttendeeId === 'local-user') {
      transcriptDebugLog.warn('Cannot start transcription - invalid currentAttendeeId', {
        event: 'speaker_mismatch',
        speakerId: currentAttendeeId || undefined,
        error: 'Missing or invalid currentAttendeeId',
      });
      return;
    }

    transcriptDebugLog.info('Starting transcription', {
      event: 'session_joined',
      speakerId: currentAttendeeId,
    });
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

          // 강제 분할 타이머 시작
          startForceSplitTimer();

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
              // NOTE: 무음 감지로 재연결하지 않음
              // - transcribe-streaming.ts의 sendKeepAlive()가 10초 후 무음 PCM 전송하여 연결 유지
              // - 14초 재연결은 불필요한 flickering을 유발하므로 제거
              // - AWS Transcribe 타임아웃 시 onClose에서 자동 재연결됨
              // 30초마다 또는 60초 배수일 때만 로그 (콘솔 범람 방지)
              if (newVal === 30 || (newVal > 30 && newVal % 60 === 0)) {
                console.log(`[BrowserTranscription] ${newVal}s silence (keep-alive active)`);
              }
              return newVal;
            });
          }, 1000);
        },
        onError: (err) => {
          if (!isMountedRef.current) return;
          transcriptDebugLog.error('Transcription stream error', err, {
            event: 'session_left',
            sessionId,
            error: err instanceof Error ? err.message : String(err),
          });
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
      transcriptDebugLog.error('Failed to start transcription', err, {
        event: 'session_left',
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });

      // 에러 발생 시 리소스 정리
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      setError(err instanceof Error ? err : new Error(String(err)));
      setSessionState('error');
    }
  }, [enabled, sessionId, sessionState, selectedLanguage, currentAttendeeId, getPresignedUrl, getMicrophoneStream, handleTranscriptResult, startForceSplitTimer]);

  // 트랜스크립션 중지
  const stopTranscription = useCallback(() => {
    transcriptDebugLog.info('Stopping transcription', {
      event: 'session_left',
      sessionId,
    });
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

    // 강제 분할 타이머 정리
    stopForceSplitTimer();

    // Partial 버퍼 초기화
    partialBufferRef.current = {
      resultId: '',
      text: '',
      startTime: 0,
      lastUpdateTime: 0,
      startTimeMs: 0,
      endTimeMs: 0,
      forceSplitCount: 0,
      splitTextLength: 0,
    };

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
  }, [stopForceSplitTimer]);

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
  // 최신 sendForcedFinal 함수를 항상 참조하기 위한 ref
  const sendForcedFinalRef = useRef(sendForcedFinal);
  // startTranscription이 변경될 때마다 ref 업데이트
  useEffect(() => {
    startTranscriptionRef.current = startTranscription;
  }, [startTranscription]);
  // sendForcedFinal이 변경될 때마다 ref 업데이트
  useEffect(() => {
    sendForcedFinalRef.current = sendForcedFinal;
  }, [sendForcedFinal]);

  // enabled 변경, 언뮤트, 또는 룸 참가 완료 시 자동 시작/중지
  useEffect(() => {
    // idle 상태일 때만 상세 로그 출력 (상태 변경 시 중복 로그 방지)
    if (sessionState === 'idle') {
      console.log('[BrowserTranscription] Auto-start effect (idle):', {
        isMuted,
        isRoomJoined,
        enabled,
        sessionId: !!sessionId,
        hasAudioVideo: !!meetingManager.audioVideo,
        autoStartTriggered: autoStartTriggeredRef.current,
      });
    }

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

    // currentAttendeeId가 유효할 때까지 대기 (화자 식별에 필수)
    // 'local-user'는 fallback 값으로, 실제 attendeeId가 아직 설정되지 않은 상태
    if (!currentAttendeeId || currentAttendeeId === 'local-user') {
      console.log('[BrowserTranscription] Waiting for valid currentAttendeeId:', currentAttendeeId);
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

    // Cleanup: 의존성 변경 시 타이머만 취소 (플래그는 유지)
    // autoStartTriggeredRef는 sessionState가 idle이 될 때만 리셋됨
    return () => {
      if (autoStartTimerRef.current) {
        console.log('[BrowserTranscription] Cleanup: cancelling pending auto-start timer');
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
        // 주의: 여기서 autoStartTriggeredRef를 리셋하지 않음
        // - sessionState가 idle이 아닌 상태에서 리셋하면 중복 시작 발생 가능
        // - sessionState === 'idle' effect에서 안전하게 리셋됨
      }
    };
  }, [enabled, sessionId, meetingManager.audioVideo, sessionState, isMuted, isRoomJoined, currentAttendeeId, stopTranscription]);

  // sessionState가 idle로 리셋되면 autoStartTriggered도 리셋
  useEffect(() => {
    if (sessionState === 'idle') {
      autoStartTriggeredRef.current = false;
    }
  }, [sessionState]);

  // 무음 감지 시 partial을 강제 확정 (2초 이상 무음이면 현재 partial 확정)
  useEffect(() => {
    // 스트리밍 중이 아니거나 무음 시간이 임계값 미만이면 스킵
    if (sessionState !== 'streaming' || silenceSeconds < FORCE_SPLIT_CONFIG.SILENCE_FINALIZE_SECONDS) {
      return;
    }

    // 이미 강제 분할 중이면 스킵 (중복 호출 방지)
    if (isForceSplittingRef.current) {
      return;
    }

    const buffer = partialBufferRef.current;
    // 버퍼에 확정할 텍스트가 있는지 확인
    if (buffer.text && buffer.text.trim().length >= FORCE_SPLIT_CONFIG.MIN_CHARS_FOR_SPLIT) {
      console.log(`[BrowserTranscription] 🔇 Silence finalize: ${silenceSeconds}s silence, finalizing partial: "${buffer.text.substring(0, 30)}..."`);

      const forcedResultId = getDisplayId(buffer.resultId, buffer.forceSplitCount);
      sendForcedFinalRef.current({
        resultId: forcedResultId,
        transcript: buffer.text,
        startTimeMs: buffer.startTimeMs,
        endTimeMs: buffer.endTimeMs,
      }, `Silence finalize (${silenceSeconds}s)`);

      // 버퍼 초기화 (다음 발화를 위해)
      partialBufferRef.current = {
        resultId: '',
        text: '',
        startTime: 0,
        lastUpdateTime: 0,
        startTimeMs: 0,
        endTimeMs: 0,
        forceSplitCount: 0,
        splitTextLength: 0,
      };
    }
  }, [sessionState, silenceSeconds]);

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

      // 강제 분할 타이머 정리
      if (forceSplitTimerRef.current) {
        clearInterval(forceSplitTimerRef.current);
        forceSplitTimerRef.current = null;
      }

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
