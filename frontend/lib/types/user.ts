/**
 * 사용자 관련 타입 정의
 * 모든 사용자 관련 타입은 이 파일에서 관리합니다.
 */

/**
 * 기본 사용자 정보 (인증된 사용자)
 */
export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
}

/**
 * 간략한 사용자 정보 (다른 엔티티에서 참조 시 사용)
 */
export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  profileImage?: string;
}

/**
 * 워크스페이스 소유자 정보
 * Type alias for workspace owner - extends UserInfo without additional properties
 */
export type WorkspaceOwner = UserInfo;
