import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate';
import { createHash } from 'crypto';

import { RedisService } from '../../redis/redis.service';
import { CACHE_TTL } from '../../common/constants';

/**
 * Translation Cache Service
 * Handles AWS Translate API calls with Redis caching
 */
@Injectable()
export class TranslationCacheService {
  private readonly logger = new Logger(TranslationCacheService.name);
  private translateClient: TranslateClient;

  // 언어 코드 매핑 (Chime/Transcribe → AWS Translate)
  private readonly LANGUAGE_MAP: Record<string, string> = {
    'ko-KR': 'ko',
    'en-US': 'en',
    'zh-CN': 'zh',
    'ja-JP': 'ja',
  };

  // AWS Translate → 원본 언어 코드 역매핑
  private readonly REVERSE_LANGUAGE_MAP: Record<string, string> = {
    ko: 'ko-KR',
    en: 'en-US',
    zh: 'zh-CN',
    ja: 'ja-JP',
  };

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    const region = this.configService.get('AWS_REGION') || 'ap-northeast-2';
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not configured for Translate');
    }

    this.translateClient = new TranslateClient({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  /**
   * 언어 코드 변환 (Chime/Transcribe → AWS Translate)
   */
  getTranslateLanguageCode(languageCode: string): string {
    return this.LANGUAGE_MAP[languageCode] || languageCode;
  }

  /**
   * 언어 코드 역변환 (AWS Translate → Chime/Transcribe)
   */
  getOriginalLanguageCode(translateCode: string): string {
    return this.REVERSE_LANGUAGE_MAP[translateCode] || translateCode;
  }

  /**
   * 텍스트 번역 (캐싱 적용)
   */
  async translateWithCache(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    // 캐시 키 생성: 전체 MD5 해시 + 소스언어 + 타겟 언어
    const textHash = createHash('md5').update(text).digest('hex');
    const sourceLangCode = this.getTranslateLanguageCode(sourceLang);
    const targetLangCode = this.getTranslateLanguageCode(targetLang);
    const cacheKey = `translation:cache:${textHash}:${sourceLangCode}:${targetLangCode}`;

    // 캐시 확인
    const cached = await this.redisService.get<string>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for translation: ${cacheKey}`);
      return cached;
    }

    // AWS Translate 호출
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLangCode,
      TargetLanguageCode: targetLangCode,
    });

    const response = await this.translateClient.send(command);
    const translatedText = response.TranslatedText || text;

    // 캐시 저장 (1시간 TTL)
    await this.redisService.set(
      cacheKey,
      translatedText,
      CACHE_TTL.TRANSLATION_RESULT,
    );

    this.logger.debug(
      `Translated: "${text.substring(0, 30)}..." → "${translatedText.substring(0, 30)}..." (${sourceLang} → ${targetLang})`,
    );

    return translatedText;
  }

  /**
   * 번역 수행 (캐싱 없이 직접 호출)
   */
  async translateDirect(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    const sourceLangCode = this.getTranslateLanguageCode(sourceLang);
    const targetLangCode = this.getTranslateLanguageCode(targetLang);

    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLangCode,
      TargetLanguageCode: targetLangCode,
    });

    const response = await this.translateClient.send(command);
    return response.TranslatedText || text;
  }
}
