import { useNavigate } from 'react-router-dom';
import { GameStatus } from '@domain/types';
import { useGames } from '@frontend/hooks/useGames';
import './GameListPage.css';

function GameListPage() {
  const navigate = useNavigate();
  const { games, loading, error, refetch, isStale, lastUpdated } = useGames();

  const handleGameClick = (gameId: string) => {
    navigate(`/games/${gameId}`);
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

  if (loading) {
    return (
      <div className="game-list-page">
        <header className="page-header">
          <h1>🏀 NBA Stats</h1>
          <p className="subtitle">Today's Games</p>
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
          <p className="subtitle">Today's Games</p>
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
        <p className="subtitle">Today's Games</p>
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
            <p>Nenhum jogo encontrado para hoje.</p>
            <button onClick={refetch} className="retry-button">
              Atualizar
            </button>
          </div>
        ) : (
          <div className="games-grid">
            {games.map((game) => (
              <div
                key={game.id}
                className="game-card"
                onClick={() => handleGameClick(game.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleGameClick(game.id)}
              >
                <div className="game-card-header">
                  <span className={`game-status ${getStatusClass(game.status)}`}>
                    {game.status}
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