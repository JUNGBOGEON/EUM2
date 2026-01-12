# EUM AI Server

Real-time Voice Cloning TTS 서버 (Coqui XTTS v2 기반)

## 기능

- **Voice Enrollment**: 사용자 음성 샘플로부터 화자 특징(Latents) 추출
- **Real-time TTS**: WebSocket을 통한 실시간 음성 합성 스트리밍 (Float32 PCM)

## 요구 사항

- **Python 3.9 ~ 3.10** (TTS 라이브러리 호환성 필수)
- CUDA 지원 GPU (VRAM 4GB 이상 권장, EC2 T4 지원)
- CUDA Toolkit 12.1+

> ⚠️ **주의**: TTS 라이브러리는 Python 3.11+ 에서 작동하지 않습니다. 반드시 Python 3.10 이하를 사용하세요.

## 설치 및 실행

### 1. Conda 환경 생성 (필수)

```bash
# Python 3.10 환경 생성 (필수!)
conda create -n eum-ai python=3.10 -y

# 환경 활성화
conda activate eum-ai
```

### 2. PyTorch (CUDA 12.1) 설치

```bash
# EC2 T4 GPU용 CUDA 12.1 PyTorch 설치
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 3. 의존성 설치

```bash
pip install -r requirements.txt
```

### 4. 서버 실행

```bash
# 개발 모드
python server.py

# 또는 uvicorn 직접 사용
uvicorn server:app --host 0.0.0.0 --port 8000
```

서버가 시작되면 http://localhost:8000 에서 접근 가능합니다.

> 💡 첫 실행 시 XTTS v2 모델이 자동 다운로드됩니다 (~1.8GB)

## API 문서

서버 실행 후 http://localhost:8000/docs 에서 Swagger UI를 확인할 수 있습니다.

### Endpoints

#### 1. Health Check

```
GET /health
```

서버 상태 및 등록된 사용자 목록 반환

#### 2. Voice Enrollment

```
POST /enroll/{user_id}
Content-Type: multipart/form-data

- audio: WAV/MP3 파일 (최소 6초 권장)
```

**요청 예시 (curl):**
```bash
curl -X POST "http://localhost:8000/enroll/user123" \
  -F "audio=@voice_sample.wav"
```

**응답:**
```json
{
  "success": true,
  "message": "Voice enrolled successfully for user user123",
  "user_id": "user123"
}
```

#### 3. Real-time TTS (WebSocket)

```
WebSocket /ws/tts/{user_id}
```

**클라이언트 → 서버 (JSON):**
```json
{
  "text": "안녕하세요, 반갑습니다.",
  "language": "ko"
}
```

**서버 → 클라이언트:**
- **Float32 PCM 오디오 바이트** (24kHz, mono) - AudioContext에서 직접 사용 가능
- 완료 시: `{"status": "complete"}`

**지원 언어:**
- `ko`: 한국어
- `en`: 영어
- `ja`: 일본어
- `zh-cn`: 중국어
- 기타 XTTS v2 지원 언어

#### 4. Delete Enrollment

```
DELETE /enroll/{user_id}
```

등록된 사용자 음성 삭제

## 클라이언트 예제 (JavaScript)

```javascript
// WebSocket TTS 스트리밍 예제 (Float32 PCM)
const ws = new WebSocket('ws://localhost:8000/ws/tts/user123');
const audioContext = new AudioContext({ sampleRate: 24000 });
const audioChunks = [];

ws.binaryType = 'arraybuffer';

ws.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    // Float32 PCM 데이터 직접 수신 (변환 불필요!)
    const float32Array = new Float32Array(event.data);
    audioChunks.push(float32Array);
  } else {
    // JSON 메시지
    const data = JSON.parse(event.data);
    if (data.status === 'complete') {
      playAudio(audioChunks);
    }
  }
};

// TTS 요청 전송
ws.onopen = () => {
  ws.send(JSON.stringify({
    text: '안녕하세요, 반갑습니다.',
    language: 'ko'
  }));
};

function playAudio(chunks) {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const audioBuffer = audioContext.createBuffer(1, totalLength, 24000);
  const channelData = audioBuffer.getChannelData(0);

  let offset = 0;
  for (const chunk of chunks) {
    channelData.set(chunk, offset);
    offset += chunk.length;
  }

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
}
```

## 트러블슈팅

### Python 버전 오류

```
ERROR: TTS requires Python 3.9 or 3.10
```

해결: `conda create -n eum-ai python=3.10 -y` 로 새 환경 생성

### CUDA 메모리 부족

모델 로드 시 VRAM 부족 오류가 발생하면:
1. 다른 GPU 사용 프로세스 종료
2. 배치 크기 축소 (코드에서 `stream_chunk_size` 조정)

### 모델 다운로드 실패

수동 다운로드:
```bash
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"
```

### CPU 모드

CUDA가 없는 환경에서는 자동으로 CPU 모드로 전환됩니다 (속도 저하).

## 라이선스

이 프로젝트는 내부 사용 목적입니다. Coqui TTS는 MPL-2.0 라이선스를 따릅니다.
