import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from './entities/channel.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Channel)
        private channelRepository: Repository<Channel>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
    ) { }

    // --- Channel Methods ---

    async createChannel(workspaceId: string, name: string): Promise<Channel> {
        const channel = this.channelRepository.create({
            workspaceId,
            name,
        });
        return this.channelRepository.save(channel);
    }

    async getChannels(workspaceId: string): Promise<Channel[]> {
        const channels = await this.channelRepository.find({
            where: { workspaceId },
            order: { createdAt: 'ASC' },
        });

        if (channels.length === 0) {
            const generalChannel = await this.createChannel(workspaceId, 'General');
            return [generalChannel];
        }

        return channels;
    }

    async getChannelById(channelId: string): Promise<Channel | null> {
        return this.channelRepository.findOne({ where: { id: channelId } });
    }

    // --- Message Methods ---

    async saveMessage(channelId: string, senderId: string, content: string): Promise<Message> {
        const message = this.messageRepository.create({
            channelId,
            senderId,
            content,
        });
        return this.messageRepository.save(message);
    }

    async getMessages(channelId: string, limit: number = 50): Promise<Message[]> {
        return this.messageRepository.find({
            where: { channelId },
            order: { createdAt: 'ASC' }, // Fetch oldest first, or newest? Usually chat is ASC.
            take: limit,
            relations: ['sender'], // We need sender info for the UI
        });
    }

    async getMessageWithSender(messageId: string): Promise<Message | null> {
        return this.messageRepository.findOne({
            where: { id: messageId },
            relations: ['sender'],
        });
    }
    async getLatestMessage(): Promise<Message | null> {
        return this.messageRepository.findOne({
            where: {},
            order: { createdAt: 'DESC' },
            relations: ['sender'],
        });
    }
}
