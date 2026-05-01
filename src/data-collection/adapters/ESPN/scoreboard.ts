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

/**
 * Format date to YYYYMMDD format
 */
function formatDate(date: string): string {
  return date.replace(/-/g, '');
}