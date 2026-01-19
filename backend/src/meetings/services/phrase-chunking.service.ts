import { Injectable, Logger } from '@nestjs/common';

/**
 * 구문 분할 결과
 */
export interface PhraseChunk {
  text: string;
  index: number;
  isLast: boolean;
}

/**
 * 한국어-일본어 구문 단위 분할 서비스
 *
 * 한국어와 일본어는 어순(SOV)이 동일하여 조사 기준으로
 * 구문 단위 분할 후 즉시 번역이 가능합니다.
 */
@Injectable()
export class PhraseChunkingService {
  private readonly logger = new Logger(PhraseChunkingService.name);

  // 한국어 구문 경계 패턴 (조사 + 연결어미)
  // 긴 패턴이 먼저 매칭되도록 길이 내림차순 정렬
  private readonly KOREAN_BOUNDARIES = [
    // 연결어미 (절 경계, 우선 순위 높음)
    '면서',
    '어서',
    '아서',
    '니까',
    '는데',
    '지만',
    '더라도',
    '으면',
    '거나',
    '든지',
    '라서',
    '해서',
    // 복합 조사
    '에서',
    '에게',
    '으로',
    '까지',
    '부터',
    '처럼',
    '같이',
    // 단일 조사/어미
    '을',
    '를',
    '이',
    '가',
    '은',
    '는',
    '에',
    '로',
    '와',
    '과',
    '의',
    '만',
    '도',
    '고',
    '며',
    '면',
  ].sort((a, b) => b.length - a.length); // 길이 내림차순

  // 일본어 구문 경계 패턴
  private readonly JAPANESE_BOUNDARIES = [
    // 복합 조사
    'から',
    'まで',
    'ながら',
    'けど',
    'けれど',
    // 단일 조사
    'は',
    'が',
    'を',
    'に',
    'で',
    'と',
    'へ',
    'の',
    'も',
    'て',
  ].sort((a, b) => b.length - a.length);

  // 최소 구문 길이 (너무 짧은 구문 방지)
  private readonly MIN_PHRASE_LENGTH = 4;

  /**
   * 언어 쌍이 한국어-일본어인지 확인
   */
  isKoJaLanguagePair(sourceLanguage: string, targetLanguage: string): boolean {
    const koPattern = /^ko/i;
    const jaPattern = /^ja/i;

    return (
      (koPattern.test(sourceLanguage) && jaPattern.test(targetLanguage)) ||
      (jaPattern.test(sourceLanguage) && koPattern.test(targetLanguage))
    );
  }

  /**
   * 텍스트를 구문 단위로 분할
   */
  chunkByPhrases(text: string, languageCode: string): PhraseChunk[] {
    const trimmed = text.trim();
    if (!trimmed) {
      return [];
    }

    const boundaries = languageCode.startsWith('ko')
      ? this.KOREAN_BOUNDARIES
      : languageCode.startsWith('ja')
        ? this.JAPANESE_BOUNDARIES
        : [];

    if (boundaries.length === 0) {
      // 지원하지 않는 언어는 전체 텍스트를 단일 청크로 반환
      return [{ text: trimmed, index: 0, isLast: true }];
    }

    const phrases = this.splitByBoundaries(trimmed, boundaries);

    this.logger.debug(
      `[PhraseChunking] Split "${trimmed.substring(0, 30)}..." into ${phrases.length} phrases`,
    );

    return phrases.map((phrase, idx) => ({
      text: phrase,
      index: idx,
      isLast: idx === phrases.length - 1,
    }));
  }

  /**
   * 경계 패턴을 기준으로 텍스트 분할
   */
  private splitByBoundaries(text: string, boundaries: string[]): string[] {
    const phrases: string[] = [];
    let currentPhrase = '';
    let i = 0;

    while (i < text.length) {
      currentPhrase += text[i];

      // 현재 위치에서 가장 긴 매칭 경계 찾기
      let matchedBoundary = '';
      for (const boundary of boundaries) {
        if (currentPhrase.endsWith(boundary)) {
          matchedBoundary = boundary;
          break; // 이미 길이순 정렬되어 있으므로 첫 매칭이 가장 긴 것
        }
      }

      // 경계 패턴 발견 + 최소 길이 충족
      if (
        matchedBoundary &&
        currentPhrase.length >= this.MIN_PHRASE_LENGTH + matchedBoundary.length
      ) {
        phrases.push(currentPhrase.trim());
        currentPhrase = '';
      }

      i++;
    }

    // 남은 텍스트 처리
    const remaining = currentPhrase.trim();
    if (remaining) {
      if (phrases.length > 0 && remaining.length < this.MIN_PHRASE_LENGTH * 2) {
        // 너무 짧으면 이전 구문과 병합
        phrases[phrases.length - 1] += ' ' + remaining;
      } else {
        phrases.push(remaining);
      }
    }

    // 구문이 하나도 없으면 원본 반환
    if (phrases.length === 0) {
      return [text];
    }

    return phrases;
  }

  /**
   * 구문 분할이 필요한지 확인
   * (텍스트가 충분히 길고, 여러 구문으로 분할 가능한 경우)
   */
  shouldChunkByPhrases(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): boolean {
    // KO-JA 쌍이 아니면 false
    if (!this.isKoJaLanguagePair(sourceLanguage, targetLanguage)) {
      return false;
    }

    // 텍스트가 너무 짧으면 분할 불필요
    if (text.length < this.MIN_PHRASE_LENGTH * 3) {
      return false;
    }

    // 실제로 분할해서 2개 이상 구문이 나오는지 확인
    const chunks = this.chunkByPhrases(text, sourceLanguage);
    return chunks.length >= 2;
  }
}
