'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useAudioVideo } from 'amazon-chime-sdk-component-library-react';

interface UseOriginalAudioVolumeOptions {
  translationEnabled: boolean;
  initialVolume?: number; // 0-100
  fadeTimeMs?: number;
}

interface UseOriginalAudioVolumeReturn {
  originalVolume: number;
  setOriginalVolume: (volume: number) => void;
  isFading: boolean;
}

const DEFAULT_VOLUME = 0; // 번역 켰을때 기본값: 음소거
const DEFAULT_FADE_TIME = 500; // 0.5초 페이드

/**
 * useOriginalAudioVolume - 원본 오디오 볼륨 컨트롤 훅
 *
 * 번역 기능 사용 시 원본 음성의 볼륨을 조절합니다.
 * - 번역 활성화 시: 원본 음성을 자연스럽게 낮춤 (기본: 음소거)
 * - 번역 비활성화 시: 원본 음성을 100%로 복원
 * - 수동 조절 가능 (볼륨 슬라이더)
 */
export function useOriginalAudioVolume({
  translationEnabled,
  initialVolume = DEFAULT_VOLUME,
  fadeTimeMs = DEFAULT_FADE_TIME,
}: UseOriginalAudioVolumeOptions): UseOriginalAudioVolumeReturn {
  const audioVideo = useAudioVideo();
  const [originalVolume, setOriginalVolumeState] = useState(initialVolume);
  const [isFading, setIsFading] = useState(false);
  const fadeIntervalRef = useRef<number | null>(null);
  const savedVolumeRef = useRef<number>(100); // 번역 끄기 전 볼륨 저장
  const isFirstRenderRef = useRef(true);

  // 오디오 요소 가져오기
  const getAudioElement = useCallback((): HTMLAudioElement | null => {
    if (!audioVideo) return null;
    // @ts-ignore - 내부 API 접근
    return audioVideo.audioVideo?.audioMixController?.audioElement || null;
  }, [audioVideo]);

  // 볼륨 적용 (실제 오디오 요소에)
  const applyVolume = useCallback((volume: number) => {
    const audioElement = getAudioElement();
    if (audioElement) {
      // HTML audio element의 volume은 0-1 사이
      audioElement.volume = Math.max(0, Math.min(1, volume / 100));
    }
  }, [getAudioElement]);

  // 페이드 효과로 볼륨 전환
  const fadeToVolume = useCallback((targetVolume: number, onComplete?: () => void) => {
    // 기존 페이드 중지
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const audioElement = getAudioElement();
    if (!audioElement) {
      setOriginalVolumeState(targetVolume);
      onComplete?.();
      return;
    }

    const startVolume = audioElement.volume * 100;
    const volumeDiff = targetVolume - startVolume;
    const steps = 20; // 20단계로 페이드
    const stepTime = fadeTimeMs / steps;
    let currentStep = 0;

    setIsFading(true);

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // easeInOutQuad for smooth transition
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const newVolume = startVolume + volumeDiff * easeProgress;
      applyVolume(newVolume);
      setOriginalVolumeState(Math.round(newVolume));

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        applyVolume(targetVolume);
        setOriginalVolumeState(targetVolume);
        setIsFading(false);
        onComplete?.();
      }
    }, stepTime);
  }, [fadeTimeMs, getAudioElement, applyVolume]);

  // 수동 볼륨 설정 (즉시 적용, 페이드 없음)
  const setOriginalVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    
    // 페이드 중이면 중지
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
      setIsFading(false);
    }

    setOriginalVolumeState(clampedVolume);
    applyVolume(clampedVolume);
  }, [applyVolume]);

  // 번역 활성화/비활성화 시 자동 볼륨 조절
  useEffect(() => {
    // 첫 렌더링 시에는 무시
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (translationEnabled) {
      // 번역 켜짐: 현재 볼륨 저장 후 음소거로 페이드
      savedVolumeRef.current = originalVolume > 0 ? originalVolume : 100;
      fadeToVolume(DEFAULT_VOLUME);
      console.log('[OriginalAudio] Translation ON: fading to mute');
    } else {
      // 번역 꺼짐: 저장된 볼륨으로 페이드 (또는 100%)
      const restoreVolume = savedVolumeRef.current || 100;
      fadeToVolume(restoreVolume);
      console.log(`[OriginalAudio] Translation OFF: fading to ${restoreVolume}%`);
    }
  }, [translationEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // 초기 볼륨 설정
  useEffect(() => {
    if (!translationEnabled) {
      // 번역이 꺼져있으면 100% 볼륨
      applyVolume(100);
      setOriginalVolumeState(100);
    } else {
      // 번역이 켜져있으면 설정된 볼륨 (기본: 음소거)
      applyVolume(initialVolume);
    }
  }, [audioVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      // 언마운트 시 볼륨 복원
      const audioElement = getAudioElement();
      if (audioElement) {
        audioElement.volume = 1;
      }
    };
  }, [getAudioElement]);

  return {
    originalVolume,
    setOriginalVolume,
    isFading,
  };
}
