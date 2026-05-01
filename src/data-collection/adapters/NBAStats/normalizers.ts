/**
 * NBA Stats Normalizers
 * Transforms stats.nba.com API responses to domain types
 * Endpoint isolation: Only adapter knows about V2/V3 naming
 */

import {
  BoxScore,
  BoxScorePlayer,
  OnCourtStatus,
  calculateEfficiency,
  Player,
} from '@domain/types';
import { NBAStatsResponse, NBAStatsResultSet, NBA_STATS_RESULT_SETS } from './types';

/**
 * Maps NBA Stats response to domain BoxScore
 */
export function normalizeBoxscoreResponse(
  data: NBAStatsResponse,
  gameId: string,
  homeTeamAbbr: string,
  awayTeamAbbr: string
): BoxScore {
  const playerStatsSet = data.resultSets.find(
    rs => rs.name === NBA_STATS_RESULT_SETS.PLAYER_STATS
  );
  const teamStatsSet = data.resultSets.find(
    rs => rs.name === NBA_STATS_RESULT_SETS.TEAM_STATS
  );

  if (!playerStatsSet) {
    throw new Error(`PlayerStats result set not found for game ${gameId}`);
  }

  const players = normalizePlayerStats(playerStatsSet, homeTeamAbbr, awayTeamAbbr);
  const teamStats = normalizeTeamStats(teamStatsSet);

  // Calculate scores from team stats
  const homeScore = teamStats[homeTeamAbbr]?.PTS || 0;
  const awayScore = teamStats[awayTeamAbbr]?.PTS || 0;

  return {
    gameId,
    homeTeam: {
      abbreviation: homeTeamAbbr,
      name: getTeamName(homeTeamAbbr),
      players: players.filter(p => p.teamAbbreviation === homeTeamAbbr),
    },
    awayTeam: {
      abbreviation: awayTeamAbbr,
      name: getTeamName(awayTeamAbbr),
      players: players.filter(p => p.teamAbbreviation === awayTeamAbbr),
    },
    homeScore,
    awayScore,
    players,
    teamStats,
    highlights: [],
  };
}

/**
 * Normalize player stats from result set
 */
function normalizePlayerStats(
  resultSet: NBAStatsResultSet,
  _homeTeamAbbr: string,
  _awayTeamAbbr: string
): BoxScorePlayer[] {
  const headers = resultSet.headers;
  const rows = resultSet.rowSet;

  return rows.map(row => {
    // Use index-based access for type safety
    const idx = (col: string) => headers.indexOf(col);

    const playerId = String(row[idx('PLAYER_ID')] || '');
    const playerName = String(row[idx('PLAYER_NAME')] || '');
    const teamAbbreviation = String(row[idx('TEAM_ABBREVIATION')] || '');
    const startPosition = String(row[idx('START_POSITION')] || '');
    const min = String(row[idx('MIN')] || '00:00');

    const pts = Number(row[idx('PTS')]) || 0;
    const reb = Number(row[idx('REB')]) || 0;
    const ast = Number(row[idx('AST')]) || 0;
    const stl = Number(row[idx('STL')]) || 0;
    const blk = Number(row[idx('BLK')]) || 0;
    const to = Number(row[idx('TO')]) || 0;
    const fgm = Number(row[idx('FGM')]) || 0;
    const fga = Number(row[idx('FGA')]) || 0;
    const fg3m = Number(row[idx('FG3M')]) || 0;
    const fg3a = Number(row[idx('FG3A')]) || 0;
    const ftm = Number(row[idx('FTM')]) || 0;
    const fta = Number(row[idx('FTA')]) || 0;
    const plusMinus = Number(row[idx('PLUS_MINUS')]) || 0;
    const fgPct = Number(row[idx('FG_PCT')]) || 0;
    const fg3Pct = Number(row[idx('FG3_PCT')]) || 0;
    const ftPct = Number(row[idx('FT_PCT')]) || 0;

    const isStarter = startPosition !== '' && startPosition !== 'NULL';

    const player: Player = {
      id: playerId,
      name: playerName,
      position: startPosition,
      jerseyNumber: '',
      height: '',
      weight: '',
      birthDate: '',
      yearsExperience: 0,
      teamId: '',
    };

    return {
      player,
      teamAbbreviation,
      points: pts,
      rebounds: reb,
      assists: ast,
      steals: stl,
      blocks: blk,
      turnovers: to,
      minutesPlayed: min,
      fieldGoalsMade: fgm,
      fieldGoalsAttempted: fga,
      threePointersMade: fg3m,
      threePointersAttempted: fg3a,
      freeThrowsMade: ftm,
      freeThrowsAttempted: fta,
      plusMinus,
      isStarter,
      isOnCourt: false,
      onCourtStatus: OnCourtStatus.UNKNOWN,
      fieldGoalPct: fgPct,
      threePointPct: fg3Pct,
      freeThrowPct: ftPct,
      efficiency: calculateEfficiency({
        player,
        points: pts,
        rebounds: reb,
        assists: ast,
        steals: stl,
        blocks: blk,
        turnovers: to,
        minutesPlayed: min,
        fieldGoalsMade: fgm,
        fieldGoalsAttempted: fga,
        threePointersMade: fg3m,
        threePointersAttempted: fg3a,
        freeThrowsMade: ftm,
        freeThrowsAttempted: fta,
        plusMinus,
      }),
    };
  });
}

