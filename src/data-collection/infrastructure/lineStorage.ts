import { PlayerPointsLine } from '@domain/types';

const STORAGE_KEY = 'nba_stats_initial_lines';

export interface GameLines {
  [playerId: string]: PlayerPointsLine;
}

export interface LineStorageData {
  [gameId: string]: GameLines;
}

export const lineStorage = {
  /**
   * Saves the initial lines for a game. 
   * It only overwrites if there wasn't a line already, preserving the "initial" state.
   */
  saveInitialLines(gameId: string, lines: PlayerPointsLine[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      const data: LineStorageData = dataStr ? JSON.parse(dataStr) : {};
      
      const gameLines = data[gameId] || {};
      let hasChanges = false;

      for (const line of lines) {
        // Only save if we don't have an initial line for this player yet
        if (!gameLines[line.playerId]) {
          gameLines[line.playerId] = line;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        data[gameId] = gameLines;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Failed to save initial lines to localStorage', e);
    }
  },

  /**
   * Gets the initial lines for a game.
   */
  getInitialLines(gameId: string): GameLines {
    if (typeof window === 'undefined') return {};
    
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) return {};
      
      const data: LineStorageData = JSON.parse(dataStr);
      return data[gameId] || {};
    } catch (e) {
      console.error('Failed to read initial lines from localStorage', e);
      return {};
    }
  },
  
  /**
   * Clears storage (useful for cleanup or testing)
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }
};
