/**
 * Unit tests for detectOnCourtStatus heuristic
 *
 * Tests the confidence-based on-court detection logic:
 * - HIGH_CONFIDENCE: Q4/OT starter with sufficient minutes
 * - ESTIMATED: any player with minutes > 0 not meeting HIGH_CONFIDENCE
 * - UNKNOWN: no minutes or game not in progress
 */

import { describe, it, expect } from 'vitest';
import { detectOnCourtStatus } from '../adapters/NBAStats/normalizers';
import { OnCourtStatus } from '@domain/types';

describe('detectOnCourtStatus', () => {
  describe('game status handling', () => {
    it('returns UNKNOWN for scheduled games', () => {
      const result = detectOnCourtStatus('10:00', true, 'scheduled', 1);
      expect(result).toBe(OnCourtStatus.UNKNOWN);
    });

    it('returns UNKNOWN for final games', () => {
      const result = detectOnCourtStatus('40:00', true, 'final', 4);
      expect(result).toBe(OnCourtStatus.UNKNOWN);
    });
  });

  describe('ZERO minutes', () => {
    it('returns UNKNOWN for 0 minutes (DNP)', () => {
      const result = detectOnCourtStatus('00:00', true, 'live', 4);
      expect(result).toBe(OnCourtStatus.UNKNOWN);
    });

    it('returns UNKNOWN for 0 minutes bench player', () => {
      const result = detectOnCourtStatus('00:00', false, 'live', 4);
      expect(result).toBe(OnCourtStatus.UNKNOWN);
    });
  });

  describe('HIGH_CONFIDENCE (Q4/OT starter)', () => {
    it('Q4 starter with 8min returns HIGH_CONFIDENCE', () => {
      const result = detectOnCourtStatus('8:30', true, 'live', 4);
      expect(result).toBe(OnCourtStatus.HIGH_CONFIDENCE);
    });

    it('Q4 starter with 6min returns HIGH_CONFIDENCE', () => {
      const result = detectOnCourtStatus('6:45', true, 'live', 4);
      expect(result).toBe(OnCourtStatus.HIGH_CONFIDENCE);
    });

    it('Q4 starter with 3min returns HIGH_CONFIDENCE (crunch time)', () => {
      const result = detectOnCourtStatus('3:30', true, 'live', 4);
      expect(result).toBe(OnCourtStatus.HIGH_CONFIDENCE);
    });

    it('OT starter with 3min returns HIGH_CONFIDENCE', () => {
      const result = detectOnCourtStatus('3:00', true, 'live', 5);
      expect(result).toBe(OnCourtStatus.HIGH_CONFIDENCE);
    });

    it('OT starter with 5min returns HIGH_CONFIDENCE', () => {
      const result = detectOnCourtStatus('5:15', true, 'live', 5);
      expect(result).toBe(OnCourtStatus.HIGH_CONFIDENCE);
    });
  });

  describe('ESTIMATED (bench or early period)', () => {
    it('Q1 starter with 6min returns ESTIMATED', () => {
      const result = detectOnCourtStatus('6:30', true, 'live', 1);
      expect(result).toBe(OnCourtStatus.ESTIMATED);
    });

    it('Q2 starter with 10min returns ESTIMATED', () => {
      const result = detectOnCourtStatus('10:00', true, 'live', 2);
      expect(result).toBe(OnCourtStatus.ESTIMATED);
    });

    it('Q4 bench player with 8min returns ESTIMATED', () => {
      const result = detectOnCourtStatus('8:30', false, 'live', 4);
      expect(result).toBe(OnCourtStatus.ESTIMATED);
    });

    it('Q4 starter with 2min returns ESTIMATED (not enough for HIGH)', () => {
      const result = detectOnCourtStatus('2:30', true, 'live', 4);
      expect(result).toBe(OnCourtStatus.ESTIMATED);
    });

    it('Q3 starter with 4min returns ESTIMATED (not Q4/OT)', () => {
      const result = detectOnCourtStatus('4:00', true, 'live', 3);
      expect(result).toBe(OnCourtStatus.ESTIMATED);
    });
  });

  describe('edge cases', () => {
    it('handles undefined period (defaults to early game logic)', () => {
      const result = detectOnCourtStatus('6:00', true, 'live');
      // Without period, can't be HIGH_CONFIDENCE, so ESTIMATED
      expect(result).toBe(OnCourtStatus.ESTIMATED);
    });

    it('Q4 starter with 0 min returns UNKNOWN', () => {
      const result = detectOnCourtStatus('00:00', true, 'live', 4);
      expect(result).toBe(OnCourtStatus.UNKNOWN);
    });

    it('handles malformed minutes string', () => {
      const result = detectOnCourtStatus('invalid', true, 'live', 4);
      // parseInt returns NaN which is 0, so UNKNOWN
      expect(result).toBe(OnCourtStatus.UNKNOWN);
    });
  });
});