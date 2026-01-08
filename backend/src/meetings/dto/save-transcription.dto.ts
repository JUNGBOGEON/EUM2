import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * AWS Chime TranscriptItem에서 추출한 단일 발화 항목
 */
export class TranscriptItemDto {
  @IsString()
  type: 'pronunciation' | 'punctuation';

  @IsNumber()
  startTimeMs: number;

  @IsNumber()
  endTimeMs: number;

  @IsString()
  content: string;

  @IsNumber()
  @IsOptional()
  confidence?: number;

  @IsBoolean()
  @IsOptional()
  stable?: boolean;

  @IsString()
  attendeeId: string;

  @IsString()
  @IsOptional()
  externalUserId?: string;
}

/**
 * AWS Chime TranscriptResult에서 추출한 발화 결과
 */
export class SaveTranscriptionDto {
  @IsString()
  @IsOptional()
  meetingId?: string;

  // Chime Result ID (부분 결과 업데이트 추적)
  @IsString()
  resultId: string;

  // 부분 결과 여부
  @IsBoolean()
  isPartial: boolean;

  // 전체 텍스트 (TranscriptAlternative.transcript)
  @IsString()
  transcript: string;

  // 발화자 Chime Attendee ID
  @IsString()
  attendeeId: string;

  // 발화자 External User ID
  @IsString()
  @IsOptional()
  externalUserId?: string;

  // 시작/종료 시간 (밀리초)
  @IsNumber()
  startTimeMs: number;

  @IsNumber()
  endTimeMs: number;

  // 언어 코드
  @IsString()
  @IsOptional()
  languageCode?: string;

  // 평균 신뢰도
  @IsNumber()
  @IsOptional()
  confidence?: number;

  // 안정화 여부
  @IsBoolean()
  @IsOptional()
  isStable?: boolean;

  // 개별 항목들 (단어별 상세 정보)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptItemDto)
  @IsOptional()
  items?: TranscriptItemDto[];
}

/**
 * 트랜스크립션 일괄 저장 DTO
 */
export class SaveTranscriptionBatchDto {
  @IsString()
  meetingId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveTranscriptionDto)
  transcriptions: SaveTranscriptionDto[];
}

/**
 * 트랜스크립션 상태 업데이트 DTO
 */
export class TranscriptionStatusDto {
  @IsString()
  meetingId: string;

  @IsString()
  status: 'started' | 'stopped' | 'interrupted' | 'resumed' | 'failed';

  @IsNumber()
  eventTimeMs: number;

  @IsString()
  @IsOptional()
  transcriptionRegion?: string;

  @IsString()
  @IsOptional()
  message?: string;
}
