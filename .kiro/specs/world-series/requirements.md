# Requirements Document

## Introduction

Полная реализация системы World Series — субботнего гоночного дня (dayNum=9, raceType='WORLD'). World Series состоит из трёх отдельных гонок: Платная гонка (Race 1), Bonus Track (Race 2) и Главная гонка (Race 3). Каждая гонка имеет уникальную механику регистрации, симуляции и начисления наград. Главная гонка разделена на 7 категорий мощности — машины соревнуются только внутри своей категории. Призы Bonus Track уже реализованы в prize-system спеке; данный спек покрывает регистрацию, симуляцию, UI и отображение результатов для всех трёх гонок.

## Glossary

- **Race_Center**: Компонент RaceCenter.tsx, отвечающий за отображение гонок и регистрацию машин игроков
- **Paid_Race**: Первая гонка World Series (Race 1), использующая таблицу наград worldSaturday. Требует оплаты 1000 за участие
- **Bonus_Track**: Вторая гонка World Series (Race 2), использующая таблицу наград worldBonus. Призы (запчасти/скидки) генерируются Prize_System
- **Main_Race**: Третья гонка World Series (Race 3), использующая таблицу наград worldMain. Поддерживает регистрацию нескольких машин по категориям мощности
- **POWER_CATEGORIES**: Массив из 7 категорий мощности: 0-120, 121-200, 201-300, 301-450, 451-650, 651-900, 900+ лс
- **Category_Race**: Отдельный заезд внутри Main_Race для одной категории мощности. Машины соревнуются только с машинами той же категории
- **Category_Race_ID**: Идентификатор заезда категории в формате "main-cat-{index}" (например "main-cat-0", "main-cat-1" и т.д.)
- **Entry_Fee**: Стоимость участия в Paid_Race — 1000 единиц игровой валюты
- **Race_Simulation**: Процесс в advanceDay (Multiplayer.tsx), который симулирует гонку и генерирует результаты
- **Results_Screen**: Компонент RaceResults.tsx, отображающий результаты гонок с анимацией
- **Prize_Display**: Отображение призов Bonus Track на экране результатов, видимое всем игрокам комнаты
- **Race_Entry**: Запись в таблице race_entries (room_id, player_id, race_id, car_id, day)

## Requirements

### Requirement 1: Paid Race Registration with Entry Fee

**User Story:** Как игрок, я хочу решить, готов ли я заплатить 1000 за участие в Платной гонке, чтобы осознанно рисковать деньгами ради награды.

#### Acceptance Criteria

1. WHEN a player clicks "ЗАПИСАТЬСЯ" for the Paid Race, THE Race_Center SHALL display a confirmation dialog asking "Готовы заплатить 1000 за участие?"
2. WHEN the player confirms participation, THE Race_Center SHALL deduct the Entry_Fee (1000) from the player's money balance and proceed to car selection
3. WHEN the player declines participation, THE Race_Center SHALL close the dialog and prevent the player from registering a car for the Paid Race
4. IF the player's money balance is less than the Entry_Fee, THEN THE Race_Center SHALL display a message "Недостаточно средств" and prevent registration
5. WHEN the player cancels a Paid Race entry after confirming, THE Race_Center SHALL refund the Entry_Fee (1000) to the player's money balance and remove the Race_Entry

### Requirement 2: Paid Race Simulation and Rewards

**User Story:** Как игрок, я хочу получить награды за Платную гонку по таблице worldSaturday, чтобы окупить вложенные деньги.

#### Acceptance Criteria

1. WHEN the Race_Simulation processes the Paid Race, THE Race_Simulation SHALL simulate the race using standard race logic with the worldSaturday track weights
2. WHEN the Paid Race concludes, THE Race_Simulation SHALL award money to each participant based on the player's finishing position and the worldSaturday reward table
3. WHEN a player did not register for the Paid Race, THE Race_Simulation SHALL exclude that player from Paid Race results and award zero money from worldSaturday to that player

### Requirement 3: Bonus Track Prize Visibility on Results Screen

**User Story:** Как игрок, я хочу видеть призы всех участников Bonus Track на экране результатов, чтобы знать, кто что выиграл.

#### Acceptance Criteria

1. WHEN the Results_Screen displays Bonus Track results, THE Results_Screen SHALL show the prizes (part names with tier, or discount dealer names) awarded to each player next to their race result
2. THE Results_Screen SHALL display prize information for all players in the room, not only for the current player
3. WHEN a player received zero prizes from Bonus Track, THE Results_Screen SHALL display no prize indicator for that player
4. THE Results_Screen SHALL persist prize details in the race day results data so that prizes remain visible when revisiting the results screen

