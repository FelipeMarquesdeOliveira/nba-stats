
/**
 * ESPN Athlete Adapter
 */

import { DataSource, httpClient, logger } from '../../infrastructure';

export interface PlayerGameLogEntry {
  game: {
    id: string;
    displayName: string;
  };
  stats: string[];
}

export interface PlayerStats {
  last5: number[];
  avg: number;
}

/**
 * Fetch last 5 games points for an athlete
 */
export async function getPlayerLast5Points(athleteId: string): Promise<number[]> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}/gamelog`;
  
  try {
    const data = await httpClient.fetch<any>(DataSource.ESPN, url);
    
    if (!data.seasonTypes || data.seasonTypes.length === 0) return [];
    
    // Points is typically index 13 based on my inspection
    const labels = data.labels || [];
    const ptsIndex = labels.indexOf('PTS');
    if (ptsIndex === -1) return [];

    let allGames: any[] = [];
    
    // Collect games from all season types to ensure we get at least 5
    for (const season of data.seasonTypes) {
      if (season.categories && season.categories.length > 0) {
        allGames = [...allGames, ...(season.categories[0].events || [])];
      }
      if (allGames.length >= 5) break;
    }

    return allGames.slice(0, 5).map(g => {
      const val = parseInt(g.stats[ptsIndex], 10);
      return isNaN(val) ? 0 : val;
    });
  } catch (error) {
    logger.error(DataSource.ESPN, 'getPlayerLast5Points', athleteId, error as any);
    return [];
  }
}

export async function getESPNPlayerProfile(athleteId: string): Promise<any> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}`;
  try {
    return await httpClient.fetch<any>(DataSource.ESPN, url);
  } catch (error) {
    logger.error(DataSource.ESPN, 'getESPNPlayerProfile', athleteId, error as any);
    return null;
  }
}

export async function getESPNPlayerGamelog(athleteId: string): Promise<any> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}/gamelog`;
  try {
    return await httpClient.fetch<any>(DataSource.ESPN, url);
  } catch (error) {
    logger.error(DataSource.ESPN, 'getESPNPlayerGamelog', athleteId, error as any);
    return null;
  }
}
