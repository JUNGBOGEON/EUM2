import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Dynamic prompt function - injects current date
const getSummarySystemPrompt = (currentDate: string) => `당신은 기업용 협업 툴 'EUM'의 전문 AI 프로젝트 매니저입니다.
당신의 임무는 회의 녹취록(Transcript)을 분석하여 팀원들이 즉시 업무에 착수할 수 있도록 명확하고 구조화된 회의록(Minutes)을 작성하는 것입니다.

[현재 날짜]
${currentDate}

[지시사항]
1. 어조: 비즈니스적이고, 객관적이며, 간결한 '해요체' 또는 '하십시오체'를 사용하세요.
2. 언어: 입력된 회의의 주 언어(대부분 한국어)로 작성하세요.
3. 핵심 파악: 잡담이나 불필요한 추임새는 제거하고, '결정된 사항'과 '할 일'에 집중하세요.
4. 일정 추출: 날짜나 마감기한이 언급되었다면 반드시 명시하세요. 연도가 명시되지 않은 경우 현재 연도(${currentDate.split('년')[0]}년)를 기준으로 합니다. 절대로 과거 연도를 임의로 추측하지 마세요.
5. STT 오류 교정: 음성 인식(STT) 특성상 동음이의어나 오타가 있을 수 있습니다. 문맥을 파악하여 올바른 단어로 교정하세요.
   - 예: "만주하시길" → "완주하시길", "내 오기" → "5기" 등
   - 한글 발음이 비슷한 단어들을 문맥에 맞게 교정하세요.

[출력 형식]
반드시 아래의 Markdown 포맷을 따르세요:

# [회의 주제 또는 자동 생성된 적절한 제목]

## 1. 3줄 요약
- (회의의 전체 맥락을 3줄 이내로 핵심만 요약)

## 2. 주요 논의 안건
- (논의된 주제별로 불렛포인트 정리)

## 3. 결정 사항 (Decision)
- (확정된 의사결정 내용)
- (반려되거나 보류된 내용)

## 4. 액션 아이템 (Action Items)
| 담당자 | 할 일 | 마감기한(언급 시) |
| :--- | :--- | :--- |
| (이름) | (구체적인 작업 내용) | (YYYY-MM-DD 또는 '미정') |

## 5. 기술적/비즈니스 메모 (선택)
- (개발 스택, 마케팅 예산 등 구체적인 수치나 기술 용어가 나왔을 경우 기록)`;

@Injectable()
export class BedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private readonly bedrockClient: BedrockRuntimeClient;
  // Amazon Nova Pro APAC - 도쿄/서울 리전 자동 라우팅 (별도 승인 불필요)
  private readonly modelId = 'apac.amazon.nova-pro-v1:0';

  constructor(private configService: ConfigService) {
    // ap-northeast-2 (서울)
    const region =
      this.configService.get<string>('AWS_BEDROCK_REGION') || 'ap-northeast-2';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not configured for Bedrock');
    }

    this.bedrockClient = new BedrockRuntimeClient({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });

    this.logger.log(`BedrockService initialized with region: ${region}`);
  }

  /**
   * 발화 스크립트를 기반으로 회의 요약을 생성합니다.
   * @param transcript 포맷팅된 발화 스크립트
   * @returns 생성된 마크다운 요약
   */
  async generateSummary(transcript: string): Promise<string> {
    try {
      this.logger.log('Generating meeting summary with Bedrock Claude...');

      // Generate current date in Korean format
      const now = new Date();
      const currentDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
      const systemPrompt = getSummarySystemPrompt(currentDate);

      const command = new ConverseCommand({
        modelId: this.modelId,
        system: [{ text: systemPrompt }],
        messages: [
          {
            role: 'user',
            content: [
              {
                text: `다음은 회의 녹취록입니다. 위 지시사항에 따라 회의록을 작성해주세요.\n\n${transcript}`,
              },
            ],
          },
        ],
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.3,
        },
      });

      const response = await this.bedrockClient.send(command);

      const outputText =
        response.output?.message?.content?.[0]?.text || '';

      if (!outputText) {
        throw new Error('Bedrock returned empty response');
      }

      this.logger.log('Meeting summary generated successfully');
      return outputText;
    } catch (error) {
      this.logger.error('Failed to generate summary with Bedrock', error);
      throw error;
    }
  }
}
