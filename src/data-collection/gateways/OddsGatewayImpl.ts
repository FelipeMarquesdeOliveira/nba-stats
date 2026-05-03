
import { OddsGateway, PlayerPointsLine, TeamPointsLine } from '@domain/types';
import { logger, DataSource } from '../infrastructure';

/**
 * The Odds API — Smart Caching Strategy
 * 
 * PRÉ-JOGO (3 fetches por jogo por dia = ~3 créditos):
 *   1. Quando o jogo aparece no scoreboard (anúncio)
 *   2. Check matinal (9h) — via cache de 6 horas
 *   3. 1 hora antes do tip-off — cache expira automaticamente
 * 
 * AO VIVO (cache de 90 segundos):
 *   - Atualiza a cada 90s focando nos jogadores que estão em quadra
 *   - Roda usando rotação de 6 chaves = ~3000 créditos/mês
 * 
 * Setup: até 6 chaves no .env (VITE_ODDS_API_KEY, _2, _3, _4, _5, _6)
 */

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/sports/basketball_nba';

// Cache durations
const CACHE_PRE_GAME_EARLY = 6 * 60 * 60 * 1000;  // 6 horas — de manhã até perto do jogo
const CACHE_PRE_GAME_CLOSE = 60 * 60 * 1000;       // 1 hora — última hora antes do jogo
const CACHE_LIVE = 30 * 1000;                        // 30 segundos — ao vivo (~300 créditos/jogo)
const CACHE_EVENTS = 2 * 60 * 60 * 1000;            // 2 horas — lista de eventos

interface CachedProps {
  [playerName: string]: { line: number; over: number; under: number };
}

interface EventPropsCache {
  props: CachedProps;
  fetchedAt: number;
  commenceTime?: string; // ISO date of game start
}

export class OddsGatewayImpl implements OddsGateway {
  private eventPropsCache: Map<string, EventPropsCache> = new Map(); // keyed by Odds API event ID
  private eventsCache: any[] | null = null; // raw event list from Odds API
  private eventsLastUpdate: number = 0;
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private _isLive: boolean = false;
  private fetchPromise: Promise<void> | null = null;
  // Maps ESPN gameId → Odds API event ID (set externally before fetching)
  private gameIdToOddsEventId: Map<string, string> = new Map();

  // ─── API Key Management ───────────────────────────────────────

