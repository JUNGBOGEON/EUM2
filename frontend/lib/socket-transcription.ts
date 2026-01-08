/**
 * Socket.IO 기반 AWS Transcribe Streaming 클라이언트
 *
 * 백엔드 WebSocket Gateway를 통해 AWS Transcribe Streaming에 연결합니다.
 * 오디오 처리 및 AWS SDK 통신은 백엔드에서 처리합니다.
 */

import { io, Socket } from 'socket.io-client';

// ==========================================
// 오디오 처리 유틸리티
// ==========================================

/**
 * AudioBuffer를 다운샘플링합니다.
 */
export function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
): Float32Array {
  if (outputSampleRate === inputSampleRate) {
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

/**
 * Float32Array를 16-bit PCM으로 인코딩합니다.
 */
export function pcmEncode(input: Float32Array): number[] {
  const output: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    // Little-endian 16-bit signed integer
    output.push(val & 0xff);
    output.push((val >> 8) & 0xff);
  }

  return output;
}

// ==========================================
// 타입 정의
// ==========================================

export interface TranscriptResult {
  meetingId: string;
  resultId: string;
  isPartial: boolean;
  transcript: string;
  startTimeMs: number;
  endTimeMs: number;
  items?: Array<{
    content: string;
    startTime: number;
    endTime: number;
    type: string;
    confidence?: number;
  }>;
}

export interface SocketTranscriptionOptions {
  serverUrl: string;
  meetingId: string;
  languageCode?: string;
  sampleRate?: number;
  onTranscript: (result: TranscriptResult) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

// ==========================================
// Socket.IO Transcription Client
// ==========================================

export class SocketTranscriptionClient {
  private socket: Socket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private options: SocketTranscriptionOptions;
  private isStreaming = false;
  private chunkCount = 0;

  constructor(options: SocketTranscriptionOptions) {
    this.options = {
      languageCode: 'ko-KR',
      sampleRate: 16000,
      ...options,
    };
  }

  /**
   * 트랜스크립션 시작
   */
  async start(stream: MediaStream): Promise<void> {
    if (this.isStreaming) {
      console.warn('Already streaming');
      return;
    }

    this.mediaStream = stream;
    this.isStreaming = true;
    this.chunkCount = 0;

    // Socket.IO 연결
    this.socket = io(`${this.options.serverUrl}/transcription`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    this.socket.on('connect', async () => {
      console.log('[SocketTranscription] Connected to server');

      // 트랜스크립션 시작 요청
      this.socket?.emit('startTranscription', {
        meetingId: this.options.meetingId,
        languageCode: this.options.languageCode,
        sampleRate: this.options.sampleRate,
      });
    });

    this.socket.on('transcriptionStarted', (data) => {
      console.log('[SocketTranscription] Transcription started:', data);
      this.options.onOpen?.();
      this.startAudioProcessing();
    });

    this.socket.on('transcriptResult', (result: TranscriptResult) => {
      this.options.onTranscript(result);
    });

    this.socket.on('transcriptionError', (error: { meetingId: string; error: string }) => {
      console.error('[SocketTranscription] Error:', error);
      this.options.onError?.(new Error(error.error));
    });

    this.socket.on('transcriptionStopped', () => {
      console.log('[SocketTranscription] Transcription stopped');
      this.options.onClose?.();
      this.cleanup();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketTranscription] Disconnected:', reason);
      this.options.onClose?.();
      this.cleanup();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketTranscription] Connection error:', error);
      this.options.onError?.(new Error(`Connection error: ${error.message}`));
    });
  }

  /**
   * 트랜스크립션 중지
   */
  stop(): void {
    if (!this.isStreaming) return;

    if (this.socket?.connected) {
      this.socket.emit('stopTranscription');
    }

    this.cleanup();
  }

  private async startAudioProcessing(): Promise<void> {
    if (!this.mediaStream) return;

    // AudioContext 생성
    this.audioContext = new AudioContext();

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    console.log('[SocketTranscription] AudioContext sample rate:', this.audioContext.sampleRate);
    console.log('[SocketTranscription] Target sample rate:', this.options.sampleRate);

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // ScriptProcessorNode 생성 (4096 buffer size)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.isStreaming || !this.socket?.connected) {
        return;
      }

      const inputData = event.inputBuffer.getChannelData(0);

      // 다운샘플링
      const downsampledData = downsampleBuffer(
        inputData,
        this.audioContext!.sampleRate,
        this.options.sampleRate!,
      );

      // PCM 인코딩 (number array로 변환)
      const pcmData = pcmEncode(downsampledData);

      if (pcmData.length === 0) {
        return;
      }

      // 백엔드로 오디오 데이터 전송
      this.socket!.emit('audioData', { audio: pcmData });

      this.chunkCount++;
      if (this.chunkCount === 1) {
        console.log(`[SocketTranscription] First audio chunk sent (${pcmData.length} bytes)`);
      } else if (this.chunkCount % 100 === 0) {
        console.log(`[SocketTranscription] Sent ${this.chunkCount} audio chunks`);
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private cleanup(): void {
    this.isStreaming = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.mediaStream = null;
  }
}
