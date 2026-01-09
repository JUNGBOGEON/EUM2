import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { MeetingsModule } from './meetings/meetings.module';
import { RedisModule } from './redis/redis.module';
import { WhiteboardModule } from './whiteboard/whiteboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT') || 5432,
        username: configService.get('DB_USERNAME') || configService.get('DB_USER'), // Support OldEum env
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE') || configService.get('DB_NAME'), // Support OldEum env
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        ssl: configService.get('DB_HOST')?.includes('rds.amazonaws.com')
          ? { rejectUnauthorized: false }
          : false,
        logging: configService.get('NODE_ENV') !== 'production',
        // 연결 속도 개선 설정
        connectTimeoutMS: 10000,
        extra: {
          connectionTimeoutMillis: 10000,
          query_timeout: 10000,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    WorkspacesModule,
    RedisModule,
    MeetingsModule,
    WhiteboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
