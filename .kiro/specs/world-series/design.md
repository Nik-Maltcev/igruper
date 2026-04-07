# Design Document: World Series

## Overview

World Series — субботний гоночный день (dayNum=9, raceType='WORLD'), состоящий из трёх гонок с уникальными механиками:

1. **Платная гонка (Race 1)** — вход 1000, награды по таблице `worldSaturday`. Игрок решает, участвовать ли.
2. **Bonus Track (Race 2)** — стандартная регистрация, награды по `worldBonus` + призы (запчасти/скидки) через `prizeService`.
3. **Главная гонка (Race 3)** — регистрация по 7 категориям мощности (`POWER_CATEGORIES`), каждая категория — отдельный заезд, награды по `worldMain`.

Текущая система уже поддерживает базовую маршрутизацию World Series в `advanceDay()` (определение `worldRaceIndex` и выбор таблицы наград). Данный дизайн расширяет RaceCenter для специфичных UI-потоков регистрации, advanceDay для per-category симуляции Main Race, и RaceResults для отображения призов и категорий.

## Architecture

```mermaid
flowchart TD
    subgraph Registration["RaceCenter.tsx"]
        RC_Paid["Paid Race UI\n(confirmation dialog + fee)"]
        RC_Bonus["Bonus Track UI\n(standard car picker)"]
        RC_Main["Main Race UI\n(category selector → car picker)"]
    end

    subgraph Simulation["Multiplayer.tsx advanceDay()"]
        SIM_Paid["Simulate Paid Race\n(worldSaturday rewards)"]
        SIM_Bonus["Simulate Bonus Track\n(worldBonus rewards + prizes)"]
        SIM_Main["Simulate Main Race\n(per-category, worldMain rewards)"]
        ACCUM["moneyAccum / pointsAccum / prizesAccum\n(sum across all races)"]
    end

    subgraph Results["RaceResults.tsx"]
        RES_Paid["Paid Race results"]
        RES_Bonus["Bonus Track results\n+ prize display"]
        RES_Main["Main Race results\n(7 category tabs/sections)"]
    end

    RC_Paid -->|race_entries: race_id from races_data| SIM_Paid
    RC_Bonus -->|race_entries: race_id from races_data| SIM_Bonus
    RC_Main -->|race_entries: race_id = main-cat-{0..6}| SIM_Main

    SIM_Paid --> ACCUM
    SIM_Bonus --> ACCUM
    SIM_Main --> ACCUM

    ACCUM -->|saveRaceDayResults| RES_Paid
    ACCUM -->|saveRaceDayResults + prizes| RES_Bonus
    ACCUM -->|saveRaceDayResults per category| RES_Main
```

### Design Decisions

1. **Category Race IDs**: Main Race entries use `"main-cat-{index}"` as `race_id` (0-6), not the race name from `races_data.json`. This allows multiple entries per player (one per category) and clean grouping in `advanceDay`.

2. **Entry fee at registration time**: The 1000 fee is deducted when the player confirms, not at simulation. This means the money is already gone before the race runs. Refund happens only on explicit cancel.

3. **Prizes stored in results**: Bonus Track prizes are serialized into the `RaceDayResult` so they persist for the results screen. The `results` array entries get an optional `prizes` field.

4. **Main Race track weights**: All 7 category races use the same track weights from the 3rd race definition in `races_data.json` round 3. The categories only split participants — the track is the same.

## Components and Interfaces

### RaceCenter.tsx Changes

#### New State
```typescript
// Paid Race confirmation dialog
const [showPaidConfirm, setShowPaidConfirm] = useState(false);
const [paidRaceId, setPaidRaceId] = useState<string | null>(null);

// Main Race category selection
const [mainRaceCategory, setMainRaceCategory] = useState<number | null>(null); // index 0-6
const [pickingMainRaceId, setPickingMainRaceId] = useState<string | null>(null);

// Player money (passed as prop or fetched)
// Already available via parent component
```

