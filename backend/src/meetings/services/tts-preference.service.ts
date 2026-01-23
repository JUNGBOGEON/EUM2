import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../redis/redis.service';
import { CACHE_TTL } from '../../common/constants';
import { PollyService } from './polly.service';

/**
 * TTS Preference stored in Redis
 */
export interface TTSPreference {
  enabled: boolean;
  voices: Record<string, string>; // languageCode -> voiceId
  volume: number;
  updatedAt: number;
}

/**
 * TTSPreferenceService
 * Manages user TTS preferences per session
 */
@Injectable()
export class TTSPreferenceService {
  private readonly logger = new Logger(TTSPreferenceService.name);

  constructor(
    private redisService: RedisService,
    private pollyService: PollyService,
  ) {}

  /**
   * Get TTS enabled status for a user
   */
  async isTTSEnabled(sessionId: string, userId: string): Promise<boolean> {
    const pref = await this.getPreference(sessionId, userId);
    return pref?.enabled ?? false;
  }

  /**
   * Set TTS enabled status for a user
   */
  async setTTSEnabled(
    sessionId: string,
    userId: string,
    enabled: boolean,
  ): Promise<void> {
    const pref = await this.getPreference(sessionId, userId);
    const updated: TTSPreference = {
      ...this.getDefaultPreference(),
      ...pref,
      enabled,
      updatedAt: Date.now(),
    };

    await this.setPreference(sessionId, userId, updated);

    this.logger.log(
      `[TTS Preference] User ${userId} TTS ${enabled ? 'enabled' : 'disabled'} in session ${sessionId}`,
    );
  }

  /**
   * Get voice preference for a language
   */
  async getVoicePreference(
    sessionId: string,
    userId: string,
    languageCode: string,
  ): Promise<string> {
    const pref = await this.getPreference(sessionId, userId);
    const voiceId = pref?.voices?.[languageCode];

    if (voiceId && this.pollyService.isValidVoice(voiceId, languageCode)) {
      return voiceId;
    }

    // Return default voice for language
    return this.pollyService.getDefaultVoice(languageCode);
  }

  /**
   * Set voice preference for a language
   * @returns object with success status and saved voiceId (or null if failed)
   */
  async setVoicePreference(
    sessionId: string,
    userId: string,
    languageCode: string,
    voiceId: string,
  ): Promise<{ saved: boolean; voiceId: string | null }> {
    // Validate voice
    if (!this.pollyService.isValidVoice(voiceId, languageCode)) {
      this.logger.warn(
        `[TTS Preference] Invalid voice "${voiceId}" for ${languageCode}, available voices: ${JSON.stringify(this.pollyService.getAvailableVoices(languageCode).map(v => v.id))}`,
      );
      return { saved: false, voiceId: null };
    }

    const pref = await this.getPreference(sessionId, userId);
    const voices = { ...(pref?.voices ?? {}), [languageCode]: voiceId };

    const updated: TTSPreference = {
      ...this.getDefaultPreference(),
      ...pref,
      voices,
      updatedAt: Date.now(),
    };

    await this.setPreference(sessionId, userId, updated);

    this.logger.log(
      `[TTS Preference] User ${userId} set voice for ${languageCode}: ${voiceId}`,
    );
    return { saved: true, voiceId };
  }

  /**
   * Get volume preference
   */
  async getVolume(sessionId: string, userId: string): Promise<number> {
    const pref = await this.getPreference(sessionId, userId);
    return pref?.volume ?? 80;
  }

  /**
   * Set volume preference
   */
  async setVolume(
    sessionId: string,
    userId: string,
    volume: number,
  ): Promise<void> {
    const clampedVolume = Math.max(0, Math.min(100, volume));

    const pref = await this.getPreference(sessionId, userId);
    const updated: TTSPreference = {
      ...this.getDefaultPreference(),
      ...pref,
      volume: clampedVolume,
      updatedAt: Date.now(),
    };

    await this.setPreference(sessionId, userId, updated);
  }

  /**
   * Get full TTS preferences
   */
  async getFullPreferences(
    sessionId: string,
    userId: string,
  ): Promise<TTSPreference> {
    const pref = await this.getPreference(sessionId, userId);
    return pref ?? this.getDefaultPreference();
  }

  /**
   * Get all users with TTS enabled in a session
   */
  async getTTSEnabledUsers(
    sessionId: string,
    userIds: string[],
  ): Promise<string[]> {
    // Use Promise.all with filter pattern to avoid race condition
    const results = await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        enabled: await this.isTTSEnabled(sessionId, userId),
      })),
    );

    return results.filter((r) => r.enabled).map((r) => r.userId);
  }

  /**
   * Delete preferences for a session (cleanup)
   */
  async deleteSessionPreferences(sessionId: string): Promise<void> {
    // Note: In production, you might want to scan and delete all keys
    // matching the pattern tts:preference:${sessionId}:*
    this.logger.log(`[TTS Preference] Cleanup for session: ${sessionId}`);
  }

  // ==========================================
  // Private Methods
  // ==========================================

  private generateCacheKey(sessionId: string, userId: string): string {
    return `tts:preference:${sessionId}:${userId}`;
  }

  private async getPreference(
    sessionId: string,
    userId: string,
  ): Promise<TTSPreference | null> {
    const key = this.generateCacheKey(sessionId, userId);
    return this.redisService.get<TTSPreference>(key);
  }

  private async setPreference(
    sessionId: string,
    userId: string,
    pref: TTSPreference,
  ): Promise<void> {
    const key = this.generateCacheKey(sessionId, userId);
    await this.redisService.set(
      key,
      pref,
      CACHE_TTL.TTS_PREFERENCE || 2 * 60 * 60 * 1000, // 2 hours default
    );
  }

  private getDefaultPreference(): TTSPreference {
    return {
      enabled: false,
      voices: {},
      volume: 80,
      updatedAt: Date.now(),
    };
  }
}
