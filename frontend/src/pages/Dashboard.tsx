import { TrendingUp, CheckCircle, Clock, DollarSign, Send, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const goToConditionManagement = () => {
    // 추후 라우트 확정 시 경로 업데이트
    navigate('/conditions');
  };

  const stats = [
    { label: '모니터링 중', value: '12', color: 'text-[#5bf0c0]', icon: TrendingUp },
    { label: '완료된 결제', value: '47', color: 'text-[#8ab0d0]', icon: CheckCircle },
    { label: '조건 대기 중', value: '5', color: 'text-[#f0a040]', icon: Clock },
    { label: '총 절약 금액', value: '₩1,240,000', color: 'text-[#5bf0c0]', icon: DollarSign },
  ];

  const monitoringItems = [
    {
      id: 1,
      status: 'exploring',
      statusLabel: '탐색 중',
      statusColor: '#5bf0c0',
      product: '인천-오사카 왕복 항공권',
      currentPrice: '₩289,000',
      targetPrice: '₩250,000',
    },
    {
      id: 2,
      status: 'met',
      statusLabel: '조건 충족',
      statusColor: '#4a90e2',
      product: 'Apple AirPods Pro 2세대',
      currentPrice: '₩298,000',
      targetPrice: '₩300,000',
    },
    {
      id: 3,
      status: 'waiting',
      statusLabel: '대기 중',
      statusColor: '#f0a040',
      product: 'LG 그램 17인치 노트북',
      currentPrice: '₩1,890,000',
      targetPrice: '₩1,750,000',
    },
    {
      id: 4,
      status: 'completed',
      statusLabel: '완료',
      statusColor: '#6b7280',
      product: '나이키 에어맥스 270',
      currentPrice: '₩149,000',
      targetPrice: '₩150,000',
    },
    {
      id: 5,
      status: 'exploring',
      statusLabel: '탐색 중',
      statusColor: '#5bf0c0',
      product: '서울-제주 왕복 항공권',
      currentPrice: '₩87,000',
      targetPrice: '₩80,000',
    },
  ];

  const parsedConditions = [
    { label: 'platform', value: 'naver-flights', color: '#4a90e2' },
    { label: 'route', value: '인천-오사카', color: '#9b59b6' },
    { label: 'max-price', value: '₩250,000', color: '#5bf0c0' },
    { label: 'mode', value: 'auto-payment', color: '#f0a040' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-4">대시 보드</h1>
      <p className="text-muted-foreground">실시간 모니터 현황</p>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              className="flex-1 bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#10b981] focus-visible:ring-[#10b981]/50"
            />
            <Button className="bg-[#10b981] text-white hover:bg-[#059669] shadow-md">
              <Send className="w-4 h-4 mr-2" />
              실행
            </Button>
          </div>

          {/* Parsed Condition Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#64748b] text-xs">GPT 파싱 결과:</span>
            {parsedConditions.map((condition, index) => (
              <Badge
                key={index}
                variant="outline"
                className="font-mono border"
                style={{
                  backgroundColor: `${condition.color}15`,
                  borderColor: `${condition.color}40`,
                  color: condition.color,
                }}
              >
                {condition.label}: {condition.value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Monitoring List */}
      <Card className="bg-white border-[#e2e8f0] shadow-sm">
        <CardHeader className="border-b border-[#e2e8f0]">
          <CardTitle className="text-[#0f172a]">실시간 모니터링 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#e2e8f0]">
            {monitoringItems.map((item) => (
              <div key={item.id} className="p-5 flex items-center gap-4 hover:bg-[#f8fafc] transition-colors">
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
            ))}
          </div>
        </CardContent>
      </Card>
      <Button
              type="button"
              onClick={goToConditionManagement}
              className="w-full rounded-lg border border-[#d1fae5] bg-[#ecfdf5] py-2 text-sm text-[#059669] hover:bg-[#d1fae5] font-semibold"
            >
              더보기
      </Button>
    </div>
  );
}