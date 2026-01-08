import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Meeting } from './meeting.entity';

export enum ParticipantRole {
  HOST = 'host',
  PARTICIPANT = 'participant',
}

@Entity('meeting_participants')
export class MeetingParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // AWS Chime Attendee ID
  @Column({ nullable: true })
  chimeAttendeeId?: string;

  // AWS Chime External User ID
  @Column({ nullable: true })
  externalUserId?: string;

  // AWS Chime Join Token
  @Column({ nullable: true })
  joinToken?: string;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.PARTICIPANT,
  })
  role: ParticipantRole;

  // 미팅
  @ManyToOne(() => Meeting, (meeting) => meeting.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meetingId' })
  meeting: Meeting;

  @Column()
  meetingId: string;

  // 사용자
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // 참가 시간
  @Column({ type: 'timestamp', nullable: true })
  joinedAt?: Date;

  // 퇴장 시간
  @Column({ type: 'timestamp', nullable: true })
  leftAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
