import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  workspaceId: string;

  @IsDateString()
  @IsOptional()
  scheduledStartTime?: string;
}
