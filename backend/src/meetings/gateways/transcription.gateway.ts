import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  AudioStream,
  TranscriptResultStream,
} from '@aws-sdk/client-transcribe-streaming';
import { Readable, PassThrough } from 'stream';

interface TranscriptionSession {
  audioStream: PassThrough;
  isActive: boolean;
}

@WebSocketGateway({
  namespace: 'transcription',
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class TranscriptionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private transcribeClient: TranscribeStreamingClient;
  private sessions: Map<string, TranscriptionSession> = new Map();

  constructor(private configService: ConfigService) {
    this.transcribeClient = new TranscribeStreamingClient({
      region: this.configService.get('AWS_REGION') || 'ap-northeast-2',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  handleConnection(client: Socket) {
    console.log(`[Transcription] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Transcription] Client disconnected: ${client.id}`);
    this.stopTranscription(client.id);
  }

  @SubscribeMessage('startTranscription')
  async handleStartTranscription(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      meetingId: string;
      languageCode?: string;
      sampleRate?: number;
    },
  ) {
    const { meetingId, languageCode = 'ko-KR', sampleRate = 16000 } = data;

    console.log(
      `[Transcription] Starting transcription for meeting ${meetingId}, client ${client.id}`,
    );

    // 기존 세션이 있으면 정리
    this.stopTranscription(client.id);

    // 새 오디오 스트림 생성
    const audioStream = new PassThrough();
    this.sessions.set(client.id, {
      audioStream,
      isActive: true,
    });

    // 먼저 클라이언트에 시작 알림 (클라이언트가 즉시 오디오 전송 시작하도록)
    client.emit('transcriptionStarted', { meetingId, status: 'started' });

    // 약간의 딜레이 후 AWS Transcribe 시작 (클라이언트가 오디오 전송 준비할 시간)
    setTimeout(async () => {
      try {
        const session = this.sessions.get(client.id);
        if (!session || !session.isActive) {
          console.log('[Transcription] Session ended before AWS connection');
          return;
        }

        // AWS Transcribe Streaming 시작
        const command = new StartStreamTranscriptionCommand({
          LanguageCode: languageCode as any,
          MediaEncoding: 'pcm',
          MediaSampleRateHertz: sampleRate,
          AudioStream: this.createAsyncIterableAudioStream(audioStream),
        });

        console.log('[Transcription] Connecting to AWS Transcribe...');
        const response = await this.transcribeClient.send(command);
        console.log('[Transcription] AWS Transcribe connected');

        // 트랜스크립션 결과 처리
        if (response.TranscriptResultStream) {
          this.processTranscriptStream(
            client,
            meetingId,
            response.TranscriptResultStream,
          );
        }
      } catch (error) {
        console.error('[Transcription] Failed to start:', error);
        client.emit('transcriptionError', {
          meetingId,
          error: error.message || 'Failed to start transcription',
        });
        this.stopTranscription(client.id);
      }
    }, 500);
  }

  private audioChunkCounts: Map<string, number> = new Map();

  @SubscribeMessage('audioData')
  handleAudioData(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: number[] | Uint8Array },
  ) {
    const session = this.sessions.get(client.id);
    if (!session || !session.isActive) {
      return;
    }

    try {
      // Buffer로 변환하여 스트림에 쓰기
      const buffer = Buffer.from(data.audio);
      session.audioStream.write(buffer);

      // 로깅
      const count = (this.audioChunkCounts.get(client.id) || 0) + 1;
      this.audioChunkCounts.set(client.id, count);
      if (count === 1) {
        console.log(`[Transcription] First audio chunk received from ${client.id} (${buffer.length} bytes)`);
      } else if (count % 100 === 0) {
        console.log(`[Transcription] Received ${count} audio chunks from ${client.id}`);
      }
    } catch (error) {
      console.error('[Transcription] Error writing audio data:', error);
    }
  }

  @SubscribeMessage('stopTranscription')
  handleStopTranscription(@ConnectedSocket() client: Socket) {
    console.log(`[Transcription] Stopping transcription for client ${client.id}`);
    this.stopTranscription(client.id);
    client.emit('transcriptionStopped', { status: 'stopped' });
  }

  private stopTranscription(clientId: string) {
    const session = this.sessions.get(clientId);
    if (session) {
      session.isActive = false;
      session.audioStream.end();
      this.sessions.delete(clientId);
      this.audioChunkCounts.delete(clientId);
    }
  }

  private async *createAsyncIterableAudioStream(
    stream: PassThrough,
  ): AsyncIterable<AudioStream> {
    for await (const chunk of stream) {
      yield { AudioEvent: { AudioChunk: chunk } };
    }
  }

  private async processTranscriptStream(
    client: Socket,
    meetingId: string,
    stream: AsyncIterable<TranscriptResultStream>,
  ) {
    try {
      for await (const event of stream) {
        if (event.TranscriptEvent?.Transcript?.Results) {
          for (const result of event.TranscriptEvent.Transcript.Results) {
            if (result.Alternatives && result.Alternatives.length > 0) {
              const alternative = result.Alternatives[0];

              const transcriptData = {
                meetingId,
                resultId: result.ResultId || '',
                isPartial: result.IsPartial ?? true,
                transcript: alternative.Transcript || '',
                startTimeMs: Math.round((result.StartTime || 0) * 1000),
                endTimeMs: Math.round((result.EndTime || 0) * 1000),
                items: alternative.Items?.map((item) => ({
                  content: item.Content,
                  startTime: item.StartTime,
                  endTime: item.EndTime,
                  type: item.Type,
                  confidence: item.Confidence,
                })),
              };

              // 클라이언트에 트랜스크립션 결과 전송
              client.emit('transcriptResult', transcriptData);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Transcription] Error processing stream:', error);
      client.emit('transcriptionError', {
        meetingId,
        error: error.message || 'Error processing transcription',
      });
    } finally {
      this.stopTranscription(client.id);
    }
  }
}
