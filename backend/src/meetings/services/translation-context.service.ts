import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * 발화자별 번역 문맥을 관리하는 서비스
 * 연속된 발화의 문맥을 추적하여 번역 품질을 향상시킵니다.
 */

export interface TranslationChunk {
  text: string;
  translation?: string;
  timestamp: number;
}

export interface SpeakerContext {
  recentChunks: TranslationChunk[];
  lastUpdate: number;
}

// 문맥 관련 상수
const CONTEXT_CONFIG = {
  TTL: 30000, // 30초 - 문맥 유지 시간
  MAX_CHUNKS: 3, // 최근 3개 청크까지 유지
  CONTINUOUS_THRESHOLD: 5000, // 5초 이내면 연속 발화로 간주
  MAX_CONTEXT_CHARS: 150, // 문맥으로 사용할 최대 문자 수
} as const;

@Injectable()
export class TranslationContextService {
  private readonly logger = new Logger(TranslationContextService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * 발화자의 현재 문맥을 조회합니다.
   */
  async getContext(
    sessionId: string,
    speakerId: string,
  ): Promise<SpeakerContext | null> {
    const key = this.buildContextKey(sessionId, speakerId);
    try {
      const context = await this.redisService.get<SpeakerContext>(key);
      return context;
    } catch (error) {
      this.logger.warn(`Failed to get context: ${error.message}`);
      return null;
    }
  }

  /**
   * 발화자의 문맥을 업데이트합니다.
   */
  async updateContext(
    sessionId: string,
    speakerId: string,
    text: string,
    translation?: string,
  ): Promise<void> {
    const key = this.buildContextKey(sessionId, speakerId);

    try {
      let context = await this.getContext(sessionId, speakerId);

      if (!context) {
        context = {
          recentChunks: [],
          lastUpdate: Date.now(),
        };
      }

      // 새 청크 추가
      context.recentChunks.push({
        text,
        translation,
        timestamp: Date.now(),
      });

      // 최근 N개만 유지
      if (context.recentChunks.length > CONTEXT_CONFIG.MAX_CHUNKS) {
        context.recentChunks = context.recentChunks.slice(
          -CONTEXT_CONFIG.MAX_CHUNKS,
        );
      }

      context.lastUpdate = Date.now();

      await this.redisService.set(key, context, CONTEXT_CONFIG.TTL);

      this.logger.debug(
        `[Context] Updated for ${speakerId}: ${context.recentChunks.length} chunks`,
      );
    } catch (error) {
      this.logger.warn(`Failed to update context: ${error.message}`);
    }
  }

  /**
   * 발화자의 문맥을 초기화합니다.
   */
  async clearContext(sessionId: string, speakerId: string): Promise<void> {
    const key = this.buildContextKey(sessionId, speakerId);
    try {
      await this.redisService.del(key);
      this.logger.debug(`[Context] Cleared for ${speakerId}`);
    } catch (error) {
      this.logger.warn(`Failed to clear context: ${error.message}`);
    }
  }

  /**
   * 문맥에서 최근 텍스트를 추출합니다.
   * @param maxChars 최대 문자 수
   */
  getRecentText(
    context: SpeakerContext | null,
    maxChars: number = CONTEXT_CONFIG.MAX_CONTEXT_CHARS,
  ): string {
    if (!context || context.recentChunks.length === 0) {
      return '';
    }

    let combined = '';
    // 최근 청크부터 역순으로 추가
    for (let i = context.recentChunks.length - 1; i >= 0; i--) {
      const chunk = context.recentChunks[i].text;
      const newCombined = chunk + (combined ? ' ' + combined : '');

      if (newCombined.length > maxChars) {
        break;
      }
      combined = newCombined;
    }

    return combined.trim();
  }

  /**
   * 문맥에서 최근 번역 텍스트를 추출합니다.
   */
  getRecentTranslation(
    context: SpeakerContext | null,
    maxChars: number = CONTEXT_CONFIG.MAX_CONTEXT_CHARS,
  ): string {
    if (!context || context.recentChunks.length === 0) {
      return '';
    }

    let combined = '';
    for (let i = context.recentChunks.length - 1; i >= 0; i--) {
      const translation = context.recentChunks[i].translation;
      if (!translation) continue;

      const newCombined = translation + (combined ? ' ' + combined : '');
      if (newCombined.length > maxChars) {
        break;
      }
      combined = newCombined;
    }

    return combined.trim();
  }

  /**
   * 연속된 발화인지 확인합니다.
   * (마지막 업데이트가 CONTINUOUS_THRESHOLD 이내인 경우)
   */
  isContinuousSpeech(context: SpeakerContext | null): boolean {
    if (!context) return false;
    return (
      Date.now() - context.lastUpdate < CONTEXT_CONFIG.CONTINUOUS_THRESHOLD
    );
  }

  /**
   * 문맥이 유효한지 확인합니다.
   */
  isContextValid(context: SpeakerContext | null): boolean {
    if (!context) return false;
    if (context.recentChunks.length === 0) return false;

    // TTL 이내인지 확인
    const oldestChunk = context.recentChunks[0];
    return Date.now() - oldestChunk.timestamp < CONTEXT_CONFIG.TTL;
  }

  private buildContextKey(sessionId: string, speakerId: string): string {
    return `translation:context:${sessionId}:${speakerId}`;
  }
}
