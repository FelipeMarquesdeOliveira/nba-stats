import React, { useState, useEffect } from 'react';
import './PlayerHoverCard.css';

interface PlayerHoverCardProps {
  playerId: string;
  playerName: string;
  position: string;
  onClose: () => void;
}

interface PlayerStats {
  ppg: string;
  rpg: string;
  apg: string;
  gamesPlayed?: number;
  season?: string;
}

export const PlayerHoverCard: React.FC<PlayerHoverCardProps> = ({ playerId, playerName, position, onClose }) => {
  const [timeframe, setTimeframe] = useState<'season' | 'l5'>('season');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        if (timeframe === 'season') {
          // BUSCA REAL DE DADOS NA ESPN - TEMPORADA
          const response = await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${playerId}/stats`);
          const data = await response.json();
          
          const averagesCategory = data.categories?.find((c: any) => c.name === 'averages');
          if (averagesCategory && averagesCategory.statistics) {
            const latestStats = averagesCategory.statistics[averagesCategory.statistics.length - 1];
            
            setStats({
              ppg: latestStats.stats[17],
              rpg: latestStats.stats[11],
              apg: latestStats.stats[12],
              gamesPlayed: parseInt(latestStats.stats[0]),
              season: latestStats.season.displayName
            });
          }
        } else {
          // BUSCA REAL DE DADOS NA ESPN - ÚLTIMOS 5 JOGOS (GAMELOG)
          const response = await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${playerId}/gamelog`);
          const data = await response.json();
          
          // No gamelog, os jogos estão em seasonTypes[i].categories[0].events
          // O regular season geralmente é st.id === "2"
          const regularSeason = data.seasonTypes?.find((st: any) => st.id === "2") || data.seasonTypes?.[0];
          const events = regularSeason?.categories?.[0]?.events;
          
          if (events && Array.isArray(events)) {
            const lastGames = events.slice(0, 5);
            let totalPts = 0, totalReb = 0, totalAst = 0;
            
            lastGames.forEach((event: any) => {
              // No gamelog, os índices são diferentes do endpoint /stats:
              // Labels: ["MIN","FG","FG%","3PT","3P%","FT","FT%","REB","AST","BLK","STL","PF","TO","PTS"]
              // REB (7), AST (8), PTS (13)
              if (event.stats && Array.isArray(event.stats)) {
                totalPts += parseFloat(event.stats[13] || 0);
                totalReb += parseFloat(event.stats[7] || 0);
                totalAst += parseFloat(event.stats[8] || 0);
              }
            });

            const count = lastGames.length;
            setStats({
              ppg: count > 0 ? (totalPts / count).toFixed(1) : "0.0",
              rpg: count > 0 ? (totalReb / count).toFixed(1) : "0.0",
              apg: count > 0 ? (totalAst / count).toFixed(1) : "0.0",
              gamesPlayed: count,
              season: "Últimos " + count + " jogos"
            });
          }
        }

      } catch (error) {
        console.error('Erro ao buscar estatísticas reais:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [playerId, timeframe]);

  return (
    <div className="player-side-card modal-style">
      <button className="close-button" onClick={onClose}>&times;</button>
      
      <div className="card-header">
        <div className="player-info">
          <h4>{playerName}</h4>
          <span className="player-meta">{position} • {stats?.season || 'NBA Athlete'}</span>
        </div>
        <div className="player-photo-placeholder">
          {playerName.charAt(0)}
        </div>
      </div>

      <div className="timeframe-tabs">
        <button 
          className={timeframe === 'season' ? 'active' : ''} 
          onClick={() => setTimeframe('season')}
        >
          Temporada
        </button>
        <button 
          className={timeframe === 'l5' ? 'active' : ''} 
          onClick={() => setTimeframe('l5')}
        >
          Últimos 5
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">PTS</span>
          <span className="stat-value">{loading ? '...' : stats?.ppg}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">REB</span>
          <span className="stat-value">{loading ? '...' : stats?.rpg}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">AST</span>
          <span className="stat-value">{loading ? '...' : stats?.apg}</span>
        </div>
      </div>

      {stats?.gamesPlayed && !loading && (
        <div className="card-footer">
          {timeframe === 'season' ? `Baseado em ${stats.gamesPlayed} jogos` : `Média dos últimos ${stats.gamesPlayed} jogos`}
        </div>
      )}
    </div>
  );
};

