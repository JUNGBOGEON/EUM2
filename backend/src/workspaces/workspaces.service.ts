import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private workspacesRepository: Repository<Workspace>,
  ) {}

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    ownerId: string,
  ): Promise<Workspace> {
    const workspace = this.workspacesRepository.create({
      ...createWorkspaceDto,
      ownerId,
    });
    return this.workspacesRepository.save(workspace);
  }

  async findAllByUser(ownerId: string): Promise<Workspace[]> {
    return this.workspacesRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Workspace> {
    const workspace = await this.workspacesRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }
    return workspace;
  }

  async update(
    id: string,
    updateData: Partial<CreateWorkspaceDto>,
  ): Promise<Workspace> {
    await this.workspacesRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.workspacesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }
  }
}
