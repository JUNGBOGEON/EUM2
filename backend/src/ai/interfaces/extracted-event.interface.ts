/**
 * 회의 녹취록에서 추출된 시간 표현 인터페이스
 */
export interface ExtractedTimeExpression {
  /** 원본 시간 표현 (예: "다음 주 월요일 오후 2시") */
  originalText: string;
  /** ISO 8601 정규화된 시작 시간 (예: "2026-01-19T14:00:00+09:00") */
  normalizedDateTime: string;
  /** ISO 8601 정규화된 종료 시간 (선택적) */
  endDateTime?: string;
  /** 종일 이벤트 여부 */
  isAllDay: boolean;
  /** 신뢰도 점수 (0.0 ~ 1.0) */
  confidence: number;
}

/**
 * AI가 추출한 캘린더 이벤트 인터페이스
 */
export interface ExtractedCalendarEvent {
  /** 이벤트 제목 */
  title: string;
  /** 이벤트 설명 (관련 발화 컨텍스트) */
  description: string;
  /** 추출된 시간 표현 */
  timeExpression: ExtractedTimeExpression;
  /** 이벤트 유형 */
  eventType: 'meeting' | 'deadline' | 'reminder' | 'task';
  /** 담당자 이름 (있는 경우) */
  assignee?: string;
  /** 근거가 된 발화 ID들 */
  transcriptRefIds: string[];
  /** 발화자 이름 */
  speakerName: string;
}

/**
 * 애매한 시간 표현 정보
 */
export interface AmbiguousExpression {
  /** 원본 텍스트 */
  text: string;
  /** 애매한 이유 */
  reason: string;
  /** 제안된 해석 (선택적) */
  suggestedInterpretation?: string;
}

/**
 * 이벤트 추출 결과 인터페이스
 */
export interface EventExtractionResult {
  /** 세션 ID */
  sessionId: string;
  /** 추출 시각 */
  extractedAt: string;
  /** 추출된 이벤트 목록 */
  events: ExtractedCalendarEvent[];
  /** 애매한 표현 목록 (confidence가 낮아 제외된 것들) */
  ambiguousExpressions: AmbiguousExpression[];
}

/**
 * AI 응답 파싱 결과
 */
export interface AIEventExtractionResponse {
  events: ExtractedCalendarEvent[];
  ambiguousExpressions: AmbiguousExpression[];
}

/**
 * 이벤트 생성 결과
 */
export interface EventCreationResult {
  /** 자동 생성된 이벤트 수 */
  created: number;
  /** 확인이 필요한 미확정 이벤트 수 */
  pending: number;
  /** 생성된 이벤트 ID 목록 */
  createdEventIds: string[];
}
