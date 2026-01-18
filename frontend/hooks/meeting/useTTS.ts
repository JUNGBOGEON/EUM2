'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import type { TTSReadyPayload, TTSQueueItem, PollyVoice } from '@/lib/types';
import { getDefaultPollyVoice, getPollyVoices, PollyVoiceOption } from '@/lib/constants/languages';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// TTS 큐 최대 크기 (메모리 무한 증가 방지)
const MAX_TTS_QUEUE_SIZE = 10;

// TTS 볼륨 설정
const MAX_TTS_VOLUME = 100;
const DEFAULT_TTS_VOLUME = 80;

export interface UseTTSOptions {
  meetingId: string | undefined;
  userId: string | null | undefined;
}

export interface UseTTSReturn {
  // TTS 상태
  ttsEnabled: boolean;
  isTogglingTTS: boolean;
  isPlaying: boolean;
  volume: number;
  // 큐 상태
  queue: TTSQueueItem[];
  currentlyPlaying: TTSQueueItem | null;
  queueLength: number;
  // 음성 설정
  selectedVoices: Record<string, string>;  // languageCode -> voiceId
  // 액션
  toggleTTS: () => Promise<void>;
  setVolume: (volume: number) => void;
  selectVoice: (languageCode: string, voiceId: string) => Promise<void>;
  skipCurrent: () => void;
  clearQueue: () => void;
  // 음성 목록
  getAvailableVoices: (languageCode: string) => PollyVoiceOption[];
}

/**
 * TTS (Text-to-Speech) 훅
 *
 * - 번역된 자막의 TTS 오디오 자동 재생
 * - 큐 기반 순차 재생
 * - 음성 선택 (언어별)
 */
