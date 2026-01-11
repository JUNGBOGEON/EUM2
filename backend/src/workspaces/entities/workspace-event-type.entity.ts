import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from './workspace.entity';

/**
 * WorkspaceEventType Entity
 *
 * 워크스페이스별 커스텀 이벤트 유형 관리
 * - 기본 유형: 회의, 마감일, 리마인더, 기타
 * - 사용자가 직접 커스텀 유형 생성 가능
 */
@Entity('workspace_event_types')
@Unique(['workspaceId', 'name']) // 워크스페이스 내 유형 이름 중복 방지
export class WorkspaceEventType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== 워크스페이스 =====
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  // ===== 유형 정보 =====
  @Column({ length: 50 })
  name: string; // 유형 이름 (예: 회의, 마감일, 스터디, 발표 등)

  @Column({ length: 7 })
  color: string; // 색상 (hex, 예: #3b82f6)

  @Column({ nullable: true, length: 50 })
  icon: string; // 아이콘 이름 (lucide 아이콘, 예: video, clock, bell)

  @Column({ default: false })
  isDefault: boolean; // 기본 유형 여부 (삭제 불가)

  @Column({ default: 0 })
  order: number; // 정렬 순서

  // ===== 생성자 =====
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  // ===== 시스템 필드 =====
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * 기본 이벤트 유형 정의
 */
export const DEFAULT_EVENT_TYPES = [
  { name: '회의', color: '#3b82f6', icon: 'video', order: 0 },
  { name: '마감일', color: '#ef4444', icon: 'alert-circle', order: 1 },
  { name: '리마인더', color: '#f59e0b', icon: 'bell', order: 2 },
  { name: '기타', color: '#8b5cf6', icon: 'calendar', order: 3 },
];
