import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { User } from '../../users/entities/user.entity';
import { WorkspaceRole } from './workspace-role.entity';

/**
 * Workspace Member Role Entity
 * 워크스페이스 멤버의 역할 할당
 */
@Entity('workspace_member_roles')
@Unique(['workspaceId', 'userId'])
export class WorkspaceMemberRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => WorkspaceRole, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: WorkspaceRole;

  @Column()
  roleId: string;

  @CreateDateColumn()
  createdAt: Date;
}
