export interface CardCandidate {
  playerName: string;
  year: number;
  cardSet: string;
  cardNumber: string;
  condition: string;
  parallel: string; // "Base", "Refractor", "Gold /2023", etc.
  confidence: number;
}

export interface PriceSource {
  source: string;
  price: number;
  date: string;
}

export interface ScenarioPrediction {
  y1: number;
  y3: number;
  y5: number;
  reasoning: string;
}

export interface Card {
  id: string;
  photo: string; // base64 JPEG thumbnail (max 200KB)
  playerName: string;
  year: number;
  cardSet: string;
  cardNumber: string;
  condition: string;
  parallel: string;
  currentPrice: number;
  priceRange: { low: number; high: number };
  priceSources: PriceSource[];
  predictions: {
    bull: ScenarioPrediction;
    base: ScenarioPrediction;
    bear: ScenarioPrediction;
  };
  notes: string;
  scannedAt: string;
  lastUpdated: string;
  manualEntry: boolean;
  schemaVersion: number;
}

export interface IdentifyResponse {
  candidates: CardCandidate[];
}

export interface PriceResponse {
  estimatedPrice: number;
  priceRange: { low: number; high: number };
  sources: PriceSource[];
  correctedName?: string; // spell-corrected player name
}

export interface PredictResponse {
  bull: ScenarioPrediction;
  base: ScenarioPrediction;
  bear: ScenarioPrediction;
}
