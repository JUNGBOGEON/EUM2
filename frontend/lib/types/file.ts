/**
 * 워크스페이스 파일 관련 타입 정의
 */

import type { UserInfo } from './user';

/**
 * 파일 타입
 */
export type WorkspaceFileType = 'image' | 'document' | 'summary';

/**
 * 워크스페이스 파일
 */
export interface WorkspaceFile {
  id: string;
  workspaceId: string;
  filename: string;
  fileType: WorkspaceFileType;
  mimeType: string;
  size: number;
  sessionId?: string;
  session?: {
    id: string;
    title: string;
  };
  uploaderId?: string;
  uploader?: UserInfo;
  createdAt: string;
}

/**
 * 파일 목록 응답
 */
export interface FileListResponse {
  files: WorkspaceFile[];
  nextCursor: string | null;
  total: number;
}

/**
 * 파일 다운로드 응답
 */
export interface FileDownloadResponse {
  presignedUrl: string;
  filename: string;
  mimeType: string;
  expiresIn: number;
}
