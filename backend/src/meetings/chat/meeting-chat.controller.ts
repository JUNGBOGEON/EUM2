import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MeetingChatService } from './meeting-chat.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('meetings/:meetingId/chat')
@UseGuards(JwtAuthGuard)
export class MeetingChatController {
    constructor(private readonly meetingChatService: MeetingChatService) { }

    @Get('messages')
    async getMessages(@Param('meetingId') meetingId: string) {
        const messages = await this.meetingChatService.getMessages(meetingId);
        return messages.map(msg => ({
            ...msg,
            senderName: msg.sender ? (msg.sender.name || msg.sender.email) : 'Unknown',
            senderProfileImage: msg.sender?.profileImage,
        }));
    }
}
