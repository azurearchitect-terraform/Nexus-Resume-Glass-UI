import crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly ttlMs: number = 10 * 60 * 1000; // 10 minutes default

  generateKey(parts: Record<string, any>): string {
    const sortedKeys = Object.keys(parts).sort();
    const stringToHash = sortedKeys.map(k => `${k}:${JSON.stringify(parts[k])}`).join('|');
    const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    console.log(`[Cache] Generated key: ${hash} for parts: ${JSON.stringify(parts)}`);
    return hash;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    console.log(`[Cache] Setting data for key: ${key}`);
    const expiresAt = Date.now() + (ttlMs || this.ttlMs);
    this.cache.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
        console.log(`[Cache] Miss for key: ${key}`);
        return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      console.log(`[Cache] Expired for key: ${key}`);
      return null;
    }
    console.log(`[Cache] Hit for key: ${key}`);
    return entry.data as T;
  }

  clear(): void {
    console.log(`[Cache] Clearing all entries`);
    this.cache.clear();
  }
}

export const pipelineCache = new CacheManager();
