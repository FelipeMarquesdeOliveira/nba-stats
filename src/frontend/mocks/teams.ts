import { Team } from '@domain/types';

export const mockTeams: Team[] = [
  {
    id: 'LAL',
    name: 'Los Angeles Lakers',
    shortName: 'Lakers',
    abbreviation: 'LAL',
    city: 'Los Angeles',
    conference: 'West',
    primaryColor: '#552583',
    secondaryColor: '#FDB927',
    logoUrl: 'https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg',
  },
  {
    id: 'BOS',
    name: 'Boston Celtics',
    shortName: 'Celtics',
    abbreviation: 'BOS',
    city: 'Boston',
    conference: 'East',
    primaryColor: '#007A33',
    secondaryColor: '#BA9653',
    logoUrl: 'https://cdn.nba.com/logos/nba/1610612738/global/L/logo.svg',
  },
  {
    id: 'GSW',
    name: 'Golden State Warriors',
    shortName: 'Warriors',
    abbreviation: 'GSW',
    city: 'Golden State',
    conference: 'West',
    primaryColor: '#1D428A',
    secondaryColor: '#FFC72C',
    logoUrl: 'https://cdn.nba.com/logos/nba/1610612744/global/L/logo.svg',
  },
  {
    id: 'MIA',
    name: 'Miami Heat',
    shortName: 'Heat',
    abbreviation: 'MIA',
    city: 'Miami',
    conference: 'East',
    primaryColor: '#98002E',
    secondaryColor: '#F9A01B',
    logoUrl: 'https://cdn.nba.com/logos/nba/1610612748/global/L/logo.svg',
  },
  {
    id: 'NYK',
    name: 'New York Knicks',
    shortName: 'Knicks',
    abbreviation: 'NYK',
    city: 'New York',
    conference: 'East',
    primaryColor: '#006BB6',
    secondaryColor: '#F58426',
    logoUrl: 'https://cdn.nba.com/logos/nba/1610612752/global/L/logo.svg',
  },
  {
    id: 'DAL',
    name: 'Dallas Mavericks',
    shortName: 'Mavericks',
    abbreviation: 'DAL',
    city: 'Dallas',
    conference: 'West',
    primaryColor: '#00538C',
    secondaryColor: '#000000',
    logoUrl: 'https://cdn.nba.com/logos/nba/1610612742/global/L/logo.svg',
  },
];

export function getTeamById(id: string): Team | undefined {
  return mockTeams.find((t) => t.id === id);
}