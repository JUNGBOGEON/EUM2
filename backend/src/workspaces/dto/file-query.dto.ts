import { IsOptional, IsEnum, IsInt, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FileType } from '../entities/workspace-file.entity';

export class FileQueryDto {
  @IsOptional()
  @IsEnum(FileType)
  type?: FileType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsUUID()
  cursor?: string;
}
