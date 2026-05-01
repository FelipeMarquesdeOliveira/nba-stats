import { Game, PregameData } from '@domain/types';
import { getPregameData } from '@frontend/mocks';
import './PregameView.css';

interface PregameViewProps {
  game: Game;
}

function PregameView({ game }: PregameViewProps) {
  const pregameData = getPregameData(game.id);

  if (!pregameData) {
    return (
      <div className="pregame-view">
        <div className="no-data-message">
          <p>Pregame data not available for this game.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pregame-view">
      <div className="pregame-header">
        <h2>Pregame</h2>
        <p className="game-time">
          {pregameData.scheduledAt} • {pregameData.venue}
          {pregameData.broadcaster && ` • ${pregameData.broadcaster}`}
        </p>
      </div>

      <div className="season-records">
        <TeamRecordCard teamData={pregameData.awayTeam} side="away" />
        <TeamRecordCard teamData={pregameData.homeTeam} side="home" />
      </div>

      <div className="matchup-section">
        <TeamColumn teamData={pregameData.awayTeam} />
        <div className="vs-divider">VS</div>
        <TeamColumn teamData={pregameData.homeTeam} />
      </div>

      <div className="availability-section">
        <h3>Availability Report</h3>

        <div className="availability-columns">
          <TeamAvailability teamData={pregameData.awayTeam} />
          <TeamAvailability teamData={pregameData.homeTeam} />
        </div>
      </div>
    </div>
  );
}

interface TeamRecordCardProps {
  teamData: PregameData['homeTeam'];
  side: 'home' | 'away';
}

function TeamRecordCard({ teamData, side }: TeamRecordCardProps) {
  if (!teamData.seasonRecord) return null;

  const { wins, losses, conferenceRank, homeRecord, awayRecord, lastTen } = teamData.seasonRecord;

  return (
    <div className={`record-card record-${side}`}>
      <div className="record-team">{teamData.team.shortName}</div>
      <div className="record-details">
        <span className="record-main">{wins}-{losses}</span>
        <span className="record-rank">#{conferenceRank} East</span>
      </div>
      <div className="record-meta">
        <span>Home: {homeRecord}</span>
        <span>Away: {awayRecord}</span>
        <span>L10: {lastTen}</span>
      </div>
    </div>
  );
}

interface TeamColumnProps {
  teamData: PregameData['homeTeam'];
}

function TeamColumn({ teamData }: TeamColumnProps) {
  return (
    <div className="team-column">
      <div className="team-header">
        <span className="team-abbr">{teamData.team.abbreviation}</span>
        <span className="team-name">{teamData.team.name}</span>
      </div>
      <div className="section-title">Probable Starters</div>
      <ul className="player-list">
        {teamData.starters.map((player) => (
          <li key={player.id} className="player-item">
            <span className="jersey">#{player.jerseyNumber}</span>
            <span className="player-name">{player.name}</span>
            <span className="player-pos">{player.position}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TeamAvailabilityProps {
  teamData: PregameData['homeTeam'];
}

function TeamAvailability({ teamData }: TeamAvailabilityProps) {
  const grouped = {
    OUT: teamData.availability.filter((a) => a.status === 'Out'),
    DOUBTFUL: teamData.availability.filter((a) => a.status === 'Doubtful'),
    QUESTIONABLE: teamData.availability.filter((a) => a.status === 'Questionable'),
    PROBABLE: teamData.availability.filter((a) => a.status === 'Probable'),
  };

  const hasAny = Object.values(grouped).some((arr) => arr.length > 0);

  return (
    <div className="availability-team">
      <h4>{teamData.team.shortName}</h4>
      {!hasAny && <p className="no-availability">No injuries reported</p>}
      {grouped.OUT.length > 0 && (
        <AvailabilityGroup label="OUT" items={grouped.OUT} color="red" />
      )}
      {grouped.DOUBTFUL.length > 0 && (
        <AvailabilityGroup label="DOUBTFUL" items={grouped.DOUBTFUL} color="orange" />
      )}
      {grouped.QUESTIONABLE.length > 0 && (
        <AvailabilityGroup label="QUESTIONABLE" items={grouped.QUESTIONABLE} color="yellow" />
      )}
      {grouped.PROBABLE.length > 0 && (
        <AvailabilityGroup label="PROBABLE" items={grouped.PROBABLE} color="green" />
      )}
    </div>
  );
}

interface AvailabilityGroupProps {
  label: string;
  items: PregameData['homeTeam']['availability'];
  color: 'red' | 'orange' | 'yellow' | 'green';
}

function AvailabilityGroup({ label, items, color }: AvailabilityGroupProps) {
  return (
    <div className={`availability-group group-${color}`}>
      <div className="group-label">{label}</div>
      {items.map((item) => (
        <div key={item.player.id} className="availability-item">
          <span className="avail-player">
            #{item.player.jerseyNumber} {item.player.name}
          </span>
          {item.reason && <span className="avail-reason">{item.reason}</span>}
        </div>
      ))}
    </div>
  );
}

export default PregameView;