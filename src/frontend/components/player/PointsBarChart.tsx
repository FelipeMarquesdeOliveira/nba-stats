import React from 'react';
import './PointsBarChart.css';

interface BarData {
  gameId: string;
  date: string;
  opponent: string;
  isHome: boolean;
  points: number;
}

interface PointsBarChartProps {
  games: BarData[];
  line?: number;
  average?: number;
  maxGames?: number;
}

export const PointsBarChart: React.FC<PointsBarChartProps> = ({ 
  games, 
  line = 0, 
  average = 0,
  maxGames = 10 
}) => {
  // Take only the specified number of games, usually last 10, and reverse to show oldest to newest
  const displayGames = [...games].slice(0, maxGames).reverse();
  
  if (displayGames.length === 0) {
    return <div className="points-bar-chart empty">Sem dados disponíveis</div>;
  }

  // Find max points for scaling
  const maxPoints = Math.max(
    ...displayGames.map(g => g.points),
    line * 1.2, // Ensure line is visible with some padding
    average * 1.2
  );

  const getBarColor = (points: number) => {
    if (line > 0) {
      return points >= line ? 'var(--over-color, #22c55e)' : 'var(--under-color, #ef4444)';
    }
    return 'var(--primary-color, #3b82f6)';
  };

  const calculateHeight = (val: number) => {
    return `${(val / maxPoints) * 100}%`;
  };

  const overCount = displayGames.filter(g => g.points >= line).length;
  const overPercentage = Math.round((overCount / displayGames.length) * 100);

  return (
    <div className="points-bar-chart-container">
      <div className="chart-header">
        <div className="chart-title">Últimos {displayGames.length} Jogos</div>
        {line > 0 && (
          <div className="chart-stats">
            <span className="stat-pill">
              <span className="stat-label">OVER {line}:</span>
              <span className="stat-value">{overCount}/{displayGames.length} ({overPercentage}%)</span>
            </span>
            <span className="stat-pill avg">
              <span className="stat-label">MÉDIA:</span>
              <span className="stat-value">{average.toFixed(1)}</span>
            </span>
          </div>
        )}
      </div>

      <div className="chart-area">
        {/* Reference Lines */}
        {line > 0 && (
          <div 
            className="reference-line target-line" 
            style={{ bottom: calculateHeight(line) }}
            title={`Linha: ${line}`}
          >
            <span className="line-label">{line}</span>
          </div>
        )}
        
        {average > 0 && (
          <div 
            className="reference-line average-line" 
            style={{ bottom: calculateHeight(average) }}
            title={`Média: ${average.toFixed(1)}`}
          >
            <span className="line-label avg">{average.toFixed(1)}</span>
          </div>
        )}

        {/* Bars */}
        <div className="bars-container">
          {displayGames.map((game, idx) => (
            <div key={`${game.gameId}-${idx}`} className="bar-wrapper">
              <div className="bar-value-label">{game.points}</div>
              <div className="bar-track">
                <div 
                  className="bar-fill" 
                  style={{ 
                    height: calculateHeight(game.points),
                    backgroundColor: getBarColor(game.points)
                  }}
                />
              </div>
              <div className="bar-x-label">
                <span className="opponent">{game.isHome ? 'vs ' : '@ '}{game.opponent}</span>
                <span className="date">
                  {new Date(game.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
