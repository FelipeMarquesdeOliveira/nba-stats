/**
 * ESPN Scoreboard Adapter
 * Fetches and transforms ESPN scoreboard data
 */

import { Game } from '@domain/types';
import { DATA_COLLECTION_CONFIG } from '../../config';
import { ESPNScoreboardResponse } from './types';
import { normalizeEventToGame } from './normalizers';
import { httpClient, DataSource, logger, HttpClientError } from '../../infrastructure';

/**
 * Fetch NBA scoreboard for a given date
 */
export async function fetchScoreboard(date: string): Promise<ESPNScoreboardResponse> {
  const { baseUrl, scoreboardEndpoint } = DATA_COLLECTION_CONFIG.espn;
  const url = `${baseUrl}${scoreboardEndpoint}?dates=${formatDate(date)}`;
  const requestId = logger.generateRequestId();

  try {
    const response = await httpClient.fetch<ESPNScoreboardResponse>(
      DataSource.ESPN,
      url,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    logger.debug(DataSource.ESPN, 'fetchScoreboard', requestId, {
      status: 'success',
      cached: false,
    });

    return response;
  } catch (error) {
    const err = error as HttpClientError;
    logger.error(DataSource.ESPN, 'fetchScoreboard', requestId, {
      status: 'failure',
      errorCode: err.code || err.statusCode?.toString(),
    });
    throw error;
  }
}

/**
 * Get games for a specific date
 */
export async function getGamesForDate(date: string): Promise<Game[]> {
  const response = await fetchScoreboard(date);
  return response.events.map(normalizeEventToGame);
}

/**
 * Get a single game by ID
 */
export async function getGameById(gameId: string, date: string): Promise<Game | null> {
  const games = await getGamesForDate(date);
  return games.find(g => g.id === gameId) || null;
}

export async function getGameStarters(gameId: string): Promise<{ teamId: string, players: { id: string, name: string }[] }[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
  
  try {
    const data = await httpClient.fetch<any>(DataSource.ESPN, url);
    if (!data.boxscore || !data.boxscore.players) return [];
    
    return data.boxscore.players.map(teamGroup => {
      const athletes = teamGroup.statistics[0].athletes;
      // Filter for starters or just take top 5 if starters flag is missing in pre-game
      const starters = athletes.filter(a => a.starter).map(a => ({
        id: a.athlete.id,
        name: a.athlete.displayName,
        jersey: a.athlete.jersey
      }));
      
      // If no starters marked, take top 5
      const finalPlayers = starters.length > 0 ? starters : athletes.slice(0, 5).map(a => ({
        id: a.athlete.id,
        name: a.athlete.displayName,
        jersey: a.athlete.jersey
      }));

      return {
        teamId: teamGroup.team.id,
        players: finalPlayers
      };
    });
  } catch (error) {
    logger.error(DataSource.ESPN, 'getGameStarters', gameId, error);
    return [];
  }
}

export async function getTeamLastGameStarters(teamId: string): Promise<{ id: string, name: string, jersey: string }[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule`;
  
  try {
    const scheduleData = await httpClient.fetch<any>(DataSource.ESPN, url);
    const completedGames = scheduleData.events?.filter(e => e.competitions[0].status.type.state === 'post') || [];
    if (completedGames.length === 0) return [];
    
    // Get the most recent game ID
    const lastGameId = completedGames[completedGames.length - 1].id;
    
    // Fetch summary for that game
    const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${lastGameId}`;
    const summaryData = await httpClient.fetch<any>(DataSource.ESPN, summaryUrl);
    
    if (!summaryData.boxscore || !summaryData.boxscore.players) return [];
    
    const teamGroup = summaryData.boxscore.players.find(tg => tg.team.id === teamId);
    if (!teamGroup) return [];
    
    const athletes = teamGroup.statistics[0].athletes;
    return athletes.filter(a => a.starter).map(a => ({
      id: a.athlete.id,
      name: a.athlete.displayName,
      jersey: a.athlete.jersey
    }));
  } catch (error) {
    logger.error(DataSource.ESPN, 'getTeamLastGameStarters', teamId, error);
    return [];
  }
}

/**
 * Format date to YYYYMMDD format
 */
export function formatDate(date: string): string {
  return date.replace(/-/g, '');
}