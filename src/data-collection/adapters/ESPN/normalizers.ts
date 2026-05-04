/**
 * ESPN Normalizers
 * Transforms ESPN API responses to domain types
 */

import { Game, AvailabilityItem, GameStatus, InjuryStatus, Team, Player } from '@domain/types';
import { ESPNEvent, ESPNStatus, ESPNInjuriesResponse } from './types';

interface TeamInput {
  id: string;
  name: string;
  abbreviation: string;
  displayName: string;
  logo?: string;
}

interface InjuryInput {
  athlete: {
    id: string;
    displayName: string;
    headshot?: { href: string };
    position?: { abbreviation: string };
  };
  status: string;
  details?: {
    type?: string;
    location?: string;
    side?: string;
    detail?: string;
    returnDate?: string;
  };
}

/**
 * Maps ESPN event to domain Game type
 */
export function normalizeEventToGame(event: ESPNEvent): Game {
  const competition = event.competitions[0];
  const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
  const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');

  const status = normalizeGameStatus(competition.status);

  const homeTeam: Team = createTeam(homeCompetitor?.team);
  const awayTeam: Team = createTeam(awayCompetitor?.team);

  const homeRecords = extractRecords(homeCompetitor?.records);
  const awayRecords = extractRecords(awayCompetitor?.records);

  return {
    id: event.id,
    homeTeam,
    awayTeam,
    homeScore: parseInt(homeCompetitor?.score || '0', 10),
    awayScore: parseInt(awayCompetitor?.score || '0', 10),
    status,
    scheduledAt: event.date,
    period: competition.status?.period,
    clock: competition.status?.clock,
    broadcaster: competition.broadcasts?.map(b => b.names[0]).join(', '),
    homeTeamRecord: homeRecords,
    awayTeamRecord: awayRecords,
  };
}

interface TeamRecords {
  home: string;
  away: string;
}

function extractRecords(records?: { summary: string; type: string }[]): TeamRecords | undefined {
  if (!records || records.length === 0) return undefined;

  let homeRecord: string | undefined;
  let awayRecord: string | undefined;

  for (const record of records) {
    if (record.type === 'home') homeRecord = record.summary;
    if (record.type === 'away') awayRecord = record.summary;
  }

  if (!homeRecord && !awayRecord) return undefined;

  return {
    home: homeRecord || '',
    away: awayRecord || '',
  };
}

function createTeam(team?: TeamInput & { color?: string; alternateColor?: string }): Team {
  const id = team?.id || '';
  const abbr = (team?.abbreviation || '').toLowerCase();
  
  // ESPN logo URL pattern is very consistent using the abbreviation
  const espnLogo = abbr ? `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${abbr}.png` : '';
  
  return {
    id: id,
    name: team?.displayName || team?.name || '',
    shortName: team?.abbreviation || '',
    abbreviation: team?.abbreviation || '',
    city: '',
    conference: 'East', 
    logoUrl: team?.logo || espnLogo,
    primaryColor: team?.color ? `#${team.color}` : '#000000',
    secondaryColor: team?.alternateColor ? `#${team.alternateColor}` : '#ffffff',
  };
}

/**
 * Normalize ESPN game status to domain GameStatus
 */
function normalizeGameStatus(status?: ESPNStatus): GameStatus {
  if (!status) return GameStatus.SCHEDULED;

  // ESPN embeds state in both status.state AND status.type.state
  // Prefer status.type.state as it's the canonical field in the ESPN scoreboard API
  const state = (status.type?.state || status.state || '').toLowerCase();
  const detail = (status.detail || '').toLowerCase();
  const typeName = (status.type?.name || '').toLowerCase();

  // FINAL: post state or explicit final markers
  if (
    state === 'post' ||
    detail.includes('final') ||
    typeName.includes('final') ||
    typeName === 'status_final'
  ) {
    return GameStatus.FINAL;
  }

  // LIVE: in-progress state or quarter/half indicators
  if (
    state === 'in' ||
    state === 'mi' ||
    typeName.includes('in progress') ||
    typeName === 'status_in_progress' ||
    detail.includes('q') ||
    detail.includes('quarter') ||
    detail.includes('half') ||
    detail.includes('ot')
  ) {
    return GameStatus.LIVE;
  }

  // SCHEDULED: pre-game state
  if (state === 'pre' || detail.includes('scheduled') || typeName === 'status_scheduled') {
    return GameStatus.SCHEDULED;
  }

  return GameStatus.SCHEDULED;
}

/**
 * Flatten ESPN injuries response to domain AvailabilityItem[]
 */
export function normalizeInjuriesResponse(response: ESPNInjuriesResponse): AvailabilityItem[] {
  const items: AvailabilityItem[] = [];

  for (const teamInjury of response.injuries) {
    for (const injury of teamInjury.injuries) {
      const item = normalizeInjury(injury, teamInjury.displayName);
      if (item) {
        items.push(item);
      }
    }
  }

  return items;
}

/**
 * Normalize single injury to domain AvailabilityItem
 */
function normalizeInjury(injury: any, groupTeamName: string): AvailabilityItem | null {
  if (!injury.athlete) return null;

  const status = normalizeInjuryStatus(injury.status);
  const reason = buildInjuryReason(injury.details);
  
  // Tentar pegar o time específico do atleta, senão usar o nome do grupo
  const athleteTeam = injury.athlete.team;
  const teamId = athleteTeam?.id || '';
  const teamName = athleteTeam?.displayName || athleteTeam?.name || groupTeamName;

  const player: Player = {
    id: injury.athlete.id || '',
    name: injury.athlete.displayName || '',
    position: injury.athlete.position?.abbreviation || '',
    jerseyNumber: '',
    height: '',
    weight: '',
    birthDate: '',
    yearsExperience: 0,
    teamId: teamId,
    imageUrl: injury.athlete.headshot?.href,
  };

  return {
    player,
    status,
    reason,
    returnDate: injury.details?.returnDate,
    teamName,
  };
}

/**
 * Map ESPN status string to domain InjuryStatus
 */
function normalizeInjuryStatus(espnStatus: string): InjuryStatus {
  const status = (espnStatus || '').toUpperCase();
  
  // Mapeamento abrangente para diferentes formatos da ESPN
  if (status.includes('OUT')) return InjuryStatus.OUT;
  if (status.includes('DOUBTFUL')) return InjuryStatus.DOUBTFUL;
  if (status.includes('QUESTIONABLE') || status.includes('GTD')) return InjuryStatus.QUESTIONABLE;
  if (status.includes('PROBABLE') || status.includes('DAY-TO-DAY') || status.includes('DTD')) return InjuryStatus.PROBABLE;
  
  // Mapeamentos específicos por ID/Constante se existirem
  const statusMap: Record<string, InjuryStatus> = {
    'INJURY_STATUS_OUT': InjuryStatus.OUT,
    'INJURY_STATUS_DOUBTFUL': InjuryStatus.DOUBTFUL,
    'INJURY_STATUS_QUESTIONABLE': InjuryStatus.QUESTIONABLE,
    'INJURY_STATUS_PROBABLE': InjuryStatus.PROBABLE,
  };

  return statusMap[espnStatus] || InjuryStatus.OUT;
}

/**
 * Build injury reason from details
 */
function buildInjuryReason(details?: InjuryInput['details']): string {
  if (!details) return '';

  const parts: string[] = [];
  if (details.type) parts.push(details.type);
  if (details.location) parts.push(details.location);
  if (details.side) parts.push(`(${details.side})`);
  if (details.detail) parts.push(details.detail);

  return parts.join(' - ');
}