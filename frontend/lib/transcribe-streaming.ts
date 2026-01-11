/**
 * AWS Transcribe Streaming 클라이언트
 *
 * 브라우저에서 직접 AWS Transcribe Streaming WebSocket에 연결하여
 * 실시간 음성 인식을 수행합니다.
 *
 * AWS SDK EventStreamCodec을 사용하여 정확한 Event Stream 인코딩을 보장합니다.
 */

import { EventStreamCodec } from '@aws-sdk/eventstream-codec';
import { toUtf8, fromUtf8 } from '@smithy/util-utf8';

// AWS SDK EventStreamCodec 인스턴스 (공식 인코더/디코더)
const eventStreamCodec = new EventStreamCodec(toUtf8, fromUtf8);

// ==========================================
// 오디오 처리 유틸리티
// ==========================================

/**
 * AudioBuffer를 다운샘플링합니다.
 * 브라우저의 기본 샘플레이트(보통 44100Hz/48000Hz)를 Transcribe가 지원하는 샘플레이트로 변환
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
 * AWS Transcribe Streaming은 16-bit signed little-endian PCM을 요구합니다.
 */
export function pcmEncode(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

// ==========================================
// AWS Event Stream 메시지 (공식 SDK 사용)
// ==========================================

/**
 * AWS Event Stream 메시지 구조
 */
interface EventStreamMessage {
  headers: Record<string, string>;
  body: Uint8Array;
}

/**
 * Uint8Array를 문자열로 변환
 */
function uint8ArrayToString(array: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(array);
}

/**
 * AWS Event Stream AudioEvent 메시지 생성 (공식 SDK 포맷)
 */
function createAudioEventMessage(audioData: Uint8Array) {
  return {
    headers: {
      ':message-type': {
        type: 'string' as const,
        value: 'event',
      },
      ':event-type': {
        type: 'string' as const,
        value: 'AudioEvent',
      },
      ':content-type': {
        type: 'string' as const,
        value: 'application/octet-stream',
      },
    },
    body: audioData,
  };
}

/**
 * AWS Event Stream 메시지 인코딩 (공식 SDK 사용)
 */
export function encodeEventStreamMessage(audioChunk: ArrayBuffer): Uint8Array {
  const audioData = new Uint8Array(audioChunk);
  const message = createAudioEventMessage(audioData);
  return eventStreamCodec.encode(message);
}

/**
 * AWS Event Stream 메시지 디코딩 (공식 SDK 사용)
 */
export function decodeEventStreamMessage(data: ArrayBuffer): EventStreamMessage | null {
  try {
    const uint8Data = new Uint8Array(data);
    const decoded = eventStreamCodec.decode(uint8Data);

    // 헤더를 Record<string, string>으로 변환
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(decoded.headers)) {
      if (typeof value === 'object' && 'value' in value) {
        headers[key] = String(value.value);
      }
    }

    return {
      headers,
      body: decoded.body,
    };
  } catch (error) {
    console.error('Failed to decode event stream message:', error);
    return null;
  }
}

// ==========================================
// Transcribe Streaming 클라이언트
// ==========================================

