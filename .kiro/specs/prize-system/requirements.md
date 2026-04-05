# Requirements Document

## Introduction

Система призов для мультиплеерной гоночной игры. World Series проводится по субботам и состоит из трёх гонок:

1. **Платная гонка (Race 1)** — игрок платит 1000 за вход и сам решает, участвовать ли. Награды: только деньги (worldSaturday таблица).
2. **Bonus Track (Race 2)** — гонка с рандомными призами и деньгами (worldBonus таблица). Именно здесь разыгрываются призы: запчасти, скидки и деньги.
3. **Главная гонка (Race 3)** — игрок может выставить несколько машин, если они попадают в разные категории мощности (POWER_CATEGORIES). Награды: деньги и баллы (worldMain таблица).

Система призов (Prize_System) отвечает ТОЛЬКО за призы из Bonus Track (Race 2). Платная гонка и Главная гонка будут обрабатываться отдельными скриптами.

Деньги за все три гонки World Series в один день должны суммироваться и начисляться игроку единой суммой. Текущая реализация содержит баг — деньги начисляются только за одну гонку.

## Glossary

- **Prize_System**: Подсистема, отвечающая за определение, генерацию и выдачу призов игрокам по результатам Bonus Track
- **Prize_Part**: Запчасть-приз, тир которой на 1 выше максимального тира, доступного в текущих магазинах игрока
- **Prize_Discount**: Приз-скидка 15% на покупки в конкретном автосалоне (дилере)
- **Prize_Money**: Денежный приз, начисляемый игроку по результатам Bonus Track (поле `money` в worldBonus таблице)
- **Storage**: Склад игрока в гараже (поле `storage` в RoomPlayer), где хранятся полученные призы (запчасти и скидки)
- **Bonus_Track**: Вторая гонка World Series (Race 2), единственный источник призов в системе
- **Paid_Race**: Первая гонка World Series (Race 1), платный вход 1000, участие по желанию игрока
- **Main_Race**: Третья гонка World Series (Race 3), игрок может выставить несколько машин по категориям мощности
- **POWER_CATEGORIES**: Таблица категорий мощности (0-120, 121-200, 201-300, 301-450, 451-650, 651-900, 900+ лс), определяющая допуск машин к Главной гонке
- **Tier**: Уровень запчасти (1-4), определяющий её мощность; тир 4 доступен только как приз
- **Shop_Tier**: Максимальный тир запчастей, доступных в текущих разблокированных магазинах (зависит от current_year комнаты)
- **Dealer**: Автосалон (АЛЬФА, БЕТА, ГАММА, ДЕЛЬТА), в котором игрок покупает машины
- **Discount_Stack**: Накопленные скидки игрока на конкретный автосалон, которые суммируются при повторном получении
- **Race_Day_Money**: Суммарные деньги игрока за все гонки одного дня World Series (Paid_Race + Bonus_Track + Main_Race)

## Requirements

### Requirement 1: Prize Eligibility from Bonus Track

**User Story:** Как игрок, я хочу получать призы за высокие места в Bonus Track, чтобы иметь мотивацию побеждать.

#### Acceptance Criteria

1. WHEN a Bonus Track race concludes, THE Prize_System SHALL read the `prizes` field from the worldBonus reward table in rewards_data.json for each finishing position to determine the number of prizes awarded to each player
2. WHEN a player finishes in a position where `prizes` equals 0, THE Prize_System SHALL award zero prizes to that player
3. THE Prize_System SHALL use the player count of the room to select the correct reward table from rewards_data.json (keys "3" through "8")
4. THE Prize_System SHALL award prizes exclusively from Bonus Track (Race 2) results and SHALL NOT award prizes from Paid Race or Main Race results

### Requirement 2: Prize Type Selection

**User Story:** Как игрок, я хочу получать разнообразные призы — запчасти, скидки и деньги — чтобы игра оставалась интересной.

#### Acceptance Criteria

1. WHEN the Prize_System generates a prize for a player, THE Prize_System SHALL randomly select the prize type as either Prize_Part or Prize_Discount
2. THE Prize_System SHALL select Prize_Part with higher probability than Prize_Discount (approximately 70% parts, 30% discounts)
3. WHEN a player earns multiple prizes from a single race, THE Prize_System SHALL generate each prize independently using the same random selection logic
4. THE Prize_System SHALL award Prize_Money to each player based on the `money` field from the worldBonus reward table for the player's finishing position

### Requirement 3: Prize Part Generation

**User Story:** Как игрок, я хочу получать запчасти на один тир выше магазинных, чтобы иметь преимущество за победу.

#### Acceptance Criteria

1. WHEN the Prize_System generates a Prize_Part, THE Prize_System SHALL determine the current Shop_Tier as the maximum tier available across all unlocked shops for the room's current_year
2. WHEN the current Shop_Tier is 1, THE Prize_System SHALL generate a Prize_Part of tier 2
3. WHEN the current Shop_Tier is 2, THE Prize_System SHALL generate a Prize_Part of tier 3
4. WHEN the current Shop_Tier is 3 or higher, THE Prize_System SHALL generate a Prize_Part of tier 4
5. WHEN the Prize_System generates a Prize_Part, THE Prize_System SHALL randomly select one part from all available parts of the determined prize tier in shops_data.json
6. THE Prize_System SHALL assign a unique id to each generated Prize_Part to distinguish it from shop parts and other prizes

### Requirement 4: Prize Discount Generation

