import { useNavigate } from 'react-router-dom';
import { mockGames } from '@frontend/mocks';
import { GameStatus } from '@domain/types';
import './GameListPage.css';

function GameListPage() {
  const navigate = useNavigate();

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

  return (
    <div className="game-list-page">
      <header className="page-header">
        <h1>🏀 NBA Stats</h1>
        <p className="subtitle">Today's Games</p>
      </header>

      <main className="games-container">
        <div className="games-grid">
          {mockGames.map((game) => (
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
                <span className="game-time">{game.scheduledAt}</span>
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

              {game.venue && (
                <div className="game-venue">{game.venue}</div>
              )}
            </div>
          ))}
        </div>
      </main>

      <footer className="page-footer">
        <p>NBA Stats • Mock Data Only • Not Connected to Any API</p>
      </footer>
    </div>
  );
}

export default GameListPage;