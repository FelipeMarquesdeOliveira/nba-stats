import { Game, LivePlayerStats } from '@domain/types';
import { getLiveGameData } from '@frontend/mocks';
import { LineIndicator } from '@frontend/components/common/LineIndicator';
import { calculatePercentage } from '@domain/types';
import './LiveView.css';

interface LiveViewProps {
  game: Game;
}

function LiveView({ game }: LiveViewProps) {
  const liveData = getLiveGameData(game.id);

  if (!liveData) {
    return (
      <div className="live-view">
        <div className="no-data-message">
          <p>Live data not available for this game.</p>
        </div>
      </div>
    );
  }

  const homePlayers = [...liveData.homeTeam.players].sort((a, b) => {
    if (a.isOnCourt !== b.isOnCourt) return a.isOnCourt ? -1 : 1;
    return b.points - a.points;
  });

  const awayPlayers = [...liveData.awayTeam.players].sort((a, b) => {
    if (a.isOnCourt !== b.isOnCourt) return a.isOnCourt ? -1 : 1;
    return b.points - a.points;
  });

  return (
    <div className="live-view">
      <div className="live-scoreboard">
        <div className="scoreboard-team">
          <span className="team-abbr">{game.awayTeam.abbreviation}</span>
          <span className="team-score">{liveData.awayTeam.score}</span>
          <span className="team-name">{game.awayTeam.name}</span>
        </div>

        <div className="scoreboard-center">
          <div className="live-indicator">● LIVE</div>
          <div className="game-clock">
            {liveData.period}{liveData.periodType && ` ${liveData.periodType}`}
            {liveData.clock && ` • ${liveData.clock}`}
          </div>
          {liveData.lastPlay && (
            <div className="last-play">{liveData.lastPlay}</div>
          )}
        </div>

        <div className="scoreboard-team">
          <span className="team-abbr">{game.homeTeam.abbreviation}</span>
          <span className="team-score">{liveData.homeTeam.score}</span>
          <span className="team-name">{game.homeTeam.name}</span>
        </div>
      </div>

      <div className="live-content">
        <PlayersSection
          teamName={game.awayTeam.shortName}
          players={awayPlayers}
          label="Away Team"
        />

        <PlayersSection
          teamName={game.homeTeam.shortName}
          players={homePlayers}
          label="Home Team"
        />
      </div>
    </div>
  );
}

interface PlayersSectionProps {
  teamName: string;
  players: LivePlayerStats[];
  label: string;
}

function PlayersSection({ teamName, players }: PlayersSectionProps) {
  return (
    <div className="players-section">
      <div className="section-header">
        <h3>{teamName}</h3>
        <span className="on-court-badge">
          {players.filter((p) => p.isOnCourt).length} On Court
        </span>
      </div>
      <table className="players-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>PTS</th>
            <th>LINE</th>
            <th>REM</th>
            <th>FG%</th>
            <th>3P%</th>
            <th>REB</th>
            <th>AST</th>
            <th>MIN</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr
              key={player.player.id}
              className={`
                ${player.isOnCourt ? 'on-court' : ''}
                ${player.isStarter ? 'starter' : ''}
              `}
            >
              <td className="player-cell">
                <span className="player-info">
                  {player.isStarter && <span className="starter-badge">S</span>}
                  <span className="player-name">{player.player.name}</span>
                  <span className="player-pos">{player.player.position}</span>
                </span>
                {player.isOnCourt && <span className="court-indicator">●</span>}
              </td>
              <td className="pts-cell">{player.points}</td>
              <td className="line-cell">
                {player.pointsLine}
                <span className="odds-cell">
                  ({player.overOdds > 0 ? '+' : ''}{player.overOdds})
                </span>
              </td>
              <td className="rem-cell">
                <LineIndicator pointsRemaining={player.pointsRemaining} />
              </td>
              <td className="pct-cell">
                {calculatePercentage(player.fieldGoalsMade, player.fieldGoalsAttempted)}%
              </td>
              <td className="pct-cell">
                {calculatePercentage(player.threePointersMade, player.threePointersAttempted)}%
              </td>
              <td>{player.rebounds}</td>
              <td>{player.assists}</td>
              <td className="min-cell">{player.minutesPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LiveView;