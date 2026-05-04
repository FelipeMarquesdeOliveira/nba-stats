import { useNavigate } from 'react-router-dom';
import { Game, PeriodType } from '@domain/types';
import { useLiveGame } from '@frontend/hooks/useLiveGame';
import { GameHeader } from '../common/GameHeader';
import './FinalView.css';

interface FinalViewProps {
  game: Game;
}

interface SelectedPlayer {
  id: string;
  name: string;
  position: string;
}

function FinalView({ game }: FinalViewProps) {
  const navigate = useNavigate();
  const { boxscore, loading, error, refetch, isStale, lastUpdated, circuitOpen } = useLiveGame(
    game.id,
    'final'
  );

  if (loading) {
    return (
      <div className="final-view animate-fadeIn">
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (circuitOpen) {
    return (
      <div className="final-view animate-fadeIn">
        <div className="circuit-open-state">
          <span className="circuit-icon">🔌</span>
          <p className="circuit-title">Serviço temporariamente indisponível</p>
          <p className="circuit-hint">Aguarde alguns segundos e tente novamente</p>
          <button onClick={() => refetch()} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="final-view animate-fadeIn">
        <div className="error-state">
          <p className="error-title">Erro ao carregar dados</p>
          <p className="error-message">{error}</p>
          <button onClick={() => refetch()} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!boxscore) {
    return (
      <div className="final-view animate-fadeIn">
        <div className="no-data-message">
          <p>Dados não disponíveis para este jogo.</p>
        </div>
      </div>
    );
  }



  const showStaleIndicator = isStale && boxscore;

  // Calculate win margin
  const margin = boxscore.homeScore - boxscore.awayScore;
  const winner = margin > 0 ? game.homeTeam : margin < 0 ? game.awayTeam : null;

  return (
    <div className="final-view animate-fadeIn">

      {showStaleIndicator && (
        <div className="stale-indicator">
          <span className="warning-icon">⚠️</span>
          <span>
            Dados podem estar desatualizados
            {lastUpdated && ` (última att: há ${Math.floor((Date.now() - lastUpdated.getTime()) / 60000)} min)`}
          </span>
          <button onClick={() => refetch()} className="stale-refresh-button">
            Atualizar
          </button>
        </div>
      )}

      <GameHeader 
        game={game} 
        status="final" 
        homeScore={boxscore.homeScore} 
        awayScore={boxscore.awayScore}
        winnerId={winner?.id}
      />

      {boxscore.quarterScores && boxscore.quarterScores.length > 0 && (
        <QuarterByQuarter
          quarterScores={boxscore.quarterScores}
          homeAbbr={game.homeTeam.abbreviation}
          awayAbbr={game.awayTeam.abbreviation}
        />
      )}

      <div className="boxscore-section">
        <h3>Box Score</h3>
        <div className="boxscore-grid">
          <TeamBoxScore team={game.awayTeam} players={boxscore.awayTeam.players} onPlayerClick={(p) => navigate(`/players/${p.id}?gameId=${game.id}`)} />
          <TeamBoxScore team={game.homeTeam} players={boxscore.homeTeam.players} onPlayerClick={(p) => navigate(`/players/${p.id}?gameId=${game.id}`)} />
        </div>
      </div>



      {boxscore.highlights && boxscore.highlights.length > 0 && (
        <div className="highlights-section">
          <h3>Game Highlights</h3>
          <div className="highlights-grid">
            {boxscore.highlights.slice(0, 4).map((highlight, idx) => (
              <div key={idx} className="highlight-card">
                <span className={`highlight-badge badge-${highlight.type}`}>
                  {highlight.type.replace('-', ' ')}
                </span>
                <span className="highlight-player">{highlight.player.name}</span>
                <span className="highlight-value">
                  {typeof highlight.value === 'number' ? `${highlight.value} pts` : highlight.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="data-source-note">
        <p>Fonte: stats.nba.com</p>
      </div>
    </div>
  );
}

interface TeamBoxScoreProps {
  team: Game['homeTeam'];
  players: Array<{
    player: { id: string; name: string; jerseyNumber?: string; position: string };
    points: number;
    rebounds: number;
    assists: number;
    fieldGoalPct: number;
    threePointPct: number;
    freeThrowPct: number;
    minutesPlayed: string;
    isStarter?: boolean;
  }>;
  onPlayerClick: (player: SelectedPlayer) => void;
}

interface QuarterByQuarterProps {
  quarterScores: Array<{
    period: number;
    homeScore: number;
    awayScore: number;
    periodType?: PeriodType;
  }>;
  homeAbbr: string;
  awayAbbr: string;
}

function QuarterByQuarter({ quarterScores, homeAbbr, awayAbbr }: QuarterByQuarterProps) {
  const formatPeriod = (qs: QuarterByQuarterProps['quarterScores'][0]) => {
    if (qs.periodType === PeriodType.OVERTIME) return 'OT';
    if (qs.periodType === PeriodType.HALF) return 'H';
    return `Q${qs.period}`;
  };

  const totalHome = quarterScores.reduce((sum, qs) => sum + qs.homeScore, 0);
  const totalAway = quarterScores.reduce((sum, qs) => sum + qs.awayScore, 0);

  return (
    <div className="quarter-section">
      <h3>Quarter by Quarter</h3>
      <div className="quarter-grid">
        <div className="quarter-header">
          <span className="quarter-team-label"></span>
          {quarterScores.map((qs, idx) => (
            <span key={idx} className="quarter-period">{formatPeriod(qs)}</span>
          ))}
          <span className="quarter-period">T</span>
        </div>
        <div className="quarter-row">
          <span className="quarter-team-label">{awayAbbr}</span>
          {quarterScores.map((qs, idx) => (
            <span key={idx} className="quarter-score">{qs.awayScore}</span>
          ))}
          <span className="quarter-score quarter-total">{totalAway}</span>
        </div>
        <div className="quarter-row">
          <span className="quarter-team-label">{homeAbbr}</span>
          {quarterScores.map((qs, idx) => (
            <span key={idx} className="quarter-score">{qs.homeScore}</span>
          ))}
          <span className="quarter-score quarter-total">{totalHome}</span>
        </div>
      </div>
    </div>
  );
}

function TeamBoxScore({ team, players, onPlayerClick }: TeamBoxScoreProps) {
  const starters = [...players].filter((p) => p.isStarter);
  
  // Slots preenchidos
  const filledSlots = {
    PG: false,
    SG: false,
    SF: false,
    PF: false,
    C: false
  };

  // 1. Primeiro passo: Marcar o que já é explícito e definitivo nos dados
  starters.forEach(p => {
    const pos = p.player.position.toUpperCase();
    if (pos === 'PG' || pos.includes('POINT GUARD')) filledSlots.PG = true;
    if (pos === 'SG' || pos.includes('SHOOTING GUARD')) filledSlots.SG = true;
    if (pos === 'SF' || pos.includes('SMALL FORWARD')) filledSlots.SF = true;
    if (pos === 'PF' || pos.includes('POWER FORWARD')) filledSlots.PF = true;
    if (pos === 'C' || pos.includes('CENTER')) filledSlots.C = true;
    if (p.player.name.includes('Evan Mobley')) filledSlots.PF = true;
  });

  // 2. Segundo passo: Mapear posições genéricas ou corrigir conflitos
  const processedPlayers = starters.map(p => {
    let displayPos = p.player.position.toUpperCase();
    const name = p.player.name;

    // Caso Mobley
    if (name.includes('Evan Mobley')) {
      displayPos = 'PF';
    } else if (displayPos.includes('POINT GUARD') || displayPos === 'PG') {
      displayPos = 'PG';
    } else if (displayPos.includes('SHOOTING GUARD') || displayPos === 'SG') {
      displayPos = 'SG';
    } else if (displayPos.includes('SMALL FORWARD') || displayPos === 'SF') {
      displayPos = 'SF';
    } else if (displayPos.includes('POWER FORWARD') || displayPos === 'PF') {
      displayPos = 'PF';
    } else if (displayPos.includes('CENTER') || displayPos === 'C') {
      displayPos = 'C';
    } else if (displayPos === 'G' || displayPos.includes('GUARD')) {
      // Se for G, tentamos encaixar no primeiro slot livre de Guard, ou então SF
      if (!filledSlots.PG) {
        filledSlots.PG = true;
        displayPos = 'PG';
      } else if (!filledSlots.SG) {
        filledSlots.SG = true;
        displayPos = 'SG';
      } else if (!filledSlots.SF) {
        filledSlots.SF = true;
        displayPos = 'SF';
      } else {
        displayPos = 'SG'; // Fallback
      }
    } else if (displayPos === 'F' || displayPos.includes('FORWARD')) {
      // Se for F, tentamos encaixar no primeiro slot livre de Forward
      if (!filledSlots.SF) {
        filledSlots.SF = true;
        displayPos = 'SF';
      } else if (!filledSlots.PF) {
        filledSlots.PF = true;
        displayPos = 'PF';
      } else {
        displayPos = 'PF'; // Fallback
      }
    }

    return { ...p, displayPos };
  });

  const positionOrder: Record<string, number> = {
    'PG': 1,
    'SG': 2,
    'SF': 3,
    'PF': 4,
    'C': 5
  };

  const sortedPlayers = processedPlayers.sort((a, b) => {
    const orderA = positionOrder[a.displayPos as keyof typeof positionOrder] || 99;
    const orderB = positionOrder[b.displayPos as keyof typeof positionOrder] || 99;
    return orderA - orderB;
  });

  if (sortedPlayers.length === 0) {
    return (
      <div className="boxscore-team">
        <h4>{team.shortName}</h4>
        <p className="no-data-inline">Estatísticas não disponíveis</p>
      </div>
    );
  }

  return (
    <div className="boxscore-team">
      <h4>{team.shortName}</h4>
      <table className="boxscore-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>FG%</th>
            <th>3P%</th>
            <th>FT%</th>
            <th>MIN</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player) => (
            <tr key={player.player.id}>
              <td className="player-cell">
                <div className="player-identity">
                  <img 
                    src={`https://a.espncdn.com/i/headshots/nba/players/full/${player.player.id}.png`} 
                    alt={player.player.name} 
                    className="player-img-mini"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://www.nba.com/assets/img/default-player-headshot.png';
                    }}
                  />
                  <div className="player-info-stacked">
                    <span 
                      className="player-name interactive" 
                      onClick={() => onPlayerClick({
                        id: player.player.id,
                        name: player.player.name,
                        position: player.displayPos
                      })}
                    >
                      {player.player.name || 'Jogador indisponível'}
                    </span>
                    <span className="player-pos">{player.displayPos}</span>
                  </div>
                </div>
              </td>
              <td className="pts-cell">{player.points ?? 0}</td>
              <td>{player.rebounds ?? 0}</td>
              <td>{player.assists ?? 0}</td>
              <td>{((player.fieldGoalPct ?? 0) * 100).toFixed(1)}%</td>
              <td>{((player.threePointPct ?? 0) * 100).toFixed(1)}%</td>
              <td>{((player.freeThrowPct ?? 0) * 100).toFixed(1)}%</td>
              <td className="min-cell">{player.minutesPlayed || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}




export default FinalView;