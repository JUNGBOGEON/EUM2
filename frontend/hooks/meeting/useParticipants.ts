'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRosterState } from 'amazon-chime-sdk-component-library-react';
import type { ParticipantInfo } from '@/app/workspaces/[id]/meeting/[meetingId]/types';
import { participantsLogger as logger } from '@/lib/utils/debug';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UseParticipantsOptions {
  meetingId: string | undefined;
}

export interface ParticipantDetails {
  name: string;
  profileImage?: string;
  email?: string;
  userId?: string;
}

export interface UseParticipantsReturn {
  participants: ParticipantInfo[];
  isLoading: boolean;
  error: string | null;
  getParticipantByAttendeeId: (attendeeId: string) => ParticipantDetails;
  refreshParticipants: () => Promise<void>;
}

export function useParticipants({
  meetingId,
}: UseParticipantsOptions): UseParticipantsReturn {
  const { roster } = useRosterState();
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 참가자 맵 캐시 (chimeAttendeeId -> ParticipantInfo)
  const participantsMapRef = useRef<Map<string, ParticipantInfo>>(new Map());
  // 이전 roster 키 추적 (새 참가자 감지용)
  const prevRosterKeysRef = useRef<Set<string>>(new Set());

  // 참가자 정보 로드
  const loadParticipants = useCallback(async () => {
    if (!meetingId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/meetings/sessions/${meetingId}/participants`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load participants');
      }

      const data: ParticipantInfo[] = await response.json();
      setParticipants(data);

      // 맵 업데이트
      const map = new Map<string, ParticipantInfo>();
      data.forEach((p) => {
        if (p.chimeAttendeeId) {
          map.set(p.chimeAttendeeId, p);
        }
      });
      participantsMapRef.current = map;

      logger.log('Loaded participants:', data.length);
      setError(null);
    } catch (err) {
      logger.error('Failed to load participants:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  // 초기 로드
  useEffect(() => {
    if (!meetingId) return;
    loadParticipants();
  }, [meetingId, loadParticipants]);

  // roster 변경 감지 - 새 참가자가 추가되면 API 다시 호출
  const rosterKeys = useMemo(() => Object.keys(roster), [roster]);

  useEffect(() => {
    const currentKeys = new Set(rosterKeys);
    const prevKeys = prevRosterKeysRef.current;

    // 새로운 참가자가 있는지 확인
    const hasNewParticipant = rosterKeys.some(key => !prevKeys.has(key));

    if (hasNewParticipant && meetingId && prevKeys.size > 0) {
      logger.log('New participant detected, refreshing...');
      loadParticipants();
    }

    prevRosterKeysRef.current = currentKeys;
  }, [rosterKeys, meetingId, loadParticipants]);

  // attendeeId로 참가자 정보 조회
  const getParticipantByAttendeeId = useCallback(
    (attendeeId: string): ParticipantDetails => {
      // 1. 참가자 맵에서 조회
      const participant = participantsMapRef.current.get(attendeeId);
      if (participant?.user) {
        return {
          name: participant.user.name,
          profileImage: participant.user.profileImage,
          email: participant.user.email,
          userId: participant.user.id,
        };
      }

      // 2. roster에서 조회
      const rosterEntry = roster[attendeeId];
      if (rosterEntry?.name) {
        return {
          name: rosterEntry.name,
          profileImage: undefined,
        };
      }

      // 3. 기본값
      return {
        name: '참가자',
        profileImage: undefined,
      };
    },
    [roster]
  );

  return {
    participants,
    isLoading,
    error,
    getParticipantByAttendeeId,
    refreshParticipants: loadParticipants,
  };
}
