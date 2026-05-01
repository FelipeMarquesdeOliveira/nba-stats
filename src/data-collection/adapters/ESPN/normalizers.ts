/**
 * ESPN Normalizers
 * Transforms ESPN API responses to domain types
 */

import { Game, AvailabilityItem, GameStatus, InjuryStatus, Team, Player } from '@domain/types';
import { ESPNEvent, ESPNInjuriesResponse } from './types';

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
  };
}

function createTeam(team?: TeamInput): Team {
  return {
    id: team?.id || '',
    name: team?.displayName || team?.name || '',
    shortName: team?.abbreviation || '',
    abbreviation: team?.abbreviation || '',
    city: '',
    conference: 'East', // Default, would need more data to determine
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
  };
}

/**
 * Normalize ESPN game status to domain GameStatus
 */
function normalizeGameStatus(status?: { state?: string; detail?: string }): GameStatus {
  if (!status) return GameStatus.SCHEDULED;

  const state = status.state?.toLowerCase() || '';
  const detail = status.detail?.toLowerCase() || '';

  if (state === 'pre' || detail.includes('scheduled')) {
    return GameStatus.SCHEDULED;
  }

  if (state === 'post' || detail.includes('final')) {
    return GameStatus.FINAL;
  }

  if (state === 'in' || detail.includes('q') || detail.includes('quarter')) {
    return GameStatus.LIVE;
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
function normalizeInjury(injury: InjuryInput, teamName: string): AvailabilityItem | null {
  if (!injury.athlete) return null;

  const status = normalizeInjuryStatus(injury.status);
  const reason = buildInjuryReason(injury.details);

  const player: Player = {
    id: injury.athlete.id || '',
    name: injury.athlete.displayName || '',
    position: injury.athlete.position?.abbreviation || '',
    jerseyNumber: '',
    height: '',
    weight: '',
    birthDate: '',
    yearsExperience: 0,
    teamId: '',
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