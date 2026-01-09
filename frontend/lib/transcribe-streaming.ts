/**
 * AWS Transcribe Streaming 클라이언트
 *
 * 브라우저에서 직접 AWS Transcribe Streaming WebSocket에 연결하여
 * 실시간 음성 인식을 수행합니다.
 */

// ==========================================
// 오디오 처리 유틸리티
// ==========================================

/**
 * AudioBuffer를 다운샘플링합니다.
 * 브라우저의 기본 샘플레이트(보통 44100Hz)를 Transcribe가 지원하는 샘플레이트로 변환
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
// AWS Event Stream 메시지 인코더/디코더
// ==========================================

/**
 * AWS Event Stream 메시지 구조
 */
interface EventStreamMessage {
  headers: Record<string, string>;
  body: Uint8Array;
}

/**
 * 문자열을 Uint8Array로 변환
 */
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Uint8Array를 문자열로 변환
 */
function uint8ArrayToString(array: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(array);
}

// ==========================================
// CRC32C 계산 (AWS Event Stream 필수)
// ==========================================

const CRC32C_TABLE = new Uint32Array(256);

// CRC32C 테이블 초기화 (Castagnoli polynomial)
(function initCrc32cTable() {
  const polynomial = 0x82f63b78;
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ polynomial;
      } else {
        crc >>>= 1;
      }
    }
    CRC32C_TABLE[i] = crc >>> 0;
  }
})();

function crc32c(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32C_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (~crc) >>> 0;
}

/**
 * AWS Event Stream 메시지 인코딩
 * AWS Transcribe Streaming은 event-stream 형식의 바이너리 메시지를 사용합니다.
 *
 * Message format:
 * [total_byte_length:4][headers_byte_length:4][prelude_crc:4][headers:*][payload:*][message_crc:4]
 */
export function encodeEventStreamMessage(audioChunk: ArrayBuffer): ArrayBuffer {
  // 헤더 구성 (순서 중요)
  const headers: Array<{ name: string; value: string }> = [
    { name: ':content-type', value: 'application/octet-stream' },
    { name: ':event-type', value: 'AudioEvent' },
    { name: ':message-type', value: 'event' },
  ];

  // 헤더 인코딩
  const headerBuffers: Uint8Array[] = [];
  let headersLength = 0;

  for (const { name, value } of headers) {
    const nameBytes = stringToUint8Array(name);
    const valueBytes = stringToUint8Array(value);

    // Header: name_byte_length(1) + name + value_type(1) + value_string_byte_length(2) + value
    const headerLength = 1 + nameBytes.length + 1 + 2 + valueBytes.length;
    const headerBuffer = new Uint8Array(headerLength);
    const headerView = new DataView(headerBuffer.buffer);

    let offset = 0;

    // Header name length (1 byte)
    headerBuffer[offset] = nameBytes.length;
    offset += 1;

    // Header name
    headerBuffer.set(nameBytes, offset);
    offset += nameBytes.length;

    // Header value type (7 = string)
    headerBuffer[offset] = 7;
    offset += 1;

    // Header value length (2 bytes, big-endian)
    headerView.setUint16(offset, valueBytes.length, false);
    offset += 2;

    // Header value
    headerBuffer.set(valueBytes, offset);

    headerBuffers.push(headerBuffer);
    headersLength += headerLength;
  }

  // 메시지 전체 구성
  const payload = new Uint8Array(audioChunk);
  const totalLength = 4 + 4 + 4 + headersLength + payload.length + 4;

  const message = new Uint8Array(totalLength);
  const messageView = new DataView(message.buffer);

  let offset = 0;

  // Prelude: total_byte_length (4 bytes, big-endian)
  messageView.setUint32(offset, totalLength, false);
  offset += 4;

  // Prelude: headers_byte_length (4 bytes, big-endian)
  messageView.setUint32(offset, headersLength, false);
  offset += 4;

  // Prelude CRC (4 bytes, big-endian) - CRC of first 8 bytes
  const preludeBytes = message.slice(0, 8);
  const preludeCrc = crc32c(preludeBytes);
  messageView.setUint32(offset, preludeCrc, false);
  offset += 4;

  // Headers
  for (const headerBuffer of headerBuffers) {
    message.set(headerBuffer, offset);
    offset += headerBuffer.length;
  }

  // Payload
  message.set(payload, offset);
  offset += payload.length;

  // Message CRC (4 bytes, big-endian) - CRC of everything except last 4 bytes
  const messageCrc = crc32c(message.slice(0, offset));
  messageView.setUint32(offset, messageCrc, false);

  return message.buffer;
}

/**
 * AWS Event Stream 메시지 디코딩
 */
export function decodeEventStreamMessage(data: ArrayBuffer): EventStreamMessage | null {
  try {
    const view = new DataView(data);
    const array = new Uint8Array(data);

    // Total byte length
    const totalLength = view.getUint32(0, false);
    if (totalLength !== data.byteLength) {
      console.warn('Message length mismatch');
      return null;
    }

    // Headers byte length
    const headersLength = view.getUint32(4, false);

    // Skip prelude CRC (4 bytes at offset 8)
    let offset = 12;

    // Parse headers
    const headers: Record<string, string> = {};
    const headersEnd = offset + headersLength;

    while (offset < headersEnd) {
      // Header name length
      const nameLength = view.getUint8(offset);
      offset += 1;

      // Header name
      const name = uint8ArrayToString(array.slice(offset, offset + nameLength));
      offset += nameLength;

      // Header value type
      const valueType = view.getUint8(offset);
      offset += 1;

      if (valueType === 7) {
        // String type
        const valueLength = view.getUint16(offset, false);
        offset += 2;

        const value = uint8ArrayToString(array.slice(offset, offset + valueLength));
        offset += valueLength;

        headers[name] = value;
      } else {
        // Skip other types
        console.warn(`Unknown header value type: ${valueType}`);
        break;
      }
    }

    // Body (between headers end and message CRC)
    const bodyEnd = totalLength - 4; // Exclude message CRC
    const body = array.slice(headersEnd, bodyEnd);

    return { headers, body };
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

  constructor(options: TranscribeStreamingOptions) {
    this.options = {
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

    // WebSocket 연결
    this.websocket = new WebSocket(this.options.presignedUrl);
    this.websocket.binaryType = 'arraybuffer';

    this.websocket.onopen = async () => {
      console.log('[TranscribeStreaming] WebSocket connected');
      this.options.onOpen?.();
      await this.startAudioProcessing();
    };

    this.websocket.onmessage = (event) => {
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

    console.log('[TranscribeStreaming] AudioContext sample rate:', this.audioContext.sampleRate);
    console.log('[TranscribeStreaming] Target sample rate:', this.options.sampleRate);
    console.log('[TranscribeStreaming] Downsample ratio:', this.audioContext.sampleRate / this.options.sampleRate!);

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // ScriptProcessorNode (deprecated but widely supported)
    // 4096 samples buffer size for better audio quality
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.isStreaming || this.websocket?.readyState !== WebSocket.OPEN) {
        return;
      }

      const inputData = event.inputBuffer.getChannelData(0);

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
  }

  private handleMessage(data: ArrayBuffer): void {
    const message = decodeEventStreamMessage(data);
    if (!message) return;

    const messageType = message.headers[':message-type'];
    const eventType = message.headers[':event-type'];

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

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.websocket) {
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.close();
      }
      this.websocket = null;
    }

    this.mediaStream = null;
  }
}
