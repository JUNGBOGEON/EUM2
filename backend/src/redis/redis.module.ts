import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST');
        const redisPassword = configService.get('REDIS_PASSWORD');

        // ElastiCache가 설정되어 있으면 Redis 사용, 아니면 메모리 캐시
        if (
          redisHost &&
          redisHost !== 'your-elasticache-endpoint.cache.amazonaws.com'
        ) {
          return {
            store: redisStore,
            host: redisHost,
            port: configService.get<number>('REDIS_PORT') || 6379,
            password: redisPassword,
            ttl: 60 * 60 * 1000, // 1 hour in ms
            tls: redisHost.includes('amazonaws.com') ? {} : undefined,
          };
        }

        // 로컬 개발용 메모리 캐시
        return {
          ttl: 60 * 60 * 1000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}
