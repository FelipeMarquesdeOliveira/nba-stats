import { useParams, useNavigate } from 'react-router-dom';
import { mockGames } from '@frontend/mocks';
import { GameStatus } from '@domain/types';
import PregameView from '../components/pregame/PregameView';
import LiveView from '../components/live/LiveView';
import FinalView from '../components/final/FinalView';
import './GameDetailPage.css';

function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const game = mockGames.find((g) => g.id === gameId);

  if (!game) {
    return (
      <div className="game-detail-page">
        <div className="game-not-found">
          <h2>Game not found</h2>
          <button onClick={() => navigate('/games')}>Back to Games</button>
        </div>
      </div>
    );
  }

  const renderGameView = () => {
    switch (game.status) {
      case GameStatus.SCHEDULED:
        return <PregameView game={game} />;
      case GameStatus.LIVE:
        return <LiveView game={game} />;
      case GameStatus.FINAL:
        return <FinalView game={game} />;
      default:
        return <PregameView game={game} />;
    }
  };

  return (
    <div className="game-detail-page">
      <header className="detail-header">
        <button className="back-button" onClick={() => navigate('/games')}>
          ← Back to Games
        </button>
      </header>

      <main className="detail-content">{renderGameView()}</main>
    </div>
  );
}

export default GameDetailPage;