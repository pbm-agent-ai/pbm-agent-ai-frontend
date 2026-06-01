// ─── 유튜버 리뷰 영상 ─────────────────────────────────────────

/** 리뷰 영상에서 추출된 제품 정보 */
export interface YoutubeReviewProduct {
  rank: number;
  productName: string;
  brand: string;
  pros: string[];
  cons: string[];
  verdict: string;
  recommendedFor: string;
}

/** 유튜버 리뷰 영상 단건 */
export interface YoutubeReviewVideo {
  id: number;
  videoId: string;
  videoUrl: string;
  youtuberName: string;
  language: string;
  isGenerated: boolean;
  totalDuration: number;
  categoryMain: string;
  categorySub: string;
  analyzedTextStartTime: number;
  products: YoutubeReviewProduct[];
  createdAt: string;
  updatedAt: string;
}

/** GET /api/v1/youtube/reviews 응답 */
export interface YoutubeReviewListResponse {
  success: boolean;
  data: YoutubeReviewVideo[];
  message: string;
}
