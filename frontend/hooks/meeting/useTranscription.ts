'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMeetingManager } from 'amazon-chime-sdk-component-library-react';
import type { TranscriptItem } from '@/app/workspaces/[id]/meeting/[meetingId]/types';
import type { TranscriptEvent } from 'amazon-chime-sdk-js';
import { useParticipants } from './useParticipants';
import { transcriptionLogger as logger } from '@/lib/utils/debug';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UseTranscriptionOptions {
  meetingId: string | undefined; // sessionId
  meetingStartTime: number | null;
}

export interface UseTranscriptionReturn {
  transcripts: TranscriptItem[];
  isTranscribing: boolean;
  isLoadingHistory: boolean;
  showTranscript: boolean;
  setShowTranscript: (show: boolean) => void;
  transcriptContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface TranscriptionHistoryItem {
  id: string;
  resultId: string;
  originalText: string;
  speakerId?: string;
  chimeAttendeeId?: string;
  startTimeMs: number;
  endTimeMs: number;
  speaker?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  relativeStartSec?: number;
}

export function useTranscription({
  meetingId,
  meetingStartTime,
}: UseTranscriptionOptions): UseTranscriptionReturn {
  const meetingManager = useMeetingManager();
  const { getParticipantByAttendeeId } = useParticipants({ meetingId });

  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const isSubscribedRef = useRef(false);
  const hasLoadedHistoryRef = useRef(false);

  // 기존 자막 히스토리 로드 (중간 참여자용)
  const loadTranscriptionHistory = useCallback(async () => {
    if (!meetingId || hasLoadedHistoryRef.current) return;

    hasLoadedHistoryRef.current = true;
    setIsLoadingHistory(true);

    try {
      const response = await fetch(
        `${API_URL}/api/meetings/${meetingId}/transcriptions/final`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to load transcription history');
      }

      const historyItems: TranscriptionHistoryItem[] = await response.json();

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
        }));

        setTranscripts(historyTranscripts);
        logger.log(`Loaded ${historyTranscripts.length} historical transcripts`);
      }
    } catch (error) {
      logger.error('Failed to load transcription history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [meetingId, meetingStartTime]);

  // 미팅 참여 시 기존 자막 로드
  useEffect(() => {
    if (meetingId && !hasLoadedHistoryRef.current) {
      loadTranscriptionHistory();
    }
  }, [meetingId, loadTranscriptionHistory]);

  // TranscriptEvent 핸들러
  const handleTranscriptEvent = useCallback(
    (transcriptEvent: TranscriptEvent) => {
      // TranscriptionStatus 이벤트 처리
      if ('transcriptionStatus' in transcriptEvent) {
        const status = (transcriptEvent as any).transcriptionStatus;
        logger.log('Status event:', status?.type);

        if (status?.type === 'started') {
          setIsTranscribing(true);
        } else if (status?.type === 'stopped' || status?.type === 'failed') {
          setIsTranscribing(false);
        }
        return;
      }

      // Transcript 이벤트 처리
      const results = (transcriptEvent as any).results;
      if (!results || !Array.isArray(results)) return;

      for (const result of results) {
        if (!result.alternatives || result.alternatives.length === 0) continue;

        const alternative = result.alternatives[0];

        // 발화자 정보 추출 - items[].attendee.attendeeId에서 가져옴
        let speakerAttendeeId = 'unknown';
        if (alternative.items && alternative.items.length > 0) {
          const firstItem = alternative.items[0];
          if (firstItem.attendee?.attendeeId) {
            speakerAttendeeId = firstItem.attendee.attendeeId;
          }
        }

        const speakerInfo = getParticipantByAttendeeId(speakerAttendeeId);

        // 경과 시간 계산 (미팅 시작 시간 기준)
        const elapsedMs = meetingStartTime
          ? result.startTimeMs - meetingStartTime
          : result.startTimeMs;

        const newItem: TranscriptItem = {
          id: result.resultId,
          speakerName: speakerInfo.name,
          speakerId: speakerAttendeeId,
          speakerProfileImage: speakerInfo.profileImage,
          text: alternative.transcript,
          timestamp: elapsedMs > 0 ? elapsedMs : 0,
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

        // 최종 결과만 서버에 저장
        if (!result.isPartial && meetingId) {
          const avgConfidence = alternative.items
            ? alternative.items.reduce((sum: number, item: any) => sum + (item.confidence || 0), 0) /
              alternative.items.length
            : 0;

          fetch(`${API_URL}/api/meetings/${meetingId}/transcriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              sessionId: meetingId,
              resultId: result.resultId,
              isPartial: result.isPartial,
              transcript: alternative.transcript,
              attendeeId: speakerAttendeeId,
              startTimeMs: result.startTimeMs,
              endTimeMs: result.endTimeMs,
              confidence: avgConfidence,
              isStable: true,
            }),
          }).catch((err) => logger.error('Failed to save transcription:', err));
        }
      }

      // 자동 스크롤
      if (transcriptContainerRef.current) {
        transcriptContainerRef.current.scrollTop =
          transcriptContainerRef.current.scrollHeight;
      }
    },
    [meetingId, meetingStartTime, getParticipantByAttendeeId]
  );

  // TranscriptEvent 구독
  useEffect(() => {
    const audioVideo = meetingManager.audioVideo;
    if (!audioVideo) return;

    const controller = audioVideo.transcriptionController;
    if (!controller) {
      // Fallback: AudioVideoObserver 사용
      const observer = {
        transcriptEventDidReceive: (event: TranscriptEvent) => {
          handleTranscriptEvent(event);
        },
      };

      audioVideo.addObserver(observer as any);
      isSubscribedRef.current = true;
      logger.log('Subscribed via AudioVideoObserver');

      return () => {
        audioVideo.removeObserver(observer as any);
        isSubscribedRef.current = false;
      };
    }

    controller.subscribeToTranscriptEvent(handleTranscriptEvent);
    isSubscribedRef.current = true;
    logger.log('Subscribed to transcript events');

    return () => {
      controller.unsubscribeFromTranscriptEvent(handleTranscriptEvent);
      isSubscribedRef.current = false;
    };
  }, [meetingManager.audioVideo, handleTranscriptEvent]);

  return {
    transcripts,
    isTranscribing,
    isLoadingHistory,
    showTranscript,
    setShowTranscript,
    transcriptContainerRef,
  };
}
