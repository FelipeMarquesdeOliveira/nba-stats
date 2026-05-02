# Phase 5 Implementation Plan

## Overview

Phase 5 goal: First real data integration from validated sources (ESPN + stats.nba.com), without odds/player props.

---

## Source Priority Order

### Adapter Implementation Order

```
1. ESPN Scoreboard Adapter    (simplest, most reliable)
2. ESPN Injuries Adapter      (slightly more complex nested structure)
3. stats.nba.com Boxscore Adapter  (requires headers, more data)
4. Gateway Updates             (wire adapters to interfaces)
5. Frontend Integration        (connect to views)
```

---

## Data Normalization Contracts

### 1. Scoreboard Normalization

**Source:** ESPN scoreboard endpoint
**Source format:** ESPN JSON
**Target domain type:** `Game[]`

```typescript
// ESPN -> Domain normalization
interface ScoreboardNormalizer {
  mapEventToGame(event: ESPNEvent): Game;

  // Key mappings:
  // event.id -> game.id
  // event.name -> game.homeTeam.name + " @ " + game.awayTeam.name
  // event.competitions[0].competitors[0].score -> game.homeTeam.score
  // event.competitions[0].competitors[1].score -> game.awayTeam.score
  // event.competitions[0].status.period -> game.period
  // event.competitions[0].status.clock -> game.clock
  // event.competitions[0].status.state -> game.status (scheduled/live/final)
  // event.competitions[0].broadcasts -> game.broadcaster
}
```

---

### 2. Injuries Normalization

**Source:** ESPN injuries endpoint
**Source format:** Nested by team
**Target domain type:** `AvailabilityItem[]`

```typescript
// ESPN -> Domain normalization
interface InjuriesNormalizer {
  flattenInjuries(espnResponse: ESPNInjuriesResponse): AvailabilityItem[];

  // ESPN structure:
  // { injuries: [{ displayName: "Team Name", injuries: [...] }] }
  //
  // Target structure:
  // AvailabilityItem {
  //   player: Player,
  //   status: 'Out' | 'Doubtful' | 'Questionable' | 'Probable',
  //   reason: string,        // details.type + details.location
  //   returnDate: string,    // details.returnDate
  // }

  // Status mapping:
  // "INJURY_STATUS_OUT" -> "Out"
  // "INJURY_STATUS_DOUBTFUL" -> "Doubtful"
  // "INJURY_STATUS_QUESTIONABLE" -> "Questionable"
  // "INJURY_STATUS_PROBABLE" -> "Probable"
}
```

---

### 3. Boxscore Normalization

**Source:** stats.nba.com BoxScoreTraditionalV2
**Source format:** ResultSets with rowSet arrays
**Target domain types:** `BoxScorePlayer[]`, `BoxScore`

```typescript
// stats.nba.com -> Domain normalization
interface BoxscoreNormalizer {
  mapResultSetsToBoxScore(data: NBAStatsBoxscoreResponse): BoxScore;

  // Key columns from PlayerStats result set:
  // PLAYER_ID, PLAYER_NAME, TEAM_ABBREVIATION, START_POSITION,
  // MIN, PTS, REB, AST, STL, BLK, TO, FGM, FGA, FG_PCT,
  // FG3M, FG3A, FG3_PCT, FTM, FTA, FT_PCT, PLUS_MINUS

  // BOXSCORE_PLAYER:
  // {
  //   player: { id, name },
  //   points, rebounds, assists, steals, blocks, turnovers,
  //   minutesPlayed: formatMinutes(MIN),
  //   fieldGoalsMade: FGM, fieldGoalsAttempted: FGA,
  //   threePointersMade: FG3M, threePointersAttempted: FG3A,
  //   freeThrowsMade: FTM, freeThrowsAttempted: FTA,
  //   plusMinus: PLUS_MINUS,
  //   isStarter: START_POSITION !== '',
  //   isOnCourt: estimatedFrom(MIN),  // <-- HEURISTIC
  //   pointsRemaining: null,  // no line data in boxscore
  //   pointsLine: null,
  //   overOdds: null,
  //   fieldGoalPct: FG_PCT,
  //   threePointPct: FG3_PCT,
  //   freeThrowPct: FT_PCT,
  //   efficiency: calculated
  // }
}
```

