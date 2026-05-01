import { useState } from 'react';
import { mockGames, mockPlayers, mockInjuries } from './mockData';
import type { Game, Player, Injury } from '@domain/types';
import './App.css';

function App() {
  const [selectedView, setSelectedView] = useState<'games' | 'players' | 'injuries'>('games');

  return (
    <div className="app">
      <header className="header">
        <h1>🏀 NBA Stats</h1>
        <p className="subtitle">Real-time NBA Data Dashboard</p>
      </header>

      <nav className="nav">
        <button
          className={selectedView === 'games' ? 'active' : ''}
          onClick={() => setSelectedView('games')}
        >
          Games
        </button>
        <button
          className={selectedView === 'players' ? 'active' : ''}
          onClick={() => setSelectedView('players')}
        >
          Players
        </button>
        <button
          className={selectedView === 'injuries' ? 'active' : ''}
          onClick={() => setSelectedView('injuries')}
        >
          Injuries
        </button>
      </nav>

      <main className="main">
        {selectedView === 'games' && <GamesView games={mockGames} />}
        {selectedView === 'players' && <PlayersView players={mockPlayers} />}
        {selectedView === 'injuries' && <InjuriesView injuries={mockInjuries} />}
      </main>

      <footer className="footer">
        <p>NBA Stats • Mock Data Only • Not Connected to Any API</p>
      </footer>
    </div>
  );
}

function GamesView({ games }: { games: Game[] }) {
  return (
    <section className="section">
      <h2>Today's Games</h2>
      <div className="grid">
        {games.map((game) => (
          <div key={game.id} className="card game-card">
            <div className="game-teams">
              <div className="team">
                <span className="team-name">{game.homeTeam.name}</span>
                <span className="team-score">{game.homeScore}</span>
              </div>
              <span className="vs">vs</span>
              <div className="team">
                <span className="team-name">{game.awayTeam.name}</span>
                <span className="team-score">{game.awayScore}</span>
              </div>
            </div>
            <div className="game-info">
              <span className={`status ${game.status.toLowerCase()}`}>{game.status}</span>
              <span className="time">{game.scheduledAt}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlayersView({ players }: { players: Player[] }) {
  return (
    <section className="section">
      <h2>Players</h2>
      <div className="grid">
        {players.map((player) => (
          <div key={player.id} className="card player-card">
            <div className="player-header">
              <span className="jersey">#{player.jerseyNumber}</span>
              <span className="player-name">{player.name}</span>
            </div>
            <div className="player-info">
              <span>Position: {player.position}</span>
              <span>Team: {player.teamId}</span>
              <span>Experience: {player.yearsExperience} years</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InjuriesView({ injuries }: { injuries: Injury[] }) {
  return (
    <section className="section">
      <h2>Injury Report</h2>
      <div className="grid">
        {injuries.map((injury) => (
          <div key={injury.id} className="card injury-card">
            <div className="injury-header">
              <span className="player-name">{injury.playerName}</span>
              <span className={`status-badge ${injury.status.toLowerCase()}`}>
                {injury.status}
              </span>
            </div>
            <div className="injury-info">
              <span>Team: {injury.teamId}</span>
              {injury.description && <span>Reason: {injury.description}</span>}
              <span>Updated: {injury.updatedAt}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default App;