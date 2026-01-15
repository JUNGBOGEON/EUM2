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

    @Column('text')
    content: string; // Original content

    @Column()
    sourceLanguage: string;

    // Stores translated versions of the content
    // Structure: { "en": "Hello", "ko": "안녕하세요" }
    @Column('jsonb', { default: {} })
    translations: Record<string, string>;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}
