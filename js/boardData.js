export const COLOR_GROUPS = {
  BROWN: { name: 'Brown', hex: '#8B4513', count: 2 },
  LIGHT_BLUE: { name: 'Light Blue', hex: '#0284c7', count: 2 },
  PINK: { name: 'Pink', hex: '#ec4899', count: 2 },
  ORANGE: { name: 'Orange', hex: '#f97316', count: 3 },
  RED: { name: 'Red', hex: '#ef4444', count: 3 },
  YELLOW: { name: 'Yellow', hex: '#eab308', count: 2 },
  GREEN: { name: 'Green', hex: '#10b981', count: 2 },
  DARK_BLUE: { name: 'Dark Blue', hex: '#1e3a8a', count: 2 },
  RAILROAD: { name: 'Transit Station', hex: '#475569', count: 4 },
  UTILITY: { name: 'Utility / Power', hex: '#64748b', count: 2 }
};

export const DEFAULT_SETTINGS = {
  boardLayout: 'classic40', // 'classic40' (11/row, 9 between each of 4 corners)
  boardTheme: 'classic',   // 'classic' (40-tile reference board) or 'world' (36-tile custom edition)
  jailBailFee: 150,        // $150 to get out on next turn
  stationBaseRent: 50,     // 1 station = $50
  stationStepRent: 50,     // 2 stations = $100, 3 = $150, 4 = $200
  stationPrice: 200,
  startingCash: 1500,
  goReward: 200,
  turnTimerSeconds: 25,     // 25s per player turn (0 = off)
  approvalTimerSeconds: 15, // 15s per approval prompt modal (0 = off)
  bankHouses: 32,
  bankHotels: 18,           // 1.5x scaling from classic 12 to 18 hotels
  aiDifficulty: 'aggressive' // 'standard' (balanced) or 'aggressive' (grandmaster ruthless tycoons)
};

export let gameSettings = { ...DEFAULT_SETTINGS };

export function updateGameSettings(newSettings) {
  gameSettings = { ...gameSettings, ...newSettings };
}

// Markov Landing Probabilities (Custom 36-Tile Markov Chains)
export const TILE_PROBABILITIES_36 = {
  0: 3.1,   // START
  1: 2.1,   // Brown 1
  2: 2.3,   // Chest
  3: 2.2,   // Brown 2
  4: 2.4,   // Tax
  5: 2.9,   // Station 1
  6: 2.3,   // Light Blue 1
  7: 2.4,   // Chance
  8: 2.5,   // Light Blue 2
  9: 3.6,   // JAIL
  10: 2.6,  // Pink 1
  11: 2.7,  // Solar
  12: 2.8,  // Pink 2
  13: 3.1,  // Station 2
  14: 3.2,  // Orange 1
  15: 2.8,  // Chest
  16: 3.3,  // Orange 2
  17: 3.4,  // Orange 3
  18: 3.0,  // FREE STOP
  19: 3.2,  // Red 1
  20: 2.8,  // Chance
  21: 3.1,  // Red 2
  22: 3.3,  // Red 3
  23: 3.0,  // Station 3
  24: 2.9,  // Yellow 1
  25: 2.7,  // Hydro
  26: 2.8,  // Yellow 2
  27: 0.0,  // GO TO JAIL
  28: 2.7,  // Green 1
  29: 2.4,  // Chest
  30: 2.6,  // Green 2
  31: 2.8,  // Station 4
  32: 2.5,  // Chance
  33: 2.2,  // Dark Blue 1
  34: 2.1,  // Tax
  35: 2.6   // Dark Blue 2
};

// Approximate landing distribution for the classic 40-tile board. These values
// are intentionally kept separate from the custom 36-tile edition so the
// strategic heatmap never displays the wrong tile statistics after a theme swap.
export const TILE_PROBABILITIES_40 = {
  0: 3.1, 1: 2.1, 2: 2.3, 3: 2.2, 4: 2.4, 5: 2.9, 6: 2.3, 7: 2.4, 8: 2.5, 9: 2.6,
  10: 3.6, 11: 2.6, 12: 2.7, 13: 2.8, 14: 3.1, 15: 3.2, 16: 3.0, 17: 3.2, 18: 3.3, 19: 3.4,
  20: 3.0, 21: 3.2, 22: 2.8, 23: 3.1, 24: 3.3, 25: 3.0, 26: 2.9, 27: 2.7, 28: 2.8, 29: 2.7,
  30: 0.0, 31: 2.7, 32: 2.4, 33: 2.6, 34: 2.8, 35: 2.2, 36: 2.5, 37: 2.2, 38: 2.1, 39: 2.6
};

export let TILE_PROBABILITIES = TILE_PROBABILITIES_36;