---

## On-Court Status: Confirmed/Estimated/Unknown

### Problem Statement
There's no explicit "isOnCourt" field in stats.nba.com boxscore. We need to detect who's currently playing.

### Proposed Solution

```typescript
// src/domain/types.ts - New enum
enum OnCourtStatus {
  CONFIRMED = 'confirmed',   // From official live data (future)
  ESTIMATED = 'estimated',   // From heuristic (MIN > 0 during active game)
  UNKNOWN = 'unknown'         // Before game or insufficient data
}

// Add to LivePlayerStats interface
interface LivePlayerStats {
  // ... existing fields
  onCourtStatus: OnCourtStatus;  // NEW FIELD
}
```

### Heuristic Logic

```typescript
function detectOnCourt(
  player: BoxScorePlayer,
  gameStatus: GameStatus,
  minutesPlayed: string
): OnCourtStatus {
  // Before game starts - unknown
  if (gameStatus === 'scheduled') {
    return OnCourtStatus.UNKNOWN;
  }

  // After game ends - confirmed not on court
  if (gameStatus === 'final') {
    return OnCourtStatus.UNKNOWN;
  }

  // During live game
  if (minutesPlayed && minutesPlayed !== '00:00') {
    // Has played > 0 minutes - likely on court or played recently
    return OnCourtStatus.ESTIMATED;
  }

  // Started but 0 minutes - might be DNP
  return OnCourtStatus.UNKNOWN;
}
```

### UI Display

In `LiveView.tsx`, show status badge:

```tsx
// Player is on court - show indicator
{player.isOnCourt && (
  <span className={`court-status ${player.onCourtStatus}`}>
    {player.onCourtStatus === 'estimated' ? '~' : '●'}
  </span>
)}
```

CSS:
```css
.court-status.estimated { color: #f59e0b; }  /* Yellow for estimated */
.court-status.confirmed { color: #10b981; }  /* Green for confirmed */
.court-status.unknown { color: #6b7280; }    /* Gray for unknown */
```

---

## Adapter File Structure

```
src/data-collection/
├── adapters/
│   ├── ESPN/
│   │   ├── scoreboard.ts        # Scoreboard adapter
│   │   ├── injuries.ts          # Injuries adapter
│   │   ├── types.ts             # ESPN-specific types
│   │   └── normalizers.ts       # ESPN -> Domain normalizers
│   └── NBAStats/
│       ├── boxscore.ts          # Boxscore adapter
│       ├── types.ts             # NBA Stats-specific types
│       └── normalizers.ts       # NBA Stats -> Domain normalizers
├── gateways/
│   ├── GameGatewayImpl.ts       # Uses ESPN scoreboard
│   ├── InjuryGatewayImpl.ts     # Uses ESPN injuries
│   └── BoxScoreGatewayImpl.ts   # Uses stats.nba.com
└── index.ts                     # Export all adapters
```

---

## Implementation Steps

### Step 1: ESPN Scoreboard Adapter

1. Create `src/data-collection/adapters/ESPN/types.ts`
   - Define ESPN response types

2. Create `src/data-collection/adapters/ESPN/scoreboard.ts`
   - Fetch from `site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`
   - No auth required

3. Create `src/data-collection/adapters/ESPN/normalizers.ts`
   - `normalizeEventToGame(event): Game`

4. Test with simple script

### Step 2: ESPN Injuries Adapter

1. Create `src/data-collection/adapters/ESPN/injuries.ts`
   - Fetch from `site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries`
   - Handle nested structure (team -> injuries[])

2. Update normalizers
   - `flattenInjuries(response): AvailabilityItem[]`
   - Map status strings to our enum

