import React from 'react';
import { PlayerProfile } from '@domain/types';
import './PlayerHeader.css';

interface PlayerHeaderProps {
  profile: PlayerProfile;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({ profile }) => {
  return (
    <div className="player-header-container">
      <div className="player-header-content">
        <div className="player-photo-container">
          <img 
            src={profile.headshot} 
            alt={profile.name} 
            className="player-photo"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png';
            }}
          />
        </div>
        <div className="player-info">
          <h1 className="player-name">{profile.name}</h1>
          <div className="player-meta">
            <span className="player-position">{profile.position}</span>
            <span className="meta-divider">•</span>
            <span className="player-team">
              {profile.team.logoUrl && (
                <img src={profile.team.logoUrl} alt={profile.team.abbreviation} className="team-logo-small" />
              )}
              {profile.team.name}
            </span>
          </div>
          <div className="player-physical">
            <span>#{profile.jersey}</span>
            <span className="meta-divider">•</span>
            <span>{profile.height}</span>
            <span className="meta-divider">•</span>
            <span>{profile.weight}</span>
            <span className="meta-divider">•</span>
            <span>Exp: {profile.experience}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
