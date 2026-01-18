import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

import { RedisService } from '../../redis/redis.service';
import { S3StorageService } from '../../storage/s3-storage.service';
import { PollyService } from './polly.service';
import { CACHE_TTL } from '../../common/constants';

/**
 * TTS Cache Metadata stored in Redis
 */
interface TTSCacheMetadata {
  s3Key: string;
  durationMs: number;
  createdAt: number;
  // Presigned URL 캐싱 (속도 최적화)
  presignedUrl?: string;
  presignedUrlExpiresAt?: number;
}

/**
 * TTS Synthesis Result with URL
 */
export interface TTSCacheResult {
  audioUrl?: string;
  audioData?: string; // Base64 인코딩된 오디오 (실시간 TTS용)
  durationMs: number;
  voiceId: string;
  cached: boolean;
}

/**
 * PollyCacheService
 * Handles TTS audio caching with Redis metadata and S3 storage
 */
@Injectable()
export class PollyCacheService {
  private readonly logger = new Logger(PollyCacheService.name);

  constructor(
    private pollyService: PollyService,
    private redisService: RedisService,
    private s3StorageService: S3StorageService,
  ) {}

  /**
   * Synthesize TTS with caching
   * 1. Check Redis for cached S3 key
   * 2. If cached, generate presigned URL
   * 3. If not cached, synthesize with Polly, upload to S3, cache metadata
   */
  async synthesizeWithCache(
    text: string,
    voiceId: string,
    languageCode: string,
    sessionId: string,
  ): Promise<TTSCacheResult> {
    // Generate cache key
    const textHash = this.generateTextHash(text);
    const cacheKey = this.generateCacheKey(textHash, voiceId, languageCode);

    try {
      // Check Redis cache
      const cached = await this.redisService.get<TTSCacheMetadata>(cacheKey);

      if (cached) {
        this.logger.debug(`[TTS Cache] Hit: ${cacheKey}`);

        // Presigned URL 캐시 확인 (5분 여유 두고 만료 체크)
        const now = Date.now();
        const urlExpiryBuffer = 5 * 60 * 1000; // 5분
        if (
          cached.presignedUrl &&
          cached.presignedUrlExpiresAt &&
          cached.presignedUrlExpiresAt > now + urlExpiryBuffer
        ) {
          this.logger.debug(`[TTS Cache] Using cached presigned URL`);
          return {
            audioUrl: cached.presignedUrl,
            durationMs: cached.durationMs,
            voiceId,
            cached: true,
          };
        }

        // Presigned URL 만료/없음 - 새로 생성 후 캐시 업데이트
        const audioUrl = await this.s3StorageService.getPresignedUrl(
          cached.s3Key,
          3600, // 1 hour
        );

        // 캐시에 presigned URL 업데이트 (비동기, 결과 대기 안함)
        this.redisService
          .set(
            cacheKey,
            {
              ...cached,
              presignedUrl: audioUrl,
              presignedUrlExpiresAt: now + 3600 * 1000, // 1시간 후 만료
            },
            CACHE_TTL.TTS_AUDIO_CACHE || 24 * 60 * 60 * 1000,
          )
          .catch((err) =>
            this.logger.warn(`[TTS Cache] Failed to update presigned URL: ${err.message}`),
          );

        return {
          audioUrl,
          durationMs: cached.durationMs,
          voiceId,
          cached: true,
        };
      }

      this.logger.debug(`[TTS Cache] Miss: ${cacheKey}`);

      // Synthesize with Polly
      const synthesis = await this.pollyService.synthesizeSpeech(
        text,
        voiceId,
        languageCode,
      );

      // Upload to S3
      const s3Key = this.generateS3Key(sessionId, textHash, voiceId);
      await this.s3StorageService.uploadFile(
        s3Key,
        synthesis.audioBuffer,
        synthesis.contentType,
      );

      this.logger.log(`[TTS Cache] Uploaded to S3: ${s3Key}`);

      // Generate presigned URL first
      const audioUrl = await this.s3StorageService.getPresignedUrl(
        s3Key,
        3600, // 1 hour
      );

      const now = Date.now();

      // Cache metadata in Redis (presigned URL 포함)
      const metadata: TTSCacheMetadata = {
        s3Key,
        durationMs: synthesis.durationMs,
        createdAt: now,
        presignedUrl: audioUrl,
        presignedUrlExpiresAt: now + 3600 * 1000, // 1시간 후 만료
      };

      await this.redisService.set(
        cacheKey,
        metadata,
        CACHE_TTL.TTS_AUDIO_CACHE || 24 * 60 * 60 * 1000, // 24 hours default
      );

      return {
        audioUrl,
        durationMs: synthesis.durationMs,
        voiceId,
        cached: false,
      };
    } catch (error) {
      this.logger.error(
        `[TTS Cache] Synthesis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 실시간 TTS 합성 (S3 업로드 없이 직접 Base64 반환)
   * S3 업로드/다운로드 지연 제거로 ~300ms 단축
   */
  async synthesizeRealtime(
    text: string,
    voiceId: string,
    languageCode: string,
  ): Promise<TTSCacheResult> {
    // 캐시 키 생성
    const textHash = this.generateTextHash(text);
    const cacheKey = this.generateCacheKey(textHash, voiceId, languageCode);

    try {
      // Redis 캐시 확인 (Base64 데이터 포함)
      const cached = await this.redisService.get<TTSCacheMetadata & { audioBase64?: string }>(cacheKey);

      if (cached?.audioBase64) {
        this.logger.debug(`[TTS Realtime] Cache hit (Base64): ${cacheKey}`);
        return {
          audioData: cached.audioBase64,
          durationMs: cached.durationMs,
          voiceId,
          cached: true,
        };
      }

      this.logger.debug(`[TTS Realtime] Cache miss: ${cacheKey}`);

      // Polly로 합성
      const synthesis = await this.pollyService.synthesizeSpeech(
        text,
        voiceId,
        languageCode,
      );

      // Base64로 인코딩
      const audioBase64 = synthesis.audioBuffer.toString('base64');

      // 캐시에 Base64 데이터 저장 (다음 요청에서 재사용)
      const cacheData = {
        s3Key: '', // 실시간 TTS는 S3 사용 안함
        durationMs: synthesis.durationMs,
        createdAt: Date.now(),
        audioBase64, // Base64 데이터 캐시
      };

      // 비동기로 캐시 저장 (결과 대기 안함)
      this.redisService
        .set(cacheKey, cacheData, CACHE_TTL.TTS_AUDIO_CACHE || 24 * 60 * 60 * 1000)
        .catch((err) =>
          this.logger.warn(`[TTS Realtime] Cache save failed: ${err.message}`),
        );

      this.logger.log(
        `[TTS Realtime] Synthesized: ${synthesis.audioBuffer.length} bytes, ~${synthesis.durationMs}ms`,
      );

      return {
        audioData: audioBase64,
        durationMs: synthesis.durationMs,
        voiceId,
        cached: false,
      };
    } catch (error) {
      this.logger.error(
        `[TTS Realtime] Synthesis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete cached TTS for a session (cleanup)
   */
  async deleteCacheForSession(sessionId: string): Promise<void> {
    // Note: This is a simplified version. In production, you might want to
    // track all S3 keys for a session and delete them on session end.
    this.logger.log(`[TTS Cache] Cleanup for session: ${sessionId}`);
  }

  /**
   * Generate MD5 hash for text
   */
  private generateTextHash(text: string): string {
    return createHash('md5').update(text).digest('hex');
  }

  /**
   * Generate Redis cache key
   */
  private generateCacheKey(
    textHash: string,
    voiceId: string,
    languageCode: string,
  ): string {
    return `tts:cache:${textHash}:${voiceId}:${languageCode}`;
  }

  /**
   * Generate S3 key for TTS audio
   */
  private generateS3Key(
    sessionId: string,
    textHash: string,
    voiceId: string,
  ): string {
    return `meeting-tts/${sessionId}/${textHash}_${voiceId}.mp3`;
  }
}
