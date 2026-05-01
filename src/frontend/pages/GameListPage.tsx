import { useNavigate, useSearchParams } from 'react-router-dom';
import { Game, GameStatus } from '@domain/types';
import { useGames } from '@frontend/hooks/useGames';
import './GameListPage.css';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function GameListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const dateFromUrl = searchParams.get('date') || undefined;
  const { games, loading, error, refetch, isStale, lastUpdated } = useGames(dateFromUrl);

  const today = new Date();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  const selectedDate = dateFromUrl ? new Date(dateFromUrl + 'T00:00:00') : today;

  const handleDateChange = (newDate: string) => {
    if (newDate) {
      setSearchParams({ date: newDate });
    } else {
      setSearchParams({});
    }
  };

  const handleQuickNav = (direction: 'yesterday' | 'today' | 'tomorrow') => {
    switch (direction) {
      case 'yesterday':
        setSearchParams({ date: formatDate(yesterday) });
        break;
      case 'today':
        setSearchParams({});
        break;
      case 'tomorrow':
        setSearchParams({ date: formatDate(tomorrow) });
        break;
    }
  };

  const handleGameClick = (game: Game) => {
    const gameDate = new Date(game.scheduledAt).toISOString().split('T')[0];
    navigate(`/games/${game.id}?date=${gameDate}`, { state: { game, date: gameDate } });
  };

  const getStatusClass = (status: GameStatus) => {
    switch (status) {
      case GameStatus.LIVE:
        return 'status-live';
      case GameStatus.SCHEDULED:
        return 'status-scheduled';
      case GameStatus.FINAL:
        return 'status-final';
      default:
        return '';
    }
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isTodaySelected = !dateFromUrl || dateFromUrl === formatDate(today);

  if (loading) {
    return (
      <div className="game-list-page">
        <header className="page-header">
          <h1>🏀 NBA Stats</h1>
          <div className="date-picker-row">
            <input
              type="date"
              className="date-input"
              value={dateFromUrl || ''}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <div className="quick-nav">
              <button onClick={() => handleQuickNav('yesterday')}>{'<'} Ontem</button>
              <button onClick={() => handleQuickNav('today')} className={isTodaySelected ? 'active' : ''}>Hoje</button>
              <button onClick={() => handleQuickNav('tomorrow')}>Amanhã {'>'}</button>
            </div>
          </div>
        </header>
        <main className="games-container">
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <p>Carregando jogos...</p>
          </div>
        </main>
        <footer className="page-footer">
          <p>NBA Stats • Dados: ESPN</p>
        </footer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-list-page">
        <header className="page-header">
          <h1>🏀 NBA Stats</h1>
          <div className="date-picker-row">
            <input
              type="date"
              className="date-input"
              value={dateFromUrl || ''}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <div className="quick-nav">
              <button onClick={() => handleQuickNav('yesterday')}>{'<'} Ontem</button>
              <button onClick={() => handleQuickNav('today')} className={isTodaySelected ? 'active' : ''}>Hoje</button>
              <button onClick={() => handleQuickNav('tomorrow')}>Amanhã {'>'}</button>
            </div>
          </div>
        </header>
        <main className="games-container">
          <div className="error-state">
            <p className="error-title">Erro ao carregar jogos</p>
            <p className="error-message">{error}</p>
            <button onClick={refetch} className="retry-button">
              Tentar novamente
            </button>
          </div>
        </main>
        <footer className="page-footer">
          <p>NBA Stats • Dados: ESPN</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="game-list-page">
      <header className="page-header">
        <h1>🏀 NBA Stats</h1>
        <div className="date-picker-row">
          <input
            type="date"
            className="date-input"
            value={dateFromUrl || ''}
            onChange={(e) => handleDateChange(e.target.value)}
          />
          <div className="quick-nav">
            <button onClick={() => handleQuickNav('yesterday')}>{'<'} Ontem</button>
            <button onClick={() => handleQuickNav('today')} className={isTodaySelected ? 'active' : ''}>Hoje</button>
            <button onClick={() => handleQuickNav('tomorrow')}>Amanhã {'>'}</button>
          </div>
        </div>
        {!isTodaySelected && (
          <p className="subtitle">Jogos de {formatDisplayDate(selectedDate)}</p>
        )}
        {isTodaySelected && (
          <p className="subtitle">{"Today's Games"}</p>
        )}
      </header>

      {isStale && (
        <div className="stale-indicator">
          <span className="warning-icon">⚠️</span>
          <span>
            Dados podem estar desatualizados
            {lastUpdated && ` (última att: há ${Math.floor((Date.now() - lastUpdated.getTime()) / 60000)} min)`}
          </span>
          <button onClick={refetch} className="stale-refresh-button">
            Atualizar
          </button>
        </div>
      )}

      <main className="games-container">
        {games.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">Nenhum jogo encontrado</p>
            <p className="empty-message">
              {isTodaySelected
                ? 'Não há jogos NBA programados para hoje.'
                : `Não há jogos NBA para ${formatDisplayDate(selectedDate)}.`}
            </p>
            <p className="empty-hint">Tente selecionar outra data.</p>
            <button onClick={() => handleQuickNav('today')} className="retry-button">
              Voltar para hoje
            </button>
          </div>
        ) : (
          <div className="games-grid">
            {games.map((game) => (
              <div
                key={game.id}
                className="game-card"
                onClick={() => handleGameClick(game)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleGameClick(game)}
              >
                <div className="game-card-header">
                  <span className={`game-status ${getStatusClass(game.status)}`}>
                    {game.status === GameStatus.LIVE && '● AO VIVO'}
                    {game.status === GameStatus.SCHEDULED && '⏰ AGENDADO'}
                    {game.status === GameStatus.FINAL && '✅ FINAL'}
                    {game.status === GameStatus.POSTPONED && '⏸ POSTPOSTO'}
                    {game.status === GameStatus.CANCELLED && '❌ CANCELADO'}
                    {game.status !== GameStatus.LIVE && game.status !== GameStatus.SCHEDULED &&
                     game.status !== GameStatus.FINAL && game.status !== GameStatus.POSTPONED &&
                     game.status !== GameStatus.CANCELLED && game.status}
                    {game.status === GameStatus.LIVE && game.period && (
                      <span className="period-info">
                        {' '}
                        • {game.period}
                        {game.periodType && ` ${game.periodType}`}
                        {game.clock && ` • ${game.clock}`}
                      </span>
                    )}
                  </span>
                  <span className="game-time">
                    {new Date(game.scheduledAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="game-matchup">
                  <div className="team-row">
                    <span className="team-name">
                      {game.awayTeam.abbreviation} {game.awayTeam.shortName}
                    </span>
                    <span className="team-score">{game.awayScore}</span>
                  </div>
                  <div className="vs-row">@</div>
                  <div className="team-row">
                    <span className="team-name">
                      {game.homeTeam.abbreviation} {game.homeTeam.shortName}
                    </span>
                    <span className="team-score">{game.homeScore}</span>
                  </div>
                </div>

                {game.broadcaster && (
                  <div className="game-venue">{game.broadcaster}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="page-footer">
        <p>NBA Stats • Fonte: ESPN Scoreboard</p>
      </footer>
    </div>
  );
}

export default GameListPage;