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

  // ===== 소유자 =====
  @ManyToOne(() => User, (user) => user.workspaces, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: string;

  // ===== 미팅 세션들 =====
  @OneToMany(() => MeetingSession, (session) => session.workspace)
  meetingSessions: MeetingSession[];

  // ===== 시스템 필드 =====
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
