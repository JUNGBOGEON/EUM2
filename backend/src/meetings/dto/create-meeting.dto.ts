import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  title: string;

  @IsString()
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsOptional()
  maxParticipants?: number;

  @IsUUID()
  workspaceId: string;

  @IsDateString()
  @IsOptional()
  scheduledStartTime?: string;
}
