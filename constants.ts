import { Car, Part, Track } from './types';

export const INITIAL_MONEY = 15000;

export const AVAILABLE_CARS: Car[] = [
  // --- PAGE 1 ---
  {
    id: 'renault_4', name: 'Renault 4 (1960)',
    image: 'https://placehold.co/600x300/87CEEB/000000?text=Renault+4',
    price: 4800, color: '#87CEEB',
    stats: { power: 26, torque: 52, topSpeed: 111, acceleration: 32, handling: 27, offroad: 46 },
    installedParts: [], tags: ['Классика', 'Эконом']
  },
  {
    id: 'ford_capri', name: 'Ford Capri',
    image: 'https://placehold.co/600x300/DAA520/000000?text=Ford+Capri',
    price: 5000, color: '#DAA520',
    stats: { power: 50, torque: 92, topSpeed: 145, acceleration: 18, handling: 26, offroad: 57 },
    installedParts: [], tags: ['Классика', 'Купе']
  },
  {
    id: 'citroen_2cv', name: 'Citroen 2CV Sahara',
    image: 'https://placehold.co/600x300/708090/ffffff?text=Citroen+2CV+4x4',
    price: 6800, color: '#708090',
    stats: { power: 24, torque: 39, topSpeed: 100, acceleration: 38, handling: 20, offroad: 90 },
    installedParts: [], tags: ['Классика', '4x4']
  },
  {
    id: 'chevy_corvair', name: 'Chevrolet Corvair',
    image: 'https://placehold.co/600x300/111111/ffffff?text=Chevy+Corvair',
    price: 7200, color: '#333333',
    stats: { power: 80, torque: 142, topSpeed: 160, acceleration: 15, handling: 34, offroad: 40 },
    installedParts: [], tags: ['Классика', 'Седан']
  },
  // --- PAGE 2 ---
  {
    id: 'ford_falcon', name: 'Ford Falcon',
    image: 'https://placehold.co/600x300/556B2F/ffffff?text=Ford+Falcon',
    price: 8500, color: '#556B2F',
    stats: { power: 101, torque: 190, topSpeed: 159, acceleration: 14, handling: 34, offroad: 61 },
    installedParts: [], tags: ['Классика', 'Маслкар']
  },
  {
    id: 'renault_alpine', name: 'Renault Alpine A108',
    image: 'https://placehold.co/600x300/0000FF/ffffff?text=Alpine+A108',
    price: 9600, color: '#0000FF',
    stats: { power: 55, torque: 78, topSpeed: 118, acceleration: 16, handling: 80, offroad: 35 },
    installedParts: [], tags: ['Классика', 'Спорт']
  },
  {
    id: 'chevy_apache', name: 'Chevrolet Apache 10',
    image: 'https://placehold.co/600x300/000000/ffffff?text=Chevy+Apache',
    price: 12000, color: '#000000',
    stats: { power: 135, torque: 325, topSpeed: 111, acceleration: 22, handling: 13, offroad: 121 },
    installedParts: [], tags: ['Классика', 'Пикап', '4x4']
  },
  {
    id: 'chevy_elcamino', name: 'Chevrolet El Camino',
    image: 'https://placehold.co/600x300/2E8B57/ffffff?text=El+Camino',
    price: 13700, color: '#2E8B57',
    stats: { power: 148, torque: 285, topSpeed: 165, acceleration: 12, handling: 19, offroad: 70 },
    installedParts: [], tags: ['Классика', 'Маслкар']
  },
  // --- PAGE 3 ---
  {
    id: 'bmw_700', name: 'BMW 700 Sport',
    image: 'https://placehold.co/600x300/CD5C5C/ffffff?text=BMW+700',
    price: 14000, color: '#CD5C5C',
    stats: { power: 40, torque: 56, topSpeed: 160, acceleration: 17, handling: 70, offroad: 50 },
    installedParts: [], tags: ['Классика', 'Спорт']
  },
  {
    id: 'chevy_biscayne', name: 'Chevrolet Biscayne',
    image: 'https://placehold.co/600x300/8B4513/ffffff?text=Biscayne',
    price: 15000, color: '#8B4513',
    stats: { power: 170, torque: 340, topSpeed: 181, acceleration: 11, handling: 30, offroad: 42 },
    installedParts: [], tags: ['Классика', 'Маслкар']
  },
  {
    id: 'ford_f100', name: 'Ford F-100',
    image: 'https://placehold.co/600x300/FFFF00/000000?text=Ford+F-100',
    price: 18900, color: '#FFFF00',
    stats: { power: 130, torque: 310, topSpeed: 115, acceleration: 24, handling: 10, offroad: 115 },
    installedParts: [], tags: ['Классика', 'Пикап', '4x4']
  },
  {
    id: 'bmw_3200', name: 'BMW 3200 CS',
    image: 'https://placehold.co/600x300/FFFFFF/000000?text=BMW+3200',
    price: 19000, color: '#EEEEEE',
    stats: { power: 160, torque: 216, topSpeed: 200, acceleration: 10, handling: 59, offroad: 44 },
    installedParts: [], tags: ['Классика', 'Гран-Туризмо']
  },
  // --- PAGE 4 ---
  {
    id: 'chevy_impala', name: 'Chevrolet Impala',
    image: 'https://placehold.co/600x300/B0C4DE/000000?text=Chevy+Impala',
    price: 20000, color: '#B0C4DE',
    stats: { power: 250, torque: 420, topSpeed: 192, acceleration: 9.5, handling: 21, offroad: 47 },
    installedParts: [], tags: ['Классика', 'Маслкар']
  },
  {
    id: 'ford_galaxie', name: 'Ford Galaxie',
    image: 'https://placehold.co/600x300/000000/ffffff?text=Ford+Galaxie',
    price: 21000, color: '#000000',
    stats: { power: 220, torque: 380, topSpeed: 190, acceleration: 9.8, handling: 22, offroad: 54 },
    installedParts: [], tags: ['Классика', 'Маслкар']
  },
  {
    id: 'chevy_corvette_c1', name: 'Chevrolet Corvette C1',
    image: 'https://placehold.co/600x300/00CED1/000000?text=Corvette+C1',
    price: 21500, color: '#00CED1',
    stats: { power: 195, torque: 310, topSpeed: 165, acceleration: 10, handling: 49, offroad: 45 },
    installedParts: [], tags: ['Классика', 'Спорт']
  },
  {
    id: 'chevy_k10', name: 'Chevrolet K10 4x4',
    image: 'https://placehold.co/600x300/4682B4/ffffff?text=Chevy+K10',
    price: 23500, color: '#4682B4',
    stats: { power: 155, torque: 350, topSpeed: 145, acceleration: 16, handling: 8, offroad: 140 },
    installedParts: [], tags: ['Классика', 'Пикап', '4x4']
  },
  // --- PAGE 5 ---
  {
    id: 'ford_thunderbird', name: 'Ford Thunderbird',
    image: 'https://placehold.co/600x300/000000/ffffff?text=Thunderbird',
    price: 26000, color: '#000000',
    stats: { power: 300, torque: 490, topSpeed: 190, acceleration: 8.5, handling: 20, offroad: 50 },
    installedParts: [], tags: ['Классика', 'Маслкар']
  },
  {
    id: 'bmw_700rs', name: 'BMW 700 RS',
    image: 'https://placehold.co/600x300/FFFFFF/000000?text=BMW+700+RS',
    price: 27000, color: '#FFFFFF',
    stats: { power: 70, torque: 82, topSpeed: 165, acceleration: 14, handling: 74, offroad: 47 },
    installedParts: [], tags: ['Классика', 'Спорт', 'Гоночный']
  },
  {
    id: 'porsche_718', name: 'Porsche 718 RS 60',
    image: 'https://placehold.co/600x300/C0C0C0/000000?text=Porsche+718',
    price: 33000, color: '#C0C0C0',
    stats: { power: 160, torque: 170, topSpeed: 201, acceleration: 8, handling: 81, offroad: 33 },
    installedParts: [], tags: ['Классика', 'Спорт', 'Гоночный']
  },
  {
    id: 'ferrari_250gto', name: 'Ferrari 250 GTO',
    image: 'https://placehold.co/600x300/DC143C/ffffff?text=Ferrari+250+GTO',
    price: 38000, color: '#DC143C',
    stats: { power: 300, torque: 294, topSpeed: 254, acceleration: 6.1, handling: 86, offroad: 31 },
    installedParts: [], tags: ['Классика', 'Суперкар', 'Гоночный']
  },
  // --- PAGE 6 ---
  {
    id: 'ferrari_400', name: 'Ferrari 400 SuperFast',
    image: 'https://placehold.co/600x300/00008B/ffffff?text=Ferrari+400',
    price: 42000, color: '#00008B',
    stats: { power: 340, torque: 350, topSpeed: 252, acceleration: 6.5, handling: 67, offroad: 30 },
    installedParts: [], tags: ['Классика', 'Суперкар']
  },
  {
    id: 'corvette_lemans', name: 'Corvette Le Mans',
    image: 'https://placehold.co/600x300/FFFFFF/000000?text=Corvette+LeMans',
    price: 43500, color: '#FFFFFF',
    stats: { power: 360, torque: 420, topSpeed: 216, acceleration: 7, handling: 57, offroad: 40 },
    installedParts: [], tags: ['Классика', 'Гоночный']
  },
  {
    id: 'ferrari_250gt', name: 'Ferrari 250 GT Lusso',
    image: 'https://placehold.co/600x300/111111/ffffff?text=Ferrari+250+GT',
    price: 44000, color: '#111111',
    stats: { power: 240, torque: 242, topSpeed: 241, acceleration: 7.2, handling: 80, offroad: 29 },
    installedParts: [], tags: ['Классика', 'Гран-Туризмо']
  },
  {
    id: 'ferrari_spserie', name: 'Ferrari SP-Serie',
    image: 'https://placehold.co/600x300/DC143C/ffffff?text=Ferrari+SP',
    price: 50000, color: '#DC143C',
    stats: { power: 290, torque: 280, topSpeed: 239, acceleration: 6.8, handling: 92, offroad: 32 },
    installedParts: [], tags: ['Классика', 'Суперкар', 'Гоночный']
  },

  // --- MODERN ---
  {
    id: 'chevy_spark', name: 'Chevrolet Spark',
    image: 'https://placehold.co/600x300/32CD32/ffffff?text=Spark',
    price: 3700, color: '#32CD32',
    stats: { power: 98, torque: 128, topSpeed: 143, acceleration: 14.5, handling: 71, offroad: 30 },
    installedParts: [], tags: ['Современный', 'Эконом']
  },
  {
    id: 'renault_clio', name: 'Renault Clio 1.5',
    image: 'https://placehold.co/600x300/FF4500/ffffff?text=Renault+Clio',
    price: 5300, color: '#FF4500',
    stats: { power: 90, torque: 220, topSpeed: 181, acceleration: 12, handling: 83, offroad: 32 },
    installedParts: [], tags: ['Современный', 'Хэтчбек']
  },
  {
    id: 'renault_duster', name: 'Renault Duster',
    image: 'https://placehold.co/600x300/8B4513/ffffff?text=Renault+Duster',
    price: 9300, color: '#8B4513',
    stats: { power: 114, torque: 156, topSpeed: 166, acceleration: 13, handling: 47, offroad: 152 },
    installedParts: [], tags: ['Современный', 'Кроссовер', '4x4']
  },
  {
    id: 'bmw_220d', name: 'BMW 220d',
    image: 'https://placehold.co/600x300/C0C0C0/000000?text=BMW+220d',
    price: 12100, color: '#C0C0C0',
    stats: { power: 190, torque: 400, topSpeed: 230, acceleration: 7.1, handling: 97, offroad: 30 },
    installedParts: [], tags: ['Современный', 'Купе']
  },
  {
    id: 'ford_escape', name: 'Ford Escape',
    image: 'https://placehold.co/600x300/8B0000/ffffff?text=Escape',
    price: 12200, color: '#8B0000',
    stats: { power: 180, torque: 240, topSpeed: 190, acceleration: 10, handling: 60, offroad: 129 },
    installedParts: [], tags: ['Современный', 'Кроссовер', '4x4']
  },
  {
    id: 'bmw_x3', name: 'BMW X3 xDrive',
    image: 'https://placehold.co/600x300/778899/ffffff?text=BMW+X3',
    price: 14000, color: '#778899',
    stats: { power: 245, torque: 350, topSpeed: 210, acceleration: 6.8, handling: 70, offroad: 130 },
    installedParts: [], tags: ['Современный', 'Кроссовер', '4x4']
  },
  {
    id: 'chevy_camaro_v1', name: 'Chevrolet Camaro',
    image: 'https://placehold.co/600x300/FFD700/000000?text=Camaro',
    price: 15000, color: '#FFD700',
    stats: { power: 275, torque: 400, topSpeed: 250, acceleration: 5.9, handling: 98, offroad: 27 },
    installedParts: [], tags: ['Современный', 'Маслкар']
  },
  {
    id: 'ford_mustang', name: 'Ford Mustang',
    image: 'https://placehold.co/600x300/FF0000/ffffff?text=Mustang',
    price: 15700, color: '#FF0000',
    stats: { power: 310, torque: 434, topSpeed: 259, acceleration: 5.6, handling: 95, offroad: 29 },
    installedParts: [], tags: ['Современный', 'Маслкар']
  },
  {
    id: 'chevy_silverado', name: 'Chevrolet Silverado',
    image: 'https://placehold.co/600x300/DC143C/ffffff?text=Silverado',
    price: 16000, color: '#DC143C',
    stats: { power: 355, torque: 519, topSpeed: 188, acceleration: 8, handling: 49, offroad: 177 },
    installedParts: [], tags: ['Современный', 'Пикап', '4x4']
  },
  {
    id: 'porsche_macan', name: 'Porsche Macan S',
    image: 'https://placehold.co/600x300/FFFFFF/000000?text=Macan+S',
    price: 18800, color: '#FFFFFF',
    stats: { power: 340, torque: 480, topSpeed: 254, acceleration: 5.1, handling: 88, offroad: 117 },
    installedParts: [], tags: ['Современный', 'Кроссовер', 'Спорт']
  },
  {
    id: 'ford_mustang_gt_2016', name: 'Ford Mustang GT (2016)',
    image: 'https://placehold.co/600x300/B22222/ffffff?text=Mustang+GT',
    price: 18900, color: '#B22222',
    stats: { power: 421, torque: 530, topSpeed: 267, acceleration: 4.8, handling: 95, offroad: 29 },
    installedParts: [], tags: ['Современный', 'Маслкар']
  },
  {
    id: 'porsche_cayman', name: 'Porsche Cayman GT4',
    image: 'https://placehold.co/600x300/FFFF00/000000?text=Porsche+Cayman',
    price: 20700, color: '#FFFF00',
    stats: { power: 385, torque: 420, topSpeed: 295, acceleration: 4.4, handling: 133, offroad: 19 },
    installedParts: [], tags: ['Современный', 'Спорт']
  },
  {
    id: 'porsche_911', name: 'Porsche 911 Carrera',
    image: 'https://placehold.co/600x300/4169E1/ffffff?text=Porsche+911',
    price: 21500, color: '#4169E1',
    stats: { power: 370, torque: 450, topSpeed: 293, acceleration: 4.2, handling: 112, offroad: 28 },
    installedParts: [], tags: ['Современный', 'Спорт']
  },
  {
    id: 'chevy_camaro_ss', name: 'Chevrolet Camaro SS',
    image: 'https://placehold.co/600x300/DC143C/ffffff?text=Camaro+SS',
    price: 22000, color: '#DC143C',
    stats: { power: 455, torque: 617, topSpeed: 269, acceleration: 4.3, handling: 105, offroad: 27 },
    installedParts: [], tags: ['Современный', 'Маслкар']
  },
  {
    id: 'ford_expedition', name: 'Ford Expedition',
    image: 'https://placehold.co/600x300/8B4513/ffffff?text=Expedition',
    price: 22800, color: '#8B4513',
    stats: { power: 375, torque: 510, topSpeed: 235, acceleration: 7, handling: 43, offroad: 144 },
    installedParts: [], tags: ['Современный', 'Внедорожник', '4x4']
  },
  {
    id: 'corvette_stingray', name: 'Corvette Stingray',
    image: 'https://placehold.co/600x300/00008B/ffffff?text=Stingray',
    price: 25500, color: '#00008B',
    stats: { power: 495, torque: 637, topSpeed: 306, acceleration: 3.5, handling: 110, offroad: 23 },
    installedParts: [], tags: ['Современный', 'Суперкар']
  },
  {
    id: 'porsche_cayenne', name: 'Porsche Cayenne S',
    image: 'https://placehold.co/600x300/C0C0C0/000000?text=Cayenne',
    price: 25800, color: '#C0C0C0',
    stats: { power: 440, torque: 550, topSpeed: 252, acceleration: 5.2, handling: 79, offroad: 130 },
    installedParts: [], tags: ['Современный', 'Кроссовер', '4x4']
  },
  {
    id: 'bmw_x5', name: 'BMW X5 M50d',
    image: 'https://placehold.co/600x300/FFFFFF/000000?text=BMW+X5',
    price: 26000, color: '#FFFFFF',
    stats: { power: 400, torque: 760, topSpeed: 250, acceleration: 5.3, handling: 68, offroad: 143 },
    installedParts: [], tags: ['Современный', 'Внедорожник', '4x4']
  },
  {
    id: 'porsche_911_gts', name: 'Porsche 911 GTS',
    image: 'https://placehold.co/600x300/00FFFF/000000?text=911+GTS',
    price: 27900, color: '#00FFFF',
    stats: { power: 450, torque: 550, topSpeed: 306, acceleration: 3.6, handling: 117, offroad: 56 },
    installedParts: [], tags: ['Современный', 'Спорт']
  },
  {
    id: 'ford_fiesta_wrc', name: 'Ford Fiesta S2000',
    image: 'https://placehold.co/600x300/FFFFFF/000000?text=Fiesta+WRC',
    price: 30000, color: '#FFFFFF',
    stats: { power: 240, torque: 340, topSpeed: 215, acceleration: 4.5, handling: 115, offroad: 94 },
    installedParts: [], tags: ['Современный', 'Ралли', '4x4']
  },
  {
    id: 'citroen_ds3', name: 'Citroen DS3 WRC',
    image: 'https://placehold.co/600x300/FF0000/ffffff?text=DS3+WRC',
    price: 31000, color: '#FF0000',
    stats: { power: 300, torque: 400, topSpeed: 240, acceleration: 4.2, handling: 118, offroad: 63 },
    installedParts: [], tags: ['Современный', 'Ралли', '4x4']
  },
  {
    id: 'ferrari_california', name: 'Ferrari California T',
    image: 'https://placehold.co/600x300/FFD700/000000?text=California+T',
    price: 32500, color: '#FFD700',
    stats: { power: 560, torque: 755, topSpeed: 316, acceleration: 3.6, handling: 110, offroad: 26 },
    installedParts: [], tags: ['Современный', 'Суперкар']
  },
  {
    id: 'corvette_z06', name: 'Corvette Z06',
    image: 'https://placehold.co/600x300/FFFFFF/000000?text=Z06',
    price: 33000, color: '#FFFFFF',
    stats: { power: 650, torque: 881, topSpeed: 331, acceleration: 3.2, handling: 113, offroad: 23 },
    installedParts: [], tags: ['Современный', 'Суперкар']
  },
  {
    id: 'ford_gt_2017', name: 'Ford GT (2017)',
    image: 'https://placehold.co/600x300/0000FF/ffffff?text=Ford+GT',
    price: 35000, color: '#0000FF',
    stats: { power: 647, torque: 746, topSpeed: 354, acceleration: 3.0, handling: 124, offroad: 20 },
    installedParts: [], tags: ['Современный', 'Суперкар', 'Гоночный']
  },
  {
    id: 'lambo_huracan_avio', name: 'Huracan Avio',
    image: 'https://placehold.co/600x300/00CED1/000000?text=Huracan',
    price: 35500, color: '#00CED1',
    stats: { power: 610, torque: 560, topSpeed: 325, acceleration: 3.2, handling: 138, offroad: 45 },
    installedParts: [], tags: ['Современный', 'Суперкар']
  },
  {
    id: 'ferrari_488', name: 'Ferrari 488 GTB',
    image: 'https://placehold.co/600x300/FF0000/ffffff?text=488+GTB',
    price: 37000, color: '#FF0000',
    stats: { power: 670, torque: 760, topSpeed: 330, acceleration: 3.0, handling: 147, offroad: 19 },
    installedParts: [], tags: ['Современный', 'Суперкар']
  },
  {
    id: 'lambo_aventador', name: 'Lambo Aventador',
    image: 'https://placehold.co/600x300/FF8C00/ffffff?text=Aventador',
    price: 38000, color: '#FF8C00',
    stats: { power: 700, torque: 690, topSpeed: 350, acceleration: 2.9, handling: 124, offroad: 50 },
    installedParts: [], tags: ['Современный', 'Суперкар']
  },
  {
    id: 'lambo_centenario', name: 'Lambo Centenario',
    image: 'https://placehold.co/600x300/222222/ffffff?text=Centenario',
    price: 43500, color: '#222222',
    stats: { power: 770, torque: 720, topSpeed: 350, acceleration: 2.8, handling: 131, offroad: 45 },
    installedParts: [], tags: ['Современный', 'Гиперкар']
  },
  {
    id: 'ford_baja', name: 'Ford Shelby Baja',
    image: 'https://placehold.co/600x300/000000/ffffff?text=Shelby+Baja',
    price: 45000, color: '#000000',
    stats: { power: 450, torque: 610, topSpeed: 217, acceleration: 5, handling: 53, offroad: 192 },
    installedParts: [], tags: ['Современный', 'Внедорожник', 'Ралли']
  },
  {
    id: 'ferrari_fxxk', name: 'Ferrari FXX-K',
    image: 'https://placehold.co/600x300/FF0000/ffffff?text=FXX-K',
    price: 50000, color: '#FF0000',
    stats: { power: 1050, torque: 900, topSpeed: 341, acceleration: 2.4, handling: 173, offroad: 10 },
    installedParts: [], tags: ['Современный', 'Гиперкар', 'Гоночный']
  }
];

