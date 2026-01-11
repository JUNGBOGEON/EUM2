import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { WhiteboardService } from './whiteboard.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, relative } from 'path';
import * as fs from 'fs';

@Controller('whiteboard')
export class WhiteboardController {
    constructor(private readonly whiteboardService: WhiteboardService) { }

    @Get('storage')
    getStorageFiles() {
        const uploadDir = join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            return [];
        }

        const files: { url: string; name: string; date: string }[] = [];

        const scan = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = join(dir, entry.name);
                if (entry.isDirectory()) {
                    scan(fullPath);
                } else {
                    // Filter images
                    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
                        const relPath = relative(process.cwd(), fullPath).replace(/\\/g, '/');
                        const stats = fs.statSync(fullPath);
                        const baseUrl = process.env.API_URL || 'http://localhost:4000';
                        files.push({
                            url: `${baseUrl}/${relPath}`,
                            name: entry.name,
                            date: stats.mtime.toISOString()
                        });
                    }
                }
            }
        };

        scan(uploadDir);
        // Sort by date desc
        return files.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const body = req.body;
                // Sanitize meeting name to avoid path traversal or invalid chars
                const rawName = body.meetingName || 'Untitled';
                const meetingName = rawName.replace(/[^a-zA-Z0-9가-힣_\- ]/g, '').trim() || 'Untitled';

                const date = new Date().toISOString().split('T')[0];
                const uploadPath = `uploads/${date}/${meetingName}`;

                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }

                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
            }
        })
    }))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        // Return relative URL (e.g. /uploads/2026-01-10/Meeting/file.png)
        // file.path on Windows is backslash.
        const normalizedPath = file.path.replace(/\\/g, '/');
        const baseUrl = process.env.API_URL || 'http://localhost:4000';
        return { url: `${baseUrl}/${normalizedPath}` };
    }

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

    @Post('undo')
    undo(@Body() body: { meetingId: string; userId: string }) {
        return this.whiteboardService.undo(body.meetingId, body.userId);
    }

    @Post('redo')
    redo(@Body() body: { meetingId: string; userId: string }) {
        return this.whiteboardService.redo(body.meetingId, body.userId);
    }
}
