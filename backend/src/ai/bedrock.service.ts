import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Dynamic prompt function - injects current date (Legacy markdown-only output)
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

// New structured prompt with transcript references - Enhanced detailed version
const getSummarySystemPromptWithRefs = (currentDate: string) => `당신은 기업용 협업 툴 'EUM'의 전문 AI 프로젝트 매니저입니다.
당신의 임무는 회의 녹취록(Transcript)을 분석하여 팀원들이 즉시 업무에 착수할 수 있도록 **상세하고 포괄적인** 회의록을 작성하는 것입니다.

[현재 날짜]
${currentDate}

[핵심 원칙]
1. **상세함**: 간략한 요약보다 충분한 맥락과 세부사항을 포함하세요.
2. **발언자 구분**: 누가 어떤 의견을 냈는지 명확히 기록하세요.
3. **배경 설명**: 왜 그런 결정이 났는지, 어떤 논의 과정이 있었는지 포함하세요.
4. **실행 가능성**: 읽는 사람이 바로 행동할 수 있도록 구체적으로 작성하세요.

[작성 지침]
1. 어조: 비즈니스적이고, 객관적이며, '해요체' 또는 '하십시오체'를 사용하세요.
2. 언어: 입력된 회의의 주 언어(대부분 한국어)로 작성하세요.
3. 일정 추출: 날짜나 마감기한이 언급되면 반드시 명시하세요. 연도가 없으면 현재 연도(${currentDate.split('년')[0]}년) 기준입니다.
4. STT 오류 교정: 음성 인식 오류를 문맥에 맞게 교정하세요. (예: "만주하시길" → "완주하시길")
5. 발화 참조: 각 섹션의 transcriptRefs에 근거가 되는 발화 ID들을 포함하세요.

[입력 형식]
각 발화에는 고유 ID가 포함됩니다:
[ID:abc123][화자이름]: 발화 내용

[출력 형식 - 반드시 유효한 JSON으로 출력]
{
  "sections": [
    {
      "id": "title",
      "type": "title",
      "content": "# [회의 주제를 반영한 구체적인 제목]",
      "transcriptRefs": []
    },
    {
      "id": "summary-1",
      "type": "summary",
      "content": "## 1. 핵심 요약 (Executive Summary)\\n\\n이 회의에서는 [주요 주제]에 대해 논의했습니다.\\n\\n**주요 결과:**\\n- [핵심 결과 1]: 구체적인 설명\\n- [핵심 결과 2]: 구체적인 설명\\n- [핵심 결과 3]: 구체적인 설명\\n\\n**회의 배경:** [왜 이 회의가 필요했는지 1-2문장]\\n\\n**다음 단계:** [즉시 필요한 후속 조치 요약]",
      "transcriptRefs": ["관련발화ID들"]
    },
    {
      "id": "agenda-1",
      "type": "agenda",
      "content": "## 2. 논의 안건 상세\\n\\n### 2.1 [첫 번째 안건명]\\n\\n**배경:** 이 안건이 논의된 이유나 맥락을 설명합니다.\\n\\n**주요 의견:**\\n- **[발언자A]**: 의견 내용을 상세히 기록\\n- **[발언자B]**: 다른 관점이나 보완 의견\\n- **[발언자C]**: 추가 제안이나 우려사항\\n\\n**논의 결과:** 합의된 내용 또는 추가 논의 필요 여부\\n\\n---\\n\\n### 2.2 [두 번째 안건명]\\n\\n**배경:** ...\\n\\n**주요 의견:**\\n- **[발언자]**: ...\\n\\n**논의 결과:** ...",
      "transcriptRefs": ["관련발화ID들"]
    },
    {
      "id": "decision-1",
      "type": "decision",
      "content": "## 3. 결정 사항\\n\\n### ✅ 확정된 결정\\n\\n| 결정 내용 | 결정 배경/근거 | 결정자 |\\n| :--- | :--- | :--- |\\n| [결정1 내용] | [왜 이렇게 결정했는지] | [누가 최종 결정] |\\n| [결정2 내용] | [배경 설명] | [결정자] |\\n\\n### ⏸️ 보류/추가 검토 필요\\n\\n- [보류된 사항]: 보류 사유 및 재논의 예정일",
      "transcriptRefs": ["관련발화ID들"]
    },
    {
      "id": "action-1",
      "type": "action_item",
      "content": "## 4. 액션 아이템\\n\\n| 우선순위 | 담당자 | 할 일 | 마감기한 | 관련 논의 |\\n| :---: | :--- | :--- | :--- | :--- |\\n| 🔴 높음 | [이름] | [구체적인 작업 내용] | YYYY-MM-DD | [어떤 논의에서 나온 건지] |\\n| 🟡 중간 | [이름] | [작업 내용] | YYYY-MM-DD | [관련 맥락] |\\n| 🟢 낮음 | [이름] | [작업 내용] | 미정 | [관련 맥락] |\\n\\n**총 액션 아이템:** N개 (높음: n개, 중간: n개, 낮음: n개)",
      "transcriptRefs": ["관련발화ID들"]
    },
    {
      "id": "unresolved-1",
      "type": "note",
      "content": "## 5. 미해결 이슈 및 후속 논의\\n\\n### 🔄 추가 논의 필요\\n\\n- **[이슈1]**: 미해결 사유, 다음 회의에서 논의 예정\\n- **[이슈2]**: 추가 정보 필요, [담당자]가 조사 후 공유 예정\\n\\n### ❓ 열린 질문\\n\\n- [회의 중 답변되지 않은 질문들]",
      "transcriptRefs": ["관련발화ID들"]
    },
    {
      "id": "data-1",
      "type": "note",
      "content": "## 6. 주요 수치 및 데이터\\n\\n| 항목 | 수치/내용 | 비고 |\\n| :--- | :--- | :--- |\\n| [예산] | [금액] | [맥락] |\\n| [일정] | [기간] | [세부사항] |\\n| [기술 스펙] | [내용] | [관련 결정] |",
      "transcriptRefs": ["관련발화ID들"]
    }
  ]
}

[중요 규칙]
1. 반드시 유효한 JSON만 출력하세요. 다른 텍스트는 포함하지 마세요.
2. 각 섹션의 content는 마크다운 형식으로 작성합니다.
3. transcriptRefs에는 해당 섹션 작성에 참고한 발화 ID들을 배열로 포함합니다.
4. **내용이 없는 섹션은 생략하세요** (예: 수치 데이터가 없으면 섹션 6 생략)
5. **발언자별 의견을 구분하여 기록하세요** - 누가 어떤 말을 했는지 명확히
6. **배경과 맥락을 포함하세요** - 단순 나열이 아닌 "왜"를 설명
7. **구체적으로 작성하세요** - 모호한 표현 대신 실행 가능한 수준으로
8. 회의 내용이 짧더라도 최대한 상세하게 분석하여 작성하세요.
9. **음성 인식 오류 보정**: 문맥상 명백한 음성 인식 오류는 자연스럽게 보정하세요.
   - 예: "제기 함수" → "재귀 함수", "어레이" → "배열" 또는 "Array"
   - 기술 용어, 고유명사, 전문 용어의 발음 오류를 맥락에 맞게 수정
   - 단, **확실하지 않은 경우 원문 그대로 유지** - 과도한 보정으로 의미가 변질되지 않도록 주의
   - 이름, 회사명 등 고유명사는 특히 조심스럽게 처리
10. **중요 내용 강조 표시**: 마크다운 강조를 활용하여 가독성을 높이세요.
   - **굵은 글씨**: 핵심 결정사항, 중요 키워드, 담당자 이름 등 (예: **DB 마이그레이션 확정**)
   - *기울임 글씨*: 주의가 필요한 사항, 리스크, 마감일 등 (예: *1월 15일까지 완료 필요*)
   - 적절히 사용하여 한눈에 중요 정보를 파악할 수 있도록 합니다`;

