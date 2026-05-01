import { Game, Player, Injury, Team, InjuryStatus, GameStatus, PeriodType } from '@domain/types';

// Mock Teams
export const mockTeams: Team[] = [
  {
    id: 'LAL',
    name: 'Los Angeles Lakers',
    shortName: 'Lakers',
    abbreviation: 'LAL',
    city: 'Los Angeles',
    conference: 'West',
    primaryColor: '#552583',
    secondaryColor: '#FDB927',
  },
  {
    id: 'BOS',
    name: 'Boston Celtics',
    shortName: 'Celtics',
    abbreviation: 'BOS',
    city: 'Boston',
    conference: 'East',
    primaryColor: '#007A33',
    secondaryColor: '#BA9653',
  },
  {
    id: 'GSW',
    name: 'Golden State Warriors',
    shortName: 'Warriors',
    abbreviation: 'GSW',
    city: 'Golden State',
    conference: 'West',
    primaryColor: '#1D428A',
    secondaryColor: '#FFC72C',
  },
  {
    id: 'MIA',
    name: 'Miami Heat',
    shortName: 'Heat',
    abbreviation: 'MIA',
    city: 'Miami',
    conference: 'East',
    primaryColor: '#98002E',
    secondaryColor: '#F9A01B',
  },
];

// Mock Games
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

// Mock Players
export const mockPlayers: Player[] = [
  {
    id: 'player-001',
    name: 'LeBron James',
    jerseyNumber: '23',
    position: 'SF',
    height: '6-9',
    weight: '250 lbs',
    birthDate: 'December 30, 1984',
    yearsExperience: 21,
    teamId: 'LAL',
  },
  {
    id: 'player-002',
    name: 'Stephen Curry',
    jerseyNumber: '30',
    position: 'PG',
    height: '6-2',
    weight: '185 lbs',
    birthDate: 'March 14, 1988',
    yearsExperience: 15,
    teamId: 'GSW',
  },
  {
    id: 'player-003',
    name: 'Jayson Tatum',
    jerseyNumber: '0',
    position: 'SF',
    height: '6-8',
    weight: '210 lbs',
    birthDate: 'March 3, 1998',
    yearsExperience: 7,
    teamId: 'BOS',
  },
  {
    id: 'player-004',
    name: 'Jimmy Butler',
    jerseyNumber: '22',
    position: 'SF',
    height: '6-7',
    weight: '230 lbs',
    birthDate: 'September 14, 1989',
    yearsExperience: 13,
    teamId: 'MIA',
  },
];

// Mock Injuries
export const mockInjuries: Injury[] = [
  {
    id: 'injury-001',
    playerId: 'player-001',
    playerName: 'LeBron James',
    teamId: 'LAL',
    status: InjuryStatus.QUESTIONABLE,
    description: 'Left ankle soreness',
    updatedAt: '2024-01-15 6:00 PM',
  },
  {
    id: 'injury-002',
    playerId: 'player-002',
    playerName: 'Stephen Curry',
    teamId: 'GSW',
    status: InjuryStatus.OUT,
    description: 'Left knee inflammation',
    updatedAt: '2024-01-15 5:30 PM',
  },
  {
    id: 'injury-003',
    playerId: 'player-003',
    playerName: 'Jayson Tatum',
    teamId: 'BOS',
    status: InjuryStatus.PROBABLE,
    description: 'Right wrist tendinitis',
    updatedAt: '2024-01-15 4:00 PM',
  },
  {
    id: 'injury-004',
    playerId: 'player-004',
    playerName: 'Jimmy Butler',
    teamId: 'MIA',
    status: InjuryStatus.DOUBTFUL,
    description: 'Left hip strain',
    updatedAt: '2024-01-15 3:00 PM',
  },
];