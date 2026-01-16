'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useAudioVideo } from 'amazon-chime-sdk-component-library-react';

interface UseOriginalAudioVolumeOptions {
  translationEnabled: boolean;
  fadeTimeMs?: number;
}

interface UseOriginalAudioVolumeReturn {
  targetVolume: number; // UI에 표시할 목표 볼륨 (사용자 설정)
  setTargetVolume: (volume: number) => void; // 목표 볼륨 설정
  currentVolume: number; // 현재 실제 적용 중인 볼륨
  isFading: boolean;
}

const DEFAULT_TARGET_VOLUME = 0; // 번역 시 원본 음성 기본: 음소거
const DEFAULT_FADE_TIME = 300; // 0.3초 페이드

/**
 * useOriginalAudioVolume - 원본 오디오 볼륨 컨트롤 훅
 *
 * 번역 기능 사용 시 원본 음성의 볼륨을 조절합니다.
 * - 번역 활성화: 원본 음성을 사용자 설정값으로 유지
 * - 번역 비활성화: 원본 음성 100%로 복원
 * - 슬라이더로 실시간 조절 가능
 */
export function useOriginalAudioVolume({
  translationEnabled,
  fadeTimeMs = DEFAULT_FADE_TIME,
}: UseOriginalAudioVolumeOptions): UseOriginalAudioVolumeReturn {
  const audioVideo = useAudioVideo();

  // 목표 볼륨 (사용자가 설정한 번역 시 원본 음성 볼륨)
  const [targetVolume, setTargetVolumeState] = useState(DEFAULT_TARGET_VOLUME);
  // 현재 실제 적용 중인 볼륨
  const [currentVolume, setCurrentVolumeState] = useState(100);
  const [isFading, setIsFading] = useState(false);

  const fadeIntervalRef = useRef<number | null>(null);
  const isFirstRenderRef = useRef(true);
  const prevTranslationEnabledRef = useRef(false);

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
      const normalizedVolume = Math.max(0, Math.min(1, volume / 100));
      audioElement.volume = normalizedVolume;

      // 0%일 때는 muted도 설정 (더 확실한 음소거)
      audioElement.muted = volume === 0;

      console.log(`[OriginalAudio] Applied volume: ${volume}% (normalized: ${normalizedVolume}, muted: ${audioElement.muted})`);
    } else {
      console.warn('[OriginalAudio] Audio element not available');
    }
  }, [getAudioElement]);

  // 페이드 효과로 볼륨 전환
  const fadeToVolume = useCallback((toVolume: number, onComplete?: () => void) => {
    // 기존 페이드 중지
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const audioElement = getAudioElement();
    if (!audioElement) {
      setCurrentVolumeState(toVolume);
      applyVolume(toVolume);
      onComplete?.();
      return;
    }

    const startVolume = audioElement.volume * 100;
    const volumeDiff = toVolume - startVolume;

    // 볼륨 차이가 거의 없으면 즉시 적용
    if (Math.abs(volumeDiff) < 1) {
      applyVolume(toVolume);
      setCurrentVolumeState(toVolume);
      onComplete?.();
      return;
    }

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
      setCurrentVolumeState(Math.round(newVolume));

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        applyVolume(toVolume);
        setCurrentVolumeState(toVolume);
        setIsFading(false);
        onComplete?.();
      }
    }, stepTime);
  }, [fadeTimeMs, getAudioElement, applyVolume]);

  // 목표 볼륨 설정 (슬라이더에서 호출)
  const setTargetVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    setTargetVolumeState(clampedVolume);

    // 번역이 켜져있으면 즉시 적용
    if (translationEnabled) {
      // 페이드 중이면 중지하고 즉시 적용
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        setIsFading(false);
      }
      applyVolume(clampedVolume);
      setCurrentVolumeState(clampedVolume);
    }
  }, [translationEnabled, applyVolume]);

  // 번역 활성화/비활성화에 따른 볼륨 조절
  useEffect(() => {
    // 첫 렌더링 시에는 무시
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevTranslationEnabledRef.current = translationEnabled;
      return;
    }

    // 번역 상태 변화 감지
    if (translationEnabled !== prevTranslationEnabledRef.current) {
      prevTranslationEnabledRef.current = translationEnabled;

      if (translationEnabled) {
        // 번역 켜짐: 목표 볼륨으로 페이드
        fadeToVolume(targetVolume);
        console.log(`[OriginalAudio] Translation ON: fading to ${targetVolume}%`);
      } else {
        // 번역 꺼짐: 100%로 페이드하고 muted 해제
        const audioElement = getAudioElement();
        if (audioElement) {
          audioElement.muted = false;
        }
        fadeToVolume(100);
        console.log('[OriginalAudio] Translation OFF: fading to 100%, unmuted');
      }
    }
  }, [translationEnabled, targetVolume, fadeToVolume, getAudioElement]);

  // audioVideo 초기화 시 현재 번역 상태에 맞게 볼륨 적용
  useEffect(() => {
    if (!audioVideo) return;

    // 번역이 켜져있으면 targetVolume, 아니면 100%
    const volumeToApply = translationEnabled ? targetVolume : 100;
    applyVolume(volumeToApply);
    setCurrentVolumeState(volumeToApply);

    console.log(`[OriginalAudio] audioVideo initialized, applying volume: ${volumeToApply}%`);
  }, [audioVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      // 언마운트 시 볼륨 및 muted 복원
      const audioElement = getAudioElement();
      if (audioElement) {
        audioElement.volume = 1;
        audioElement.muted = false;
      }
    };
  }, [getAudioElement]);

  return {
    targetVolume,
    setTargetVolume,
    currentVolume,
    isFading,
  };
}

// 기존 인터페이스 호환을 위한 alias export
export type { UseOriginalAudioVolumeOptions, UseOriginalAudioVolumeReturn };
