import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';

/**
 * 멤버 권한 설정 인터페이스
 */
export interface MemberPermissions {
  sendMessages: boolean; // 채팅 권한
  joinCalls: boolean; // 통화 입장 권한
  editCalendar: boolean; // 캘린더 편집 권한
  uploadFiles: boolean; // 저장소 업로드 권한
  managePermissions: boolean; // 권한 관리 권한
}

/**
 * 기본 권한 설정
 */
export const DEFAULT_PERMISSIONS: MemberPermissions = {
  sendMessages: true,
  joinCalls: true,
  editCalendar: true,
  uploadFiles: true,
  managePermissions: false,
};

/**
 * Workspace Role Entity
 * 워크스페이스 역할 정의
 */
@Entity('workspace_roles')
export class WorkspaceRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 7, nullable: true })
  color: string;

  @Column({ type: 'jsonb', default: DEFAULT_PERMISSIONS })
  permissions: MemberPermissions;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isSystem: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
