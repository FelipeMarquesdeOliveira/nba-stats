import { BoxScore, BoxScorePlayer, OnCourtStatus } from '@domain/types';
import { DATA_COLLECTION_CONFIG } from '../../config';
import { httpClient, DataSource, logger, HttpClientError } from '../../infrastructure';

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

/**
 * Lógica Clínica de Detecção de Jogadores em Quadra
 * Analisa as jogadas recentes (PBP) para identificar evidências diretas de presença.
 */
function detectClinicalOnCourt(data: any, players: BoxScorePlayer[]): void {
  const plays = data.plays || [];
  if (plays.length === 0) return;

  const onCourtIds = new Set<string>();
  
  // 1. Evidência Direta: Qualquer jogador em uma jogada recente (últimas 20 jogadas)
  // que não seja uma substituição.
  const recentPlays = plays.slice(-20);
  recentPlays.forEach((play: any) => {
    const type = play.type?.text?.toLowerCase() || '';
    if (type.includes('substitution') || type.includes('enters') || type.includes('leaves')) return;

    // Adiciona todos os participantes da jogada
    if (play.participants) {
      play.participants.forEach((p: any) => {
        if (p.athlete?.id) onCourtIds.add(p.athlete.id);
      });
    }
  });

  // 2. Lógica de Substituição: Varre todas as jogadas para rastrear o estado atual
  // (Iniciamos com os titulares se for o início do jogo, mas o PBP da ESPN é cumulativo)
  plays.forEach((play: any) => {
    const text = play.text?.toLowerCase() || '';
    if (text.includes('enters the game for')) {
      // Ex: "Cade Cunningham enters the game for Jaden Ivey"
      // Precisamos extrair quem entrou e quem saiu. A ESPN costuma ter isso nos participants.
      const enters = play.participants?.find((p: any) => text.includes(p.athlete?.displayName?.toLowerCase()) && text.indexOf(p.athlete?.displayName?.toLowerCase()) < text.indexOf('enters'));
      const leaves = play.participants?.find((p: any) => text.includes(p.athlete?.displayName?.toLowerCase()) && text.indexOf(p.athlete?.displayName?.toLowerCase()) > text.indexOf('for'));
      
      if (enters?.athlete?.id) onCourtIds.add(enters.athlete.id);
      if (leaves?.athlete?.id) onCourtIds.delete(leaves.athlete.id);
    }
  });

  // 3. Aplica o status HIGH_CONFIDENCE baseado na evidência
  players.forEach(p => {
    if (onCourtIds.has(p.player.id)) {
      p.isOnCourt = true;
      p.onCourtStatus = OnCourtStatus.HIGH_CONFIDENCE;
    }
  });

  // 4. Fallback ESTIMATED: Se um time tem < 5 jogadores detectados, 
  // preenchemos com os top minutos que tenham jogado recentemente.
  const teams = [...new Set(players.map(p => p.teamAbbreviation))];
  teams.forEach(abbr => {
    const teamPlayers = players.filter(p => p.teamAbbreviation === abbr);
    const confirmedCount = teamPlayers.filter(p => p.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE).length;
    
    if (confirmedCount < 5) {
      const candidates = teamPlayers
        .filter(p => p.onCourtStatus === OnCourtStatus.UNKNOWN && (parseInt(p.minutesPlayed) || 0) > 0)
        .sort((a, b) => (parseInt(b.minutesPlayed) || 0) - (parseInt(a.minutesPlayed) || 0));
      
      for (let i = 0; i < (5 - confirmedCount) && i < candidates.length; i++) {
        candidates[i].isOnCourt = true;
        candidates[i].onCourtStatus = OnCourtStatus.ESTIMATED;
      }
    }
  });
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

  const gameStatusText = data.header.competitions[0].status.type.state; // 'pre', 'in', 'post'
  const isLive = gameStatusText === 'in';
  
  const allPlayers = [...homePlayers, ...awayPlayers];
  if (isLive) {
    detectClinicalOnCourt(data, allPlayers);
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
    players: allPlayers,
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
