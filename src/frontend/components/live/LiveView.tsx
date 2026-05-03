import { useState, useEffect, useRef } from 'react';
import { Game, GameStatus, OnCourtStatus, BoxScorePlayer } from '@domain/types';
import { useLiveGame } from '@frontend/hooks/useLiveGame';
import { oddsGateway, OddsGatewayImpl } from '@data-collection';
import './LiveView.css';

// ─── Notification System ────────────────────────────────────────

interface LiveNotification {
  id: number;
  type: 'line' | 'substitution';
  playerName: string;
  message: string;
  direction?: 'up' | 'down' | 'in' | 'out';
  timestamp: number;
}

let notificationId = 0;

// ─── Helpers ────────────────────────────────────────────────────

function formatTimeAgo(date: Date | null): string {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'agora';
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `há ${minutes}min`;
}

// ─── Main Component ─────────────────────────────────────────────

interface LiveViewProps {
  game: Game;
}

function LiveView({ game }: LiveViewProps) {
  const gameStatus: 'live' | 'final' | 'scheduled' =
    game.status === GameStatus.LIVE ? 'live' :
    game.status === GameStatus.FINAL ? 'final' : 'scheduled';

  const { boxscore, loading, error, refetch, isStale, lastUpdated, circuitOpen, isManualRefreshing } = useLiveGame(game.id, gameStatus);
  
  const [liveProps, setLiveProps] = useState<Record<string, { line: number; over: number; under: number }>>({});
  const prevPropsRef = useRef<Record<string, number>>({});
  const prevOnCourtRef = useRef<Record<string, OnCourtStatus>>({});
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);

  // ─── Auto Live Mode ──────────────────────────────────────────
  useEffect(() => {
    const isLive = game.status === GameStatus.LIVE;
    (oddsGateway as OddsGatewayImpl).setLiveMode(isLive);
    return () => { (oddsGateway as OddsGatewayImpl).setLiveMode(false); };
  }, [game.status]);

  // ─── Track Substitutions ────────────────────────────────────
  useEffect(() => {
    if (!boxscore) return;
    const allPlayers = [...boxscore.homeTeam.players, ...boxscore.awayTeam.players];
    const newNotifications: LiveNotification[] = [];
    const currentOnCourt = { ...prevOnCourtRef.current };

    for (const player of allPlayers) {
      const prev = currentOnCourt[player.player.id];
      const curr = player.onCourtStatus;
      if (prev !== undefined && prev !== curr) {
        if (curr === OnCourtStatus.HIGH_CONFIDENCE) {
          newNotifications.push({ id: ++notificationId, type: 'substitution', playerName: player.player.name, message: 'Entrou em quadra', direction: 'in', timestamp: Date.now() });
        } else if (prev === OnCourtStatus.HIGH_CONFIDENCE && curr === OnCourtStatus.UNKNOWN) {
          newNotifications.push({ id: ++notificationId, type: 'substitution', playerName: player.player.name, message: 'Saiu para o banco', direction: 'out', timestamp: Date.now() });
        }
      }
      currentOnCourt[player.player.id] = curr;
    }
    prevOnCourtRef.current = currentOnCourt;
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
    }
  }, [boxscore]);

  // ─── Fetch Props ───────────────────────────────────────────
  useEffect(() => {
    if (!boxscore || game.status !== GameStatus.LIVE) return;
    let ignore = false;

    async function fetchOnCourtProps() {
      const allPlayers = [...boxscore!.homeTeam.players, ...boxscore!.awayTeam.players];
      const confirmed = allPlayers.filter(p => p.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE);
      const estimated = allPlayers.filter(p => p.onCourtStatus === OnCourtStatus.ESTIMATED);
      const playersToFetch = confirmed.length > 0
        ? [...confirmed, ...estimated].slice(0, 14)
        : allPlayers.filter(p => p.isStarter);

      const newProps: Record<string, { line: number; over: number; under: number }> = {};
      for (const player of playersToFetch) {
        if (ignore) return;
        try {
          const prop = await oddsGateway.getPlayerPointsLine(player.player.id, game.id, player.player.name);
          if (prop && prop.line > 0) {
            newProps[player.player.id] = { line: prop.line, over: prop.overOdds, under: prop.underOdds };
          }
        } catch (_) {}
      }
      if (ignore) return;

      // Detect line changes
      const prevLines = prevPropsRef.current;
      const lineNotifs: LiveNotification[] = [];
      for (const [pid, data] of Object.entries(newProps)) {
        const prev = prevLines[pid];
        if (prev !== undefined && prev !== data.line) {
          const p = allPlayers.find(x => x.player.id === pid);
          lineNotifs.push({ id: ++notificationId, type: 'line', playerName: p?.player.name || pid, message: `${prev} → ${data.line}`, direction: data.line > prev ? 'up' : 'down', timestamp: Date.now() });
        }
        prevLines[pid] = data.line;
      }
      prevPropsRef.current = prevLines;
      setLiveProps(prev => ({ ...prev, ...newProps }));
      if (lineNotifs.length > 0) setNotifications(prev => [...lineNotifs, ...prev].slice(0, 10));
    }

    fetchOnCourtProps();
    const interval = setInterval(fetchOnCourtProps, 90 * 1000);
    return () => { ignore = true; clearInterval(interval); };
  }, [boxscore, game.status, game.id]);

  // Auto-dismiss
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => setNotifications(prev => prev.filter(n => Date.now() - n.timestamp < 6000)), 6000);
    return () => clearTimeout(timer);
  }, [notifications]);

  // ─── Render states ───────────────────────────────────────────
  if (loading) {
    return <div className="live-view animate-fadeIn"><div className="loading-state"><div className="loading-spinner">⏳</div><p>Carregando dados ao vivo...</p></div></div>;
  }
  if (circuitOpen) {
    return <div className="live-view animate-fadeIn"><div className="circuit-open-state"><span className="circuit-icon">🔌</span><p className="circuit-title">Serviço temporariamente indisponível</p><button onClick={() => refetch({ manual: true })} className="retry-button">Tentar novamente</button></div></div>;
  }
  if (error) {
    return <div className="live-view animate-fadeIn"><div className="error-state"><p className="error-title">Erro ao carregar dados</p><p className="error-message">{error}</p><button onClick={() => refetch({ manual: true })} className="retry-button">Tentar novamente</button></div></div>;
  }
  if (!boxscore) {
    return <div className="live-view animate-fadeIn"><div className="no-data-message"><p>Dados não disponíveis para este jogo.</p></div></div>;
  }

  const sortPlayers = (players: BoxScorePlayer[]) => {
    return [...players].sort((a, b) => {
      if (a.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && b.onCourtStatus !== OnCourtStatus.HIGH_CONFIDENCE) return -1;
      if (b.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && a.onCourtStatus !== OnCourtStatus.HIGH_CONFIDENCE) return 1;
      if (a.isStarter && !b.isStarter) return -1;
      if (b.isStarter && !a.isStarter) return 1;
      return b.points - a.points;
    });
  };

  const homePlayers = sortPlayers(boxscore.homeTeam.players);
  const awayPlayers = sortPlayers(boxscore.awayTeam.players);
  const margin = boxscore.homeScore - boxscore.awayScore;

  return (
    <div className="live-view animate-fadeIn">
      {/* Toast Notifications */}
      <div className="toast-area">
        {notifications.map(n => (
          <div key={n.id} className={`toast toast-${n.type} toast-${n.direction}`}>
            <span className="toast-icon">{n.type === 'line' ? (n.direction === 'up' ? '📈' : '📉') : (n.direction === 'in' ? '➡️' : '⬅️')}</span>
            <div className="toast-body">
              <span className="toast-name">{n.playerName}</span>
              <span className="toast-detail">{n.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Scoreboard — same structure as FinalView */}
      <div className="live-scoreboard">
        <div className="live-team away">
          <span className="team-abbr">{game.awayTeam.abbreviation}</span>
          <span className="team-score">{boxscore.awayScore}</span>
          <span className="team-name">{game.awayTeam.name}</span>
        </div>

        <div className="live-center">
          <div className="live-badge">
            <span className="live-dot-green"></span>AO VIVO
          </div>
          <div className="live-clock">{boxscore.period}Q{boxscore.clock && ` · ${boxscore.clock}`}</div>
          {margin !== 0 && (
            <div className="lead-margin">{margin > 0 ? game.homeTeam.abbreviation : game.awayTeam.abbreviation} +{Math.abs(margin)}</div>
          )}
        </div>

        <div className="live-team home">
          <span className="team-abbr">{game.homeTeam.abbreviation}</span>
          <span className="team-score">{boxscore.homeScore}</span>
          <span className="team-name">{game.homeTeam.name}</span>
        </div>
      </div>

      {boxscore.lastPlay && (
        <div className="last-play-strip">
          <span className="last-play-label">ÚLTIMA JOGADA</span>
          <span className="last-play-text">{boxscore.lastPlay}</span>
        </div>
      )}

      {/* Box Score Tables */}
      <div className="boxscore-section">
        <h3>Live Stats</h3>
        <div className="boxscore-grid">
          <LiveTeamTable teamName={game.awayTeam.shortName} players={awayPlayers} liveProps={liveProps} />
          <LiveTeamTable teamName={game.homeTeam.shortName} players={homePlayers} liveProps={liveProps} />
        </div>
      </div>

      <div className="data-source-note">
        <p>Detecção clínica via Play-by-Play ESPN · Linhas via The Odds API</p>
      </div>
    </div>
  );
}

// ─── Team Table ────────────────────────────────────────────────

function LiveTeamTable({ teamName, players, liveProps }: { teamName: string; players: BoxScorePlayer[]; liveProps: Record<string, { line: number; over: number; under: number }> }) {
  const onCourtCount = players.filter(p => p.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE).length;

  return (
    <div className="boxscore-team">
      <div className="team-header-row">
        <h4>{teamName}</h4>
        {onCourtCount > 0 && (
          <span className="oncourt-count">{onCourtCount} em quadra</span>
        )}
      </div>
      <table className="boxscore-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>PTS</th>
            <th>Linha</th>
            <th>Faltam</th>
            <th>REB</th>
            <th>AST</th>
            <th>MIN</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => {
            const prop = liveProps[player.player.id];
            const line = prop?.line || 0;
            const remaining = line > 0 ? line - player.points : null;
            const isOnCourt = player.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE;

            let remainingClass = '';
            if (remaining !== null) {
              if (remaining <= 0) remainingClass = 'remaining-hit';
              else if (remaining <= 3.5) remainingClass = 'remaining-near';
              else if (remaining <= 7.5) remainingClass = 'remaining-mid';
              else remainingClass = 'remaining-far';
            }

            return (
              <tr key={player.player.id} className={isOnCourt ? 'row-oncourt' : ''}>
                <td className="player-cell">
                  <span className="player-name">{player.player.name}</span>
                  {player.isStarter && <span className="player-pos">★</span>}
                  {isOnCourt && <span className="oncourt-dot"></span>}
                </td>
                <td className="pts-cell">{player.points}</td>
                <td>{line > 0 ? line : '—'}</td>
                <td className={remainingClass}>
                  {remaining !== null ? (remaining <= 0 ? '✅' : Math.ceil(remaining)) : '—'}
                </td>
                <td>{player.rebounds}</td>
                <td>{player.assists}</td>
                <td className="min-cell">{player.minutesPlayed}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default LiveView;