import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhiteboardItem } from './entities/whiteboard-item.entity';

@Injectable()
export class WhiteboardService {
    constructor(
        @InjectRepository(WhiteboardItem)
        private whiteboardItemRepository: Repository<WhiteboardItem>,
    ) { }

    async create(createWhiteboardItemDto: any) {
        // TODO: Implement DTO validation
        const item = this.whiteboardItemRepository.create(createWhiteboardItemDto);
        return this.whiteboardItemRepository.save(item);
    }

    async findAll(meetingId: string) {
        return this.whiteboardItemRepository.find({
            where: { meetingId, isDeleted: false },
            order: { zIndex: 'ASC' },
        });
    }

    async findOne(id: string) {
        return this.whiteboardItemRepository.findOne({ where: { id } });
    }

    async update(id: string, updateWhiteboardItemDto: any) {
        return this.whiteboardItemRepository.update(id, updateWhiteboardItemDto);
    }

    async remove(id: string) {
        return this.whiteboardItemRepository.update(id, { isDeleted: true });
    }

    async clearAll(meetingId: string) {
        return this.whiteboardItemRepository.update(
            { meetingId, isDeleted: false },
            { isDeleted: true }
        );
    }
}
