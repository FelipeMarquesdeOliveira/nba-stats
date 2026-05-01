import { Game, GameStatus, PeriodType } from '@domain/types';
import { mockTeams } from './teams';

export const mockGames: Game[] = [
  {
    id: 'game-001',
    homeTeam: mockTeams[0], // Lakers
    awayTeam: mockTeams[1], // Celtics
    homeScore: 98,
    awayScore: 102,
    status: GameStatus.LIVE,
    scheduledAt: '7:30 PM ET',
    period: 3,
    periodType: PeriodType.QUARTER,
    clock: '4:32',
    venue: 'Crypto.com Arena',
  },
  {
    id: 'game-002',
    homeTeam: mockTeams[2], // Warriors
    awayTeam: mockTeams[3], // Heat
    homeScore: 0,
    awayScore: 0,
    status: GameStatus.SCHEDULED,
    scheduledAt: '10:00 PM ET',
    venue: 'Chase Center',
  },
  {
    id: 'game-003',
    homeTeam: mockTeams[1], // Celtics
    awayTeam: mockTeams[2], // Warriors
    homeScore: 115,
    awayScore: 108,
    status: GameStatus.FINAL,
    scheduledAt: 'Final',
    venue: 'TD Garden',
  },
];

export function getGameById(id: string): Game | undefined {
  return mockGames.find((g) => g.id === id);
}

export function getGamesByStatus(status: GameStatus): Game[] {
  return mockGames.filter((g) => g.status === status);
}

export function getTodayGames(): Game[] {
  return mockGames;
}