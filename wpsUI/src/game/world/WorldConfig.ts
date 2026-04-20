export const MAP_WIDTH = 20
export const MAP_HEIGHT = 20
export const TILE_WIDTH = 64
export const TILE_HEIGHT = 32

export const BUILDING_POSITIONS = {
  MarketPlace:     { col: 10, row: 3  },
  BankOffice:      { col: 3,  row: 10 },
  CivicAuthority:  { col: 16, row: 10 },
} as const

export const PARCEL_POSITIONS: Array<{ col: number; row: number }> = [
  { col: 5,  row: 14 }, { col: 7,  row: 14 }, { col: 9,  row: 14 },
  { col: 11, row: 14 }, { col: 13, row: 14 }, { col: 15, row: 14 },
  { col: 5,  row: 16 }, { col: 7,  row: 16 }, { col: 9,  row: 16 },
  { col: 11, row: 16 }, { col: 13, row: 16 }, { col: 15, row: 16 },
  { col: 5,  row: 18 }, { col: 7,  row: 18 }, { col: 9,  row: 18 },
  { col: 11, row: 18 }, { col: 13, row: 18 }, { col: 15, row: 18 },
  { col: 6,  row: 13 }, { col: 14, row: 13 },
]

export const AGENT_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6,
  0x1abc9c, 0xe67e22, 0x27ae60, 0x2980b9, 0x8e44ad,
  0xc0392b, 0x16a085, 0xd35400, 0x7f8c8d, 0xf1c40f,
  0x2c3e50, 0xe91e63, 0x00bcd4, 0x8bc34a, 0xff5722,
]

export const SEASON_COLORS: Record<string, number> = {
  PREPARATION: 0x8B6914,
  PLANTING:    0xa8d5a2,
  GROWTH:      0x27ae60,
  HARVEST:     0xf1c40f,
}

export const ACTIVITY_DESTINATION: Record<string, keyof typeof BUILDING_POSITIONS | 'parcel'> = {
  'DoVitalsForSelf':             'parcel',
  'Resting':                     'parcel',
  'HarvestCrops':                'parcel',
  'PlantCrop':                   'parcel',
  'PrepareLand':                 'parcel',
  'SellCrop':                    'MarketPlace',
  'ObtainALoan':                 'BankOffice',
  'PayDebts':                    'BankOffice',
  'LookForAPlaceToWorkForOther': 'MarketPlace',
  'MakeAHousehold':              'parcel',
}

export function isoToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  }
}
