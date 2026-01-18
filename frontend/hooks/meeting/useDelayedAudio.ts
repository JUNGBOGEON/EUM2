'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useAudioVideo } from 'amazon-chime-sdk-component-library-react';

interface UseDelayedAudioOptions {
  delayMs: number;
  delayEnabled: boolean;
}

interface UseDelayedAudioReturn {
  isAudioDelayActive: boolean;
  setupDelayedAudio: () => Promise<void>;
  cleanupDelayedAudio: () => void;
}

const MAX_DELAY_SECONDS = 5; // 최대 5초

/**
 * useDelayedAudio - Chime SDK 오디오 출력에 딜레이를 적용하는 훅
 *
 * Web Audio API의 DelayNode를 사용하여 원격 참가자의 오디오에 딜레이를 적용합니다.
 */
export function useDelayedAudio({
  delayMs,
  delayEnabled,
}: UseDelayedAudioOptions): UseDelayedAudioReturn {
  const audioVideo = useAudioVideo();
  const audioContextRef = useRef<AudioContext | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioDelayActive, setIsAudioDelayActive] = useState(false);

  // 오디오 요소 가져오기 (DOM 쿼리 방식 - AWS Chime SDK 공식 권장 워크어라운드)
  // 참고: https://github.com/aws/amazon-chime-sdk-component-library-react/issues/622
  const getAudioElement = useCallback((): HTMLAudioElement | null => {
    // 캐시된 요소가 있고 DOM에 여전히 연결되어 있으면 반환
    if (audioElementRef.current && audioElementRef.current.isConnected) {
      return audioElementRef.current;
    }

    // audioVideo가 준비되지 않았으면 null 반환
    if (!audioVideo) return null;

    // DOM에서 Chime이 렌더링한 audio 요소 찾기
    const audioElement = document.querySelector('audio') as HTMLAudioElement | null;
    if (audioElement) {
      audioElementRef.current = audioElement;
      console.log('[DelayedAudio] Found Chime audio element via DOM query');
    }
    return audioElement;
  }, [audioVideo]);

  // 노드 정리 (moved before setupDelayedAudio to be available as dependency)
  const cleanupNodes = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (delayNodeRef.current) {
      delayNodeRef.current.disconnect();
      delayNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    setIsAudioDelayActive(false);
  }, []);

  // 오디오 컨텍스트 및 딜레이 노드 설정
  const setupDelayedAudio = useCallback(async () => {
    if (!audioVideo) {
      console.warn('[DelayedAudio] AudioVideo not available');
      return;
    }

    try {
      // 기존 설정 정리
      cleanupNodes();

      // AudioContext 생성
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      // DelayNode 생성
      const delayNode = ctx.createDelay(MAX_DELAY_SECONDS);
      delayNode.delayTime.value = delayEnabled ? delayMs / 1000 : 0;
      delayNodeRef.current = delayNode;

      // Chime SDK의 오디오 출력 요소 가져오기 (DOM 쿼리 방식)
      const audioElement = getAudioElement();

      if (audioElement && audioElement.srcObject) {
        const stream = audioElement.srcObject as MediaStream;
        const source = ctx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        // 소스 → 딜레이 → 출력 연결
        source.connect(delayNode);
        delayNode.connect(ctx.destination);

        // 원본 오디오 음소거 (딜레이된 오디오만 재생)
        // DOM element muting is intentional and necessary for delayed audio playback
        // eslint-disable-next-line react-hooks/immutability
        audioElement.muted = true;

        setIsAudioDelayActive(true);
        console.log(`[DelayedAudio] Audio delay setup complete: ${delayMs}ms`);
      } else {
        console.warn('[DelayedAudio] Could not access audio element');
      }
    } catch (error) {
      console.error('[DelayedAudio] Setup failed:', error);
    }
  }, [audioVideo, delayEnabled, delayMs, cleanupNodes, getAudioElement]);

  // 딜레이 정리
  const cleanupDelayedAudio = useCallback(() => {
    cleanupNodes();

    // 원본 오디오 복원 (DOM 쿼리 방식)
    const audioElement = getAudioElement();
    if (audioElement) {
      // DOM element unmuting is intentional and necessary for audio restoration
      audioElement.muted = false;
    }
  }, [cleanupNodes, getAudioElement]);

  // 딜레이 값 변경 시 DelayNode 업데이트
  useEffect(() => {
    if (delayNodeRef.current) {
      delayNodeRef.current.delayTime.value = delayEnabled ? delayMs / 1000 : 0;
    }
  }, [delayEnabled, delayMs]);

  // 딜레이 활성화/비활성화 처리
  useEffect(() => {
    if (delayEnabled && !isAudioDelayActive) {
      setupDelayedAudio();
    } else if (!delayEnabled && isAudioDelayActive) {
      cleanupDelayedAudio();
    }
  }, [delayEnabled, isAudioDelayActive, setupDelayedAudio, cleanupDelayedAudio]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupDelayedAudio();
    };
  }, [cleanupDelayedAudio]);

  return {
    isAudioDelayActive,
    setupDelayedAudio,
    cleanupDelayedAudio,
  };
}
