/**
 * useGames - Hook for fetching games from ESPN scoreboard
 * With polling, cache awareness, and stale detection
 */

import { useState, useEffect, useRef } from 'react';
import { Game, GameStatus } from '@domain/types';
import { gameGateway } from '@data-collection';

interface UseGamesResult {
  games: Game[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isStale: boolean;
  lastUpdated: Date | null;
}

export function useGames(date?: string): UseGamesResult {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const targetDate = date || new Date().toISOString().split('T')[0];
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gamesRef = useRef<Game[]>([]);

  // Keep gamesRef in sync with state
  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  const fetchGames = async (isRetry = false) => {
    if (!isRetry) {
      setLoading(true);
    }
    setError(null);

    try {
      const fetchedGames = await gameGateway.getGamesForDate(targetDate);
      setGames(fetchedGames);
      setLastUpdated(new Date());
      setIsStale(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch games';

      // Check if we have stale data - if so, don't show error, just mark as stale
      if (gamesRef.current.length > 0 && err instanceof Error &&
          (err.message.includes('fetch') || err.message.includes('network') ||
           err.message.includes('timeout') || err.message.includes('API'))) {
        setIsStale(true);
        setError(null);
      } else {
        setError(errorMessage);
        setIsStale(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Polling based on game status
  const startPolling = () => {
    // Determine polling interval based on active games
    const hasLiveGames = games.some(g => g.status === GameStatus.LIVE);

    let interval: number;
    if (hasLiveGames) {
      interval = 25_000; // Live: 25s
    } else {
      interval = 60_000; // Scheduled: 60s
    }

    // Check if tab is hidden - reduce frequency
    if (typeof document !== 'undefined' && document.hidden) {
      interval = interval * 1.5; // 50% slower when hidden
    }

    // Clear existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start new polling
    pollingIntervalRef.current = setInterval(() => {
      fetchGames(true);
    }, interval);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchGames();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

  // Start/stop polling based on game status
  useEffect(() => {
    if (games.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (games.some(g => g.status === GameStatus.LIVE)) {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  return {
    games,
    loading,
    error,
    refetch: () => fetchGames(false),
    isStale,
    lastUpdated,
  };
}