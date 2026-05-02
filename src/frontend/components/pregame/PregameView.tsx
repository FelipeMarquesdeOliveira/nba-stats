import { useState, useEffect } from 'react';
import { 
  Game, 
  InjuryStatus, 
  AvailabilityItem, 
  PlayerStats, 
  PlayerPointsLine,
  Team,
  GameStatus
} from '@domain/types';
import { 
  getGameStarters, 
  getTeamLastGameStarters,
  playerGateway, 
  oddsGateway 
} from '@data-collection';
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

  // Filtro de lesões mais rigoroso para evitar jogadores de outros times
  const filterInjuries = (team: Game['homeTeam']) => {
    if (!team) return [];
    
    const searchName = team.name.toLowerCase();
    const searchAbbr = team.abbreviation.toLowerCase();
    const searchId = team.id;
    
    return injuries.filter(i => {
      // 1. Match prioritário por ID do time (mais seguro)
      if (searchId && i.player.teamId === searchId) return true;

      const injuryTeam = (i.teamName || '').toLowerCase();
      
      // 2. Match exato do nome completo ou abreviação
      if (injuryTeam === searchName) return true;
      if (injuryTeam === searchAbbr) return true;
      
      // 3. Regra especial para Philadelphia vs Memphis (evita PHI bater em MemPHIs)
      if (searchAbbr === 'phi' && injuryTeam.includes('memphis')) return false;

      // 4. Verificação por palavras completas
      const teamWords = searchName.split(' ');
      const isMatchByWord = injuryTeam.split(' ').some(word => 
        word === searchAbbr || teamWords.includes(word)
      );

      return isMatchByWord;
    });
  };

  const homeInjuries = filterInjuries(game.homeTeam);
  const awayInjuries = filterInjuries(game.awayTeam);

  if (loading) {
    return (
      <div className="pregame-view animate-fadeIn">
        <div className="loading-state-premium">
          <div className="loading-spinner"></div>
          <p>Preparando Relatório Pré-Jogo...</p>
        </div>
      </div>
    );
  }

  if (circuitOpen) {
    return (
      <div className="pregame-view animate-fadeIn">
        <div className="circuit-open-state-premium">
          <span className="circuit-icon">⚡</span>
          <h3>Serviço em Manutenção</h3>
          <p>A API da ESPN está demorando para responder. Tente novamente em alguns instantes.</p>
          <button onClick={refetch} className="premium-button">Tentar Agora</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pregame-view animate-fadeIn">
      {isStale && injuries.length > 0 && (
        <div className="stale-banner">
          <span className="stale-icon">🕒</span>
          <span>Dados de {lastUpdated ? lastUpdated.toLocaleTimeString() : 'alguns minutos atrás'}</span>
          <button onClick={refetch} className="refresh-link">Atualizar</button>
        </div>
      )}

      <div className="pregame-hero">
        <div className="matchup-header">
          <div className="game-status-pill">PRÉ-JOGO</div>
          <div className="matchup-info">
            <h2>{game.awayTeam.abbreviation} vs {game.homeTeam.abbreviation}</h2>
            <div className="matchup-details">
              <span>{new Date(game.scheduledAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
              <span className="divider">|</span>
              <span>{new Date(game.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              {game.broadcaster && (
                <>
                  <span className="divider">|</span>
                  <span className="broadcaster-tag">{game.broadcaster}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pregame-grid">
        <div className="availability-report-card">
          <div className="report-header">
            <h3>Relatório de Disponibilidade</h3>
            <span className="source-tag">ESPN Injuries</span>
          </div>

          <div className="report-columns">
            <TeamInjuryList 
              teamName={game.awayTeam.shortName} 
              injuries={awayInjuries} 
            />
            <div className="vertical-divider"></div>
            <TeamInjuryList 
              teamName={game.homeTeam.shortName} 
              injuries={homeInjuries} 
            />
          </div>
        </div>

        <PlayerPropAnalysis gameId={game.id} homeTeam={game.homeTeam} awayTeam={game.awayTeam} />

        <div className="lineup-disclaimer">
          <div className="disclaimer-content">
            <span className="disclaimer-icon">📋</span>
            <div>
              <strong>Escalações Prováveis:</strong>
              <p>Os quintetos titulares oficiais são confirmados pela NBA cerca de 30 minutos antes do início da partida.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerPropAnalysis({ gameId, homeTeam, awayTeam }: { gameId: string, homeTeam: Team, awayTeam: Team }) {
  const [data, setData] = useState<{
    away: { player: { id: string, name: string, jersey?: string }, stats: PlayerStats | null, prop: PlayerPointsLine | null }[],
    home: { player: { id: string, name: string, jersey?: string }, stats: PlayerStats | null, prop: PlayerPointsLine | null }[]
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let awayStarters: { id: string, name: string, jersey?: string }[] = [];
        let homeStarters: { id: string, name: string, jersey?: string }[] = [];

        // Try current game starters first
        const currentStarters = await getGameStarters(gameId);
        awayStarters = currentStarters.find(s => s.teamId === awayTeam.id)?.players || [];
        homeStarters = currentStarters.find(s => s.teamId === homeTeam.id)?.players || [];

        // Fallback to last game starters if current are empty
        if (awayStarters.length === 0) {
          awayStarters = await getTeamLastGameStarters(awayTeam.id);
        }
        if (homeStarters.length === 0) {
          homeStarters = await getTeamLastGameStarters(homeTeam.id);
        }
        
        const awayData = await Promise.all(awayStarters.map(async p => {
          try {
            return {
              player: p,
              stats: await playerGateway.getPlayerLast5Stats(p.id),
              prop: await oddsGateway.getPlayerPointsLine(p.id, gameId, p.name)
            };
          } catch (e) {
            console.error(`Error loading prop for ${p.name}:`, e);
            return { player: p, stats: null, prop: null };
          }
        }));

        const homeData = await Promise.all(homeStarters.map(async p => {
          try {
            return {
              player: p,
              stats: await playerGateway.getPlayerLast5Stats(p.id),
              prop: await oddsGateway.getPlayerPointsLine(p.id, gameId, p.name)
            };
          } catch (e) {
            console.error(`Error loading prop for ${p.name}:`, e);
            return { player: p, stats: null, prop: null };
          }
        }));

        setData({ away: awayData, home: homeData });
      } catch (e) {
        console.error('Error loading prop data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [gameId, homeTeam.id, awayTeam.id, refreshKey]);

  if (loading) return (
    <div className="props-side-by-side loading-state">
       <div className="loading-spinner-mini"></div>
       <span>Analisando tendências dos titulares...</span>
    </div>
  );
  
  if (!data) return null;

  return (
    <div className="props-side-by-side animate-fadeIn">
      {/* Away Team Props */}
      <div className="props-team-column">
        <div className="props-team-header" style={{ borderLeftColor: awayTeam.primaryColor || '#666' }}>
          <h3>{awayTeam.name} - Props</h3>
        </div>
        <table className="props-mini-table">
          <thead>
            <tr>
              <th>Jogador / Últimos 5</th>
              <th className="text-center">Média L5</th>
              <th className="text-center">Linha</th>
            </tr>
          </thead>
          <tbody>
            {data.away.map((item, idx) => (
              <PlayerPropRow 
                key={idx}
                name={item.player.name}
                number={item.player.jersey || ""}
                last5={item.stats?.last5 || []}
                line={item.prop?.line || 0}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="props-divider"></div>

      {/* Home Team Props */}
      <div className="props-team-column">
        <div className="props-team-header" style={{ borderLeftColor: homeTeam.primaryColor || '#666' }}>
          <h3>{homeTeam.name} - Props</h3>
        </div>
        <table className="props-mini-table">
          <thead>
            <tr>
              <th>Jogador / Últimos 5</th>
              <th className="text-center">Média L5</th>
              <th className="text-center">Linha</th>
            </tr>
          </thead>
          <tbody>
            {data.home.map((item, idx) => (
              <PlayerPropRow 
                key={idx}
                name={item.player.name}
                number={item.player.jersey || ""}
                last5={item.stats?.last5 || []}
                line={item.prop?.line || 0}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerPropRow({ name, number, last5, line }: { name: string; number: string; last5: number[]; line: number }) {
  const avg = last5.reduce((a, b) => a + b, 0) / last5.length;
  // Signal value only if average is at least 0.5 points above the line
  const isAvgHigher = avg >= (line + 0.5);
  
  return (
    <tr>
      <td>
        <div className="prop-player-cell-mini">
          <div className="p-avatar-mini">{number}</div>
          <div className="p-info">
            <span className="p-name-mini">{name}</span>
            <div className="p-last-5-mini">
              {last5.map((val, i) => (
                <span key={i} className={`l5-box-mini ${val >= line ? 'hit' : 'miss'}`}>{val}</span>
              ))}
            </div>
          </div>
        </div>
      </td>
      <td className="text-center prop-avg-cell">
        <span className="prop-avg-val">{avg.toFixed(1)}</span>
      </td>
      <td className="text-center prop-line-cell">
        <div className={`prop-line-box ${isAvgHigher ? 'value-signal' : ''}`}>
          <span className="prop-line-val">{line}</span>
        </div>
      </td>
    </tr>
  );
}

interface TeamCardProps {
  team: Game['homeTeam'];
  record?: string;
  isB2B: boolean;
  side: 'home' | 'away';
}

function TeamCard({ team, record, isB2B, side }: TeamCardProps) {
  return (
    <div className={`team-premium-card ${side}`}>
      <div className="team-brand">
        <span className="team-abbr-large">{team.abbreviation}</span>
        <div className="team-name-group">
          <span className="team-full-name">{team.name}</span>
          <span className="team-location">{side === 'home' ? 'Mandante' : 'Visitante'}</span>
        </div>
      </div>
      
      <div className="team-stats-row">
        {record && (
          <div className="stat-pill">
            <span className="label">Campanha:</span>
            <span className="value">{record}</span>
          </div>
        )}
        {isB2B && (
          <div className="stat-pill b2b">
            <span className="value">Back-to-Back</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface TeamAvailabilityProps {
  teamName: string;
  injuries: AvailabilityItem[];
}

function TeamInjuryList({ teamName, injuries }: TeamAvailabilityProps) {
  const hasInjuries = injuries.length > 0;
  
  const grouped = {
    OUT: injuries.filter(i => i.status === InjuryStatus.OUT),
    DOUBTFUL: injuries.filter(i => i.status === InjuryStatus.DOUBTFUL),
    QUESTIONABLE: injuries.filter(i => i.status === InjuryStatus.QUESTIONABLE),
    PROBABLE: injuries.filter(i => i.status === InjuryStatus.PROBABLE),
  };

  return (
    <div className="injury-team-list">
      <h4>{teamName}</h4>
      {!hasInjuries ? (
        <div className="clean-status">
          <span className="clean-icon">✅</span>
          <p>Nenhuma lesão reportada</p>
        </div>
      ) : (
        <div className="injury-groups">
          {grouped.OUT.map((i, idx) => <InjuryItem key={idx} item={i} status="OUT" />)}
          {grouped.DOUBTFUL.map((i, idx) => <InjuryItem key={idx} item={i} status="DOUBTFUL" />)}
          {grouped.QUESTIONABLE.map((i, idx) => <InjuryItem key={idx} item={i} status="QUESTIONABLE" />)}
          {grouped.PROBABLE.map((i, idx) => <InjuryItem key={idx} item={i} status="PROBABLE" />)}
        </div>
      )}
    </div>
  );
}

function InjuryItem({ item, status }: { item: AvailabilityItem, status: string }) {
  return (
    <div className={`premium-injury-item ${status.toLowerCase()}`}>
      <div className="injury-main">
        <span className="player-name">{item.player.name}</span>
        <span className="status-badge">{status}</span>
      </div>
      {item.reason && <p className="injury-detail">{item.reason}</p>}
    </div>
  );
}

export default PregameView;