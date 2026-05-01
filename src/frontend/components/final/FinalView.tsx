import { Game } from '@domain/types';
import { getBoxScore } from '@frontend/mocks';
import './FinalView.css';

interface FinalViewProps {
  game: Game;
}

function FinalView({ game }: FinalViewProps) {
  const boxScore = getBoxScore(game.id);

  if (!boxScore) {
    return (
      <div className="final-view">
        <div className="no-data-message">
          <p>Box score not available for this game.</p>
        </div>
      </div>
    );
  }

  const fgPct = (made: number, attempted: number) => {
    if (attempted === 0) return '0.0';
    return ((made / attempted) * 100).toFixed(1);
  };

  return (
    <div className="final-view">
      <div className="final-scoreboard">
        <div className="final-team">
          <span className="team-abbr">{game.awayTeam.abbreviation}</span>
          <span className="team-score">{game.awayScore}</span>
          <span className="team-name">{game.awayTeam.name}</span>
        </div>

        <div className="final-center">
          <div className="final-label">FINAL</div>
          {game.venue && <div className="final-venue">{game.venue}</div>}
        </div>

        <div className="final-team">
          <span className="team-abbr">{game.homeTeam.abbreviation}</span>
          <span className="team-score">{game.homeScore}</span>
          <span className="team-name">{game.homeTeam.name}</span>
        </div>
      </div>

      <div className="game-summary">
        <h3>Game Summary</h3>
        <div className="summary-stats">
          <div className="summary-team">
            <h4>{game.awayTeam.shortName}</h4>
            <div className="stat-row">
              <span>Field Goals</span>
              <span>
                {boxScore.awayTeam.stats.fieldGoalsMade}-
                {boxScore.awayTeam.stats.fieldGoalsAttempted} (
                {fgPct(boxScore.awayTeam.stats.fieldGoalsMade, boxScore.awayTeam.stats.fieldGoalsAttempted)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>3-Pointers</span>
              <span>
                {boxScore.awayTeam.stats.threePointersMade}-
                {boxScore.awayTeam.stats.threePointersAttempted} (
                {fgPct(boxScore.awayTeam.stats.threePointersMade, boxScore.awayTeam.stats.threePointersAttempted)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>Free Throws</span>
              <span>
                {boxScore.awayTeam.stats.freeThrowsMade}-
                {boxScore.awayTeam.stats.freeThrowsAttempted} (
                {fgPct(boxScore.awayTeam.stats.freeThrowsMade, boxScore.awayTeam.stats.freeThrowsAttempted)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>Rebounds</span>
              <span>{boxScore.awayTeam.stats.rebounds}</span>
            </div>
            <div className="stat-row">
              <span>Assists</span>
              <span>{boxScore.awayTeam.stats.assists}</span>
            </div>
          </div>

          <div className="summary-team">
            <h4>{game.homeTeam.shortName}</h4>
            <div className="stat-row">
              <span>Field Goals</span>
              <span>
                {boxScore.homeTeam.stats.fieldGoalsMade}-
                {boxScore.homeTeam.stats.fieldGoalsAttempted} (
                {fgPct(boxScore.homeTeam.stats.fieldGoalsMade, boxScore.homeTeam.stats.fieldGoalsAttempted)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>3-Pointers</span>
              <span>
                {boxScore.homeTeam.stats.threePointersMade}-
                {boxScore.homeTeam.stats.threePointersAttempted} (
                {fgPct(boxScore.homeTeam.stats.threePointersMade, boxScore.homeTeam.stats.threePointersAttempted)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>Free Throws</span>
              <span>
                {boxScore.homeTeam.stats.freeThrowsMade}-
                {boxScore.homeTeam.stats.freeThrowsAttempted} (
                {fgPct(boxScore.homeTeam.stats.freeThrowsMade, boxScore.homeTeam.stats.freeThrowsAttempted)}%)
              </span>
            </div>
            <div className="stat-row">
              <span>Rebounds</span>
              <span>{boxScore.homeTeam.stats.rebounds}</span>
            </div>
            <div className="stat-row">
              <span>Assists</span>
              <span>{boxScore.homeTeam.stats.assists}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="boxscore-section">
        <h3>Box Score</h3>
        <div className="boxscore-grid">
          <TeamBoxScore team={game.awayTeam} boxScoreTeam={boxScore.awayTeam} />
          <TeamBoxScore team={game.homeTeam} boxScoreTeam={boxScore.homeTeam} />
        </div>
      </div>

      {boxScore.homeTeam.highlights.length > 0 && (
        <div className="highlights-section">
          <h3>Game Highlights</h3>
          <div className="highlights-grid">
            {boxScore.homeTeam.highlights.slice(0, 4).map((highlight, idx) => (
              <div key={idx} className="highlight-card">
                <span className={`highlight-badge badge-${highlight.type}`}>
                  {highlight.type.replace('-', ' ')}
                </span>
                <span className="highlight-player">{highlight.player.name}</span>
                <span className="highlight-value">
                  {typeof highlight.value === 'number' ? `${highlight.value} pts` : highlight.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TeamBoxScoreProps {
  team: Game['homeTeam'];
  boxScoreTeam: {
    players: Array<{
      player: { id: string; name: string; jerseyNumber: string; position: string };
      points: number;
      rebounds: number;
      assists: number;
      fieldGoalPct: number;
      threePointPct: number;
      freeThrowPct: number;
      minutesPlayed: string;
    }>;
  };
}

function TeamBoxScore({ team, boxScoreTeam }: TeamBoxScoreProps) {
  const sortedPlayers = [...boxScoreTeam.players].sort(
    (a, b) => b.points - a.points
  );

  return (
    <div className="boxscore-team">
      <h4>{team.shortName}</h4>
      <table className="boxscore-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>FG%</th>
            <th>3P%</th>
            <th>FT%</th>
            <th>MIN</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player) => (
            <tr key={player.player.id}>
              <td className="player-cell">
                <span className="player-name">{player.player.name}</span>
                <span className="player-pos">{player.player.position}</span>
              </td>
              <td className="pts-cell">{player.points}</td>
              <td>{player.rebounds}</td>
              <td>{player.assists}</td>
              <td>{player.fieldGoalPct}%</td>
              <td>{player.threePointPct}%</td>
              <td>{player.freeThrowPct}%</td>
              <td className="min-cell">{player.minutesPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FinalView;