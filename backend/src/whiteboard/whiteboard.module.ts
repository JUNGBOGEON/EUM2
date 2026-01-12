import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardGateway } from './whiteboard.gateway';
import { WhiteboardController } from './whiteboard.controller';
import { WhiteboardItem } from './entities/whiteboard-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WhiteboardItem])],
  controllers: [WhiteboardController],
  providers: [WhiteboardService, WhiteboardGateway],
  exports: [WhiteboardService],
})
export class WhiteboardModule { }
