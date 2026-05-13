import shoppingApiClient from './shoppingAxios';
import type { PriceHistoryData, PriceHistoryResponse } from '../types/priceHistory';

export async function fetchPriceHistory(
  conditionId: number,
  period?: string,
): Promise<PriceHistoryData> {
  const { data } = await shoppingApiClient.get<PriceHistoryResponse>(
    `/api/prices/${conditionId}/history`,
    { params: { period } },
  );
  return data.data;
}
