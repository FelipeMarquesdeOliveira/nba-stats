import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Game, GameStatus } from '@domain/types';
import { gameGateway } from '@data-collection';
import PregameView from '../components/pregame/PregameView';
import LiveView from '../components/live/LiveView';
import FinalView from '../components/final/FinalView';
import './GameLayout.css';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function GameLayout() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const dateFromUrl = searchParams.get('date') || undefined;
  const dateFromState = location.state?.date;
  const resolvedDate = dateFromUrl || dateFromState;

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(location.state?.game || null);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(!location.state?.game);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const selectedDate = dateFromUrl ? new Date(dateFromUrl + 'T00:00:00') : today;
  const isTodaySelected = !dateFromUrl || dateFromUrl === formatDate(today);

  const fetchGames = useCallback(async () => {
    setLoadingGames(true);
    setError(null);
    try {
      const fetchedGames = await gameGateway.getGamesForDate(resolvedDate);
      setGames(fetchedGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar jogos');
    } finally {
      setLoadingGames(false);
    }
  }, [resolvedDate]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    if (location.state?.game) {
      setSelectedGame(location.state.game);
      setLoadingDetail(false);
      return;
    }

    if (!gameId) {
      if (games.length > 0 && !selectedGame) {
        setSelectedGame(games[0]);
      }
      setLoadingDetail(false);
      return;
    }

    const fetchGame = async () => {
      setLoadingDetail(true);
      try {
        const fetchedGame = await gameGateway.getGameById(gameId, resolvedDate);
        if (fetchedGame) {
          setSelectedGame(fetchedGame);
        }
      } catch (err) {
        // silently fail, will show game not found
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchGame();
  }, [gameId, location.state, games, selectedGame, resolvedDate]);

  const handleDateChange = (newDate: string) => {
    if (newDate) {
      setSearchParams({ date: newDate });
    } else {
      setSearchParams({});
    }
  };

  const handleQuickNav = (direction: 'previous' | 'today' | 'next') => {
    switch (direction) {
      case 'previous':
        setSearchParams({ date: formatDate(addDays(selectedDate, -1)) });
        break;
      case 'today':
        setSearchParams({});
        break;
      case 'next':
        setSearchParams({ date: formatDate(addDays(selectedDate, 1)) });
        break;
    }
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    // Use resolvedDate to keep the user on the same date page
    // If not available, generate the date string from the game safely
    let gameDate = resolvedDate;
    if (!gameDate) {
      const d = new Date(game.scheduledAt);
      // Offset by timezone to get the correct local date string
      const offsetMs = d.getTimezoneOffset() * 60 * 1000;
      const localDate = new Date(d.getTime() - offsetMs);
      gameDate = localDate.toISOString().split('T')[0];
    }
    navigate(`/games/${game.id}?date=${gameDate}`, { state: { game, date: gameDate } });
  };

  const getStatusClass = (status: GameStatus) => {
    switch (status) {
      case GameStatus.LIVE: return 'live';
      case GameStatus.SCHEDULED: return 'scheduled';
      case GameStatus.FINAL: return 'final';
      default: return 'scheduled';
    }
  };

  const getStatusLabel = (status: GameStatus, period?: number, clock?: string) => {
    switch (status) {
      case GameStatus.LIVE: {
        let liveLabel = 'AO VIVO';
        if (period && clock) {
          liveLabel += ` • ${period}Q ${clock}`;
        } else if (period) {
          liveLabel += ` • ${period}Q`;
        }
        return liveLabel;
      }
      case GameStatus.SCHEDULED: return 'AGENDADO';
      case GameStatus.FINAL: return 'FINAL';
      default: return status;
    }
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderGameView = () => {
    if (!selectedGame) {
      return (
        <div className="game-not-found">
          <h2>Nenhum jogo selecionado</h2>
          <p>Selecione um jogo na barra lateral para começar.</p>
        </div>
      );
    }

    switch (selectedGame.status) {
      case GameStatus.SCHEDULED:
        return <PregameView game={selectedGame} />;
      case GameStatus.LIVE:
        return <LiveView game={selectedGame} />;
      case GameStatus.FINAL:
        return <FinalView game={selectedGame} />;
      default:
        return <PregameView game={selectedGame} />;
    }
  };

  return (
    <div className="game-layout">
      <aside className="game-sidebar">
        <div className="sidebar-header">
          <h1>🏀 NBA Stats</h1>
          <div className="sidebar-date-section">
            <input
              type="date"
              className="date-input"
              value={dateFromUrl || ''}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <div className="quick-nav">
              <button onClick={() => handleQuickNav('previous')}>{'<'} Anterior</button>
              <button onClick={() => handleQuickNav('today')} className={isTodaySelected ? 'active' : ''}>Hoje</button>
              <button onClick={() => handleQuickNav('next')}>Próximo {'>'}</button>
            </div>
            {!isTodaySelected && (
              <p className="selected-date-label">{formatDisplayDate(selectedDate)}</p>
            )}
          </div>
        </div>

        <div className="sidebar-games-section">
          <div className="sidebar-games-header">
            <h2>{isTodaySelected ? "Jogos de Hoje" : `Jogos de ${formatDisplayDate(selectedDate)}`}</h2>
          </div>

          {loadingGames && (
            <div className="sidebar-loading">
              <div className="loading-spinner">⏳</div>
              <p>Carregando jogos...</p>
            </div>
          )}

          {error && !loadingGames && (
            <div className="sidebar-error">
              <p>Erro ao carregar jogos</p>
              <p className="error-message">{error}</p>
              <button onClick={fetchGames}>Tentar novamente</button>
            </div>
          )}

          {!loadingGames && !error && games.length === 0 && (
            <div className="sidebar-empty">
              <p>Nenhum jogo encontrado para esta data.</p>
              <button onClick={() => handleQuickNav('today')}>Voltar para hoje</button>
            </div>
          )}

          {!loadingGames && !error && games.length > 0 && (
            <div className="sidebar-games-list">
              {games.map((game) => (
                <div
                  key={game.id}
                  className={`sidebar-game-card ${selectedGame?.id === game.id ? 'active' : ''}`}
                  onClick={() => handleGameSelect(game)}
                >
                  <div className="sidebar-game-status">
                    <span className={`status-badge ${getStatusClass(game.status)}`}>
                      {getStatusLabel(game.status, game.period, game.clock)}
                    </span>
                    <span className="game-time">
                      {new Date(game.scheduledAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="sidebar-game-matchup">
                    <div className="sidebar-team-row away">
                      <span className="team-abbr">{game.awayTeam.abbreviation}</span>
                      <span className="team-score">{game.awayScore}</span>
                    </div>
                    <div className="sidebar-team-row">
                      <span className="team-abbr">{game.homeTeam.abbreviation}</span>
                      <span className="team-score">{game.homeScore}</span>
                    </div>
                  </div>
                  {game.status === GameStatus.LIVE && game.period && (
                    <div className="sidebar-game-period">
                      {game.period}º {game.periodType || 'QUARTER'} {game.clock && `- ${game.clock}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="game-main-content">
        {loadingDetail && (
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <p>Carregando jogo...</p>
          </div>
        )}
        {!loadingDetail && renderGameView()}
      </main>
    </div>
  );
}

export default GameLayout;