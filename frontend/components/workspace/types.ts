/**
 * 워크스페이스 컴포넌트 타입
 * 
 * @deprecated 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새 코드에서는 '@/lib/types'에서 직접 import하세요.
 * 
 * 예시:
 * import type { Workspace, MeetingSession } from '@/lib/types';
 */

// 중앙화된 타입에서 re-export
export type {
  // User
  UserInfo,
  // Workspace
  Workspace,
  WorkspaceMember,
  // Meeting
  MeetingSession,
  SessionParticipant,
  MeetingTranscription,
  MeetingSummary,
  SummaryStatus,
  // File
  WorkspaceFile,
  WorkspaceFileType,
  FileListResponse,
  FileDownloadResponse,
} from '@/lib/types';
