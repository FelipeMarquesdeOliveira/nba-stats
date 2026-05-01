import { Game, PeriodType } from '@domain/types';
import { useLiveGame } from '@frontend/hooks/useLiveGame';
import './FinalView.css';

interface FinalViewProps {
  game: Game;
}

function FinalView({ game }: FinalViewProps) {
  const { boxscore, loading, error, refetch, isStale, lastUpdated, circuitOpen } = useLiveGame(
    game.id,
    'final'
  );

  if (loading) {
    return (
      <div className="final-view">
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Carregando boxscore...</p>
        </div>
      </div>
    );
  }

  if (circuitOpen) {
    return (
      <div className="final-view">
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
      <div className="final-view">
        <div className="error-state">
          <p className="error-title">Erro ao carregar boxscore</p>
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
      <div className="final-view">
        <div className="no-data-message">
          <p>Boxscore não disponível para este jogo.</p>
        </div>
      </div>
    );
  }

  const fgPct = (made: number, attempted: number) => {
    if (attempted === 0) return '0.0';
    return ((made / attempted) * 100).toFixed(1);
  };

  const homeStats = boxscore.teamStats?.[game.homeTeam.abbreviation] || {};
  const awayStats = boxscore.teamStats?.[game.awayTeam.abbreviation] || {};
  const showStaleIndicator = isStale && boxscore;

  // Calculate win margin
  const margin = boxscore.homeScore - boxscore.awayScore;
  const winner = margin > 0 ? game.homeTeam : margin < 0 ? game.awayTeam : null;
  const absMargin = Math.abs(margin);

  return (
    <div className="final-view">
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

      <div className="final-scoreboard">
        <div className="final-team">
          <span className="team-abbr">{game.awayTeam.abbreviation}</span>
          <span className="team-score">{boxscore.awayScore}</span>
          <span className="team-name">{game.awayTeam.name}</span>
        </div>

        <div className="final-center">
          <div className="final-label">FINAL</div>
          {winner && absMargin > 0 && (
            <div className="win-margin">{winner.abbreviation} by {absMargin}</div>
          )}
          {game.venue && <div className="final-venue">{game.venue}</div>}
        </div>

        <div className="final-team">
          <span className="team-abbr">{game.homeTeam.abbreviation}</span>
          <span className="team-score">{boxscore.homeScore}</span>
          <span className="team-name">{game.homeTeam.name}</span>
        </div>
      </div>

      {boxscore.quarterScores && boxscore.quarterScores.length > 0 && (
        <QuarterByQuarter
          quarterScores={boxscore.quarterScores}
          homeAbbr={game.homeTeam.abbreviation}
          awayAbbr={game.awayTeam.abbreviation}
        />
      )}

      <div className="game-summary">
        <h3>Game Summary</h3>
        <div className="summary-stats">
          <div className="summary-team">
            <h4>{game.awayTeam.shortName}</h4>
            <div className="stat-row">
              <span>Field Goals</span>
              <span>
                {awayStats.FGM || 0}-
                {awayStats.FGA || 0} (
                {fgPct(awayStats.FGM || 0, awayStats.FGA || 0)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>3-Pointers</span>
              <span>
                {awayStats.FG3M || 0}-
                {awayStats.FG3A || 0} (
                {fgPct(awayStats.FG3M || 0, awayStats.FG3A || 0)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>Free Throws</span>
              <span>
                {awayStats.FTM || 0}-
                {awayStats.FTA || 0} (
                {fgPct(awayStats.FTM || 0, awayStats.FTA || 0)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>Rebounds</span>
              <span>{awayStats.REB || 0}</span>
            </div>
            <div className="stat-row">
              <span>Assists</span>
              <span>{awayStats.AST || 0}</span>
            </div>
          </div>

          <div className="summary-team">
            <h4>{game.homeTeam.shortName}</h4>
            <div className="stat-row">
              <span>Field Goals</span>
              <span>
                {homeStats.FGM || 0}-
                {homeStats.FGA || 0} (
                {fgPct(homeStats.FGM || 0, homeStats.FGA || 0)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>3-Pointers</span>
              <span>
                {homeStats.FG3M || 0}-
                {homeStats.FG3A || 0} (
                {fgPct(homeStats.FG3M || 0, homeStats.FG3A || 0)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>Free Throws</span>
              <span>
                {homeStats.FTM || 0}-
                {homeStats.FTA || 0} (
                {fgPct(homeStats.FTM || 0, homeStats.FTA || 0)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>Rebounds</span>
              <span>{homeStats.REB || 0}</span>
            </div>
            <div className="stat-row">
              <span>Assists</span>
              <span>{homeStats.AST || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="boxscore-section">
        <h3>Box Score</h3>
        <div className="boxscore-grid">
          <TeamBoxScore team={game.awayTeam} players={boxscore.awayTeam.players} />
          <TeamBoxScore team={game.homeTeam} players={boxscore.homeTeam.players} />
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

function TeamBoxScore({ team, players }: TeamBoxScoreProps) {
  const sortedPlayers = [...players].sort(
    (a, b) => b.points - a.points
  );

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
                <span className="player-name">{player.player.name}</span>
                <span className="player-pos">{player.player.position}</span>
              </td>
              <td className="pts-cell">{player.points}</td>
              <td>{player.rebounds}</td>
              <td>{player.assists}</td>
              <td>{player.fieldGoalPct}%</td>
              <td>{player.threePointPct}%</td>
              <td>{player.freeThrowPct}%</td>
              <td className="min-cell">{player.minutesPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FinalView;