/**
 * 에러 핸들링 유틸리티
 * 
 * 애플리케이션 전체에서 일관된 에러 처리를 위한 유틸리티입니다.
 */

import { toast } from 'sonner';

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * 사용자에게 표시할 메시지
   */
  get userMessage(): string {
    switch (this.statusCode) {
      case 401:
        return '로그인이 필요합니다.';
      case 403:
        return '접근 권한이 없습니다.';
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.';
      case 409:
        return '이미 존재하는 데이터입니다.';
      case 422:
        return '입력값이 올바르지 않습니다.';
      case 429:
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      case 500:
      case 502:
      case 503:
        return '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      default:
        return this.message || '알 수 없는 오류가 발생했습니다.';
    }
  }
}

/**
 * 네트워크 에러 클래스
 */
export class NetworkError extends Error {
  constructor(message = '네트워크 연결을 확인해주세요.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * unknown 에러를 Error 객체로 변환
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('알 수 없는 오류가 발생했습니다.');
}

/**
 * 에러 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * 에러를 토스트로 표시
 */
export function showErrorToast(error: unknown, fallbackMessage?: string): void {
  const message = getErrorMessage(error) || fallbackMessage || '오류가 발생했습니다.';
  toast.error(message);
}

/**
 * 에러 로깅 (개발 환경에서만)
 */
export function logError(error: unknown, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);
  }
}

/**
 * 에러 처리 헬퍼 - try-catch 블록에서 사용
 * 
 * @example
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   handleError(error, { showToast: true, context: 'someOperation' });
 * }
 */
export function handleError(
  error: unknown,
  options: {
    showToast?: boolean;
    context?: string;
    fallbackMessage?: string;
    onAuthError?: () => void;
  } = {}
): Error {
  const { showToast = true, context, fallbackMessage, onAuthError } = options;
  const normalizedError = normalizeError(error);

  // 인증 에러 처리
  if (error instanceof ApiError && error.statusCode === 401) {
    onAuthError?.();
  }

  // 로깅
  logError(error, context);

  // 토스트 표시
  if (showToast) {
    showErrorToast(error, fallbackMessage);
  }

  return normalizedError;
}
