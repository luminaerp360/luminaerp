import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        try {
          const store = await redisStore({
            socket: {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              connectTimeout: 5000,
              reconnectStrategy: (retries: number) => {
                if (retries > 10) {
                  console.warn(
                    'Redis: max reconnect attempts reached, stopping reconnection',
                  );
                  return false;
                }
                return Math.min(retries * 200, 3000);
              },
            },
            password: configService.get('REDIS_PASSWORD'),
            database: configService.get('REDIS_DB', 0),
            ttl: configService.get('REDIS_TTL', 3600) * 1000, // Convert to milliseconds
          });

          // Attach error handler to prevent unhandled 'error' event crashes
          const client = (store as any).client;
          if (client && typeof client.on === 'function') {
            client.on('error', (err: Error) => {
              console.error('Redis client error (handled):', err.message);
            });
          }

          console.log('Redis connected successfully');
          return {
            store: () => store,
            ttl: configService.get('REDIS_TTL', 3600) * 1000,
          };
        } catch (error) {
          console.error(
            'Redis connection failed, using in-memory cache:',
            error.message,
          );
          // Fallback to in-memory cache if Redis is unavailable
          return {
            ttl: configService.get('REDIS_TTL', 3600) * 1000,
          };
        }
      },
    }),
  ],
  providers: [RedisService],
  exports: [RedisService, NestCacheModule],
})
export class RedisModule {}
