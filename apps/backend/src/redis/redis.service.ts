import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  private keyRegistry: Set<string> = new Set();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.cacheManager.set(key, value, ttl * 1000); // Convert to milliseconds
      } else {
        await this.cacheManager.set(key, value);
      }
      // Track the key in registry for pattern-based deletion
      this.keyRegistry.add(key);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      // Remove from registry
      this.keyRegistry.delete(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.keys(pattern);
      console.log(`Found ${keys.length} keys matching pattern: ${pattern}`, keys);
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.del(key)));
        console.log(`Deleted ${keys.length} cache keys`);
      }
    } catch (error) {
      console.error(`Cache delete by pattern error for pattern ${pattern}:`, error);
    }
  }

  async flush(): Promise<void> {
    try {
      // Clear all cache entries by accessing the Redis client
      const cacheStore: any = await (this.cacheManager as any).store;
      if (cacheStore && typeof cacheStore.client?.flushDb === 'function') {
        await cacheStore.client.flushDb();
      }
    } catch (error) {
      console.error('Cache reset error:', error);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      // Access the underlying Redis client
      const cacheStore: any = await (this.cacheManager as any).store;
      if (cacheStore && typeof cacheStore.client?.keys === 'function') {
        return await cacheStore.client.keys(pattern);
      }

      // Fallback: Use key registry for in-memory cache
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);

      return Array.from(this.keyRegistry).filter(key => regex.test(key));
    } catch (error) {
      console.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  generateKey(...parts: string[]): string {
    return parts.filter(Boolean).join(':');
  }
}
