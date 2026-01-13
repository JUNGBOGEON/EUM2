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

/**
 * Amazon Polly TTS 음성 목록
 * Neural 음성을 우선 사용 (더 자연스러운 음성)
 */
export interface PollyVoiceOption {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  isNeural: boolean;
}

export const POLLY_VOICES: Record<string, PollyVoiceOption[]> = {
  'ko-KR': [
    { id: 'Seoyeon', name: '서연 (Seoyeon)', gender: 'Female', isNeural: true },
  ],
  'en-US': [
    { id: 'Joanna', name: 'Joanna', gender: 'Female', isNeural: true },
    { id: 'Matthew', name: 'Matthew', gender: 'Male', isNeural: true },
    { id: 'Ivy', name: 'Ivy', gender: 'Female', isNeural: true },
    { id: 'Amy', name: 'Amy (British)', gender: 'Female', isNeural: true },
  ],
  'ja-JP': [
    { id: 'Takumi', name: '拓海 (Takumi)', gender: 'Male', isNeural: true },
    { id: 'Mizuki', name: '瑞樹 (Mizuki)', gender: 'Female', isNeural: false },
  ],
  'zh-CN': [
    { id: 'Zhiyu', name: '知雨 (Zhiyu)', gender: 'Female', isNeural: true },
  ],
};

/**
 * 언어별 기본 음성
 */
export const DEFAULT_POLLY_VOICES: Record<string, string> = {
  'ko-KR': 'Seoyeon',
  'en-US': 'Joanna',
  'ja-JP': 'Takumi',
  'zh-CN': 'Zhiyu',
};

/**
 * 언어 코드로 기본 음성 가져오기
 */
export function getDefaultPollyVoice(languageCode: string): string {
  return DEFAULT_POLLY_VOICES[languageCode] || 'Joanna';
}

/**
 * 언어 코드로 사용 가능한 음성 목록 가져오기
 */
export function getPollyVoices(languageCode: string): PollyVoiceOption[] {
  return POLLY_VOICES[languageCode] || [];
}
