// Domain Types for NBA Stats Application
// This file is the single source of truth for all domain entities

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

export enum LineColor {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
}

export enum OnCourtStatus {
  // Internal enum values - UI displays different text
  // CONFIRMED → "🔴 Alta confiança" (Q4 starter with context)
  // ESTIMATED → "🟡 Estimado" (minutes > 0 but lower confidence)
  // UNKNOWN → "— Indisponível" (no minutes or scheduled/final)
  HIGH_CONFIDENCE = 'confirmed', // renamed internally for clarity
  ESTIMATED = 'estimated',
  UNKNOWN = 'unknown',
}

export enum AvailabilityLevel {
  OUT = 'OUT',
  DOUBTFUL = 'DOUBTFUL',
  QUESTIONABLE = 'QUESTIONABLE',
  PROBABLE = 'PROBABLE',
  AVAILABLE = 'AVAILABLE',
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
  scheduledAt: string;
  period?: number;
  periodType?: PeriodType;
  clock?: string;
  venue?: string;
  broadcaster?: string;
  homeTeamRecord?: { home: string; away: string };
  awayTeamRecord?: { home: string; away: string };
}

// =============================================================================
// SEASON CONTEXT
// =============================================================================

export interface SeasonContext {
  season: string;
  gameNumber: number;
  record: string;
  conferenceRank: number;
  divisionRank?: number;
}

export interface TeamSeasonRecord {
  team: Team;
  season: string;
  wins: number;
  losses: number;
  conferenceRank: number;
  divisionRank?: number;
  homeRecord: string;
  awayRecord: string;
  lastTen: string;
}

// =============================================================================
// PREGAME TYPES
// =============================================================================

export interface AvailabilityItem {
  player: Player;
  status: InjuryStatus;
  reason?: string;
  returnDate?: string;
  teamName?: string;
}

export interface PregameData {
  gameId: string;
  scheduledAt: string;
  venue: string;
  broadcaster?: string;
  homeTeam: {
    team: Team;
    starters: Player[];
    availability: AvailabilityItem[];
    seasonRecord?: TeamSeasonRecord;
  };
  awayTeam: {
    team: Team;
    starters: Player[];
    availability: AvailabilityItem[];
    seasonRecord?: TeamSeasonRecord;
  };
}

// =============================================================================
// LIVE GAME TYPES
// =============================================================================

export interface LivePlayerStats {
  player: Player;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  minutesPlayed: string;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  plusMinus: number;
  isOnCourt: boolean;
  isStarter: boolean;
  pointsLine: number;
  overOdds: number;
  underOdds: number;
  pointsRemaining: number;
  lineColor: LineColor;
}