// 36-Tile Custom Edition (10 per row, 8 between each of 4 corners)
export const BOARD_36_WORLD = [
  // Corner 0: START
  { id: 0, name: 'START', type: 'special', iconKey: 'START_ARROW', subtext: 'Collect $200' },
  // Bottom Edge (1-8)
  { id: 1, name: 'Cairo', country: 'Egypt', type: 'property', group: 'BROWN', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgage: 30 },
  { id: 2, name: 'Community Chest', type: 'community-chest', iconKey: 'CHEST', subtext: 'Draw a card' },
  { id: 3, name: 'Mumbai', country: 'India', type: 'property', group: 'BROWN', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgage: 30 },
  { id: 4, name: 'Carbon Tax', type: 'tax', amount: 150, iconKey: 'TAX' },
  { id: 5, name: 'JFK Station', type: 'railroad', group: 'RAILROAD', price: 200, rent: [50, 100, 150, 200], mortgage: 100, iconKey: 'TRAIN' },
  { id: 6, name: 'Buenos Aires', country: 'Argentina', type: 'property', group: 'LIGHT_BLUE', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 },
  { id: 7, name: 'Chance', type: 'chance', iconKey: 'CHANCE', subtext: 'Draw a card' },
  { id: 8, name: 'Bangkok', country: 'Thailand', type: 'property', group: 'LIGHT_BLUE', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgage: 60 },

  // Corner 1: JAIL
  { id: 9, name: 'JAIL', type: 'special', iconKey: 'JAIL', subtext: 'Just Visiting' },
  // Left Edge (10-17)
  { id: 10, name: 'Seoul', country: 'South Korea', type: 'property', group: 'PINK', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 },
  { id: 11, name: 'Solar Grid', type: 'utility', group: 'UTILITY', price: 150, mortgage: 75, iconKey: 'SOLAR' },
  { id: 12, name: 'Rome', country: 'Italy', type: 'property', group: 'PINK', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgage: 80 },
  { id: 13, name: 'Heathrow Station', type: 'railroad', group: 'RAILROAD', price: 200, rent: [50, 100, 150, 200], mortgage: 100, iconKey: 'TRAIN' },
  { id: 14, name: 'Berlin', country: 'Germany', type: 'property', group: 'ORANGE', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  { id: 15, name: 'Community Chest', type: 'community-chest', iconKey: 'CHEST', subtext: 'Draw a card' },
  { id: 16, name: 'Sydney', country: 'Australia', type: 'property', group: 'ORANGE', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  { id: 17, name: 'Toronto', country: 'Canada', type: 'property', group: 'ORANGE', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100 },

  // Corner 2: SAFE ZONE AREA
  { id: 18, name: 'SAFE ZONE', type: 'special', iconKey: 'SAFE_ZONE', subtext: 'Safe Haven' },
  // Top Edge (19-26)
  { id: 19, name: 'Dubai', country: 'UAE', type: 'property', group: 'RED', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  { id: 20, name: 'Chance', type: 'chance', iconKey: 'CHANCE', subtext: 'Draw a card' },
  { id: 21, name: 'Singapore', country: 'Singapore', type: 'property', group: 'RED', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  { id: 22, name: 'Tokyo', country: 'Japan', type: 'property', group: 'RED', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgage: 120 },
  { id: 23, name: 'Dubai Station', type: 'railroad', group: 'RAILROAD', price: 200, rent: [50, 100, 150, 200], mortgage: 100, iconKey: 'TRAIN' },
  { id: 24, name: 'Amsterdam', country: 'Netherlands', type: 'property', group: 'YELLOW', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 },
  { id: 25, name: 'Hydro Power', type: 'utility', group: 'UTILITY', price: 150, mortgage: 75, iconKey: 'WATER' },
  { id: 26, name: 'Hong Kong', country: 'Hong Kong', type: 'property', group: 'YELLOW', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgage: 140 },

  // Corner 3: GO TO JAIL
  { id: 27, name: 'GO TO JAIL', type: 'special', iconKey: 'POLICE', subtext: 'Arrested!' },
  // Right Edge (28-35)
  { id: 28, name: 'Paris', country: 'France', type: 'property', group: 'GREEN', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 },
  { id: 29, name: 'Community Chest', type: 'community-chest', iconKey: 'CHEST', subtext: 'Draw a card' },
  { id: 30, name: 'London', country: 'UK', type: 'property', group: 'GREEN', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgage: 160 },
  { id: 31, name: 'Haneda Station', type: 'railroad', group: 'RAILROAD', price: 200, rent: [50, 100, 150, 200], mortgage: 100, iconKey: 'TRAIN' },
  { id: 32, name: 'Chance', type: 'chance', iconKey: 'CHANCE', subtext: 'Draw a card' },
  { id: 33, name: 'Geneva', country: 'Switzerland', type: 'property', group: 'DARK_BLUE', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgage: 175 },
  { id: 34, name: 'Wealth Tax', type: 'tax', amount: 100, iconKey: 'DIAMOND' },
  { id: 35, name: 'Monaco', country: 'Monaco', type: 'property', group: 'DARK_BLUE', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgage: 200 }
];

// 40-Tile Classic Edition matching the supplied reference board.
export const BOARD_40_CLASSIC = [
  { id: 0, name: 'GO', type: 'special', iconKey: 'START_ARROW', subtext: 'Collect $200' },
  { id: 1, name: 'Mediterranean Avenue', type: 'property', group: 'BROWN', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgage: 30 },
  { id: 2, name: 'Community Chest', type: 'community-chest', iconKey: 'CHEST', subtext: 'Draw a card' },
  { id: 3, name: 'Baltic Avenue', type: 'property', group: 'BROWN', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgage: 30 },
  { id: 4, name: 'Income Tax', type: 'tax', amount: 200, iconKey: 'TAX' },
  { id: 5, name: 'Reading Railroad', type: 'railroad', group: 'RAILROAD', price: 200, rent: [25, 50, 100, 200], mortgage: 100, iconKey: 'TRAIN' },
  { id: 6, name: 'Oriental Avenue', type: 'property', group: 'LIGHT_BLUE', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 },
  { id: 7, name: 'Chance', type: 'chance', iconKey: 'CHANCE', subtext: 'Draw a card' },
  { id: 8, name: 'Vermont Avenue', type: 'property', group: 'LIGHT_BLUE', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 },
  { id: 9, name: 'Connecticut Avenue', type: 'property', group: 'LIGHT_BLUE', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgage: 60 },
  { id: 10, name: 'JAIL', type: 'special', iconKey: 'JAIL', subtext: 'Just Visiting' },
  { id: 11, name: 'St. Charles Place', type: 'property', group: 'PINK', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 },
  { id: 12, name: 'Electric Company', type: 'utility', group: 'UTILITY', price: 150, mortgage: 75, iconKey: 'SOLAR' },
  { id: 13, name: 'States Avenue', type: 'property', group: 'PINK', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 },
  { id: 14, name: 'Virginia Avenue', type: 'property', group: 'PINK', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgage: 80 },
  { id: 15, name: 'Pennsylvania Railroad', type: 'railroad', group: 'RAILROAD', price: 200, rent: [25, 50, 100, 200], mortgage: 100, iconKey: 'TRAIN' },
  { id: 16, name: 'St. James Place', type: 'property', group: 'ORANGE', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  { id: 17, name: 'Community Chest', type: 'community-chest', iconKey: 'CHEST', subtext: 'Draw a card' },
  { id: 18, name: 'Tennessee Avenue', type: 'property', group: 'ORANGE', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 },
  { id: 19, name: 'New York Avenue', type: 'property', group: 'ORANGE', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100 },
  { id: 20, name: 'FREE PARKING', type: 'special', iconKey: 'SAFE_ZONE', subtext: 'Safe Haven' },
  { id: 21, name: 'Kentucky Avenue', type: 'property', group: 'RED', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  { id: 22, name: 'Chance', type: 'chance', iconKey: 'CHANCE', subtext: 'Draw a card' },
  { id: 23, name: 'Indiana Avenue', type: 'property', group: 'RED', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 },
  { id: 24, name: 'Illinois Avenue', type: 'property', group: 'RED', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgage: 120 },
  { id: 25, name: 'B. & O. Railroad', type: 'railroad', group: 'RAILROAD', price: 200, rent: [25, 50, 100, 200], mortgage: 100, iconKey: 'TRAIN' },
  { id: 26, name: 'Atlantic Avenue', type: 'property', group: 'YELLOW', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 },
  { id: 27, name: 'Ventnor Avenue', type: 'property', group: 'YELLOW', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 },
  { id: 28, name: 'Water Works', type: 'utility', group: 'UTILITY', price: 150, mortgage: 75, iconKey: 'WATER' },
  { id: 29, name: 'Marvin Gardens', type: 'property', group: 'YELLOW', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgage: 140 },
  { id: 30, name: 'GO TO JAIL', type: 'special', iconKey: 'POLICE', subtext: 'Arrested!' },
  { id: 31, name: 'Pacific Avenue', type: 'property', group: 'GREEN', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 },
  { id: 32, name: 'North Carolina Avenue', type: 'property', group: 'GREEN', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 },
  { id: 33, name: 'Community Chest', type: 'community-chest', iconKey: 'CHEST', subtext: 'Draw a card' },
  { id: 34, name: 'Pennsylvania Avenue', type: 'property', group: 'GREEN', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgage: 160 },
  { id: 35, name: 'Short Line', type: 'railroad', group: 'RAILROAD', price: 200, rent: [25, 50, 100, 200], mortgage: 100, iconKey: 'TRAIN' },
  { id: 36, name: 'Chance', type: 'chance', iconKey: 'CHANCE', subtext: 'Draw a card' },
  { id: 37, name: 'Park Place', type: 'property', group: 'DARK_BLUE', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgage: 175 },
  { id: 38, name: 'Luxury Tax', type: 'tax', amount: 100, iconKey: 'DIAMOND' },
  { id: 39, name: 'Boardwalk', type: 'property', group: 'DARK_BLUE', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgage: 200 }
];

export let BOARD_TILES = BOARD_36_WORLD;

export function getCurrentBoardTiles() {
  if (gameSettings.boardTheme === 'classic') {
    return BOARD_40_CLASSIC;
  }
  return BOARD_36_WORLD;
}

export function reloadActiveBoard() {
  BOARD_TILES = getCurrentBoardTiles();
  TILE_PROBABILITIES = BOARD_TILES.length === 40 ? TILE_PROBABILITIES_40 : TILE_PROBABILITIES_36;
  return BOARD_TILES;
}
