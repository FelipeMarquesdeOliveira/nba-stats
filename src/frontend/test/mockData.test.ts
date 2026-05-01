import { describe, it, expect } from 'vitest';
import { mockTeams, mockGames, mockPlayers, mockInjuries } from '../mockData';
import { GameStatus, InjuryStatus } from '@domain/types';

describe('NBA Stats - Phase 1 Setup Validation', () => {
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

    it('should have mock players defined', () => {
      expect(mockPlayers).toBeDefined();
      expect(mockPlayers.length).toBeGreaterThan(0);
    });

    it('should have mock injuries defined', () => {
      expect(mockInjuries).toBeDefined();
      expect(mockInjuries.length).toBeGreaterThan(0);
    });

    it('should have injuries with valid status', () => {
      const validStatuses = Object.values(InjuryStatus);
      mockInjuries.forEach((injury) => {
        expect(validStatuses).toContain(injury.status);
      });
    });

    it('should have players with required properties', () => {
      const player = mockPlayers[0];
      expect(player).toHaveProperty('id');
      expect(player).toHaveProperty('name');
      expect(player).toHaveProperty('jerseyNumber');
      expect(player).toHaveProperty('teamId');
    });
  });

  describe('Domain Types', () => {
    it('should export GameStatus enum', () => {
      expect(GameStatus.LIVE).toBe('Live');
      expect(GameStatus.SCHEDULED).toBe('Scheduled');
      expect(GameStatus.FINAL).toBe('Final');
    });

    it('should export InjuryStatus enum', () => {
      expect(InjuryStatus.OUT).toBe('Out');
      expect(InjuryStatus.QUESTIONABLE).toBe('Questionable');
      expect(InjuryStatus.PROBABLE).toBe('Probable');
    });
  });
});