// Structured summary output interface
export interface StructuredSummary {
  markdown: string;
  sections: SummarySection[];
}

export interface SummarySection {
  id: string;
  type: 'title' | 'summary' | 'agenda' | 'decision' | 'action_item' | 'note' | 'unresolved' | 'data';
  content: string;
  transcriptRefs: string[];
}

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

  /**
   * 발화 스크립트를 기반으로 구조화된 회의 요약을 생성합니다.
   * 각 섹션은 참조된 발화 ID를 포함합니다.
   * @param transcript 포맷팅된 발화 스크립트 (ID 포함)
   * @returns 구조화된 요약 (JSON)
   */
  async generateSummaryWithRefs(transcript: string): Promise<StructuredSummary> {
    try {
      this.logger.log('Generating structured meeting summary with transcript references...');

      // Generate current date in Korean format
      const now = new Date();
      const currentDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
      const systemPrompt = getSummarySystemPromptWithRefs(currentDate);

      const command = new ConverseCommand({
        modelId: this.modelId,
        system: [{ text: systemPrompt }],
        messages: [
          {
            role: 'user',
            content: [
              {
                text: `다음은 회의 녹취록입니다. 위 지시사항에 따라 JSON 형식으로 회의록을 작성해주세요.\n\n${transcript}`,
              },
            ],
          },
        ],
        inferenceConfig: {
          maxTokens: 8192, // Increased for detailed JSON output
          temperature: 0.2, // Lower temperature for more consistent JSON
        },
      });

      const response = await this.bedrockClient.send(command);

      const outputText =
        response.output?.message?.content?.[0]?.text || '';

      if (!outputText) {
        throw new Error('Bedrock returned empty response');
      }

      // Parse the JSON response
      const structuredSummary = this.parseStructuredResponse(outputText);

      this.logger.log('Structured meeting summary generated successfully');
      return structuredSummary;
    } catch (error) {
      this.logger.error('Failed to generate structured summary with Bedrock', error);
      throw error;
    }
  }

  /**
   * AI 응답을 파싱하여 구조화된 요약으로 변환합니다.
   */
  private parseStructuredResponse(response: string): StructuredSummary {
    try {
      // Try to extract JSON from the response (in case there's extra text)
      let jsonStr = response.trim();

      // If response contains markdown code blocks, extract the JSON
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Find JSON object boundaries
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.slice(startIdx, endIdx + 1);
      }

      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (!parsed.sections || !Array.isArray(parsed.sections)) {
        throw new Error('Invalid response structure: missing sections array');
      }

      // Build markdown from sections
      const markdown = parsed.sections
        .map((s: SummarySection) => s.content)
        .join('\n\n');

      // Ensure each section has required fields
      const sections: SummarySection[] = parsed.sections.map((s: any, idx: number) => ({
        id: s.id || `section-${idx}`,
        type: s.type || 'note',
        content: s.content || '',
        transcriptRefs: Array.isArray(s.transcriptRefs) ? s.transcriptRefs : [],
      }));

      return { markdown, sections };
    } catch (parseError) {
      this.logger.warn('Failed to parse JSON response, falling back to markdown', parseError);

      // Fallback: treat entire response as markdown with no references
      return {
        markdown: response,
        sections: [{
          id: 'full-content',
          type: 'note',
          content: response,
          transcriptRefs: [],
        }],
      };
    }
  }
}
