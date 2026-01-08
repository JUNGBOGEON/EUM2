import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MeetingSession } from '../../meetings/entities/meeting-session.entity';

/**
 * Workspace Entity
 *
 * Discord 스타일의 영구적 채널/공간
 * - 항상 존재하는 상주형 공간
 * - 여러 개의 MeetingSession을 가질 수 있음
 * - 사용자가 '회의 시작'을 누르면 새 MeetingSession 생성
 */
@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: 'text', nullable: true })
  thumbnail: string;

  @Column({ type: 'text', nullable: true })
  banner: string;

  // ===== 소유자 =====
  @ManyToOne(() => User, (user) => user.workspaces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  // ===== 멤버들 (오너 제외) =====
  @ManyToMany(() => User)
  @JoinTable({
    name: 'workspace_members',
    joinColumn: { name: 'workspaceId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  members: User[];

  // ===== 미팅 세션들 =====
  @OneToMany(() => MeetingSession, (session) => session.workspace)
  meetingSessions: MeetingSession[];

  // ===== 시스템 필드 =====
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
