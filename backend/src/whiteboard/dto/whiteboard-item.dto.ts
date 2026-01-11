import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WhiteboardItemType } from '../entities/whiteboard-item.entity';

/**
 * 변환 정보 DTO
 */
export class TransformDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsOptional()
  @IsNumber()
  scaleX?: number;

  @IsOptional()
  @IsNumber()
  scaleY?: number;

  @IsOptional()
  @IsNumber()
  rotation?: number;
}

/**
 * 화이트보드 아이템 생성 DTO
 */
export class CreateWhiteboardItemDto {
  @IsString()
  @IsNotEmpty()
  meetingId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(WhiteboardItemType)
  type: WhiteboardItemType;

  @IsObject()
  data: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransformDto)
  transform?: TransformDto;

  @IsOptional()
  @IsNumber()
  zIndex?: number;
}

/**
 * 화이트보드 아이템 업데이트 DTO
 */
export class UpdateWhiteboardItemDto {
  @IsOptional()
  @IsEnum(WhiteboardItemType)
  type?: WhiteboardItemType;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransformDto)
  transform?: TransformDto;

  @IsOptional()
  @IsNumber()
  zIndex?: number;

  @IsOptional()
  isDeleted?: boolean;
}

/**
 * Undo 요청 DTO
 */
export class UndoRequestDto {
  @IsString()
  @IsNotEmpty()
  meetingId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
