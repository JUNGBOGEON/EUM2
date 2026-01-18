import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3StorageService } from '../../storage/s3-storage.service';
import { User } from '../../users/entities/user.entity';
import WebSocket from 'ws';

export interface VoiceDubbingTTSResult {
  audioUrl: string;
  durationMs: number;
  voiceId: string; // 'voice-dubbing'
}

/**
 * Voice Dubbing TTS Service
 * AI Server의 XTTS v2를 사용하여 발화자 목소리로 TTS 생성
 */
@Injectable()
export class VoiceDubbingTTSService {
  private readonly logger = new Logger(VoiceDubbingTTSService.name);
  private readonly aiServerUrl: string;
  private readonly aiServerWsUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly s3StorageService: S3StorageService,
    private readonly configService: ConfigService,
  ) {
    const httpUrl =
      this.configService.get<string>('AI_SERVER_URL') ||
      'http://localhost:8000';
    this.aiServerUrl = httpUrl;
    // Convert http to ws for WebSocket URL
    this.aiServerWsUrl = httpUrl.replace(/^http/, 'ws');
    this.logger.log(`AI Server URL: ${this.aiServerUrl}`);
    this.logger.log(`AI Server WS URL: ${this.aiServerWsUrl}`);
  }

  /**
   * 발화자가 음성 더빙을 활성화했는지 확인
   */
  async isVoiceDubbingEnabled(speakerUserId: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { id: speakerUserId },
      select: ['voiceDubbingEnabled', 'voiceEmbeddingS3Key'],
    });

    return !!(user?.voiceDubbingEnabled && user?.voiceEmbeddingS3Key);
  }

  /**
   * 사용자의 voiceEmbeddingS3Key를 가져옴
   */
  async getVoiceEmbeddingS3Key(userId: string): Promise<string | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['voiceDubbingEnabled', 'voiceEmbeddingS3Key'],
    });

    if (!user?.voiceDubbingEnabled || !user?.voiceEmbeddingS3Key) {
      return null;
    }

    return user.voiceEmbeddingS3Key;
  }

  /**
   * AI Server 상태 확인 (optional health check)
   */
  async isAIServerHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.aiServerUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn('[VoiceDubbing TTS] AI Server health check failed');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `[VoiceDubbing TTS] AI Server health check error: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * 음성 더빙 TTS 생성 (AI Server WebSocket 사용)
   *
   * @param text 번역된 텍스트
   * @param language 타겟 언어 (ko, en, ja, zh)
   * @param speakerUserId 발화자 userId (음성 복제 대상)
   * @param sessionId 세션 ID (S3 경로용)
   */
  async synthesizeWithVoiceDubbing(
    text: string,
    language: string,
    speakerUserId: string,
    sessionId: string,
  ): Promise<VoiceDubbingTTSResult | null> {
    this.logger.log(
      `[VoiceDubbing TTS] Generating for speaker=${speakerUserId}, lang=${language}, text="${text.substring(0, 30)}..."`,
    );

    try {
      // 0. 사용자의 S3 embedding key 가져오기
      const embeddingS3Key = await this.getVoiceEmbeddingS3Key(speakerUserId);
      if (!embeddingS3Key) {
        this.logger.warn(
          `[VoiceDubbing TTS] User ${speakerUserId} has no voice embedding S3 key, skipping voice dubbing`,
        );
        return null;
      }

      this.logger.debug(
        `[VoiceDubbing TTS] Using embedding S3 key: ${embeddingS3Key}`,
      );

      // 1. AI Server WebSocket으로 TTS 생성 (S3 key 전달)
      const audioBuffer = await this.generateTTSViaWebSocket(
        text,
        language,
        speakerUserId,
        embeddingS3Key,
      );

      if (!audioBuffer || audioBuffer.length === 0) {
        this.logger.warn('[VoiceDubbing TTS] No audio received from AI Server');
        return null;
      }

      // 2. S3에 업로드
      const s3Key = `meeting-tts/${sessionId}/voice-dubbing-${speakerUserId}-${Date.now()}.wav`;

      // Convert Float32 PCM to WAV
      const wavBuffer = this.convertFloat32ToWav(audioBuffer, 24000); // XTTS outputs 24kHz

      await this.s3StorageService.uploadFile(s3Key, wavBuffer, 'audio/wav');

      // 3. Presigned URL 생성 (1시간 유효)
      const audioUrl = await this.s3StorageService.getPresignedUrl(s3Key, 3600);

      // 4. 오디오 길이 계산 (24kHz Float32 samples)
      const durationMs = Math.round((audioBuffer.length / 4 / 24000) * 1000);

      this.logger.log(
        `[VoiceDubbing TTS] Generated: ${durationMs}ms, S3=${s3Key}`,
      );

      return {
        audioUrl,
        durationMs,
        voiceId: 'voice-dubbing',
      };
    } catch (error) {
      this.logger.error(
        `[VoiceDubbing TTS] Failed: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * AI Server WebSocket을 통해 TTS 생성
   */
  private generateTTSViaWebSocket(
    text: string,
    language: string,
    userId: string,
    embeddingS3Key: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.aiServerWsUrl}/ws/tts/${userId}`;
      this.logger.debug(`[VoiceDubbing TTS] Connecting to ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      const audioChunks: Buffer[] = [];
      let resolved = false;
      let messageSent = false;

      // 타임아웃 설정 (30초로 증가 - 모델 로딩 시간 고려)
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          reject(new Error('WebSocket timeout'));
        }
      }, 30000);

      ws.on('open', () => {
        this.logger.debug(
          '[VoiceDubbing TTS] WebSocket connected, sending TTS request...',
        );
        // AI Server는 연결 후 바로 요청을 기다림 - 즉시 전송
        // S3 key를 함께 전달하여 AI Server가 S3에서 embedding을 로드할 수 있게 함
        const langCode = this.mapLanguageCode(language);
        this.logger.debug(
          `[VoiceDubbing TTS] Sending TTS request: lang=${langCode}, s3_key=${embeddingS3Key}, text=${text.substring(0, 30)}...`,
        );
        ws.send(
          JSON.stringify({ text, language: langCode, s3_key: embeddingS3Key }),
        );
        messageSent = true;
      });

      ws.on('message', (data: WebSocket.RawData) => {
        // 모든 메시지를 먼저 문자열로 변환 시도
        let messageStr: string | null = null;
        let isBinary = false;

        if (Buffer.isBuffer(data)) {
          // Buffer인 경우, 먼저 JSON인지 확인
          const str = data.toString('utf8');
          if (str.startsWith('{') || str.startsWith('[')) {
            messageStr = str;
          } else {
            isBinary = true;
          }
        } else if (typeof data === 'string') {
          messageStr = data;
        } else if (data instanceof ArrayBuffer) {
          const str = Buffer.from(data).toString('utf8');
          if (str.startsWith('{') || str.startsWith('[')) {
            messageStr = str;
          } else {
            isBinary = true;
          }
        }

        // JSON 메시지 처리
        if (messageStr) {
          try {
            const message = JSON.parse(messageStr);
            this.logger.debug(
              `[VoiceDubbing TTS] Received JSON: ${JSON.stringify(message)}`,
            );

            if (message.status === 'complete') {
              clearTimeout(timeout);
              resolved = true;
              ws.close();
              resolve(Buffer.concat(audioChunks));
            } else if (message.error) {
              clearTimeout(timeout);
              resolved = true;
              ws.close();
              reject(new Error(message.error));
            }
          } catch (e) {
            // JSON 파싱 실패 - 바이너리로 처리
            if (Buffer.isBuffer(data)) {
              audioChunks.push(data);
            }
          }
        } else if (isBinary && Buffer.isBuffer(data)) {
          // Binary audio data (Float32 PCM)
          audioChunks.push(data);
        }
      });

      ws.on('error', (error) => {
        this.logger.error(
          `[VoiceDubbing TTS] WebSocket error: ${error.message}`,
        );
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          reject(error);
        }
      });

      ws.on('close', (code, reason) => {
        this.logger.debug(
          `[VoiceDubbing TTS] WebSocket closed: code=${code}, reason=${reason?.toString() || 'none'}`,
        );
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          // If we have audio, resolve with it
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          } else {
            reject(new Error(`WebSocket closed unexpectedly: code=${code}`));
          }
        }
      });
    });
  }

  /**
   * 언어 코드 매핑 (AWS 형식 -> OpenVoice V2 형식)
   * OpenVoice V2의 LANGUAGE_CONFIG: ko, en, ja, zh
   */
  private mapLanguageCode(awsLangCode: string): string {
    const mapping: Record<string, string> = {
      'ko-KR': 'ko',
      'en-US': 'en',
      'ja-JP': 'ja',
      'zh-CN': 'zh',
      ko: 'ko',
      en: 'en',
      ja: 'ja',
      zh: 'zh',
      'zh-cn': 'zh',
    };
    return mapping[awsLangCode] || awsLangCode.split('-')[0].toLowerCase();
  }

  /**
   * Float32 PCM 데이터를 WAV 파일로 변환
   */
  private convertFloat32ToWav(
    float32Buffer: Buffer,
    sampleRate: number,
  ): Buffer {
    const numSamples = float32Buffer.length / 4; // Float32 = 4 bytes per sample
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = numSamples * blockAlign;
    const fileSize = 36 + dataSize;

    const wavBuffer = Buffer.alloc(44 + dataSize);
    let offset = 0;

    // RIFF header
    wavBuffer.write('RIFF', offset);
    offset += 4;
    wavBuffer.writeUInt32LE(fileSize, offset);
    offset += 4;
    wavBuffer.write('WAVE', offset);
    offset += 4;

    // fmt chunk
    wavBuffer.write('fmt ', offset);
    offset += 4;
    wavBuffer.writeUInt32LE(16, offset);
    offset += 4; // Subchunk1Size
    wavBuffer.writeUInt16LE(1, offset);
    offset += 2; // AudioFormat (PCM)
    wavBuffer.writeUInt16LE(numChannels, offset);
    offset += 2;
    wavBuffer.writeUInt32LE(sampleRate, offset);
    offset += 4;
    wavBuffer.writeUInt32LE(byteRate, offset);
    offset += 4;
    wavBuffer.writeUInt16LE(blockAlign, offset);
    offset += 2;
    wavBuffer.writeUInt16LE(bitsPerSample, offset);
    offset += 2;

    // data chunk
    wavBuffer.write('data', offset);
    offset += 4;
    wavBuffer.writeUInt32LE(dataSize, offset);
    offset += 4;

    // Convert Float32 to Int16
    for (let i = 0; i < numSamples; i++) {
      const float32Sample = float32Buffer.readFloatLE(i * 4);
      // Clamp to [-1, 1] and convert to Int16
      const clampedSample = Math.max(-1, Math.min(1, float32Sample));
      const int16Sample = Math.round(clampedSample * 32767);
      wavBuffer.writeInt16LE(int16Sample, offset);
      offset += 2;
    }

    return wavBuffer;
  }
}
