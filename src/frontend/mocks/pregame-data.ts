import { PregameData, InjuryStatus, TeamSeasonRecord } from '@domain/types';
import { mockTeams } from './teams';
import { mockPlayers, getPlayersByTeam } from './players';

const lakersRecord: TeamSeasonRecord = {
  team: mockTeams[0],
  season: '2024-25',
  wins: 32,
  losses: 18,
  conferenceRank: 4,
  divisionRank: 2,
  homeRecord: '18-8',
  awayRecord: '14-10',
  lastTen: '6-4',
};

const celticsRecord: TeamSeasonRecord = {
  team: mockTeams[1],
  season: '2024-25',
  wins: 42,
  losses: 8,
  conferenceRank: 1,
  divisionRank: 1,
  homeRecord: '22-3',
  awayRecord: '20-5',
  lastTen: '8-2',
};

const warriorsRecord: TeamSeasonRecord = {
  team: mockTeams[2],
  season: '2024-25',
  wins: 28,
  losses: 22,
  conferenceRank: 9,
  divisionRank: 3,
  homeRecord: '16-10',
  awayRecord: '12-12',
  lastTen: '4-6',
};

const heatRecord: TeamSeasonRecord = {
  team: mockTeams[3],
  season: '2024-25',
  wins: 24,
  losses: 26,
  conferenceRank: 10,
  divisionRank: 3,
  homeRecord: '14-12',
  awayRecord: '10-14',
  lastTen: '5-5',
};

export const mockPregameData: Record<string, PregameData> = {
  'game-001': {
    gameId: 'game-001',
    scheduledAt: '7:30 PM ET',
    venue: 'Crypto.com Arena',
    broadcaster: 'ESPN',
    homeTeam: {
      team: mockTeams[0],
      starters: getPlayersByTeam('LAL').slice(0, 5),
      availability: [
        { player: mockPlayers[6], status: InjuryStatus.QUESTIONABLE, reason: 'Left ankle soreness' },
        { player: mockPlayers[7], status: InjuryStatus.OUT, reason: 'Right knee tendinitis' },
      ],
      seasonRecord: lakersRecord,
    },
    awayTeam: {
      team: mockTeams[1],
      starters: getPlayersByTeam('BOS').slice(0, 5),
      availability: [
        { player: mockPlayers[13], status: InjuryStatus.PROBABLE, reason: 'Rest' },
      ],
      seasonRecord: celticsRecord,
    },
  },
  'game-002': {
    gameId: 'game-002',
    scheduledAt: '10:00 PM ET',
    venue: 'Chase Center',
    broadcaster: 'TNT',
    homeTeam: {
      team: mockTeams[2],
      starters: getPlayersByTeam('GSW').slice(0, 5),
      availability: [
        { player: mockPlayers[26], status: InjuryStatus.QUESTIONABLE, reason: 'Left knee soreness' },
        { player: mockPlayers[27], status: InjuryStatus.OUT, reason: 'Right knee injury' },
      ],
      seasonRecord: warriorsRecord,
    },
    awayTeam: {
      team: mockTeams[3],
      starters: getPlayersByTeam('MIA').slice(0, 5),
      availability: [
        { player: mockPlayers[28], status: InjuryStatus.QUESTIONABLE, reason: 'Back tightness' },
      ],
      seasonRecord: heatRecord,
    },
  },
};

export function getPregameData(gameId: string): PregameData | null {
  return mockPregameData[gameId] || null;
}