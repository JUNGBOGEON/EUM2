'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useAudioVideo } from 'amazon-chime-sdk-component-library-react';

interface VideoFrame {
  imageData: ImageData;
  timestamp: number;
}

interface DelayedRemoteVideoProps {
  tileId: number;
  delayMs: number;
  delayEnabled: boolean;
  className?: string;
}

const FRAME_RATE = 30;
const BUFFER_EXTRA_MS = 1000;

/**
 * DelayedRemoteVideo - Chime SDK의 RemoteVideo에 딜레이를 적용하는 컴포넌트
 *
 * Canvas를 사용하여 원격 비디오 프레임을 버퍼링하고 지연 재생합니다.
 */
export function DelayedRemoteVideo({
  tileId,
  delayMs,
  delayEnabled,
  className = '',
}: DelayedRemoteVideoProps) {
  const audioVideo = useAudioVideo();
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameBuffer = useRef<VideoFrame[]>([]);
  const captureIntervalRef = useRef<number | null>(null);
  const playbackIntervalRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  // 히든 비디오 요소에 타일 바인딩
  useEffect(() => {
    if (!audioVideo || !hiddenVideoRef.current) return;

    const videoElement = hiddenVideoRef.current;

    // Chime SDK 타일을 비디오 요소에 바인딩
    audioVideo.bindVideoElement(tileId, videoElement);

    return () => {
      // 언바인드
      audioVideo.unbindVideoElement(tileId);
    };
  }, [audioVideo, tileId]);

  // 비디오 크기 감지
  useEffect(() => {
    const video = hiddenVideoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        setDimensions({
          width: video.videoWidth,
          height: video.videoHeight,
        });
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // 이미 로드된 경우
    if (video.videoWidth && video.videoHeight) {
      setDimensions({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // 프레임 캡처 함수
  const captureFrame = useCallback(() => {
    const video = hiddenVideoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스에 현재 프레임 그리기
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 버퍼에 추가
    frameBuffer.current.push({
      imageData,
      timestamp: Date.now(),
    });

    // 오래된 프레임 제거
    const cutoffTime = Date.now() - delayMs - BUFFER_EXTRA_MS;
    frameBuffer.current = frameBuffer.current.filter(
      (frame) => frame.timestamp > cutoffTime
    );
  }, [delayMs]);

  // 프레임 재생 함수
  const playFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetTime = Date.now() - (delayEnabled ? delayMs : 0);

    // 타겟 시간 이전의 가장 최근 프레임 찾기
    let selectedFrame: VideoFrame | null = null;
    for (let i = frameBuffer.current.length - 1; i >= 0; i--) {
      if (frameBuffer.current[i].timestamp <= targetTime) {
        selectedFrame = frameBuffer.current[i];
        break;
      }
    }

    if (selectedFrame) {
      ctx.putImageData(selectedFrame.imageData, 0, 0);
    }
  }, [delayEnabled, delayMs]);

  // 캡처 및 재생 시작/중지
  useEffect(() => {
    if (!delayEnabled) {
      // 딜레이 비활성화 시 버퍼 클리어
      frameBuffer.current = [];
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    // 캡처 시작
    captureIntervalRef.current = window.setInterval(
      captureFrame,
      1000 / FRAME_RATE
    );

    // 재생 시작
    playbackIntervalRef.current = window.setInterval(
      playFrame,
      1000 / FRAME_RATE
    );

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      frameBuffer.current = [];
    };
  }, [delayEnabled, captureFrame, playFrame]);

  // 딜레이가 비활성화되면 원본 비디오를 직접 표시
  if (!delayEnabled) {
    return (
      <video
        ref={hiddenVideoRef}
        autoPlay
        playsInline
        muted
        className={className}
        style={{ objectFit: 'cover' }}
      />
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
      {/* 히든 비디오 (캡처용) */}
      <video
        ref={hiddenVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      {/* 딜레이된 비디오 표시용 캔버스 */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
}
