/**
 * AWS Transcribe 지원 언어 목록
 */
export interface TranscriptionLanguage {
  code: string;
  name: string;
  flag: string;
}

export const TRANSCRIPTION_LANGUAGES: TranscriptionLanguage[] = [
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
];

export const DEFAULT_LANGUAGE_CODE = 'ko-KR';
