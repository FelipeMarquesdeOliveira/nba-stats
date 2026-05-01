/**
 * PregameView Component Tests
 *
 * Tests all states and visual elements of the PregameView component:
 * - States: loading, circuit-open, error
 * - Matchup display: teams, B2B badge
 * - Injuries: grouping by status, empty state
 * - Lineup unavailability message
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PregameView from './PregameView';
import { Game, GameStatus, AvailabilityItem, InjuryStatus } from '@domain/types';

// Mock the useInjuries hook
vi.mock('@frontend/hooks/useInjuries', () => ({
  useInjuries: vi.fn()
}));

import { useInjuries } from '@frontend/hooks/useInjuries';
const mockUseInjuries = useInjuries as ReturnType<typeof vi.fn>;

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
  homeScore: 0,
  awayScore: 0,
  status: GameStatus.SCHEDULED,
  scheduledAt: '2026-05-02T19:00:00Z',
  broadcaster: 'TNT'
};

const createMockInjury = (
  playerName: string,
  status: InjuryStatus,
  teamName: string
): AvailabilityItem => ({
  player: {
    id: `player-${playerName}`,
    name: playerName,
    position: 'F',
    jerseyNumber: '23',
    height: '6-8',
    weight: '200',
    birthDate: '1990-01-01',
    yearsExperience: 8,
    teamId: 'team-lal'
  },
  teamName, // Use exact team name that will match via includes()
  status,
  reason: 'Knee injury'
});

describe('PregameView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('states', () => {
    it('shows loading spinner', () => {
      mockUseInjuries.mockReturnValue({
        injuries: [],
        loading: true,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<PregameView game={mockGame} />);
      expect(screen.getByText('Carregando dados pré-jogo...')).toBeInTheDocument();
    });

    it('shows circuit-open state', () => {
      mockUseInjuries.mockReturnValue({
        injuries: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: true
      });

      render(<PregameView game={mockGame} />);
      expect(screen.getByText('Serviço temporariamente indisponível')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    });

    it('shows error state', () => {
      mockUseInjuries.mockReturnValue({
        injuries: [],
        loading: false,
        error: 'Erro ao carregar',
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<PregameView game={mockGame} />);
      expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    });
  });

  describe('injuries display', () => {
    it('groups injuries by status', () => {
      // Use exact team names that match the game's team names
      const injuries: AvailabilityItem[] = [
        createMockInjury('LeBron James', InjuryStatus.OUT, 'Los Angeles Lakers'),
        createMockInjury('Anthony Davis', InjuryStatus.QUESTIONABLE, 'Los Angeles Lakers'),
        createMockInjury('Stephen Curry', InjuryStatus.OUT, 'Golden State Warriors'),
      ];

      mockUseInjuries.mockReturnValue({
        injuries,
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<PregameView game={mockGame} />);
      // Verify specific player names appear (these are in injury lists)
      expect(screen.getByText('LeBron James')).toBeInTheDocument();
      expect(screen.getByText('Stephen Curry')).toBeInTheDocument();
      // Verify status labels appear - use getAllByText since each team shows its own
      expect(screen.getAllByText('OUT').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('QUESTIONABLE').length).toBeGreaterThanOrEqual(1);
    });

    it('shows "Nenhuma lesão reportada" when empty', () => {
      mockUseInjuries.mockReturnValue({
        injuries: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<PregameView game={mockGame} />);
      // Shows for both teams, so check at least one exists
      expect(screen.getAllByText('Nenhuma lesão reportada').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('back-to-back', () => {
    it('shows B2B badge when applicable', () => {
      mockUseInjuries.mockReturnValue({
        injuries: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      // Previous day game
      const previousGame: Game = {
        ...mockGame,
        id: 'game-122',
        scheduledAt: '2026-05-01T19:00:00Z'
      };

      render(<PregameView game={mockGame} recentGames={[previousGame]} />);
      expect(screen.getAllByText('B2B').length).toBe(2); // Both teams played yesterday
    });

    it('does not show B2B badge when not applicable', () => {
      mockUseInjuries.mockReturnValue({
        injuries: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<PregameView game={mockGame} recentGames={[]} />);
      expect(screen.queryByText('B2B')).not.toBeInTheDocument();
    });
  });

  describe('lineup unavailability', () => {
    it('shows "Indisponível" message for starters', () => {
      mockUseInjuries.mockReturnValue({
        injuries: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        lastUpdated: null,
        circuitOpen: false
      });

      render(<PregameView game={mockGame} />);
      // Both teams show "Indisponível"
      expect(screen.getAllByText('Indisponível').length).toBe(2);
      // The message appears for both teams
      expect(screen.getAllByText('Dados de lineup não disponíveis via API pública').length).toBe(2);
    });
  });
});
