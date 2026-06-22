export type PlantType = 'chestnut' | 'understory' | 'companion' | 'other';

export type StockType = 'seedling' | 'grafted' | 'tissue_culture' | 'unknown';

export type GraftStatus =
  | 'not_applicable'
  | 'not_grafted'
  | 'planned'
  | 'grafted'
  | 'failed_regraft_needed';

export type PlantingStatus = 'planted' | 'planned';

export interface Plant {
  id: string;
  label: string;
  plantType: PlantType;
  species: string;
  variety: string;
  stockType: StockType;
  graftStatus: GraftStatus;
  scionVariety: string;
  plannedGraftVariety: string;
  status: PlantingStatus;
  yearPlanted: number | null;
  rowLabel: string;
  lat: number | null;
  lng: number | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export type NewPlant = Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>;

export interface CheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  vigor: number | null; // 1 (poor/declining) - 5 (excellent/thriving)
  note: string;
  author: string;
  createdAt: number;
}

export type NewCheckIn = Omit<CheckIn, 'id' | 'createdAt'>;

export interface MapOverlayConfig {
  imageUrl: string;
  north: number;
  south: number;
  east: number;
  west: number;
  opacity: number;
}

export const PLANT_TYPE_LABELS: Record<PlantType, string> = {
  chestnut: 'Chestnut tree',
  understory: 'Understory shrub',
  companion: 'Companion tree',
  other: 'Other plant'
};

export const STOCK_TYPE_LABELS: Record<StockType, string> = {
  seedling: 'Seedling',
  grafted: 'Grafted',
  tissue_culture: 'Tissue culture',
  unknown: 'Unknown'
};

export const GRAFT_STATUS_LABELS: Record<GraftStatus, string> = {
  not_applicable: 'N/A',
  not_grafted: 'Not grafted',
  planned: 'Graft planned',
  grafted: 'Grafted',
  failed_regraft_needed: 'Graft failed — needs re-graft'
};
