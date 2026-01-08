import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { MeetingParticipant } from './meeting-participant.entity';
import { Transcription } from './transcription.entity';

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  ENDED = 'ended',
}

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  // AWS Chime Meeting ID
  @Column({ nullable: true })
  chimeMeetingId?: string;

  // AWS Chime Meeting 외부 ID (우리가 생성하는 고유 ID)
  @Column({ nullable: true })
  externalMeetingId?: string;

  // AWS Chime Media Placement (JSON)
  @Column({ type: 'jsonb', nullable: true })
  mediaPlacement?: Record<string, any>;

  // AWS Chime Media Region
  @Column({ nullable: true })
  mediaRegion?: string;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.SCHEDULED,
  })
  status: MeetingStatus;

  // 미팅 호스트
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column()
  hostId: string;

  // 워크스페이스
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  // 참가자들
  @OneToMany(() => MeetingParticipant, (participant) => participant.meeting)
  participants: MeetingParticipant[];

  // 트랜스크립션
  @OneToMany(() => Transcription, (transcription) => transcription.meeting)
  transcriptions: Transcription[];

  // 예정 시작 시간
  @Column({ type: 'timestamp', nullable: true })
  scheduledStartTime?: Date;

  // 실제 시작 시간
  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  // 종료 시간
  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
