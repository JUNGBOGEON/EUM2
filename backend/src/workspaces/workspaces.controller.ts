import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceDto, @Req() req: any) {
    return this.workspacesService.create(createWorkspaceDto, req.user.id);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.workspacesService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: Partial<CreateWorkspaceDto>,
  ) {
    return this.workspacesService.update(id, updateWorkspaceDto);
  }

  @Patch(':id')
  patch(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: Partial<CreateWorkspaceDto>,
  ) {
    return this.workspacesService.update(id, updateWorkspaceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workspacesService.remove(id);
  }
}
