import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { playerProfileGateway } from '@data-collection/index';
import { oddsGateway } from '@data-collection/index';
import { PlayerProfile } from '@domain/types';
import { PlayerHeader } from '../components/player/PlayerHeader';
import { PlayerStatsGrid } from '../components/player/PlayerStatsGrid';
import { PointsBarChart } from '../components/player/PointsBarChart';
import './PlayerProfilePage.css';

const PlayerProfilePage: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [maxGames, setMaxGames] = useState<number>(10);
  const [customLine, setCustomLine] = useState<string>('');
  
  useEffect(() => {
    async function loadProfile() {
      if (!playerId) return;
      
      try {
        setLoading(true);
        const data = await playerProfileGateway.getPlayerProfile(playerId);
        setProfile(data);
        
        if (data && gameId) {
          const lineData = await oddsGateway.getPlayerPointsLine(playerId, gameId, data.name);
          if (lineData) {
            setCustomLine(lineData.line.toString());
          }
        }
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar o perfil do jogador.');
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [playerId, gameId]);

  if (loading) {
    return (
      <div className="player-profile-loading">
        <div className="spinner"></div>
        <p>Carregando perfil...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="player-profile-error">
        <h2>{error || 'Jogador não encontrado'}</h2>
        <button onClick={() => navigate(-1)} className="back-btn">Voltar</button>
      </div>
    );
  }

  const activeLine = customLine ? parseFloat(customLine) : 0;
  const recentGames = [...profile.gamelog].slice(0, maxGames);
  const avgPts = recentGames.length > 0 
    ? recentGames.reduce((acc, g) => acc + g.points, 0) / recentGames.length 
    : 0;

  return (
    <div className="player-profile-page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
      </div>

      <PlayerHeader profile={profile} />
      
      <div className="stats-section">
        <h2 className="section-title">Médias da Temporada</h2>
        <PlayerStatsGrid stats={profile.seasonStats} />
      </div>

      <div className="chart-section">
        <div className="chart-controls">
          <h2 className="section-title">Histórico de Pontos</h2>
          
          <div className="controls-group">
            <div className="control-item">
              <label>Linha de Referência:</label>
              <input 
                type="number" 
                step="0.5" 
                min="0"
                value={customLine}
                onChange={(e) => setCustomLine(e.target.value)}
                placeholder="Ex: 24.5"
                className="line-input"
              />
            </div>
            <div className="control-item">
              <label>Jogos:</label>
              <select 
                value={maxGames} 
                onChange={(e) => setMaxGames(Number(e.target.value))}
                className="games-select"
              >
                <option value={5}>Últimos 5</option>
                <option value={10}>Últimos 10</option>
                <option value={15}>Últimos 15</option>
                <option value={20}>Últimos 20</option>
              </select>
            </div>
          </div>
        </div>

        <PointsBarChart 
          games={profile.gamelog} 
          line={activeLine} 
          average={avgPts}
          maxGames={maxGames}
        />
      </div>
    </div>
  );
};

export default PlayerProfilePage;