export const SHOP_PARTS: Part[] = [
  // --- Trash Shopito (Tier 1) ---
  { id: 'ts_intercooler_1', name: 'Интеркулер 1', boosts: { power: 1, torque: 1, accelerationPct: 1 }, price: 500, brand: 'Trash Shopito', tier: 1, icon: 'Zap', description: '1 лс, 1 Нм, 1% к разгону' },
  { id: 'ts_shatuny_1', name: 'Шатуны 1', boosts: { power: 9, torque: 6, topSpeed: 2 }, price: 1200, brand: 'Trash Shopito', tier: 1, icon: 'Zap', description: '9 лс, 6 Нм, 2 км/ч' },
  { id: 'ts_kolenval_1', name: 'Коленвал 1', boosts: { power: 3, accelerationPct: 2, topSpeedPct: 2 }, price: 1100, brand: 'Trash Shopito', tier: 1, icon: 'Zap', description: '3 лс, 2% к разгону, 2% к скорости' },
  { id: 'ts_tires_std_1', name: 'Шины Стандарт 1', boosts: { handling: 3, offroad: 3, accelerationPct: 2 }, price: 800, brand: 'Trash Shopito', tier: 1, icon: 'Circle', description: '3 У, 3 П, 2% к разгону' },
  { id: 'ts_tires_race_1', name: 'Шины Гоночные 1', boosts: { handling: 6, offroad: -1, topSpeedPct: 2 }, price: 1500, brand: 'Trash Shopito', tier: 1, icon: 'Circle', description: '6У, -1 П, 2% к скорости' },

  // --- Магазин Запчастей (Tier 1) ---
  { id: 'mz_intake_1', name: 'Впускная система 1', boosts: { power: 16, torque: 19, topSpeed: 1 }, price: 1800, brand: 'Магазин Запчастей', tier: 1, icon: 'Filter', description: '16 лс, 19 Нм, 1 км/ч' },
  { id: 'mz_exhaust_1', name: 'Выпускная система 1', boosts: { powerPct: 2, power: 6, accelerationPct: 1 }, price: 1600, brand: 'Магазин Запчастей', tier: 1, icon: 'Filter', description: '2% лс +6 лс, 1% к разгону' },
  { id: 'mz_diff_sb_1', name: 'Дифференциал СБ 1', boosts: { accelerationPct: 2, offroad: 4 }, price: 1400, brand: 'Магазин Запчастей', tier: 1, icon: 'Disc', description: '2% к разгону, 4 П' },
  { id: 'mz_gearbox_1', name: 'Коробка передач 1', boosts: { topSpeedPct: 6, accelerationPct: 4 }, price: 2000, brand: 'Магазин Запчастей', tier: 1, icon: 'Zap', description: '6% к скорости, 4% к разгону' },
  { id: 'mz_pistons_1', name: 'Поршни 1', boosts: { power: 12, torque: 3, topSpeed: 1 }, price: 1700, brand: 'Магазин Запчастей', tier: 1, icon: 'Zap', description: '12 лс, 3 Нм, 1 км/ч' },
  { id: 'mz_filters_1', name: 'Фильтры 1', boosts: { power: 7, topSpeed: 1 }, price: 600, brand: 'Магазин Запчастей', tier: 1, icon: 'Filter', description: '7 лс, 1 км/ч' },
  { id: 'mz_cam_verkh_1', name: 'Распредвал верховой 1', boosts: { power: 17, topSpeedPct: 3 }, price: 1900, brand: 'Магазин Запчастей', tier: 1, icon: 'Zap', description: '17 лс, 3% к скорости' },
  { id: 'mz_clearance_1', name: 'Увеличение клиренса 1', boosts: { offroad: 6, handling: -1 }, price: 1000, brand: 'Магазин Запчастей', tier: 1, icon: 'Spring', description: '6 П, -1 У' },
  { id: 'mz_shocks_1', name: 'Амортизаторы 1', boosts: { handling: 6, offroad: -1 }, price: 1200, brand: 'Магазин Запчастей', tier: 1, icon: 'Spring', description: '6 У, -1 П' },
  { id: 'mz_winch_1', name: 'Лебёдка 1', boosts: { offroad: 6 }, price: 1100, brand: 'Магазин Запчастей', tier: 1, icon: 'Disc', description: '6 П' },

  // --- Девяточка (Tier 1) ---
  { id: 'd9_brakes_1', name: 'Тормоза 1', boosts: { handling: 5 }, price: 1300, brand: 'Девяточка', tier: 1, icon: 'Disc', description: '5 У' },
  { id: 'd9_flywheel_1', name: 'Маховик 1', boosts: { topSpeedPct: 1, accelerationPct: 2 }, price: 900, brand: 'Девяточка', tier: 1, icon: 'Circle', description: '1% к скорости, 2% к разгону' },
  { id: 'd9_balljoints_1', name: 'Шаровые 1', boosts: { handling: 2 }, price: 500, brand: 'Девяточка', tier: 1, icon: 'Disc', description: '2 У' },
  { id: 'd9_turbo_1', name: 'Турбина 1', boosts: { power: 40, torque: 20, topSpeedPct: 4 }, price: 4000, brand: 'Девяточка', tier: 1, icon: 'Flame', description: '40 лс, 20 Нм, 4% к скорости' },

  // --- ABC (Tier 1) ---
  { id: 'abc_slicks_1', name: 'Слики 1', boosts: { handling: 9, offroad: -4, topSpeedPct: 3 }, price: 2500, brand: 'ABC', tier: 1, icon: 'Circle', description: '9У, -4 П, 3% к скорости' },
  { id: 'abc_offroad_1', name: 'Шины Офф 1', boosts: { offroad: 9, handling: -2, topSpeedPct: 1 }, price: 2500, brand: 'ABC', tier: 1, icon: 'Circle', description: '9П, -2 У, 1% к скорости' },
  { id: 'abc_fuelsys_1', name: 'Топливная система 1', boosts: { power: 14, torque: 15, topSpeed: 2 }, price: 2100, brand: 'ABC', tier: 1, icon: 'Filter', description: '14 лс, 15 Нм, 2 км/ч' },
  { id: 'abc_diff_pt_1', name: 'Дифференциал ПТ 1', boosts: { handling: 2, offroad: 1 }, price: 1500, brand: 'ABC', tier: 1, icon: 'Disc', description: '2 У, 1 П' },
  { id: 'abc_springs_1', name: 'Пружины 1', boosts: { handling: 4 }, price: 1000, brand: 'ABC', tier: 1, icon: 'Spring', description: '4 У' },
  { id: 'abc_lightweight_1', name: 'Облегченные детали 1', boosts: { handling: 3, topSpeed: 2, accelerationPct: 1 }, price: 3000, brand: 'ABC', tier: 1, icon: 'Disc', description: '3У, 2 км/ч, 1% к разгону' },

  // --- Батыр (Tier 1) ---
  { id: 'ba_compressor_1', name: 'Компрессор 1', boosts: { power: 35, torque: 30, topSpeedPct: 3 }, price: 3800, brand: 'Батыр', tier: 1, icon: 'Flame', description: '35 лс, 30 Нм, 3% к скорости' },
  { id: 'ba_cam_niz_1', name: 'Распредвал низовой 1', boosts: { torque: 17, accelerationPct: 3 }, price: 1500, brand: 'Батыр', tier: 1, icon: 'Zap', description: '17 Нм, 3% к разгону' },
  { id: 'ba_cam_uni_1', name: 'Распредвал универс. 1', boosts: { power: 9, torque: 8, accelerationPct: 1 }, price: 1800, brand: 'Батыр', tier: 1, icon: 'Zap', description: '9 лс, 8 Нм, 1% к разгону' },
  { id: 'ba_cv_joint_1', name: 'ШРУС 1', boosts: { handling: 3, offroad: 2 }, price: 800, brand: 'Батыр', tier: 1, icon: 'Disc', description: '3У, 2 П' },
  { id: 'ba_snorkel_1', name: 'Шноркель 1', boosts: { offroad: 3 }, price: 700, brand: 'Батыр', tier: 1, icon: 'Filter', description: '3 П' },

  // --- Sumimoto (Tier 2) ---
  { id: 'su_brakes_2', name: 'Тормоза 2', boosts: { handling: 8 }, price: 4500, brand: 'Sumimoto', tier: 2, icon: 'Disc', description: '8 У' },
  { id: 'su_filters_2', name: 'Фильтры 2', boosts: { power: 14, topSpeed: 1, accelerationPct: 1 }, price: 2000, brand: 'Sumimoto', tier: 2, icon: 'Filter', description: '14 лс, 1 км/ч, 1% к разгону' },
  { id: 'su_crank_2', name: 'Коленвал 2', boosts: { power: 8, accelerationPct: 3 }, price: 3500, brand: 'Sumimoto', tier: 2, icon: 'Zap', description: '8 лс, 3% к разгону' },
  { id: 'su_winch_2', name: 'Лебёдка 2', boosts: { offroad: 10 }, price: 3000, brand: 'Sumimoto', tier: 2, icon: 'Disc', description: '10 П' },
  { id: 'su_gearbox_2', name: 'Коробка передач 2', boosts: { topSpeedPct: 9, accelerationPct: 7 }, price: 8000, brand: 'Sumimoto', tier: 2, icon: 'Zap', description: '9% к скорости, 7% к разгону' },

  // --- Breyton (Tier 2) ---
  { id: 'br_rods_2', name: 'Шатуны 2', boosts: { power: 13, torque: 10, topSpeed: 2 }, price: 4000, brand: 'Breyton', tier: 2, icon: 'Zap', description: '13 лс, 10 Нм, 2 км/ч' },
  { id: 'br_flywheel_2', name: 'Маховик 2', boosts: { topSpeedPct: 3, accelerationPct: 4 }, price: 3200, brand: 'Breyton', tier: 2, icon: 'Circle', description: '3% к скорости, 4% к разгону' },
  { id: 'br_cam_niz_2', name: 'Распредвал низовой 2', boosts: { torque: 40, accelerationPct: 4 }, price: 5000, brand: 'Breyton', tier: 2, icon: 'Zap', description: '40 Нм, 4% к разгону' },
  { id: 'br_fuel_2', name: 'Топливная система 2', boosts: { power: 20, torque: 23, topSpeed: 3 }, price: 6000, brand: 'Breyton', tier: 2, icon: 'Filter', description: '20 лс, 23 Нм, 3 км/ч' },
  { id: 'br_snorkel_2', name: 'Шноркель 2', boosts: { offroad: 6 }, price: 2500, brand: 'Breyton', tier: 2, icon: 'Filter', description: '6 П' },

  // --- DymDymych (Tier 2) ---
  { id: 'dd_tires_uni_2', name: 'Шины Универсал 2', boosts: { handling: 5, offroad: 5 }, price: 4500, brand: 'DymDymych', tier: 2, icon: 'Circle', description: '5 У, 5 П' },
  { id: 'dd_tires_off_2', name: 'Шины Офф 2', boosts: { offroad: 13, handling: -3 }, price: 6500, brand: 'DymDymych', tier: 2, icon: 'Circle', description: '13 П, -3 У' },
  { id: 'dd_diff_pt_2', name: 'Дифференциал ПТ 2', boosts: { handling: 5, offroad: 3, topSpeedPct: 3 }, price: 4000, brand: 'DymDymych', tier: 2, icon: 'Disc', description: '5 У, 3 П, 3% к скорости' },
  { id: 'dd_diff_sb_2', name: 'Дифференциал СБ 2', boosts: { offroad: 6, handling: 2 }, price: 4200, brand: 'DymDymych', tier: 2, icon: 'Disc', description: '6 П, 2 У' },
  { id: 'dd_intake_2', name: 'Впускная система 2', boosts: { power: 21, torque: 27, topSpeed: 2 }, price: 5500, brand: 'DymDymych', tier: 2, icon: 'Filter', description: '21 лс, 27 Нм, 2 км/ч' },

  // --- Volga+ (Tier 2) ---
  { id: 'vp_exhaust_2', name: 'Выпускная система 2', boosts: { powerPct: 3, power: 12 }, price: 5200, brand: 'Volga+', tier: 2, icon: 'Filter', description: '3% лс +12 лс' },
  { id: 'vp_cam_verkh_2', name: 'Распредвал верховой 2', boosts: { power: 40, topSpeedPct: 4 }, price: 7000, brand: 'Volga+', tier: 2, icon: 'Zap', description: '40 лс, 4% к скорости' },
  { id: 'vp_turbo_2', name: 'Турбина 2', boosts: { power: 55, torque: 30, topSpeedPct: 5 }, price: 12000, brand: 'Volga+', tier: 2, icon: 'Flame', description: '55 лс, 30 Нм, 5% к скорости' },
  { id: 'vp_cv_2', name: 'ШРУС 2', boosts: { handling: 6, offroad: 3 }, price: 3000, brand: 'Volga+', tier: 2, icon: 'Disc', description: '6У, 3 П' },
  { id: 'vp_lightweight_2', name: 'Облегченные детали 2', boosts: { handling: 5, topSpeed: 3 }, price: 8000, brand: 'Volga+', tier: 2, icon: 'Disc', description: '5У, 3 км/ч' },

  // --- Topcar (Tier 2) ---
  { id: 'tc_compressor_2', name: 'Компрессор 2', boosts: { power: 48, torque: 49, topSpeedPct: 4 }, price: 11000, brand: 'Topcar', tier: 2, icon: 'Flame', description: '48 лс, 49 Нм, 4% к скорости' },
  { id: 'tc_shocks_2', name: 'Амортизаторы 2', boosts: { handling: 10, offroad: -3 }, price: 4000, brand: 'Topcar', tier: 2, icon: 'Spring', description: '10 У, -3 П' },
  { id: 'tc_cam_uni_2', name: 'Распредвал универс. 2', boosts: { power: 20, torque: 20 }, price: 6500, brand: 'Topcar', tier: 2, icon: 'Zap', description: '20 лс, 20 Нм' },
  { id: 'tc_pistons_2', name: 'Поршни 2', boosts: { power: 22, torque: 9, topSpeed: 3 }, price: 6800, brand: 'Topcar', tier: 2, icon: 'Zap', description: '22 лс, 9 Нм, 3 км/ч' },
  { id: 'tc_clearance_2', name: 'Увеличение клиренса 2', boosts: { offroad: 10, handling: -2 }, price: 3500, brand: 'Topcar', tier: 2, icon: 'Spring', description: '10 П, -2 У' },

  // --- Mugen (Tier 2/3 Mix) ---
  { id: 'mg_bore_2', name: 'Расточка двигателя 2', boosts: { power: 30, torque: 30, accelerationPct: 4 }, price: 15000, brand: 'Mugen', tier: 2, icon: 'Zap', description: '+30 лс, +30 Нм, 4% к разгону' },
  { id: 'mg_slicks_2', name: 'Слики 2', boosts: { handling: 13, offroad: -6 }, price: 9000, brand: 'Mugen', tier: 2, icon: 'Circle', description: '13У, -6 П' },
  { id: 'mg_tires_race_2', name: 'Шины Гоночные 2', boosts: { handling: 9, offroad: -2 }, price: 7000, brand: 'Mugen', tier: 2, icon: 'Circle', description: '9У, -2 П' },
  { id: 'mg_springs_2', name: 'Пружины 2', boosts: { handling: 7 }, price: 3500, brand: 'Mugen', tier: 2, icon: 'Spring', description: '7 У' },
  { id: 'mg_intercooler_2', name: 'Интеркулер 2', boosts: { power: 4, torque: 4, accelerationPct: 1 }, price: 2500, brand: 'Mugen', tier: 2, icon: 'Filter', description: '4 лс, 4 Нм, 1% к разгону' },

  // --- Hennesy (Tier 3) ---
  { id: 'hn_compressor_3', name: 'Компрессор 3', boosts: { power: 64, torque: 65, topSpeedPct: 6 }, price: 25000, brand: 'Hennesy', tier: 3, icon: 'Flame', description: '64 лс, 65 Нм, 6% к скорости' },
  { id: 'hn_cv_3', name: 'ШРУС 3', boosts: { handling: 9, offroad: 5 }, price: 6000, brand: 'Hennesy', tier: 3, icon: 'Disc', description: '9У, 5 П' },
  { id: 'hn_cam_verkh_3', name: 'Распредвал верховой 3', boosts: { power: 63, topSpeedPct: 6 }, price: 18000, brand: 'Hennesy', tier: 3, icon: 'Zap', description: '63 лс, 6% к скорости' },
  { id: 'hn_filters_3', name: 'Фильтры 3', boosts: { power: 23, topSpeed: 3 }, price: 5000, brand: 'Hennesy', tier: 3, icon: 'Filter', description: '23 лс, 3 км/ч' },

  // --- AMG (Tier 3) ---
  { id: 'amg_turbo_3', name: 'Турбина 3', boosts: { power: 75, torque: 43, topSpeedPct: 7 }, price: 30000, brand: 'AMG', tier: 3, icon: 'Flame', description: '75 лс, 43 Нм, 7% к скорости' },
  { id: 'amg_flywheel_3', name: 'Маховик 3', boosts: { topSpeedPct: 6, accelerationPct: 5 }, price: 8000, brand: 'AMG', tier: 3, icon: 'Circle', description: '6% к скорости, 5% к разгону' },
  { id: 'amg_brakes_3', name: 'Тормоза 3', boosts: { handling: 11 }, price: 10000, brand: 'AMG', tier: 3, icon: 'Disc', description: '11 У' },
  { id: 'amg_crank_3', name: 'Коленвал 3', boosts: { power: 16, topSpeedPct: 5 }, price: 12000, brand: 'AMG', tier: 3, icon: 'Zap', description: '16 лс, 5% к скорости' },
  { id: 'amg_snorkel_3', name: 'Шноркель 3', boosts: { offroad: 9 }, price: 5000, brand: 'AMG', tier: 3, icon: 'Filter', description: '9 П' },

  // --- Dunlop (Tier 3) ---
  { id: 'dl_winch_3', name: 'Лебёдка 3', boosts: { offroad: 13 }, price: 8000, brand: 'Dunlop', tier: 3, icon: 'Disc', description: '13 П' },
  { id: 'dl_gearbox_3', name: 'Коробка передач 3', boosts: { topSpeedPct: 13, accelerationPct: 10 }, price: 20000, brand: 'Dunlop', tier: 3, icon: 'Zap', description: '13% к скорости, 10% к разгону' },
  { id: 'dl_fuel_3', name: 'Топливная система 3', boosts: { power: 28, torque: 31 }, price: 15000, brand: 'Dunlop', tier: 3, icon: 'Filter', description: '28 лс, 31 Нм' },
  { id: 'dl_diff_pt_3', name: 'Дифференциал ПТ 3', boosts: { handling: 7, offroad: 4 }, price: 12000, brand: 'Dunlop', tier: 3, icon: 'Disc', description: '7 У, 4 П' },
  { id: 'dl_springs_3', name: 'Пружины 3', boosts: { handling: 10 }, price: 7000, brand: 'Dunlop', tier: 3, icon: 'Spring', description: '10 У' },

  // --- Brabus (Tier 3) ---
  { id: 'bb_shocks_3', name: 'Амортизаторы 3', boosts: { handling: 15, offroad: -5 }, price: 14000, brand: 'Brabus', tier: 3, icon: 'Spring', description: '15 У, -5 П' },
  { id: 'bb_tires_uni_3', name: 'Шины Универсал 3', boosts: { handling: 7, offroad: 7 }, price: 9000, brand: 'Brabus', tier: 3, icon: 'Circle', description: '7 У, 7 П' },
  { id: 'bb_tires_off_3', name: 'Шины Офф 3', boosts: { offroad: 17, handling: -5 }, price: 13000, brand: 'Brabus', tier: 3, icon: 'Circle', description: '17 П, -5 У' },
  { id: 'bb_exhaust_3', name: 'Выпускная система 3', boosts: { power: 18, accelerationPct: 4 }, price: 13000, brand: 'Brabus', tier: 3, icon: 'Filter', description: '+18 лс, 4% к разгону' },
  { id: 'bb_pistons_3', name: 'Поршни 3', boosts: { power: 30, torque: 17 }, price: 16000, brand: 'Brabus', tier: 3, icon: 'Zap', description: '30 лс, 17 Нм' },

  // --- RalliArt & Top End (Tier 3) ---
  { id: 'ra_bore_3', name: 'Расточка двигателя 3', boosts: { power: 43, torque: 43, accelerationPct: 6 }, price: 40000, brand: 'Brabus', tier: 3, icon: 'Zap', description: '+43 лс, +43 Нм, 6% к разгону' },
  { id: 'ra_intercooler_3', name: 'Интеркулер 3', boosts: { power: 6, torque: 5 }, price: 6000, brand: 'RalliArt', tier: 3, icon: 'Filter', description: '6 лс, 5 Нм' },
  { id: 'ra_cam_uni_3', name: 'Распредвал универс. 3', boosts: { power: 31, torque: 32 }, price: 17000, brand: 'RalliArt', tier: 3, icon: 'Zap', description: '31 лс, 32 Нм' },
  { id: 'ra_slicks_3', name: 'Слики 3', boosts: { handling: 20, offroad: -10 }, price: 22000, brand: 'RalliArt', tier: 3, icon: 'Circle', description: '20У, -10 П' },
  { id: 'ra_diff_sb_3', name: 'Дифференциал СБ 3', boosts: { offroad: 9, handling: 3 }, price: 12000, brand: 'RalliArt', tier: 3, icon: 'Disc', description: '9 П, 3 У' },
];

