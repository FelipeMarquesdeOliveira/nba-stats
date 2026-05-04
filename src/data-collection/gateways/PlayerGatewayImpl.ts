
import { PlayerGateway, PlayerStats } from '@domain/types';
import { getPlayerLast5Points } from '../adapters/ESPN/athlete';
import { cache, DataSource, logger } from '../infrastructure';

export class PlayerGatewayImpl implements PlayerGateway {
  async getPlayerLast5Stats(playerId: string): Promise<PlayerStats | null> {
    const cacheKey = `player:stats:${playerId}`;
    
    // Check cache
    const cached = cache.get<PlayerStats>(cacheKey);
    if (cached.data && cached.isFresh) {
      return cached.data;
    }

    try {
      const last5 = await getPlayerLast5Points(playerId);
      if (last5.length === 0) return null;

      const avg = last5.reduce((a, b) => a + b, 0) / last5.length;
      
      const stats: PlayerStats = {
        id: playerId,
        last5,
        avg
      };

      cache.set(cacheKey, stats, DataSource.ESPN);
      return stats;
    } catch (error) {
      logger.error(DataSource.ESPN, 'getPlayerLast5Stats', playerId, error as any);
      return null;
    }
  }
}

export const playerGateway = new PlayerGatewayImpl();
