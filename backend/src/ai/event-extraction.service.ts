import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { WorkspaceEventsService } from '../workspaces/workspace-events.service';
import { WorkspaceEventTypesService } from '../workspaces/workspace-event-types.service';
import { WorkspaceEventType } from '../workspaces/entities/workspace-event-type.entity';
import {
  ExtractedCalendarEvent,
  AIEventExtractionResponse,
  EventCreationResult,
} from './interfaces/extracted-event.interface';
import {
  getEventExtractionPrompt,
  EVENT_EXTRACTION_SYSTEM_PROMPT,
} from './prompts/event-extraction.prompt';

@Injectable()
export class EventExtractionService {
  private readonly logger = new Logger(EventExtractionService.name);
  private readonly bedrockClient: BedrockRuntimeClient;
  private readonly modelId = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';

  constructor(
    private configService: ConfigService,
    private workspaceEventsService: WorkspaceEventsService,
    private workspaceEventTypesService: WorkspaceEventTypesService,
  ) {
    const region =
      this.configService.get<string>('AWS_BEDROCK_REGION') || 'ap-northeast-2';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    this.bedrockClient = new BedrockRuntimeClient({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });

    this.logger.log('EventExtractionService initialized');
  }

  /**
   * 회의 녹취록에서 시간 표현을 추출하고 캘린더 이벤트를 생성합니다.
   *
   * @param sessionId 회의 세션 ID
   * @param workspaceId 워크스페이스 ID
   * @param hostId 호스트(생성자) ID
   * @param formattedTranscript 포맷팅된 녹취록 ([ID:xxx][화자]: 내용)
   * @returns 생성된 이벤트 수 및 미확정 이벤트 수
   */
  async extractAndCreateEvents(
    sessionId: string,
    workspaceId: string,
    hostId: string,
    formattedTranscript: string,
  ): Promise<EventCreationResult> {
    this.logger.log(`Extracting events from session ${sessionId}`);

    // 1. AI로 시간 표현 추출
    const extractionResult =
      await this.extractTimeExpressions(formattedTranscript);

    if (extractionResult.events.length === 0) {
      this.logger.log(`No time expressions found in session ${sessionId}`);
      return { created: 0, pending: 0, createdEventIds: [] };
    }

    this.logger.log(`Found ${extractionResult.events.length} time expressions`);

    // 2. 이벤트 타입 목록 조회
    const eventTypes = await this.workspaceEventTypesService.findAll(
      workspaceId,
      hostId,
    );

    const createdEventIds: string[] = [];
    let created = 0;
    let pending = 0;

    // 3. 각 추출된 이벤트 처리
    for (const extractedEvent of extractionResult.events) {
      try {
        const eventTypeId = this.mapEventType(
          extractedEvent.eventType,
          eventTypes,
        );

        if (extractedEvent.timeExpression.confidence >= 0.7) {
          // 자동 생성 (높은 신뢰도)
          const event = await this.workspaceEventsService.create(
            workspaceId,
            {
              title: extractedEvent.title,
              description: this.buildDescription(extractedEvent, sessionId),
              eventTypeId,
              startTime: extractedEvent.timeExpression.normalizedDateTime,
              endTime: extractedEvent.timeExpression.endDateTime,
              isAllDay: extractedEvent.timeExpression.isAllDay,
              meetingSessionId: sessionId,
              reminderMinutes: 15,
            },
            hostId,
          );

          createdEventIds.push(event.id);
          created++;

          this.logger.log(
            `Created event: "${extractedEvent.title}" (confidence: ${extractedEvent.timeExpression.confidence})`,
          );
        } else {
          // 미확정 이벤트 (낮은 신뢰도)
          // TODO: 추후 미확정 이벤트 저장 로직 구현 (Redis 또는 별도 테이블)
          pending++;

          this.logger.log(
            `Pending event (low confidence ${extractedEvent.timeExpression.confidence}): "${extractedEvent.title}"`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to create event "${extractedEvent.title}":`,
          error,
        );
      }
    }

    this.logger.log(
      `Event extraction complete: ${created} created, ${pending} pending for session ${sessionId}`,
    );

    return { created, pending, createdEventIds };
  }

  /**
   * AI를 사용하여 녹취록에서 시간 표현을 추출합니다.
   */
  async extractTimeExpressions(
    transcript: string,
  ): Promise<AIEventExtractionResponse> {
    try {
      // KST (UTC+9) 기준으로 현재 날짜/시간 계산
      const now = new Date();
      const kstOffset = 9 * 60; // KST는 UTC+9
      const kstDate = new Date(now.getTime() + kstOffset * 60 * 1000);

      const currentDate = kstDate.toISOString().split('T')[0]; // YYYY-MM-DD (KST)
      const currentTime = kstDate.toISOString().split('T')[1].substring(0, 5); // HH:mm (KST)

      // 요일 계산 (0=일요일, 1=월요일, ..., 6=토요일)
      const dayNames = [
        '일요일',
        '월요일',
        '화요일',
        '수요일',
        '목요일',
        '금요일',
        '토요일',
      ];
      const currentDayOfWeek = dayNames[kstDate.getUTCDay()];

      const userPrompt = getEventExtractionPrompt(
        currentDate,
        currentTime,
        currentDayOfWeek,
      );

      const command = new ConverseCommand({
        modelId: this.modelId,
        system: [{ text: EVENT_EXTRACTION_SYSTEM_PROMPT }],
        messages: [
          {
            role: 'user',
            content: [
              {
                text: `${userPrompt}\n\n${transcript}`,
              },
            ],
          },
        ],
        inferenceConfig: {
          maxTokens: 4096,
          temperature: 0.1, // 낮은 temperature로 일관된 출력
        },
      });

      const response = await this.bedrockClient.send(command);

      const outputText = response.output?.message?.content?.[0]?.text || '';

      if (!outputText) {
        this.logger.warn(
          'Bedrock returned empty response for event extraction',
        );
        return { events: [], ambiguousExpressions: [] };
      }

      return this.parseAIResponse(outputText);
    } catch (error) {
      this.logger.error('Failed to extract time expressions:', error);
      return { events: [], ambiguousExpressions: [] };
    }
  }

  /**
   * AI 응답을 파싱합니다.
   */
  private parseAIResponse(response: string): AIEventExtractionResponse {
    try {
      let jsonStr = response.trim();

      // 마크다운 코드 블록 제거
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // JSON 객체 경계 찾기
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.slice(startIdx, endIdx + 1);
      }

      const parsed = JSON.parse(jsonStr);

      // 유효성 검증
      const events: ExtractedCalendarEvent[] = Array.isArray(parsed.events)
        ? parsed.events.filter((e: any) => this.isValidEvent(e))
        : [];

      const ambiguousExpressions = Array.isArray(parsed.ambiguousExpressions)
        ? parsed.ambiguousExpressions
        : [];

      return { events, ambiguousExpressions };
    } catch (parseError) {
      this.logger.warn('Failed to parse AI response as JSON:', parseError);
      return { events: [], ambiguousExpressions: [] };
    }
  }

  /**
   * 추출된 이벤트의 유효성을 검증합니다.
   */
  private isValidEvent(event: any): event is ExtractedCalendarEvent {
    return (
      typeof event.title === 'string' &&
      event.title.length > 0 &&
      event.timeExpression &&
      typeof event.timeExpression.normalizedDateTime === 'string' &&
      typeof event.timeExpression.confidence === 'number' &&
      event.timeExpression.confidence >= 0.5 // 최소 신뢰도
    );
  }

  /**
   * 추출된 이벤트 유형을 워크스페이스 이벤트 타입 ID로 매핑합니다.
   */
  private mapEventType(
    extractedType: string,
    eventTypes: WorkspaceEventType[],
  ): string | undefined {
    // 이벤트 유형 → 기본 타입 이름 매핑
    const typeMap: Record<string, string> = {
      meeting: '회의',
      deadline: '마감일',
      reminder: '리마인더',
      task: '기타',
    };

    const targetName = typeMap[extractedType] || '기타';
    const matchedType = eventTypes.find((t) => t.name === targetName);

    return matchedType?.id;
  }

  /**
   * 이벤트 설명을 생성합니다.
   */
  private buildDescription(
    event: ExtractedCalendarEvent,
    sessionId: string,
  ): string {
    const confidencePercent = Math.round(event.timeExpression.confidence * 100);
    const confidenceEmoji =
      confidencePercent >= 90 ? '🟢' : confidencePercent >= 70 ? '🟡' : '🟠';

    const eventTypeLabels: Record<string, string> = {
      meeting: '📅 회의',
      deadline: '⏰ 마감',
      reminder: '🔔 리마인더',
      task: '✅ 작업',
    };
    const eventTypeLabel = eventTypeLabels[event.eventType] || '📌 일정';

    const parts: string[] = [];

    // 헤더
    parts.push(`${eventTypeLabel}`);
    parts.push('');

    // 원본 설명
    if (event.description) {
      parts.push(`> ${event.description}`);
      parts.push('');
    }

    // 상세 정보 테이블 형식
    parts.push('**📋 상세 정보**');
    parts.push(`• 발화자: ${event.speakerName}`);
    if (event.assignee) {
      parts.push(`• 담당자: ${event.assignee}`);
    }
    parts.push(`• 언급된 시간: "${event.timeExpression.originalText}"`);
    parts.push(`• 추출 신뢰도: ${confidenceEmoji} ${confidencePercent}%`);

    // 푸터
    parts.push('');
    parts.push('---');
    parts.push(`🤖 *회의 중 AI가 자동 추출한 일정입니다*`);

    return parts.join('\n');
  }
}