export interface TranscriptResult {
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

export interface TranscribeStreamingOptions {
  presignedUrl: string;
  sampleRate?: number;
  onTranscript: (result: TranscriptResult) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class TranscribeStreamingClient {
  private websocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private options: TranscribeStreamingOptions;
  private isStreaming = false;
  private chunkCount = 0;
  private _isMuted = false;
  private lastAudioSentTime = 0;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private audioContextStateHandler: (() => void) | null = null;

  constructor(options: TranscribeStreamingOptions) {
    this.options = {
      sampleRate: 16000,
      ...options,
    };
  }

  /**
   * 음소거 상태 설정
   * 음소거 시 오디오 청크를 AWS에 전송하지 않음
   */
  setMuted(muted: boolean): void {
    this._isMuted = muted;
    if (muted) {
      console.log('[TranscribeStreaming] Muted - pausing audio transmission');
    } else {
      console.log('[TranscribeStreaming] Unmuted - resuming audio transmission');
    }
  }

  /**
   * 음소거 상태 조회
   */
  get isMuted(): boolean {
    return this._isMuted;
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

    // WebSocket 연결
    this.websocket = new WebSocket(this.options.presignedUrl);
    this.websocket.binaryType = 'arraybuffer';

    this.websocket.onopen = async () => {
      console.log('[TranscribeStreaming] WebSocket connected');
      this.options.onOpen?.();
      await this.startAudioProcessing();
    };

    this.websocket.onmessage = (event) => {
      // 수신 메시지 디버깅
      if (event.data instanceof ArrayBuffer) {
        console.log(`[TranscribeStreaming] Received message: ${event.data.byteLength} bytes`);
      } else {
        console.log(`[TranscribeStreaming] Received non-ArrayBuffer message:`, typeof event.data);
      }
      this.handleMessage(event.data);
    };

    this.websocket.onerror = (error) => {
      console.error('[TranscribeStreaming] WebSocket error:', error);
      this.options.onError?.(new Error('WebSocket error'));
    };

    this.websocket.onclose = (event) => {
      console.log('[TranscribeStreaming] WebSocket closed:', event.code, event.reason);
      this.options.onClose?.();
      this.cleanup();
    };
  }

  /**
   * 트랜스크립션 중지
   */
  stop(): void {
    if (!this.isStreaming) return;

    // 빈 오디오 이벤트 전송 (스트림 종료 신호)
    if (this.websocket?.readyState === WebSocket.OPEN) {
      const emptyAudio = new ArrayBuffer(0);
      const message = encodeEventStreamMessage(emptyAudio);
      this.websocket.send(message);
    }

    this.cleanup();
  }

  private async startAudioProcessing(): Promise<void> {
    if (!this.mediaStream) return;

    // AudioContext 생성 (시스템 기본 샘플레이트 사용)
    this.audioContext = new AudioContext();

    // AudioContext가 suspended 상태일 수 있으므로 resume
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // AudioContext 상태 변경 감지 (브라우저가 일시 중지할 때 자동 재개)
    this.audioContextStateHandler = () => {
      if (this.audioContext?.state === 'suspended' && this.isStreaming) {
        console.log('[TranscribeStreaming] AudioContext suspended, attempting to resume...');
        this.audioContext.resume().then(() => {
          console.log('[TranscribeStreaming] AudioContext resumed successfully');
        }).catch((err) => {
          console.error('[TranscribeStreaming] Failed to resume AudioContext:', err);
        });
      }
    };
    this.audioContext.addEventListener('statechange', this.audioContextStateHandler);

    console.log('[TranscribeStreaming] AudioContext sample rate:', this.audioContext.sampleRate);
    console.log('[TranscribeStreaming] Target sample rate:', this.options.sampleRate);
    console.log('[TranscribeStreaming] Downsample ratio:', this.audioContext.sampleRate / this.options.sampleRate!);

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // ScriptProcessorNode (deprecated but widely supported)
    // 4096 samples buffer size for better audio quality
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    // 오디오 콜백 카운터 (디버깅용)
    let audioCallbackCount = 0;
    let lastCallbackLogTime = Date.now();

    this.processor.onaudioprocess = (event) => {
      audioCallbackCount++;

      // 10초마다 콜백 횟수 로깅 (오디오 처리가 정상적으로 되는지 확인)
      const now = Date.now();
      if (now - lastCallbackLogTime > 10000) {
        console.log(`[TranscribeStreaming] Audio callbacks in last 10s: ${audioCallbackCount}, muted: ${this._isMuted}, wsOpen: ${this.websocket?.readyState === WebSocket.OPEN}`);
        audioCallbackCount = 0;
        lastCallbackLogTime = now;
      }

      if (!this.isStreaming || this.websocket?.readyState !== WebSocket.OPEN) {
        return;
      }

      // 음소거 상태면 오디오 전송 건너뛰기
      if (this._isMuted) {
        return;
      }

      const inputData = event.inputBuffer.getChannelData(0);

      // 오디오 레벨 확인 (디버깅용 - 매 100번째 청크)
      if (this.chunkCount % 100 === 0) {
        let maxLevel = 0;
        let rms = 0;
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.abs(inputData[i]);
          if (sample > maxLevel) maxLevel = sample;
          rms += sample * sample;
        }
        rms = Math.sqrt(rms / inputData.length);
        console.log(`[TranscribeStreaming] Audio level - Max: ${maxLevel.toFixed(4)}, RMS: ${rms.toFixed(4)}`);
      }

      // 다운샘플링
      const downsampledData = downsampleBuffer(
        inputData,
        this.audioContext!.sampleRate,
        this.options.sampleRate!,
      );

      // PCM 인코딩 (16-bit signed little-endian)
      const pcmData = pcmEncode(downsampledData);

      // 빈 오디오 청크 스킵
      if (pcmData.byteLength === 0) {
        return;
      }

      // AWS Event Stream 메시지로 인코딩하여 전송
      try {
        const message = encodeEventStreamMessage(pcmData);
        this.websocket!.send(message);
        this.lastAudioSentTime = Date.now();

        this.chunkCount++;
        if (this.chunkCount === 1) {
          console.log(`[TranscribeStreaming] First audio chunk sent`);
          console.log(`[TranscribeStreaming] - PCM size: ${pcmData.byteLength} bytes`);
          console.log(`[TranscribeStreaming] - Message size: ${message.byteLength} bytes`);
          // 첫 번째 청크의 처음 몇 바이트 로깅 (디버깅용)
          const preview = new Uint8Array(message).slice(0, 20);
          console.log(`[TranscribeStreaming] - Message preview:`, Array.from(preview));
        } else if (this.chunkCount % 100 === 0) {
          console.log(`[TranscribeStreaming] Sent ${this.chunkCount} audio chunks`);
        }
      } catch (error) {
        console.error('[TranscribeStreaming] Failed to send audio chunk:', error);
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    // 연결 상태 모니터링 (5초마다)
    this.startHealthCheck();
  }

  /**
   * 연결 상태 모니터링 시작
   * - AudioContext suspended 감지 및 자동 resume
   * - 오디오 전송 중단 감지
   * - Keep-alive 메커니즘 (무음 오디오 전송)
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // 더 자주 체크 (3초마다) - AWS Transcribe는 15초 후 타임아웃
    this.healthCheckInterval = setInterval(() => {
      if (!this.isStreaming) {
        return;
      }

      // AudioContext 상태 확인
      if (this.audioContext?.state === 'suspended') {
        console.warn('[TranscribeStreaming] HealthCheck: AudioContext is suspended, resuming...');
        this.audioContext.resume().catch((err) => {
          console.error('[TranscribeStreaming] Failed to resume AudioContext:', err);
        });
      }

      // WebSocket 상태 확인
      if (this.websocket?.readyState !== WebSocket.OPEN) {
        console.warn('[TranscribeStreaming] HealthCheck: WebSocket is not open, state:', this.websocket?.readyState);
        return;
      }

      // 오디오 전송 중단 감지 (8초 이상 전송 없음 - 타임아웃 전에 감지)
      const timeSinceLastAudio = Date.now() - this.lastAudioSentTime;
      if (this.lastAudioSentTime > 0 && timeSinceLastAudio > 8000) {
        console.warn(`[TranscribeStreaming] HealthCheck: No audio sent for ${Math.round(timeSinceLastAudio / 1000)}s, muted: ${this._isMuted}`);

        // AudioContext 강제 resume 시도
        if (this.audioContext && this.audioContext.state !== 'running') {
          console.log('[TranscribeStreaming] Forcing AudioContext resume...');
          this.audioContext.resume().catch(console.error);
        }

        // 음소거가 아닌데 오디오가 전송되지 않으면 무음 keep-alive 패킷 전송
        // AWS Transcribe는 15초 동안 오디오가 없으면 연결을 끊음
        if (!this._isMuted && timeSinceLastAudio > 10000) {
          console.log('[TranscribeStreaming] Sending keep-alive silent audio...');
          this.sendKeepAlive();
        }
      }
    }, 3000);
  }

  /**
   * Keep-alive 무음 오디오 패킷 전송
   * AWS Transcribe 연결을 유지하기 위해 무음 PCM 데이터 전송
   */
  private sendKeepAlive(): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // 100ms 분량의 무음 PCM 데이터 생성 (16kHz, 16-bit mono)
      const sampleRate = this.options.sampleRate || 16000;
      const durationMs = 100;
      const numSamples = Math.floor(sampleRate * durationMs / 1000);
      const silentPcm = new ArrayBuffer(numSamples * 2); // 16-bit = 2 bytes per sample
      // ArrayBuffer는 기본적으로 0으로 초기화됨 (무음)

      const message = encodeEventStreamMessage(silentPcm);
      this.websocket.send(message);
      this.lastAudioSentTime = Date.now();
      console.log('[TranscribeStreaming] Keep-alive sent');
    } catch (error) {
      console.error('[TranscribeStreaming] Failed to send keep-alive:', error);
    }
  }

