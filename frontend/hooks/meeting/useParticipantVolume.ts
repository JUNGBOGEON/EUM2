'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

const STORAGE_KEY_PREFIX = 'participant_volume_';

export interface ParticipantVolumeSettings {
  volume: number; // 0-100
  isMuted: boolean;
}

const DEFAULT_SETTINGS: ParticipantVolumeSettings = {
  volume: 100,
  isMuted: false,
};

export interface UseParticipantVolumeOptions {
  meetingId: string | undefined;
}

export interface UseParticipantVolumeReturn {
  // 개인별 볼륨 설정 (attendeeId -> settings)
  volumeSettings: Map<string, ParticipantVolumeSettings>;
  // 액션
  getParticipantVolume: (attendeeId: string) => ParticipantVolumeSettings;
  setParticipantVolume: (attendeeId: string, volume: number) => void;
  toggleParticipantMute: (attendeeId: string) => void;
  setParticipantMute: (attendeeId: string, isMuted: boolean) => void;
  // 전체 적용된 볼륨 (모든 뮤트된 참가자 고려)
  effectiveOverallVolume: number;
}

/**
 * 개인별 오디오 볼륨 관리 훅
 *
 * 참가자별 볼륨 및 뮤트 설정을 관리합니다.
 * - 설정은 localStorage에 저장되어 재접속 시에도 유지됩니다.
 * - TTS 오디오는 별도의 Audio 엘리먼트를 사용하므로 영향받지 않습니다.
 *
 * 참고: AWS Chime SDK는 개인별 오디오 스트림 분리를 기본 지원하지 않습니다.
 * 이 훅은 설정을 관리하고, 뮤트된 참가자의 음성을 처리하기 위한
 * 기반을 제공합니다.
 */
export function useParticipantVolume({
  meetingId,
}: UseParticipantVolumeOptions): UseParticipantVolumeReturn {
  const [volumeSettings, setVolumeSettings] = useState<Map<string, ParticipantVolumeSettings>>(
    new Map()
  );

  // localStorage에서 설정 로드
  useEffect(() => {
    if (!meetingId) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${meetingId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const map = new Map<string, ParticipantVolumeSettings>();
        Object.entries(parsed).forEach(([key, value]) => {
          map.set(key, value as ParticipantVolumeSettings);
        });
        setVolumeSettings(map);
        console.log('[ParticipantVolume] Loaded settings from localStorage');
      }
    } catch (error) {
      console.error('[ParticipantVolume] Failed to load settings:', error);
    }
  }, [meetingId]);

  // 설정을 localStorage에 저장
  const saveToStorage = useCallback(
    (settings: Map<string, ParticipantVolumeSettings>) => {
      if (!meetingId) return;

      const storageKey = `${STORAGE_KEY_PREFIX}${meetingId}`;
      try {
        const obj: Record<string, ParticipantVolumeSettings> = {};
        settings.forEach((value, key) => {
          obj[key] = value;
        });
        localStorage.setItem(storageKey, JSON.stringify(obj));
      } catch (error) {
        console.error('[ParticipantVolume] Failed to save settings:', error);
      }
    },
    [meetingId]
  );

  // 전체 적용 볼륨 계산 (모든 참가자 설정 중 최소값)
  // 참고: 실제 오디오 볼륨은 useOriginalAudioVolume에서 처리
  const effectiveOverallVolume = useMemo(() => {
    if (volumeSettings.size === 0) return 100;

    let minVolume = 100;
    volumeSettings.forEach((settings) => {
      const effectiveVolume = settings.isMuted ? 0 : settings.volume;
      if (effectiveVolume < minVolume) {
        minVolume = effectiveVolume;
      }
    });

    return minVolume;
  }, [volumeSettings]);

  // 참가자 볼륨 설정 조회
  const getParticipantVolume = useCallback(
    (attendeeId: string): ParticipantVolumeSettings => {
      return volumeSettings.get(attendeeId) || { ...DEFAULT_SETTINGS };
    },
    [volumeSettings]
  );

  // 참가자 볼륨 설정
  const setParticipantVolume = useCallback(
    (attendeeId: string, volume: number) => {
      const clampedVolume = Math.max(0, Math.min(100, volume));

      setVolumeSettings((prev) => {
        const next = new Map(prev);
        const current = prev.get(attendeeId) || { ...DEFAULT_SETTINGS };
        next.set(attendeeId, { ...current, volume: clampedVolume });
        saveToStorage(next);
        return next;
      });

      console.log(`[ParticipantVolume] Set volume for ${attendeeId}: ${clampedVolume}%`);
    },
    [saveToStorage]
  );

  // 참가자 뮤트 토글
  const toggleParticipantMute = useCallback(
    (attendeeId: string) => {
      setVolumeSettings((prev) => {
        const next = new Map(prev);
        const current = prev.get(attendeeId) || { ...DEFAULT_SETTINGS };
        next.set(attendeeId, { ...current, isMuted: !current.isMuted });
        saveToStorage(next);
        console.log(
          `[ParticipantVolume] Toggle mute for ${attendeeId}: ${!current.isMuted}`
        );
        return next;
      });
    },
    [saveToStorage]
  );

  // 참가자 뮤트 설정
  const setParticipantMute = useCallback(
    (attendeeId: string, isMuted: boolean) => {
      setVolumeSettings((prev) => {
        const next = new Map(prev);
        const current = prev.get(attendeeId) || { ...DEFAULT_SETTINGS };
        next.set(attendeeId, { ...current, isMuted });
        saveToStorage(next);
        return next;
      });

      console.log(`[ParticipantVolume] Set mute for ${attendeeId}: ${isMuted}`);
    },
    [saveToStorage]
  );

  return {
    volumeSettings,
    getParticipantVolume,
    setParticipantVolume,
    toggleParticipantMute,
    setParticipantMute,
    effectiveOverallVolume,
  };
}
