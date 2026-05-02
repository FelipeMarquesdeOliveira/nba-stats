/**
 * Game Gateway Implementation
 * Uses ESPN as primary source with cache and fallback
 */

import { Game, GameGateway } from '@domain/types';
import { getGamesForDate as fetchGamesFromEspn } from '../adapters/ESPN/scoreboard';
import { cache, CacheKeys, DataSource, logger, HttpClientError } from '@data-collection/infrastructure';

export class GameGatewayImpl implements GameGateway {
  /**
   * Get all games for a specific date
   * Uses cache with fallback to stale if API fails
   */
  async getGamesForDate(date?: string): Promise<Game[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const cacheKey = CacheKeys.games(targetDate);
    const requestId = logger.generateRequestId();

    // Check cache first
    const cached = cache.get<Game[]>(cacheKey);
    if (cached.data && cached.isFresh) {
      logger.logCacheHit(DataSource.ESPN, 'getGamesForDate', requestId, cached.age);
      return cached.data;
    }

    // If stale but within maxAge, log and continue to fetch
    if (cached.data && cached.isStale) {
      logger.logCacheStale(DataSource.ESPN, 'getGamesForDate', requestId, cached.age);
    }

    // Fetch from source
    try {
      const games = await fetchGamesFromEspn(targetDate);

      // Update cache
      cache.set(cacheKey, games, DataSource.ESPN);
      logger.debug(DataSource.ESPN, 'getGamesForDate', requestId, {
        status: 'success',
        cached: false,
      });

      return games;
    } catch (error) {
      // API failed - check if we can use stale cache
      if (cached.data && cache.shouldUseAsFallback(cacheKey)) {
        logger.warn(DataSource.ESPN, 'getGamesForDate', requestId, {
          status: 'cache-stale',
          cached: true,
          cacheAge: cached.age,
        });
        return cached.data;
      }

      // No fallback available
      logger.error(DataSource.ESPN, 'getGamesForDate', requestId, {
        status: 'failure',
        errorCode: (error as HttpClientError).code,
      });
      throw error;
    }
  }

  /**
   * Get a single game by ID
   * @param gameId - The game ID
   * @param date - Optional date in YYYY-MM-DD format. If not provided, uses today.
   */
  async getGameById(gameId: string, date?: string): Promise<Game | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const games = await this.getGamesForDate(targetDate);
      return games.find(g => g.id === gameId) || null;
    } catch (error) {
      logger.error(DataSource.ESPN, 'getGameById', logger.generateRequestId(), {
        status: 'failure',
        errorCode: (error as HttpClientError).code,
      });
      return null;
    }
  }
}

// Export singleton instance
export const gameGateway = new GameGatewayImpl();