import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

/**
 * 인증된 사용자 정보
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
}

/**
 * Google OAuth 사용자 정보
 */
export interface GoogleOAuthUser {
  email: string;
  name: string;
  profileImage?: string;
  googleId: string;
}

/**
 * 요청에서 인증된 사용자 정보를 추출하는 헬퍼 함수
 */
export function getAuthUser(req: Request): User {
  return req.user as User;
}

/**
 * 요청에서 Google OAuth 사용자 정보를 추출하는 헬퍼 함수
 */
export function getGoogleUser(req: Request): GoogleOAuthUser {
  return req.user as GoogleOAuthUser;
}
