import { Game, GameStatus, OnCourtStatus, BoxScorePlayer } from '@domain/types';
import { useLiveGame } from '@frontend/hooks/useLiveGame';
import './LiveView.css';

interface LiveViewProps {
  game: Game;
}

function LiveView({ game }: LiveViewProps) {
  const gameStatus: 'live' | 'final' | 'scheduled' =
    game.status === GameStatus.LIVE ? 'live' :
    game.status === GameStatus.FINAL ? 'final' : 'scheduled';

  const { boxscore, loading, error, refetch, isStale, lastUpdated, circuitOpen } = useLiveGame(game.id, gameStatus);

  if (loading) {
    return (
      <div className="live-view">
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Carregando dados ao vivo...</p>
        </div>
      </div>
    );
  }

  if (circuitOpen) {
    return (
      <div className="live-view">
        <div className="circuit-open-state">
          <span className="circuit-icon">🔌</span>
          <p className="circuit-title">Serviço temporariamente indisponível</p>
          <p className="circuit-hint">Aguarde alguns segundos e tente novamente</p>
          <button onClick={refetch} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-view">
        <div className="error-state">
          <p className="error-title">Erro ao carregar dados</p>
          <p className="error-message">{error}</p>
          <button onClick={refetch} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!boxscore) {
    return (
      <div className="live-view">
        <div className="no-data-message">
          <p>Dados não disponíveis para este jogo.</p>
        </div>
      </div>
    );
  }

  // Sort players: HIGH_CONFIDENCE first, then ESTIMATED, then UNKNOWN, then by points
  const sortPlayers = (players: BoxScorePlayer[]) => {
    return [...players].sort((a, b) => {
      // Sort by confidence level first (HIGH_CONFIDENCE > ESTIMATED > UNKNOWN)
      if (a.onCourtStatus !== b.onCourtStatus) {
        if (a.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE) return -1;
        if (b.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE) return 1;
        if (a.onCourtStatus === OnCourtStatus.ESTIMATED) return -1;
        if (b.onCourtStatus === OnCourtStatus.ESTIMATED) return 1;
      }
      // Within same status, sort by points
      return b.points - a.points;
    });
  };

  const homePlayers = sortPlayers(boxscore.homeTeam.players);
  const awayPlayers = sortPlayers(boxscore.awayTeam.players);
  const showStaleIndicator = isStale && boxscore;

  // Calculate lead indicator
  const homeLead = boxscore.homeScore - boxscore.awayScore;

  return (
    <div className="live-view">
      {showStaleIndicator && (
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

      <div className="live-scoreboard">
        <div className="scoreboard-team" data-leading={homeLead < 0}>
          <span className="team-abbr">{game.awayTeam.abbreviation}</span>
          <span className="team-score">{boxscore.awayScore}</span>
          {homeLead < 0 && (
            <span className="lead-indicator">+{Math.abs(homeLead)}</span>
          )}
          <span className="team-name">{game.awayTeam.name}</span>
        </div>

        <div className="scoreboard-center">
          <div className="live-indicator">● AO VIVO</div>
          <div className="game-clock">
            {boxscore.period}{boxscore.clock && ` • ${boxscore.clock}`}
          </div>
          {boxscore.lastPlay && (
            <div className="last-play">{boxscore.lastPlay}</div>
          )}
        </div>

        <div className="scoreboard-team" data-leading={homeLead > 0}>
          <span className="team-abbr">{game.homeTeam.abbreviation}</span>
          <span className="team-score">{boxscore.homeScore}</span>
          {homeLead > 0 && (
            <span className="lead-indicator">+{homeLead}</span>
          )}
          <span className="team-name">{game.homeTeam.name}</span>
        </div>
      </div>

      <div className="live-content">
        <PlayersSection
          teamName={game.awayTeam.shortName}
          players={awayPlayers}
        />

        <PlayersSection
          teamName={game.homeTeam.shortName}
          players={homePlayers}
        />
      </div>

      <div className="data-confidence-note">
        <span>⚠️ Status de jogadores em campo é inferência baseada em contexto (período + minutos). Pode não refletir roster oficial.</span>
      </div>
    </div>
  );
}

interface PlayersSectionProps {
  teamName: string;
  players: BoxScorePlayer[];
}

function PlayersSection({ teamName, players }: PlayersSectionProps) {
  // Count by confidence level for badge
  const highConfidenceCount = players.filter(
    (p: BoxScorePlayer) => p.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE
  ).length;
  const estimatedCount = players.filter(
    (p: BoxScorePlayer) => p.onCourtStatus === OnCourtStatus.ESTIMATED
  ).length;

  return (
    <div className="players-section">
      <div className="section-header">
        <h3>{teamName}</h3>
        <span
          className="on-court-badge"
          title="🔴 = alta confiança (Q4 com contexto) | 🟡 = estimado (baseado em minutos)"
        >
          {highConfidenceCount > 0 && `${highConfidenceCount} 🔴`}
          {estimatedCount > 0 && ` ${estimatedCount} 🟡`}
          {highConfidenceCount === 0 && estimatedCount === 0 && '— Indisponível'}
        </span>
      </div>
      <table className="players-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>MIN</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player: BoxScorePlayer) => (
            <tr
              key={player.player.id}
              className={`
                ${player.onCourtStatus !== OnCourtStatus.UNKNOWN ? 'on-court' : ''}
                ${player.isStarter ? 'starter' : ''}
              `}
            >
              <td className="player-cell">
                <span className="player-info">
                  {player.isStarter && <span className="starter-badge">S</span>}
                  <span className="player-name">{player.player.name}</span>
                  <span className="player-pos">{player.player.position}</span>
                </span>
                {player.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && (
                  <span className="court-indicator high-confidence" title="Alta confiança - inferência baseada em Q4 + starter">🔴</span>
                )}
                {player.onCourtStatus === OnCourtStatus.ESTIMATED && (
                  <span className="court-indicator estimated" title="Estimado - baseado em minutos jogados">🟡</span>
                )}
              </td>
              <td className="pts-cell">{player.points}</td>
              <td>{player.rebounds}</td>
              <td>{player.assists}</td>
              <td className="min-cell">{player.minutesPlayed}</td>
              <td className="status-cell">
                {player.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && (
                  <span className="status-badge high-confidence">🔴 Alta confiança</span>
                )}
                {player.onCourtStatus === OnCourtStatus.ESTIMATED && (
                  <span className="status-badge estimated">🟡 Estimado</span>
                )}
                {player.onCourtStatus === OnCourtStatus.UNKNOWN && (
                  <span className="status-badge unknown">— Indisponível</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LiveView;