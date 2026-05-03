import { useState, useEffect, useRef } from 'react';
import { Game, GameStatus, OnCourtStatus, BoxScorePlayer } from '@domain/types';
import { useLiveGame } from '@frontend/hooks/useLiveGame';
import { oddsGateway, OddsGatewayImpl } from '@data-collection';
import './LiveView.css';

// ─── Line Change Notification System ────────────────────────────

interface LineChangeNotification {
  id: number;
  playerName: string;
  oldLine: number;
  newLine: number;
  direction: 'up' | 'down';
  timestamp: number;
}

let notificationId = 0;

// ─── Main Component ─────────────────────────────────────────────

interface LiveViewProps {
  game: Game;
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'agora';
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `há ${minutes}min`;
}

function LiveView({ game }: LiveViewProps) {
  const gameStatus: 'live' | 'final' | 'scheduled' =
    game.status === GameStatus.LIVE ? 'live' :
    game.status === GameStatus.FINAL ? 'final' : 'scheduled';

  const { boxscore, loading, error, refetch, isStale, lastUpdated, circuitOpen, isManualRefreshing } = useLiveGame(game.id, gameStatus);
  
  // Live props state
  const [liveProps, setLiveProps] = useState<Record<string, { line: number; over: number; under: number }>>({});
  const prevPropsRef = useRef<Record<string, number>>({});
  const [notifications, setNotifications] = useState<LineChangeNotification[]>([]);

  // ─── Auto Live Mode Activation ──────────────────────────────
  useEffect(() => {
    const isLive = game.status === GameStatus.LIVE;
    (oddsGateway as OddsGatewayImpl).setLiveMode(isLive);
    
    return () => {
      // Deactivate live mode when leaving this view
      (oddsGateway as OddsGatewayImpl).setLiveMode(false);
    };
  }, [game.status]);

  // ─── Fetch Props for On-Court Players Only ──────────────────
  useEffect(() => {
    if (!boxscore || game.status !== GameStatus.LIVE) return;

    let ignore = false;

    async function fetchOnCourtProps() {
      // Get only players who are on court (HIGH_CONFIDENCE or ESTIMATED)
      const allPlayers = [
        ...boxscore!.homeTeam.players,
        ...boxscore!.awayTeam.players
      ];
      
      const onCourtPlayers = allPlayers.filter(p => 
        p.isStarter && (
          p.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE || 
          p.onCourtStatus === OnCourtStatus.ESTIMATED
        )
      );

      // If no on-court detection yet, use starters
      const playersToFetch = onCourtPlayers.length > 0 
        ? onCourtPlayers 
        : allPlayers.filter(p => p.isStarter);

      const newProps: Record<string, { line: number; over: number; under: number }> = {};
      
      for (const player of playersToFetch) {
        if (ignore) return;
        try {
          const prop = await oddsGateway.getPlayerPointsLine(
            player.player.id, 
            game.id, 
            player.player.name
          );
          if (prop && prop.line > 0) {
            newProps[player.player.id] = { 
              line: prop.line, 
              over: prop.overOdds, 
              under: prop.underOdds 
            };
          }
        } catch (_) {}
      }

      if (ignore) return;

      // ─── Detect Line Changes & Notify ─────────────────────
      const prevLines = prevPropsRef.current;
      const newNotifications: LineChangeNotification[] = [];

      for (const [playerId, propData] of Object.entries(newProps)) {
        const prevLine = prevLines[playerId];
        if (prevLine !== undefined && prevLine !== propData.line) {
          const player = allPlayers.find(p => p.player.id === playerId);
          newNotifications.push({
            id: ++notificationId,
            playerName: player?.player.name || playerId,
            oldLine: prevLine,
            newLine: propData.line,
            direction: propData.line > prevLine ? 'up' : 'down',
            timestamp: Date.now()
          });
        }
        prevLines[playerId] = propData.line;
      }

      prevPropsRef.current = prevLines;
      setLiveProps(newProps);

      if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
      }
    }

    fetchOnCourtProps();

    // Auto-refresh props every 90 seconds during live
    const interval = setInterval(fetchOnCourtProps, 90 * 1000);
    return () => { 
      ignore = true; 
      clearInterval(interval); 
    };
  }, [boxscore, game.status, game.id]);

  // Auto-dismiss notifications after 8 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => Date.now() - n.timestamp < 8000));
    }, 8000);
    return () => clearTimeout(timer);
  }, [notifications]);

  if (loading) {
    return (
      <div className="live-view animate-fadeIn">
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (circuitOpen) {
    return (
      <div className="live-view animate-fadeIn">
        <div className="circuit-open-state">
          <span className="circuit-icon">🔌</span>
          <p className="circuit-title">Serviço temporariamente indisponível</p>
          <p className="circuit-hint">Aguarde alguns segundos e tente novamente</p>
          <button onClick={() => refetch({ manual: true })} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-view animate-fadeIn">
        <div className="error-state">
          <p className="error-title">Erro ao carregar dados</p>
          <p className="error-message">{error}</p>
          <button onClick={() => refetch({ manual: true })} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!boxscore) {
    return (
      <div className="live-view animate-fadeIn">
        <div className="no-data-message">
          <p>Dados não disponíveis para este jogo.</p>
        </div>
      </div>
    );
  }

  // Filter to only show starters and sort by points
  const sortPlayers = (players: BoxScorePlayer[]) => {
    return [...players]
      .filter((p) => p.isStarter)
      .sort((a, b) => {
        if (a.onCourtStatus !== b.onCourtStatus) {
          if (a.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE) return -1;
          if (b.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE) return 1;
          if (a.onCourtStatus === OnCourtStatus.ESTIMATED) return -1;
          if (b.onCourtStatus === OnCourtStatus.ESTIMATED) return 1;
        }
        return b.points - a.points;
      });
  };

  const homePlayers = sortPlayers(boxscore.homeTeam.players);
  const awayPlayers = sortPlayers(boxscore.awayTeam.players);

  const homeLead = boxscore.homeScore - boxscore.awayScore;
  const isLiveGame = game.status === GameStatus.LIVE;

  return (
    <div className="live-view animate-fadeIn">
      {/* ─── Line Change Notifications ──────────────────────── */}
      {notifications.length > 0 && (
        <div className="line-notifications">
          {notifications.map(n => (
            <div 
              key={n.id} 
              className={`line-notification ${n.direction}`}
              onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
            >
              <span className="notif-icon">{n.direction === 'up' ? '📈' : '📉'}</span>
              <span className="notif-text">
                <strong>{n.playerName}</strong>: {n.oldLine} → {n.newLine}
                <span className={`notif-direction ${n.direction}`}>
                  {n.direction === 'up' ? ' ▲ Subiu' : ' ▼ Desceu'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {isLiveGame && (
        <div className="refresh-header">
          <div className="timestamp-info">
            <span className="timestamp-label">
              {isStale ? 'Última atualização bem-sucedida: ' : 'Atualizado: '}
            </span>
            <span className="timestamp-value">{formatTimeAgo(lastUpdated)}</span>
            {isManualRefreshing && (
              <span className="refreshing-indicator">⟳ atualizando...</span>
            )}
          </div>
          <button
            onClick={() => refetch({ manual: true })}
            className="refresh-button"
            disabled={isManualRefreshing}
          >
            {isManualRefreshing ? '⟳' : '⟳ Atualizar'}
          </button>
        </div>
      )}

      {!isLiveGame && isStale && (
        <div className="stale-indicator">
          <span className="warning-icon">⚠️</span>
          <span>
            Dados podem estar desatualizados
            {lastUpdated && ` (última att: há ${Math.floor((Date.now() - lastUpdated.getTime()) / 60000)} min)`}
          </span>
          <button onClick={() => refetch({ manual: true })} className="stale-refresh-button">
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
          liveProps={liveProps}
        />

        <PlayersSection
          teamName={game.homeTeam.shortName}
          players={homePlayers}
          liveProps={liveProps}
        />
      </div>

      <div className="data-confidence-note">
        <span>⚠️ Status de jogadores em campo é inferência baseada em contexto (período + minutos). Pode não refletir roster oficial.</span>
      </div>
    </div>
  );
}

// ─── Players Section (with REAL props) ──────────────────────────

interface PlayersSectionProps {
  teamName: string;
  players: BoxScorePlayer[];
  liveProps: Record<string, { line: number; over: number; under: number }>;
}

function PlayersSection({ teamName, players, liveProps }: PlayersSectionProps) {
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
            <th>Linha</th>
            <th>Faltam</th>
            <th>REB</th>
            <th>AST</th>
            <th>MIN</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player: BoxScorePlayer) => {
            // Use REAL props from The Odds API
            const propData = liveProps[player.player.id];
            const linha = propData?.line || 0;
            const atual = player.points;

            let colorClass = '';
            let displayFaltam: string | number = '';
            
            if (linha === 0) {
              // No line available
              colorClass = '';
              displayFaltam = '—';
            } else {
              const rawFaltam = linha - atual;
              if (rawFaltam <= 0) {
                colorClass = 'hit-green';
                displayFaltam = '✅ Bateu';
              } else {
                const faltamInt = Math.ceil(rawFaltam);
                displayFaltam = faltamInt;
                if (rawFaltam <= 3.5) {
                  colorClass = 'near-green';
                } else if (rawFaltam <= 6.5) {
                  colorClass = 'mid-yellow';
                } else {
                  colorClass = 'far-red';
                }
              }
            }

            return (
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
                <td className="pts-cell">{atual}</td>
                <td className="line-cell">{linha > 0 ? linha : '—'}</td>
                <td className={`faltam-cell ${colorClass}`}>{displayFaltam}</td>
                <td>{player.rebounds}</td>
                <td>{player.assists}</td>
                <td className="min-cell">{player.minutesPlayed}</td>
                <td className="status-cell">
                  {player.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && (
                    <span className="status-badge high-confidence">🔴 Em Quadra</span>
                  )}
                  {player.onCourtStatus === OnCourtStatus.ESTIMATED && (
                    <span className="status-badge estimated">🟡 Em Quadra</span>
                  )}
                  {player.onCourtStatus === OnCourtStatus.UNKNOWN && (
                    <span className="status-badge unknown">— Banco/Indisp.</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default LiveView;