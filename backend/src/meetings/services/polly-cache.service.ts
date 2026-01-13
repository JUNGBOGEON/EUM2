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
}

/**
 * TTS Synthesis Result with URL
 */
export interface TTSCacheResult {
  audioUrl: string;
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

        // Generate presigned URL for cached S3 object
        const audioUrl = await this.s3StorageService.getPresignedUrl(
          cached.s3Key,
          3600, // 1 hour
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

      // Cache metadata in Redis
      const metadata: TTSCacheMetadata = {
        s3Key,
        durationMs: synthesis.durationMs,
        createdAt: Date.now(),
      };

      await this.redisService.set(
        cacheKey,
        metadata,
        CACHE_TTL.TTS_AUDIO_CACHE || 24 * 60 * 60 * 1000, // 24 hours default
      );

      // Generate presigned URL
      const audioUrl = await this.s3StorageService.getPresignedUrl(
        s3Key,
        3600, // 1 hour
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
