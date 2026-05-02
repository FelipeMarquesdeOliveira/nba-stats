# NBA Stats - Project Status

**Last Updated:** 2026-05-01
**Phase:** Phase 12 - Pregame View Enhancements (COMPLETE ✅)

---

## Phase 7: Live Experience & Product Refinement - COMPLETE ✅

**Commit Hash:** 2e97183
**Pushed:** Yes (origin/main)

### What Was Implemented

#### 1. On-Court Status Confidence System

| Status | UI Symbol | Product Message | Logic |
|--------|-----------|----------------|-------|
| `HIGH_CONFIDENCE` | 🔴 | Alta confiança | Q4/OT starter with 6+ min (or 3+ min crunch time) |
| `ESTIMATED` | 🟡 | Estimado | Any player with minutes > 0 not meeting HIGH |
| `UNKNOWN` | — | Indisponível | No minutes played or game not in progress |

**Key Rule:** Never show "confirmado" - always "estimado" or "alta confiança" since heuristic is inference.

#### 2. LiveView Enhancements

| Feature | Implementation |
|---------|---------------|
| Lead indicator | Shows `+N` for winning team (green margin) |
| Score display | Home/Away scores with team abbreviations |
| Confidence badge | Shows count like "2 🔴 3 🟡" for on-court players |
| Court indicators | 🔴 for HIGH_CONFIDENCE, 🟡 for ESTIMATED |
| Period/clock | Shows "4 • 5:30" format |
| Last play | Shows last play when available |
| Data disclaimer | Note at bottom: "informações baseadas em inferência" |

#### 3. FinalView Enhancements

| Feature | Implementation |
|---------|---------------|
| Win margin | Shows margin for winner (e.g., "+8") |

#### 4. GameListPage Status Badges (Portuguese)

| Status | Badge |
|--------|-------|
| LIVE | ● AO VIVO |
| SCHEDULED | ⏰ AGENDADO |
| FINAL | ✅ FINAL |

#### 5. useLiveGame Hook Updates

- `getOnCourtStatusText()` returns Portuguese labels
- Circuit-aware polling (slower when circuit open)

---

### Test Coverage Added

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `detectOnCourtStatus.test.ts` | 17 | Unit tests for heuristic (all confidence levels, edge cases) |
| `LiveView.test.tsx` | 11 | Component tests (states, scoreboard, badge, disclaimer) |
| **Total new** | **28** | |

**All 83 tests passing across 6 test files.**

---

## Phase 8: Game Detail Deep Dive - COMPLETE ✅

**Commit Hash:** 618d1f2
**Pushed:** Yes (origin/main)

### What Was Implemented

#### 1. GameDetailPage with Real Data

| Feature | Implementation |
|---------|---------------|
| Real data via useGames | Replaced mockGames.find() with gameGateway.getGameById |
| Route state passing | Game object passed via route state for instant navigation |
| Loading state | Shows "Carregando jogo..." spinner |
| Error state | Shows error message with retry |
| Not found state | Shows "Jogo não encontrado" when gameId invalid |
| Back button | "← Voltar" to navigate back |

#### 2. FinalView Quarter-by-Quarter (Conditional)

| Feature | Implementation |
|---------|---------------|
| Interface update | Added `quarterScores` field to BoxScore (optional) |
| UI component | `QuarterByQuarter` component with grid layout |
| Conditional render | Only shows when `quarterScores` data exists |
| CSS styles | Added `.quarter-section`, `.quarter-grid` styles |

#### 3. PregameView Back-to-Back Badge

| Feature | Implementation |
|---------|---------------|
| B2B detection | `isBackToBack()` helper function |
| Badge UI | Yellow "B2B" badge next to team name |
| CSS styles | `.b2b-badge` with background and text styling |
| Recent games prop | Optional `recentGames?: Game[]` for B2B calculation |

#### 4. Test Coverage Added

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `FinalView.test.tsx` | 11 | Component tests (states, scoreboard, game summary, boxscore, quarter) |
| `PregameView.test.tsx` | 8 | Component tests (states, injuries, B2B, lineup unavailability) |
| `GameDetailPage.test.tsx` | 3 | Page tests (loading, not found, back button) |
| **Total new** | **22** | |

