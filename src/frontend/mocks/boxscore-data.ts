import {
  BoxScore,
  BoxScorePlayer,
  TeamStats,
  GameHighlights,
  PlayerGameStats,
} from '@domain/types';
import { mockTeams } from './teams';
import { mockPlayers } from './players';
import { calculatePercentage, calculateEfficiency } from '@domain/types';

function createBoxScorePlayer(
  playerId: string,
  points: number,
  rebounds: number,
  assists: number,
  steals: number,
  blocks: number,
  turnovers: number,
  minutes: string,
  fgMade: number,
  fgAttempted: number,
  threeMade: number,
  threeAttempted: number,
  ftMade: number,
  ftAttempted: number,
  plusMinus: number
): BoxScorePlayer {
  const player = mockPlayers.find((p) => p.id === playerId)!;

  const baseStats: PlayerGameStats = {
    player,
    points,
    rebounds,
    assists,
    steals,
    blocks,
    turnovers,
    minutesPlayed: minutes,
    fieldGoalsMade: fgMade,
    fieldGoalsAttempted: fgAttempted,
    threePointersMade: threeMade,
    threePointersAttempted: threeAttempted,
    freeThrowsMade: ftMade,
    freeThrowsAttempted: ftAttempted,
    plusMinus,
  };

  return {
    ...baseStats,
    fieldGoalPct: calculatePercentage(fgMade, fgAttempted),
    threePointPct: calculatePercentage(threeMade, threeAttempted),
    freeThrowPct: calculatePercentage(ftMade, ftAttempted),
    efficiency: calculateEfficiency(baseStats),
  };
}

function createTeamStats(
  points: number,
  fgm: number,
  fga: number,
  tpm: number,
  tpa: number,
  ftm: number,
  fta: number,
  rebounds: number,
  assists: number,
  steals: number,
  blocks: number,
  turnovers: number
): TeamStats {
  return {
    teamId: '',
    teamName: '',
    points,
    fieldGoalsMade: fgm,
    fieldGoalsAttempted: fga,
    threePointersMade: tpm,
    threePointersAttempted: tpa,
    freeThrowsMade: ftm,
    freeThrowsAttempted: fta,
    rebounds,
    assists,
    steals,
    blocks,
    turnovers,
  };
}

function detectGameHighlights(players: BoxScorePlayer[]): GameHighlights[] {
  const highlights: GameHighlights[] = [];

  const sorted = [...players].sort((a, b) => b.points - a.points);
  if (sorted[0]) {
    highlights.push({
      type: 'top-scorer',
      player: sorted[0].player,
      value: sorted[0].points,
      description: `${sorted[0].player.name} led all scorers with ${sorted[0].points} points`,
    });
  }

  for (const stats of players) {
    const categories = [stats.points, stats.rebounds, stats.assists];
    const doubles = categories.filter((v) => v >= 10).length;

    if (doubles >= 3) {
      highlights.push({
        type: 'triple-double',
        player: stats.player,
        value: 3,
        description: `${stats.player.name} recorded a triple-double: ${stats.points} PTS, ${stats.rebounds} REB, ${stats.assists} AST`,
      });
    } else if (doubles >= 2) {
      highlights.push({
        type: 'double-double',
        player: stats.player,
        value: 2,
        description: `${stats.player.name} recorded a double-double`,
      });
    }
  }

  return highlights.slice(0, 8);
}

export const mockBoxScores: Record<string, BoxScore> = {
  'game-003': {
    gameId: 'game-003',
    homeTeam: {
      team: mockTeams[1],
      stats: {
        ...createTeamStats(115, 44, 88, 12, 32, 15, 18, 42, 28, 7, 5, 12),
        teamId: 'BOS',
        teamName: 'Celtics',
      },
      players: [
        createBoxScorePlayer('p9', 32, 8, 5, 2, 1, 3, '36:12', 12, 22, 4, 9, 4, 5, 8),
        createBoxScorePlayer('p10', 26, 4, 3, 1, 0, 2, '34:45', 10, 18, 3, 7, 3, 4, 6),
        createBoxScorePlayer('p11', 18, 9, 2, 1, 3, 1, '32:20', 7, 14, 2, 6, 2, 2, 4),
        createBoxScorePlayer('p12', 12, 3, 8, 2, 1, 1, '30:15', 5, 10, 1, 4, 1, 2, 2),
        createBoxScorePlayer('p13', 10, 2, 10, 1, 0, 2, '28:30', 4, 8, 0, 3, 2, 3, 0),
        createBoxScorePlayer('p14', 8, 6, 4, 0, 1, 1, '22:40', 3, 7, 0, 2, 2, 2, -2),
        createBoxScorePlayer('p15', 5, 1, 3, 0, 0, 1, '15:20', 2, 5, 1, 3, 0, 0, -1),
        createBoxScorePlayer('p16', 4, 2, 1, 0, 0, 0, '12:30', 1, 4, 0, 2, 1, 2, -1),
      ],
      highlights: [],
    },
    awayTeam: {
      team: mockTeams[2],
      stats: {
        ...createTeamStats(108, 40, 85, 14, 38, 14, 16, 38, 24, 6, 4, 14),
        teamId: 'GSW',
        teamName: 'Warriors',
      },
      players: [
        createBoxScorePlayer('p17', 28, 5, 6, 1, 0, 3, '38:10', 10, 20, 5, 12, 3, 4, -4),
        createBoxScorePlayer('p18', 22, 3, 8, 0, 0, 2, '32:45', 8, 16, 3, 9, 3, 4, -2),
        createBoxScorePlayer('p19', 16, 6, 2, 0, 0, 1, '30:20', 6, 12, 2, 5, 2, 3, 0),
        createBoxScorePlayer('p20', 14, 7, 3, 2, 1, 2, '28:15', 5, 11, 1, 4, 3, 4, 2),
        createBoxScorePlayer('p21', 8, 5, 7, 2, 2, 3, '26:40', 3, 8, 0, 3, 2, 4, -3),
        createBoxScorePlayer('p26', 8, 4, 3, 0, 0, 1, '18:20', 3, 7, 0, 3, 2, 2, -2),
        createBoxScorePlayer('p27', 6, 2, 2, 1, 1, 1, '14:30', 2, 6, 0, 3, 2, 2, -1),
        createBoxScorePlayer('p28', 6, 3, 0, 0, 0, 1, '10:30', 2, 5, 0, 2, 2, 2, -1),
      ],
      highlights: [],
    },
  },
};

mockBoxScores['game-003'].homeTeam.highlights = detectGameHighlights(
  mockBoxScores['game-003'].homeTeam.players
);
mockBoxScores['game-003'].awayTeam.highlights = detectGameHighlights(
  mockBoxScores['game-003'].awayTeam.players
);

export function getBoxScore(gameId: string): BoxScore | null {
  return mockBoxScores[gameId] || null;
}