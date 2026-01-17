'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, RotateCcw } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  minDuration?: number; // 최소 녹음 시간 (초)
  maxDuration?: number; // 최대 녹음 시간 (초)
  disabled?: boolean;
}

export function VoiceRecorder({
  onRecordingComplete,
  minDuration = 3,
  maxDuration = 10,
  disabled = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      streamRef.current = stream;

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });

        // Create URL for playback preview
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Notify parent
        onRecordingComplete(audioBlob);
        setHasRecorded(true);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);
      setHasRecorded(false);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('마이크 접근 권한이 필요합니다.');
    }
  }, [maxDuration, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    setDuration(0);
    setHasRecorded(false);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canStop = duration >= minDuration;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Timer Display */}
      <div className="relative">
        <div
          className={`text-6xl font-mono tabular-nums ${
            isRecording ? 'text-red-500' : 'text-foreground'
          }`}
        >
          {formatTime(duration)}
        </div>
        {isRecording && (
          <div className="absolute -top-2 -right-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              duration >= minDuration ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min((duration / maxDuration) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>최소 {minDuration}초</span>
          <span>최대 {maxDuration}초</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {!isRecording && !hasRecorded && (
          <Button
            size="lg"
            onClick={startRecording}
            disabled={disabled}
            className="gap-2"
          >
            <Mic className="h-5 w-5" />
            녹음 시작
          </Button>
        )}

        {isRecording && (
          <Button
            size="lg"
            variant={canStop ? 'destructive' : 'secondary'}
            onClick={stopRecording}
            disabled={!canStop}
            className="gap-2"
          >
            <Square className="h-5 w-5" />
            {canStop ? '녹음 중지' : `${minDuration - duration}초 더 녹음`}
          </Button>
        )}

        {hasRecorded && !isRecording && (
          <Button
            size="lg"
            variant="outline"
            onClick={resetRecording}
            className="gap-2"
          >
            <RotateCcw className="h-5 w-5" />
            다시 녹음
          </Button>
        )}
      </div>

      {/* Recording Status */}
      {isRecording && (
        <p className="text-sm text-muted-foreground animate-pulse">
          말씀해 주세요...
        </p>
      )}

      {/* Audio Preview */}
      {hasRecorded && audioUrl && (
        <div className="w-full max-w-xs">
          <p className="text-sm text-muted-foreground mb-2 text-center">
            녹음 미리듣기
          </p>
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}
    </div>
  );
}
