import { BoxScore, BoxScorePlayer, OnCourtStatus } from '@domain/types';
import { DATA_COLLECTION_CONFIG } from '../../config';
import { httpClient, DataSource, logger, HttpClientError } from '../../infrastructure';
import { computeOnCourt, toOnCourtStatusMap } from '../../infrastructure/onCourtTracker';

export async function fetchSummary(gameId: string): Promise<any> {
  const { baseUrl, summaryEndpoint } = DATA_COLLECTION_CONFIG.espn;
  const url = `${baseUrl}${summaryEndpoint}?event=${gameId}`;
  const requestId = logger.generateRequestId();

  try {
    const response = await httpClient.fetch<any>(DataSource.ESPN, url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    return response;
  } catch (error) {
    const err = error as HttpClientError;
    logger.error(DataSource.ESPN, 'fetchSummary', requestId, {
      status: 'failure',
      errorCode: err.code || err.statusCode?.toString(),
    });
    throw error;
  }
}

function parsePlayer(athleteItem: any, names: string[], teamAbbreviation: string): BoxScorePlayer | null {
  const athlete = athleteItem.athlete;
  const stats = athleteItem.stats || [];
  
  if (!stats || stats.length === 0) {
    return null; // No stats available
  }

  const getStat = (name: string): string => {
    const idx = names.indexOf(name);
    return idx >= 0 ? stats[idx] : '0';
  };

  const parseIntStat = (name: string): number => parseInt(getStat(name), 10) || 0;

  const fg = getStat('FG').split('-');
  const fgm = parseInt(fg[0]) || 0;
  const fga = parseInt(fg[1]) || 0;

  const tpt = getStat('3PT').split('-');
  const tptm = parseInt(tpt[0]) || 0;
  const tpta = parseInt(tpt[1]) || 0;

  const ft = getStat('FT').split('-');
  const ftm = parseInt(ft[0]) || 0;
  const fta = parseInt(ft[1]) || 0;

  return {
    player: {
      id: athlete.id,
      name: athlete.displayName,
      position: athlete.position?.abbreviation || 'UN',
      jerseyNumber: athlete.jersey || '',
      teamId: '',
      imageUrl: athlete.headshot?.href,
      height: '',
      weight: '',
      birthDate: '',
      yearsExperience: 0
    },
    points: parseIntStat('PTS'),
    assists: parseIntStat('AST'),
    rebounds: parseIntStat('REB'),
    steals: parseIntStat('STL'),
    blocks: parseIntStat('BLK'),
    turnovers: parseIntStat('TO'),
    minutesPlayed: getStat('MIN'),
    fieldGoalsMade: fgm,
    fieldGoalsAttempted: fga,
    threePointersMade: tptm,
    threePointersAttempted: tpta,
    freeThrowsMade: ftm,
    freeThrowsAttempted: fta,
    plusMinus: parseIntStat('+/-'),
    fieldGoalPct: fga > 0 ? fgm / fga : 0,
    threePointPct: tpta > 0 ? tptm / tpta : 0,
    freeThrowPct: fta > 0 ? ftm / fta : 0,
    efficiency: 0,
    isOnCourt: false,
    onCourtStatus: OnCourtStatus.UNKNOWN,
    teamAbbreviation,
    isStarter: athleteItem.starter === true || athlete.starter === true,
  };
}

export function normalizeSummaryToBoxScore(data: any): BoxScore {
  const gameId = data.header.id;
  const competitors = data.header.competitions[0].competitors;
  
  let homeTeamHeader, awayTeamHeader;
  if (competitors[0].homeAway === 'home') {
    homeTeamHeader = competitors[0];
    awayTeamHeader = competitors[1];
  } else {
    homeTeamHeader = competitors[1];
    awayTeamHeader = competitors[0];
  }

  const homeScore = parseInt(homeTeamHeader.score || '0', 10);
  const awayScore = parseInt(awayTeamHeader.score || '0', 10);

  const homeAbbr = homeTeamHeader.team.abbreviation;
  const awayAbbr = awayTeamHeader.team.abbreviation;
  const homeName = homeTeamHeader.team.displayName;
  const awayName = awayTeamHeader.team.displayName;

  const boxscoreData = data.boxscore;
  let homePlayers: BoxScorePlayer[] = [];
  let awayPlayers: BoxScorePlayer[] = [];

  if (boxscoreData && boxscoreData.players) {
    boxscoreData.players.forEach((teamData: any) => {
      const abbr = teamData.team.abbreviation;
      const statistics = teamData.statistics[0];
      const names = statistics.names;
      
      const parsedPlayers = statistics.athletes
        .map((athleteItem: any) => parsePlayer(athleteItem, names, abbr))
        .filter((p: any) => p !== null) as BoxScorePlayer[];
        
      if (abbr === homeAbbr) {
        homePlayers = parsedPlayers;
      } else if (abbr === awayAbbr) {
        awayPlayers = parsedPlayers;
      }
    });
  }

  // Calculate efficiency
  const calcEff = (p: BoxScorePlayer) => 
    p.points + p.rebounds + p.assists + p.steals + p.blocks - (p.fieldGoalsAttempted - p.fieldGoalsMade) - (p.freeThrowsAttempted - p.freeThrowsMade) - p.turnovers;

  homePlayers.forEach(p => p.efficiency = calcEff(p));
  awayPlayers.forEach(p => p.efficiency = calcEff(p));

  // ─── ON-COURT DETECTION (State Machine — 100% precision) ──────
  const gameStatusText = data.header.competitions[0].status.type.state; // 'pre', 'in', 'post'
  const isLive = gameStatusText === 'in';
  
  if (isLive) {
    const onCourtResult = computeOnCourt(data);
    const statusMap = toOnCourtStatusMap(onCourtResult);
    
    // Log no console para diagnóstico em tempo real
    console.log(`🏀 [ON-COURT] ${onCourtResult.diagnostics}`);
    
    // Aplicar o status a cada jogador
    const allPlayers = [...homePlayers, ...awayPlayers];
    for (const player of allPlayers) {
      const status = statusMap.get(player.player.id);
      if (status) {
        player.isOnCourt = true;
        player.onCourtStatus = status;
      }
    }
  }

  const calculateTeamStats = (players: BoxScorePlayer[]) => {
    return players.reduce((acc, p) => {
      acc.FGM += p.fieldGoalsMade;
      acc.FGA += p.fieldGoalsAttempted;
      acc.FG3M += p.threePointersMade;
      acc.FG3A += p.threePointersAttempted;
      acc.FTM += p.freeThrowsMade;
      acc.FTA += p.freeThrowsAttempted;
      acc.REB += p.rebounds;
      acc.AST += p.assists;
      return acc;
    }, { FGM: 0, FGA: 0, FG3M: 0, FG3A: 0, FTM: 0, FTA: 0, REB: 0, AST: 0 });
  };

  return {
    gameId,
    homeTeam: {
      abbreviation: homeAbbr,
      name: homeName,
      players: homePlayers,
    },
    awayTeam: {
      abbreviation: awayAbbr,
      name: awayName,
      players: awayPlayers,
    },
    homeScore,
    awayScore,
    clock: data.header.competitions[0].status.displayClock || '',
    period: data.header.competitions[0].status.period || 1,
    recentPlays: (data.plays || []).slice(-10).map((p: any) => ({
      id: p.id,
      text: p.text,
      clock: p.clock?.displayValue || '',
      period: p.period?.number || 1,
      teamId: p.team?.id,
      scoringPlay: p.scoringPlay === true
    })).reverse(),
    players: [...homePlayers, ...awayPlayers],
    teamStats: {
      [homeAbbr]: calculateTeamStats(homePlayers),
      [awayAbbr]: calculateTeamStats(awayPlayers),
    },
    highlights: [],
  };
}

export async function getBoxScore(gameId: string): Promise<BoxScore> {
  const data = await fetchSummary(gameId);
  return normalizeSummaryToBoxScore(data);
}

export async function getBoxScoreWithStatus(
  gameId: string,
  _gameStatus: 'live' | 'final' | 'scheduled'
): Promise<BoxScore> {
  return getBoxScore(gameId);
}
