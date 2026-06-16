import { createApiClient } from './clients/apiClientFactory';
import type {
  CategoryListResponse,
  RecommendationListResponse,
  RecommendationDetailResponse,
} from '@/types/recommendation';

const apiClient = createApiClient({ baseURL: import.meta.env.VITE_PRICE_API_BASE_URL ?? '' });

// ─── 백엔드 응답 타입 ─────────────────────────────────────────────────────────

interface BackendProduct {
  rank: number;
  imageUrls?: string[];
  productName: string;
  brand: string;
  pros: string[];
  cons: string[];
  verdict?: string;
  recommendedFor?: string;
}

interface BackendReview {
  id: number;
  videoId: string;
  youtuberName: string;
  categoryMain: string;
  categorySub: string;
  products: BackendProduct[];
  analyzedAt?: string;
  createdAt?: string;
}

interface BackendResponse {
  success: boolean;
  data: BackendReview[];
  message: string;
}

// ─── 유틸 함수 ───────────────────────────────────────────────────────────────

/** 문자열에서 결정적(deterministic) 정수 해시를 생성한다. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // 32비트 정수로 변환
  }
  return Math.abs(hash);
}

/** categorySub enum → 한국어 이름 매핑 */
const CATEGORY_NAME_MAP: Record<string, string> = {
  // 가전제품 서브카테고리
  FOOD_PROCESSOR: '음식물 처리기',
  WET_VACUUM: '습식 청소기',
  ROBOT_VACUUM: '로봇 청소기',
  STICK_VACUUM: '스틱 청소기',
  AIR_PURIFIER: '공기청정기',
  WASHING_MACHINE: '세탁기',
  REFRIGERATOR: '냉장고',
  MICROWAVE: '전자레인지',
  DISHWASHER: '식기세척기',
  COFFEE_MACHINE: '커피머신',
  AIR_CONDITIONER: '에어컨',
  DEHUMIDIFIER: '제습기',
  // IT/전자제품 서브카테고리
  LAPTOP: '노트북',
  SMARTPHONE: '스마트폰',
  TABLET: '태블릿',
  MONITOR: '모니터',
  KEYBOARD: '키보드',
  MOUSE: '마우스',
  HEADPHONE: '헤드폰',
  EARPHONE: '이어폰',
  SPEAKER: '스피커',
  CAMERA: '카메라',
  TV: 'TV',
  // 기타
  FITNESS: '피트니스',
  FOOD: '식품',
  BEAUTY: '뷰티',
  FASHION: '패션',
  SPORTS: '스포츠',
  BOOK: '도서',
  TOY: '장난감',
  PET: '반려동물',
};

function getCategoryName(categorySub: string): string {
  return CATEGORY_NAME_MAP[categorySub] ?? categorySub;
}

/** YouTube 동영상 URL 생성 */
function buildVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// ─── API 함수 ────────────────────────────────────────────────────────────────

/** 추천 카테고리 목록을 조회한다. (categorySub 기준 탭 분류) */
export async function fetchRecommendationCategories(): Promise<CategoryListResponse> {
  const { data } = await apiClient.get<BackendResponse>('/api/v1/youtube/reviews');

  const reviews: BackendReview[] = data.data ?? [];

  // categorySub 기준으로 집계
  const categoryMap = new Map<string, { productCount: number; lastDate: string; categoryMain: string }>();

  reviews.forEach((review) => {
    const key = review.categorySub;
    const existing = categoryMap.get(key);
    const reviewDate = review.analyzedAt ?? review.createdAt ?? new Date().toISOString();

    if (!existing) {
      categoryMap.set(key, {
        productCount: review.products.length,
        lastDate: reviewDate,
        categoryMain: review.categoryMain,
      });
    } else {
      existing.productCount += review.products.length;
      if (reviewDate > existing.lastDate) {
        existing.lastDate = reviewDate;
      }
    }
  });

  const categories = Array.from(categoryMap.entries()).map(([categoryId, info]) => ({
    categoryId,
    categoryName: getCategoryName(categoryId),
    description: `${getCategoryName(categoryId)} 분야 유튜버 리뷰 기반 추천`,
    productCount: info.productCount,
    lastAnalysisDate: info.lastDate,
  }));

  return {
    success: true,
    data: {
      categories,
      totalCategories: categories.length,
    },
    message: '카테고리 목록 조회 성공',
  };
}

