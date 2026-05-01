# NBA Stats - Project Status

**Last Updated:** 2026-05-01
**Phase:** Phase 8 - Game Detail Deep Dive (COMPLETE ✅)

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

### Verification Results

```
✅ typecheck: No errors
✅ lint: No errors
✅ test: 105 tests passing (83 previous + 22 new)
✅ build: 228.68 kB (success)
```

---

### Files Changed

| File | Change |
|------|--------|
| `domain/types.ts` | PeriodType enum added |
| `adapters/NBAStats/normalizers.ts` | Enhanced `detectOnCourtStatus` with period-based confidence |
| `adapters/NBAStats/boxscore.ts` | Pass period to heuristic |
| `frontend/hooks/useLiveGame.ts` | Portuguese labels, circuit-aware polling |
| `frontend/components/live/LiveView.tsx` | Lead indicator, confidence badge, court indicators, disclaimer |
| `frontend/components/live/LiveView.css` | Styles for lead indicator, court indicators, disclaimer |
| `frontend/components/final/FinalView.tsx` | Win margin display |
| `frontend/pages/GameListPage.tsx` | Portuguese status badges |
| `infrastructure/detectOnCourtStatus.test.ts` | NEW - 17 unit tests |
| `frontend/components/live/LiveView.test.tsx` | NEW - 11 component tests |

---

### Status
- [x] Implemented
- [x] Tests passing (83 total)
- [x] Build successful
- [ ] Committed (pending user approval)

---

## Phase 6: Reliability, Cache & Polish - COMPLETE ✅

**Commit Hash:** e120a68
**Pushed:** Yes (origin/main)

---

## Phase 6: Reliability, Cache & Polish - COMPLETE ✅

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

## Next Phase: Phase 9 - Game History & Deep Dive (PROPOSED)

### Known Limitation
GameDetailPage currently only works for today's games (ESPN API date-based). Historical games cannot be viewed.

### Proposed Objectives

1. **Game History** - Allow viewing past games by date
2. **Enhanced Game Detail** - Play-by-play if available, deeper stats
3. **Performance** - Route-based code splitting (defer non-critical routes)
4. **Polish** - UI refinements based on user feedback

### Scope (TBD based on Phase 8 review)

---

*End of Phase 8*