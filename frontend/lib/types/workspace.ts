/**
 * 워크스페이스 관련 타입 정의
 * 모든 워크스페이스 관련 타입은 이 파일에서 관리합니다.
 */

import type { UserInfo, WorkspaceOwner } from './user';

/**
 * 워크스페이스 멤버 역할
 */
export type WorkspaceMemberRole = 'owner' | 'admin' | 'member';

/**
 * 멤버 권한 설정
 */
export interface MemberPermissions {
  sendMessages: boolean;    // 채팅 권한
  joinCalls: boolean;       // 통화 입장 권한
  editCalendar: boolean;    // 캘린더 편집 권한
  uploadFiles: boolean;     // 저장소 업로드 권한
  managePermissions: boolean; // 권한 관리 권한
}

/**
 * 워크스페이스 역할 (Role-Based Access Control)
 */
export interface WorkspaceRole {
  id: string;
  name: string;
  color?: string;            // 뱃지 색상 (hex)
  permissions: MemberPermissions;
  isDefault?: boolean;       // 새 멤버 기본 역할
  isSystem?: boolean;        // 시스템 역할 (삭제 불가)
}

/**
 * 기본 역할 정의
 */
export const DEFAULT_ROLES: WorkspaceRole[] = [
  {
    id: 'admin',
    name: '관리자',
    color: '#f59e0b',
    permissions: {
      sendMessages: true,
      joinCalls: true,
      editCalendar: true,
      uploadFiles: true,
      managePermissions: true,
    },
    isSystem: true,
  },
  {
    id: 'member',
    name: '멤버',
    color: '#3b82f6',
    permissions: {
      sendMessages: true,
      joinCalls: true,
      editCalendar: true,
      uploadFiles: true,
      managePermissions: false,
    },
    isDefault: true,
  },
  {
    id: 'guest',
    name: '게스트',
    color: '#6b7280',
    permissions: {
      sendMessages: true,
      joinCalls: true,
      editCalendar: false,
      uploadFiles: false,
      managePermissions: false,
    },
  },
];

/**
 * 워크스페이스 멤버
 */
export interface WorkspaceMember {
  id: string;
  userId?: string;
  name?: string;
  profileImage?: string;
  role?: WorkspaceMemberRole;
  roleId?: string;           // 역할 ID (새로운 RBAC 시스템)
  user?: UserInfo;
}

/**
 * 워크스페이스
 */
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  thumbnail?: string;
  banner?: string;
  createdAt: string;
  updatedAt?: string;
  owner?: WorkspaceOwner;
  members?: WorkspaceMember[];
}

/**
 * 워크스페이스 생성 DTO
 */
export interface CreateWorkspaceDto {
  name: string;
  description?: string;
  icon?: string;
}

/**
 * 워크스페이스 업데이트 DTO
 */
export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  icon?: string;
}
