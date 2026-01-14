import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Channel } from './channel.entity';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    content: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'senderId' })
    sender: User;

    @Column()
    senderId: string;

    @ManyToOne(() => Channel, (channel) => channel.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'channelId' })
    channel: Channel;

    @Column()
    channelId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