### Step 3: stats.nba.com Boxscore Adapter

1. Create `src/data-collection/adapters/NBAStats/types.ts`
   - Define ResultSet types

2. Create `src/data-collection/adapters/NBAStats/boxscore.ts`
   - Fetch with headers
   - Parse ResultSets

3. Create `src/data-collection/adapters/NBAStats/normalizers.ts`
   - `mapResultSetsToBoxScore(data): BoxScore`
   - Calculate efficiency
   - Apply on-court heuristic

### Step 4: Gateway Implementations

1. Create `src/data-collection/gateways/GameGatewayImpl.ts`
   - Implements `GameGateway` interface
   - Uses ESPN scoreboard adapter

2. Create `src/data-collection/gateways/InjuryGatewayImpl.ts`
   - Implements `InjuryGateway` interface
   - Uses ESPN injuries adapter

3. Create `src/data-collection/gateways/BoxScoreGatewayImpl.ts`
   - Implements `BoxScoreGateway` interface
   - Uses NBAStats boxscore adapter

### Step 5: Frontend Integration

1. Create hooks:
   - `useGame(gameId)` - fetches from GameGateway
   - `useLiveGame(gameId)` - polls GameGateway + BoxScoreGateway
   - `useInjuries()` - fetches from InjuryGateway

2. Update views:
   - `LiveView.tsx` - use real data via hooks
   - `PregameView.tsx` - use real data + injuries
   - `FinalView.tsx` - use real boxscore data

3. Add loading/error states

### Step 6: Testing & Validation

1. Run unit tests for adapters
2. Run integration test (real endpoints)
3. Start dev server and verify in browser

---

## Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| ESPN endpoint changes format | Medium | Add error handling; log unexpected structure |
| stats.nba.com headers blocked | High | Implement retry with exponential backoff; fallback to ESPN |
| Boxscore endpoint issues (GitHub reported) | Medium | Test with multiple game IDs; handle partial data |
| Heuristic on-court wrong | Medium | Display as "estimated" in UI; never claim 100% confirmed |
| Rate limiting | Low | Conservative polling (30s for scoreboard, 60s for boxscore) |

---

## Configuration

```typescript
// src/data-collection/config.ts
export const DATA_COLLECTION_CONFIG = {
  // ESPN (no auth required)
  espn: {
    baseUrl: 'https://site.api.espn.com/apis/site/v2',
    scoreboardEndpoint: '/sports/basketball/nba/scoreboard',
    injuriesEndpoint: '/sports/basketball/nba/injuries',
    rateLimitMs: 2000,  // 30 req/min
  },

  // stats.nba.com (headers required)
  statsNbaCom: {
    baseUrl: 'https://stats.nba.com/stats',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://stats.nba.com/',
      'Origin': 'https://stats.nba.com',
      'Accept': 'application/json, text/plain, */*',
    },
    rateLimitMs: 2000,  // Conservative
  },

  // Polling intervals
  polling: {
    scoreboardMs: 30000,   // 30 seconds
    boxscoreMs: 60000,     // 60 seconds
    injuriesMs: 120000,    // 2 minutes
  }
};
```

---

## Progress Tracking

- [ ] Step 1: ESPN Scoreboard Adapter
- [ ] Step 2: ESPN Injuries Adapter
- [ ] Step 3: stats.nba.com Boxscore Adapter
- [ ] Step 4: Gateway Implementations
- [ ] Step 5: Frontend Integration
- [ ] Step 6: Testing & Validation
- [ ] Update docs/PROJECT_STATUS.md

---

## Questions for User Approval

Before implementing, confirm:

1. **Adapter file structure** - Is the proposed structure acceptable?
2. **On-court heuristic** - Is "estimated" badge approach acceptable?
3. **Polling intervals** - 30s scoreboard, 60s boxscore, 2min injuries?
4. **Error handling** - Should we show mock data as fallback or empty state?