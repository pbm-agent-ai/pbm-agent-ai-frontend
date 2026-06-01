import priceApiClient from './PriceAxios.ts';
import type { YoutubeReviewListResponse } from '@/types/recommendation';

/** GET /api/v1/youtube/reviews — 유튜버 리뷰 목록 조회 */
export async function fetchYoutubeReviews(params: {
  categoryMain: string;
  categorySub: string;
  youtuber: string;
}): Promise<YoutubeReviewListResponse> {
  const { data } = await priceApiClient.get<YoutubeReviewListResponse>('/api/v1/youtube/reviews', { params });
  return data;
}
