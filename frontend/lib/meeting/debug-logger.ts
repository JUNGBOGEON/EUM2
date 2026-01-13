/**
 * 프로덕션 안전 디버깅 로거
 *
 * 민감한 정보를 노출하지 않으면서 오류 진단에 필요한 정보를 기록합니다.
 * - 사용자 ID, 토큰 등 민감 정보는 마스킹
 * - 에러 상황만 콘솔에 기록 (개발 모드에서는 모든 로그)
 * - 중요한 이벤트는 항상 기록
 */

const isDev = process.env.NODE_ENV === 'development';

// 민감 정보 마스킹 유틸리티
function maskSensitive(value: string | null | undefined, showChars = 4): string {
  if (!value) return '[empty]';
  if (value.length <= showChars * 2) return '****';
  return `${value.substring(0, showChars)}...${value.substring(value.length - showChars)}`;
}

// 객체에서 민감 정보 마스킹
function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'credential'];
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

    if (isSensitive && typeof value === 'string') {
      result[key] = maskSensitive(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export interface TranscriptDebugInfo {
  event: 'local_created' | 'remote_received' | 'filtered_own' | 'speaker_mismatch' | 'session_joined' | 'session_left' | 'reconnected';
  resultId?: string;
  speakerId?: string;
  speakerName?: string;
  isPartial?: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * 트랜스크립트 디버깅 로거
 */
export const transcriptDebugLog = {
  // 중요 이벤트 (프로덕션에서도 기록)
  info: (message: string, data?: TranscriptDebugInfo) => {
    const timestamp = new Date().toISOString();
    const logData = data ? sanitizeForLogging(data as unknown as Record<string, unknown>) : {};
    console.log(`[Transcript:${timestamp}] ${message}`, logData);
  },

  // 경고 (프로덕션에서도 기록)
  warn: (message: string, data?: TranscriptDebugInfo) => {
    const timestamp = new Date().toISOString();
    const logData = data ? sanitizeForLogging(data as unknown as Record<string, unknown>) : {};
    console.warn(`[Transcript:${timestamp}] ⚠️ ${message}`, logData);
  },

  // 에러 (프로덕션에서도 기록)
  error: (message: string, error?: Error | unknown, data?: TranscriptDebugInfo) => {
    const timestamp = new Date().toISOString();
    const logData = data ? sanitizeForLogging(data as unknown as Record<string, unknown>) : {};
    console.error(`[Transcript:${timestamp}] ❌ ${message}`, {
      ...logData,
      error: error instanceof Error ? error.message : String(error),
    });
  },

  // 디버그 (개발 모드에서만 기록)
  debug: (message: string, data?: TranscriptDebugInfo) => {
    if (!isDev) return;
    const timestamp = new Date().toISOString();
    const logData = data ? sanitizeForLogging(data as unknown as Record<string, unknown>) : {};
    console.debug(`[Transcript:${timestamp}] 🔍 ${message}`, logData);
  },

  // 화자 식별 관련 (항상 기록 - 문제 진단에 중요)
  speakerEvent: (event: 'identified' | 'mismatch' | 'unknown', data: {
    expectedSpeakerId?: string;
    actualSpeakerId?: string;
    speakerName?: string;
    resultId?: string;
  }) => {
    const timestamp = new Date().toISOString();
    const icon = event === 'identified' ? '✓' : event === 'mismatch' ? '⚠️' : '❓';
    console.log(`[Speaker:${timestamp}] ${icon} ${event}:`, {
      expected: maskSensitive(data.expectedSpeakerId, 6),
      actual: maskSensitive(data.actualSpeakerId, 6),
      name: data.speakerName,
      resultId: data.resultId?.substring(0, 12),
    });
  },

  // 세션 이벤트 (항상 기록)
  sessionEvent: (event: 'join' | 'leave' | 'reconnect' | 'error', sessionId: string, details?: string) => {
    const timestamp = new Date().toISOString();
    const icons: Record<string, string> = {
      join: '🟢',
      leave: '🔴',
      reconnect: '🔄',
      error: '❌',
    };
    console.log(`[Session:${timestamp}] ${icons[event]} ${event}: ${maskSensitive(sessionId, 6)}${details ? ` - ${details}` : ''}`);
  },
};

export default transcriptDebugLog;
