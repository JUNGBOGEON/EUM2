'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * 미디어 딜레이 설정
 */
export interface MediaDelayConfig {
  enabled: boolean;
  delayMs: number; // 밀리초 단위 딜레이 (기본 1500ms = 1.5초)
}

export interface UseMediaDelayOptions {
  config: MediaDelayConfig;
}

export interface UseMediaDelayReturn {
  // 설정
  delayEnabled: boolean;
  delayMs: number;
  setDelayEnabled: (enabled: boolean) => void;
  setDelayMs: (ms: number) => void;
  // 오디오 딜레이
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  delayNodeRef: React.MutableRefObject<DelayNode | null>;
  setupAudioDelay: (sourceNode: MediaStreamAudioSourceNode) => AudioNode;
  // 비디오 딜레이
  createDelayedVideoRef: () => {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    startCapture: (videoElement: HTMLVideoElement) => void;
    stopCapture: () => void;
  };
}

// 프레임 버퍼 아이템
interface VideoFrame {
  imageData: ImageData;
  timestamp: number;
}

const DEFAULT_DELAY_MS = 1500; // 1.5초
const MAX_DELAY_MS = 5000; // 최대 5초
const FRAME_RATE = 30; // 30fps로 캡처

/**
 * 미디어 딜레이 훅
 *
 * 원격 참가자의 영상과 음성에 딜레이를 적용하여
 * 자막 싱크를 맞추는 기능을 제공합니다.
 */
export function useMediaDelay({
  config,
}: UseMediaDelayOptions): UseMediaDelayReturn {
  const [delayEnabled, setDelayEnabled] = useState(config.enabled);
  const [delayMs, setDelayMsState] = useState(config.delayMs || DEFAULT_DELAY_MS);

  // Audio Context 및 DelayNode refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);

  // Video delay refs (moved to top level for rules-of-hooks compliance)
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameBufferRef = useRef<VideoFrame[]>([]);
  const captureIntervalRef = useRef<number | null>(null);
  const playbackIntervalRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);

  // 딜레이 값 변경 시 클램핑
  const setDelayMs = useCallback((ms: number) => {
    const clampedMs = Math.max(0, Math.min(MAX_DELAY_MS, ms));
    setDelayMsState(clampedMs);
  }, []);

  // 오디오 딜레이 설정
  const setupAudioDelay = useCallback(
    (sourceNode: MediaStreamAudioSourceNode): AudioNode => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;

      // DelayNode 생성 (최대 5초)
      if (!delayNodeRef.current) {
        delayNodeRef.current = ctx.createDelay(MAX_DELAY_MS / 1000);
      }

      const delayNode = delayNodeRef.current;
      delayNode.delayTime.value = delayEnabled ? delayMs / 1000 : 0;

      // 소스 → 딜레이 → 출력
      sourceNode.connect(delayNode);
      delayNode.connect(ctx.destination);

      return delayNode;
    },
    [delayEnabled, delayMs]
  );

  // 딜레이 값 변경 시 DelayNode 업데이트
  useEffect(() => {
    if (delayNodeRef.current) {
      delayNodeRef.current.delayTime.value = delayEnabled ? delayMs / 1000 : 0;
    }
  }, [delayEnabled, delayMs]);

  // 비디오 딜레이를 위한 캔버스 기반 버퍼 생성
  const createDelayedVideoRef = useCallback(() => {
    const startCapture = (videoElement: HTMLVideoElement) => {
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;

      const canvas = videoCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 캔버스 크기 설정
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;

      // 프레임 캡처 시작
      const captureFrame = () => {
        if (!isCapturingRef.current || !videoElement.videoWidth) return;

        // 캔버스에 현재 프레임 그리기
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 버퍼에 추가
        frameBufferRef.current.push({
          imageData,
          timestamp: Date.now(),
        });

        // 오래된 프레임 제거 (딜레이 + 여유분)
        const cutoffTime = Date.now() - delayMs - 1000;
        frameBufferRef.current = frameBufferRef.current.filter(
          (frame) => frame.timestamp > cutoffTime
        );
      };

      captureIntervalRef.current = window.setInterval(
        captureFrame,
        1000 / FRAME_RATE
      );

      // 지연된 프레임 재생
      const playFrame = () => {
        if (!isCapturingRef.current || !canvas || !ctx) return;

        const targetTime = Date.now() - (delayEnabled ? delayMs : 0);

        // 타겟 시간에 가장 가까운 프레임 찾기
        const frame = frameBufferRef.current.find(
          (f) => f.timestamp <= targetTime
        );

        if (frame) {
          ctx.putImageData(frame.imageData, 0, 0);
        }
      };

      playbackIntervalRef.current = window.setInterval(
        playFrame,
        1000 / FRAME_RATE
      );
    };

    const stopCapture = () => {
      isCapturingRef.current = false;

      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }

      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }

      frameBufferRef.current = [];
    };

    return {
      canvasRef: videoCanvasRef,
      startCapture,
      stopCapture,
    };
  }, [delayEnabled, delayMs]);

  // 클린업
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    delayEnabled,
    delayMs,
    setDelayEnabled,
    setDelayMs,
    audioContextRef,
    delayNodeRef,
    setupAudioDelay,
    createDelayedVideoRef,
  };
}

export const DEFAULT_MEDIA_DELAY_CONFIG: MediaDelayConfig = {
  enabled: false,
  delayMs: DEFAULT_DELAY_MS,
};
