/**
 * 애플리케이션 설정
 * 
 * 모든 환경 변수와 설정값을 중앙에서 관리합니다.
 * 
 * @example
 * import { config } from '@/lib/config';
 * 
 * fetch(`${config.apiUrl}/api/users`);
 */

/**
 * API 서버 URL
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * WebSocket 서버 URL (API 서버와 동일, /workspace 네임스페이스 포함)
 */
export const SOCKET_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/workspace`;

/**
 * 환경 설정
 */
export const config = {
  /** API 서버 기본 URL */
  apiUrl: API_URL,
  
  /** WebSocket 서버 URL */
  socketUrl: SOCKET_URL,
  
  /** 프로덕션 환경 여부 */
  isProduction: process.env.NODE_ENV === 'production',
  
  /** 개발 환경 여부 */
  isDevelopment: process.env.NODE_ENV === 'development',
  
  /** 디버그 모드 활성화 여부 */
  devMode: process.env.NEXT_PUBLIC_DEVMODE === 'true',
  
  /** API 요청 기본 타임아웃 (ms) */
  apiTimeout: 30000,
  
  /** WebSocket 재연결 시도 횟수 */
  socketReconnectAttempts: 5,
  
  /** WebSocket 재연결 지연 시간 (ms) */
  socketReconnectDelay: 1000,
} as const;

/**
 * API 엔드포인트 URL 생성
 */
export function getApiEndpoint(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}/api${normalizedPath}`;
}

/**
 * 외부 URL 생성 (OAuth 등)
 */
export function getExternalUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

export default config;