#### New Props
```typescript
interface RaceCenterProps {
  // ... existing props ...
  playerMoney?: number;                    // for entry fee validation
  onMoneyChange?: (delta: number) => void; // callback to update money after fee/refund
}
```

#### Paid Race Flow
1. Player clicks "ЗАПИСАТЬСЯ" on Race 1 → `setShowPaidConfirm(true)`
2. Dialog shows: "Готовы заплатить 1000 за участие?"
3. If money < 1000 → show "Недостаточно средств", disable confirm
4. Confirm → deduct 1000 via `onMoneyChange(-1000)` → open car picker
5. Cancel dialog → close, no registration
6. Cancel existing entry → refund 1000 via `onMoneyChange(+1000)` → delete race_entry

#### Main Race Flow
1. Player clicks "ЗАПИСАТЬСЯ" on Race 3 → show 7 category buttons
2. Each button shows category label (e.g. "0-120 лс") and count of player's registered cars
3. Click category → filter player's cars by effective power within `[min, max]` AND track requirement
4. Select car → `submitRaceEntry(roomId, playerId, "main-cat-{index}", carId, day)`
5. Already registered in category → show car name + cancel button
6. No matching cars → "Нет подходящих машин в этой категории"

#### World Series Detection
```typescript
const isWorldSeries = cycleDay === 9; // dayNum=9 is WORLD
```

When `isWorldSeries`, the 3 races from `races_data` round 3 are rendered with special `EntryButton` variants:
- Race index 0 → `PaidRaceEntryButton` (with confirmation dialog)
- Race index 1 → standard `EntryButton` (Bonus Track, no changes)
- Race index 2 → `MainRaceEntryButton` (with category selector)

### RaceResults.tsx Changes

#### Prize Display for Bonus Track
Each result entry in the WINNERS view gets an optional prize section:
```typescript
interface RaceResult {
  // ... existing fields ...
  prizes?: Array<{ name: string; icon: string; type?: 'discount' }>;
}
```

When `currentRace.results[i].prizes` exists and has items, render them below the earnings line.

#### Main Race Category Display
When the results contain `race_id` matching `"main-cat-{N}"`, the Results screen:
1. Groups results by category index
2. Shows each category as a labeled section: "0-120 лс", "121-200 лс", etc.
3. Empty categories show "Нет участников в этой категории мощности"
4. Each category section has its own position/earnings/points display
5. Navigation: all categories shown sequentially within one "race" view (no separate GRID→ANIMATION per category — that would be too slow). Instead: single combined view with category headers.

### Multiplayer.tsx advanceDay() Changes

#### Main Race Per-Category Simulation
When processing World Series and encountering entries with `race_id` starting with `"main-cat-"`:
1. Group entries by `race_id` (each `main-cat-{N}` is a separate group)
2. For each non-empty group: simulate using `simulateRace()` with worldMain track weights and `worldMain` reward table
3. For empty groups: save a result entry with `results: []` and a marker message
4. Accumulate money/points from all category races into `moneyAccum`/`pointsAccum`

#### Sorting World Series Races
The existing `sortedRaceEntries` logic sorts by `raceOrder` from `races_data`. For Main Race categories, the `"main-cat-{N}"` IDs won't match race names. Solution: sort category entries after the named races, ordered by category index.

```typescript
// After standard race sorting, append category entries sorted by index
const categoryEntries = Object.entries(byRace)
  .filter(([id]) => id.startsWith('main-cat-'))
  .sort(([a], [b]) => {
    const ai = parseInt(a.split('-')[2]);
    const bi = parseInt(b.split('-')[2]);
    return ai - bi;
  });
```

#### Prize Persistence in Results
When saving Bonus Track results, include prize data in the results array:
```typescript
const resultsWithPrizes = resultsWithPlayers.map(r => {
  const pid = playerMap[r.carId];
  const playerPrizes = prizesAccum[pid] || [];
  return { ...r, prizes: playerPrizes.map(p => ({ name: p.name, icon: p.icon, type: 'type' in p ? p.type : undefined })) };
});
```

## Data Models

