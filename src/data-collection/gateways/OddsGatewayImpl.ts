
import { OddsGateway, PlayerPointsLine, TeamPointsLine } from '@domain/types';
import { logger, DataSource } from '../infrastructure';

/**
 * The Odds API Integration
 * 
 * Supports multiple API keys for credit rotation.
 * Smart caching: longer cache pre-game, shorter during live games.
 * 
 * Setup:
 *   .env -> VITE_ODDS_API_KEY=key1
 *   .env -> VITE_ODDS_API_KEY_2=key2
 *   .env -> VITE_ODDS_API_KEY_3=key3
 *   .env -> VITE_ODDS_API_KEY_4=key4
 *   .env -> VITE_ODDS_API_KEY_5=key5
 *   Or via browser console: localStorage.setItem('ODDS_API_KEYS', 'key1,key2,key3')
 */

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/sports/basketball_nba';

// Cache durations
const CACHE_PRE_GAME = 30 * 60 * 1000;   // 30 min — lines barely move pre-game
const CACHE_LIVE = 2 * 60 * 1000;         // 2 min — lines move fast during live
const CACHE_EVENTS = 60 * 60 * 1000;      // 1 hour — events list rarely changes

interface CachedProps {
  [playerName: string]: { line: number; over: number; under: number };
}

interface EventPropsCache {
  props: CachedProps;
  fetchedAt: number;
}

export class OddsGatewayImpl implements OddsGateway {
  private eventPropsCache: Map<string, EventPropsCache> = new Map();
  private eventsCache: any[] | null = null;
  private eventsLastUpdate: number = 0;
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private isLive: boolean = false;

  /**
   * Loads all available API keys from env vars and localStorage
   */
  private getApiKeys(): string[] {
    if (this.apiKeys.length > 0) return this.apiKeys;

    const keys: string[] = [];

    // From Vite env vars
    const env = (import.meta as any).env || {};
    if (env.VITE_ODDS_API_KEY) keys.push(env.VITE_ODDS_API_KEY);
    if (env.VITE_ODDS_API_KEY_2) keys.push(env.VITE_ODDS_API_KEY_2);
    if (env.VITE_ODDS_API_KEY_3) keys.push(env.VITE_ODDS_API_KEY_3);
    if (env.VITE_ODDS_API_KEY_4) keys.push(env.VITE_ODDS_API_KEY_4);
    if (env.VITE_ODDS_API_KEY_5) keys.push(env.VITE_ODDS_API_KEY_5);

    // From localStorage (comma-separated)
    try {
      const localKeys = localStorage.getItem('ODDS_API_KEYS');
      if (localKeys) {
        localKeys.split(',').map(k => k.trim()).filter(k => k).forEach(k => {
          if (!keys.includes(k)) keys.push(k);
        });
      }
      // Also check legacy single key
      const singleKey = localStorage.getItem('ODDS_API_KEY');
      if (singleKey && !keys.includes(singleKey)) keys.push(singleKey);
    } catch (_) { /* SSR safe */ }

    this.apiKeys = keys;
    return keys;
  }

  /**
   * Returns the next API key using round-robin rotation
   */
  private getNextKey(): string | null {
    const keys = this.getApiKeys();
    if (keys.length === 0) return null;
    const key = keys[this.currentKeyIndex % keys.length];
    this.currentKeyIndex++;
    return key;
  }

  /**
   * Set live mode (shorter cache intervals)
   * Call this from the LiveView component when a game goes live
   */
  setLiveMode(live: boolean) {
    this.isLive = live;
    if (live) {
      console.log('🔴 [ODDS] Modo AO VIVO ativado — atualizando props a cada 2 min');
    }
  }

  /**
   * Force refresh all cached props (useful for live games)
   */
  forceRefresh() {
    this.eventPropsCache.clear();
    console.log('🔄 [ODDS] Cache limpo — próxima busca trará dados frescos');
  }

  /**
   * Fetches all NBA events (cached for 1 hour)
   */
  private async fetchEvents(): Promise<any[]> {
    const now = Date.now();
    if (this.eventsCache && (now - this.eventsLastUpdate) < CACHE_EVENTS) {
      return this.eventsCache;
    }

    const apiKey = this.getNextKey();
    if (!apiKey) return [];

    try {
      const res = await fetch(`${ODDS_API_BASE}/events?apiKey=${apiKey}`);
      if (!res.ok) {
        // If rate limited, try next key
        if (res.status === 429) {
          const nextKey = this.getNextKey();
          if (nextKey && nextKey !== apiKey) {
            const retry = await fetch(`${ODDS_API_BASE}/events?apiKey=${nextKey}`);
            if (retry.ok) {
              this.eventsCache = await retry.json();
              this.eventsLastUpdate = now;
              return this.eventsCache || [];
            }
          }
        }
        return this.eventsCache || [];
      }
      
      // Log remaining credits from response headers
      const remaining = res.headers.get('x-requests-remaining');
      const used = res.headers.get('x-requests-used');
      if (remaining) {
        console.log(`📊 [ODDS] Créditos restantes: ${remaining} | Usados: ${used}`);
      }
      
      this.eventsCache = await res.json();
      this.eventsLastUpdate = now;
      return this.eventsCache || [];
    } catch (e) {
      logger.error(DataSource.ESPN, 'OddsAPI events fetch error', '', e);
      return this.eventsCache || [];
    }
  }

