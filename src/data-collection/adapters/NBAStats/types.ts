/**
 * NBA Stats API Types
 * Raw types matching stats.nba.com response structure
 * Endpoint isolation: domain doesn't know about V2/V3 naming
 */

export interface NBAStatsResponse {
  resource: string;
  parameters: NBAStatsParameters;
  resultSets: NBAStatsResultSet[];
}

export interface NBAStatsParameters {
  GameID: string;
  StartPeriod: string;
  EndPeriod: string;
  StartRange: string;
  EndRange: string;
}

export interface NBAStatsResultSet {
  name: string;
  headers: string[];
  rowSet: NBAStatsRow[][];
}

export type NBAStatsRow = (string | number | null)[];

// Common result set names we care about
export const NBA_STATS_RESULT_SETS = {
  PLAYER_STATS: 'PlayerStats',
  TEAM_STATS: 'TeamStats',
  TEAM_STARTER_BENCH: 'TeamStarterBenchStats',
} as const;

// PlayerStats columns (index-based access via headers map)
export interface NBAStatsPlayerStats {
  GAME_ID: string;
  TEAM_ID: string;
  TEAM_ABBREVIATION: string;
  TEAM_CITY: string;
  PLAYER_ID: string;
  PLAYER_NAME: string;
  NICKNAME: string;
  START_POSITION: string;
  COMMENT: string;
  MIN: string;
  FGM: number;
  FGA: number;
  FG_PCT: number;
  FG3M: number;
  FG3A: number;
  FG3_PCT: number;
  FTM: number;
  FTA: number;
  FT_PCT: number;
  OREB: number;
  DREB: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  TO: number;
  PF: number;
  PTS: number;
  PLUS_MINUS: number;
}

// Scoreboard types
export interface NBAScoreboardResponse {
  resource: string;
  parameters: NBAScoreboardParameters;
  resultSets: NBAScoreboardResultSet[];
}

export interface NBAScoreboardParameters {
  GameDate: string;
  LeagueID: string;
  DayOffset: string;
}

export interface NBAScoreboardResultSet {
  name: string;
  headers: string[];
  rowSet: NBAScoreboardRow[][];
}

export type NBAScoreboardRow = (string | number | null)[];

// GameHeader columns (from stats.nba.com scoreboard)
export const GAME_HEADER_COLUMNS = {
  GAME_ID: 2,
  GAME_STATUS_TEXT: 7,
  HOME_TEAM_ID: 6,
  VISITOR_TEAM_ID: 4,
} as const;