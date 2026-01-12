import { Injectable } from '@nestjs/common';

/**
 * 문장 완료 여부를 감지하는 서비스
 * 한국어, 영어, 일본어의 문장 종결 패턴을 분석합니다.
 */

export interface SentenceAnalysis {
  isComplete: boolean;
  confidence: number; // 0.0 ~ 1.0
  suggestedAction: 'translate' | 'buffer' | 'wait';
  reason?: string;
}

@Injectable()
export class SentenceDetectorService {
  // 한국어 종결어미 패턴
  private readonly KOREAN_ENDINGS = {
    formal: [
      '습니다',
      '입니다',
      '합니다',
      '됩니다',
      '있습니다',
      '없습니다',
      '였습니다',
      '었습니다',
      '겠습니다',
      '봅니다',
      '옵니다',
      '줍니다',
    ],
    informal: [
      '해요',
      '에요',
      '세요',
      '네요',
      '죠',
      '요',
      '어요',
      '아요',
      '예요',
      '래요',
      '데요',
    ],
    plain: ['다', '까', '네', '나', '지', '군', '구나', '라', '냐'],
    question: ['니까', '나요', '까요', '을까요', '을까', '는지', '건가요'],
  };

  // 한국어 연결어미 패턴 (문장 미완성 표시)
  private readonly KOREAN_CONNECTIVES = [
    '고',
    '며',
    '면서',
    '어서',
    '아서',
    '니까',
    '면',
    '려고',
    '도록',
    '는데',
    '은데',
    '지만',
    '더라도',
    '으면',
    '거나',
    '든지',
    '라서',
    '해서',
    '기에',
    '므로',
  ];

  // 한국어 조사 (문장 미완성 가능성 높음)
  private readonly KOREAN_PARTICLES = [
    '을',
    '를',
    '이',
    '가',
    '은',
    '는',
    '에',
    '의',
    '와',
    '과',
    '로',
    '으로',
    '에서',
    '까지',
    '부터',
    '만',
    '도',
    '처럼',
    '같이',
  ];

  // 일본어 종결어미
  private readonly JAPANESE_ENDINGS = [
    'です',
    'ます',
    'した',
    'ました',
    'だ',
    'である',
    'よ',
    'ね',
    'か',
    'わ',
    'の',
    'さ',
  ];

  /**
   * 문장을 분석하여 완료 여부를 판단합니다.
   */
  analyzeSentence(text: string, languageCode: string): SentenceAnalysis {
    const trimmed = text.trim();

    if (!trimmed) {
      return {
        isComplete: false,
        confidence: 0,
        suggestedAction: 'wait',
        reason: 'Empty text',
      };
    }

    // 언어별 분석
    if (languageCode.startsWith('ko')) {
      return this.analyzeKorean(trimmed);
    } else if (languageCode.startsWith('en')) {
      return this.analyzeEnglish(trimmed);
    } else if (languageCode.startsWith('ja')) {
      return this.analyzeJapanese(trimmed);
    } else if (languageCode.startsWith('zh')) {
      return this.analyzeChinese(trimmed);
    }

    // 기본 분석
    return this.analyzeGeneric(trimmed);
  }

  /**
   * 한국어 문장 분석
   */
  private analyzeKorean(text: string): SentenceAnalysis {
    // 1. 명확한 종결 부호 확인
    if (/[.?!。？！]\s*$/.test(text)) {
      return {
        isComplete: true,
        confidence: 0.95,
        suggestedAction: 'translate',
        reason: 'Punctuation ending',
      };
    }

    // 2. 정중어 종결어미 확인 (가장 신뢰도 높음)
    for (const ending of this.KOREAN_ENDINGS.formal) {
      if (text.endsWith(ending)) {
        return {
          isComplete: true,
          confidence: 0.9,
          suggestedAction: 'translate',
          reason: `Formal ending: ${ending}`,
        };
      }
    }

    // 3. 비격식 종결어미 확인
    for (const ending of this.KOREAN_ENDINGS.informal) {
      if (text.endsWith(ending)) {
        return {
          isComplete: true,
          confidence: 0.85,
          suggestedAction: 'translate',
          reason: `Informal ending: ${ending}`,
        };
      }
    }

    // 4. 평서형 종결어미 확인
    for (const ending of this.KOREAN_ENDINGS.plain) {
      if (text.endsWith(ending) && text.length > 5) {
        return {
          isComplete: true,
          confidence: 0.7,
          suggestedAction: 'translate',
          reason: `Plain ending: ${ending}`,
        };
      }
    }

    // 5. 의문형 종결어미 확인
    for (const ending of this.KOREAN_ENDINGS.question) {
      if (text.endsWith(ending)) {
        return {
          isComplete: true,
          confidence: 0.85,
          suggestedAction: 'translate',
          reason: `Question ending: ${ending}`,
        };
      }
    }

    // 6. 연결어미로 끝남 (미완성)
    for (const connective of this.KOREAN_CONNECTIVES) {
      if (text.endsWith(connective)) {
        return {
          isComplete: false,
          confidence: 0.8,
          suggestedAction: 'buffer',
          reason: `Connective ending: ${connective}`,
        };
      }
    }

    // 7. 조사로 끝남 (미완성 가능성 높음)
    for (const particle of this.KOREAN_PARTICLES) {
      if (text.endsWith(particle)) {
        return {
          isComplete: false,
          confidence: 0.75,
          suggestedAction: 'buffer',
          reason: `Particle ending: ${particle}`,
        };
      }
    }

    // 8. 짧은 텍스트
    if (text.length < 10) {
      return {
        isComplete: false,
        confidence: 0.5,
        suggestedAction: 'wait',
        reason: 'Short text',
      };
    }

    // 9. 불확실한 경우
    return {
      isComplete: false,
      confidence: 0.4,
      suggestedAction: 'wait',
      reason: 'Unknown pattern',
    };
  }

