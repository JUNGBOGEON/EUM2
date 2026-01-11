/**
 * 초대 관련 타입 정의
 * 워크스페이스 멤버 초대, 대기 중인 초대, 초대 알림 등
 */

/**
 * 초대 가능한 사용자 정보
 * 사용자 검색 결과 및 초대 대상자 표시에 사용
 */
export interface InvitableUser {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

/**
 * 초대받은 사람 정보 (초대 내에서 사용)
 */
export interface Invitee {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

/**
 * 초대한 사람 정보 (초대 내에서 사용)
 */
export interface Inviter {
  id: string;
  name: string;
  profileImage?: string;
}

/**
 * 대기 중인 초대 정보 (워크스페이스 오너 관점)
 * 워크스페이스에서 보낸 초대 목록 표시에 사용
 */
export interface PendingInvitation {
  id: string;
  invitee: Invitee;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

/**
 * 워크스페이스 초대 정보 (초대받는 사람 관점)
 * 사용자가 받은 초대 목록 표시에 사용
 */
export interface WorkspaceInvitation {
  id: string;
  workspace: {
    id: string;
    name: string;
    icon?: string;
    thumbnail?: string;
  };
  inviter: Inviter;
  message?: string;
  createdAt: string;
}

/**
 * 초대 상태 타입
 */
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

/**
 * 초대 알림 타입
 */
export type InvitationNotificationType =
  | 'invitation_received'
  | 'invitation_cancelled'
  | 'invitation_accepted'
  | 'invitation_rejected';
