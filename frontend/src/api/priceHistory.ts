import { createApiClient } from './clients/apiClientFactory';

const priceHistoryApi = createApiClient({
  baseURL: import.meta.env.VITE_COMMAND_API_BASE_URL ?? '',
});

import type { PriceHistoryData, PriceHistoryResponse } from '../types/priceHistory';

export async function fetchPriceHistory(
  conditionId: number,
  period?: string,
): Promise<PriceHistoryData> {
  const { data } = await priceHistoryApi.get<PriceHistoryResponse>(
    `/api/prices/${conditionId}/history`,
    { params: { period } },
  );
  if (!data.success) throw new Error(data.message || '가격 히스토리를 불러오지 못했습니다.');
  return data.data;
}
