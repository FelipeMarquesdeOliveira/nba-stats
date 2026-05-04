import React from 'react';
import { PlayerProfile } from '@domain/types';
import './PlayerStatsGrid.css';

interface PlayerStatsGridProps {
  stats: PlayerProfile['seasonStats'];
}

export const PlayerStatsGrid: React.FC<PlayerStatsGridProps> = ({ stats }) => {
  return (
    <div className="player-stats-grid">
      <div className="stat-card">
        <span className="stat-card-label">PTS</span>
        <span className="stat-card-value">{stats.ppg.toFixed(1)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card-label">REB</span>
        <span className="stat-card-value">{stats.rpg.toFixed(1)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card-label">AST</span>
        <span className="stat-card-value">{stats.apg.toFixed(1)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card-label">FG%</span>
        <span className="stat-card-value">{stats.fgPct.toFixed(1)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card-label">3P%</span>
        <span className="stat-card-value">{stats.fg3Pct.toFixed(1)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card-label">FT%</span>
        <span className="stat-card-value">{stats.ftPct.toFixed(1)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card-label">MIN</span>
        <span className="stat-card-value">{stats.mpg.toFixed(1)}</span>
      </div>
      <div className="stat-card">
        <span className="stat-card-label">GP</span>
        <span className="stat-card-value">{stats.gamesPlayed}</span>
      </div>
    </div>
  );
};
