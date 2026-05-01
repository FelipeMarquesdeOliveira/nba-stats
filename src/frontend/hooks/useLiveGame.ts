/**
 * useLiveGame - Hook for fetching live game data
 * With polling, cache awareness, and stale detection
 */

import { useState, useEffect, useRef } from 'react';
import { BoxScore, OnCourtStatus } from '@domain/types';
import { liveBoxScoreGateway, circuitBreaker, CircuitState, DataSource } from '@data-collection';

interface UseLiveGameResult {
  boxscore: BoxScore | null;
  loading: boolean;
  error: string | null;
  refetch: (options?: { manual?: boolean }) => void;
  isStale: boolean;
  lastUpdated: Date | null;
  circuitOpen: boolean;
  isManualRefreshing: boolean;
}

export function useLiveGame(
  gameId: string,
  gameStatus: 'live' | 'final' | 'scheduled' = 'live'
): UseLiveGameResult {
  const [boxscore, setBoxscore] = useState<BoxScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const boxscoreRef = useRef<BoxScore | null>(null);

  // Keep boxscoreRef in sync
  useEffect(() => {
    boxscoreRef.current = boxscore;
  }, [boxscore]);

  const fetchBoxscore = async (options?: { manual?: boolean; retry?: boolean }) => {
    const isRetry = options?.retry ?? false;
    const isManual = options?.manual ?? false;

    if (!gameId) {
      setError('Game ID is required');
      setLoading(false);
      return;
    }

    if (!isRetry) {
      setLoading(true);
    }
    if (isManual) {
      setIsManualRefreshing(true);
    }
    setError(null);

    try {
      const data = await liveBoxScoreGateway.getLiveBoxScore(gameId, gameStatus);
      setBoxscore(data);
      setLastUpdated(new Date());
      setIsStale(false);
      setCircuitOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch boxscore';

      // Check if circuit is open
      const circuitState = circuitBreaker.getState(DataSource.STATS_NBA_COM);
      const isCircuitOpen = circuitState === CircuitState.OPEN;

      if (isCircuitOpen) {
        setCircuitOpen(true);
      }

      // Check if we have stale data to show
      if (boxscoreRef.current && err instanceof Error &&
          (err.message.includes('fetch') || err.message.includes('network') ||
           err.message.includes('timeout') || err.message.includes('API') ||
           err.message.includes('Circuit'))) {
        setIsStale(true);
        setError(null);
      } else if (isCircuitOpen) {
        setError('Serviço temporariamente indisponível');
        setIsStale(false);
      } else if (!isManual && !isRetry) {
        // Initial load error - show error state
        setError(errorMessage);
        setIsStale(false);
      } else if (isManual) {
        // Manual refresh failed but we have data - keep showing data with stale
        setIsStale(true);
        setError(null);
      } else {
        setError(errorMessage);
        setIsStale(false);
      }
    } finally {
      setLoading(false);
      if (isManual) {
        setIsManualRefreshing(false);
      }
    }
  };

  // Determine polling interval
  const getPollingInterval = (): number => {
    // Check if circuit is open
    const circuitState = circuitBreaker.getState(DataSource.STATS_NBA_COM);
    const isCircuitOpen = circuitState === CircuitState.OPEN;

    if (isCircuitOpen) {
      // Much slower polling when circuit is open
      return gameStatus === 'live' ? 45_000 : 120_000;
    }

    // Normal polling based on game status
    if (gameStatus === 'live') {
      return 20_000; // 20s for live games
    } else if (gameStatus === 'final') {
      return 60_000; // 60s for final games
    }
    return 120_000; // 120s for scheduled (less frequent)
  };

  // Polling management
  const startPolling = () => {
    const interval = getPollingInterval();

    // Clear existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Reduce interval when tab is hidden
    let adjustedInterval = interval;
    if (typeof document !== 'undefined' && document.hidden) {
      adjustedInterval = interval * 1.5;
    }

    pollingIntervalRef.current = setInterval(() => {
      fetchBoxscore({ retry: true });
    }, adjustedInterval);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchBoxscore();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, gameStatus]);

  // Polling based on game status
  useEffect(() => {
    if (gameId && gameStatus !== 'scheduled') {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, gameStatus]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (gameId && gameStatus === 'live') {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, gameStatus]);

  return {
    boxscore,
    loading,
    error,
    refetch: (options?: { manual?: boolean }) => fetchBoxscore({ manual: options?.manual }),
    isStale,
    lastUpdated,
    circuitOpen,
    isManualRefreshing,
  };
}

// Utility to get on-court status text
export function getOnCourtStatusText(status: OnCourtStatus): string {
  switch (status) {
    case OnCourtStatus.HIGH_CONFIDENCE:
      return 'Alta confiança';
    case OnCourtStatus.ESTIMATED:
      return 'Estimado';
    case OnCourtStatus.UNKNOWN:
    default:
      return 'Indisponível';
  }
}