export function useTTS({
  meetingId,
  userId,
}: UseTTSOptions): UseTTSReturn {
  const { on, isConnected, joinRoom, leaveRoom } = useSocket();

  // TTS 상태
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isTogglingTTS, setIsTogglingTTS] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_TTS_VOLUME);

  // 큐 상태
  const [queue, setQueue] = useState<TTSQueueItem[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<TTSQueueItem | null>(null);

  // 음성 설정
  const [selectedVoices, setSelectedVoices] = useState<Record<string, string>>({});

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasLoadedStatusRef = useRef(false);
  const isMountedRef = useRef(true);

  // 오디오 엘리먼트 생성
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = Math.min(1, volume / 100);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 볼륨 변경 시 오디오에 반영
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, volume / 100);
    }
  }, [volume]);

  // 초기 TTS 상태 로드
  const loadTTSStatus = useCallback(async () => {
    if (!meetingId || hasLoadedStatusRef.current) return;

    hasLoadedStatusRef.current = true;

    try {
      const response = await fetch(
        `${API_URL}/api/meetings/${meetingId}/tts/preferences`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const prefs = await response.json();
        setTtsEnabled(prefs.enabled);
        setVolumeState(prefs.volume ?? 80);
        setSelectedVoices(prefs.voices ?? {});
      }
    } catch (error) {
      console.error('[TTS] Failed to load status:', error);
    }
  }, [meetingId]);

  // 미팅 참여 시 TTS 상태 로드
  useEffect(() => {
    if (meetingId && !hasLoadedStatusRef.current) {
      loadTTSStatus();
    }
  }, [meetingId, loadTTSStatus]);

  // 오디오 재생
  const playAudio = useCallback(async (item: TTSQueueItem) => {
    if (!audioRef.current || !isMountedRef.current) return;

    try {
      setIsPlaying(true);
      setCurrentlyPlaying(item);

      // 큐에서 상태 업데이트
      setQueue((prev) =>
        prev.map((q) =>
          q.resultId === item.resultId ? { ...q, status: 'playing' } : q
        )
      );

      const audio = audioRef.current;
      audio.src = item.audioUrl;

      // 재생 완료 핸들러
      const handleEnded = () => {
        if (!isMountedRef.current) return;

        // 큐에서 제거
        setQueue((prev) => prev.filter((q) => q.resultId !== item.resultId));
        setCurrentlyPlaying(null);
        setIsPlaying(false);

        console.log('[TTS] Playback completed:', item.resultId);
      };

      // 에러 핸들러
      const handleError = () => {
        if (!isMountedRef.current) return;

        console.error('[TTS] Playback error:', item.resultId);

        // 에러 상태로 마킹 후 제거
        setQueue((prev) => prev.filter((q) => q.resultId !== item.resultId));
        setCurrentlyPlaying(null);
        setIsPlaying(false);
      };

      audio.onended = handleEnded;
      audio.onerror = handleError;

      await audio.play();
      console.log('[TTS] Playing:', item.translatedText?.substring(0, 30) + '...');
    } catch (error) {
      console.error('[TTS] Play failed:', error);
      setQueue((prev) => prev.filter((q) => q.resultId !== item.resultId));
      setCurrentlyPlaying(null);
      setIsPlaying(false);
    }
  }, []);

  // 큐 처리 - 순차 재생
  useEffect(() => {
    if (!ttsEnabled || isPlaying || queue.length === 0) return;

    const nextItem = queue.find((item) => item.status === 'pending');
    if (nextItem) {
      playAudio(nextItem);
    }
  }, [ttsEnabled, isPlaying, queue, playAudio]);

  // user:{userId} 룸 참가 (TTS 이벤트 수신을 위해)
  useEffect(() => {
    if (!isConnected || !userId) return;

    const userRoom = `user:${userId}`;
    console.log('[TTS] Joining user room:', userRoom);
    joinRoom(userRoom);

    return () => {
      console.log('[TTS] Leaving user room:', userRoom);
      leaveRoom(userRoom);
    };
  }, [isConnected, userId, joinRoom, leaveRoom]);

  // TTS Ready WebSocket 리스너
  useEffect(() => {
    if (!isConnected || !ttsEnabled) return;

    console.log('[TTS] Setting up ttsReady listener');

    const unsubscribe = on<TTSReadyPayload>('ttsReady', (payload) => {
      if (!isMountedRef.current || !ttsEnabled) return;

      console.log('[TTS] Received ttsReady:', payload);

      const newItem: TTSQueueItem = {
        resultId: payload.resultId,
        audioUrl: payload.audioUrl,
        durationMs: payload.durationMs,
        voiceId: payload.voiceId,
        targetLanguage: payload.targetLanguage,
        speakerName: payload.speakerName,
        translatedText: payload.translatedText,
        status: 'pending',
        timestamp: payload.timestamp,
      };

      setQueue((prev) => {
        // 중복 방지
        if (prev.some((q) => q.resultId === payload.resultId)) {
          return prev;
        }

        // 큐 크기 제한
        if (prev.length >= MAX_TTS_QUEUE_SIZE) {
          return [...prev.slice(1), newItem];
        }

        return [...prev, newItem];
      });
    });

    return unsubscribe;
  }, [isConnected, on, ttsEnabled]);

  // meetingId 변경 시 상태 초기화
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setQueue([]);
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      hasLoadedStatusRef.current = false;
    };
  }, [meetingId]);

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      console.log('[TTS] Cleaned up on unmount');
    };
  }, []);

  // TTS 토글
  const toggleTTS = useCallback(async () => {
    if (!meetingId || isTogglingTTS) return;

    setIsTogglingTTS(true);
    const newEnabled = !ttsEnabled;

    try {
      const response = await fetch(
        `${API_URL}/api/meetings/${meetingId}/tts/toggle`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ enabled: newEnabled }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setTtsEnabled(result.enabled);

        // TTS 끄면 큐 비우기
        if (!result.enabled) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setQueue([]);
          setCurrentlyPlaying(null);
          setIsPlaying(false);
        }

        console.log(`[TTS] ${result.enabled ? 'Enabled' : 'Disabled'}`);
      }
    } catch (error) {
      console.error('[TTS] Failed to toggle:', error);
    } finally {
      setIsTogglingTTS(false);
    }
  }, [meetingId, ttsEnabled, isTogglingTTS]);

  // 볼륨 설정 (로컬 + 서버 저장)
  const volumeSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(MAX_TTS_VOLUME, newVolume));
    setVolumeState(clampedVolume);

    // Debounced server save (500ms)
    if (volumeSaveTimeoutRef.current) {
      clearTimeout(volumeSaveTimeoutRef.current);
    }

    if (meetingId) {
      volumeSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`${API_URL}/api/meetings/${meetingId}/tts/volume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ volume: clampedVolume }),
          });
          console.log(`[TTS] Volume saved: ${clampedVolume}%`);
        } catch (error) {
          console.error('[TTS] Failed to save volume:', error);
        }
      }, 500);
    }
  }, [meetingId]);

  // 음성 선택
  const selectVoice = useCallback(async (languageCode: string, voiceId: string) => {
    if (!meetingId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/meetings/${meetingId}/tts/voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ languageCode, voiceId }),
        }
      );

      if (response.ok) {
        setSelectedVoices((prev) => ({ ...prev, [languageCode]: voiceId }));
        console.log(`[TTS] Voice set: ${languageCode} -> ${voiceId}`);
      }
    } catch (error) {
      console.error('[TTS] Failed to set voice:', error);
    }
  }, [meetingId]);

  // 현재 재생 건너뛰기
  const skipCurrent = useCallback(() => {
    if (audioRef.current && currentlyPlaying) {
      audioRef.current.pause();
      audioRef.current.src = '';  // Clear source to release resources
      audioRef.current.load();    // Reset audio element
      setQueue((prev) => prev.filter((q) => q.resultId !== currentlyPlaying.resultId));
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      console.log('[TTS] Skipped current');
    }
  }, [currentlyPlaying]);

  // 큐 전체 비우기
  const clearQueue = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';  // Clear source to release resources
      audioRef.current.load();    // Reset audio element
    }
    setQueue([]);
    setCurrentlyPlaying(null);
    setIsPlaying(false);
    console.log('[TTS] Queue cleared');
  }, []);

  // 사용 가능한 음성 목록
  const getAvailableVoices = useCallback((languageCode: string): PollyVoiceOption[] => {
    return getPollyVoices(languageCode);
  }, []);

  return {
    ttsEnabled,
    isTogglingTTS,
    isPlaying,
    volume,
    queue,
    currentlyPlaying,
    queueLength: queue.length,
    selectedVoices,
    toggleTTS,
    setVolume,
    selectVoice,
    skipCurrent,
    clearQueue,
    getAvailableVoices,
  };
}
