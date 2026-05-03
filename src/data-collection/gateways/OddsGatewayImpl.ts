
import { OddsGateway, PlayerPointsLine, TeamPointsLine } from '@domain/types';
import { logger, DataSource } from '../infrastructure';

/**
 * The Odds API - Free tier: 500 requests/month
 * Endpoint: /v4/sports/basketball_nba/events/{eventId}/odds?markets=player_points
 * 
 * To get your free API key, sign up at: https://the-odds-api.com/
 * Then set it in localStorage: localStorage.setItem('ODDS_API_KEY', 'your-key-here')
 * Or pass it via the environment variable VITE_ODDS_API_KEY
 */

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/sports/basketball_nba';

interface OddsApiOutcome {
  name: string;        // Player name
  description: string; // "Over" or "Under"
  price: number;       // Decimal odds (e.g., 1.87)
  point: number;       // The line (e.g., 29.5)
}

interface OddsApiMarket {
  key: string;         // "player_points"
  outcomes: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: OddsApiMarket[];
}

interface OddsApiEvent {
  id: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

interface CachedProps {
  // playerName (lowercase) -> { line, over, under }
  [playerName: string]: { line: number; over: number; under: number };
}

export class OddsGatewayImpl implements OddsGateway {
  private propsCache: CachedProps = {};
  private lastUpdate: number = 0;
  private eventsCache: any[] | null = null;
  private eventsLastUpdate: number = 0;

  private getApiKey(): string | null {
    // Try environment variable first (Vite injects VITE_ prefixed vars)
    const envKey = (import.meta as any).env?.VITE_ODDS_API_KEY;
    if (envKey) return envKey;

    // Try localStorage as fallback (user can set it in browser console)
    try {
      const localKey = localStorage.getItem('ODDS_API_KEY');
      if (localKey) return localKey;
    } catch (_) { /* SSR safe */ }

    return null;
  }

