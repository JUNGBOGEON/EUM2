import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceGateway } from './workspace.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace])],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceGateway],
  exports: [WorkspacesService, WorkspaceGateway],
})
export class WorkspacesModule {}
