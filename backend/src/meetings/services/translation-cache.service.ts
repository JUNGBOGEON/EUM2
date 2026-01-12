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

  /**
   * 문맥을 고려한 번역 수행
   * 이전 문맥과 함께 번역하여 더 자연스러운 결과를 생성합니다.
   */
  async translateWithContext(
    text: string,
    sourceLang: string,
    targetLang: string,
    previousText?: string,
    previousTranslation?: string,
  ): Promise<{ translatedText: string; fullTranslation: string }> {
    // 이전 문맥이 없으면 일반 번역
    if (!previousText) {
      const translatedText = await this.translateWithCache(
        text,
        sourceLang,
        targetLang,
      );
      return { translatedText, fullTranslation: translatedText };
    }

    // 문맥 + 새 텍스트 결합
    const fullText = this.combineTexts(previousText, text, sourceLang);

    this.logger.debug(
      `[Context Translation] Full text: "${fullText.substring(0, 50)}..."`,
    );

    // 전체 텍스트 번역 (캐싱 없이 - 문맥마다 다르므로)
    const fullTranslation = await this.translateDirect(
      fullText,
      sourceLang,
      targetLang,
    );

    // 새로운 부분만 추출
    let newTranslation = fullTranslation;

    if (previousTranslation) {
      // 이전 번역과 비교하여 새 부분 추출
      newTranslation = this.extractNewPortion(
        fullTranslation,
        previousTranslation,
        targetLang,
      );
    }

    this.logger.debug(
      `[Context Translation] New portion: "${newTranslation.substring(0, 50)}..."`,
    );

    return {
      translatedText: newTranslation,
      fullTranslation,
    };
  }

  /**
   * 두 텍스트를 자연스럽게 결합합니다.
   */
  private combineTexts(
    previous: string,
    current: string,
    languageCode: string,
  ): string {
    if (!previous) return current;
    if (!current) return previous;

    const prevTrimmed = previous.trim();
    const currTrimmed = current.trim();

    // 한국어/일본어/중국어는 공백으로 결합
    // (AWS Translate가 알아서 처리하므로 공백 추가)
    return prevTrimmed + ' ' + currTrimmed;
  }

  /**
   * 전체 번역에서 새로운 부분만 추출합니다.
   */
  private extractNewPortion(
    fullTranslation: string,
    previousTranslation: string,
    targetLang: string,
  ): string {
    const full = fullTranslation.trim();
    const prev = previousTranslation.trim();

    // 정확히 시작 부분이 일치하는 경우
    if (full.toLowerCase().startsWith(prev.toLowerCase())) {
      const newPortion = full.substring(prev.length).trim();
      return newPortion || full; // 빈 문자열이면 전체 반환
    }

    // 단어 단위로 비교
    const fullWords = full.split(/\s+/);
    const prevWords = prev.split(/\s+/);

    // 이전 번역의 마지막 몇 단어와 매칭되는 지점 찾기
    const matchLength = Math.min(prevWords.length, 5); // 최대 5단어까지 비교
    const prevSuffix = prevWords.slice(-matchLength).join(' ').toLowerCase();

    for (let i = 0; i < fullWords.length - matchLength + 1; i++) {
      const segment = fullWords
        .slice(i, i + matchLength)
        .join(' ')
        .toLowerCase();
      if (segment === prevSuffix) {
        // 매칭된 지점 이후의 단어들 반환
        const newWords = fullWords.slice(i + matchLength);
        if (newWords.length > 0) {
          return newWords.join(' ');
        }
      }
    }

    // 매칭 실패 시 전체 번역 반환
    this.logger.debug(
      `[Context Translation] Could not extract new portion, returning full translation`,
    );
    return full;
  }
}
