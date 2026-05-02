/**
 * BoxScore Gateway Implementation
 * Uses stats.nba.com as primary source with cache and fallback
 */

import { BoxScore, BoxScoreGateway } from '@domain/types';
import { getBoxScore, getBoxScoreWithStatus } from '../adapters/ESPN/summary';
import { cache, CacheKeys, DataSource, logger, HttpClientError } from '@data-collection/infrastructure';

export class BoxScoreGatewayImpl implements BoxScoreGateway {
  /**
   * Get boxscore for a game
   */
  async getBoxScore(gameId: string): Promise<BoxScore | null> {
    const cacheKey = CacheKeys.boxscoreLive(gameId);
    const requestId = logger.generateRequestId();

    // Check cache first
    const cached = cache.get<BoxScore>(cacheKey);
    if (cached.data && cached.isFresh) {
      logger.logCacheHit(DataSource.STATS_NBA_COM, 'getBoxScore', requestId, cached.age);
      return cached.data;
    }

    if (cached.data && cached.isStale) {
      logger.logCacheStale(DataSource.STATS_NBA_COM, 'getBoxScore', requestId, cached.age);
    }

    try {
      const boxscore = await getBoxScore(gameId);
      cache.set(cacheKey, boxscore, DataSource.STATS_NBA_COM);
      return boxscore;
    } catch (error) {
      if (cached.data && cache.shouldUseAsFallback(cacheKey)) {
        logger.warn(DataSource.STATS_NBA_COM, 'getBoxScore', requestId, {
          status: 'cache-stale',
          cached: true,
          cacheAge: cached.age,
        });
        return cached.data;
      }
      logger.error(DataSource.STATS_NBA_COM, 'getBoxScore', requestId, {
        status: 'failure',
        errorCode: (error as HttpClientError).code,
      });
      return null;
    }
  }
}

/**
 * BoxScore Gateway with game status for on-court detection
 */
export class LiveBoxScoreGatewayImpl {
  /**
   * Get live boxscore with proper on-court status detection
   * Uses shorter TTL for live games, longer for final
   */
  async getLiveBoxScore(
    gameId: string,
    gameStatus: 'live' | 'final' | 'scheduled'
  ): Promise<BoxScore | null> {
    const isFinal = gameStatus === 'final';
    const cacheKey = isFinal
      ? CacheKeys.boxscoreFinal(gameId)
      : CacheKeys.boxscoreLive(gameId);
    const requestId = logger.generateRequestId();

    // Check cache first
    const cached = cache.get<BoxScore>(cacheKey);
    if (cached.data && cached.isFresh) {
      logger.logCacheHit(DataSource.STATS_NBA_COM, 'getLiveBoxScore', requestId, cached.age);
      return cached.data;
    }

    if (cached.data && cached.isStale) {
      logger.logCacheStale(DataSource.STATS_NBA_COM, 'getLiveBoxScore', requestId, cached.age);
    }

    try {
      const boxscore = await getBoxScoreWithStatus(gameId, gameStatus);

      // For final games, don't use as fallback if stale (data won't change)
      if (isFinal) {
        // Set cache but don't return stale for final
        cache.set(cacheKey, boxscore, DataSource.STATS_NBA_COM);
        return boxscore;
      }

      // For live games, allow stale fallback
      cache.set(cacheKey, boxscore, DataSource.STATS_NBA_COM);
      return boxscore;
    } catch (error) {
      // Live games can use stale fallback, final games cannot
      if (!isFinal && cached.data && cache.shouldUseAsFallback(cacheKey)) {
        logger.warn(DataSource.STATS_NBA_COM, 'getLiveBoxScore', requestId, {
          status: 'cache-stale',
          cached: true,
          cacheAge: cached.age,
        });
        return cached.data;
      }

      logger.error(DataSource.STATS_NBA_COM, 'getLiveBoxScore', requestId, {
        status: 'failure',
        errorCode: (error as HttpClientError).code,
      });
      return null;
    }
  }
}

// Export singleton instances
export const boxScoreGateway = new BoxScoreGatewayImpl();
export const liveBoxScoreGateway = new LiveBoxScoreGatewayImpl();