export const TRACKS: Track[] = [
  {
    id: 't1', name: 'Ночной Драг',
    image: 'https://picsum.photos/800/400?grayscale',
    description: 'Прямая трасса, где решает чистая скорость.',
    weights: { power: 0.3, torque: 0.15, topSpeed: 0.35, acceleration: 0.15, handling: 0.05, offroad: 0 },
    weatherModifier: 0.2
  },
  {
    id: 't2', name: 'Тоге Дрифт',
    image: 'https://picsum.photos/800/400?blur=2',
    description: 'Узкие повороты на горном перевале.',
    weights: { power: 0.1, torque: 0.1, topSpeed: 0.1, acceleration: 0.15, handling: 0.5, offroad: 0.05 },
    weatherModifier: 0.8
  },
  {
    id: 't3', name: 'Грунтовое Ралли',
    image: 'https://picsum.photos/800/400?sepia',
    description: 'Грязь, трамплины и гравий.',
    weights: { power: 0.15, torque: 0.15, topSpeed: 0.1, acceleration: 0.1, handling: 0.15, offroad: 0.35 },
    weatherModifier: 1.0
  }
];

export const MOCK_OPPONENTS: Car[] = [
  { id: 'bot1', name: 'Гонщик Джо', image: '', price: 0, color: '#fca5a5',
    stats: { power: 80, torque: 120, topSpeed: 120, acceleration: 18, handling: 30, offroad: 50 }, installedParts: [], tags: ['Бот'] },
  { id: 'bot2', name: 'Королева Скорости', image: '', price: 0, color: '#93c5fd',
    stats: { power: 300, torque: 400, topSpeed: 200, acceleration: 8, handling: 60, offroad: 20 }, installedParts: [], tags: ['Бот'] },
  { id: 'bot3', name: 'Король Дрифта', image: '', price: 0, color: '#d8b4fe',
    stats: { power: 250, torque: 350, topSpeed: 180, acceleration: 9, handling: 100, offroad: 20 }, installedParts: [], tags: ['Бот'] },
  { id: 'bot4', name: 'Чемпион Мира', image: '', price: 0, color: '#ffd700',
    stats: { power: 600, torque: 700, topSpeed: 320, acceleration: 3.5, handling: 140, offroad: 30 }, installedParts: [], tags: ['Бот'] },
];

