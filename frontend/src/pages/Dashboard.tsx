import { TrendingUp, CheckCircle, Clock, DollarSign, Send, Circle, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog.tsx';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog.tsx';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import {
  createDashboardMonitoringItem,
  createMonitoringCondition,
  fetchConditionDetail,
  fetchDashboardMonitoringItems,
  fetchDashboardStatsSummary,
} from '../api/dashboard';
import type {
  DashboardMonitoringItem,
  DashboardMonitoringCreateResponse,
  DashboardCommandParsedData,
  DashboardParsedConditionChip,
  DashboardStat,
  DashboardStatsSummary,
} from '../types/dashboard';

type PaymentMode = 'ALERT_ONLY' | 'AUTO_PAYMENT';

type ProductDetailDraft = {
  productName: string;
  platform: string;
  options: string; //원래 productDetail
  targetPrice: string;
  monitoringRegisteredAt: string;  //추후 createdAt으로 변경 가능
  paymentMode: PaymentMode;  //추후 mode로 변경 가능
  expiryYear: string;
  expiryMonth: string;
  expiryDay: string;
};

type ApiErrorResponse = {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    detail?: string | null;
  };
};

const getCurrentLocalDateText = () =>
  new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const createProductDetailDraft = (productName = ''): ProductDetailDraft => {
  const now = new Date();

  return {
    productName,
    platform: '',
    options: '',
    targetPrice: '',
    monitoringRegisteredAt: getCurrentLocalDateText(),
    paymentMode: 'ALERT_ONLY',
    expiryYear: String(now.getFullYear()),
    expiryMonth: '',
    expiryDay: '',
  };
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const getExpiryDateText = (draft: ProductDetailDraft) =>
  `${draft.expiryYear}-${draft.expiryMonth.padStart(2, '0')}-${draft.expiryDay.padStart(2, '0')}`;

const buildProductDetailDraftFromParsedData = (parsedData: DashboardCommandParsedData): ProductDetailDraft => {
  const now = new Date();

  return {
    productName: parsedData.productName || '',
    platform: parsedData.platform || '',
    options: parsedData.route || parsedData.options || '',
    targetPrice: parsedData.maxPrice != null ? String(parsedData.maxPrice) : '',
    monitoringRegisteredAt: getCurrentLocalDateText(),
    paymentMode: parsedData.mode || 'ALERT_ONLY',
    expiryYear: String(now.getFullYear()),
    expiryMonth: '',
    expiryDay: '',
  };
};

export default function Dashboard() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [selectedItem, setSelectedItem] = useState<DashboardMonitoringItem | null>(null);
  // 상세 입력 모달에서 사용할 상품 정보를 따로 보관한다.
  const [productDetailDraft, setProductDetailDraft] = useState<ProductDetailDraft>(() =>
    createProductDetailDraft(),
  );
  const [platformIsLocked, setPlatformIsLocked] = useState(false);
  const [pendingPreviewResponse, setPendingPreviewResponse] = useState<DashboardMonitoringCreateResponse | null>(null);
  const [parsedConditionBadges, setParsedConditionBadges] = useState<DashboardParsedConditionChip[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardStatsSummary, setDashboardStatsSummary] = useState<DashboardStatsSummary>({
    monitoringCount: 0,
    completedPaymentCount: 0,
    waitingCount: 0,
    totalSavingsAmount: 0,
  });

  // [수정] 모니터링 목록은 대시보드 전용 타입으로 명시한다.
  const [monitoringItems, setMonitoringItems] = useState<DashboardMonitoringItem[]>([
    {
      conditionId: 1,
      status: 'exploring',
      statusLabel: '탐색 중',
      statusColor: '#5bf0c0',
      product: '인천-오사카 왕복 항공권(테스트)',
      platform: 'naver-flights',
      currentPrice: '₩289,000',
      targetPrice: '₩250,000',
    }
  ]);

  // [추가] 대시보드 상단에 보여줄 핵심 지표 카드의 정보를 담는 배열이다.
  const stats: DashboardStat[] = [ 
    {
      label: '모니터링 중',
      value: String(dashboardStatsSummary.monitoringCount),
      color: 'text-[#5bf0c0]',
      icon: TrendingUp,
    },
    {
      label: '완료된 결제',
      value: String(dashboardStatsSummary.completedPaymentCount),
      color: 'text-[#8ab0d0]',
      icon: CheckCircle,
    },
    {
      label: '조건 대기 중',
      value: String(dashboardStatsSummary.waitingCount),
      color: 'text-[#f0a040]',
      icon: Clock,
    },
    {
      label: '총 절약 금액',
      value: `₩${dashboardStatsSummary.totalSavingsAmount.toLocaleString()}`,
      color: 'text-[#5bf0c0]',
      icon: DollarSign,
    },
  ];

  // [추가] 핵심 지표 수치는 전용 summary API에서 받아온다.
  useEffect(() => {
    const loadDashboardStatsSummary = async () => {
      try {
        const summary = await fetchDashboardStatsSummary();
        setDashboardStatsSummary(summary);
      } catch {
        setDashboardStatsSummary({
          monitoringCount: 0,
          completedPaymentCount: 0,
          waitingCount: 0,
          totalSavingsAmount: 0,
        });
      }
    };

    void loadDashboardStatsSummary();
  }, []);

  // [추가] 대시보드 모니터링 목록만 먼저 시도하고, 실패하면 현재 mock 상태를 유지한다.
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        // 서버에서 받은 목록으로 현재 화면의 모니터링 항목을 전부 교체한다.
        const monitoringList = await fetchDashboardMonitoringItems();
        setMonitoringItems(monitoringList);
      } catch {
        // [추가] 서버 응답이 없을 때는 기존 mock 목록을 유지한다.
        setError('실시간 모니터링 목록을 불러오지 못했습니다. 현재는 로컬 mock 데이터를 표시합니다.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const handleExecuteClick = async (): Promise<void> => {
    const commandText = naturalLanguageInput.trim();

    // 서버 응답을 받아 파싱된 플랫폼은 잠그고, 그렇지 않으면 직접 입력할 수 있게 둔다.
    try {
      const response = await createMonitoringCondition(commandText);
      const parsedData = response.data.parsedData;

      setPlatformIsLocked(Boolean(parsedData.platform));
      setPendingPreviewResponse(response);
      setMissingFields(response.data.missingFields ?? []);
      setParsedConditionBadges(getParsedConditionBadges(parsedData));
      setProductDetailDraft(buildProductDetailDraftFromParsedData(parsedData));
      setShowConfirmDialog(true);
    } catch (error: unknown) {
      const errorResponse = axios.isAxiosError<ApiErrorResponse>(error) ? error.response?.data : null;
      const errorCode = errorResponse?.error?.code;
      const errorMessage = errorResponse?.error?.message;
      //에러 처리는 에러 코드에 따라 구분
      if (errorCode === 'VALIDATION001') {
        await Swal.fire({
          icon: 'warning',
          title: '자연어 입력 필요',
          text: errorMessage || '명령어를 입력해주세요',
          confirmButtonText: '확인',
          confirmButtonColor: '#10b981',
        });
      } else if (errorCode === 'VALIDATION002') {
        await Swal.fire({
          icon: 'warning',
          title: '입력 길이 초과',
          text: errorMessage || '명령어는 500자를 초과할 수 없습니다',
          confirmButtonText: '확인',
          confirmButtonColor: '#10b981',
        });
      }  else if (errorCode === 'COMMAND001') {
        await Swal.fire({
          icon: 'warning',
          title: '쇼핑 관련 명령을 입력해주세요',
          text: errorMessage || '예) 쿠팡, 신발, 9만원 이하, 바로 결제..',
          confirmButtonText: '확인',
          confirmButtonColor: '#10b981',
        });
      } else if (errorCode === 'AI001') {
        await Swal.fire({
          icon: 'warning',
          title: 'AI 응답 지연',
          text: errorMessage || 'AI 응답이 10초를 초과했습니다. 잠시 후 다시 시도해주세요',
          confirmButtonText: '확인',
          confirmButtonColor: '#10b981',
        });
      }
      setPlatformIsLocked(false);
      setPendingPreviewResponse(null);
      setParsedConditionBadges([]);
      setMissingFields([]);
      setProductDetailDraft(createProductDetailDraft(commandText));
    }
  };

  const handleConfirmMonitoring = async () => {
    // 최종 전송 문자열은 상세 입력 폼의 값들만 합쳐 만든다.
    if (missingFields.includes('productName') && !productDetailDraft.productName.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: '상품명 입력 필요',
        text: '상품명을 입력해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#10b981',
      });
      return;
    }

    if (missingFields.includes('route') && !productDetailDraft.options.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: '상품 디테일 입력 필요',
        text: '상품 디테일을 입력해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#10b981',
      });
      return;
    }

    if (missingFields.includes('maxPrice') && !productDetailDraft.targetPrice.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: '목표가 입력 필요',
        text: '목표가를 입력해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#10b981',
      });
      return;
    }

    if (!productDetailDraft.expiryMonth || !productDetailDraft.expiryDay) {
      await Swal.fire({
        icon: 'warning',
        title: '만료일 선택 필요',
        text: '모니터링 만료일의 월과 일을 선택해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#10b981',
      });
      return;
    }
    
    const registrationDate = new Date();
    registrationDate.setHours(0, 0, 0, 0);
    const expiryDate = new Date(
      Number(productDetailDraft.expiryYear),
      Number(productDetailDraft.expiryMonth) - 1,
      Number(productDetailDraft.expiryDay),
    );

    if (expiryDate.getTime() < registrationDate.getTime()) {
      await Swal.fire({
        icon: 'warning',
        title: '만료 날짜 오류',
        text: '모니터링 만료 날짜는 등록일보다 과거일 수 없습니다. 날짜를 다시 선택해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#10b981',
      });
      return;
    }

    if (!platformIsLocked && !productDetailDraft.platform.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: '플랫폼 입력 필요',
        text: '플랫폼을 직접 입력해주세요.',
        confirmButtonText: '확인',
        confirmButtonColor: '#10b981',
      });
      return;
    }

    if (!pendingPreviewResponse) { // 데이터가 없으면 진행하지 않는다는 안전장치 
      return;
    }

    try {
      const result = await createDashboardMonitoringItem({
        commandId: pendingPreviewResponse.data.commandId,
        productName: productDetailDraft.productName.trim(),
        platform: (productDetailDraft.platform.trim() || pendingPreviewResponse.data.parsedData.platform || '') as DashboardMonitoringItem['platform'],
        route: pendingPreviewResponse.data.parsedData.route || undefined,
        productDetail: productDetailDraft.options.trim(),
        targetPrice: productDetailDraft.targetPrice.trim(),
        monitoringRegisteredAt: productDetailDraft.monitoringRegisteredAt,
        paymentMode: productDetailDraft.paymentMode,
        expiryDate: getExpiryDateText(productDetailDraft),
      });

      const refreshedMonitoringItems = await fetchDashboardMonitoringItems();
      setMonitoringItems(refreshedMonitoringItems);
      setNaturalLanguageInput('');
      setError('');

      setShowConfirmDialog(false);
      setProductDetailDraft(createProductDetailDraft());
      setPlatformIsLocked(false);
      setPendingPreviewResponse(null);
      setMissingFields([]);

      await Swal.fire({
        icon: 'success',
        title: '모니터링 시작',
        text: result.message || '모니터링이 시작되었습니다.',
        confirmButtonText: '확인',
        confirmButtonColor: '#10b981',
      });
    } catch (error: unknown) {
      const errorResponse = axios.isAxiosError<ApiErrorResponse>(error) ? error.response?.data : null;
      const errorMessage = errorResponse?.error?.message;

      await Swal.fire({
        icon: 'error',
        title: '모니터링 시작 실패',
        text: errorMessage || '서버에 모니터링 정보를 저장하지 못했습니다.',
        confirmButtonText: '확인',
        confirmButtonColor: '#10b981',
      });
    }
  };
  // 모니터링 항목 클릭 시 상세 정보 다이얼로그 열기
  //any타입에서 -> DashboardMonitoringItem으로 변경
  const handleDetailClick = async (item: DashboardMonitoringItem) => {
    const conditionId = item.conditionId;

    if (conditionId == null) {
      return;
    }

    try {
      // 상세 모달은 목록 데이터가 아니라 선택한 conditionId의 최신 상세값으로 채운다.
      const detail = await fetchConditionDetail(conditionId);
      setSelectedItem({
        ...item,
        conditionId: detail.conditionId ?? conditionId,
        product: detail.product,
        platform: detail.platform,
        currentPrice: detail.currentPrice,
        targetPrice: detail.targetPrice,
        status: detail.status,
        statusLabel: detail.statusLabel ?? item.statusLabel,
        statusColor: detail.statusColor ?? item.statusColor,
      });
    } catch {
      setSelectedItem({
        ...item,
        conditionId,
      });
    } finally {
      setShowDetailDialog(true);
    }
  };

  // 가격 차이 계산 함수
  const calculatePriceDifference = (currentPrice: string, targetPrice: string) => {
    const current = parseInt(currentPrice.replace('₩', '').replace(',', '').replace('-', '0'));
    const target = parseInt(targetPrice.replace('₩', '').replace(',', ''));
    
    if (current === 0) {
      return '가격 수집 중...';
    }
    
    const difference = current - target;
    
    if (difference > 0) {
      return `목표가보다 ₩${difference.toLocaleString()} 높음`;
    } else if (difference < 0) {
      return `목표가보다 ₩${Math.abs(difference).toLocaleString()} 낮음`;
    } else {
      return '목표가와 동일';
    }
  };

  // 플랫폼 이름 변환 함수
  const getPlatformName = (platform: string) => {
    const platformMap: { [key: string]: string } = {
      'naver': '네이버 쇼핑',
      'coupang': '쿠팡',
      '11st': '11번가',
      'gmarket': 'G마켓',
      'auction': '옥션',
      'naver-flights': '네이버 항공',
    };
    return platformMap[platform] || platform;
  };

  // 플랫폼 색상 매핑
  const getPlatformColor = (platform: string) => {
    const colorMap: { [key: string]: string } = {
      'naver': '#03c75a',
      'coupang': '#ff6b6b',
      '11st': '#ff4e00',
      'gmarket': '#03c75a',
      'auction': '#ff4e00',
      'naver-flights': '#03c75a',
    };
    return colorMap[platform] || '#64748b';
  };

  // 파싱이 되었으면 파싱된 플랫폼명을, 아니면 미선택 표시를 한다.
  const getProductPlatformBadgeLabel = () => productDetailDraft.platform.trim() || '미선택';

  // 만료일 선택 옵션을 동적으로 생성하는 함수들
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 90 }, (_, index) => String(currentYear + index));
  };

  const getMonthOptions = () => Array.from({ length: 12 }, (_, index) => String(index + 1));

  const getDayOptions = () => {
    if (!productDetailDraft.expiryMonth) {
      return [];
    }

    const year = Number(productDetailDraft.expiryYear);
    const month = Number(productDetailDraft.expiryMonth);
    const maxDay = getDaysInMonth(year, month);

    return Array.from({ length: maxDay }, (_, index) => String(index + 1));
  };

  // 만료일의 연도/월이 변경될 때, 기존에 선택된 일이 유효한지 검증해서 유효하지 않으면 초기화한다.
  useEffect(() => {
    const year = Number(productDetailDraft.expiryYear);
    const month = Number(productDetailDraft.expiryMonth);
    const maxDay = getDaysInMonth(year, month);
    const currentDay = Number(productDetailDraft.expiryDay);

    if (currentDay > maxDay) {
      setProductDetailDraft((prev) => ({
        ...prev,
        expiryDay: String(maxDay),
      }));
    }
  }, [productDetailDraft.expiryYear, productDetailDraft.expiryMonth, productDetailDraft.expiryDay]);

  // 서버가 내려준 파싱 결과를 화면용 배지 데이터로 정규화한다.
  const getParsedConditionBadges = (parsedData: DashboardCommandParsedData) => {
    const badges: DashboardParsedConditionChip[] = [];

    if (parsedData.platform) {
      badges.push({ label: '플랫폼', value: parsedData.platform });
    }

    if (parsedData.route) {
      badges.push({ label: '경로', value: parsedData.route });
    }

    if (parsedData.maxPrice != null) {
      badges.push({ label: '최대가', value: `₩${Number(parsedData.maxPrice).toLocaleString()}` });
    }

    if (parsedData.mode) {
      badges.push({ label: '결제 모드', value: parsedData.mode === 'AUTO_PAYMENT' ? '자동 결제' : '알람' });
    }

    return badges;
  };

  // 검색어에 따라 필터링된 모니터링 항목 ('완료' 상태 제외)
  const filteredMonitoringItems = monitoringItems
    .filter((item) => item.status !== 'completed')
    .filter((item) => item.product.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-6 bg-gray-100" >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
      </div>
      {/* [추가] 로딩/에러 상태를 상단에 표시해 API 연결 상태를 바로 확인할 수 있게 한다. */}
      {loading && (
        <div className="mb-4 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm text-[#1e40af]">
          대시보드 데이터를 불러오는 중입니다...
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
          {error}
        </div>
      )}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 border-2 border-[#e2e8f0] p-4 px-5 bg-white rounded-lg">
        <p className="col-span-full text-xl font-bold">핵심 지표</p>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-white border-[#e2e8f0] shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[#64748b] text-sm">{stat.label}</span>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Natural Language Shopping Command Input */}
      <Card className="bg-white border-[#e2e8f0] shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-[#0f172a]">자연어 쇼핑 명령</CardTitle>
          <CardDescription className="text-[#64748b]">
            원하는 조건을 자연어로 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Input
              type="text"
              placeholder="예: 네이버 항공에서 인천-오사카 25만원 이하면 바로 결제해줘"
              maxLength={500}
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              className="flex-1 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
            />
            <Button 
              className="bg-[#10b981] text-white hover:bg-[#059669] shadow-md"
              disabled={loading}
              onClick={handleExecuteClick}
            >
              <Send className="w-4 h-4 mr-2" />
              실행
              </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8]">
            <Badge variant="outline" className="border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]">
              GPT 파싱 결과
            </Badge>
            {parsedConditionBadges.length > 0 ? (
              parsedConditionBadges.map((badge) => (
                <Badge
                  key={`${badge.label}-${badge.value}`}
                  variant="outline"
                  className="border-[#cbd5e1] bg-white text-[#0f172a]"
                  style={badge.color ? { borderColor: `${badge.color}40`, color: badge.color } : undefined}
                >
                  <span className="text-[#64748b]">{badge.label}:</span>
                  <span>{badge.value}</span>
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]">
                아직 파싱 결과 없음
              </Badge>
            )}
            <span className="ml-auto">{naturalLanguageInput.length}/500</span>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Monitoring List */}
      <Card className="bg-white border-[#e2e8f0] shadow-sm">
        <CardHeader className="border-b border-[#e2e8f0]">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-[#0f172a]">실시간 모니터링 목록</CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <Input
                type="text"
                placeholder="제품명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#e2e8f0]">
            {filteredMonitoringItems.length > 0 ? (
              filteredMonitoringItems.map((item) => (
                <div 
                  key={item.conditionId} 
                  className="p-5 flex items-center gap-4 hover:bg-[#f8fafc] transition-colors cursor-pointer"
                  onClick={() => handleDetailClick(item)}
                >
                  {/* Status Dot */}
                  <Circle
                    className="w-3 h-3 flex-shrink-0"
                    fill={item.statusColor}
                    color={item.statusColor}
                  />
                  
                  {/* Product Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0f172a] font-medium truncate">{item.product}</p>
                  </div>
                  
                  {/* Current Price */}
                  <div className="text-right">
                    <p className="text-[#64748b] text-xs mb-0.5">현재가</p>
                    <p className="text-[#0f172a] font-semibold">{item.currentPrice}</p>
                  </div>
                  
                  {/* Target Price */}
                  <div className="text-right">
                    <p className="text-[#64748b] text-xs mb-0.5">목표가</p>
                    <p className="text-[#94a3b8] font-semibold">{item.targetPrice}</p>
                  </div>
                  
                  {/* Status Badge */}
                  <Badge
                    variant="outline"
                    className="font-mono"
                    style={{
                      backgroundColor: `${item.statusColor}15`,
                      borderColor: `${item.statusColor}40`,
                      color: item.statusColor,
                    }}
                  >
                    {item.statusLabel}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <p className="text-[#94a3b8]">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 확인 다이얼로그 */}
      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={(open: boolean) => {
          setShowConfirmDialog(open);
          if (!open) {
            setProductDetailDraft(createProductDetailDraft());
            setPlatformIsLocked(false);
            setPendingPreviewResponse(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-lg bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0f172a]">상품 상세 정보 입력</AlertDialogTitle>
            <AlertDialogDescription className="text-[#64748b]">
              파싱된 값은 그대로 사용하고, 필요한 항목만 수정하세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-5 px-6 pb-2">
            <div className="space-y-2">
              <Label htmlFor="product-name" className="text-[#64748b] text-sm">
                상품명
              </Label>
              <Input
                id="product-name"
                value={productDetailDraft.productName}
                readOnly
                className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#64748b] text-sm">플랫폼</Label>
              {platformIsLocked ? (
                <div className="flex items-center gap-2 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                  <Badge
                    variant="outline"
                    className="border-[#cbd5e1] bg-white text-[#0f172a]"
                    style={{
                      borderColor: `${getPlatformColor(productDetailDraft.platform)}40`,
                      color: getPlatformColor(productDetailDraft.platform),
                    }}
                  >
                    {getProductPlatformBadgeLabel()}
                  </Badge>
                  <span className="text-xs text-[#94a3b8]">파싱된 플랫폼을 그대로 사용</span>
                </div>
              ) : (
                <Input
                  id="platform"
                  value={productDetailDraft.platform}
                  onChange={(e) => setProductDetailDraft((prev) => ({ ...prev, platform: e.target.value }))}
                  placeholder="예: 네이버 쇼핑, 쿠팡"
                  className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8]"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-detail" className="text-[#64748b] text-sm">
                상품 디테일
              </Label>
              <Input
                id="product-detail"
                value={productDetailDraft.options}
                onChange={(e) => setProductDetailDraft((prev) => ({ ...prev, options: e.target.value }))}
                placeholder="예: 블랙 색상, 270mm, 정품"
                className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-price" className="text-[#64748b] text-sm">
                목표가
              </Label>
              <Input
                id="target-price"
                value={productDetailDraft.targetPrice}
                onChange={(e) => setProductDetailDraft((prev) => ({ ...prev, targetPrice: e.target.value }))}
                placeholder="예: 250000"
                className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monitoring-registered-at" className="text-[#64748b] text-sm">
                모니터링 등록일
              </Label>
              <Input
                id="monitoring-registered-at"
                value={productDetailDraft.monitoringRegisteredAt}
                readOnly
                className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#64748b] text-sm">결제 모드</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductDetailDraft((prev) => ({ ...prev, paymentMode: 'ALERT_ONLY' }))}
                  className={
                    productDetailDraft.paymentMode === 'ALERT_ONLY'
                      ? 'border-[#f0a040] bg-[#f0a040]/10 text-[#b45309] hover:bg-[#f0a040]/20'
                      : ''
                  }
                >
                  알람
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductDetailDraft((prev) => ({ ...prev, paymentMode: 'AUTO_PAYMENT' }))}
                  className={
                    productDetailDraft.paymentMode === 'AUTO_PAYMENT'
                      ? 'border-[#10b981] bg-[#10b981]/10 text-[#047857] hover:bg-[#10b981]/20'
                      : ''
                  }
                >
                  자동 결제
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#64748b] text-sm">모니터링 만료 날짜</Label>
              <div className="grid grid-cols-3 gap-3">
                <Select
                  value={productDetailDraft.expiryYear}
                  onValueChange={(value) =>
                    setProductDetailDraft((prev) => ({
                      ...prev,
                      expiryYear: value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
                    <SelectValue placeholder="연도" />
                  </SelectTrigger>
                  <SelectContent>
                    {getYearOptions().map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={productDetailDraft.expiryMonth}
                  onValueChange={(value) =>
                    setProductDetailDraft((prev) => ({
                      ...prev,
                      expiryMonth: value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
                    <SelectValue placeholder="월" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={productDetailDraft.expiryDay}
                  onValueChange={(value) =>
                    setProductDetailDraft((prev) => ({
                      ...prev,
                      expiryDay: value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]">
                    <SelectValue placeholder="일" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDayOptions().map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}일
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full px-6 py-2 bg-gray-200 border-[#e2e8f0] text-[#64748b] hover:bg-gray-300">
              취소
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmMonitoring}
              className="rounded-full px-6 py-2 bg-[#10b981] text-white hover:bg-[#059669]"
            >
              모니터링 시작
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white px-6">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">모니터링 상세 정보</DialogTitle>
            <DialogDescription className="text-[#64748b]">
              현재 모니터링 중인 항목의 상세 정보입니다
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="grid gap-5 py-4">
              {/* 상품명 */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">상품명</Label>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                  <p className="text-[#0f172a] font-medium">{selectedItem.product}</p>
                </div>
              </div>

              {/* 플랫폼 */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">플랫폼</Label>
                <div className="flex">
                  <Badge
                    variant="outline"
                    className="text-sm py-1.5 px-3"
                    style={{
                      backgroundColor: `${getPlatformColor(selectedItem.platform)}15`,
                      borderColor: `${getPlatformColor(selectedItem.platform)}40`,
                      color: getPlatformColor(selectedItem.platform),
                    }}
                  >
                    {getPlatformName(selectedItem.platform)}
                  </Badge>
                </div>
              </div>

              {/* 현재 수집 가격 */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">현재 수집 가격</Label>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                  <p className="text-[#0f172a] text-xl font-bold">{selectedItem.currentPrice}</p>
                </div>
              </div>

              {/* 목표 가격 (최대가) */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">목표 가격 (최대가)</Label>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                  <p className="text-[#10b981] text-xl font-bold">{selectedItem.targetPrice}</p>
                </div>
              </div>

              {/* 가격 차이 */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">가격 차이</Label>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                  <p className="text-[#0f172a] font-medium">
                    {calculatePriceDifference(selectedItem.currentPrice, selectedItem.targetPrice)}
                  </p>
                </div>
              </div>

              {/* 모니터링 상태 */}
              <div className="space-y-2">
                <Label className="text-[#64748b] text-sm">모니터링 상태</Label>
                <div className="flex">
                  <Badge
                    variant="outline"
                    className="text-sm py-1.5 px-3"
                    style={{
                      backgroundColor: `${selectedItem.statusColor}15`,
                      borderColor: `${selectedItem.statusColor}40`,
                      color: selectedItem.statusColor,
                    }}
                  >
                    {selectedItem.statusLabel}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              onClick={() => setShowDetailDialog(false)}
              className="bg-[#10b981] text-white hover:bg-[#059669] w-full"
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
