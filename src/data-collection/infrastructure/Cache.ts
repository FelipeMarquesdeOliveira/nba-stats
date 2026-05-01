/**
 * In-Memory Cache with TTL, Stale, and MaxAge support
 *
 * Cache Policy:
 * - TTL: Data is fresh and can be used for polling
 * - Stale: Data is valid for display but shouldn't be used for polling
 * - MaxAge: Data is discarded, not used even as fallback
 *
 * Fallback Order:
 * 1. Fresh cache (within TTL)
 * 2. Stale cache (within MaxAge) + warning to user
 * 3. Error / degraded UI
 */

import { DataSource } from './logger';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  source: DataSource;
  key: string;
}

export interface CacheConfig {
  ttlMs: number;        // Time to live (fresh)
  staleMs: number;       // Time until stale (still usable but warn)
  maxAgeMs: number;      // Maximum age (discard after this)
}

export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  expired: number;
}

const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  games: { ttlMs: 30_000, staleMs: 60_000, maxAgeMs: 300_000 },
  'boxscore:live': { ttlMs: 10_000, staleMs: 20_000, maxAgeMs: 60_000 },
  'boxscore:final': { ttlMs: 300_000, staleMs: 900_000, maxAgeMs: 1_800_000 },
  injuries: { ttlMs: 300_000, staleMs: 900_000, maxAgeMs: 1_800_000 },
};

export class Cache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, staleHits: 0, expired: 0 };

  /**
   * Get cached data with freshness info
   */
  get<T>(key: string): { data: T | null; isFresh: boolean; isStale: boolean; age: number } {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return { data: null, isFresh: false, isStale: false, age: -1 };
    }

    const age = Date.now() - entry.timestamp;
    const config = this.getConfigForKey(key);

    if (age > config.maxAgeMs) {
      // Expired - remove and return null
      this.store.delete(key);
      this.stats.expired++;
      return { data: null, isFresh: false, isStale: false, age };
    }

    if (age > config.staleMs) {
      // Stale but usable
      this.stats.staleHits++;
      return { data: entry.data, isFresh: false, isStale: true, age };
    }

    // Fresh
    this.stats.hits++;
    return { data: entry.data, isFresh: true, isStale: false, age };
  }

  /**
   * Check if cache has valid data (fresh or stale within maxAge)
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    const config = this.getConfigForKey(key);
    return age <= config.maxAgeMs;
  }

  /**
   * Set cache data
   */
  set<T>(key: string, data: T, source: DataSource): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      source,
      key,
    });
  }

  /**
   * Invalidate specific key
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get age of cached entry in ms
   */
  getAge(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return -1;
    return Date.now() - entry.timestamp;
  }

  /**
   * Check if should use stale cache as fallback
   */
  shouldUseAsFallback(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    const config = this.getConfigForKey(key);

    // Use as fallback if within maxAge but past stale
    return age > config.staleMs && age <= config.maxAgeMs;
  }

  private getConfigForKey(key: string): CacheConfig {
    // Match by prefix
    for (const [pattern, config] of Object.entries(DEFAULT_CONFIGS)) {
      if (key.includes(pattern)) {
        return config;
      }
    }
    // Default config
    return { ttlMs: 30_000, staleMs: 60_000, maxAgeMs: 300_000 };
  }

  /**
   * Set custom config for a key pattern
   */
  setConfig(pattern: string, config: CacheConfig): void {
    DEFAULT_CONFIGS[pattern] = config;
  }
}

export const cache = new Cache();

// Convenience functions for specific cache operations
export function createCacheKey(category: string, ...parts: string[]): string {
  return `${category}:${parts.join(':')}`;
}

// Pre-defined cache keys
export const CacheKeys = {
  games: (date: string) => createCacheKey('games', date),
  boxscoreLive: (gameId: string) => createCacheKey('boxscore', gameId, 'live'),
  boxscoreFinal: (gameId: string) => createCacheKey('boxscore', gameId, 'final'),
  injuries: () => createCacheKey('injuries', 'all'),
};