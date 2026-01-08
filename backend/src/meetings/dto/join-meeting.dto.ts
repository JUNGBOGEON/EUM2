import { IsUUID } from 'class-validator';

export class JoinMeetingDto {
  @IsUUID()
  meetingId: string;
}