/**
 * Normalize team stats
 */
function normalizeTeamStats(resultSet?: NBAStatsResultSet): Record<string, Record<string, number>> {
  if (!resultSet) return {};

  const stats: Record<string, Record<string, number>> = {};
  const headers = resultSet.headers;

  for (const row of resultSet.rowSet) {
    const teamIdx = headers.indexOf('TEAM_ABBREVIATION');
    const teamAbbr = String(row[teamIdx] || '');

    if (!teamAbbr) continue;

    const teamStat: Record<string, number> = {};
    const statFields = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FGM', 'FGA', 'FG_PCT', 'FG3M', 'FG3A', 'FG3_PCT', 'FTM', 'FTA', 'FT_PCT'];

    statFields.forEach(field => {
      const fieldIdx = headers.indexOf(field);
      if (fieldIdx !== -1) {
        const val = row[fieldIdx];
        if (val !== null && val !== undefined) {
          teamStat[field] = Number(val);
        }
      }
    });

    stats[teamAbbr] = teamStat;
  }

  return stats;
}

/**
 * Detect on-court status based on minutes played and game state
 * This is a heuristic since stats.nba.com doesn't have explicit isOnCourt field
 */
export function detectOnCourtStatus(
  minutesPlayed: string,
  _isStarter: boolean,
  gameStatus: 'live' | 'final' | 'scheduled' | undefined
): OnCourtStatus {
  if (gameStatus === 'scheduled') {
    return OnCourtStatus.UNKNOWN;
  }

  if (gameStatus === 'final') {
    return OnCourtStatus.UNKNOWN;
  }

  // During live game or at game end
  if (minutesPlayed && minutesPlayed !== '00:00' && minutesPlayed !== '') {
    return OnCourtStatus.ESTIMATED;
  }

  return OnCourtStatus.UNKNOWN;
}

/**
 * Map team abbreviation to full name (fallback)
 */
function getTeamName(abbr: string): string {
  const names: Record<string, string> = {
    'ATL': 'Atlanta Hawks',
    'BOS': 'Boston Celtics',
    'BKN': 'Brooklyn Nets',
    'CHA': 'Charlotte Hornets',
    'CHI': 'Chicago Bulls',
    'CLE': 'Cleveland Cavaliers',
    'DAL': 'Dallas Mavericks',
    'DEN': 'Denver Nuggets',
    'DET': 'Detroit Pistons',
    'GSW': 'Golden State Warriors',
    'HOU': 'Houston Rockets',
    'IND': 'Indiana Pacers',
    'LAC': 'LA Clippers',
    'LAL': 'Los Angeles Lakers',
    'MEM': 'Memphis Grizzlies',
    'MIA': 'Miami Heat',
    'MIL': 'Milwaukee Bucks',
    'MIN': 'Minnesota Timberwolves',
    'NOP': 'New Orleans Pelicans',
    'NYK': 'New York Knicks',
    'OKC': 'Oklahoma City Thunder',
    'ORL': 'Orlando Magic',
    'PHI': 'Philadelphia 76ers',
    'PHX': 'Phoenix Suns',
    'POR': 'Portland Trail Blazers',
    'SAC': 'Sacramento Kings',
    'SAS': 'San Antonio Spurs',
    'TOR': 'Toronto Raptors',
    'UTA': 'Utah Jazz',
    'WAS': 'Washington Wizards',
  };

  return names[abbr] || abbr;
}