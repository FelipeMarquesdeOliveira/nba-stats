import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Game, GameStatus } from '@domain/types';
import { gameGateway } from '@data-collection';
import PregameView from '../components/pregame/PregameView';
import LiveView from '../components/live/LiveView';
import FinalView from '../components/final/FinalView';
import './GameDetailPage.css';

function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [game, setGame] = useState<Game | null>(location.state?.game || null);
  const [loading, setLoading] = useState(!location.state?.game);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.game) {
      setGame(location.state.game);
      setLoading(false);
      return;
    }

    if (!gameId) {
      setError('Game ID is required');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchGame = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetchedGame = await gameGateway.getGameById(gameId);

        if (cancelled) return;

        if (fetchedGame) {
          setGame(fetchedGame);
        } else {
          setGame(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch game');
        setGame(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchGame();

    return () => {
      cancelled = true;
    };
  }, [gameId, location.state]);

  if (loading) {
    return (
      <div className="game-detail-page">
        <header className="detail-header">
          <button className="back-button" onClick={() => navigate('/games')}>
            ← Voltar
          </button>
        </header>
        <main className="detail-content">
          <div className="loading-state">
            <div className="loading-spinner">⏳</div>
            <p>Carregando jogo...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-detail-page">
        <header className="detail-header">
          <button className="back-button" onClick={() => navigate('/games')}>
            ← Voltar
          </button>
        </header>
        <main className="detail-content">
          <div className="error-state">
            <p className="error-title">Erro ao carregar jogo</p>
            <p className="error-message">{error}</p>
            <button
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="game-detail-page">
        <header className="detail-header">
          <button className="back-button" onClick={() => navigate('/games')}>
            ← Voltar
          </button>
        </header>
        <main className="detail-content">
          <div className="game-not-found">
            <h2>Jogo não encontrado</h2>
            <p>Este jogo pode não estar mais disponível ou o ID pode estar incorreto.</p>
            <button onClick={() => navigate('/games')}>Voltar para Jogos</button>
          </div>
        </main>
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
          ← Voltar
        </button>
      </header>

      <main className="detail-content">{renderGameView()}</main>
    </div>
  );
}

export default GameDetailPage;