/** 특정 카테고리의 추천 상품 목록을 조회한다. (category = categorySub 값) */
export async function fetchRecommendationItems(category: string): Promise<RecommendationListResponse> {
  const { data } = await apiClient.get<BackendResponse>('/api/v1/youtube/reviews', {
    params: { categorySub: category },
  });

  const reviews: BackendReview[] = data.data ?? [];

  // 상품명 기준으로 중복 제거 후 대표 순위 및 대표 리뷰어 선택
  const productMap = new Map<
    string,
    {
      rank: number;
      imageUrls: string[];
      brand: string;
      pros: string[];
      cons: string[];
      youtuberName: string;
      videoId: string;
      analyzedAt: string;
    }
  >();

  reviews.forEach((review) => {
    review.products.forEach((product) => {
      const key = product.productName;
      if (!productMap.has(key)) {
        productMap.set(key, {
          rank: product.rank,
          imageUrls: product.imageUrls ?? [],
          brand: product.brand,
          pros: product.pros,
          cons: product.cons,
          youtuberName: review.youtuberName,
          videoId: review.videoId,
          analyzedAt: review.analyzedAt ?? review.createdAt ?? new Date().toISOString(),
        });
      }
    });
  });

  const recommendations = Array.from(productMap.entries()).map(([productName, info]) => ({
    productId: hashString(productName),
    rank: info.rank,
    imageUrls: info.imageUrls,
    productName,
    brand: info.brand,
    pros: info.pros.join(', '),
    cons: info.cons.join(', '),
    youtuber: info.youtuberName,
    videoUrl: buildVideoUrl(info.videoId),
    analysisDate: info.analyzedAt,
  }));

  // 순위 기준으로 정렬
  recommendations.sort((a, b) => a.rank - b.rank);

  const lastDate =
    reviews.length > 0
      ? (reviews[0].analyzedAt ?? reviews[0].createdAt ?? new Date().toISOString())
      : new Date().toISOString();

  return {
    success: true,
    data: {
      category,
      categoryName: getCategoryName(category),
      lastAnalysisDate: lastDate,
      recommendations,
      totalElements: recommendations.length,
      totalPages: 1,
      currentPage: 0,
    },
    message: '추천 상품 목록 조회 성공',
  };
}

/**
 * @deprecated fetchRecommendationItems / fetchRecommendationDetail 사용.
 * 레거시 YoutubeReviewVideo[] 형태로 반환.
 */
export async function fetchYoutubeReviews(params: {
  categoryMain: string;
  categorySub: string;
  youtuber: string;
}): Promise<import('@/types/recommendation').YoutubeReviewListResponse> {
  const { data } = await apiClient.get<{ success: boolean; data: import('@/types/recommendation').YoutubeReviewVideo[]; message: string }>('/api/v1/youtube/reviews', { params });
  return data;
}

/** 특정 추천 상품의 상세 정보를 조회한다. (유튜버 다중 리뷰 포함, category = categorySub 값) */
export async function fetchRecommendationDetail(
  category: string,
  productId: number,
): Promise<RecommendationDetailResponse> {
  const { data } = await apiClient.get<BackendResponse>('/api/v1/youtube/reviews', {
    params: { categorySub: category },
  });

  const reviews: BackendReview[] = data.data ?? [];

  // productId(해시)에 매핑되는 상품명 찾기
  let targetProductName: string | null = null;
  let targetRank = 1;
  let targetBrand = '';

  outer: for (const review of reviews) {
    for (const product of review.products) {
      if (hashString(product.productName) === productId) {
        targetProductName = product.productName;
        targetRank = product.rank;
        targetBrand = product.brand;
        break outer;
      }
    }
  }

  if (!targetProductName) {
    throw new Error(`상품을 찾을 수 없습니다. productId=${productId}`);
  }

  // 같은 상품명을 가진 모든 리뷰를 모아 다중 유튜버 리뷰 생성
  const youtuberReviews = reviews
    .filter((review) => review.products.some((p) => p.productName === targetProductName))
    .map((review) => {
      const product = review.products.find((p) => p.productName === targetProductName)!;
      return {
        youtuber: review.youtuberName,
        videoUrl: buildVideoUrl(review.videoId),
        pros: product.pros.join(', '),
        cons: product.cons.join(', '),
        analysisDate: review.analyzedAt ?? review.createdAt ?? new Date().toISOString(),
      };
    });

  // 대표 리뷰 (첫 번째 리뷰의 pros/cons를 기본값으로 사용)
  const primaryReview = youtuberReviews[0];
  const now = new Date().toISOString();

  return {
    success: true,
    data: {
      productId,
      category,
      categoryName: getCategoryName(category),
      rank: targetRank,
      productName: targetProductName,
      brand: targetBrand,
      pros: primaryReview?.pros ?? '',
      cons: primaryReview?.cons ?? '',
      youtuberReviews,
      analysisDate: primaryReview?.analysisDate ?? now,
      createdAt: now,
      updatedAt: now,
    },
    message: '추천 상품 상세 조회 성공',
  };
}
