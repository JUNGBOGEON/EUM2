import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';

class SocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'http://127.0.0.1:3000',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      // [AFTER] 개선된 Socket.IO 설정
      pingTimeout: 120000, // 120초 (기본 20초 → 증가) - PONG 응답 대기 시간
      pingInterval: 60000, // 60초 (기본 25초 → 증가) - 서버 PING 전송 간격
      connectTimeout: 45000, // 연결 타임아웃 45초
      upgradeTimeout: 30000, // 업그레이드 타임아웃 30초
      maxHttpBufferSize: 1e6, // 1MB 버퍼
      allowEIO3: true, // Engine.IO v3 호환성
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2분 내 재연결 시 상태 복원
        skipMiddlewares: true,
      },
    });
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for API
  app.setGlobalPrefix('api');

  // CORS 설정
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
    ],
    credentials: true,
  });

  // WebSocket Adapter
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // Body Parser with increased limit for base64 images
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Cookie Parser
  app.use(cookieParser());

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