  private handleMessage(data: ArrayBuffer): void {
    const message = decodeEventStreamMessage(data);
    if (!message) {
      console.error('[TranscribeStreaming] Failed to decode message');
      return;
    }

    const messageType = message.headers[':message-type'];
    const eventType = message.headers[':event-type'];
    console.log(`[TranscribeStreaming] Message type: ${messageType}, Event type: ${eventType}`);

    if (messageType === 'exception') {
      const errorMessage = uint8ArrayToString(message.body);
      console.error('[TranscribeStreaming] Exception:', errorMessage);
      this.options.onError?.(new Error(errorMessage));
      return;
    }

    if (eventType === 'TranscriptEvent') {
      try {
        const transcriptJson = uint8ArrayToString(message.body);
        const transcript = JSON.parse(transcriptJson);

        if (transcript.Transcript?.Results) {
          for (const result of transcript.Transcript.Results) {
            if (result.Alternatives && result.Alternatives.length > 0) {
              const alternative = result.Alternatives[0];

              const transcriptResult: TranscriptResult = {
                resultId: result.ResultId || '',
                isPartial: result.IsPartial ?? true,
                transcript: alternative.Transcript || '',
                startTimeMs: Math.round((result.StartTime || 0) * 1000),
                endTimeMs: Math.round((result.EndTime || 0) * 1000),
                items: alternative.Items?.map((item: any) => ({
                  content: item.Content,
                  startTime: item.StartTime,
                  endTime: item.EndTime,
                  type: item.Type,
                  confidence: item.Confidence,
                })),
              };

              this.options.onTranscript(transcriptResult);
            }
          }
        }
      } catch (error) {
        console.error('[TranscribeStreaming] Failed to parse transcript:', error);
      }
    }
  }

