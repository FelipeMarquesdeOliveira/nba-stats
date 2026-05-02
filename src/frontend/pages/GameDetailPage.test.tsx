/**
 * GameDetailPage Component Tests
 *
 * Tests the GameDetailPage routing and structure:
 * - Loading state
 * - Not found state
 * - Back button navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GameDetailPage from './GameDetailPage';
import { Game, GameStatus, PeriodType } from '@domain/types';

// Mock the entire @data-collection module to avoid circuitBreaker issues
vi.mock('@data-collection', () => ({
  gameGateway: {
    getGameById: vi.fn()
  },
  liveBoxScoreGateway: {
    getLiveBoxScore: vi.fn()
  },
  circuitBreaker: {
    getState: vi.fn().mockReturnValue('CLOSED')
  },
  circuitBreakerCircuitState: {},
  CircuitState: {
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN'
  },
  DataSource: {
    ESPN: 'ESPN',
    STATS_NBA_COM: 'STATS_NBA_COM'
  }
}));

import { gameGateway } from '@data-collection';
const mockGetGameById = gameGateway.getGameById as ReturnType<typeof vi.fn>;

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
  broadcaster: 'TNT'
};

function renderWithRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/games/:gameId" element={<GameDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('GameDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner initially', async () => {
      mockGetGameById.mockImplementation(() => new Promise(() => {}));

      renderWithRoute('/games/game-123');

      expect(screen.getByText('Carregando jogo...')).toBeInTheDocument();
    });
  });

  describe('game not found', () => {
    it('shows not found when gameId does not exist', async () => {
      mockGetGameById.mockResolvedValue(null);

      renderWithRoute('/games/nonexistent');

      await waitFor(() => {
        expect(screen.getByText('Jogo não encontrado')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('shows back button', async () => {
      mockGetGameById.mockResolvedValue(mockGame);

      renderWithRoute('/games/game-123');

      await waitFor(() => {
        expect(screen.getByText('← Voltar')).toBeInTheDocument();
      });
    });
  });

  describe('date resolution', () => {
    it('uses date from URL query param', async () => {
      mockGetGameById.mockResolvedValue(mockGame);

      renderWithRoute('/games/game-123?date=2026-05-01');

      await waitFor(() => {
        expect(mockGetGameById).toHaveBeenCalledWith('game-123', '2026-05-01');
      });
    });

    it('uses today when no date provided', async () => {
      mockGetGameById.mockResolvedValue(mockGame);

      renderWithRoute('/games/game-123');

      await waitFor(() => {
        expect(mockGetGameById).toHaveBeenCalledWith('game-123', undefined);
      });
    });

    it('shows helpful message for past games not found', async () => {
      mockGetGameById.mockResolvedValue(null);

      renderWithRoute('/games/old-game?date=2026-04-15');

      await waitFor(() => {
        expect(screen.getByText('Este jogo não está disponível para a data selecionada.')).toBeInTheDocument();
      });
    });
  });

  describe('route state', () => {
    it('renders immediately with game from route state', async () => {
      const gameFromState: Game = { ...mockGame };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/games/game-123', search: '?date=2026-05-01', state: { game: gameFromState, date: '2026-05-01' } }]}>
          <Routes>
            <Route path="/games/:gameId" element={<GameDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Should show back button immediately (no loading spinner for game fetch)
      await waitFor(() => {
        expect(screen.getByText('← Voltar')).toBeInTheDocument();
      });
      // Should render FinalView (boxscore fetch may still be pending/failed)
      await waitFor(() => {
        expect(screen.getByText('Dados não disponíveis para este jogo.')).toBeInTheDocument();
      });
    });
  });
});
