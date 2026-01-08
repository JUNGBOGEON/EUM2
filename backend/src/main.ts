import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
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
