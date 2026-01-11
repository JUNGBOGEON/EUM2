import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhiteboardItem } from './entities/whiteboard-item.entity';

@Injectable()
export class WhiteboardService {
  constructor(
    @InjectRepository(WhiteboardItem)
    private whiteboardItemRepository: Repository<WhiteboardItem>,
  ) {}

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
      { isDeleted: true },
    );
  }

  async undo(meetingId: string, userId: string) {
    // Find the latest active item by this user
    const lastItem = await this.whiteboardItemRepository.findOne({
      where: { meetingId, userId, isDeleted: false },
      order: { createdAt: 'DESC' }, // Assuming zIndex or createdAt
    });

    if (lastItem) {
      lastItem.isDeleted = true;
      return this.whiteboardItemRepository.save(lastItem);
    }
    return null;
  }

  async redo(meetingId: string, userId: string) {
    // Find the latest deleted item by this user
    // Note: This is a simple implementation. Standard redo stack logic requires clearing redo on new action.
    // For a stateless server, this LIFO restore is the best approximation without a dedicated history table.
    const lastDeletedItem = await this.whiteboardItemRepository.findOne({
      where: { meetingId, userId, isDeleted: true },
      order: { updatedAt: 'DESC' }, // Use updatedAt to find what was just deleted
    });

    if (lastDeletedItem) {
      lastDeletedItem.isDeleted = false;
      return this.whiteboardItemRepository.save(lastDeletedItem);
    }
    return null;
  }
}
