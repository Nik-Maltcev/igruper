Да я как пример привёл цифру наобум😅
Не помню уж все года. Просто сам факт, что пишут, что начинается то турнир, а его нетъясн# Implementation Plan: World Series

## Overview

Implement the full World Series race day (dayNum=9, raceType='WORLD') with three distinct races: Paid Race (entry fee dialog), Bonus Track (prize display on results), and Main Race (7 power-category registration and per-category simulation). Changes span RaceCenter.tsx (registration UI), Multiplayer.tsx (advanceDay simulation), RaceResults.tsx (prize and category display), and App.tsx (prop wiring).

## Tasks

- [ ] 1. Add playerMoney and onMoneyChange props to RaceCenter
  - [ ] 1.1 Extend RaceCenterProps interface in `components/RaceCenter.tsx` with `playerMoney?: number` and `onMoneyChange?: (delta: number) => void` props
    - Add the two new optional props to the existing `RaceCenterProps` interface
    - These will be used by the Paid Race confirmation dialog to check balance and deduct/refund the entry fee
    - _Requirements: 1.1, 1.2, 1.4, 1.5_
  - [ ] 1.2 Wire the new props in `App.tsx` where `<RaceCenter>` is rendered
    - Pass `playerMoney={money}` from the existing `money` variable (derived from `player?.money || 0`)
    - Pass `onMoneyChange` callback that updates the player's money in Supabase and calls `refreshPlayer()`
    - _Requirements: 1.2, 1.5_

- [ ] 2. Implement Paid Race registration with entry fee dialog in RaceCenter
  - [ ] 2.1 Add Paid Race state variables and World Series detection logic in `components/RaceCenter.tsx`
    - Add `showPaidConfirm` and `paidRaceId` state variables
    - Add `isWorldSeries` detection: `const isWorldSeries = cycleDay === 9;`
    - Import `POWER_CATEGORIES` from `services/multiplayer` (or define locally if not exported)
    - _Requirements: 7.1, 7.2_
  - [ ] 2.2 Create `PaidRaceEntryButton` component inside `components/RaceCenter.tsx`
    - When player clicks "ЗАПИСАТЬСЯ" on Race 1 (worldRaceIndex === 0), show confirmation dialog: "Готовы заплатить 1000 за участие?"
    - If `playerMoney < 1000`, show "Недостаточно средств" and disable confirm button
    - On confirm: call `onMoneyChange(-1000)`, then open car picker (set `pickingRaceId`)
    - On decline: close dialog, no registration
    - When player already has an entry and cancels: call `onMoneyChange(+1000)`, delete race_entry, reload entries
    - Check `worldSaturdayEntryFee` from rewards data — if 0 for current player count, skip dialog and go straight to car selection
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 2.3 Integrate `PaidRaceEntryButton` into the race rendering loop
    - When `isWorldSeries` and race index is 0, render `PaidRaceEntryButton` instead of standard `EntryButton`
    - Race index 1 (Bonus Track) keeps standard `EntryButton`
    - _Requirements: 7.1, 7.2_
  - [ ]* 2.4 Write property test for entry fee round-trip
    - **Property 1: Entry fee round-trip**
    - **Validates: Requirements 1.2, 1.5**
  - [ ]* 2.5 Write property test for insufficient funds rejection
    - **Property 2: Insufficient funds rejection**
    - **Validates: Requirements 1.4**

- [ ] 3. Implement Main Race category-based registration in RaceCenter
  - [ ] 3.1 Add Main Race category state and create `MainRaceEntryButton` component in `components/RaceCenter.tsx`
    - Add `mainRaceCategory` state (number | null) for selected category index
    - When player clicks "ЗАПИСАТЬСЯ" on Race 3 (worldRaceIndex === 2), show 7 category buttons from `POWER_CATEGORIES`
    - Each button shows category label (e.g. "0-120 лс") and whether player already registered in that category
    - _Requirements: 4.1, 4.3, 4.4_
  - [ ] 3.2 Implement category car filtering and registration logic
    - When player selects a category, filter cars where `getEffectiveStats(car).power` falls within `[min, max]` AND car meets the Main Race track requirement via `checkRequirement`
    - Allow one car per category — if already registered, show car name + cancel button
    - If no matching cars: show "Нет подходящих машин в этой категории"
    - On car selection: call `submitRaceEntry(roomId, playerId, "main-cat-{index}", carId, day)`
    - Block registering the same car in two different categories with message "Эта машина уже заявлена в другую категорию"
    - _Requirements: 4.2, 4.3, 4.5, 4.6, 4.7_
  - [ ] 3.3 Integrate `MainRaceEntryButton` into the race rendering loop
    - When `isWorldSeries` and race index is 2, render `MainRaceEntryButton` instead of standard `EntryButton`
    - _Requirements: 7.1, 7.2_
  - [ ]* 3.4 Write property test for car filtering by effective power
    - **Property 6: Car filtering by effective power and category range**
    - **Validates: Requirements 4.2, 4.5**
  - [ ]* 3.5 Write property test for one car per category invariant
    - **Property 7: One car per category invariant**
    - **Validates: Requirements 4.3**
  - [ ]* 3.6 Write property test for category race ID format
    - **Property 8: Category race ID format**
    - **Validates: Requirements 4.7**

