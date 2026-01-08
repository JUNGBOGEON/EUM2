// 트랜스크립션 항목 타입
export interface TranscriptItem {
  id: string;
  speakerName: string;
  speakerId: string;
  speakerProfileImage?: string;
  text: string;
  timestamp: number; // 밀리초 (미팅 시작 기준 경과 시간)
  isPartial: boolean;
}

// 미팅 정보 타입
export interface MeetingInfo {
  id: string;
  title: string;
  chimeMeetingId: string;
  hostId: string;
  externalMeetingId?: string;
  mediaPlacement?: Record<string, unknown>;
  mediaRegion?: string;
  startedAt?: string;
}

// 장치 관리 상태
export interface DeviceState {
  devicesInitialized: boolean;
  permissionError: string | null;
  videoDevices: MediaDeviceInfo[];
  audioInputDevices: MediaDeviceInfo[];
  selectedVideoDevice: string;
  selectedAudioDevice: string;
}

// 트랜스크립션 상태
export interface TranscriptionState {
  transcripts: TranscriptItem[];
  isTranscribing: boolean;
  showTranscript: boolean;
}

// 참가자 정보 (백엔드에서 가져옴)
export interface ParticipantInfo {
  id: string;
  chimeAttendeeId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
}