  /**
   * Fetches player_points props for a specific event
   */
  private async fetchPlayerProps(oddsEventId: string): Promise<CachedProps> {
    const apiKey = this.getNextKey();
    if (!apiKey) return {};

    try {
      const url = `${ODDS_API_BASE}/events/${oddsEventId}/odds?apiKey=${apiKey}&regions=eu&markets=player_points&oddsFormat=decimal`;
      const res = await fetch(url);
      
      if (!res.ok) {
        // Rate limited? Try next key
        if (res.status === 429) {
          const nextKey = this.getNextKey();
          if (nextKey && nextKey !== apiKey) {
            const retry = await fetch(`${ODDS_API_BASE}/events/${oddsEventId}/odds?apiKey=${nextKey}&regions=eu&markets=player_points&oddsFormat=decimal`);
            if (retry.ok) {
              return this.parsePropsResponse(await retry.json());
            }
          }
        }
        return {};
      }

      // Log remaining credits
      const remaining = res.headers.get('x-requests-remaining');
      if (remaining) {
        console.log(`📊 [ODDS] Créditos restantes: ${remaining} (key ...${apiKey.slice(-6)})`);
      }

      return this.parsePropsResponse(await res.json());
    } catch (e) {
      logger.error(DataSource.ESPN, 'OddsAPI player props fetch error', oddsEventId, e);
      return {};
    }
  }

  /**
   * Parses the API response into our CachedProps format
   */
  private parsePropsResponse(data: any): CachedProps {
    const props: CachedProps = {};
    
    for (const bookmaker of (data.bookmakers || [])) {
      const market = bookmaker.markets?.find((m: any) => m.key === 'player_points');
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
      if (Object.keys(props).length > 0) break;
    }

    return props;
  }

  /**
   * Checks if a specific event's cache is still valid
   */
  private isCacheValid(eventId: string): boolean {
    const cached = this.eventPropsCache.get(eventId);
    if (!cached) return false;
    
    const maxAge = this.isLive ? CACHE_LIVE : CACHE_PRE_GAME;
    return (Date.now() - cached.fetchedAt) < maxAge;
  }

  /**
   * Main method: fetches player props from The Odds API with smart caching
   */
  async getPlayerPointsLine(playerId: string, gameId: string, name?: string): Promise<PlayerPointsLine | null> {
    const pName = name?.toLowerCase() || '';
    const normalizedName = pName.replace(/[^a-z ]/g, '').trim();

    // Ensure we have API keys
    const keys = this.getApiKeys();
    if (keys.length === 0) {
      if (!this.eventPropsCache.has('__warned')) {
        console.warn(
          '⚠️ [NBA-STATS] Para linhas automáticas, configure suas API keys:\n' +
          '   1. Cadastre-se em https://the-odds-api.com/ (grátis)\n' +
          '   2. No .env, adicione: VITE_ODDS_API_KEY=sua-chave\n' +
          '   3. Para múltiplas: VITE_ODDS_API_KEY_2=outra-chave\n' +
          '   4. Reinicie o dev server'
        );
        this.eventPropsCache.set('__warned', { props: {}, fetchedAt: Date.now() });
      }
      return null;
    }

    // Get events list
    const events = await this.fetchEvents();

    // Fetch props for each event (if cache expired)
    for (const event of events) {
      if (!this.isCacheValid(event.id)) {
        const props = await this.fetchPlayerProps(event.id);
        this.eventPropsCache.set(event.id, { props, fetchedAt: Date.now() });
      }
    }

    // Search all cached events for this player
    const match = this.findPlayer(normalizedName);
    if (match) {
      return {
        playerId: playerId.toString(),
        line: match.line,
        overOdds: match.over,
        underOdds: match.under
      };
    }

    return null;
  }

  /**
   * Searches all cached event props for a player by name
   */
  private findPlayer(normalizedName: string): { line: number; over: number; under: number } | null {
    for (const [eventId, cached] of this.eventPropsCache.entries()) {
      if (eventId.startsWith('__')) continue;

      // Exact match
      if (cached.props[normalizedName] && cached.props[normalizedName].line > 0) {
        return cached.props[normalizedName];
      }

      // Last name match
      const lastName = normalizedName.split(' ').pop() || '';
      if (lastName.length < 3) continue;

      for (const [key, val] of Object.entries(cached.props)) {
        if (val.line <= 0) continue;
        if (key === normalizedName) return val;
        const cacheLastName = key.split(' ').pop() || '';
        if (cacheLastName === lastName && cacheLastName.length >= 3) return val;
      }
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
