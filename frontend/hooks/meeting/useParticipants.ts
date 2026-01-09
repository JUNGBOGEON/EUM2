'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRosterState, useMeetingManager } from 'amazon-chime-sdk-component-library-react';
import type { ParticipantInfo } from '@/app/workspaces/[id]/meeting/[meetingId]/types';
import { participantsLogger as logger } from '@/lib/utils/debug';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UseParticipantsOptions {
  meetingId: string | undefined;
  currentUserName?: string;
  currentUserProfileImage?: string;
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
  currentUserName,
  currentUserProfileImage,
}: UseParticipantsOptions): UseParticipantsReturn {
  const { roster } = useRosterState();
  const meetingManager = useMeetingManager();
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 참가자 맵 캐시 (chimeAttendeeId -> ParticipantInfo)
  const participantsMapRef = useRef<Map<string, ParticipantInfo>>(new Map());
  // 이전 roster 키 추적 (새 참가자 감지용)
  const prevRosterKeysRef = useRef<Set<string>>(new Set());
  // 못 찾은 attendeeId 추적 (재시도용)
  const unknownAttendeeIdsRef = useRef<Set<string>>(new Set());
  // 마지막 refresh 시간
  const lastRefreshRef = useRef<number>(0);

  // 현재 사용자의 attendeeId 가져오기
  const currentAttendeeId = meetingManager.meetingSession?.configuration?.credentials?.attendeeId;

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
      // 0. 현재 사용자인지 확인 (가장 우선)
      if (currentAttendeeId && attendeeId === currentAttendeeId && currentUserName) {
        return {
          name: currentUserName,
          profileImage: currentUserProfileImage,
        };
      }

      // 1. 참가자 맵에서 조회 (ref 사용)
      const participantFromRef = participantsMapRef.current.get(attendeeId);
      if (participantFromRef?.user) {
        return {
          name: participantFromRef.user.name,
          profileImage: participantFromRef.user.profileImage,
          email: participantFromRef.user.email,
          userId: participantFromRef.user.id,
        };
      }

      // 2. 참가자 배열에서 직접 조회 (state 사용 - 최신 데이터)
      const participantFromState = participants.find(
        (p) => p.chimeAttendeeId === attendeeId
      );
      if (participantFromState?.user) {
        return {
          name: participantFromState.user.name,
          profileImage: participantFromState.user.profileImage,
          email: participantFromState.user.email,
          userId: participantFromState.user.id,
        };
      }

      // 3. roster에서 조회
      const rosterEntry = roster[attendeeId];
      if (rosterEntry?.name) {
        return {
          name: rosterEntry.name,
          profileImage: undefined,
        };
      }

      // 4. 못 찾은 attendeeId 기록하고 refresh 트리거
      if (attendeeId && attendeeId !== 'unknown' && !unknownAttendeeIdsRef.current.has(attendeeId)) {
        unknownAttendeeIdsRef.current.add(attendeeId);
        // 마지막 refresh 후 2초 이상 지났으면 다시 로드
        const now = Date.now();
        if (now - lastRefreshRef.current > 2000) {
          lastRefreshRef.current = now;
          logger.log(`Unknown attendeeId: ${attendeeId}, refreshing participants...`);
          loadParticipants();
        }
      }

      // 5. 기본값 - 아직 로딩 중이면 "로딩중..." 표시
      if (isLoading) {
        return {
          name: '로딩중...',
          profileImage: undefined,
        };
      }

      // 6. 기본값
      return {
        name: '참가자',
        profileImage: undefined,
      };
    },
    [roster, participants, isLoading, currentAttendeeId, currentUserName, currentUserProfileImage, loadParticipants]
  );

  return {
    participants,
    isLoading,
    error,
    getParticipantByAttendeeId,
    refreshParticipants: loadParticipants,
  };
}
