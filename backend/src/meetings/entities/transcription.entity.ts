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
import { MeetingSession } from './meeting-session.entity';
import {
  encryptedTextTransformer,
  encryptedJsonTransformer,
} from '../../common/crypto';

/**
 * Transcription Entity
 *
 * AI 요약 및 보고서 생성을 위해 최적화된 구조
 * - MeetingSession에 귀속됨 (Workspace가 아님)
 * - 발화자별 그룹화 가능 (speakerId, chimeAttendeeId)
 * - 시간순 정렬 가능 (startTimeMs, endTimeMs)
 * - 부분/최종 결과 구분 (isPartial, resultId)
 * - 신뢰도 기반 필터링 (confidence)
 * - 다국어 번역 지원 (translations)
 */
@Entity('transcriptions')
@Index(['sessionId', 'startTimeMs']) // 세션별 시간순 조회 최적화
@Index(['sessionId', 'speakerId']) // 세션별 발화자 조회 최적화
@Index(['sessionId', 'resultId'], { unique: true }) // 중복 방지
export class Transcription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== 미팅 세션 관계 =====
  @ManyToOne(() => MeetingSession, (session) => session.transcriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: MeetingSession;

  @Column()
  @Index()
  sessionId: string;

  // ===== 발화자 정보 =====
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'speakerId' })
  speaker: User;

  @Column({ nullable: true })
  speakerId?: string;

  // Chime Attendee ID (발화자 식별용)
  @Column({ nullable: true })
  chimeAttendeeId?: string;

  // Chime External User ID (백업 식별자)
  @Column({ nullable: true })
  externalUserId?: string;

  // ===== 텍스트 내용 (암호화됨) =====
  @Column({ type: 'text', transformer: encryptedTextTransformer })
  originalText: string;

  @Column({ default: 'ko-KR' })
  languageCode: string;

  // 번역된 텍스트 (암호화된 JSON)
  @Column({ type: 'text', nullable: true, transformer: encryptedJsonTransformer })
  translations?: Record<string, string>;

  // ===== 시간 정보 =====
  @Column({ type: 'bigint' })
  startTimeMs: number;

  @Column({ type: 'bigint' })
  endTimeMs: number;

  // 세션 시작 기준 상대 시간 (초) - UI 표시용
  @Column({ type: 'float', nullable: true })
  relativeStartSec?: number;

  // ===== AWS Transcribe 메타데이터 =====
  @Column({ nullable: true })
  resultId?: string;

  @Column({ default: false })
  isPartial: boolean;

  @Column({ type: 'float', nullable: true })
  confidence?: number;

  @Column({ default: false })
  isStable: boolean;

  // ===== AI 분석용 메타데이터 =====
  @Column({ nullable: true })
  utteranceType?: string;

  @Column({ type: 'jsonb', nullable: true })
  sentiment?: {
    label: string;
    score: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  keywords?: string[];

  @Column({ default: false })
  isActionItem: boolean;

  // 액션 아이템 내용 (암호화됨)
  @Column({ type: 'text', nullable: true, transformer: encryptedTextTransformer })
  actionItemContent?: string;

  // ===== 시스템 필드 =====
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