**All 105 tests passing across 9 test files.**

---

## Phase 9: Game History - COMPLETE ✅

**Commit Hash:** (pending)
**Pushed:** (pending)

### What Was Implemented

#### 1. Date in URL as Canonical Source

| Feature | Implementation |
|---------|---------------|
| Query param `date` | `/games/:gameId?date=YYYY-MM-DD` is canonical source |
| Date resolution priority | URL query param > route state > today |
| GameListPage navigation | Passes date in query param when navigating to detail |
| GameDetailPage | Resolves date on mount, fetches game from API |

#### 2. GameGatewayImpl Date Support

```typescript
async getGameById(gameId: string, date?: string): Promise<Game | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const games = await this.getGamesForDate(targetDate);
  return games.find(g => g.id === gameId) || null;
}
```

#### 3. GameDetailPage Date Resolution

```
1. URL query param: ?date=YYYY-MM-DD
2. Route state: navigate state passed date
3. Fallback: undefined (uses today via gateway)
```

#### 4. Test Coverage Added

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `GameDetailPage.test.tsx` | 7 | Page tests (loading, not found, back, date resolution, route state) |
| **Total new** | **4** | |

**All 109 tests passing across 9 test files.**

---

### Verification Results

```
✅ typecheck: No errors
✅ lint: No errors (0 warnings)
✅ test: 109 tests passing (105 previous + 4 new)
✅ build: 229.80 kB (success)
```

---

### Files Changed

| File | Change |
|------|--------|
| `domain/types.ts` | `GameGateway.getGameById` accepts optional `date?: string` |
| `data-collection/gateways/GameGatewayImpl.ts` | Uses date to fetch from correct ESPN endpoint |
| `frontend/pages/GameListPage.tsx` | Passes date in URL query param on navigation |
| `frontend/pages/GameDetailPage.tsx` | Resolves date with priority: URL > state > today |
| `frontend/pages/GameDetailPage.test.tsx` | Added date resolution tests (4 new) |

---

### Behavior: Reload and Direct URL Access

| Scenario | Behavior |
|----------|----------|
| Click game in list | Navigate with route state + query param (instant render) |
| Reload GameDetailPage | Fetches from `gameGateway.getGameById(id, date)` → ESPN API |
| Direct URL `/games/:id?date=YYYY-MM-DD` | Fetches from API for that date |
| Direct URL `/games/:id` (no date) | Uses today's date via gateway |
| Past game unavailable | Shows "Este jogo não está disponível para a data selecionada." |

---

### Current Limitation

