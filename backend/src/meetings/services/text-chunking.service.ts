import { Injectable, Logger } from '@nestjs/common';

/**
 * 긴 텍스트를 문장 단위로 분할하는 서비스
 * AWS Transcribe가 긴 발화를 분할하지 않을 때 백엔드에서 강제 분할합니다.
 */

export interface TextChunk {
  text: string;
  index: number;
  isLast: boolean;
}

// 청킹 설정
const CHUNKING_CONFIG = {
  // 이 글자 수를 초과하면 청킹 시작
  MAX_CHUNK_LENGTH: 80,
  // 최소 청크 길이 (너무 짧은 청크 방지)
  MIN_CHUNK_LENGTH: 20,
  // 이 글자 수 이하면 청킹하지 않음
  NO_CHUNK_THRESHOLD: 50,
} as const;

@Injectable()
export class TextChunkingService {
  private readonly logger = new Logger(TextChunkingService.name);

  // 문장 종결 패턴 (우선순위 순)
  private readonly SENTENCE_ENDINGS = {
    // 명확한 구두점
    punctuation: /[.?!。？！]\s*/g,
    // 한국어 종결어미
    korean:
      /(습니다|입니다|합니다|됩니다|있습니다|없습니다|했습니다|였습니다|겠습니다|해요|에요|세요|네요|죠|어요|아요|예요|래요|데요|다고|라고|냐고|자고)\s*/g,
    // 쉼표나 접속사 (차선책)
    comma: /[,，、]\s*/g,
  };

  /**
   * 텍스트를 청킹이 필요한지 확인합니다.
   */
  needsChunking(text: string): boolean {
    return text.length > CHUNKING_CONFIG.NO_CHUNK_THRESHOLD;
  }

  /**
   * 긴 텍스트를 문장 단위로 분할합니다.
   */
  chunkText(text: string, languageCode: string): TextChunk[] {
    const trimmed = text.trim();

    // 청킹이 필요 없으면 그대로 반환
    if (!this.needsChunking(trimmed)) {
      return [{ text: trimmed, index: 0, isLast: true }];
    }

    this.logger.debug(
      `[Chunking] Input text (${trimmed.length} chars): "${trimmed.substring(0, 50)}..."`,
    );

    // 문장 단위로 분할 시도
    let chunks = this.splitBySentences(trimmed, languageCode);

    // 청크가 하나만 있고 여전히 길면 강제 분할
    if (
      chunks.length === 1 &&
      chunks[0].length > CHUNKING_CONFIG.MAX_CHUNK_LENGTH
    ) {
      chunks = this.forceSplit(trimmed, languageCode);
    }

    // 너무 짧은 청크는 이전 청크와 병합
    chunks = this.mergeShortChunks(chunks);

    const result = chunks.map((chunk, index) => ({
      text: chunk.trim(),
      index,
      isLast: index === chunks.length - 1,
    }));

    this.logger.log(
      `[Chunking] Split into ${result.length} chunks: ${result.map((c) => `"${c.text.substring(0, 20)}..."`).join(', ')}`,
    );

    return result;
  }

  /**
   * 문장 종결 패턴으로 분할합니다.
   */
  private splitBySentences(text: string, languageCode: string): string[] {
    // 1. 구두점으로 분할 시도
    let parts = this.splitByPattern(text, this.SENTENCE_ENDINGS.punctuation);
    if (parts.length > 1) {
      return parts;
    }

    // 2. 한국어면 종결어미로 분할 시도
    if (languageCode.startsWith('ko')) {
      parts = this.splitByKoreanEndings(text);
      if (parts.length > 1) {
        return parts;
      }
    }

    // 3. 쉼표로 분할 시도
    parts = this.splitByPattern(text, this.SENTENCE_ENDINGS.comma);
    if (parts.length > 1) {
      return parts;
    }

    // 분할 실패 - 원본 반환
    return [text];
  }