  /**
   * Fetches all NBA events from The Odds API (cached for 30 minutes)
   */
  private async fetchEvents(): Promise<any[]> {
    const now = Date.now();
    if (this.eventsCache && (now - this.eventsLastUpdate) < 1800000) {
      return this.eventsCache;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    try {
      const res = await fetch(`${ODDS_API_BASE}/events?apiKey=${apiKey}`);
      if (!res.ok) {
        logger.warn(DataSource.ESPN, 'OddsAPI events fetch failed', `Status: ${res.status}`);
        return [];
      }
      this.eventsCache = await res.json();
      this.eventsLastUpdate = now;
      return this.eventsCache || [];
    } catch (e) {
      logger.error(DataSource.ESPN, 'OddsAPI events fetch error', '', e);
      return [];
    }
  }

  /**
   * Fetches player_points props for a specific event from The Odds API
   * Uses 'eu' region for decimal odds (Parimatch-style)
   */
  private async fetchPlayerProps(oddsEventId: string): Promise<CachedProps> {
    const apiKey = this.getApiKey();
    if (!apiKey) return {};

    try {
      const url = `${ODDS_API_BASE}/events/${oddsEventId}/odds?apiKey=${apiKey}&regions=eu&markets=player_points&oddsFormat=decimal`;
      const res = await fetch(url);
      if (!res.ok) return {};

      const data: OddsApiEvent = await res.json();
      const props: CachedProps = {};

      // Use the first bookmaker that has player_points data
      for (const bookmaker of (data.bookmakers || [])) {
        const market = bookmaker.markets?.find(m => m.key === 'player_points');
        if (!market) continue;

        for (const outcome of market.outcomes) {
          const playerKey = outcome.description.toLowerCase();
          if (outcome.name === 'Over') {
            if (!props[playerKey]) {
              props[playerKey] = { line: outcome.point, over: outcome.price, under: 0 };
            }
          } else if (outcome.name === 'Under') {
            if (props[playerKey]) {
              props[playerKey].under = outcome.price;
            } else {
              props[playerKey] = { line: outcome.point, over: 0, under: outcome.price };
            }
          }
        }
        // If we got data from this bookmaker, use it
        if (Object.keys(props).length > 0) break;
      }

      return props;
    } catch (e) {
      logger.error(DataSource.ESPN, 'OddsAPI player props fetch error', oddsEventId, e);
      return {};
    }
  }

  /**
   * Tries to find the matching Odds API event for an ESPN game
   * by matching team names
   */
  private async findOddsEventId(gameId: string, teamName?: string): Promise<string | null> {
    const events = await this.fetchEvents();
    if (!events || events.length === 0) return null;

    // Simple matching: try to find an event where team names overlap
    // ESPN uses "Philadelphia 76ers", Odds API uses "Philadelphia 76ers" too
    for (const event of events) {
      if (teamName) {
        const homeTeam = event.home_team?.toLowerCase() || '';
        const awayTeam = event.away_team?.toLowerCase() || '';
        const search = teamName.toLowerCase();
        if (homeTeam.includes(search) || awayTeam.includes(search) || 
            search.includes(homeTeam.split(' ').pop()) || search.includes(awayTeam.split(' ').pop())) {
          return event.id;
        }
      }
    }
    return null;
  }

  /**
   * Main method: tries The Odds API first, returns null if no data found.
   * No more hardcoded fallback data.
   */
  async getPlayerPointsLine(playerId: string, gameId: string, name?: string): Promise<PlayerPointsLine | null> {
    const pName = name?.toLowerCase() || '';
    
    // Check if we already have this player cached
    const normalizedName = pName.replace(/[^a-z ]/g, '').trim();
    const cachedMatch = this.findInCache(normalizedName);
    if (cachedMatch) {
      return {
        playerId: playerId.toString(),
        line: cachedMatch.line,
        overOdds: cachedMatch.over,
        underOdds: cachedMatch.under
      };
    }

    // Try to fetch from The Odds API
    const apiKey = this.getApiKey();
    if (!apiKey) {
      // No API key configured - show a helpful message once
      if (!this.propsCache['__warned']) {
        console.warn(
          '⚠️ [NBA-STATS] Para linhas automáticas, configure sua API key gratuita:\n' +
          '   1. Cadastre-se em https://the-odds-api.com/ (grátis)\n' +
          '   2. No console do navegador, execute:\n' +
          '      localStorage.setItem("ODDS_API_KEY", "sua-chave-aqui")\n' +
          '   3. Recarregue a página'
        );
        this.propsCache['__warned'] = { line: 0, over: 0, under: 0 };
      }
      return null;
    }

    // Try fetching props for this game
    const events = await this.fetchEvents();
    for (const event of events) {
      const eventPropsKey = `__event_${event.id}`;
      if (this.propsCache[eventPropsKey]) continue; // Already fetched

      const props = await this.fetchPlayerProps(event.id);
      Object.assign(this.propsCache, props);
      this.propsCache[eventPropsKey] = { line: 1, over: 0, under: 0 }; // Mark as fetched
    }

    // Try cache again after fetching
    const finalMatch = this.findInCache(normalizedName);
    if (finalMatch) {
      return {
        playerId: playerId.toString(),
        line: finalMatch.line,
        overOdds: finalMatch.over,
        underOdds: finalMatch.under
      };
    }

    return null;
  }

  /**
   * Fuzzy search in cache: tries exact match, then partial match by last name
   */
  private findInCache(normalizedName: string): { line: number; over: number; under: number } | null {
    // Exact match
    if (this.propsCache[normalizedName] && this.propsCache[normalizedName].line > 0) {
      return this.propsCache[normalizedName];
    }

    // Partial match (by last name)
    const lastName = normalizedName.split(' ').pop() || '';
    if (lastName.length < 3) return null;

    for (const [key, val] of Object.entries(this.propsCache)) {
      if (key.startsWith('__')) continue; // Skip internal keys
      if (val.line <= 0) continue;
      const cacheLastName = key.split(' ').pop() || '';
      if (cacheLastName === lastName) return val;
    }

    return null;
  }

  async getTeamPointsLine(teamId: string, gameId: string): Promise<TeamPointsLine | null> {
    return null;
  }

  async getGameOdds(gameId: string): Promise<{ homeSpread: number; awaySpread: number; overUnder: number } | null> {
    return null;
  }
}

export const oddsGateway = new OddsGatewayImpl();
