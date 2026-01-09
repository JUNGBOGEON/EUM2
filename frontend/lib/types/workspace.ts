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
 * 워크스페이스 멤버
 */
export interface WorkspaceMember {
  id: string;
  userId?: string;
  name?: string;
  profileImage?: string;
  role?: WorkspaceMemberRole;
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
