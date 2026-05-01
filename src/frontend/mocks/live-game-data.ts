import {
  LiveGameData,
  LivePlayerStats,
  getLineColor,
  PeriodType,
} from '@domain/types';
import { mockTeams } from './teams';
import { mockPlayers } from './players';

function createLivePlayer(
  playerId: string,
  points: number,
  line: number,
  minutes: string,
  rebounds: number,
  assists: number,
  fgMade: number,
  fgAttempted: number,
  threeMade: number,
  threeAttempted: number,
  ftMade: number,
  ftAttempted: number,
  plusMinus: number,
  isOnCourt: boolean,
  isStarter: boolean
): LivePlayerStats {
  const player = mockPlayers.find((p) => p.id === playerId)!;
  const pointsRemaining = line - points;
  return {
    player,
    points,
    rebounds,
    assists,
    steals: Math.floor(Math.random() * 3),
    blocks: Math.floor(Math.random() * 2),
    turnovers: Math.floor(Math.random() * 4),
    minutesPlayed: minutes,
    fieldGoalsMade: fgMade,
    fieldGoalsAttempted: fgAttempted,
    threePointersMade: threeMade,
    threePointersAttempted: threeAttempted,
    freeThrowsMade: ftMade,
    freeThrowsAttempted: ftAttempted,
    plusMinus,
    isOnCourt,
    isStarter,
    pointsLine: line,
    overOdds: -110,
    underOdds: -110,
    pointsRemaining,
    lineColor: getLineColor(pointsRemaining),
  };
}

export const mockLiveGamesData: Record<string, LiveGameData> = {
  'game-001': {
    gameId: 'game-001',
    homeTeam: {
      team: mockTeams[0], // Lakers
      score: 98,
      players: [
        createLivePlayer('p1', 18, 25.5, '28:32', 7, 8, 7, 14, 2, 6, 2, 2, 4, true, true),
        createLivePlayer('p2', 14, 28.5, '30:15', 12, 3, 6, 11, 0, 2, 2, 4, 2, true, true),
        createLivePlayer('p3', 8, 14.5, '22:45', 2, 5, 3, 8, 1, 4, 1, 2, -1, false, false),
        createLivePlayer('p4', 6, 13.5, '19:30', 1, 4, 2, 6, 1, 3, 1, 2, -2, true, true),
        createLivePlayer('p5', 5, 11.5, '18:20', 3, 0, 2, 5, 0, 2, 1, 2, 0, false, false),
        createLivePlayer('p6', 4, 7.5, '15:10', 5, 2, 2, 4, 0, 1, 0, 0, 1, false, false),
        createLivePlayer('p7', 3, 8.5, '12:40', 1, 1, 1, 4, 0, 2, 1, 2, -1, false, false),
        createLivePlayer('p8', 2, 6.5, '8:30', 0, 2, 1, 3, 0, 1, 0, 0, -1, false, false),
      ],
    },
    awayTeam: {
      team: mockTeams[1], // Celtics
      score: 102,
      players: [
        createLivePlayer('p9', 22, 29.5, '32:10', 8, 5, 8, 16, 3, 7, 3, 4, 6, true, true),
        createLivePlayer('p10', 15, 22.5, '30:45', 4, 3, 6, 12, 2, 5, 1, 2, 3, true, true),
        createLivePlayer('p11', 12, 19.5, '28:20', 9, 2, 5, 10, 2, 5, 0, 0, 2, false, false),
        createLivePlayer('p12', 9, 12.5, '25:30', 3, 6, 4, 8, 1, 3, 0, 0, 1, true, true),
        createLivePlayer('p13', 7, 13.5, '24:15', 2, 7, 3, 7, 0, 2, 1, 2, 0, false, false),
        createLivePlayer('p14', 5, 8.5, '18:40', 6, 3, 2, 5, 0, 2, 1, 2, -1, false, false),
        createLivePlayer('p15', 4, 7.5, '14:20', 1, 2, 2, 5, 0, 2, 0, 0, 0, false, false),
        createLivePlayer('p16', 3, 6.5, '10:50', 2, 0, 1, 3, 0, 2, 1, 2, 0, false, false),
      ],
    },
    period: 3,
    periodType: PeriodType.QUARTER,
    clock: '4:32',
    possession: 'BOS',
    lastPlay: 'Jayson Tatum 3-pointer',
  },
};

export function getLiveGameData(gameId: string): LiveGameData | null {
  return mockLiveGamesData[gameId] || null;
}