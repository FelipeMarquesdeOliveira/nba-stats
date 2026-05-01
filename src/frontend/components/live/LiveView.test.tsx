/**
 * LiveView Component Tests
 *
 * Tests all states and visual elements of the LiveView component:
 * - States: loading, circuit-open, error, stale
 * - Scoreboard: lead indicator
 * - On-court: badge with confidence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveView from './LiveView';
import { Game, GameStatus, OnCourtStatus, BoxScore, BoxScorePlayer, PeriodType } from '@domain/types';

// Mock the useLiveGame hook
vi.mock('@frontend/hooks/useLiveGame', () => ({
  useLiveGame: vi.fn()
}));

import { useLiveGame } from '@frontend/hooks/useLiveGame';
const mockUseLiveGame = useLiveGame as ReturnType<typeof vi.fn>;

const mockGame: Game = {
  id: 'game-123',
  homeTeam: {
    id: 'team-lal',
    name: 'Los Angeles Lakers',
    shortName: 'Lakers',
    abbreviation: 'LAL',
    city: 'Los Angeles',
    conference: 'West',
    primaryColor: '#552583',
    secondaryColor: '#FDB927'
  },
  awayTeam: {
    id: 'team-gsw',
    name: 'Golden State Warriors',
    shortName: 'Warriors',
    abbreviation: 'GSW',
    city: 'Golden State',
    conference: 'West',
    primaryColor: '#1D428A',
    secondaryColor: '#FFC72C'
  },
  homeScore: 102,
  awayScore: 98,
  status: GameStatus.LIVE,
  scheduledAt: '2026-05-01T20:00:00Z',
  period: 4,
  periodType: PeriodType.QUARTER,
  clock: '5:30',
  broadcaster: 'TNT'
};

const createMockPlayer = (
  id: string,
  points: number,
  onCourtStatus: OnCourtStatus,
  isStarter: boolean,
  minutesPlayed: string = '25:00'
): BoxScorePlayer => ({
  player: {
    id,
    name: `Player ${id}`,
    position: 'F',
    jerseyNumber: '23',
    height: '6-8',
    weight: '200',
    birthDate: '1990-01-01',
    yearsExperience: 8,
    teamId: 'team-lal'
  },
  teamAbbreviation: 'LAL',
  points,
  rebounds: 5,
  assists: 5,
  steals: 1,
  blocks: 1,
  turnovers: 2,
  minutesPlayed,
  fieldGoalsMade: 8,
  fieldGoalsAttempted: 15,
  threePointersMade: 2,
  threePointersAttempted: 5,
  freeThrowsMade: 4,
  freeThrowsAttempted: 5,
  plusMinus: 5,
  isStarter,
  isOnCourt: onCourtStatus !== OnCourtStatus.UNKNOWN,
  onCourtStatus,
  fieldGoalPct: 53.3,
  threePointPct: 40.0,
  freeThrowPct: 80.0,
  efficiency: 20
});

function createMockBoxscore(homeScore: number, awayScore: number): BoxScore {
  return {
    gameId: 'game-123',
    homeTeam: {
      abbreviation: 'LAL',
      name: 'Los Angeles Lakers',
      players: [
        createMockPlayer('1', 28, OnCourtStatus.ESTIMATED, true, '30:00'),
        createMockPlayer('2', 22, OnCourtStatus.ESTIMATED, true, '28:00'),
        createMockPlayer('3', 15, OnCourtStatus.ESTIMATED, false, '20:00'),
        createMockPlayer('4', 10, OnCourtStatus.UNKNOWN, false, '10:00'),
        createMockPlayer('5', 8, OnCourtStatus.UNKNOWN, false, '08:00'),
        createMockPlayer('6', 5, OnCourtStatus.UNKNOWN, false, '05:00'),
        createMockPlayer('7', 3, OnCourtStatus.UNKNOWN, false, '03:00'),
        createMockPlayer('8', 0, OnCourtStatus.UNKNOWN, false, '00:00'),
      ]
    },
    awayTeam: {
      abbreviation: 'GSW',
      name: 'Golden State Warriors',
      players: [
        createMockPlayer('9', 30, OnCourtStatus.ESTIMATED, true, '32:00'),
        createMockPlayer('10', 20, OnCourtStatus.ESTIMATED, true, '26:00'),
        createMockPlayer('11', 18, OnCourtStatus.ESTIMATED, false, '22:00'),
        createMockPlayer('12', 12, OnCourtStatus.UNKNOWN, false, '12:00'),
        createMockPlayer('13', 8, OnCourtStatus.UNKNOWN, false, '08:00'),
        createMockPlayer('14', 5, OnCourtStatus.UNKNOWN, false, '05:00'),
        createMockPlayer('15', 3, OnCourtStatus.UNKNOWN, false, '03:00'),
        createMockPlayer('16', 0, OnCourtStatus.UNKNOWN, false, '00:00'),
      ]
    },
    homeScore,
    awayScore,
    period: 4,
    clock: '5:30',
    players: [],
    teamStats: {},
    highlights: []
  };
}

describe('LiveView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('states', () => {
    it('shows loading spinner when loading', () => {
      mockUseLiveGame.mockReturnValue({
        boxscore: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      expect(screen.getByText('Carregando dados ao vivo...')).toBeInTheDocument();
    });

    it('shows circuit-open state', () => {
      mockUseLiveGame.mockReturnValue({
        boxscore: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: true
      });

      render(<LiveView game={mockGame} />);
      expect(screen.getByText('Serviço temporariamente indisponível')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    });

    it('shows error state with retry button', () => {
      mockUseLiveGame.mockReturnValue({
        boxscore: null,
        loading: false,
        error: 'Erro ao carregar',
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    });
  });

  describe('scoreboard', () => {
    it('displays correct scores for both teams', () => {
      const mockBoxscore = createMockBoxscore(102, 98);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      expect(screen.getByText('102')).toBeInTheDocument();
      expect(screen.getByText('98')).toBeInTheDocument();
    });

    it('shows lead indicator when home team is winning', () => {
      const mockBoxscore = createMockBoxscore(102, 98);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      // Home lead is 102 - 98 = 4
      expect(screen.getByText('+4')).toBeInTheDocument();
    });

    it('shows lead indicator when away team is winning', () => {
      const mockBoxscore = createMockBoxscore(98, 105);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      // Away should show +7 (105 - 98)
      expect(screen.getByText('+7')).toBeInTheDocument();
    });

    it('does not show lead indicator when tied', () => {
      const mockBoxscore = createMockBoxscore(100, 100);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      expect(screen.queryByText('+0')).not.toBeInTheDocument();
    });

    it('shows period and clock', () => {
      const mockBoxscore = createMockBoxscore(102, 98);
      mockBoxscore.period = 4;
      mockBoxscore.clock = '5:30';

      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      expect(screen.getByText('4 • 5:30')).toBeInTheDocument();
    });

    it('shows last play when available', () => {
      const mockBoxscore = createMockBoxscore(102, 98);
      mockBoxscore.lastPlay = 'LeBron 3PT - 2:30 left';

      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      expect(screen.getByText('LeBron 3PT - 2:30 left')).toBeInTheDocument();
    });
  });

  describe('on-court badge', () => {
    it('shows confidence badge with emoji counts', () => {
      const mockBoxscore = createMockBoxscore(102, 98);
      // Customize to have specific counts
      mockBoxscore.homeTeam.players = [
        createMockPlayer('1', 25, OnCourtStatus.HIGH_CONFIDENCE, true, '30:00'),
        createMockPlayer('2', 18, OnCourtStatus.HIGH_CONFIDENCE, true, '28:00'),
        createMockPlayer('3', 12, OnCourtStatus.ESTIMATED, false, '15:00'),
        createMockPlayer('4', 8, OnCourtStatus.ESTIMATED, false, '12:00'),
      ];

      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      // Should show 2 🔴 and 2 🟡
      expect(screen.getByText(/2 🔴/)).toBeInTheDocument();
      expect(screen.getByText(/2 🟡/)).toBeInTheDocument();
    });
  });

  describe('data confidence note', () => {
    it('shows disclaimer note at bottom of view', () => {
      const mockBoxscore = createMockBoxscore(102, 98);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<LiveView game={mockGame} />);
      expect(screen.getByText(/inferência baseada em contexto/)).toBeInTheDocument();
    });
  });
});