/**
 * ESPN API Types
 * Raw types matching ESPN API response structure
 */

export interface ESPNScoreboardResponse {
  leagues: ESPNLeague[];
  events: ESPNEvent[];
  timestamp: string;
}

export interface ESPNLeague {
  id: string;
  name: string;
  abbreviation: string;
  logos: ESPNLogo[];
}

export interface ESPNLogo {
  href: string;
  width: number;
  height: number;
  alt: string;
}

export interface ESPNEvent {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  competitions: ESPNCompetition[];
  leaders?: ESPNLeader[];
  series?: ESPNSeries;
}

export interface ESPNCompetition {
  id: string;
  status: ESPNStatus;
  competitors: ESPNCompetitor[];
  odds?: ESPNOdds;
  broadcasts?: ESPNBroadcast[];
  referee?: ESPNReferee[];
}

export interface ESPNStatus {
  period?: number;
  clock?: string;
  state?: string;
  detail?: string;
  type?: {
    id: string;
    name: string;
    state: string;
    completed?: boolean;
  };
}

export interface ESPNCompetitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: 'home' | 'away';
  team: ESPNTeam;
  score?: string;
  linescores?: ESPNLineScore[];
  records?: ESPNRecord[];
}

export interface ESPNTeam {
  id: string;
  uid: string;
  slug: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
}

export interface ESPNLineScore {
  value: number;
}

export interface ESPNRecord {
  summary: string;
  type: string;
}

export interface ESPNOdds {
  spread?: string;
  overUnder?: string;
  AmericanOdds?: string;
}

export interface ESPNBroadcast {
  names: string[];
}

export interface ESPNReferee {
  id: string;
  name: string;
  role: string;
}

export interface ESPNSeries {
  summary: string;
  gameNumber?: string;
  winner?: string;
}

export interface ESPNLeader {
  name: string;
  displayName: string;
  shortDisplayName: string;
  playerID?: string;
  team?: string;
  points?: number;
}

// ESPN Injuries Response (nested by team)
export interface ESPNInjuriesResponse {
  timestamp: string;
  injuries: ESPNTeamInjury[];
}

export interface ESPNTeamInjury {
  id: string;
  displayName: string;
  injuries: ESPNInjury[];
}

export interface ESPNInjury {
  id: string;
  status: string;
  date: string;
  athlete: ESPNInjuryAthlete;
  type: {
    id: string;
    name: string;
    description: string;
    abbreviation: string;
  };
  details?: {
    type?: string;
    location?: string;
    side?: string;
    detail?: string;
    returnDate?: string;
    fantasyStatus?: {
      description: string;
      abbreviation: string;
    };
  };
  source?: {
    id: string;
    description: string;
    state: string;
  };
}

export interface ESPNInjuryAthlete {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  shortName: string;
  links: ESPNInjuryLink[];
  headshot?: {
    href: string;
    alt: string;
  };
  position?: {
    id: string;
    name: string;
    displayName: string;
    abbreviation: string;
  };
  team?: ESPNTeam;
  status?: {
    id: string;
    name: string;
    type: string;
    abbreviation: string;
  };
}

export interface ESPNInjuryLink {
  rel: string[];
  href: string;
}

// ESPN Summary Response
export interface ESPSummaryResponse {
  header: {
    id: string;
    timeValid: boolean;
    startDate: string;
    eventStatus: string;
    competition: {
      id: string;
      startDate: string;
      endDate?: string;
      duration?: string;
    };
  };
  boxscore?: ESPNBoxscore;
  gameInfo?: ESPNGameInfo;
  leader?: ESPNLeaderSummary;
}

export interface ESPNBoxscore {
  teams: ESPNBoxscoreTeam[];
}

export interface ESPNBoxscoreTeam {
  team: ESPNTeam;
  players: ESPNBoxscorePlayer[];
}

export interface ESPNBoxscorePlayer {
  athlete: {
    id: string;
    displayName: string;
    shortName: string;
  };
  stats: string[];
}

export interface ESPNGameInfo {
  attendance?: string;
  venue?: string;
  officials?: string[];
}

export interface ESPNLeaderSummary {
  title: string;
  summary: string;
}