import { describe, it, expect } from 'vitest';
import { mockTeams, mockGames } from '@frontend/mocks';
import { GameStatus } from '@domain/types';

describe('NBA Stats - Mock Data Validation', () => {
  describe('Mock Data', () => {
    it('should have mock teams defined', () => {
      expect(mockTeams).toBeDefined();
      expect(mockTeams.length).toBeGreaterThan(0);
    });

    it('should have required team properties', () => {
      const team = mockTeams[0];
      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('abbreviation');
      expect(team).toHaveProperty('conference');
      expect(['East', 'West']).toContain(team.conference);
    });

    it('should have mock games defined', () => {
      expect(mockGames).toBeDefined();
      expect(mockGames.length).toBeGreaterThan(0);
    });

    it('should have games with valid status', () => {
      const validStatuses = Object.values(GameStatus);
      mockGames.forEach((game) => {
        expect(validStatuses).toContain(game.status);
      });
    });
  });

  describe('Domain Types', () => {
    it('should export GameStatus enum', () => {
      expect(GameStatus.LIVE).toBe('Live');
      expect(GameStatus.SCHEDULED).toBe('Scheduled');
      expect(GameStatus.FINAL).toBe('Final');
    });

    it('should have live game with score data', () => {
      const liveGame = mockGames.find((g) => g.status === GameStatus.LIVE);
      expect(liveGame).toBeDefined();
      expect(liveGame!.homeScore).toBeGreaterThan(0);
      expect(liveGame!.awayScore).toBeGreaterThan(0);
    });

    it('should have scheduled game with zero score', () => {
      const scheduledGame = mockGames.find((g) => g.status === GameStatus.SCHEDULED);
      expect(scheduledGame).toBeDefined();
      expect(scheduledGame!.homeScore).toBe(0);
      expect(scheduledGame!.awayScore).toBe(0);
    });

    it('should have final game with score data', () => {
      const finalGame = mockGames.find((g) => g.status === GameStatus.FINAL);
      expect(finalGame).toBeDefined();
      expect(finalGame!.homeScore).toBeGreaterThan(0);
      expect(finalGame!.awayScore).toBeGreaterThan(0);
    });
  });
});