// --- Система эпох и открытия магазинов ---
// Каждый магазин (brand) открывается в определённом игровом году.
// Магазины без года — стартовые (доступны с начала игры, эпоха 60-х).

export interface ShopInfo {
  brand: string;
  unlockYear: number; // Игровой год открытия
  description?: string;
}

export const SHOPS: ShopInfo[] = [
  { brand: 'Trash Shopito', unlockYear: 1960, description: 'Стартовый магазин' },
  { brand: 'Магазин Запчастей', unlockYear: 1960, description: 'Стартовый магазин' },
  { brand: 'Девяточка', unlockYear: 1960, description: 'Стартовый магазин' },
  { brand: 'ABC', unlockYear: 1960, description: 'Стартовый магазин' },
  { brand: 'Батыр', unlockYear: 1960, description: 'Стартовый магазин' },
  { brand: 'Sumimoto', unlockYear: 1966 },
  { brand: 'Breyton', unlockYear: 1970 },
  { brand: 'DymDymych', unlockYear: 1974 },
  { brand: 'Volga+', unlockYear: 1978 },
  { brand: 'Topcar', unlockYear: 1982 },
  { brand: 'Mugen', unlockYear: 1986 },
  { brand: 'Hennesy', unlockYear: 1992 },
  { brand: 'AMG', unlockYear: 1996 },
  { brand: 'Dunlop', unlockYear: 2000 },
  { brand: 'Brabus', unlockYear: 2004 },
  { brand: 'RalliArt', unlockYear: 2008 },
];

// Эпохи для UI (название + стартовый год)
export const EPOCHS = [
  { year: 1960, label: '60-е' },
  { year: 1966, label: '1966' },
  { year: 1970, label: '1970' },
  { year: 1974, label: '1974' },
  { year: 1978, label: '1978' },
  { year: 1982, label: '1982' },
  { year: 1986, label: '1986' },
  { year: 1992, label: '1992' },
  { year: 1996, label: '1996' },
  { year: 2000, label: '2000' },
  { year: 2004, label: '2004' },
  { year: 2008, label: '2008' },
];

export const getUnlockedBrands = (currentYear: number): Set<string> => {
  return new Set(SHOPS.filter(s => s.unlockYear <= currentYear).map(s => s.brand));
};