  private getApiKeys(): string[] {
    if (this.apiKeys.length > 0) return this.apiKeys;

    const keys: string[] = [];
    const env = (import.meta as any).env || {};
    
    // Load from env vars (VITE_ODDS_API_KEY, _2, _3, _4, _5, _6, _7, _8, _9, _10)
    const suffixes = ['', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9', '_10'];
    for (const s of suffixes) {
      const k = env[`VITE_ODDS_API_KEY${s}`];
      if (k && k.trim()) keys.push(k.trim());
    }

    // Load from localStorage
    try {
      const localKeys = localStorage.getItem('ODDS_API_KEYS');
      if (localKeys) {
        localKeys.split(',').map(k => k.trim()).filter(k => k).forEach(k => {
          if (!keys.includes(k)) keys.push(k);
        });
      }
    } catch (_) {}

    this.apiKeys = keys;
    if (keys.length > 0) {
      console.log(`🔑 [ODDS] ${keys.length} API key(s) carregadas — ${keys.length * 500} créditos/mês`);
    }
    return keys;
  }

  private getNextKey(): string | null {
    const keys = this.getApiKeys();
    if (keys.length === 0) return null;
    const key = keys[this.currentKeyIndex % keys.length];
    this.currentKeyIndex++;
    return key;
  }

  // ─── Public API ───────────────────────────────────────────────

  /** Ativa o modo ao vivo (cache de 90s) */
  setLiveMode(live: boolean) {
    if (this._isLive !== live) {
      this._isLive = live;
      if (live) {
        console.log('🔴 [ODDS] Modo AO VIVO — atualizando a cada 90s');
        // Limpa cache para forçar refresh imediato
        this.eventPropsCache.clear();
      } else {
        console.log('⏸️ [ODDS] Modo PRÉ-JOGO — cache econômico');
      }
    }
  }

  get isLive() { return this._isLive; }

  /** Força refresh imediato */
  forceRefresh() {
    this.eventPropsCache.clear();
    this.fetchPromise = null;
    console.log('🔄 [ODDS] Cache limpo');
  }

  // ─── Smart Cache Logic ────────────────────────────────────────

  /**
   * Determina o tempo máximo de cache com base no estado do jogo
   * e proximidade do tip-off
   */
  private getCacheDuration(commenceTime?: string): number {
    if (this._isLive) return CACHE_LIVE;

    if (commenceTime) {
      const msUntilGame = new Date(commenceTime).getTime() - Date.now();
      
      // Menos de 1h para o jogo: cache de 1h (vai buscar de novo)
      if (msUntilGame < 60 * 60 * 1000) return CACHE_PRE_GAME_CLOSE;
      
      // Mais de 1h: cache de 6h (economiza créditos)
      return CACHE_PRE_GAME_EARLY;
    }

    return CACHE_PRE_GAME_EARLY;
  }

  private isCacheValid(eventId: string): boolean {
    const cached = this.eventPropsCache.get(eventId);
    if (!cached) return false;
    const maxAge = this.getCacheDuration(cached.commenceTime);
    return (Date.now() - cached.fetchedAt) < maxAge;
  }

  // ─── API Fetching ─────────────────────────────────────────────

  private async fetchWithRetry(url: string): Promise<Response | null> {
    const key1 = this.getNextKey();
    if (!key1) return null;

    const fullUrl = url + (url.includes('?') ? '&' : '?') + `apiKey=${key1}`;
    
    try {
      const res = await fetch(fullUrl);
      
      if (res.ok) {
        const remaining = res.headers.get('x-requests-remaining');
        if (remaining) {
          console.log(`📊 [ODDS] Key ...${key1.slice(-6)} → ${remaining} créditos restantes`);
        }
        return res;
      }

      // Rate limited? Try another key
      if (res.status === 429 || res.status === 401) {
        const key2 = this.getNextKey();
        if (key2 && key2 !== key1) {
          const retryUrl = url + (url.includes('?') ? '&' : '?') + `apiKey=${key2}`;
          const retry = await fetch(retryUrl);
          if (retry.ok) return retry;
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  private async fetchEvents(): Promise<any[]> {
    const now = Date.now();
    if (this.eventsCache && (now - this.eventsLastUpdate) < CACHE_EVENTS) {
      return this.eventsCache;
    }

    const res = await this.fetchWithRetry(`${ODDS_API_BASE}/events`);
    if (!res) return this.eventsCache || [];

    this.eventsCache = await res.json();
    this.eventsLastUpdate = now;
    return this.eventsCache || [];
  }

  private async fetchPlayerProps(oddsEventId: string): Promise<CachedProps> {
    const url = `${ODDS_API_BASE}/events/${oddsEventId}/odds?regions=us&markets=player_points&oddsFormat=decimal`;
    const res = await this.fetchWithRetry(url);
    if (!res) return {};

    const data = await res.json();
    const props: CachedProps = {};

    const priorityBookmakers = ['draftkings', 'fanduel', 'pinnacle', 'betmgm', 'caesars', 'bovada'];
    const sortedBookmakers = (data.bookmakers || []).sort((a: any, b: any) => {
      const idxA = priorityBookmakers.indexOf(a.key);
      const idxB = priorityBookmakers.indexOf(b.key);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    for (const bookmaker of sortedBookmakers) {
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

  // ─── Core: Fetch All Events (deduplicated) ────────────────────

  /**
   * Loads props for all events that need refreshing.
   * Uses a single promise to avoid duplicate concurrent fetches.
   */
  private async ensurePropsLoaded(): Promise<void> {
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = (async () => {
      try {
        const events = await this.fetchEvents();
        
        for (const event of events) {
          if (this.isCacheValid(event.id)) continue;

          const props = await this.fetchPlayerProps(event.id);
          this.eventPropsCache.set(event.id, {
            props,
            fetchedAt: Date.now(),
            commenceTime: event.commence_time
          });
        }
      } finally {
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  // ─── Game Context (called by LiveView to bind ESPN game to Odds event) ───────

  /**
   * Registers the ESPN gameId ↔ team names so we can find the correct
   * Odds API event when fetching player props.
   * Call this once per game when the LiveView mounts.
   */
  setGameContext(espnGameId: string, homeTeamName: string, awayTeamName: string) {
    if (this.gameIdToOddsEventId.has(espnGameId)) return; // already resolved
    this._pendingGameContexts.set(espnGameId, {
      home: homeTeamName.toLowerCase(),
      away: awayTeamName.toLowerCase()
    });
  }

  private _pendingGameContexts: Map<string, { home: string; away: string }> = new Map();

  private resolveGameContexts() {
    if (!this.eventsCache) return;
    for (const [espnId, ctx] of this._pendingGameContexts.entries()) {
      for (const event of this.eventsCache) {
        const eHome = (event.home_team || '').toLowerCase();
        const eAway = (event.away_team || '').toLowerCase();
        const homeMatch = eHome.includes(ctx.home) || ctx.home.includes(eHome.split(' ').pop() || '');
        const awayMatch = eAway.includes(ctx.away) || ctx.away.includes(eAway.split(' ').pop() || '');
        if (homeMatch && awayMatch) {
          this.gameIdToOddsEventId.set(espnId, event.id);
          this._pendingGameContexts.delete(espnId);
          console.log(`🎯 [ODDS] Jogo mapeado: ESPN ${espnId} → Odds ${event.id} (${event.away_team} @ ${event.home_team})`);
          break;
        }
      }
    }
  }

  // ─── Main Interface ───────────────────────────────────────────

  async getPlayerPointsLine(playerId: string, gameId: string, name?: string): Promise<PlayerPointsLine | null> {
    const pName = name?.toLowerCase() || '';
    const normalizedName = pName.replace(/[^a-z ]/g, '').trim();

    // Check keys
    if (this.getApiKeys().length === 0) {
      if (!this.eventPropsCache.has('__warned')) {
        console.warn(
          '⚠️ [NBA-STATS] Configure suas API keys no .env:\n' +
          '   VITE_ODDS_API_KEY=sua-chave\n' +
          '   VITE_ODDS_API_KEY_2=outra-chave'
        );
        this.eventPropsCache.set('__warned', { props: {}, fetchedAt: Date.now() });
      }
      return null;
    }

    // Load all props (cached/deduplicated)
    await this.ensurePropsLoaded();

    // Resolve any pending game→event mappings now that we have the event list
    this.resolveGameContexts();

    // Find the specific Odds API event for this ESPN game
    const oddsEventId = this.gameIdToOddsEventId.get(gameId);

    // Search only within the correct event; fallback to global search if mapping not yet available
    const match = oddsEventId
      ? this.findPlayerInEvent(normalizedName, oddsEventId)
      : this.findPlayerGlobal(normalizedName);

    if (match) {
      return {
        playerId: playerId.toString(),
        line: match.line,
        overOdds: match.over,
        underOdds: match.under,
        playerName: normalizedName,
        bookmaker: 'The Odds API',
        updatedAt: new Date()
      };
    }

    if (this._isLive) {
      console.log(`🔎 [ODDS] Sem linha para: ${normalizedName} | eventId: ${oddsEventId || 'não mapeado'}`);
    }

    return null;
  }

  /**
   * Search within a specific Odds API event (preferred — 100% correct game)
   */
  private findPlayerInEvent(normalizedName: string, oddsEventId: string): { line: number; over: number; under: number } | null {
    const cached = this.eventPropsCache.get(oddsEventId);
    if (!cached) return null;
    return this.matchInProps(normalizedName, cached.props);
  }

  /**
   * Fallback global search (when game mapping not yet available)
   */
  private findPlayerGlobal(normalizedName: string): { line: number; over: number; under: number } | null {
    for (const [eventId, cached] of this.eventPropsCache.entries()) {
      if (eventId.startsWith('__')) continue;
      const result = this.matchInProps(normalizedName, cached.props);
      if (result) return result;
    }
    return null;
  }

  /**
   * Exact match → first-name initial + last name → last name only
   */
  private matchInProps(normalizedName: string, props: CachedProps): { line: number; over: number; under: number } | null {
    // 1. Exact match
    if (props[normalizedName]?.line > 0) return props[normalizedName];

    const parts = normalizedName.split(' ');
    const lastName = parts[parts.length - 1];
    const firstInitial = parts[0]?.[0] || '';

    // 2. First initial + last name (e.g. "p banchero" matches "paolo banchero")
    for (const [key, val] of Object.entries(props)) {
      if (val.line <= 0) continue;
      const kParts = key.split(' ');
      const kLast = kParts[kParts.length - 1];
      const kFirst = kParts[0]?.[0] || '';
      if (kLast === lastName && kFirst === firstInitial) return val;
    }

    // 3. Last name only (fallback, only if >= 4 chars to avoid false positives)
    if (lastName.length >= 4) {
      for (const [key, val] of Object.entries(props)) {
        if (val.line <= 0) continue;
        const kLast = key.split(' ').pop() || '';
        if (kLast === lastName) return val;
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
