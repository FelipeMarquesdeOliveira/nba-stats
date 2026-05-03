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
      const allPlayers = [
        ...boxscore!.homeTeam.players,
        ...boxscore!.awayTeam.players
      ];
      
      // PRIORIDADE CLÍNICA:
      // 1. Jogadores com HIGH_CONFIDENCE (Confirmados pelo PBP)
      // 2. Jogadores ESTIMATED (Heurística de minutos)
      const confirmedOnCourt = allPlayers.filter(p => 
        p.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE
      );

      const estimatedOnCourt = allPlayers.filter(p => 
        p.onCourtStatus === OnCourtStatus.ESTIMATED
      );

      let playersToFetch: BoxScorePlayer[] = [];

      if (confirmedOnCourt.length > 0) {
        // Se temos confirmados, focamos neles + estimados até completar um limite razoável (ex: 12 jogadores total)
        playersToFetch = [...confirmedOnCourt, ...estimatedOnCourt].slice(0, 14);
      } else {
        // Fallback: Se não houver detecção (início do jogo), usa titulares
        playersToFetch = allPlayers.filter(p => p.isStarter);
      }

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
          <p>Carregando dados ao vivo...</p>
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

  const sortPlayers = (players: BoxScorePlayer[]) => {
    return [...players]
      .filter((p) => p.isStarter || p.onCourtStatus !== OnCourtStatus.UNKNOWN || (parseInt(p.minutesPlayed) || 0) > 0)
      .sort((a, b) => {
        // 1. Em quadra (HIGH_CONFIDENCE) no topo
        if (a.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && b.onCourtStatus !== OnCourtStatus.HIGH_CONFIDENCE) return -1;
        if (b.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && a.onCourtStatus !== OnCourtStatus.HIGH_CONFIDENCE) return 1;
        
        // 2. Estimados logo abaixo
        if (a.onCourtStatus === OnCourtStatus.ESTIMATED && b.onCourtStatus === OnCourtStatus.UNKNOWN) return -1;
        if (b.onCourtStatus === OnCourtStatus.ESTIMATED && a.onCourtStatus === OnCourtStatus.UNKNOWN) return 1;
        
        // 3. Titulares que saíram
        if (a.isStarter && !b.isStarter) return -1;
        if (b.isStarter && !a.isStarter) return 1;
        
        return b.points - a.points;
      });
  };

  const homePlayers = sortPlayers(boxscore.homeTeam.players);
  const awayPlayers = sortPlayers(boxscore.awayTeam.players);

  const homeLead = boxscore.homeScore - boxscore.awayScore;
  const isLiveGame = game.status === GameStatus.LIVE;

  return (
    <div className="live-view animate-fadeIn">
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
              {isStale ? 'Última atualização: ' : 'Atualizado: '}
            </span>
            <span className="timestamp-value">{formatTimeAgo(lastUpdated)}</span>
            {isManualRefreshing && (
              <span className="refreshing-indicator">⟳ atualizando...</span>
            )}
          </div>
          <div className="clinical-badge-info">
            <span className="badge-dot"></span>
            Detecção Clínica Ativa
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
        <span>🔴 Confirmação via Play-by-Play (100% Precision) | 🟡 Estimado via Minutos | S = Starter</span>
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

  return (
    <div className="players-section">
      <div className="section-header">
        <h3>{teamName}</h3>
        <span
          className="on-court-badge"
          title="🔴 = Confirmação Clínica (Jogada Recente) | 🟡 = Estimado (Minutos)"
        >
          {highConfidenceCount > 0 ? `${highConfidenceCount} EM QUADRA 🔴` : 'DETECTANDO...'}
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
            const propData = liveProps[player.player.id];
            const linha = propData?.line || 0;
            const atual = player.points;

            let colorClass = '';
            let displayFaltam: string | number = '';
            
            if (linha === 0) {
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
                  </span>
                  {player.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && (
                    <span className="court-indicator high-confidence" title="100% Confiança - Participou de jogada recente">🔴</span>
                  )}
                  {player.onCourtStatus === OnCourtStatus.ESTIMATED && (
                    <span className="court-indicator estimated" title="Estimado - Baseado em minutos jogados">🟡</span>
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
                    <span className="status-badge high-confidence">🔴 Quadra</span>
                  )}
                  {player.onCourtStatus === OnCourtStatus.ESTIMATED && (
                    <span className="status-badge estimated">🟡 Estimado</span>
                  )}
                  {player.onCourtStatus === OnCourtStatus.UNKNOWN && (
                    <span className="status-badge unknown">— Banco</span>
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