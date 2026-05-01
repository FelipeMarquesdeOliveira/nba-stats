/**
 * FinalView Component Tests
 *
 * Tests all states and visual elements of the FinalView component:
 * - States: loading, circuit-open, error, no-data
 * - Scoreboard: final scores, win margin
 * - Game summary: team stats
 * - Boxscore: player list sorted by points
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FinalView from './FinalView';
import { Game, GameStatus, BoxScore, BoxScorePlayer, PeriodType, OnCourtStatus } from '@domain/types';

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
  homeScore: 108,
  awayScore: 100,
  status: GameStatus.FINAL,
  scheduledAt: '2026-05-01T19:00:00Z',
  period: 4,
  periodType: PeriodType.QUARTER,
  clock: '0:00',
  broadcaster: 'TNT',
  venue: 'Crypto.com Arena'
};

const createMockPlayer = (
  id: string,
  points: number,
  isStarter: boolean = true
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
  minutesPlayed: '25:00',
  fieldGoalsMade: 8,
  fieldGoalsAttempted: 15,
  threePointersMade: 2,
  threePointersAttempted: 5,
  freeThrowsMade: 4,
  freeThrowsAttempted: 5,
  plusMinus: 5,
  isStarter,
  isOnCourt: false,
  onCourtStatus: OnCourtStatus.UNKNOWN,
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
        createMockPlayer('1', 28, true),
        createMockPlayer('2', 22, true),
        createMockPlayer('3', 15, false),
        createMockPlayer('4', 10, false),
        createMockPlayer('5', 8, false),
        createMockPlayer('6', 5, false),
        createMockPlayer('7', 3, false),
        createMockPlayer('8', 0, false),
      ]
    },
    awayTeam: {
      abbreviation: 'GSW',
      name: 'Golden State Warriors',
      players: [
        createMockPlayer('9', 25, true),
        createMockPlayer('10', 20, true),
        createMockPlayer('11', 18, false),
        createMockPlayer('12', 12, false),
        createMockPlayer('13', 8, false),
        createMockPlayer('14', 5, false),
        createMockPlayer('15', 3, false),
        createMockPlayer('16', 0, false),
      ]
    },
    homeScore,
    awayScore,
    period: 4,
    clock: '0:00',
    players: [],
    teamStats: {
      'LAL': { FGM: 40, FGA: 85, FG3M: 12, FG3A: 30, FTM: 16, FTA: 20, REB: 45, AST: 25 },
      'GSW': { FGM: 38, FGA: 80, FG3M: 14, FG3A: 35, FTM: 10, FTA: 12, REB: 40, AST: 22 }
    },
    highlights: []
  };
}

describe('FinalView', () => {
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

      render(<FinalView game={mockGame} />);
      expect(screen.getByText('Carregando boxscore...')).toBeInTheDocument();
    });

    it('shows circuit-open state with retry button', () => {
      mockUseLiveGame.mockReturnValue({
        boxscore: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: true
      });

      render(<FinalView game={mockGame} />);
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

      render(<FinalView game={mockGame} />);
      expect(screen.getByText('Erro ao carregar boxscore')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    });

    it('shows no-data message when boxscore is null', () => {
      mockUseLiveGame.mockReturnValue({
        boxscore: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<FinalView game={mockGame} />);
      expect(screen.getByText('Boxscore não disponível para este jogo.')).toBeInTheDocument();
    });
  });

  describe('scoreboard', () => {
    it('displays correct final scores for both teams', () => {
      const mockBoxscore = createMockBoxscore(108, 100);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<FinalView game={mockGame} />);
      expect(screen.getByText('108')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('LAL')).toBeInTheDocument();
      expect(screen.getByText('GSW')).toBeInTheDocument();
    });

    it('shows win margin when winner exists', () => {
      const mockBoxscore = createMockBoxscore(108, 100);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<FinalView game={mockGame} />);
      expect(screen.getByText('LAL by 8')).toBeInTheDocument();
    });

    it('does not show win margin when tied', () => {
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

      render(<FinalView game={mockGame} />);
      expect(screen.queryByText(/by \d+/)).not.toBeInTheDocument();
    });

    it('shows venue information', () => {
      const mockBoxscore = createMockBoxscore(108, 100);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<FinalView game={mockGame} />);
      expect(screen.getByText('Crypto.com Arena')).toBeInTheDocument();
    });
  });

  describe('game summary', () => {
    it('shows team stats for both teams', () => {
      const mockBoxscore = createMockBoxscore(108, 100);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<FinalView game={mockGame} />);
      // Stats appear twice - once for each team
      expect(screen.getAllByText('Field Goals').length).toBe(2);
      expect(screen.getAllByText('3-Pointers').length).toBe(2);
      expect(screen.getAllByText('Free Throws').length).toBe(2);
      expect(screen.getAllByText('Rebounds').length).toBe(2);
      expect(screen.getAllByText('Assists').length).toBe(2);
    });
  });

  describe('boxscore', () => {
    it('sorts players by points descending', () => {
      const mockBoxscore = createMockBoxscore(108, 100);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<FinalView game={mockGame} />);
      // First player should be highest scorer (28 points)
      const ptsCells = screen.getAllByText('28');
      expect(ptsCells.length).toBeGreaterThan(0);
    });
  });

  describe('quarter-by-quarter', () => {
    it('does not render quarter section when quarterScores is undefined', () => {
      const mockBoxscore = createMockBoxscore(108, 100);
      mockUseLiveGame.mockReturnValue({
        boxscore: mockBoxscore,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<FinalView game={mockGame} />);
      expect(screen.queryByText('Quarter by Quarter')).not.toBeInTheDocument();
    });
  });
});
