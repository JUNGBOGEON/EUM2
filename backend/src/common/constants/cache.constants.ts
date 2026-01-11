/**
 * Cache TTL (Time To Live) Constants
 * 캐시 만료 시간 관련 상수
 */

export const CACHE_TTL = {
  // Session & Meeting
  SESSION_INFO: 5 * 60 * 1000, // 5분 - 세션 정보 캐시
  PARTICIPANT_INFO: 60 * 1000, // 1분 - 참가자 정보 캐시
  PARTICIPANTS_LIST: 30 * 1000, // 30초 - 참가자 목록 캐시
  MEETING_CONFIG: 2 * 60 * 60 * 1000, // 2시간 - 미팅 설정 캐시

  // Translation
  TRANSLATION_RESULT: 60 * 60 * 1000, // 1시간 - 번역 결과 캐시
  TRANSLATION_PREFERENCE: 2 * 60 * 60 * 1000, // 2시간 - 사용자 번역 설정 캐시
  TRANSLATION_CHECK_INTERVAL: 30 * 1000, // 30초 - 번역 상태 확인 간격

  // General
  DEFAULT: 60 * 60 * 1000, // 1시간 - 기본 TTL
  SHORT: 5 * 60 * 1000, // 5분 - 짧은 TTL
  LONG: 2 * 60 * 60 * 1000, // 2시간 - 긴 TTL

  // Auth
  AUTH_SESSION: 7 * 24 * 60 * 60 * 1000, // 7일 - 인증 세션 쿠키
} as const;

/**
 * Buffer Configuration Constants
 * 버퍼 관련 상수
 */
export const BUFFER_CONFIG = {
  // Transcription
  TRANSCRIPTION_FLUSH_SIZE: 30, // 트랜스크립션 버퍼 플러시 크기
  TRANSCRIPTION_FLUSH_INTERVAL: 30 * 1000, // 30초 - 트랜스크립션 버퍼 플러시 간격

  // General
  CHUNK_SIZE: 100, // 일반적인 청크 크기
  MAX_BATCH_SIZE: 50, // 최대 배치 크기
} as const;

/**
 * Cache Key Prefixes
 * 캐시 키 접두사
 */
export const CACHE_KEY_PREFIX = {
  SESSION: 'session:',
  PARTICIPANT: 'participant:',
  TRANSLATION: 'translation:',
  TRANSLATION_PREF: 'translation:pref:',
  MEETING_CONFIG: 'meeting:config:',
} as const;

export type CacheTTL = (typeof CACHE_TTL)[keyof typeof CACHE_TTL];
export type BufferConfig = (typeof BUFFER_CONFIG)[keyof typeof BUFFER_CONFIG];
export type CacheKeyPrefix = (typeof CACHE_KEY_PREFIX)[keyof typeof CACHE_KEY_PREFIX];
