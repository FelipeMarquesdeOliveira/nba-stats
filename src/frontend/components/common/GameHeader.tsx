import { Game, PeriodType } from '@domain/types';
import './GameHeader.css';

interface GameHeaderProps {
  game: Game;
  status: 'pregame' | 'live' | 'final';
  homeScore?: number;
  awayScore?: number;
  period?: number;
  clock?: string;
  periodType?: PeriodType;
  winnerId?: string; // para destacar o vencedor no final
}

export function GameHeader({
  game,
  status,
  homeScore,
  awayScore,
  period,
  clock,
  periodType,
  winnerId
}: GameHeaderProps) {
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const isHomeWinner = winnerId === game.homeTeam.id;
  const isAwayWinner = winnerId === game.awayTeam.id;

  const renderStatusCenter = () => {
    if (status === 'pregame') {
      return (
        <div className="gh-center pregame">
          <div className="gh-pill pregame-pill">PRÉ-JOGO</div>
          <div className="gh-matchup-text">VS</div>
          <div className="gh-details">
            <span>{formatDate(game.scheduledAt)}</span>
            <span className="gh-divider">|</span>
            <span>{formatTime(game.scheduledAt)}</span>
          </div>
          {game.broadcaster && (
            <div className="gh-broadcaster">{game.broadcaster}</div>
          )}
        </div>
      );
    }

    if (status === 'live') {
      return (
        <div className="gh-center live">
          <div className="gh-pill live-pill">
            <span className="pulse-dot"></span>
            AO VIVO
          </div>
          <div className="gh-clock-info">
            {period && period > 0 ? (
              <>
                <span className="period">{periodType === PeriodType.OVERTIME ? 'OT' : periodType === PeriodType.HALF ? 'H' : `Q${period}`}</span>
                <span className="time">{clock}</span>
              </>
            ) : (
              <span className="time">Aguardando</span>
            )}
          </div>
          {game.broadcaster && <div className="gh-broadcaster">{game.broadcaster}</div>}
        </div>
      );
    }

    // final
    return (
      <div className="gh-center final">
        <div className="gh-pill final-pill">FINAL</div>
        <div className="gh-matchup-text">-</div>
        {game.broadcaster && <div className="gh-broadcaster">{game.broadcaster}</div>}
      </div>
    );
  };

  return (
    <div className="game-header-container">
      <div className={`gh-team away ${isAwayWinner ? 'winner' : ''}`}>
        <img src={game.awayTeam.logoUrl} alt={game.awayTeam.name} className="gh-logo" />
        <div className="gh-team-info">
          <span className="gh-abbr">{game.awayTeam.abbreviation}</span>
          {(status === 'live' || status === 'final') && (
            <span className="gh-score">{awayScore}</span>
          )}
        </div>
      </div>

      {renderStatusCenter()}

      <div className={`gh-team home ${isHomeWinner ? 'winner' : ''}`}>
        <div className="gh-team-info">
          {(status === 'live' || status === 'final') && (
            <span className="gh-score">{homeScore}</span>
          )}
          <span className="gh-abbr">{game.homeTeam.abbreviation}</span>
        </div>
        <img src={game.homeTeam.logoUrl} alt={game.homeTeam.name} className="gh-logo" />
      </div>
    </div>
  );
}