### race_entries Table (Existing)

| Column    | Type   | Description |
|-----------|--------|-------------|
| room_id   | string | Room identifier |
| player_id | string | Player identifier |
| race_id   | string | Race identifier — for Main Race categories: `"main-cat-0"` through `"main-cat-6"` |
| car_id    | string | Car identifier |
| day       | number | Game day number |

Key behavior:
- Paid Race: one entry per player, `race_id` = race name from `races_data`
- Bonus Track: one entry per player, `race_id` = race name from `races_data`
- Main Race: up to 7 entries per player (one per category), `race_id` = `"main-cat-{0-6}"`

### RaceDayResult (Existing, Extended)

```typescript
interface RaceDayResult {
  id?: string;
  room_id: string;
  day: number;
  race_id: string;      // "main-cat-0" through "main-cat-6" for category races
  race_name: string;     // Category label for display, e.g. "Главная гонка: 0-120 лс"
  results: RaceResult[]; // Empty array for categories with no participants
  weather: 'SUNNY' | 'RAIN' | 'STORM';
}
```

### RaceResult (Extended)

```typescript
interface RaceResult {
  carId: string;
  carName: string;
  position: number;
  time: number;
  earnings: number;
  points: number;
  playerName?: string;
  prizes?: Array<{ name: string; icon: string; type?: string }>; // Bonus Track prizes
}
```

### POWER_CATEGORIES (Existing)

Already defined in `services/multiplayer.ts`:
```typescript
export const POWER_CATEGORIES = [
  { label: '0-120 лс', min: 0, max: 120 },
  { label: '121-200 лс', min: 121, max: 200 },
  { label: '201-300 лс', min: 201, max: 300 },
  { label: '301-450 лс', min: 301, max: 450 },
  { label: '451-650 лс', min: 451, max: 650 },
  { label: '651-900 лс', min: 651, max: 900 },
  { label: '900+ лс', min: 901, max: Infinity },
];
```

### Reward Tables (Existing)

From `rewards_data.json`, keyed by player count (3-8):
- `worldSaturday`: money only, no points/prizes — for Paid Race
- `worldBonus`: money + prizes count — for Bonus Track
- `worldMain`: money + points — for Main Race (per category)
- `worldSaturdayEntryFee`: 1000 (for 3-4 players), 0 (for 5+ players)


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Entry fee round-trip

*For any* player with money >= 1000, paying the entry fee and then cancelling the registration should restore the player's money to its original value.

**Validates: Requirements 1.2, 1.5**

### Property 2: Insufficient funds rejection

*For any* player with money < 1000, attempting to register for the Paid Race should be rejected and the player's money balance should remain unchanged.

**Validates: Requirements 1.4**

### Property 3: Earnings match reward table by position

*For any* race simulation result (Paid Race with worldSaturday, or Category Race with worldMain) and any player count, each participant's earnings and points should exactly match the reward table entry for their finishing position.

**Validates: Requirements 2.2, 5.4**

### Property 4: Non-participants excluded from results

*For any* set of race entries and players, a player who did not register for a specific race should not appear in that race's results and should receive zero earnings/points from that race.

**Validates: Requirements 2.3, 8.4**

### Property 5: Prize data persistence round-trip

*For any* Bonus Track race result with prizes, saving the result via `saveRaceDayResults` and then loading it via `fetchRaceDayResults` should preserve all prize names and icons in the results data.

**Validates: Requirements 3.4**

### Property 6: Car filtering by effective power and category range

*For any* car with installed parts and any power category `[min, max]`, the car should appear in that category's car list if and only if `getEffectiveStats(car).power` falls within `[min, max]`.

**Validates: Requirements 4.2, 4.5**

### Property 7: One car per category invariant

*For any* player and any power category, the number of race entries with that category's `race_id` should be at most 1.

**Validates: Requirements 4.3**

### Property 8: Category race ID format

*For any* Main Race registration at category index N (0-6), the stored `race_id` should equal `"main-cat-{N}"`, and each saved `RaceDayResult` for that category should use the same `race_id`.