  /**
   * 정규식 패턴으로 분할합니다.
   */
  private splitByPattern(text: string, pattern: RegExp): string[] {
    const parts: string[] = [];
    let lastIndex = 0;

    // 패턴 복제 (global flag 보장)
    const regex = new RegExp(pattern.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const endIndex = match.index + match[0].length;
      const part = text.substring(lastIndex, endIndex).trim();

      if (part) {
        parts.push(part);
      }
      lastIndex = endIndex;
    }

    // 마지막 부분 추가
    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex).trim();
      if (remaining) {
        parts.push(remaining);
      }
    }

    return parts.length > 0 ? parts : [text];
  }

  /**
   * 한국어 종결어미로 분할합니다.
   */
  private splitByKoreanEndings(text: string): string[] {
    const endings = [
      '습니다',
      '입니다',
      '합니다',
      '됩니다',
      '있습니다',
      '없습니다',
      '했습니다',
      '였습니다',
      '겠습니다',
      '봅니다',
      '옵니다',
      '해요',
      '에요',
      '세요',
      '네요',
      '죠',
      '어요',
      '아요',
      '예요',
      '래요',
      '데요',
      '다고',
      '라고',
      '냐고',
      '자고',
    ];

    const parts: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      let foundIndex = -1;
      let foundEnding = '';

      // 가장 먼저 나오는 종결어미 찾기
      for (const ending of endings) {
        const index = remaining.indexOf(ending);
        if (index !== -1 && (foundIndex === -1 || index < foundIndex)) {
          foundIndex = index;
          foundEnding = ending;
        }
      }

      if (foundIndex !== -1) {
        const endIndex = foundIndex + foundEnding.length;
        const part = remaining.substring(0, endIndex).trim();

        // 공백이나 구두점 포함
        let actualEndIndex = endIndex;
        while (
          actualEndIndex < remaining.length &&
          /[\s.?!。？！]/.test(remaining[actualEndIndex])
        ) {
          actualEndIndex++;
        }

        if (part) {
          parts.push(part);
        }
        remaining = remaining.substring(actualEndIndex).trim();
      } else {
        // 더 이상 종결어미 없음
        if (remaining.trim()) {
          parts.push(remaining.trim());
        }
        break;
      }
    }

    return parts.length > 0 ? parts : [text];
  }

  /**
   * 분할이 안 되면 강제로 분할합니다.
   */
  private forceSplit(text: string, languageCode: string): string[] {
    const chunks: string[] = [];
    const maxLength = CHUNKING_CONFIG.MAX_CHUNK_LENGTH;

    // 공백 위치 찾기
    const spaceIndices: number[] = [];
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) {
        spaceIndices.push(i);
      }
    }

    let startIndex = 0;

    while (startIndex < text.length) {
      if (text.length - startIndex <= maxLength) {
        // 남은 텍스트가 maxLength 이하면 그대로 추가
        chunks.push(text.substring(startIndex).trim());
        break;
      }

      // maxLength 이내에서 가장 가까운 공백 찾기
      let splitIndex = startIndex + maxLength;

      const nearestSpace = spaceIndices
        .filter((i) => i > startIndex && i <= startIndex + maxLength)
        .pop();

      if (nearestSpace) {
        splitIndex = nearestSpace;
      }

      const chunk = text.substring(startIndex, splitIndex).trim();
      if (chunk) {
        chunks.push(chunk);
      }

      startIndex = splitIndex;
      // 공백 건너뛰기
      while (startIndex < text.length && /\s/.test(text[startIndex])) {
        startIndex++;
      }
    }

    return chunks;
  }

  /**
   * 너무 짧은 청크를 이전 청크와 병합합니다.
   */
  private mergeShortChunks(chunks: string[]): string[] {
    if (chunks.length <= 1) {
      return chunks;
    }

    const merged: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (
        chunk.length < CHUNKING_CONFIG.MIN_CHUNK_LENGTH &&
        merged.length > 0
      ) {
        // 이전 청크와 병합
        merged[merged.length - 1] += ' ' + chunk;
      } else if (
        chunk.length < CHUNKING_CONFIG.MIN_CHUNK_LENGTH &&
        i < chunks.length - 1
      ) {
        // 다음 청크와 병합
        chunks[i + 1] = chunk + ' ' + chunks[i + 1];
      } else {
        merged.push(chunk);
      }
    }

    return merged;
  }
}
