// Domain Types for NBA Stats Application

// =============================================================================
// ENUMS
// =============================================================================

export enum InjuryStatus {
  QUESTIONABLE = 'Questionable',
  OUT = 'Out',
  DOUBTFUL = 'Doubtful',
  PROBABLE = 'Probable',
  NOT_INJURED = 'Not InJured',
  SUSPENDED = 'Suspended',
}

export enum GameStatus {
  SCHEDULED = 'Scheduled',
  LIVE = 'Live',
  FINAL = 'Final',
  POSTPONED = 'Postponed',
  CANCELLED = 'Cancelled',
}

export enum PeriodType {
  QUARTER = 'Q',
  HALF = 'H',
  OVERTIME = 'OT',
}

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  city: string;
  conference: 'East' | 'West';
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  position: string;
  height: string;
  weight: string;
  birthDate: string;
  yearsExperience: number;
  teamId: string;
  imageUrl?: string;
}

export interface Game {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: GameStatus;
  scheduledAt: string; // ISO date string
  period?: number;
  periodType?: PeriodType;
  clock?: string;
  venue?: string;
  broadcaster?: string;
}

export interface Injury {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  status: InjuryStatus;
  description?: string;
  updatedAt: string;
}

// =============================================================================
// BETTING TYPES
// =============================================================================

export interface PlayerPointsLine {
  playerId: string;
  playerName: string;
  line: number;
  overOdds: number;
  underOdds: number;
  bookmaker: string;
  updatedAt: string;
}

export interface TeamPointsLine {
  teamId: string;
  teamName: string;
  line: number;
  overOdds: number;
  underOdds: number;
  bookmaker: string;
  updatedAt: string;
}

// =============================================================================
// LIVE DATA TYPES
// =============================================================================

export interface LivePlayerState {
  playerId: string;
  playerName: string;
  teamId: string;
  points: number;
  assists: number;
  rebounds: number;
  minutesPlayed: string;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  plusMinus: number;
  isOnCourt: boolean;
  isStarter: boolean;
  status: 'active' | 'bench' | 'out';
}

export interface LiveGameData {
  gameId: string;
  homeTeamPlayers: LivePlayerState[];
  awayTeamPlayers: LivePlayerState[];
  homeScore: number;
  awayScore: number;
  period: number;
  periodType: PeriodType;
  clock: string;
  possession?: string; // teamId
  lastPlay?: string;
}

// =============================================================================
// META & INFRASTRUCTURE
// =============================================================================

export interface DataMetadata {
  source: string;
  collectedAt: number; // Unix timestamp in milliseconds
  url: string;
  cacheHit: boolean;
  version?: string;
}

export interface ApiResponse<T> {
  data: T;
  metadata: DataMetadata;
  error?: string;
}

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  rateLimitMs: number;
  timeoutMs: number;
  retryAttempts: number;
  enabled: boolean;
}

export interface FetchOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

export interface CacheEntry<T> {
  data: T;
  metadata: DataMetadata;
  expiresAt: number;
}

export enum CacheTTL {
  LIVE_GAME = 10_000,      // 10 seconds
  GAME_STATISTICS = 300_000, // 5 minutes
  INJURY_REPORT = 60_000,    // 1 minute
  BETTING_LINE = 30_000,     // 30 seconds
  TEAM_LIST = 3_600_000,     // 1 hour
  PLAYER_INFO = 600_000,     // 10 minutes
}