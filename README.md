# EUM2 - AI-Powered Collaboration Platform

<div align="center">

**실시간 AI 음성 인식 및 번역을 지원하는 화상 회의 협업 플랫폼**

[![CI](https://github.com/your-org/EUM2/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/EUM2/actions/workflows/ci.yml)
[![Deploy](https://github.com/your-org/EUM2/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-org/EUM2/actions/workflows/deploy.yml)

[한국어](#한국어) | [English](#english)

</div>

---

## 한국어

### 프로젝트 소개

EUM2는 **KRAFTON JUNGLE** 교육 프로그램에서 개발된 AI 기반 실시간 협업 플랫폼입니다. Amazon Chime SDK를 활용한 화상 회의, AWS AI 서비스를 통한 실시간 음성 인식/번역, 그리고 OpenVoice 기반의 음성 복제 기술을 결합하여 언어 장벽 없는 글로벌 협업 환경을 제공합니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| **화상 회의** | Amazon Chime SDK 기반 고품질 비디오/오디오 스트리밍 |
| **실시간 음성 인식** | AWS Transcribe Streaming을 통한 실시간 자막 생성 |
| **실시간 번역** | AWS Translate를 활용한 다국어 실시간 번역 |
| **AI 회의 요약** | AWS Bedrock (Claude)을 활용한 회의 내용 자동 요약 |
| **음성 복제 TTS** | OpenVoice V2 기반 사용자 음성 복제 및 번역 음성 출력 |
| **화이트보드** | 실시간 협업 화이트보드 (Pixi.js 기반) |
| **워크스페이스** | 팀 기반 워크스페이스 관리 및 협업 |
| **채팅** | 실시간 텍스트 채팅 (Socket.io) |

### 기술 스택

#### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.1.1 | React 풀스택 프레임워크 (App Router) |
| React | 19.2.3 | UI 라이브러리 |
| TypeScript | 5.x | 정적 타입 언어 |
| Tailwind CSS | 4.x | 유틸리티 기반 CSS |
| Zustand | 5.0.9 | 상태 관리 |
| Socket.io Client | 4.8.3 | 실시간 통신 |
| Amazon Chime SDK | 3.29.0 | 화상 회의 SDK |
| Pixi.js | 8.15.0 | 2D 그래픽 (화이트보드) |
| Radix UI | - | 접근성 기반 UI 컴포넌트 |
| Framer Motion | 12.24.12 | 애니메이션 |

#### Backend
| 기술 | 버전 | 용도 |
|------|------|------|
| NestJS | 11.x | Node.js 백엔드 프레임워크 |
| TypeScript | 5.x | 정적 타입 언어 |
| TypeORM | 0.3.28 | ORM (PostgreSQL) |
| PostgreSQL | - | 관계형 데이터베이스 |
| Redis | - | 캐싱 및 세션 관리 |
| Socket.io | 4.8.3 | 실시간 통신 |
| Passport | 0.7.0 | 인증 (Google OAuth, JWT) |

#### AWS Services
| 서비스 | 용도 |
|--------|------|
| Amazon Chime SDK | 화상 회의 인프라 |
| AWS Transcribe Streaming | 실시간 음성 인식 |
| AWS Translate | 실시간 번역 |
| AWS Bedrock (Claude) | AI 회의 요약 |
| AWS Polly | 텍스트 음성 변환 |
| AWS S3 | 파일 스토리지 |
| AWS RDS | PostgreSQL 데이터베이스 |

#### AI Server (Python)
| 기술 | 버전 | 용도 |
|------|------|------|
| FastAPI | 0.104.0+ | Python 웹 프레임워크 |
| OpenVoice V2 | - | 음성 복제 TTS |
| PyTorch | 2.1.0+ | 딥러닝 프레임워크 |
| DeepFilterNet | 0.5.6+ | 오디오 노이즈 제거 |

### 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│                     Next.js 16 + React 19                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (NestJS 11)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │   Auth   │ │ Meetings │ │   Chat   │ │Whiteboard│            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │   AI     │ │  Users   │ │ Storage  │ │Workspace │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
│  PostgreSQL │   │    Redis    │   │   AI Server     │
│   (RDS)     │   │   (Cache)   │   │ (FastAPI/OpenVoice)│
└─────────────┘   └─────────────┘   └─────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │      AWS Services      │
              │  ┌────────┐ ┌────────┐ │
              │  │ Chime  │ │Transcribe│
              │  └────────┘ └────────┘ │
              │  ┌────────┐ ┌────────┐ │
              │  │Translate│ │Bedrock │ │
              │  └────────┘ └────────┘ │
              │  ┌────────┐ ┌────────┐ │
              │  │   S3   │ │ Polly  │ │
              │  └────────┘ └────────┘ │
              └────────────────────────┘
```

### 프로젝트 구조

```
EUM2/
├── frontend/                 # Next.js 프론트엔드
│   ├── app/                  # App Router 페이지
│   │   ├── api/              # API 라우트
│   │   ├── workspaces/       # 워크스페이스 페이지
│   │   ├── settings/         # 설정 페이지
│   │   ├── voice-enrollment/ # 음성 등록 페이지
│   │   └── ...
│   ├── components/           # 재사용 컴포넌트
│   ├── hooks/                # 커스텀 훅
│   ├── stores/               # Zustand 상태 관리
│   └── utils/                # 유틸리티 함수
│
├── backend/                  # NestJS 백엔드
│   ├── src/
│   │   ├── ai/               # AI 관련 모듈
│   │   ├── auth/             # 인증 모듈 (Google OAuth, JWT)
│   │   ├── chat/             # 채팅 모듈
│   │   ├── meetings/         # 화상회의 모듈
│   │   ├── users/            # 사용자 모듈
│   │   ├── whiteboard/       # 화이트보드 모듈
│   │   ├── workspaces/       # 워크스페이스 모듈
│   │   ├── storage/          # S3 스토리지 모듈
│   │   ├── redis/            # Redis 캐시 모듈
│   │   └── health/           # 헬스체크 모듈
│   └── test/                 # E2E 테스트
│
├── ai-server/                # Python AI 서버
│   ├── server.py             # 기본 TTS 서버
│   ├── server_openvoice_v2.py # OpenVoice V2 음성 복제 서버
│   └── requirements.txt      # Python 의존성
│
├── load-tests/               # 부하 테스트 (Artillery)
│   ├── scenarios/            # 테스트 시나리오
│   └── config/               # 테스트 설정
│
├── docs/                     # 문서
│
└── .github/
    └── workflows/            # GitHub Actions
        ├── ci.yml            # CI 파이프라인
        ├── deploy.yml        # 배포 파이프라인
        └── rollback.yml      # 롤백 파이프라인
```

### 시작하기

#### 사전 요구사항

- **Node.js** 20.x 이상
- **Python** 3.9 ~ 3.10 (AI 서버용)
- **PostgreSQL** 15.x 이상
- **Redis** 7.x 이상
- **AWS 계정** (Chime, Transcribe, Translate, Bedrock, S3, Polly 접근 권한)
- **Google Cloud Console** OAuth 2.0 클라이언트

#### 설치

1. **저장소 클론**
   ```bash
   git clone https://github.com/your-org/EUM2.git
   cd EUM2
   ```

2. **Backend 설정**
   ```bash
   cd backend
   cp .env.example .env
   # .env 파일에 환경 변수 설정
   npm install
   npm run start:dev
   ```

3. **Frontend 설정**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **AI Server 설정** (선택사항)
   ```bash
   cd ai-server
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python server_openvoice_v2.py
   ```

#### 환경 변수

Backend `.env` 파일 주요 설정:

```env
# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=eum2

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# AWS
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BEDROCK_REGION=ap-northeast-1

# S3
S3_BUCKET_NAME=eum2-meeting-summaries
S3_REGION=ap-northeast-2

# AI Server
AI_SERVER_URL=http://localhost:8000
```

### 개발 가이드

#### 스크립트

**Backend**
```bash
npm run start:dev      # 개발 서버 실행
npm run build          # 프로덕션 빌드
npm run test           # 단위 테스트
npm run test:e2e       # E2E 테스트
npm run lint           # 린트 검사
```

**Frontend**
```bash
npm run dev            # 개발 서버 실행 (http://localhost:3000)
npm run build          # 프로덕션 빌드
npm run start          # 프로덕션 서버 실행
npm run lint           # 린트 검사
```

#### 코드 스타일

- **TypeScript** 엄격 모드 사용
- **ESLint** + **Prettier** 코드 포맷팅
- 컴포넌트는 함수형 컴포넌트 + Hooks 패턴 사용
- NestJS 모듈 기반 아키텍처 준수

### CI/CD

GitHub Actions를 통한 자동화된 CI/CD 파이프라인:

- **CI** (`ci.yml`): 푸시/PR 시 린트, 테스트, 빌드 검증
- **Deploy** (`deploy.yml`): main 브랜치 병합 시 자동 배포
- **Rollback** (`rollback.yml`): 배포 롤백

### 라이선스

이 프로젝트는 비공개 프로젝트입니다.

### 팀

**KRAFTON JUNGLE** 교육 프로그램 참가팀

---

## English

### Project Introduction

EUM2 is an AI-powered real-time collaboration platform developed during the **KRAFTON JUNGLE** education program. It combines video conferencing via Amazon Chime SDK, real-time speech recognition/translation through AWS AI services, and voice cloning technology based on OpenVoice to provide a global collaboration environment without language barriers.

### Key Features

| Feature | Description |
|---------|-------------|
| **Video Conferencing** | High-quality video/audio streaming based on Amazon Chime SDK |
| **Real-time Speech Recognition** | Real-time subtitle generation via AWS Transcribe Streaming |
| **Real-time Translation** | Multi-language real-time translation using AWS Translate |
| **AI Meeting Summary** | Automatic meeting summary using AWS Bedrock (Claude) |
| **Voice Cloning TTS** | User voice cloning and translated voice output based on OpenVoice V2 |
| **Whiteboard** | Real-time collaborative whiteboard (Pixi.js based) |
| **Workspaces** | Team-based workspace management and collaboration |
| **Chat** | Real-time text chat (Socket.io) |

### Getting Started

#### Prerequisites

- **Node.js** 20.x or higher
- **Python** 3.9 ~ 3.10 (for AI server)
- **PostgreSQL** 15.x or higher
- **Redis** 7.x or higher
- **AWS Account** (with access to Chime, Transcribe, Translate, Bedrock, S3, Polly)
- **Google Cloud Console** OAuth 2.0 client

#### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/EUM2.git
cd EUM2

# Backend setup
cd backend && cp .env.example .env
npm install && npm run start:dev

# Frontend setup (in new terminal)
cd frontend
npm install && npm run dev
```

### License

This is a private project.

### Team

**KRAFTON JUNGLE** Education Program Participants
