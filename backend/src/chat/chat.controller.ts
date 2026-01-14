import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming this exists

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('workspaces/:workspaceId/channels')
    async createChannel(
        @Param('workspaceId') workspaceId: string,
        @Body('name') name: string,
    ) {
        return this.chatService.createChannel(workspaceId, name);
    }

    @Get('workspaces/:workspaceId/channels')
    async getChannels(@Param('workspaceId') workspaceId: string) {
        return this.chatService.getChannels(workspaceId);
    }

    @Get('channels/:channelId/messages')
    async getMessages(
        @Param('channelId') channelId: string,
        @Query('limit') limit: number,
    ) {
        return this.chatService.getMessages(channelId, limit);
    }
    @Get('debug/latest-message')
    async getLatestMessage() {
        return this.chatService.getLatestMessage();
    }
}