  private cleanup(): void {
    this.isStreaming = false;

    // 헬스 체크 인터벌 정리
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // 프로세서 정리 (에러 발생해도 계속 진행)
    try {
      if (this.processor) {
        this.processor.disconnect();
      }
    } catch (error) {
      console.error('[TranscribeStreaming] Error disconnecting processor:', error);
    } finally {
      this.processor = null;
    }

    // AudioContext 이벤트 리스너 제거 및 정리
    try {
      if (this.audioContext) {
        // 상태 변경 이벤트 리스너 제거
        if (this.audioContextStateHandler) {
          this.audioContext.removeEventListener('statechange', this.audioContextStateHandler);
          this.audioContextStateHandler = null;
        }
        // AudioContext 닫기 (close()는 Promise를 반환하지만 fire-and-forget)
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close().catch((error) => {
            console.error('[TranscribeStreaming] Error closing AudioContext:', error);
          });
        }
      }
    } catch (error) {
      console.error('[TranscribeStreaming] Error cleaning up AudioContext:', error);
    } finally {
      this.audioContext = null;
    }

    // WebSocket 정리 (에러 발생해도 계속 진행)
    try {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.close();
      }
    } catch (error) {
      console.error('[TranscribeStreaming] Error closing WebSocket:', error);
    } finally {
      this.websocket = null;
    }

    this.mediaStream = null;
  }
}
