import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * 이벤트 타입 생성 DTO
 */
export class CreateEventTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color (e.g., #3b82f6)',
  })
  color: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}

/**
 * 이벤트 타입 수정 DTO
 */
export class UpdateEventTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color (e.g., #3b82f6)',
  })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}
