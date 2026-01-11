/**
 * 유틸리티 함수 중앙 진입점
 */

// 에러 핸들링
export {
  ApiError,
  NetworkError,
  normalizeError,
  getErrorMessage,
  showErrorToast,
  logError,
  handleError,
} from './error';

// 디버그 유틸리티
export { debug, isDebugEnabled } from './debug';

// 시간 유틸리티
export { formatTime, formatElapsedTime } from './time';

// 날짜 유틸리티
export {
  formatRelativeTime,
  formatDate,
  formatDateTime,
  formatFullDate,
  formatShortDate,
  formatSmartDate,
  formatDateTimeLocal,
  formatTranscriptTime,
  formatDuration,
  formatOngoingDuration,
} from './date';

// 파일 유틸리티
export {
  formatFileSize,
  splitFilename,
  getFileExtension,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isPdfFile,
  isDocumentFile,
  getFileIconType,
  validateFile,
  sanitizeFilename,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
} from './file';
export type { FileIconType } from './file';

// 로거 유틸리티
export { logger } from './logger';
