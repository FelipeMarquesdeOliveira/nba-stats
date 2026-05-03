/**
 * Data Collection Configuration
 * Centralized config for all data sources
 */

export const DATA_COLLECTION_CONFIG = {
  // ESPN (no auth required)
  espn: {
    baseUrl: 'https://site.api.espn.com/apis/site/v2',
    scoreboardEndpoint: '/sports/basketball/nba/scoreboard',
    injuriesEndpoint: '/sports/basketball/nba/injuries',
    summaryEndpoint: '/sports/basketball/nba/summary',
  },

  // stats.nba.com (headers required)
  statsNbaCom: {
    baseUrl: 'https://stats.nba.com/stats',
    // Isolation: Endpoint names stay inside adapter, domain doesn't know V2/V3
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://stats.nba.com/',
      'Origin': 'https://stats.nba.com',
      'Accept': 'application/json, text/plain, */*',
    },
  },

  // Polling intervals
  polling: {
    scoreboardLiveMs: 15000,      // 15 seconds — scoreboard
    boxscoreLiveMs: 10000,        // 10 seconds — boxscore/PBP (substitutions)
    injuriesMs: 600000,           // 10 minutes
  },

  // Retry config
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
  },
} as const;

export type DataCollectionConfig = typeof DATA_COLLECTION_CONFIG;