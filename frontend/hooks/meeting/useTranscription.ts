'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SocketTranscriptionClient,
  TranscriptResult,
} from '@/lib/socket-transcription';
import type { TranscriptItem } from '@/app/workspaces/[id]/meeting/[meetingId]/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UseTranscriptionOptions {
  meetingId: string | undefined;
  userId: string | null;
  devicesInitialized: boolean;
  selectDevices: () => Promise<boolean>;
}

export interface UseTranscriptionReturn {
  transcripts: TranscriptItem[];
  isTranscribing: boolean;
  showTranscript: boolean;
  setShowTranscript: (show: boolean) => void;
  toggleTranscription: () => Promise<void>;
  transcriptContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function useTranscription({
  meetingId,
  userId,
  devicesInitialized,
  selectDevices,
}: UseTranscriptionOptions): UseTranscriptionReturn {
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const transcribeClientRef = useRef<SocketTranscriptionClient | null>(null);

  // Socket.IO 트랜스크립션 결과 핸들러
  const handleTranscriptResult = useCallback(
    (result: TranscriptResult) => {
      const speakerName = '나';

      const newItem: TranscriptItem = {
        id: result.resultId,
        speakerName,
        speakerId: userId || 'unknown',
        text: result.transcript,
        timestamp: result.startTimeMs,
        isPartial: result.isPartial,
      };

      setTranscripts((prev) => {
        const existingIndex = prev.findIndex((t) => t.id === newItem.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newItem;
          return updated;
        }
        return [...prev, newItem];
      });

      // 최종 결과만 서버에 저장 (isPartial = false)
      if (!result.isPartial && meetingId) {
        const avgConfidence = result.items
          ? result.items.reduce((sum, item) => sum + (item.confidence || 0), 0) /
            result.items.length
          : 0;

        fetch(`${API_URL}/api/meetings/${meetingId}/transcriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            meetingId,
            resultId: result.resultId,
            isPartial: result.isPartial,
            transcript: result.transcript,
            attendeeId: userId || 'unknown',
            startTimeMs: result.startTimeMs,
            endTimeMs: result.endTimeMs,
            confidence: avgConfidence,
            isStable: true,
          }),
        }).catch((err) => console.error('Failed to save transcription:', err));
      }

      // 자동 스크롤
      if (transcriptContainerRef.current) {
        transcriptContainerRef.current.scrollTop =
          transcriptContainerRef.current.scrollHeight;
      }
    },
    [userId, meetingId]
  );

  // 트랜스크립션 클라이언트 정리 (컴포넌트 언마운트 시)
  useEffect(() => {
    return () => {
      if (transcribeClientRef.current) {
        transcribeClientRef.current.stop();
        transcribeClientRef.current = null;
      }
    };
  }, []);

  // 트랜스크립션 시작/중지
  const toggleTranscription = useCallback(async () => {
    if (!meetingId) return;

    try {
      if (isTranscribing) {
        // 트랜스크립션 중지
        if (transcribeClientRef.current) {
          transcribeClientRef.current.stop();
          transcribeClientRef.current = null;
        }
        setIsTranscribing(false);
      } else {
        // 마이크 권한 확인 및 스트림 획득
        if (!devicesInitialized) {
          const success = await selectDevices();
          if (!success) {
            console.error('Failed to initialize devices for transcription');
            return;
          }
        }

        // 마이크 스트림 획득
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        // Socket.IO 트랜스크립션 클라이언트 생성 및 시작
        transcribeClientRef.current = new SocketTranscriptionClient({
          serverUrl: API_URL,
          meetingId,
          languageCode: 'ko-KR',
          sampleRate: 16000,
          onTranscript: handleTranscriptResult,
          onError: (error) => {
            console.error('Transcription error:', error);
            setIsTranscribing(false);
          },
          onOpen: () => {
            console.log('Transcription started');
            setIsTranscribing(true);
          },
          onClose: () => {
            console.log('Transcription stopped');
            setIsTranscribing(false);
          },
        });

        await transcribeClientRef.current.start(stream);
      }
    } catch (err) {
      console.error('Failed to toggle transcription:', err);
      setIsTranscribing(false);
    }
  }, [
    meetingId,
    isTranscribing,
    devicesInitialized,
    selectDevices,
    handleTranscriptResult,
  ]);

  return {
    transcripts,
    isTranscribing,
    showTranscript,
    setShowTranscript,
    toggleTranscription,
    transcriptContainerRef,
  };
}