  /**
   * 영어 문장 분석
   */
  private analyzeEnglish(text: string): SentenceAnalysis {
    // 1. 명확한 종결 부호
    if (/[.?!]\s*$/.test(text)) {
      return {
        isComplete: true,
        confidence: 0.95,
        suggestedAction: 'translate',
        reason: 'Punctuation ending',
      };
    }

    // 2. 완전한 문장 구조 패턴 (주어 + 동사)
    const hasSubjectVerb =
      /\b(I|you|he|she|it|we|they|this|that|there)\s+(am|is|are|was|were|have|has|had|do|does|did|will|would|can|could|should|must|may|might)\b/i.test(
        text,
      );

    if (hasSubjectVerb && text.length > 30) {
      return {
        isComplete: true,
        confidence: 0.6,
        suggestedAction: 'translate',
        reason: 'Complete sentence structure',
      };
    }

    // 3. 미완성 구조 (전치사, 접속사로 끝남)
    if (
      /\b(and|or|but|so|because|if|when|while|that|which|who|to|for|with|in|on|at)\s*$/i.test(
        text,
      )
    ) {
      return {
        isComplete: false,
        confidence: 0.8,
        suggestedAction: 'buffer',
        reason: 'Incomplete structure',
      };
    }

    // 4. 짧은 텍스트
    if (text.length < 15) {
      return {
        isComplete: false,
        confidence: 0.5,
        suggestedAction: 'wait',
        reason: 'Short text',
      };
    }

    return {
      isComplete: false,
      confidence: 0.4,
      suggestedAction: 'wait',
      reason: 'Unknown pattern',
    };
  }

  /**
   * 일본어 문장 분석
   */
  private analyzeJapanese(text: string): SentenceAnalysis {
    // 1. 명확한 종결 부호
    if (/[。？！]\s*$/.test(text)) {
      return {
        isComplete: true,
        confidence: 0.95,
        suggestedAction: 'translate',
        reason: 'Punctuation ending',
      };
    }

    // 2. 종결어미 확인
    for (const ending of this.JAPANESE_ENDINGS) {
      if (text.endsWith(ending)) {
        return {
          isComplete: true,
          confidence: 0.85,
          suggestedAction: 'translate',
          reason: `Japanese ending: ${ending}`,
        };
      }
    }

    // 3. 조사로 끝남 (미완성)
    if (/[はがをにでとへもや]\s*$/.test(text)) {
      return {
        isComplete: false,
        confidence: 0.75,
        suggestedAction: 'buffer',
        reason: 'Particle ending',
      };
    }

    return {
      isComplete: false,
      confidence: 0.4,
      suggestedAction: 'wait',
      reason: 'Unknown pattern',
    };
  }

  /**
   * 중국어 문장 분석
   */
  private analyzeChinese(text: string): SentenceAnalysis {
    // 종결 부호 확인
    if (/[。？！]\s*$/.test(text)) {
      return {
        isComplete: true,
        confidence: 0.95,
        suggestedAction: 'translate',
        reason: 'Punctuation ending',
      };
    }

    // 문장 종결 표현
    if (/[了吗呢吧啊呀哦哇嘛]\s*$/.test(text)) {
      return {
        isComplete: true,
        confidence: 0.8,
        suggestedAction: 'translate',
        reason: 'Sentence-final particle',
      };
    }

    return {
      isComplete: false,
      confidence: 0.4,
      suggestedAction: 'wait',
      reason: 'Unknown pattern',
    };
  }

  /**
   * 기본 문장 분석
   */
  private analyzeGeneric(text: string): SentenceAnalysis {
    if (/[.?!。？！]\s*$/.test(text)) {
      return {
        isComplete: true,
        confidence: 0.9,
        suggestedAction: 'translate',
        reason: 'Punctuation ending',
      };
    }

    return {
      isComplete: false,
      confidence: 0.3,
      suggestedAction: 'wait',
      reason: 'No clear ending pattern',
    };
  }

  /**
   * 두 텍스트를 자연스럽게 결합합니다.
   */
  combineTexts(
    previous: string,
    current: string,
    languageCode: string,
  ): string {
    if (!previous) return current;
    if (!current) return previous;

    const prevTrimmed = previous.trim();
    const currTrimmed = current.trim();

    // 한국어/일본어/중국어는 공백 없이 결합할 수 있음
    if (
      languageCode.startsWith('ko') ||
      languageCode.startsWith('ja') ||
      languageCode.startsWith('zh')
    ) {
      // 이미 공백이 있으면 그대로, 없으면 공백 추가
      if (prevTrimmed.endsWith(' ') || currTrimmed.startsWith(' ')) {
        return prevTrimmed + currTrimmed;
      }
      return prevTrimmed + ' ' + currTrimmed;
    }

    // 영어 등은 공백으로 결합
    return prevTrimmed + ' ' + currTrimmed;
  }
}
