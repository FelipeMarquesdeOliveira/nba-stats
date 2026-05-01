/**
 * NBA Stats Boxscore Adapter
 * Fetches and transforms stats.nba.com boxscore data
 * Endpoint isolation: V2/V3 naming stays inside this adapter
 */

import { BoxScore, OnCourtStatus } from '@domain/types';
import { DATA_COLLECTION_CONFIG } from '../../config';
import { NBAStatsResponse } from './types';
import { normalizeBoxscoreResponse, detectOnCourtStatus } from './normalizers';
import { httpClient, DataSource, logger, HttpClientError } from '../../infrastructure';

/**
 * Fetch boxscore for a game from stats.nba.com
 * Uses BoxScoreTraditionalV2 endpoint internally
 */
export async function fetchBoxscore(gameId: string): Promise<NBAStatsResponse> {
  const { baseUrl, headers } = DATA_COLLECTION_CONFIG.statsNbaCom;
  const endpoint = 'boxscoretraditionalv2';
  const url = `${baseUrl}/${endpoint}?GameID=${gameId}&StartPeriod=1&EndPeriod=10&StartRange=0&EndRange=0`;
  const requestId = logger.generateRequestId();

  try {
    const response = await httpClient.fetch<NBAStatsResponse>(
      DataSource.STATS_NBA_COM,
      url,
      {
        method: 'GET',
        headers,
      }
    );

    logger.debug(DataSource.STATS_NBA_COM, 'fetchBoxscore', requestId, {
      status: 'success',
      cached: false,
    });

    return response;
  } catch (error) {
    const err = error as HttpClientError;
    logger.error(DataSource.STATS_NBA_COM, 'fetchBoxscore', requestId, {
      status: 'failure',
      errorCode: err.code || err.statusCode?.toString(),
    });
    throw error;
  }
}

/**
 * Get boxscore for a specific game
 */
export async function getBoxScore(gameId: string): Promise<BoxScore> {
  const response = await fetchBoxscore(gameId);

  const playerStatsSet = response.resultSets.find(rs => rs.name === 'PlayerStats');
  if (!playerStatsSet || playerStatsSet.rowSet.length === 0) {
    throw new Error(`No player stats found for game ${gameId}`);
  }

  // Extract team abbreviations from first player row
  const firstRow = playerStatsSet.rowSet[0];
  const teamAbbrIdx = playerStatsSet.headers.indexOf('TEAM_ABBREVIATION');
  const homeTeamAbbr = String(firstRow[teamAbbrIdx] || 'HOME');

  // Find another team abbreviation for away
  const awayRow = playerStatsSet.rowSet.find(row => {
    return String(row[teamAbbrIdx]) !== homeTeamAbbr;
  });
  const awayTeamAbbr = awayRow ? String(awayRow[teamAbbrIdx]) : 'AWAY';

  // Normalize to domain
  let boxscore = normalizeBoxscoreResponse(response, gameId, homeTeamAbbr, awayTeamAbbr);

  // Apply on-court heuristic to each player
  boxscore = applyOnCourtHeuristic(boxscore, 'live');

  return boxscore;
}

/**
 * Get boxscore with game status for on-court detection
 */
export async function getBoxScoreWithStatus(
  gameId: string,
  gameStatus: 'live' | 'final' | 'scheduled'
): Promise<BoxScore> {
  const response = await fetchBoxscore(gameId);

  const playerStatsSet = response.resultSets.find(rs => rs.name === 'PlayerStats');
  if (!playerStatsSet || playerStatsSet.rowSet.length === 0) {
    throw new Error(`No player stats found for game ${gameId}`);
  }

  const firstRow = playerStatsSet.rowSet[0];
  const teamAbbrIdx = playerStatsSet.headers.indexOf('TEAM_ABBREVIATION');
  const homeTeamAbbr = String(firstRow[teamAbbrIdx] || 'HOME');

  const awayRow = playerStatsSet.rowSet.find(row => {
    return String(row[teamAbbrIdx]) !== homeTeamAbbr;
  });
  const awayTeamAbbr = awayRow ? String(awayRow[teamAbbrIdx]) : 'AWAY';

  let boxscore = normalizeBoxscoreResponse(response, gameId, homeTeamAbbr, awayTeamAbbr);

  // Apply on-court heuristic with game status
  boxscore = applyOnCourtHeuristic(boxscore, gameStatus);

  return boxscore;
}

/**
 * Apply on-court heuristic to all players in boxscore
 */
function applyOnCourtHeuristic(
  boxscore: BoxScore,
  gameStatus: 'live' | 'final' | 'scheduled'
): BoxScore {
  // Update players with on-court status
  boxscore.players = boxscore.players.map(player => {
    const status = detectOnCourtStatus(
      player.minutesPlayed,
      player.isStarter ?? false,
      gameStatus
    );

    return {
      ...player,
      isOnCourt: status === OnCourtStatus.CONFIRMED || status === OnCourtStatus.ESTIMATED,
      onCourtStatus: status,
    };
  });

  return boxscore;
}