# NBA Stats - Project Status

**Last Updated:** 2026-05-01
**Phase:** Phase 3 - Architecture & Mock Evolution

---

## What Was Implemented

### Phase 3 Summary
This phase focused on evolving the data contracts, centralizing mocks, and improving UI views with realistic data structures.

### New Domain Types Created
| Type | Description |
|------|-------------|
| `SeasonContext` | Season context (season year, game number) |
| `TeamSeasonRecord` | Win/loss record, conference rank, home/away records |
| `AvailabilityItem` | Player + injury status + reason + return date |
| `LivePlayerStats` | Full player state with stats, line, odds, points remaining |
| `LiveGameData` | Complete live game with both teams and players |
| `BoxScorePlayer` | Player stats with computed percentages (FG%, 3P%, FT%, EFF) |
| `GameHighlights` | Detected highlights (top-scorer, double-double, triple-double) |
| `BoxScore` | Full boxscore with team stats, player stats, highlights |

### Domain Types Adjusted
| Type | Change |
|------|--------|
| `Player` | Added `imageUrl` field |
| `PlayerGameStats` | Added `steals`, `blocks`, `turnovers` |
| `Game` | Already had `broadcaster` |

### New Utility Functions
| Function | Description |
|----------|-------------|
| `calculatePercentage(made, attempted)` | Calculates FG/3P/FT percentages |
| `calculateEfficiency(stats)` | Calculates efficiency rating |
| `detectHighlights(playerStats[])` | Detects double-double, triple-double, top-scorer |

### Gateway Interfaces Created (Source-Agnostic)
```typescript
interface GameGateway
interface LiveGameGateway
interface InjuryGateway
interface OddsGateway
interface BoxScoreGateway
interface PregameGateway
```

---

## Mock Files Centralized

```
src/frontend/mocks/
├── index.ts           # Main export
├── teams.ts           # mockTeams + getTeamById()
├── players.ts         # mockPlayers + getPlayerById() + getPlayersByTeam()
├── games.ts           # mockGames + getGameById() + getGamesByStatus()
├── live-game-data.ts  # mockLiveGamesData + getLiveGameData()
├── pregame-data.ts    # mockPregameData + getPregameData()
└── boxscore-data.ts  # mockBoxScores + getBoxScore()
```

### Mock Data Content
| Mock | Content |
|------|---------|
| `mockTeams` | 6 teams: Lakers, Celtics, Warriors, Heat, Knicks, Mavericks |
| `mockPlayers` | 29 players with full stats, real NBA players |
| `mockGames` | 3 games: live (game-001), scheduled (game-002), final (game-003) |
| `mockLiveGamesData` | Live data for game-001 with full player stats |
| `mockPregameData` | Pregame data for game-001 and game-002 |
| `mockBoxScores` | Boxscore for game-003 with detected highlights |

---

## Views Improved

### LiveView Enhancements
- Uses `LivePlayerStats` from domain (full stats)
- Shows: PTS, LINE, REM, FG%, 3P%, REB, AST, MIN
- Shows over/under odds next to line
- Badge "S" for starters
- Players sorted: on-court first, then by points
- Live indicator with last play

### PregameView Enhancements
- Shows season records: win/loss, conference rank, home/away records, L10
- Separated availability by status: OUT, DOUBTFUL, QUESTIONABLE, PROBABLE
- Color-coded availability groups
- Uses domain types directly (`PregameData`, `TeamSeasonRecord`)

### FinalView Enhancements
- Full boxscore table with FG%, 3P%, FT%
- Game summary with team stats side-by-side
- Highlights detection (top-scorer, double-double, triple-double)
- Color-coded highlight badges

---

## Tests Status

| Test File | Tests | Status |
|-----------|-------|--------|
| `mockData.test.ts` | 8 tests | ✅ Pass |
| `types.test.ts` (domain utilities) | 14 tests | ✅ Pass |
| `LineIndicator.test.tsx` | 10 tests | ✅ Pass |

**Total: 32 tests passing**

---

## Pending Items

### Not Yet Implemented
- [ ] Real data providers (future integration)
- [ ] Hooks for data fetching (`useGames`, `useLiveGame`, etc.)
- [ ] Real-time updates (WebSocket/polling setup)
- [ ] Error boundaries
- [ ] Loading states
- [ ] Cache implementation

### Architecture Decisions Made
- Gateways are interface-only (no implementation)
- Mocks are centralized in `src/frontend/mocks/`
- Components use domain types directly
- Alias `@frontend/mocks` maps to `src/frontend/mocks/`

---

## Next Steps (Phase 4)

1. **Implement data fetching hooks** (useGame, useLiveGame, etc.)
2. **Create placeholder implementations** for gateways (returning mocks)
3. **Add loading/error states** to views
4. **Add real-time polling setup** (architecture only, no real sources)
5. **Write more tests** for domain utilities

---

## File Structure

```
src/
├── domain/
│   └── types.ts              # All domain types + utilities
├── frontend/
│   ├── mocks/                # Centralized mock data
│   ├── components/
│   │   ├── common/
│   │   │   └── LineIndicator.tsx
│   │   ├── game-list/
│   │   ├── game-detail/
│   │   ├── pregame/
│   │   ├── live/
│   │   └── final/
│   ├── pages/
│   ├── routes.tsx
│   └── main.tsx
└── data-collection/
    └── providers/            # Placeholder (not implemented yet)
```

---

## Decisions Made This Phase

1. **Gateways are source-agnostic** - No coupling to real APIs
2. **Mocks use domain types** - No more inline/anonymous types
3. **PregameData is structured** - Teams have starters + availability + season record
4. **Highlights are auto-detected** - Double-double, triple-double, top-scorer

---

## Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript with path aliases (`@domain`, `@frontend`, etc.) |
| `vite.config.ts` | Vite with React + path aliases |
| `vitest.config.ts` | Vitest with jsdom environment |
| `.eslintrc.cjs` | ESLint + TypeScript rules |
| `.prettierrc` | Prettier formatting |