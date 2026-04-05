# Implementation Plan: Prize System

## Overview

Реализация системы призов для Bonus Track (Race 2) World Series. Порядок: типы → сервис генерации → интеграция в advanceDay (с фиксом суммирования денег) → UI (Dealer скидки, Garage отображение). Все примеры кода на TypeScript/React.

## Tasks

- [ ] 1. Add PrizeDiscount type and update Storage type
  - [ ] 1.1 Add `PrizeDiscount` interface to `types.ts`
    - Add interface with fields: `id`, `type: 'discount'`, `dealer`, `discount`, `name`, `icon`
    - Update `RoomPlayer.storage` type from `Part[]` to `(Part | PrizeDiscount)[]`
    - _Requirements: 4.3, 5.3_

  - [ ] 1.2 Update `updatePlayerState` in `services/multiplayer.ts`
    - Change `storage` parameter type from `Part[]` to `(Part | PrizeDiscount)[]`
    - _Requirements: 5.4_

- [ ] 2. Implement prize generation service
  - [ ] 2.1 Create `services/prizeService.ts` with core functions
    - Implement `getMaxShopTier(currentYear)`: iterate SHOPS, find max tier among shops with `unlockYear <= currentYear`
    - Implement `getPrizeTier(currentYear)`: return `Math.min(getMaxShopTier(currentYear) + 1, 4)`
    - Implement `generateSinglePrize(currentYear)`: 70% chance Part, 30% chance Discount. For Part: pick random part from correct tier pool (SHOP_PARTS filtered by tier, fallback to BONUS_PARTS for tier 4). For Discount: pick random dealer from АЛЬФА/БЕТА/ГАММА/ДЕЛЬТА, set discount=15
    - Implement `generatePrizesForPlayer(position, playerCount, currentYear)`: read `prizes` count from worldBonus reward table via `getRewards(playerCount)`, generate that many prizes
    - Implement `generatePrizesForRace(results, playerCount, currentYear)`: iterate race results, call `generatePrizesForPlayer` for each, return `Map<string, (PrizePart | PrizeDiscount)[]>` keyed by carId
    - All prize IDs must be unique: `prize-part-{timestamp}-{random}` / `prize-discount-{timestamp}-{random}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2_

  - [ ]* 2.2 Write property test: Prize count matches reward table
    - **Property 1: Prize count matches reward table**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ]* 2.3 Write property test: Generated prizes are valid typed objects
    - **Property 2: Generated prizes are valid typed objects**
    - **Validates: Requirements 2.1, 4.1, 4.2, 4.3, 5.2, 5.3**

  - [ ]* 2.4 Write property test: Prize type distribution approximates 70/30
    - **Property 3: Prize type distribution approximates 70/30**
    - **Validates: Requirements 2.2**

  - [ ]* 2.5 Write property test: Prize tier equals Shop_Tier + 1 capped at 4
    - **Property 4: Prize tier equals Shop_Tier + 1 capped at 4**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 2.6 Write property test: Prize parts belong to the correct tier pool
    - **Property 5: Prize parts belong to the correct tier pool**
    - **Validates: Requirements 3.5, 10.2**

  - [ ]* 2.7 Write property test: Prize IDs are unique
    - **Property 6: Prize IDs are unique**
    - **Validates: Requirements 3.6**

  - [ ]* 2.8 Write property test: Tier 4 parts are not available in shops
    - **Property 10: Tier 4 parts are not available in shops**
    - **Validates: Requirements 10.1**

- [ ] 3. Checkpoint - Ensure prize service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Integrate prize distribution into advanceDay and fix World Series money summation
  - [ ] 4.1 Refactor World Series race processing in `components/Multiplayer.tsx` advanceDay
    - When `schedule.raceType === 'WORLD'`, simulate all 3 races (worldSaturday, worldBonus, worldMain) and accumulate `moneyByPlayer: Record<string, number>` and `pointsByPlayer: Record<string, number>` across all 3 races
    - For each race, look up the correct reward table: `rewards.worldSaturday` for Race 1, `rewards.worldBonus` for Race 2, `rewards.worldMain` for Race 3
    - For Paid Race (worldSaturday): only include players who opted in (have race entries); players who didn't enter get 0 money/points from that race
    - After all 3 races are simulated, call `generatePrizesForRace()` with Bonus Track results only
    - Merge prizes into each player's existing storage array
    - Apply single `updatePlayerState` per player with accumulated money, points, and updated storage
    - _Requirements: 1.4, 5.1, 5.4, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 4.2 Send prize notification chat messages
    - After prizes are distributed, send system chat messages announcing each player's prizes (part name + tier, or discount dealer name)
    - _Requirements: 9.1, 9.2_

  - [ ]* 4.3 Write property test: World Series money and points summation
    - **Property 11: World Series money and points summation**
    - **Validates: Requirements 11.1, 11.3, 11.4, 11.5**

- [ ] 5. Checkpoint - Ensure advanceDay integration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement discount prompt in Dealer
  - [ ] 6.1 Modify `components/Dealer.tsx` to check for discounts and show prompt
    - When player clicks "КУПИТЬ" on a car, check player's storage for `PrizeDiscount` items where `dealer` matches the current dealer ID
    - If discount(s) found: show modal with two options — "Использовать скидку (−15%)" or "Купить за полную цену"
    - If discount used: calculate `Math.round(price * 0.85)`, remove one matching PrizeDiscount from storage, update player state
    - If no discounts: proceed with normal purchase flow
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 6.2 Write property test: Discount application reduces price by 15%
    - **Property 8: Discount application reduces price by 15%**
    - **Validates: Requirements 7.2**

  - [ ]* 6.3 Write property test: Multiple discounts for same dealer stack independently
    - **Property 9: Multiple discounts for same dealer stack independently**
    - **Validates: Requirements 7.4, 8.4**

- [ ] 7. Display prizes and discounts in Garage Storage tab
  - [ ] 7.1 Modify `components/Garage.tsx` Storage tab to handle mixed storage types
    - Separate storage items into Prize_Parts (items without `type === 'discount'`) and Prize_Discounts (items with `type === 'discount'`)
    - Display Prize_Parts with existing part rendering + "🏆 ПРИЗ" badge and tier indicator
    - Display Prize_Discounts in a separate section with dealer name, "−15%" label, and count per dealer
    - Prize_Parts remain installable via existing `onInstallFromStorage` mechanism
    - Prize_Discounts are not installable (no install button shown for them)
    - _Requirements: 6.1, 6.2, 6.3, 8.1, 8.2, 8.3, 8.4_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check library, unit tests use vitest
- Test file: `services/prizeService.test.ts`
- Checkpoints ensure incremental validation
- The design uses TypeScript throughout — all code examples should use TypeScript/React