**Validates: Requirements 4.7, 5.5**

### Property 9: Category grouping for independent simulation

*For any* set of Main Race entries across multiple categories, entries with different `Category_Race_ID` values should be simulated as independent races — a car in category A should never compete against a car in category B.

**Validates: Requirements 5.1**

### Property 10: Cross-race money and points summation

*For any* player participating in multiple World Series races (Paid Race, Bonus Track, and N category races), the total money and points awarded should equal the sum of individual race earnings across all races.

**Validates: Requirements 7.3, 7.5, 8.1, 8.2**

### Property 11: Correct reward table mapping

*For any* World Series day, the Paid Race (index 0) should use `worldSaturday` rewards, Bonus Track (index 1) should use `worldBonus` rewards, and Main Race categories should use `worldMain` rewards.

**Validates: Requirements 7.4**

### Property 12: Simulation earnings are gross (no fee deduction)

*For any* Paid Race simulation result, the earnings awarded to a participant should equal the `worldSaturday` table value for their position — the entry fee is not subtracted from race earnings.

**Validates: Requirements 8.5**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Player has insufficient money for Paid Race | Show "Недостаточно средств", disable confirm button |
| Player tries to register same car in two categories | Block with "Эта машина уже заявлена в другую категорию" |
| No cars match a power category + track requirement | Show "Нет подходящих машин в этой категории" |
| Empty category during simulation | Skip simulation, save empty results with message |
| Network error during entry fee deduction | Show error alert, do not create race_entry (atomic: money deduction + entry creation) |
| Network error during entry cancellation/refund | Show error alert, do not delete race_entry (atomic: money refund + entry deletion) |
| Player disconnects after paying fee but before race | Fee remains deducted; entry exists; race runs normally |
| `worldSaturdayEntryFee` is 0 for 5+ players | Skip confirmation dialog, go straight to car selection |

## Testing Strategy

### Unit Tests

Focus on specific examples and edge cases:
- Paid Race dialog shows when clicking register on Race 1 during World Series day
- 7 category buttons render for Main Race
- Categories display in correct order (0-120 first, 900+ last)
- Empty category shows correct message
- Cancel entry refunds exactly 1000
- Results screen shows prizes for Bonus Track
- Results screen groups Main Race by categories

### Property-Based Tests

Use `fast-check` library for TypeScript property-based testing. Minimum 100 iterations per test.

Each property test references its design property:

- **Feature: world-series, Property 1: Entry fee round-trip** — Generate random money amounts >= 1000, verify pay+cancel = original
- **Feature: world-series, Property 2: Insufficient funds rejection** — Generate random money amounts < 1000, verify rejection
- **Feature: world-series, Property 3: Earnings match reward table** — Generate random race results with N participants, verify each position's earnings matches table
- **Feature: world-series, Property 4: Non-participants excluded** — Generate random player sets with some not registered, verify exclusion
- **Feature: world-series, Property 5: Prize data persistence** — Generate random prize arrays, verify save/load round-trip
- **Feature: world-series, Property 6: Car filtering by effective power** — Generate random cars with random parts, verify category membership matches effective power
- **Feature: world-series, Property 7: One car per category** — Generate random registration sequences, verify at most 1 entry per category per player
- **Feature: world-series, Property 8: Category race ID format** — Generate random category indices 0-6, verify race_id = "main-cat-{N}"
- **Feature: world-series, Property 9: Category grouping** — Generate entries across multiple categories, verify independent simulation
- **Feature: world-series, Property 10: Cross-race summation** — Generate earnings from multiple races, verify total = sum
- **Feature: world-series, Property 11: Reward table mapping** — Generate World Series race indices, verify correct table selection
- **Feature: world-series, Property 12: Gross earnings** — Generate Paid Race results, verify earnings = table value (no fee subtracted)

Each property-based test must be implemented as a single `fc.assert(fc.property(...))` call with at least 100 runs. Each test file should import `fast-check` and tag tests with the property reference comment.
