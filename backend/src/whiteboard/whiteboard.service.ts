import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhiteboardItem } from './entities/whiteboard-item.entity';
import { CreateWhiteboardItemDto } from './dto/whiteboard-item.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class WhiteboardService {
  private readonly logger = new Logger(WhiteboardService.name);

  constructor(
    @InjectRepository(WhiteboardItem)
    private whiteboardItemRepository: Repository<WhiteboardItem>,
    private readonly redisService: RedisService,
  ) {}

  async create(createWhiteboardItemDto: CreateWhiteboardItemDto) {
    // console.log to ensure visibility in standard output
    console.log('--- [WhiteboardService] Creating item ---');
    console.log('Payload:', JSON.stringify(createWhiteboardItemDto));
    console.log(
      `[WhiteboardService] meetingId check: '${createWhiteboardItemDto.meetingId}' (len: ${createWhiteboardItemDto.meetingId?.length})`,
    );

    if (
      !createWhiteboardItemDto.meetingId ||
      createWhiteboardItemDto.meetingId === 'default'
    ) {
      console.warn(
        '!!! [WhiteboardService] WARNING: Saving item with invalid meetingId:',
        createWhiteboardItemDto.meetingId,
      );
    }

    // Remove non-entity fields from the DTO
    const { senderId, ...cleanDto } = createWhiteboardItemDto as any;
    const item = this.whiteboardItemRepository.create(
      cleanDto as Partial<WhiteboardItem>,
    );

    // If ID is provided in DTO, ensure it's used
    if (createWhiteboardItemDto.id) {
      item.id = createWhiteboardItemDto.id;
    }

    // 1. Save to Redis (Primary for Speed)
    try {
      await this.redisService.addWhiteboardItem(item.meetingId, item);
      console.log(`[WhiteboardService] Saved to Redis. ID: ${item.id}`);
    } catch (redisError) {
      console.error(
        '!!! [WhiteboardService] Error saving to Redis:',
        redisError,
      );
    }

    // 2. Save to DB (Backup / Persistence)
    try {
      const savedItem = await this.whiteboardItemRepository.save(item);
      console.log(
        `[WhiteboardService] Saved item successfully to DB. ID: ${savedItem.id}, MeetingID: '${savedItem.meetingId}'`,
      );
      return savedItem;
    } catch (error) {
      console.error('!!! [WhiteboardService] Error saving item to DB:', error);
      // Even if DB fails, if Redis succeeded, the user sees the item.
      // But we should throw to warn the caller.
      throw error;
    }
  }

  async findAll(meetingId: string) {
    console.log(
      `--- [WhiteboardService] findAll called for meetingId: '${meetingId}' (len: ${meetingId?.length}) ---`,
    );

    // 1. Try Redis first
    try {
      const redisItems = await this.redisService.getWhiteboardItems(meetingId);
      const activeRedisItems = redisItems.filter((i) => !i.isDeleted);
      console.log(
        `[WhiteboardService] Redis returned ${redisItems.length} items (${activeRedisItems.length} active).`,
      );

      if (redisItems.length > 0) {
        return activeRedisItems;
      }
    } catch (redisError) {
      console.error(
        '!!! [WhiteboardService] Error fetching from Redis:',
        redisError,
      );
    }

    // 2. Fallback to DB if Redis is empty (or failed)
    console.log(
      `[WhiteboardService] Redis empty or failed, falling back to DB for '${meetingId}'`,
    );
    try {
      const items = await this.whiteboardItemRepository.find({
        where: {
          meetingId,
          isDeleted: false,
        },
        order: {
          createdAt: 'ASC', // Ensure correct drawing order
        },
      });
      console.log(
        `[WhiteboardService] Found ${items.length} items from DB for meetingId: '${meetingId}'`,
      );

      // Populate Redis if we found items in DB (Migration / Warm-up)
      if (items.length > 0) {
        console.log(
          `[WhiteboardService] Warming up Redis with ${items.length} items from DB.`,
        );
        // Note: For consistency, we should ideally push ALL items including deleted ones if we want true sync,
        // but here we only query non-deleted. This is fine for "load".
        // We will push them one by one or we could add a bulk method.
        // For now, let's just set the array.
        // WE CANNOT USE addWhiteboardItem loop because it reads-matches-writes.
        // We need a brute force set.
        // We can access redisService.set directly (it's public in our implementation above? No, wait, 'set' is public).
        // Let's use redisService.set directly for bulk load.
        await this.redisService.set(
          `whiteboard:items:${meetingId}`,
          items,
          24 * 60 * 60 * 1000,
        );
      }

      if (items.length > 0) {
        console.log(
          `[WhiteboardService] First item ID: ${items[0].id}, MeetingID: ${items[0].meetingId}`,
        );
      } else {
        // Double check count of ALL items to see if isDeleted is the issue
        const allItems = await this.whiteboardItemRepository.count({
          where: { meetingId },
        });
        console.log(
          `[WhiteboardService] Total items (including deleted) for '${meetingId}': ${allItems}`,
        );
      }
      return items;
    } catch (error) {
      console.error('!!! [WhiteboardService] Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    return this.whiteboardItemRepository.findOne({ where: { id } });
  }

  async update(id: string, updateWhiteboardItemDto: any) {
    // Extract actual changes from wrapper if present
    // Client may send { id, changes: {...}, senderId, meetingId } or direct fields
    const changes = updateWhiteboardItemDto.changes || updateWhiteboardItemDto;
    const meetingId = updateWhiteboardItemDto.meetingId;

    // Remove non-entity fields from the update payload
    const {
      senderId,
      meetingId: _,
      changes: __,
      id: ___,
      ...cleanChanges
    } = changes;

    // Skip if no actual changes to persist
    if (Object.keys(cleanChanges).length === 0) {
      return;
    }

    if (meetingId) {
      await this.redisService.updateWhiteboardItem(meetingId, id, cleanChanges);
    }
    return this.whiteboardItemRepository.update(id, cleanChanges);
  }

  async remove(id: string) {
    // We need meetingId to remove from Redis.
    // This is tricky if we only have ID.
    // We might have to fetch from DB to get meetingId if not provided.
    const item = await this.whiteboardItemRepository.findOne({ where: { id } });
    if (item) {
      await this.redisService.removeWhiteboardItem(item.meetingId, id);
    }
    return this.whiteboardItemRepository.update(id, { isDeleted: true });
  }

  async clearAll(meetingId: string) {
    await this.redisService.clearWhiteboardItems(meetingId);
    return this.whiteboardItemRepository.update(
      { meetingId, isDeleted: false },
      { isDeleted: true },
    );
  }

  async undo(meetingId: string, userId: string) {
    // Redis Undo Implementation
    // 1. Get List
    const items = await this.redisService.getWhiteboardItems(meetingId);
    // 2. Find last item by User
    const userItems = items.filter((i) => i.userId === userId && !i.isDeleted);
    // Sort by createdAt or simply take the last one in the list (assuming append order)
    // The list in Redis is append-only, so the last one is likely the latest.
    const lastItem = userItems[userItems.length - 1];

    if (lastItem) {
      // Soft delete in Redis
      await this.redisService.removeWhiteboardItem(meetingId, lastItem.id);

      // Propagate to DB
      lastItem.isDeleted = true;
      // Ideally we fetch the entity to be sure
      const entity = await this.whiteboardItemRepository.findOne({
        where: { id: lastItem.id },
      });
      if (entity) {
        entity.isDeleted = true;
        return this.whiteboardItemRepository.save(entity);
      }
    }

    return null;

    // Original DB Logic (kept for reference or fallback?) -> Replaced effectively by above.
  }

  async redo(meetingId: string, userId: string) {
    // Redo is harder without a dedicated stack.
    // Similar to DB logic: Find latest deleted item.
    const items = await this.redisService.getWhiteboardItems(meetingId);
    const userDeletedItems = items.filter(
      (i) => i.userId === userId && i.isDeleted,
    );
    // We need to find the *most recently deleted*.
    // If we only store isDeleted, we don't know WHEN it was deleted unless we store deletedAt.
    // For now, let's assume the last one in the list that is deleted matches usage?
    // No, create order != delete order.
    // Fallback to DB for Redo might be safer as TypeORM handles timestamps if configured,
    // but our entity structure might not have deletedAt.
    // Let's stick to DB logic for Redo for safety, then update Redis.

    // Find the latest deleted item by this user
    const lastDeletedItem = await this.whiteboardItemRepository.findOne({
      where: { meetingId, userId, isDeleted: true },
      order: { updatedAt: 'DESC' }, // Use updatedAt to find what was just deleted
    });

    if (lastDeletedItem) {
      lastDeletedItem.isDeleted = false;
      const saved = await this.whiteboardItemRepository.save(lastDeletedItem);

      // Update Redis
      await this.redisService.updateWhiteboardItem(
        meetingId,
        lastDeletedItem.id,
        { isDeleted: false },
      );
      return saved;
    }
    return null;
  }
}
