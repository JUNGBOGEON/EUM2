import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MeetingSession } from './meeting-session.entity';

export enum ParticipantRole {
  HOST = 'host',
  PARTICIPANT = 'participant',
}

/**
 * SessionParticipant Entity
 *
 * 미팅 세션의 참가자 정보
 * - AWS Chime Attendee 정보 포함
 * - 참가/퇴장 시간 기록
 */
@Entity('session_participants')
export class SessionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== AWS Chime 관련 =====
  @Column({ nullable: true })
  chimeAttendeeId?: string;

  @Column({ nullable: true })
  externalUserId?: string;

  @Column({ nullable: true })
  joinToken?: string;

  // ===== 역할 =====
  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.PARTICIPANT,
  })
  role: ParticipantRole;

  // ===== 관계 =====
  // 미팅 세션
  @ManyToOne(() => MeetingSession, (session) => session.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: MeetingSession;

  @Column()
  sessionId: string;

  // 사용자
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // ===== 시간 정보 =====
  @Column({ type: 'timestamp', nullable: true })
  joinedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt?: Date;

  // 참가 총 시간 (초)
  @Column({ type: 'int', nullable: true })
  durationSec?: number;

  // ===== 시스템 필드 =====
  @CreateDateColumn()
  createdAt: Date;
}
