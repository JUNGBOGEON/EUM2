import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class RespondInvitationDto {
  @IsString()
  action: 'accept' | 'reject';
}
