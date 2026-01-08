import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Meeting } from './meeting.entity';

@Entity('transcriptions')
export class Transcription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 원본 텍스트
  @Column({ type: 'text' })
  originalText: string;

  // 원본 언어 코드 (ko, en, ja 등)
  @Column()
  originalLanguage: string;

  // 번역된 텍스트 (JSON 형태로 여러 언어 저장)
  @Column({ type: 'jsonb', nullable: true })
  translations: Record<string, string>;

  // 미팅
  @ManyToOne(() => Meeting, (meeting) => meeting.transcriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meetingId' })
  meeting: Meeting;

  @Column()
  meetingId: string;

  // 발화자
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'speakerId' })
  speaker: User;

  @Column({ nullable: true })
  speakerId?: string;

  // Chime Attendee ID (발화자 식별용)
  @Column({ nullable: true })
  chimeAttendeeId?: string;

  // 발화 시작 시간 (미팅 시작 기준 밀리초)
  @Column({ type: 'bigint', nullable: true })
  startTime?: number;

  // 발화 종료 시간
  @Column({ type: 'bigint', nullable: true })
  endTime?: number;

  // 신뢰도 점수
  @Column({ type: 'float', nullable: true })
  confidence?: number;

  @CreateDateColumn()
  createdAt: Date;
}
