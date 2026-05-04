import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
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

// ─── Main Component ─────────────────────────────────────────────

interface LiveViewProps {
  game: Game;
}

function LiveView({ game }: LiveViewProps) {
  const gameStatus: 'live' | 'final' | 'scheduled' =
    game.status === GameStatus.LIVE ? 'live' :
    game.status === GameStatus.FINAL ? 'final' : 'scheduled';

  const { boxscore, loading } = useLiveGame(game.id, gameStatus);
  
  // Live props state
  const [liveProps, setLiveProps] = useState<Record<string, { line: number; over: number; under: number }>>({});
  const [oddsTimer, setOddsTimer] = useState(30);
  const prevPropsRef = useRef<Record<string, number>>({});
  const prevOnCourtRef = useRef<Record<string, OnCourtStatus>>({});
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  
  // Score animation tracking
  const prevScoreRef = useRef<{ home: number; away: number }>({ home: 0, away: 0 });
  const [homeScoreFlash, setHomeScoreFlash] = useState(false);
  const [awayScoreFlash, setAwayScoreFlash] = useState(false);

  // Odds Countdown Effect — lightweight 1s tick
  useEffect(() => {
    if (game.status !== GameStatus.LIVE) return;
    const timer = setInterval(() => {
      setOddsTimer(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [game.status]);

  // ─── Auto Live Mode + Game Context ──────────────────────────
  useEffect(() => {
    const isLive = game.status === GameStatus.LIVE;
    (oddsGateway as OddsGatewayImpl).setLiveMode(isLive);
    (oddsGateway as OddsGatewayImpl).setGameContext(game.id, game.homeTeam.name, game.awayTeam.name);
    
    return () => {
      (oddsGateway as OddsGatewayImpl).setLiveMode(false);
    };
  }, [game.status, game.id, game.homeTeam.name, game.awayTeam.name]);

  // ─── Score Change Animation ─────────────────────────────────
  useEffect(() => {
    if (!boxscore) return;

    const prevHome = prevScoreRef.current.home;
    const prevAway = prevScoreRef.current.away;

    if (boxscore.homeScore > prevHome && prevHome > 0) {
      setHomeScoreFlash(true);
      setTimeout(() => setHomeScoreFlash(false), 1200);
    }
    if (boxscore.awayScore > prevAway && prevAway > 0) {
      setAwayScoreFlash(true);
      setTimeout(() => setAwayScoreFlash(false), 1200);
    }

    prevScoreRef.current = { home: boxscore.homeScore, away: boxscore.awayScore };
  }, [boxscore?.homeScore, boxscore?.awayScore]);

  // ─── Track Substitutions ────────────────────────────────────
  useEffect(() => {
    if (!boxscore) return;

    const allPlayers = [...boxscore.homeTeam.players, ...boxscore.awayTeam.players];
    const newNotifications: LiveNotification[] = [];
    const currentOnCourt = { ...prevOnCourtRef.current };

    for (const player of allPlayers) {
      const prevStatus = currentOnCourt[player.player.id];
      const newStatus = player.onCourtStatus;

      if (prevStatus !== undefined && prevStatus !== newStatus) {
        if (newStatus === OnCourtStatus.HIGH_CONFIDENCE) {
          newNotifications.push({
            id: ++notificationId,
            type: 'substitution',
            playerName: player.player.name,
            message: 'ENTROU em quadra 🔴',
            direction: 'in',
            timestamp: Date.now()
          });
        } else if (prevStatus === OnCourtStatus.HIGH_CONFIDENCE && newStatus === OnCourtStatus.UNKNOWN) {
          newNotifications.push({
            id: ++notificationId,
            type: 'substitution',
            playerName: player.player.name,
            message: 'SAIU para o banco',
            direction: 'out',
            timestamp: Date.now()
          });
        }
      }
      currentOnCourt[player.player.id] = newStatus;
    }

    prevOnCourtRef.current = currentOnCourt;
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
    }
  }, [boxscore]);

  // ─── Fetch Props (Odds) ────────────────────────────────────
  useEffect(() => {
    if (!boxscore || game.status !== GameStatus.LIVE) return;

    let ignore = false;

    async function fetchOnCourtProps() {
      if (!boxscore) return;

      // Pause during Halftime
      const isHalftime = boxscore.clock?.toLowerCase().includes('half') || 
                         boxscore.clock?.toLowerCase().includes('ht');
      
      if (isHalftime) {
        console.log('⏸️ [ODDS] Halftime — Polling pausado');
        return;
      }

      const allPlayers = [...boxscore.homeTeam.players, ...boxscore.awayTeam.players];
      const newProps: Record<string, { line: number; over: number; under: number }> = {};
      
      for (const player of allPlayers) {
        if (ignore) return;
        try {
          const prop = await oddsGateway.getPlayerPointsLine(player.player.id, game.id, player.player.name);
          if (prop && prop.line > 0) {
            newProps[player.player.id] = { line: prop.line, over: prop.overOdds, under: prop.underOdds };
          }
        } catch (_) {}
      }

      if (ignore) return;

      // Detect Line Changes
      const prevLines = prevPropsRef.current;
      const lineNotifications: LiveNotification[] = [];

      for (const [playerId, propData] of Object.entries(newProps)) {
        const prevLine = prevLines[playerId];
        if (prevLine !== undefined && prevLine !== propData.line) {
          const player = allPlayers.find(p => p.player.id === playerId);
          lineNotifications.push({
            id: ++notificationId,
            type: 'line',
            playerName: player?.player.name || playerId,
            message: `Linha: ${prevLine} → ${propData.line}`,
            direction: propData.line > prevLine ? 'up' : 'down',
            timestamp: Date.now()
          });
        }
        prevLines[playerId] = propData.line;
      }

      prevPropsRef.current = prevLines;
      setLiveProps(prev => ({ ...prev, ...newProps }));

      if (lineNotifications.length > 0) {
        setNotifications(prev => [...lineNotifications, ...prev].slice(0, 10));
      }

      setOddsTimer(30);
    }

    fetchOnCourtProps();
    const interval = setInterval(fetchOnCourtProps, 30 * 1000);
    return () => { ignore = true; clearInterval(interval); };
  }, [boxscore, game.status, game.id]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => Date.now() - n.timestamp < 6000));
    }, 6000);
    return () => clearTimeout(timer);
  }, [notifications]);

  if (loading) return <div className="live-view loading">Carregando...</div>;
  if (!boxscore) return <div className="live-view no-data">Sem dados.</div>;

  // Sort players: on-court first, then starters, then by points
  const sortPlayers = (players: BoxScorePlayer[]) => {
    return [...players].sort((a, b) => {
      if (a.onCourtStatus === OnCourtStatus.DNP && b.onCourtStatus !== OnCourtStatus.DNP) return 1;
      if (b.onCourtStatus === OnCourtStatus.DNP && a.onCourtStatus !== OnCourtStatus.DNP) return -1;
      if (a.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && b.onCourtStatus !== OnCourtStatus.HIGH_CONFIDENCE) return -1;
      if (b.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE && a.onCourtStatus !== OnCourtStatus.HIGH_CONFIDENCE) return 1;
      if (a.isStarter && !b.isStarter) return -1;
      if (b.isStarter && !a.isStarter) return 1;
      return b.points - a.points;
    });
  };

  const homePlayers = sortPlayers(boxscore.homeTeam.players);
  const awayPlayers = sortPlayers(boxscore.awayTeam.players);

  return (
    <div className="live-container">
      {/* Notifications Toast */}
      <div className="toast-area">
        {notifications.map(n => (
          <div key={n.id} className={`toast ${n.type} ${n.direction}`}>
            <div className="toast-icon">
              {n.type === 'line' ? (n.direction === 'up' ? '📈' : '📉') : (n.direction === 'in' ? '🔴' : '🪑')}
            </div>
            <div className="toast-content">
              <div className="toast-player">{n.playerName}</div>
              <div className="toast-msg">{n.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="live-header-card glass">
        <div className="live-status-row">
          <div className="live-badge-pulse">AO VIVO</div>
          <div className="live-clock">{boxscore.period}Q • {boxscore.clock}</div>
          <div className="clinical-indicator">
            <span className="dot pulse"></span> CLINICAL ACTIVE
            <span className="odds-timer-pill">LINHAS EM {oddsTimer}s</span>
          </div>
        </div>

        <div className="score-main-row">
          <div className="team-score-block">
            <span className="team-abbr">{game.awayTeam.abbreviation}</span>
            <span className={`score-value ${awayScoreFlash ? 'score-flash' : ''}`}>{boxscore.awayScore}</span>
          </div>
          <div className="score-divider">VS</div>
          <div className="team-score-block">
            <span className={`score-value ${homeScoreFlash ? 'score-flash' : ''}`}>{boxscore.homeScore}</span>
            <span className="team-abbr">{game.homeTeam.abbreviation}</span>
          </div>
        </div>
        
        {boxscore.recentPlays && boxscore.recentPlays.length > 0 && (
          <div className="plays-ticker-container">
            <div className="plays-ticker-label">LIVE FEED</div>
            <div className="plays-ticker-track">
              {boxscore.recentPlays.map(play => (
                <div key={play.id} className={`ticker-item ${play.scoringPlay ? 'scoring' : ''}`}>
                  <span className="ticker-clock">{play.clock}</span>
                  <span className="ticker-text">{play.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="live-grid">
        <LiveTeamTable 
          title={game.awayTeam.name} 
          players={awayPlayers} 
          liveProps={liveProps}
          side="away"
        />
        <LiveTeamTable 
          title={game.homeTeam.name} 
          players={homePlayers} 
          liveProps={liveProps}
          side="home"
        />
      </div>
    </div>
  );
}

// ─── Memoized Team Table ───────────────────────────────────────

const LiveTeamTable = memo(function LiveTeamTable({ title, players, liveProps, side }: { 
  title: string; 
  players: BoxScorePlayer[]; 
  liveProps: Record<string, { line: number; over: number; under: number }>;
  side: string;
}) {
  const onCourtCount = players.filter(p => p.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE).length;

  return (
    <div className={`team-card glass ${side}`}>
      <div className="team-card-header">
        <h3>{title}</h3>
        <div className="on-court-summary">
          <span className="count">{onCourtCount}</span> EM QUADRA <span className="live-dot" style={{display: 'inline-block', marginLeft: '4px'}}></span>
        </div>
      </div>
      
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>PLAYER</th>
              <th>PTS</th>
              <th>LINHA</th>
              <th>FALTAM</th>
              <th>MIN</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <PlayerRow 
                key={player.player.id} 
                player={player} 
                prop={liveProps[player.player.id]} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ─── Memoized Player Row ──────────────────────────────────────

const PlayerRow = memo(function PlayerRow({ player, prop }: { 
  player: BoxScorePlayer; 
  prop?: { line: number; over: number; under: number };
}) {
  const line = prop?.line || 0;
  const remaining = line > 0 ? line - player.points : null;
  
  let statusClass = '';
  if (remaining !== null) {
    if (remaining <= 3) statusClass = 'hit';
    else if (remaining <= 4.5) statusClass = 'near';
    else if (remaining <= 8.5) statusClass = 'mid';
    else statusClass = 'far';
  }

  const isOnCourt = player.onCourtStatus === OnCourtStatus.HIGH_CONFIDENCE;
  const statusText = isOnCourt ? 'QUADRA' :
    player.onCourtStatus === OnCourtStatus.ESTIMATED ? 'ESTIMADO' :
    player.onCourtStatus === OnCourtStatus.DNP ? 'DNP' : 'BANCO';

  return (
    <tr className={isOnCourt ? 'active-row' : ''}>
      <td className="name-cell">
        {isOnCourt && <span className="live-dot"></span>}
        <span className="p-number">#{player.player.jerseyNumber}</span>
        <span className="p-name">{player.player.name}</span>
        {player.isStarter && <span className="starter-star">★</span>}
      </td>
      <td className="val-cell bold">{player.points}</td>
      <td className="val-cell">{line > 0 ? line : '—'}</td>
      <td className={`val-cell remaining ${statusClass}`}>
        {remaining !== null ? (remaining <= 0 ? '✅' : Math.ceil(remaining)) : '—'}
      </td>
      <td className="val-cell dim">{player.minutesPlayed}</td>
      <td className="status-cell">
        <span className={`status-pill ${player.onCourtStatus}`}>
          {statusText}
        </span>
      </td>
    </tr>
  );
});

export default LiveView;