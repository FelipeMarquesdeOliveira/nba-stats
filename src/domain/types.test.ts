import { describe, it, expect } from 'vitest';
import {
  getLineColor,
  calculatePercentage,
  calculateEfficiency,
  detectHighlights,
  LineColor,
  PlayerGameStats,
  BoxScorePlayer,
  Player,
  OnCourtStatus,
} from './types';

// Minimal player object for testing - only id and name are used by the functions being tested
const createTestPlayer = (id: string, name: string): Player => ({
  id,
  name,
  jerseyNumber: '0',
  position: 'G',
  height: '6-0',
  weight: '200',
  birthDate: '1990-01-01',
  yearsExperience: 5,
  teamId: 'team-1',
});

describe('Domain Utilities', () => {
  describe('getLineColor', () => {
    it('should return GREEN when points remaining <= 3', () => {
      expect(getLineColor(-5)).toBe(LineColor.GREEN);
      expect(getLineColor(-1)).toBe(LineColor.GREEN);
      expect(getLineColor(0)).toBe(LineColor.GREEN);
      expect(getLineColor(1)).toBe(LineColor.GREEN);
      expect(getLineColor(2)).toBe(LineColor.GREEN);
      expect(getLineColor(3)).toBe(LineColor.GREEN);
    });

    it('should return YELLOW when points remaining is 4 or 5', () => {
      expect(getLineColor(4)).toBe(LineColor.YELLOW);
      expect(getLineColor(5)).toBe(LineColor.YELLOW);
    });

    it('should return RED when points remaining >= 6', () => {
      expect(getLineColor(6)).toBe(LineColor.RED);
      expect(getLineColor(7)).toBe(LineColor.RED);
      expect(getLineColor(10)).toBe(LineColor.RED);
      expect(getLineColor(20)).toBe(LineColor.RED);
    });
  });

  describe('calculatePercentage', () => {
    it('should return 0 when attempted is 0', () => {
      expect(calculatePercentage(0, 0)).toBe(0);
    });

    it('should calculate correct percentage for made/attempted', () => {
      expect(calculatePercentage(5, 10)).toBe(50);
      expect(calculatePercentage(7, 10)).toBe(70);
      expect(calculatePercentage(3, 10)).toBe(30);
    });

    it('should round to one decimal place', () => {
      expect(calculatePercentage(1, 3)).toBe(33.3);
      expect(calculatePercentage(2, 3)).toBe(66.7);
    });

    it('should return 100 when made equals attempted', () => {
      expect(calculatePercentage(10, 10)).toBe(100);
    });
  });

  describe('calculateEfficiency', () => {
    it('should calculate efficiency correctly', () => {
      const stats: PlayerGameStats = {
        player: createTestPlayer('p1', 'Test Player'),
        points: 25,
        rebounds: 10,
        assists: 8,
        steals: 2,
        blocks: 1,
        turnovers: 3,
        minutesPlayed: '32:00',
        fieldGoalsMade: 10,
        fieldGoalsAttempted: 18,
        threePointersMade: 3,
        threePointersAttempted: 7,
        freeThrowsMade: 2,
        freeThrowsAttempted: 2,
        plusMinus: 5,
      };

      const efficiency = calculateEfficiency(stats);
      // EFF = PTS + TRB + AST + STL + BLK - TO
      // = 25 + 10 + 8 + 2 + 1 - 3 = 43
      expect(efficiency).toBe(43);
    });

    it('should return negative efficiency for high turnover games', () => {
      const stats: PlayerGameStats = {
        player: createTestPlayer('p2', 'Test Player 2'),
        points: 8,
        rebounds: 3,
        assists: 2,
        steals: 0,
        blocks: 0,
        turnovers: 6,
        minutesPlayed: '15:00',
        fieldGoalsMade: 3,
        fieldGoalsAttempted: 8,
        threePointersMade: 1,
        threePointersAttempted: 4,
        freeThrowsMade: 1,
        freeThrowsAttempted: 2,
        plusMinus: -8,
      };

      const efficiency = calculateEfficiency(stats);
      // EFF = 8 + 3 + 2 + 0 + 0 - 6 = 7
      expect(efficiency).toBe(7);
    });
  });

  describe('detectHighlights', () => {
    it('should detect top scorer', () => {
      const players: BoxScorePlayer[] = [
        createMockPlayer('p1', 'LeBron', 32, 8, 5),
        createMockPlayer('p2', 'AD', 28, 12, 3),
        createMockPlayer('p3', 'Curry', 24, 4, 6),
      ];

      const highlights = detectHighlights(players);

      const topScorer = highlights.find((h) => h.type === 'top-scorer');
      expect(topScorer).toBeDefined();
      expect(topScorer!.value).toBe(32);
      expect(topScorer!.player.name).toBe('LeBron');
    });

    it('should detect double-double', () => {
      const players: BoxScorePlayer[] = [
        createMockPlayer('p1', 'Tatum', 15, 10, 8),
        createMockPlayer('p2', 'Brown', 22, 4, 3),
      ];

      const highlights = detectHighlights(players);

      const doubleDouble = highlights.find((h) => h.type === 'double-double');
      expect(doubleDouble).toBeDefined();
      expect(doubleDouble!.player.name).toBe('Tatum');
    });

    it('should detect triple-double', () => {
      const players: BoxScorePlayer[] = [
        createMockPlayer('p1', 'Jokic', 18, 12, 14),
      ];

      const highlights = detectHighlights(players);

      const tripleDouble = highlights.find((h) => h.type === 'triple-double');
      expect(tripleDouble).toBeDefined();
      expect(tripleDouble!.player.name).toBe('Jokic');
    });

    it('should limit to 10 highlights max', () => {
      const players: BoxScorePlayer[] = Array.from({ length: 15 }, (_, i) =>
        createMockPlayer(`p${i}`, `Player ${i}`, 10 + i, 10 + i, 10 + i)
      );

      const highlights = detectHighlights(players);

      expect(highlights.length).toBeLessThanOrEqual(10);
    });

    it('should return empty array for no scoring', () => {
      const players: BoxScorePlayer[] = [
        createMockPlayer('p1', 'Player1', 0, 0, 0),
      ];

      const highlights = detectHighlights(players);

      expect(highlights).toHaveLength(0);
    });
  });
});

function createMockPlayer(
  id: string,
  name: string,
  points: number,
  rebounds: number,
  assists: number
): BoxScorePlayer {
  const player = createTestPlayer(id, name);
  return {
    player,
    points,
    rebounds,
    assists,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    minutesPlayed: '30:00',
    fieldGoalsMade: Math.floor(points / 2),
    fieldGoalsAttempted: Math.floor(points / 2) + 5,
    threePointersMade: Math.floor(points / 4),
    threePointersAttempted: Math.floor(points / 4) + 2,
    freeThrowsMade: Math.floor(points / 4),
    freeThrowsAttempted: Math.floor(points / 4) + 1,
    plusMinus: 0,
    fieldGoalPct: 50,
    threePointPct: 40,
    freeThrowPct: 80,
    efficiency: points + rebounds + assists,
    isStarter: false,
    isOnCourt: false,
    onCourtStatus: 'unknown' as OnCourtStatus,
  };
}