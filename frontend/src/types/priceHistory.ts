export interface PriceHistoryEntry {
  price: number;
  originalPrice: number;
  currency: string;
  isLowestPrice: boolean;
  source: string;
  productUrl: string;
  collectedAt: string;
}

export interface PriceHistoryData {
  conditionId: number;
  keyword: string;
  platform: string;
  maxPrice: number;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  priceHistory: PriceHistoryEntry[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

export interface PriceHistoryResponse {
  success: boolean;
  data: PriceHistoryData;
  message: string;
}

export interface ConditionOption {
  conditionId: number;
  label: string;
  platform: string;
  targetPrice: number;
}