export interface LiveGameData {
  gameId: string;
  homeTeam: {
    team: Team;
    players: LivePlayerStats[];
    score: number;
  };
  awayTeam: {
    team: Team;
    players: LivePlayerStats[];
    score: number;
  };
  period: number;
  periodType: PeriodType;
  clock: string;
  possession?: string;
  lastPlay?: string;
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
  movement?: 'up' | 'down' | 'stable';
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
// BOXSCORE / FINAL GAME TYPES
// =============================================================================

export interface BoxScorePlayer extends PlayerGameStats {
  fieldGoalPct: number;
  threePointPct: number;
  freeThrowPct: number;
  efficiency: number;
  isOnCourt: boolean;
  onCourtStatus: OnCourtStatus;
  teamAbbreviation?: string;
  isStarter?: boolean;
}

export interface PlayerGameStats {
  player: Player;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  minutesPlayed: string;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  plusMinus: number;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  points: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
}

export interface GameHighlights {
  type: 'top-scorer' | 'double-double' | 'triple-double' | 'career-high' | 'game-high';
  player: Player;
  value: number | string;
  description: string;
}

export interface BoxScore {
  gameId: string;
  homeTeam: {
    abbreviation: string;
    name: string;
    players: BoxScorePlayer[];
  };
  awayTeam: {
    abbreviation: string;
    name: string;
    players: BoxScorePlayer[];
  };
  homeScore: number;
  awayScore: number;
  period?: number;
  clock?: string;
  gameStatus?: GameStatus;
  lastPlay?: string;
  recentPlays?: { id: string; text: string; clock: string; period: number; teamId?: string; scoringPlay?: boolean }[];
  players: BoxScorePlayer[];
  teamStats?: Record<string, Record<string, number>>;
  highlights: GameHighlights[];
  /** Quarter-by-quarter scores. Only populated if API provides this data. */
  quarterScores?: QuarterScore[];
}

export interface QuarterScore {
  period: number;
  homeScore: number;
  awayScore: number;
  periodType?: PeriodType;
}

// =============================================================================
// GATEWAY INTERFACES (Neutral, Source-Agnostic)
// =============================================================================

export interface GameGateway {
  getGamesForDate(date?: string): Promise<Game[]>;
  getGameById(gameId: string, date?: string): Promise<Game | null>;
}

export interface LiveGameGateway {
  getLiveGameData(gameId: string): Promise<LiveGameData | null>;
  subscribeToLiveGame(gameId: string): Promise<LiveGameData>;
}

export interface InjuryGateway {
  getInjuriesByGame(gameId: string): Promise<{
    homeTeam: AvailabilityItem[];
    awayTeam: AvailabilityItem[];
  }>;
  getInjuriesByTeam(teamId: string): Promise<AvailabilityItem[]>;
}

export interface PlayerPointsLine {
  playerId: string;
  line: number;
  overOdds?: number;
  underOdds?: number;
}

export interface PlayerStats {
  id: string;
  last5: number[];
  avg: number;
}

export interface PlayerGateway {
  getPlayerLast5Stats(playerId: string): Promise<PlayerStats | null>;
}

export interface OddsGateway {
  getPlayerPointsLine(playerId: string, gameId: string, name?: string): Promise<PlayerPointsLine | null>;
  getTeamPointsLine(teamId: string, gameId: string): Promise<TeamPointsLine | null>;
  getGameOdds(gameId: string): Promise<{
    homeSpread: number;
    awaySpread: number;
    overUnder: number;
  } | null>;
}

export interface BoxScoreGateway {
  getBoxScore(gameId: string): Promise<BoxScore | null>;
}

export interface PregameGateway {
  getPregameData(gameId: string): Promise<PregameData | null>;
}

// =============================================================================
// META & INFRASTRUCTURE
// =============================================================================

export interface DataMetadata {
  source: string;
  collectedAt: number;
  url: string;
  cacheHit: boolean;
  version?: string;
}

export interface ApiResponse<T> {
  data: T;
  metadata: DataMetadata;
  error?: string;
}

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

export interface CacheEntry<T> {
  data: T;
  metadata: DataMetadata;
  expiresAt: number;
}

export enum CacheTTL {
  LIVE_GAME = 10_000,
  GAME_STATISTICS = 300_000,
  INJURY_REPORT = 60_000,
  BETTING_LINE = 30_000,
  TEAM_LIST = 3_600_000,
  PLAYER_INFO = 600_000,
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function getLineColor(pointsRemaining: number): LineColor {
  if (pointsRemaining <= 3) return LineColor.GREEN;
  if (pointsRemaining <= 5) return LineColor.YELLOW;
  return LineColor.RED;
}

export function calculatePercentage(made: number, attempted: number): number {
  if (attempted === 0) return 0;
  return Math.round((made / attempted) * 1000) / 10;
}

export function calculateEfficiency(stats: PlayerGameStats): number {
  const pts = stats.points;
  const ast = stats.assists;
  const trb = stats.rebounds;
  const stl = stats.steals;
  const blk = stats.blocks;
  const to = stats.turnovers;
  return pts + trb + ast + stl + blk - to;
}

export function detectHighlights(
  playerStats: BoxScorePlayer[]
): GameHighlights[] {
  const highlights: GameHighlights[] = [];

  for (const stats of playerStats) {
    if (stats.points > 0) {
      highlights.push({
        type: 'top-scorer',
        player: stats.player,
        value: stats.points,
        description: `${stats.player.name} scored ${stats.points} points`,
      });
    }

    const doubleCategories = [stats.points, stats.rebounds, stats.assists];
    const doubles = doubleCategories.filter((v) => v >= 10).length;
    if (doubles >= 2) {
      highlights.push({
        type: doubles >= 3 ? 'triple-double' : 'double-double',
        player: stats.player,
        value: doubles,
        description: `${stats.player.name} recorded a ${doubles}x double`,
      });
    }
  }

  return highlights.slice(0, 10);
}