**User Story:** Как игрок, я хочу получать скидки на автосалоны, чтобы экономить на покупке машин.

#### Acceptance Criteria

1. WHEN the Prize_System generates a Prize_Discount, THE Prize_System SHALL randomly select one Dealer from the available dealers (АЛЬФА, БЕТА, ГАММА, ДЕЛЬТА)
2. THE Prize_System SHALL set the discount value to 15% for every generated Prize_Discount
3. THE Prize_System SHALL represent the Prize_Discount as a special item in the player's Storage with a distinct type field to differentiate it from Prize_Parts

### Requirement 5: Prize Delivery to Storage

**User Story:** Как игрок, я хочу чтобы полученные призы автоматически попадали на мой склад, чтобы я мог решить позже, куда их установить.

#### Acceptance Criteria

1. WHEN the Prize_System awards prizes to a player, THE Prize_System SHALL add all generated prize items (Prize_Parts and Prize_Discounts) to the player's Storage array in Supabase
2. WHEN a Prize_Part is added to Storage, THE Prize_System SHALL persist the full Part object (id, name, boosts, price, icon, brand, tier, description, slot, requires)
3. WHEN a Prize_Discount is added to Storage, THE Prize_System SHALL persist the discount object with dealer name, discount percentage, and a type identifier
4. THE Prize_System SHALL update the player's Storage in a single database operation together with money and points updates from the same race

### Requirement 6: Prize Part Installation

**User Story:** Как игрок, я хочу устанавливать призовые запчасти на любую машину в гараже, чтобы улучшать свои автомобили.

#### Acceptance Criteria

1. THE Prize_System SHALL allow players to install Prize_Parts from Storage onto any car in the player's garage using the existing installFromStorage mechanism
2. WHEN a player installs a Prize_Part from Storage, THE Prize_System SHALL remove the Prize_Part from Storage and add it to the target car's installedParts array
3. THE Prize_System SHALL apply the same slot and prerequisite validation rules to Prize_Parts as to shop-purchased parts

### Requirement 7: Discount Usage at Dealership

**User Story:** Как игрок, я хочу использовать скидку при покупке машины в автосалоне, чтобы сэкономить деньги.

#### Acceptance Criteria

1. WHEN a player initiates a car purchase at a Dealer and the player has one or more Prize_Discounts for that Dealer in Storage, THE Prize_System SHALL prompt the player to use the discount or save it for a future purchase
2. WHEN the player chooses to use a Prize_Discount, THE Prize_System SHALL reduce the car price by 15% and remove one Prize_Discount for that Dealer from Storage
3. WHEN the player chooses to save the Prize_Discount, THE Prize_System SHALL proceed with the full-price purchase and retain the Prize_Discount in Storage
4. WHEN a player receives multiple Prize_Discounts for the same Dealer, THE Prize_System SHALL store each discount as a separate item in Storage, allowing them to stack

### Requirement 8: Storage Display for Prizes

**User Story:** Как игрок, я хочу видеть все мои призы на складе в гараже, чтобы управлять ими.

#### Acceptance Criteria

1. THE Prize_System SHALL display Prize_Parts in the Storage tab of the Garage with the part name, tier, boosts, and a visual indicator that the item is a prize
2. THE Prize_System SHALL display Prize_Discounts in the Storage tab of the Garage with the Dealer name, discount percentage, and a distinct visual style
3. WHEN the Storage contains both Prize_Parts and Prize_Discounts, THE Prize_System SHALL group or visually separate the two types for clarity
4. THE Prize_System SHALL show the total count of Prize_Discounts per Dealer in the Storage tab

### Requirement 9: Prize Notification

**User Story:** Как игрок, я хочу видеть уведомление о полученных призах после гонки, чтобы знать, что я выиграл.

#### Acceptance Criteria

1. WHEN prizes are awarded after a Bonus Track race, THE Prize_System SHALL display a notification to the player listing each prize received (part name and tier, or discount dealer name)
2. THE Prize_System SHALL send a system chat message to the room announcing prize winners and their prizes

### Requirement 10: Tier 4 Exclusivity

**User Story:** Как игрок, я хочу чтобы запчасти 4 тира были доступны только как призы, чтобы они оставались ценными.

#### Acceptance Criteria

1. THE Prize_System SHALL ensure that tier 4 parts from the "Бонусные детали 4 уровня" section of shops_data.json are available exclusively as prizes and are not purchasable in any shop
2. WHILE the room's current_year unlocks shops up to tier 3 maximum, THE Prize_System SHALL generate tier 4 Prize_Parts from the bonus parts pool

### Requirement 11: World Series Race Day Money Summation

**User Story:** Как игрок, я хочу получать суммарные деньги за все три гонки World Series в один день, чтобы мои заработки не терялись.

#### Acceptance Criteria

1. WHEN all three World Series races (Paid Race, Bonus Track, Main Race) for a day are completed, THE Prize_System SHALL sum the money earned by each player across all three races
2. THE Prize_System SHALL award the total Race_Day_Money to each player as a single cumulative update to the player's money balance
3. IF a player did not participate in the Paid Race (opted out), THEN THE Prize_System SHALL include only money from Bonus Track and Main Race in the summation for that player
4. THE Prize_System SHALL sum money from each race independently per player based on the player's finishing position in each race and the corresponding reward table (worldSaturday, worldBonus, worldMain)
5. THE Prize_System SHALL also sum points earned across all three races and award them as a single cumulative update
