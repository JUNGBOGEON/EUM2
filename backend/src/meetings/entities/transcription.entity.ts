import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Meeting } from './meeting.entity';

/**
 * Transcription Entity
 *
 * AI 요약 및 보고서 생성을 위해 최적화된 구조:
 * - 발화자별 그룹화 가능 (speakerId, chimeAttendeeId)
 * - 시간순 정렬 가능 (startTimeMs, endTimeMs)
 * - 부분/최종 결과 구분 (isPartial, resultId)
 * - 신뢰도 기반 필터링 (confidence)
 * - 다국어 번역 지원 (translations)
 */
@Entity('transcriptions')
@Index(['meetingId', 'startTimeMs']) // 미팅별 시간순 조회 최적화
@Index(['meetingId', 'speakerId']) // 미팅별 발화자 조회 최적화
export class Transcription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== 미팅 관계 =====
  @ManyToOne(() => Meeting, (meeting) => meeting.transcriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meetingId' })
  meeting: Meeting;

  @Column()
  @Index()
  meetingId: string;

  // ===== 발화자 정보 =====
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'speakerId' })
  speaker: User;

  @Column({ nullable: true })
  speakerId?: string;

  // Chime Attendee ID (발화자 식별용 - User 매핑 전에도 사용 가능)
  @Column({ nullable: true })
  chimeAttendeeId?: string;

  // Chime External User ID (백업 식별자)
  @Column({ nullable: true })
  externalUserId?: string;

  // ===== 텍스트 내용 =====
  // 원본 텍스트 (전체 문장)
  @Column({ type: 'text' })
  originalText: string;

  // 원본 언어 코드 (ko-KR, en-US 등)
  @Column({ default: 'ko-KR' })
  languageCode: string;

  // 번역된 텍스트 (JSON 형태로 여러 언어 저장)
  // 예: { "en-US": "Hello", "ja-JP": "こんにちは" }
  @Column({ type: 'jsonb', nullable: true })
  translations?: Record<string, string>;

  // ===== 시간 정보 =====
  // 발화 시작 시간 (Unix timestamp, 밀리초)
  @Column({ type: 'bigint' })
  startTimeMs: number;

  // 발화 종료 시간 (Unix timestamp, 밀리초)
  @Column({ type: 'bigint' })
  endTimeMs: number;

  // 미팅 시작 기준 상대 시간 (초) - UI 표시용
  @Column({ type: 'float', nullable: true })
  relativeStartSec?: number;

  // ===== AWS Transcribe 메타데이터 =====
  // Transcribe Result ID (부분 결과 업데이트 추적용)
  @Column({ nullable: true })
  resultId?: string;

  // 부분 결과 여부 (true면 아직 업데이트될 수 있음)
  @Column({ default: false })
  isPartial: boolean;

  // 신뢰도 점수 (0-1, 높을수록 정확)
  @Column({ type: 'float', nullable: true })
  confidence?: number;

  // 안정화된 결과 여부
  @Column({ default: false })
  isStable: boolean;

  // ===== AI 분석용 메타데이터 =====
  // 발화 유형 분류 (question, answer, statement, action_item 등)
  @Column({ nullable: true })
  utteranceType?: string;

  // 감정 분석 결과
  @Column({ type: 'jsonb', nullable: true })
  sentiment?: {
    label: string; // positive, negative, neutral, mixed
    score: number;
  };

  // 핵심 키워드 (AI 추출)
  @Column({ type: 'jsonb', nullable: true })
  keywords?: string[];

  // 액션 아이템 여부
  @Column({ default: false })
  isActionItem: boolean;

  // 관련 액션 아이템 내용
  @Column({ type: 'text', nullable: true })
  actionItemContent?: string;

  // ===== 시스템 필드 =====
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
