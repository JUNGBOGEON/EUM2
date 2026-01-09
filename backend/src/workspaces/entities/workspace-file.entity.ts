import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from './workspace.entity';
import { MeetingSession } from '../../meetings/entities/meeting-session.entity';

/**
 * File type classification
 */
export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  SUMMARY = 'summary',
}

/**
 * WorkspaceFile Entity
 *
 * 워크스페이스에 저장된 파일 (이미지, 문서, AI 요약 등)
 */
@Entity('workspace_files')
@Index(['workspaceId', 'createdAt'])
@Index(['workspaceId', 'fileType'])
export class WorkspaceFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== Workspace relation =====
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  // ===== Uploader relation =====
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @Column({ nullable: true })
  uploaderId: string;

  // ===== File metadata =====
  @Column()
  filename: string;

  @Column()
  s3Key: string;

  @Column({
    type: 'enum',
    enum: FileType,
  })
  fileType: FileType;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  // ===== Summary-specific fields =====
  @ManyToOne(() => MeetingSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sessionId' })
  session: MeetingSession;

  @Column({ nullable: true })
  sessionId: string;

  // ===== System fields =====
  @CreateDateColumn()
  createdAt: Date;
}
