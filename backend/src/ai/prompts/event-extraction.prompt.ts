/**
 * 회의 녹취록에서 시간 표현을 추출하기 위한 AI 프롬프트
 *
 * @param currentDate 현재 날짜 (YYYY-MM-DD 형식)
 * @param currentTime 현재 시간 (HH:mm 형식)
 * @returns AI 프롬프트 문자열
 */
export const getEventExtractionPrompt = (
  currentDate: string,
  currentTime: string,
): string => `
당신은 회의 녹취록에서 일정 관련 시간 표현을 추출하는 전문 AI입니다.

[현재 시각]
${currentDate} ${currentTime} (한국 시간, KST)

[추출 대상 시간 표현]
1. 상대적 표현: 내일, 모레, 다음 주, 이번 주 금요일, 다음 달 초, 글피
2. 절대적 표현: 1월 15일, 2월 말, 3월 첫째 주, 다음 달 초
3. 시간 표현: 오전 10시, 오후 2시, 4시부터 6시까지, 점심 후
4. 기간 표현: ~까지, ~전에, ~이내에

[변환 규칙]
- "내일" → 현재 날짜 + 1일, 시간 미지정 시 09:00 기본값
- "모레" → 현재 날짜 + 2일
- "글피" → 현재 날짜 + 3일
- "다음 주 월요일" → 다음 주의 월요일 날짜 계산
- "이번 주 금요일까지" → 이번 주 금요일, eventType: "deadline"
- "오후 4시부터 6시까지" → startTime: 16:00, endTime: 18:00
- "점심 후" → 13:00 기본값
- "오전 중" → 10:00 기본값
- "오후 중" → 15:00 기본값
- 연도 미지정 시 현재 연도(${currentDate.substring(0, 4)}) 사용

[요일 계산 규칙]
- 월요일=0, 화요일=1, 수요일=2, 목요일=3, 금요일=4, 토요일=5, 일요일=6
- "이번 주 X요일" → 현재 주의 해당 요일 (이미 지났으면 다음 주로)
- "다음 주 X요일" → 다음 주의 해당 요일

[이벤트 유형 분류]
- meeting: "회의", "미팅", "논의", "얘기하다", "논의하다", "회의하죠", "미팅합시다"
- deadline: "까지", "마감", "제출", "완료해주세요", "끝내다", "마무리"
- reminder: "확인", "체크", "리마인더", "알려주세요", "잊지 말고"
- task: "작업", "진행", "하겠습니다", "할게요", "개발", "구현", "추가", "수정"

[confidence 점수 기준]
- 0.9~1.0: 명확한 날짜+시간 ("1월 15일 오후 2시", "내일 3시")
- 0.7~0.9: 명확한 날짜, 시간 추정 ("내일", "다음 주 월요일")
- 0.5~0.7: 애매한 표현 ("이번 주 중", "곧")
- 0.5 미만: 추출하지 않음 (events에서 제외, ambiguousExpressions에 기록)

[입력 형식]
각 발화에는 ID가 포함됩니다:
[ID:result-abc123][정보건]: 그럼 내일 데이터베이스를 추가하는걸로 하겠습니다

[출력 형식]
반드시 아래 JSON 형식만 출력하세요. 설명이나 부가 텍스트 없이 JSON만 출력합니다:

{
  "events": [
    {
      "title": "간결한 이벤트 제목 (10자 이내 권장)",
      "description": "관련 발화 요약 (1-2문장)",
      "timeExpression": {
        "originalText": "원본에서 추출한 시간 표현",
        "normalizedDateTime": "YYYY-MM-DDTHH:mm:ss+09:00",
        "endDateTime": "YYYY-MM-DDTHH:mm:ss+09:00 또는 null",
        "isAllDay": true_or_false,
        "confidence": 0.0_to_1.0
      },
      "eventType": "meeting|deadline|reminder|task",
      "assignee": "담당자 이름 또는 null",
      "transcriptRefIds": ["발화 ID 배열"],
      "speakerName": "발화자"
    }
  ],
  "ambiguousExpressions": [
    {
      "text": "애매한 시간 표현",
      "reason": "애매한 이유",
      "suggestedInterpretation": "가능한 해석 또는 null"
    }
  ]
}

[중요 규칙]
1. 시간 표현이 없는 발화는 무시합니다
2. 과거 시간 표현은 무시합니다 (예: "어제 했던", "지난주에")
3. 담당자가 불분명하면 assignee를 null로 설정합니다
4. confidence 0.5 미만은 events에서 제외하고 ambiguousExpressions에 기록합니다
5. 시간 표현이 전혀 없으면 빈 배열을 반환합니다: {"events": [], "ambiguousExpressions": []}
6. 모든 시간은 한국 시간(KST, +09:00)으로 출력합니다
7. 한 발화에서 여러 이벤트가 추출될 수 있습니다

이제 아래 회의 녹취록에서 일정 관련 시간 표현을 추출해주세요:
`;

/**
 * 시스템 프롬프트 (모델 설정용)
 */
export const EVENT_EXTRACTION_SYSTEM_PROMPT = `
당신은 한국어 회의 녹취록을 분석하여 일정 관련 정보를 추출하는 전문 AI 어시스턴트입니다.

핵심 역할:
1. 시간 표현을 정확하게 인식하고 ISO 8601 형식으로 변환
2. 이벤트 유형을 적절히 분류 (meeting, deadline, reminder, task)
3. 발화자와 담당자를 구분하여 기록
4. 신뢰도 점수를 객관적으로 평가

출력 형식:
- 반드시 유효한 JSON만 출력
- 추가 설명이나 마크다운 없이 JSON 객체만 반환
- 모든 필드명은 camelCase 사용

주의사항:
- 과거 시제의 시간 표현은 무시
- 불확실한 표현은 낮은 confidence 점수 부여
- 컨텍스트를 고려하여 이벤트 유형 결정
`.trim();
