import { IsString, IsOptional, IsUUID } from 'class-validator';

/**
 * 워크스페이스에서 새 세션 시작 DTO
 * Google Meet 방식: 워크스페이스에 들어가면 세션 생성/참가
 */
export class StartSessionDto {
  @IsUUID()
  workspaceId: string;

  @IsString()
  @IsOptional()
  title?: string;
}

/**
 * 세션 참가 DTO
 */
export class JoinSessionDto {
  @IsUUID()
  sessionId: string;
}
