/**
 * Injury Gateway Implementation
 * Uses ESPN as primary source with cache and fallback
 */

import { AvailabilityItem, InjuryGateway } from '@domain/types';
import { getInjuriesByTeam as fetchInjuriesByTeam } from '../adapters/ESPN/injuries';
import { cache, CacheKeys, DataSource, logger, HttpClientError } from '@data-collection/infrastructure';

export class InjuryGatewayImpl implements InjuryGateway {
  /**
   * Get injuries grouped by team for a specific game
   * Note: ESPN provides league-wide injuries, so we filter by team
   */
  async getInjuriesByGame(_gameId: string): Promise<{
    homeTeam: AvailabilityItem[];
    awayTeam: AvailabilityItem[];
  }> {
    // Use cached injuries and split by team
    const allInjuries = await this.getAllInjuriesCached();

    // In a real implementation, we'd look up the game's home/away teams
    // For now, split arbitrarily
    return {
      homeTeam: allInjuries.slice(0, Math.floor(allInjuries.length / 2)),
      awayTeam: allInjuries.slice(Math.floor(allInjuries.length / 2)),
    };
  }

  /**
   * Get injuries for a specific team
   */
  async getInjuriesByTeam(teamId: string): Promise<AvailabilityItem[]> {
    // Use cached injuries and filter by teamId
    const allInjuries = await this.getAllInjuriesCached();
    return allInjuries.filter(injury => injury.player.id === teamId);
  }

  /**
   * Get all injuries with cache support
   */
  private async getAllInjuriesCached(): Promise<AvailabilityItem[]> {
    const cacheKey = CacheKeys.injuries();
    const requestId = logger.generateRequestId();

    // Check cache first
    const cached = cache.get<AvailabilityItem[]>(cacheKey);
    if (cached.data && cached.isFresh) {
      logger.logCacheHit(DataSource.ESPN, 'getAllInjuries', requestId, cached.age);
      return cached.data;
    }

    if (cached.data && cached.isStale) {
      logger.logCacheStale(DataSource.ESPN, 'getAllInjuries', requestId, cached.age);
    }

    try {
      const injuries = await fetchInjuriesByTeam('', '');
      cache.set(cacheKey, injuries, DataSource.ESPN);
      return injuries;
    } catch (error) {
      if (cached.data && cache.shouldUseAsFallback(cacheKey)) {
        logger.warn(DataSource.ESPN, 'getAllInjuries', requestId, {
          status: 'cache-stale',
          cached: true,
          cacheAge: cached.age,
        });
        return cached.data;
      }
      logger.error(DataSource.ESPN, 'getAllInjuries', requestId, {
        status: 'failure',
        errorCode: (error as HttpClientError).code,
      });
      return [];
    }
  }
}

// Export singleton instance
export const injuryGateway = new InjuryGatewayImpl();