**UX for historical discovery:** While the app supports viewing past games via direct URL, there's no UI for users to discover/select past dates. They must either:
- Have a link with `?date=` already
- Navigate from the game list (which uses today's games only)

---

### Status
- [x] Implemented
- [x] Tests passing (109 total)
- [x] Build successful
- [ ] Committed (pending user approval)

---

## Phase 10: Historical Game Discovery - COMPLETE ✅

**Commit Hash:** (pending)
**Pushed:** (pending)

### What Was Implemented

#### 1. Date Picker UI in GameListPage

| Feature | Implementation |
|---------|---------------|
| Date input | `type="date"` styled with dark theme |
| Quick navigation | `< Ontem`, `Hoje` (active state), `Amanhã >` buttons |
| URL as canonical source | `/games?date=YYYY-MM-DD` |
| Date resolution | query param > fallback to today |

#### 2. Empty State for No Games

```
┌─────────────────────────────────────┐
│  Nenhum jogo encontrado             │
│  Não há jogos NBA para 15/04/2026.  │
│  Tente selecionar outra data.       │
│  [Voltar para hoje]                 │
└─────────────────────────────────────┘
```

#### 3. Navigation Flow

| Action | URL Result |
|--------|------------|
| Visit `/games` | Today's games |
| Select date | `/games?date=YYYY-MM-DD` |
| Click "Hoje" | `/games` (clears date) |
| Click game | `/games/:id?date=YYYY-MM-DD` |
| Reload | Preserves date in URL |

### Test Coverage Added

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `GameListPage.test.tsx` | 17 | Date picker, quick nav, empty state, URL handling |

**All 126 tests passing across 10 test files.**

---

### Verification Results

```
✅ typecheck: No errors
✅ lint: No errors (0 warnings)
✅ test: 126 tests passing (109 previous + 17 new)
✅ build: 231.70 kB (success)
```

---

### Files Changed

| File | Change |
|------|--------|
| `frontend/pages/GameListPage.tsx` | Date picker UI, useSearchParams, pass date to useGames |
| `frontend/pages/GameListPage.css` | Styles for date-picker-row, quick-nav, empty-state |
| `frontend/pages/GameListPage.test.tsx` | NEW - 17 tests for date handling |

---

### Status
- [x] Implemented
- [x] Tests passing (126 total)
- [x] Build successful
- [ ] Committed (pending user approval)

---

## Phase 11: Live Game Refresh Polish - COMPLETE ✅

**Commit Hash:** (pending)
**Pushed:** (pending)

### What Was Implemented

#### 1. Manual Refresh for Live Games

| Feature | Implementation |
|---------|---------------|
| Button | `⟳ Atualizar` appears only for LIVE games |
| Busy state | Button disabled + icon changes to `⟳` during refresh |
| `isManualRefreshing` | New state in useLiveGame hook |
| `refetch({ manual: true })` | Manual refresh triggers with busy flag |

#### 2. Timestamp Display

| Condition | Label |
|-----------|-------|
| Fresh data | `Atualizado: agora` |
| Fresh data (older) | `Atualizado: há Xs` or `há Xmin` |
| Stale data | `Última atualização bem-sucedida: ...` |

**Rule:** Timestamp only updates on SUCCESS. Failed refresh keeps old timestamp.

#### 3. Polling Behavior

| Type | Interval | Triggered By |
|------|----------|-------------|
| Auto polling | 20s (live), 60s (final) | `fetchBoxscore({ retry: true })` |
| Manual refresh | immediate | `fetchBoxscore({ manual: true })` |

**Note:** Manual refresh does NOT restart the polling interval.

#### 4. Error Handling for Manual Refresh

| Scenario | Behavior |
|----------|----------|
| Success | `lastUpdated` updates, stale=false, button re-enabled |
| Failure with existing data | `isStale=true`, data preserved, timestamp unchanged |
| Failure with no data | Error state shown |

### Test Coverage Added

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `LiveView.test.tsx` | +8 | Refresh button visibility, busy state, timestamp display |

**All 134 tests passing across 10 test files.**

---

### Verification Results

```
✅ typecheck: No errors
✅ lint: No errors (0 warnings)
✅ test: 134 tests passing (126 previous + 8 new)
✅ build: 232.62 kB (success)
```

---

### Files Changed

| File | Change |
|------|--------|
| `useLiveGame.ts` | Added `isManualRefreshing` state, `refetch(options)` |
| `LiveView.tsx` | Refresh header, timestamp, conditional button |
| `LiveView.css` | `.refresh-header`, `.timestamp-info`, `.refresh-button` |
| `LiveView.test.tsx` | +8 tests for refresh manual |

---

### Status
- [x] Implemented
- [x] Tests passing (134 total)
- [x] Build successful
- [ ] Committed (pending user approval)

---

## Phase 12: Pregame View Enhancements - COMPLETE ✅

**Commit Hash:** 0c697b2
**Pushed:** Yes (origin/main)

### What Was Implemented

#### 1. Home/Away Records from ESPN

| Field | Source | Availability |
|-------|--------|--------------|
| `homeTeamRecord.home` | ESPN `competitors[].records` type="home" | Condicional |
| `homeTeamRecord.away` | ESPN `competitors[].records` type="away" | Condicional |
| `awayTeamRecord.home` | ESPN `competitors[].records` type="home" | Condicional |
| `awayTeamRecord.away` | ESPN `competitors[].records` type="away" | Condicional |

**Normalizer:** `extractRecords()` parses ESPN records array and maps to domain format.

#### 2. Home/Away Record Display

```
TeamColumn (home team):
  Casa: 18-5  Fora: 14-10
  [Escalação Provável]

TeamColumn (away team):
  Fora: 12-8  Casa: 16-4
  [Escalação Provável]
```

**Rule:** Records only render when available from ESPN. No fallback invented.

#### 3. B2B Badge Enhancement

| Before | After |
|--------|-------|
| `B2B` (0.65rem, yellow bg) | `🔄 B2B` (0.75rem, orange border, larger padding) |

**Color:** `#f59e0b` (amber) - attention-grabbing but not critical/competing with injuries

---

### Test Coverage

No new tests added - assertion updated from `B2B` to `🔄 B2B`.

**All 134 tests passing across 10 test files.**

---

### Verification Results

```
✅ typecheck: No errors
✅ lint: No errors (0 warnings)
✅ test: 134 tests passing
✅ build: 233.32 kB (success)
```

---

### Files Changed

| File | Change |
|------|--------|
| `domain/types.ts` | Added `homeTeamRecord` and `awayTeamRecord` to Game interface |
| `adapters/ESPN/normalizers.ts` | Added `extractRecords()` function |
| `PregameView.tsx` | Added `record` and `isHome` props to TeamColumn, conditional rendering |
| `PregameView.css` | Enhanced `.b2b-badge` (icon, larger, amber color), added `.team-record` |
| `PregameView.test.tsx` | Updated assertion from 'B2B' to '🔄 B2B' |

---

### Status
- [x] Implemented
- [x] Tests passing (134 total)
- [x] Build successful
- [x] Committed and pushed

---

## Next Phase: Phase 14 - Error Handling & Edge Cases (PROPOSED)

### Known Limitation
Inconsistent or missing error states across components. No centralized error handling strategy for API failures, network timeouts, or malformed data responses.

### Proposed Objectives

1. **Consistent Error States** - All views handle error/loading/empty states uniformly
2. **Network Error Recovery** - Graceful degradation with retry affordances
3. **Edge Case Handling** - Games without broadcaster, zero-score games, missing player data

### Scope

| Item | Priority |
|------|----------|
| Standardize error UI patterns | Must |
| Handle network timeout gracefully | Must |
| Empty game list messaging | Must |
| Incomplete player data fallback | Should |

---

*End of Phase 13*

---

## Phase 13: Mobile Responsiveness - COMPLETE ✅

**Commit Hash:** (pending)
**Pushed:** (pending)

### Meta Viewport

Confirmed present in `index.html:6`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

No changes needed.

---

### What Was Implemented

#### 1. Breakpoints Strategy

| Breakpoint | Width | Description |
|------------|-------|-------------|
| Base | < 640px | Mobile-first, vertical layouts, minimal padding |
| sm | 640px – 767px | Tablet portrait, slightly larger fonts/gaps |
| md | 768px – 1023px | Tablet landscape / small desktop |
| lg | ≥ 1024px | Full desktop layout |

#### 2. index.css — Global Padding

```css
/* < 640px */
#root { padding: 0.75rem; }

/* 640px – 767px */
#root { padding: 1rem; }

/* ≥ 768px */
#root { padding: 2rem; } /* default */
```

#### 3. GameListPage — Mobile Adaptation

| Element | Desktop | < 640px |
|---------|---------|---------|
| h1 font-size | 2.5rem | 1.5rem |
| page-header padding | 2rem | 1rem |
| game-card padding | 1.5rem | 1rem |
| team-name font | 1.1rem | 0.95rem |
| team-score font | 1.5rem | 1.25rem |
| quick-nav button | — | min-height/min-width: 44px |

#### 4. LiveView — Scoreboard + Table

**Scoreboard (< 640px):**
- `flex-direction: column` — vertical stack
- Team name, score, abbreviation in row layout
- Center info (live indicator, clock) moves to top with `order: -1`

**Table Scroll Affordance:**
- `.players-table-container::after` adds right-side gradient shadow
- CSS scrollbar styled for webkit browsers
- Scrollbar width: 4px, thumb color: `rgba(255,255,255,0.2)`

```css
.players-table-container::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 20px;
  background: linear-gradient(to right, transparent, rgba(10, 10, 15, 0.8));
  pointer-events: none;
}
```

#### 5. PregameView — Vertical Stack

| Element | < 640px |
|---------|---------|
| matchup-section | `flex-direction: column` |
| availability-columns | `grid-template-columns: 1fr` (stack) |
| b2b-badge | padding: 0.2rem 0.4rem (reduced, not hidden) |

#### 6. GameDetailPage — Back Button Touch Target

```css
.back-button {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

### Visual Validation Checklist

| Viewport | Check |
|----------|-------|
| 320px | No horizontal overflow, touch targets ≥ 44px, readable text |
| 375px | Comfortable gaps, h1 not clipped, cards full-width |
| 414px | Transition smooth, no abrupt spacing changes |

**Universal checks:**
- [ ] Body has no overflow-x
- [ ] LiveView table shows right-side shadow indicating scroll
- [ ] Back button area is visibly tappable (44×44px)
- [ ] B2B badge maintains amber color and readable padding

---

### Test Coverage

No new tests added — responsiveness verified via manual inspection and CSS audit.

**All 134 tests passing across 10 test files.**

---

### Verification Results

```
✅ typecheck: No errors
✅ lint: No errors (0 warnings)
✅ test: 134 tests passing
✅ build: 233.32 kB (success)
```

---

### Files Changed

| File | Change |
|------|--------|
| `index.css` | Global mobile padding via media queries |
| `GameListPage.css` | Mobile-first layout adjustments, touch targets |
| `LiveView.css` | Scoreboard vertical stack, table scroll affordance |
| `PregameView.css` | Vertical stacking for matchup and availability |
| `GameDetailPage.css` | Back button touch target (44×44px) |
| `GameListPage.test.tsx` | Fixed date-dependent test (dynamic `new Date()`) |

---

### Status
- [x] Implemented
- [x] Tests passing (134 total)
- [x] Build successful
- [x] Committed and pushed

---

*End of Phase 13*

---

## Previous Phases

**Commit Hash:** a391cac
**Pushed:** Yes (origin/main)

### What Was Implemented

#### 1. New Infrastructure

| File | Purpose |
|------|---------|
| `infrastructure/logger.ts` | Structured logging with timestamp/level/source |
| `infrastructure/CircuitBreaker.ts` | Circuit breaker by source (CLOSED/OPEN/HALF_OPEN) |
| `infrastructure/Cache.ts` | In-memory cache with TTL/Stale/MaxAge |
| `infrastructure/HttpClient.ts` | HTTP client with timeout, retry, backoff, jitter |
| `infrastructure/index.ts` | Exports all infrastructure modules |
| `infrastructure/validation.test.ts` | 23 functional validation tests |
| `frontend/infrastructure/ErrorBoundary.tsx` | React Error Boundary component |

#### 2. Hooks Updated

All hooks now have:
- `isStale: boolean` - indicates stale data being displayed
- `lastUpdated: Date | null` - timestamp of last successful fetch
- `circuitOpen: boolean` (for LiveGame/Injuries) - indicates circuit breaker open
- `refetch: () => void` - manual refresh function

| Hook | New Features |
|------|--------------|
| `useGames()` | Polling (25s live/60s scheduled), stale detection |
| `useLiveGame()` | Polling (20s live/60s final), circuit-aware, stale detection |
| `useInjuries()` | Polling (10min normal/15min circuit open), circuit-aware, stale detection |

#### 3. Views Updated

All views now show:
- **Stale indicator**: ⚠️ "Dados podem estar desatualizados" with refresh button
- **Circuit open state**: 🔌 "Serviço temporariamente indisponível" with retry button

---

### Circuit Breaker Configuration

| Source | Failure Threshold | Reset Timer | Half-Open Success |
|--------|------------------|-------------|-------------------|
| ESPN | 5 failures in 60s | 30s | 1 success |
| stats.nba.com | 5 failures in 60s | 45s | **2 successes** (more conservative) |

---

### Cache Configuration

| Data | TTL | Stale After | Max Age | Fallback? |
|------|-----|-------------|---------|-----------|
| Games | 30s | 60s | 5min | ✅ stale |
| Boxscore Live | 10s | 20s | 1min | ✅ stale |
| Boxscore Final | 5min | 15min | 30min | ❌ |
| Injuries | 5min | 15min | 30min | ✅ stale |

---

### Polling Frequencies

| Data | Status | Normal | Circuit Open |
|------|--------|--------|-------------|
| Scoreboard | SCHEDULED | 60s | 60s |
| Scoreboard | LIVE | 25s | 60s |
| Scoreboard | FINAL | 120s | 120s |
| Boxscore | LIVE | 20s | 45s |
| Boxscore | FINAL | 60s | 120s |
| Injuries | any | 600s (10min) | 900s (15min) |

---

### Retry Configuration

| Source | Max Attempts | Base Delay | Max Delay | Jitter |
|--------|---------------|------------|-----------|--------|
| ESPN | 3 | 1000ms | 8000ms | ±500ms |
| stats.nba.com | 3 | 1500ms | 8000ms | ±500ms |

**429 Handling**: Always respects `Retry-After` header when present.

---

### Error Handling

| Error Type | Retryable? | Source |
|------------|------------|--------|
| `ECONNABORTED` (timeout) | ✅ Yes | Both |
| `ETIMEDOUT` | ✅ Yes | Both |
| HTTP 408 | ✅ Yes | Both |
| HTTP 429 | ✅ Yes | Both |
| HTTP 500-504 | ✅ Yes | Both |
| HTTP 401/403 | ❌ No | Both |
| HTTP 404 | ❌ No | Both |

---

### Functional Validation (23 tests)

All scenarios tested and passing:

**SCENARIO 1: Cache Stale Behavior**
- ✅ Returns stale cache when within MaxAge and API fails
- ✅ Discards cache when past MaxAge
- ✅ Cache keys follow expected pattern
- ✅ Cache pattern matching uses substring match

**SCENARIO 2: No Cache (Error) Behavior**
- ✅ Error thrown when cache miss and API fails
- ✅ Circuit breaker blocks requests when OPEN

**SCENARIO 3: Circuit Breaker Transitions**
- ✅ CLOSED → OPEN after 5 failures
- ✅ OPEN → HALF_OPEN after resetTimeout (45s for stats.nba.com)
- ✅ HALF_OPEN → CLOSED after 2 consecutive successes (stats.nba.com)
- ✅ HALF_OPEN → OPEN on failure in HALF_OPEN
- ✅ ESPN circuit requires only 1 success to close (vs stats.nba.com 2)
- ✅ Success in CLOSED resets failure count

**SCENARIO 4: Retry / Timeout Behavior**
- ✅ Retryable errors trigger retry with exponential backoff
- ✅ Non-retryable errors do not trigger retry
- ✅ Calculates exponential backoff with jitter
- ✅ Respects Retry-After header over backoff for 429
- ✅ Records failure in circuit breaker on all retries exhausted
- ✅ HTTP status codes correctly classified retryable vs non-retryable

**SCENARIO 5: UX Indicators by View**
- ✅ LiveView shows both stale and circuit-open indicators
- ✅ FinalView shows both stale and circuit-open indicators
- ✅ PregameView shows circuit-open but only stale for injuries
- ✅ GameListPage shows stale but not circuit-open

---

### Verification Results

```
✅ typecheck: No errors
✅ lint: No errors
✅ test: 83 tests passing (55 original + 28 new)
✅ build: 238.08 kB (success)
✅ commit: 2e97183 pushed to origin/main
```

---

### Status
- [x] Implemented
- [x] Tests passing (83 total)
- [x] Build successful
- [x] Committed and pushed

---

## Previous Phases

- Phase 6: Reliability, Cache & Polish - COMPLETE ✅
- Phase 5: Real Data Integration - COMPLETE ✅
- Phase 4: Real Data Sources Validation - COMPLETE ✅
- Phase 3: Architecture & Mock Evolution - COMPLETE ✅
- Phase 2: Game-Centered UI - COMPLETE ✅
- Phase 1: Project Setup - COMPLETE ✅

---

## Next Phase: Phase 10 - Historical Game Discovery (PROPOSED)

### Known Limitation
Users cannot browse or select past game dates - no date picker or calendar UI exists.

### Proposed Objectives

1. **Date Picker UI** - Add date selection to GameListPage for browsing past games
2. **Historical Game List** - Fetch and display games for selected date
3. **Deep Link Validation** - Ensure all date scenarios handled gracefully

### Scope

| Item | Priority |
|------|----------|
| Date picker component | Must |
| GameListPage date filter | Must |
| Past date game fetching | Must |
| Empty state for no games | Should |
| Preserve "today" as default | Must |

---

*End of Phase 9*