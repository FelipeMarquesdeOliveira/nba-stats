import { Game, InjuryStatus, AvailabilityItem } from '@domain/types';
import { useInjuries } from '@frontend/hooks/useInjuries';
import './PregameView.css';

interface PregameViewProps {
  game: Game;
  recentGames?: Game[];
}

/**
 * Check if a team is playing back-to-back (B2B)
 * Returns true if the team played a game yesterday
 */
function isBackToBack(teamId: string, gameDate: string, recentGames: Game[]): boolean {
  const gameTime = new Date(gameDate).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Check if team played on previous day
  return recentGames.some(g => {
    if (g.id.includes(teamId)) return false; // Skip same game
    const prevGameTime = new Date(g.scheduledAt).getTime();
    const daysDiff = (gameTime - prevGameTime) / oneDayMs;
    return daysDiff >= 0.9 && daysDiff <= 1.1; // ~1 day difference
  });
}

function PregameView({ game, recentGames = [] }: PregameViewProps) {
  const { injuries, loading, error, refetch, isStale, lastUpdated, circuitOpen } = useInjuries();

  const homeB2B = isBackToBack(game.homeTeam.id, game.scheduledAt, recentGames);
  const awayB2B = isBackToBack(game.awayTeam.id, game.scheduledAt, recentGames);

  // For pregame, we don't have real lineup data yet - show that it's not available
  const homeInjuries = injuries.filter(i =>
    i.teamName?.toLowerCase().includes(game.homeTeam.abbreviation.toLowerCase()) ||
    i.teamName?.toLowerCase().includes(game.homeTeam.name.toLowerCase())
  );

  const awayInjuries = injuries.filter(i =>
    i.teamName?.toLowerCase().includes(game.awayTeam.abbreviation.toLowerCase()) ||
    i.teamName?.toLowerCase().includes(game.awayTeam.name.toLowerCase())
  );

  if (loading) {
    return (
      <div className="pregame-view">
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Carregando dados pré-jogo...</p>
        </div>
      </div>
    );
  }

  if (circuitOpen) {
    return (
      <div className="pregame-view">
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
      <div className="pregame-view">
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

  const showStaleIndicator = isStale && injuries.length > 0;

  return (
    <div className="pregame-view">
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

      <div className="pregame-header">
        <h2>Pré-Jogo</h2>
        <p className="game-time">
          {new Date(game.scheduledAt).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {game.broadcaster && ` • ${game.broadcaster}`}
        </p>
      </div>

      <div className="matchup-section">
        <TeamColumn
          teamData={{
            abbreviation: game.awayTeam.abbreviation,
            name: game.awayTeam.name,
            shortName: game.awayTeam.shortName,
          }}
          isBackToBack={awayB2B}
          record={game.awayTeamRecord}
          isHome={false}
        />
        <div className="vs-divider">VS</div>
        <TeamColumn
          teamData={{
            abbreviation: game.homeTeam.abbreviation,
            name: game.homeTeam.name,
            shortName: game.homeTeam.shortName,
          }}
          isBackToBack={homeB2B}
          record={game.homeTeamRecord}
          isHome={true}
        />
      </div>

      <div className="availability-section">
        <h3>Availability Report</h3>

        <div className="availability-columns">
          <TeamAvailability
            teamName={game.awayTeam.shortName}
            injuries={awayInjuries}
          />
          <TeamAvailability
            teamName={game.homeTeam.shortName}
            injuries={homeInjuries}
          />
        </div>

        <div className="data-source-note">
          <p>Fonte: ESPN Injuries</p>
        </div>

        <div className="pregame-note">
          <p className="note-text">
            <span className="note-label">⚠️ Lineups:</span> Dados de prováveis titulares ainda não disponíveis via API.
            Funcionalidade em desenvolvimento.
          </p>
        </div>
      </div>
    </div>
  );
}

interface TeamColumnProps {
  teamData: {
    abbreviation: string;
    name: string;
    shortName: string;
  };
  isBackToBack?: boolean;
  record?: { home: string; away: string };
  isHome?: boolean;
}

function TeamColumn({ teamData, isBackToBack, record, isHome }: TeamColumnProps) {
  return (
    <div className="team-column">
      <div className="team-header">
        <span className="team-abbr">{teamData.abbreviation}</span>
        <span className="team-name">{teamData.name}</span>
        {isBackToBack && (
          <span className="b2b-badge" title="Back-to-back - jogou ontem">
            🔄 B2B
          </span>
        )}
      </div>
      {record && (
        <div className="team-record">
          {isHome ? (
            <>
              {record.home && <span>Casa: {record.home}</span>}
              {record.away && <span>Fora: {record.away}</span>}
            </>
          ) : (
            <>
              {record.away && <span>Fora: {record.away}</span>}
              {record.home && <span>Casa: {record.home}</span>}
            </>
          )}
        </div>
      )}
      <div className="section-title">Escalação Provável</div>
      <div className="unavailable-data">
        <span className="unavailable-badge">Indisponível</span>
        <p>Dados de lineup não disponíveis via API pública</p>
      </div>
    </div>
  );
}

interface TeamAvailabilityProps {
  teamName: string;
  injuries: AvailabilityItem[];
}

function TeamAvailability({ teamName, injuries }: TeamAvailabilityProps) {
  const grouped = {
    OUT: injuries.filter((a: AvailabilityItem) => a.status === InjuryStatus.OUT),
    DOUBTFUL: injuries.filter((a: AvailabilityItem) => a.status === InjuryStatus.DOUBTFUL),
    QUESTIONABLE: injuries.filter((a: AvailabilityItem) => a.status === InjuryStatus.QUESTIONABLE),
    PROBABLE: injuries.filter((a: AvailabilityItem) => a.status === InjuryStatus.PROBABLE),
  };

  const hasAny = Object.values(grouped).some((arr) => arr.length > 0);

  return (
    <div className="availability-team">
      <h4>{teamName}</h4>
      {!hasAny && (
        <div className="no-injuries">
          <p className="no-injuries-text">Nenhuma lesão reportada</p>
          <p className="no-injuries-subtext">Dados baseados em relatórios públicos</p>
        </div>
      )}
      {grouped.OUT.length > 0 && (
        <AvailabilityGroup label="OUT" items={grouped.OUT} color="red" />
      )}
      {grouped.DOUBTFUL.length > 0 && (
        <AvailabilityGroup label="DOUBTFUL" items={grouped.DOUBTFUL} color="orange" />
      )}
      {grouped.QUESTIONABLE.length > 0 && (
        <AvailabilityGroup label="QUESTIONABLE" items={grouped.QUESTIONABLE} color="yellow" />
      )}
      {grouped.PROBABLE.length > 0 && (
        <AvailabilityGroup label="PROBABLE" items={grouped.PROBABLE} color="green" />
      )}
    </div>
  );
}

interface AvailabilityGroupProps {
  label: string;
  items: AvailabilityItem[];
  color: 'red' | 'orange' | 'yellow' | 'green';
}

function AvailabilityGroup({ label, items, color }: AvailabilityGroupProps) {
  return (
    <div className={`availability-group group-${color}`}>
      <div className="group-label">{label}</div>
      {items.map((item, idx) => (
        <div key={idx} className="availability-item">
          <span className="avail-player">{item.player.name}</span>
          {item.reason && <span className="avail-reason">{item.reason}</span>}
        </div>
      ))}
    </div>
  );
}

export default PregameView;