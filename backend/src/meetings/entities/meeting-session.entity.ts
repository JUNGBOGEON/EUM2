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
import { SessionParticipant } from './session-participant.entity';
import { Transcription } from './transcription.entity';

/**
 * 미팅 세션 상태
 * - ACTIVE: 진행 중
 * - ENDED: 종료됨
 */
export enum SessionStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

/**
 * MeetingSession Entity
 *
 * Google Meet 방식의 일회성 세션
 * - Workspace 내에서 '회의 시작' 시 생성
 * - 회의 종료 시 ENDED 상태로 변경
 * - STT 데이터와 요약 데이터가 이 세션에 귀속됨
 */
@Entity('meeting_sessions')
export class MeetingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 세션 제목 (자동 생성 또는 사용자 지정)
  @Column({ nullable: true })
  title?: string;

  // ===== AWS Chime 관련 =====
  @Column({ nullable: true })
  chimeMeetingId?: string;

  @Column({ nullable: true })
  externalMeetingId?: string;

  @Column({ type: 'jsonb', nullable: true })
  mediaPlacement?: Record<string, any>;

  @Column({ nullable: true })
  mediaRegion?: string;

  // ===== 상태 =====
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  // ===== 관계 =====
  // 세션 호스트
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column()
  hostId: string;

  // 워크스페이스 (상위 채널)
  @ManyToOne(() => Workspace, (workspace) => workspace.meetingSessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  // 참가자들
  @OneToMany(() => SessionParticipant, (participant) => participant.session)
  participants: SessionParticipant[];

  // 트랜스크립션
  @OneToMany(() => Transcription, (transcription) => transcription.session)
  transcriptions: Transcription[];

  // ===== 시간 정보 =====
  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  // 세션 총 시간 (초)
  @Column({ type: 'int', nullable: true })
  durationSec?: number;

  // ===== 시스템 필드 =====
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
