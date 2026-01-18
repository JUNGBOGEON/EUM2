import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MeetingSession } from '../../entities/meeting-session.entity';
import { User } from '../../../users/entities/user.entity';
import {
  encryptedTextTransformer,
  encryptedJsonTransformer,
} from '../../../common/crypto';

@Entity('meeting_chat_messages')
export class MeetingChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @ManyToOne(() => MeetingSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meetingId' })
  meeting: MeetingSession;

  @Column()
  senderId: string; // userId

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  // 채팅 내용 (암호화됨)
  @Column({ type: 'text', transformer: encryptedTextTransformer })
  content: string;

  @Column()
  sourceLanguage: string;

  // 번역된 메시지 (암호화된 JSON)
  // Structure: { "en": "Hello", "ko": "안녕하세요" }
  @Column({
    type: 'text',
    default: '{}',
    transformer: encryptedJsonTransformer,
  })
  translations: Record<string, string>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
