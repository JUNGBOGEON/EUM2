import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { WhiteboardService } from './whiteboard.service';

@Controller('api/whiteboard')
export class WhiteboardController {
    constructor(private readonly whiteboardService: WhiteboardService) { }

    @Post()
    create(@Body() createWhiteboardItemDto: any) {
        return this.whiteboardService.create(createWhiteboardItemDto);
    }

    @Get(':meetingId')
    findAll(@Param('meetingId') meetingId: string) {
        return this.whiteboardService.findAll(meetingId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateWhiteboardItemDto: any) {
        return this.whiteboardService.update(id, updateWhiteboardItemDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.whiteboardService.remove(id);
    }

    @Delete('meeting/:meetingId')
    clearAll(@Param('meetingId') meetingId: string) {
        return this.whiteboardService.clearAll(meetingId);
    }
}
