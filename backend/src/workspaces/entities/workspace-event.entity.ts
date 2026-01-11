import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from './workspace.entity';
import { WorkspaceEventType } from './workspace-event-type.entity';

/**
 * 반복 타입
 */
export enum RecurrenceType {
  NONE = 'none', // 반복 없음
  DAILY = 'daily', // 매일
  WEEKLY = 'weekly', // 매주
  MONTHLY = 'monthly', // 매월
}

/**
 * WorkspaceEvent Entity
 *
 * 워크스페이스별 일정/이벤트 관리
 * - 회의 일정, 마감일, 리마인더 등 등록
 * - 워크스페이스 멤버들과 일정 공유
 * - 커스텀 이벤트 유형 지원
 */
@Entity('workspace_events')
export class WorkspaceEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== 워크스페이스 =====
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  // ===== 이벤트 정보 =====
  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ===== 이벤트 유형 (커스텀 타입 참조) =====
  @ManyToOne(() => WorkspaceEventType, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'eventTypeId' })
  eventType: WorkspaceEventType;

  @Column({ nullable: true })
  eventTypeId: string;

  // 레거시 호환용 (마이그레이션 후 제거 가능)
  @Column({ nullable: true })
  color: string;

  // ===== 일시 =====
  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({ default: false })
  isAllDay: boolean; // 종일 이벤트 여부

  // ===== 반복 설정 =====
  @Column({
    type: 'enum',
    enum: RecurrenceType,
    default: RecurrenceType.NONE,
  })
  recurrence: RecurrenceType;

  @Column({ type: 'timestamp', nullable: true })
  recurrenceEndDate: Date | null; // 반복 종료일

  // ===== 알림 설정 =====
  @Column({ type: 'int', nullable: true })
  reminderMinutes: number; // 시작 N분 전 알림 (null이면 알림 없음)

  // ===== 생성자 =====
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  // ===== 회의 연결 (선택) =====
  @Column({ nullable: true })
  meetingSessionId: string; // 연결된 미팅 세션 ID (있는 경우)

  // ===== 시스템 필드 =====
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
