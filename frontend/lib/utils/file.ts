/**
 * 파일 관련 유틸리티
 * 파일 크기 포맷팅, 파일명 처리, MIME 타입 관련 함수들
 */

/**
 * 파일 크기 포맷팅 (예: "1.5 MB", "500 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * 파일명에서 이름과 확장자 분리
 */
export function splitFilename(filename: string): { name: string; ext: string } {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return { name: filename, ext: '' };
  }
  return {
    name: filename.substring(0, lastDotIndex),
    ext: filename.substring(lastDotIndex),
  };
}

/**
 * 파일 확장자 추출 (소문자)
 */
export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop();
  return ext ? ext.toLowerCase() : '';
}

/**
 * 이미지 파일 여부 확인
 */
export function isImageFile(mimeType?: string): boolean {
  return mimeType?.startsWith('image/') ?? false;
}

/**
 * 비디오 파일 여부 확인
 */
export function isVideoFile(mimeType?: string): boolean {
  return mimeType?.startsWith('video/') ?? false;
}

/**
 * 오디오 파일 여부 확인
 */
export function isAudioFile(mimeType?: string): boolean {
  return mimeType?.startsWith('audio/') ?? false;
}

/**
 * PDF 파일 여부 확인
 */
export function isPdfFile(mimeType?: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * 문서 파일 여부 확인
 */
export function isDocumentFile(mimeType?: string): boolean {
  if (!mimeType) return false;
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];
  return documentTypes.includes(mimeType);
}

/**
 * 파일 타입에 따른 아이콘 타입 반환
 */
export type FileIconType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'file';

export function getFileIconType(mimeType?: string): FileIconType {
  if (isImageFile(mimeType)) return 'image';
  if (isVideoFile(mimeType)) return 'video';
  if (isAudioFile(mimeType)) return 'audio';
  if (isPdfFile(mimeType)) return 'pdf';
  if (isDocumentFile(mimeType)) return 'document';
  return 'file';
}

/**
 * 허용된 파일 타입 목록
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

/**
 * 파일 유효성 검사
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number; // bytes
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes } = options; // 기본 10MB

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `파일 크기는 ${formatFileSize(maxSize)}를 초과할 수 없습니다.`,
    };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '지원하지 않는 파일 형식입니다.',
    };
  }

  return { valid: true };
}

/**
 * 파일명 안전하게 변환 (특수문자 제거)
 */
export function sanitizeFilename(filename: string): string {
  const { name, ext } = splitFilename(filename);
  const sanitized = name
    .replace(/[<>:"/\\|?*]/g, '') // Windows 금지 문자
    .replace(/\s+/g, '_') // 공백을 언더스코어로
    .trim();
  return sanitized + ext;
}
