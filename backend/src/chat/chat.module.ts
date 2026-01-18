import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Channel } from './entities/channel.entity';
import { Message } from './entities/message.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Channel, Message]),
        forwardRef(() => WorkspacesModule),
    ],
    controllers: [ChatController],
    providers: [ChatGateway, ChatService],
    exports: [ChatService],
})
export class ChatModule { }