- [ ] 4. Checkpoint - Ensure all RaceCenter changes work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Update advanceDay for per-category Main Race simulation
  - [ ] 5.1 Modify `advanceDay` in `components/Multiplayer.tsx` to handle Main Race category entries
    - After standard race sorting, detect entries with `race_id` starting with `"main-cat-"`
    - Group these entries by `race_id` and sort by category index
    - For each non-empty category group: simulate using `simulateRace()` with the worldMain track weights (from 3rd race in round 3 of races_data) and `worldMain` reward table
    - For empty categories: save a `RaceDayResult` with empty results array
    - Use `race_name` format: "Главная гонка: {category_label}" (e.g. "Главная гонка: 0-120 лс")
    - Accumulate money/points from all category races into existing `moneyAccum`/`pointsAccum`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3, 7.5, 8.1, 8.2_
  - [ ] 5.2 Ensure correct reward table mapping for all three World Series races
    - Paid Race (worldRaceIndex 0) → `worldSaturday` rewards (already implemented)
    - Bonus Track (worldRaceIndex 1) → `worldBonus` rewards + prize generation (already implemented)
    - Main Race categories → `worldMain` rewards
    - Verify the existing `worldRaceIndex` logic correctly identifies races 0 and 1, and that category entries bypass the standard race loop
    - _Requirements: 7.4, 8.3, 8.5_
  - [ ]* 5.3 Write property test for earnings matching reward table
    - **Property 3: Earnings match reward table by position**
    - **Validates: Requirements 2.2, 5.4**
  - [ ]* 5.4 Write property test for non-participants excluded
    - **Property 4: Non-participants excluded from results**
    - **Validates: Requirements 2.3, 8.4**
  - [ ]* 5.5 Write property test for category grouping independence
    - **Property 9: Category grouping for independent simulation**
    - **Validates: Requirements 5.1**
  - [ ]* 5.6 Write property test for cross-race summation
    - **Property 10: Cross-race money and points summation**
    - **Validates: Requirements 7.3, 7.5, 8.1, 8.2**
  - [ ]* 5.7 Write property test for correct reward table mapping
    - **Property 11: Correct reward table mapping**
    - **Validates: Requirements 7.4**
  - [ ]* 5.8 Write property test for gross earnings (no fee deduction)
    - **Property 12: Simulation earnings are gross (no fee deduction)**
    - **Validates: Requirements 8.5**

- [ ] 6. Add prize display to RaceResults for Bonus Track
  - [ ] 6.1 Persist prize data in Bonus Track race results in `components/Multiplayer.tsx`
    - When saving Bonus Track results (worldRaceIndex === 1), include `prizes` array in each result entry
    - Map prizes from `prizesAccum` to each result's `prizes` field with `{ name, icon, type }` shape
    - _Requirements: 3.4_
  - [ ] 6.2 Display prizes in the WINNERS view of `components/RaceResults.tsx`
    - When a result entry has `prizes` array with items, render prize names (with tier or discount info) below the earnings line
    - Show prizes for all players, not just current player
    - When a player has no prizes, show no prize indicator
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 6.3 Write property test for prize data persistence round-trip
    - **Property 5: Prize data persistence round-trip**
    - **Validates: Requirements 3.4**

- [ ] 7. Add category display to RaceResults for Main Race
  - [ ] 7.1 Update `components/RaceResults.tsx` to detect and group Main Race category results
    - Detect results with `race_id` matching `"main-cat-{N}"` pattern
    - Group these results into a single combined view with 7 category sections
    - Show categories in order from lowest (0-120 лс) to highest (900+ лс)
    - For categories with participants: show positions, times, earnings, points
    - For empty categories: show "Нет участников в этой категории мощности"
    - Visually separate each category with a labeled header
    - Skip the GRID→ANIMATION flow for category results — show combined WINNERS view directly
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 8. Wire everything together in App.tsx
  - [ ] 8.1 Verify `App.tsx` passes all required props to `<RaceCenter>`
    - Confirm `playerMoney` and `onMoneyChange` are correctly wired from task 1.2
    - Ensure `onMoneyChange` persists the delta to Supabase `room_players.money` and refreshes player state
    - _Requirements: 1.2, 1.5_
  - [ ] 8.2 End-to-end integration verification
    - Verify that World Series day (dayNum=9) correctly shows all 3 races with their specialized entry buttons
    - Verify advanceDay processes Paid Race, Bonus Track, and all Main Race categories
    - Verify results screen shows prizes for Bonus Track and category sections for Main Race
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing advanceDay already handles worldRaceIndex 0 and 1 — task 5 extends it for category-based Main Race entries
- POWER_CATEGORIES should be imported from `services/multiplayer` where it's already defined
