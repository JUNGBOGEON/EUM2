import { IsString, IsOptional, IsUUID, IsNumber, Min, Max } from 'class-validator';

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

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  @Min(2)
  @Max(50)
  maxParticipants?: number;
}

/**
 * 세션 참가 DTO
 */
export class JoinSessionDto {
  @IsUUID()
  sessionId: string;
}
