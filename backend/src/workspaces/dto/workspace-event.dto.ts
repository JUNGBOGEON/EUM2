import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
  IsUUID,
  Min,
} from 'class-validator';
import { RecurrenceType } from '../entities/workspace-event.entity';

/**
 * 이벤트 생성 DTO
 */
export class CreateWorkspaceEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  eventTypeId?: string; // 커스텀 이벤트 타입 ID

  @IsOptional()
  @IsString()
  color?: string; // 레거시 호환 또는 타입 없이 직접 색상 지정

  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence?: RecurrenceType;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reminderMinutes?: number;

  @IsOptional()
  @IsUUID()
  meetingSessionId?: string;
}

/**
 * 이벤트 수정 DTO
 */
export class UpdateWorkspaceEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  eventTypeId?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence?: RecurrenceType;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reminderMinutes?: number;

  @IsOptional()
  @IsUUID()
  meetingSessionId?: string;
}

/**
 * 이벤트 조회 필터 DTO
 */
export class GetEventsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string; // 조회 시작일

  @IsOptional()
  @IsDateString()
  endDate?: string; // 조회 종료일

  @IsOptional()
  @IsUUID()
  eventTypeId?: string; // 이벤트 타입 필터
}
