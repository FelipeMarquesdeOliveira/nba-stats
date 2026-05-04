import { PlayerProfile, PlayerProfileGateway } from '@domain/types';
import { getESPNPlayerProfile, getESPNPlayerGamelog } from '../adapters/ESPN/athlete';
import { cache, DataSource, logger } from '../infrastructure';

export class PlayerProfileGatewayImpl implements PlayerProfileGateway {
  async getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
    const cacheKey = `player:profile:${playerId}`;
    
    // Check cache
    const cached = cache.get<PlayerProfile>(cacheKey);
    if (cached.data && cached.isFresh) {
      return cached.data;
    }

    try {
      const [profileData, gamelogData] = await Promise.all([
        getESPNPlayerProfile(playerId),
        getESPNPlayerGamelog(playerId)
      ]);

      if (!profileData || !profileData.athlete) {
        return null;
      }

      const athlete = profileData.athlete;
      const stats = athlete.stats?.summary || {};
      const seasonStats = {
        ppg: parseFloat(stats.stats?.find((s: any) => s.name === 'pointsPerGame')?.value || '0'),
        rpg: parseFloat(stats.stats?.find((s: any) => s.name === 'reboundsPerGame')?.value || '0'),
        apg: parseFloat(stats.stats?.find((s: any) => s.name === 'assistsPerGame')?.value || '0'),
        fgPct: parseFloat(stats.stats?.find((s: any) => s.name === 'fieldGoalPct')?.value || '0'),
        fg3Pct: parseFloat(stats.stats?.find((s: any) => s.name === 'threePointPct')?.value || '0'),
        ftPct: parseFloat(stats.stats?.find((s: any) => s.name === 'freeThrowPct')?.value || '0'),
        gamesPlayed: parseInt(stats.stats?.find((s: any) => s.name === 'gamesPlayed')?.value || '0', 10),
        mpg: parseFloat(stats.stats?.find((s: any) => s.name === 'minutesPerGame')?.value || '0')
      };

      const team = athlete.team || {};
      const teamId = team.id || '';
      const teamLogo = team.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/nba/500/${team.abbreviation?.toLowerCase() || 'nba'}.png`;

      // Parse gamelog
      const gamelog = [];
      if (gamelogData && gamelogData.seasonTypes && gamelogData.seasonTypes.length > 0) {
        let allGames: any[] = [];
        for (const season of gamelogData.seasonTypes) {
          if (season.categories && season.categories.length > 0) {
            allGames = [...allGames, ...(season.categories[0].events || [])];
          }
        }

        const labels = gamelogData.labels || [];
        const minIdx = labels.indexOf('MIN');
        const fgIdx = labels.indexOf('FG');
        const tptIdx = labels.indexOf('3PT');
        const ftIdx = labels.indexOf('FT');
        const rebIdx = labels.indexOf('REB');
        const astIdx = labels.indexOf('AST');
        const ptsIdx = labels.indexOf('PTS');

        for (const g of allGames) {
          if (!g.game || !g.stats) continue;
          
          const event = gamelogData.events?.[g.game.id];
          if (!event) continue;

          // Find opponent
          const isHome = event.homeTeamId === teamId;
          const opponent = event.opponent?.abbreviation || '';

          gamelog.push({
            gameId: g.game.id,
            date: event.gameDate,
            opponent: opponent,
            isHome: isHome,
            points: parseInt(g.stats[ptsIdx], 10) || 0,
            rebounds: parseInt(g.stats[rebIdx], 10) || 0,
            assists: parseInt(g.stats[astIdx], 10) || 0,
            minutes: g.stats[minIdx] || '0',
            fg: g.stats[fgIdx] || '0-0',
            threePt: g.stats[tptIdx] || '0-0',
            ft: g.stats[ftIdx] || '0-0'
          });
        }
      }

      const headshot = athlete.headshot?.href || `https://a.espncdn.com/i/headshots/nba/players/full/${playerId}.png`;

      const profile: PlayerProfile = {
        id: playerId,
        name: athlete.displayName || '',
        team: {
          id: teamId,
          name: team.displayName || '',
          abbreviation: team.abbreviation || '',
          logoUrl: teamLogo
        },
        position: athlete.position?.name || '',
        jersey: athlete.jersey || '',
        height: athlete.displayHeight || '',
        weight: athlete.displayWeight || '',
        experience: athlete.displayExperience || '',
        headshot: headshot,
        seasonStats: seasonStats,
        gamelog: gamelog
      };

      cache.set(cacheKey, profile, DataSource.ESPN);
      return profile;
    } catch (error) {
      logger.error(DataSource.ESPN, 'getPlayerProfile', playerId, error as any);
      return null;
    }
  }
}

export const playerProfileGateway = new PlayerProfileGatewayImpl();