### Requirement 4: Main Race Category-Based Registration

**User Story:** Как игрок, я хочу зарегистрировать несколько машин в разные категории мощности Главной гонки, чтобы максимизировать шансы на награды.

#### Acceptance Criteria

1. WHEN a player clicks "ЗАПИСАТЬСЯ" for the Main Race, THE Race_Center SHALL display 7 category buttons corresponding to POWER_CATEGORIES (0-120, 121-200, 201-300, 301-450, 451-650, 651-900, 900+ лс)
2. WHEN a player selects a power category, THE Race_Center SHALL display only the player's cars that fit within the selected power range AND meet the Main Race track requirement
3. THE Race_Center SHALL allow a player to register one car per power category
4. WHEN a player has already registered a car in a specific category, THE Race_Center SHALL show the registered car with an option to cancel the entry for that category
5. THE Race_Center SHALL use the car's effective power (after installed parts) to determine which power category the car belongs to
6. WHEN a player has no cars fitting a selected power category and meeting the race requirement, THE Race_Center SHALL display "Нет подходящих машин в этой категории"
7. THE Race_Center SHALL store each category registration as a separate Race_Entry with the Category_Race_ID format "main-cat-{index}"

### Requirement 5: Main Race Category-Based Simulation

**User Story:** Как игрок, я хочу чтобы машины соревновались только внутри своей категории мощности, чтобы гонка была честной.

#### Acceptance Criteria

1. WHEN the Race_Simulation processes the Main Race, THE Race_Simulation SHALL group all Race_Entries by their Category_Race_ID and simulate each category as a separate race
2. WHEN a power category has zero Race_Entries, THE Race_Simulation SHALL skip simulation for that category and record "Нет участников в этой категории мощности" in the results
3. WHEN a power category has one or more Race_Entries, THE Race_Simulation SHALL simulate the race using standard race logic with the worldMain track weights
4. WHEN a Category_Race concludes, THE Race_Simulation SHALL award money and points to each participant based on the player's finishing position within that category and the worldMain reward table
5. THE Race_Simulation SHALL save results for each Category_Race as a separate RaceDayResult entry with the Category_Race_ID as the race_id

### Requirement 6: Main Race Results Display

**User Story:** Как игрок, я хочу видеть результаты всех 7 категорий Главной гонки на экране результатов, чтобы понимать полную картину.

#### Acceptance Criteria

1. WHEN the Results_Screen displays Main Race results, THE Results_Screen SHALL show all 7 power categories in order from lowest to highest
2. WHEN a power category had participants, THE Results_Screen SHALL display the race results (positions, times, earnings, points) for that category
3. WHEN a power category had no participants, THE Results_Screen SHALL display "Нет участников в этой категории мощности" for that category
4. THE Results_Screen SHALL visually separate each power category with the category label (e.g. "0-120 лс", "121-200 лс")

### Requirement 7: World Series Race Day Structure

**User Story:** Как игрок, я хочу чтобы все три гонки World Series проходили последовательно в один день, чтобы получить полный гоночный опыт.

#### Acceptance Criteria

1. WHEN the current day is a World Series day (dayNum=9, raceType='WORLD'), THE Race_Center SHALL display all three races: Paid Race, Bonus Track, and Main Race
2. THE Race_Center SHALL display the Paid Race as Race 1, Bonus Track as Race 2, and Main Race as Race 3 in sequential order
3. WHEN the Race_Simulation processes a World Series day, THE Race_Simulation SHALL simulate all three races and accumulate money and points per player across all races
4. THE Race_Simulation SHALL apply the correct reward table for each race: worldSaturday for Paid Race, worldBonus for Bonus Track, worldMain for Main Race
5. WHEN a player participates in multiple Category_Races within the Main Race, THE Race_Simulation SHALL sum the money and points from all Category_Races for that player

### Requirement 8: World Series Money and Points Summation

**User Story:** Как игрок, я хочу получить суммарные деньги и очки за все гонки World Series одним начислением, чтобы мои заработки не терялись.

#### Acceptance Criteria

1. WHEN all World Series races for a day are completed, THE Race_Simulation SHALL sum the money earned by each player across Paid Race, Bonus Track, and all Category_Races of the Main Race
2. THE Race_Simulation SHALL sum the points earned by each player across all World Series races
3. THE Race_Simulation SHALL award the total money and points to each player as a single cumulative update to the player's balance
4. IF a player did not participate in the Paid Race, THEN THE Race_Simulation SHALL include only money and points from Bonus Track and Main Race in the summation for that player
5. THE Race_Simulation SHALL deduct the Entry_Fee from the Paid Race earnings calculation (the fee is already deducted at registration, so race earnings are pure reward)
