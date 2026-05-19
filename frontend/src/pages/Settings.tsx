import { useEffect, useState } from 'react';
import { Bell, Wallet, Send, CreditCard, Mail, MessageSquare, Zap, Check, ChevronRight, ChevronDown, Settings as SettingsIcon, Eye, EyeOff, User, Shield, Moon } from 'lucide-react';
import { Switch } from '../components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { changeAuthPassword, fetchAuthMe } from '../api/auth';

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

export default function Settings() {
  const [paymentMode, setPaymentMode] = useState<'alert' | 'auto'>('auto');
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramChatId, setTelegramChatId] = useState('123456789');
  const [email, setEmail] = useState('leon.kim@example.com');
  const [monthlyLimit, setMonthlyLimit] = useState('5000000');
  const [perTxLimit, setPerTxLimit] = useState('1000000');
  const [allowedPlatforms, setAllowedPlatforms] = useState<string[]>(['naver', 'coupang', '11st', 'gmarket']);
  // ── DND ──
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('07:00');
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'payment'>('account');

  const platformOptions = [
    { id: 'naver-shopping', label: '네이버 쇼핑' },
    { id: 'aliexpress', label: '알리 익스프레스' },
    { id: 'naver-flight', label: '네이버 항공' },
  ];

  const togglePlatform = (id: string) => {
    setAllowedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const tabs = [
    { id: 'account' as const, label: '계정', icon: User },
    { id: 'notifications' as const, label: '알림', icon: Bell },
    { id: 'payment' as const, label: '결제', icon: CreditCard },
  ];

  // ── Profile edit ──
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  // 2026-05-18 수정 8: 계정탭은 빈 문자열로 시작하고 auth/me 응답이 오면 닉네임과 이메일을 채운다.
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileWalletAddress, setProfileWalletAddress] = useState('0x8a9d3B7c45E6F2A1b8C4D5e6f7A8b9C0d1E2F3a4');
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // ── Password change ──
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // 2026-05-18 수정 12: 비밀번호 변경 요청 중에는 중복 제출을 막기 위해 로딩 상태를 둔다.
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [visiblePwd, setVisiblePwd] = useState<Record<string, boolean>>({});
  // ── Delete account ──
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  const deleteReasonOptions = [
    { value: 'hard-to-use', label: '사용이 불편해요' },
    { value: 'not-needed', label: '더 이상 필요하지 않아요' },
    { value: 'expensive', label: '수수료가 부담돼요' },
    { value: 'other-service', label: '다른 서비스로 갈아탈게요' },
    { value: 'etc', label: '기타' },
  ];

  const resetDeleteFields = () => {
    setDeletePassword('');
    setDeleteReason('');
  };

  // 2026-05-18 수정 5: 계정탭 진입 시 8081 /api/v1/auth/me를 호출해 닉네임과 이메일을 현재 로그인 사용자 값으로 갱신한다.
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsProfileLoading(true);

      try {
        const profile = await fetchAuthMe();

        if (!isMounted || !profile) {
          return;
        }

        setProfileName(profile.name);
        setProfileEmail(profile.email);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error(error);
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteAccount = () => {
    // TODO: call DELETE /api/v1/members/{id} with { password: deletePassword, reason: deleteReason }
    setShowDeleteDialog(false);
    resetDeleteFields();
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    resetDeleteFields();
  };

  const togglePwdVisibility = (field: string) => {
    setVisiblePwd((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const formatPrice = (price: string) => `₩${parseInt(price).toLocaleString()}`;

  const handleProfileSave = () => {
    // TODO: call PUT /api/v1/members/{id} with { name: profileName, walletAddress: profileWalletAddress }
    setShowProfileSheet(false);
  };

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // 2026-05-18 수정 13: 비밀번호 변경은 auth 서버의 /api/v1/auth/password로 보내고 성공 시에만 다이얼로그를 닫는다.
  const handlePasswordSave = async () => {
    if (isPasswordSaving) {
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsPasswordSaving(true);

    try {
      const message = await changeAuthPassword({
        currentPassword,
        newPassword,
      });

      // 2026-05-18 수정 15: 비밀번호 변경 완료 안내도 서버가 내려준 message를 그대로 화면에 띄운다.
      alert(message);
      setShowPasswordDialog(false);
      resetPasswordFields();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordDialog(false);
    resetPasswordFields();
  };

  const handleNotificationsSave = () => {
    // TODO: call PUT /api/v1/settings with { telegramEnabled, telegramChatId, emailEnabled, email, dndEnabled, dndStart, dndEnd }
  };

  const handleSettingsSave = () => {
    // TODO: call PUT /api/v1/settings with { walletAddress, monthlyLimit, perTxLimit, allowedPlatforms }
  };

  return (
    <div className="w-full bg-[#F8FAFC] dark:bg-slate-950 min-h-screen font-sans text-[#0F172A] dark:text-slate-50">
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-[820px] mx-auto space-y-6">

          {/* ═══════════ Page Header ═══════════ */}
          <div className="mb-8 md:mb-12 flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] text-white shrink-0">
              <SettingsIcon className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] dark:text-slate-50">설정</h1>
              <p className="text-[#475569] dark:text-slate-400 mt-1 font-medium">계정 정보와 서비스 환경을 설정합니다</p>
            </div>
          </div>

          {/* ═══════════ Tab Bar ═══════════ */}
          <div className="relative">
            <div className="flex bg-white dark:bg-slate-800 rounded-t-[1.5rem]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? 'text-[#6366F1] dark:text-indigo-400'
                        : 'text-[#94A3B8] dark:text-slate-500 hover:text-[#64748b] dark:hover:text-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#6366F1] dark:text-indigo-400' : ''}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {/* Active underline */}
            <div className="relative h-0.5 bg-[#E2E8F0] dark:bg-slate-700">
              <div
                className="absolute bottom-0 h-0.5 bg-[#6366F1] dark:bg-indigo-400 rounded-full transition-all duration-300"
                style={{
                  left: `${(tabs.findIndex(t => t.id === activeTab) / tabs.length) * 100 + 10 / tabs.length}%`,
                  width: `${80 / tabs.length}%`,
                }}
              />
            </div>
          </div>

          {/* ═══════════ Account Tab ═══════════ */}
          {activeTab === 'account' && (
            <>
              {/* ═══════════ Summary Stats ═══════════ */}
              <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] border border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-[#E2E8F0] dark:divide-slate-700">
                  <div className="py-5 text-center">
                    <p className="text-[11px] font-medium text-[#94A3B8] dark:text-slate-500 tracking-wide">지갑 상태</p>
                    <p className="text-xl font-extrabold text-[#0F172A] dark:text-slate-50 mt-1.5 flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#5bf0c0]" />
                      연결됨
                    </p>
                  </div>
                  <div className="py-5 text-center">
                    <p className="text-[11px] font-medium text-[#94A3B8] dark:text-slate-500 tracking-wide">건당 한도</p>
                    <p className="text-xl font-extrabold text-[#0F172A] dark:text-slate-50 mt-1.5">
                      {formatPrice(perTxLimit)}
                    </p>
                  </div>
                  <div className="py-5 text-center">
                    <p className="text-[11px] font-medium text-[#94A3B8] dark:text-slate-500 tracking-wide">월간 한도</p>
                    <p className="text-xl font-extrabold text-[#0F172A] dark:text-slate-50 mt-1.5">
                      {formatPrice(monthlyLimit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Card */}
              <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem] overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-5">
                  <Avatar className="w-14 h-14 rounded-2xl border-2 border-[#E2E8F0] dark:border-slate-700">
                    <AvatarFallback className="bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white text-lg font-bold rounded-2xl">
                      {getInitials(profileName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-[#0F172A] dark:text-slate-50">
                      {isProfileLoading ? '불러오는 중...' : profileName || '닉네임 없음'}
                    </p>
                    <p className="text-sm text-[#64748b] dark:text-slate-400 truncate">
                      {isProfileLoading ? '이메일을 불러오는 중...' : profileEmail || '이메일 없음'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfileSheet(true)}
                    className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-bold text-[#6366F1] dark:text-indigo-400 bg-[#EEF2FF] dark:bg-indigo-500/10 rounded-xl hover:bg-[#E0E7FF] dark:hover:bg-indigo-500/20 transition-colors shrink-0"
                  >
                    프로필 편집
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>

              {/* Security Card */}
              <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem] gap-4">
                <CardHeader className="px-6 pt-5 pb-0">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#6366F1]" />
                    <CardTitle className="text-[#0F172A] dark:text-slate-50">보안</CardTitle>
                  </div>
                  <CardDescription className="text-[#64748b] dark:text-slate-400">
                    계정 보안 설정을 관리합니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pt-0 pb-5 space-y-0">
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] dark:bg-indigo-500/10 flex items-center justify-center border border-[#6366F1]/10">
                        <span className="text-sm">🔒</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-slate-50">비밀번호</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasswordDialog(true)}
                    className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-bold text-[#6366F1] dark:text-indigo-400 bg-[#EEF2FF] dark:bg-indigo-500/10 rounded-xl hover:bg-[#E0E7FF] dark:hover:bg-indigo-500/20 transition-colors"
                  >
                    변경
                    <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* ═══════════ Delete Account ═══════════ */}
              <Card className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem] overflow-hidden">
                <div className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center border border-red-200 dark:border-red-500/20 shrink-0">
                      <span className="text-base">⚠️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#EF4444] dark:text-red-400">회원 탈퇴</p>
                      <p className="text-[12px] text-[#94A3B8] dark:text-slate-500 mt-0.5">계정을 삭제하면 모든 데이터가 영구 소멸됩니다</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      className="shrink-0 px-4 h-9 text-xs font-bold text-[#EF4444] dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/50 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      탈퇴
                    </button>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ═══════════ Notifications Tab ═══════════ */}
          {activeTab === 'notifications' && (
            <>
            <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#6366F1]" />
                  <CardTitle className="text-[#0F172A] dark:text-slate-50">알림 설정</CardTitle>
                </div>
                <CardDescription className="text-[#64748b] dark:text-slate-400">
                  알림을 받을 채널을 설정하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                {/* ── Telegram ── */}
                <div className="py-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] dark:bg-indigo-500/10 flex items-center justify-center border border-[#6366F1]/10">
                        <MessageSquare className="w-4 h-4 text-[#6366F1] dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-slate-50">텔레그램</p>
                        <p className="text-[11px] text-[#94A3B8] dark:text-slate-500">Chat ID로 알림 수신</p>
                      </div>
                    </div>
                    <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
                  </div>

                  {telegramEnabled && (
                    <div className="mt-3 ml-12 flex gap-2">
                      <Input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="Chat ID"
                        className="flex-1 bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl h-9 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#E2E8F0] dark:border-slate-700 text-[#6366F1] dark:text-indigo-400 bg-[#EEF2FF] dark:bg-indigo-500/10 hover:bg-[#E0E7FF] dark:hover:bg-indigo-500/20 rounded-xl h-9 text-xs"
                      >
                        <Send className="w-3 h-3 mr-1.5" />
                        테스트
                      </Button>
                    </div>
                  )}
                </div>

                <Separator className="bg-[#F1F5F9] dark:bg-slate-700/50" />

                {/* ── Email ── */}
                <div className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] dark:bg-indigo-500/10 flex items-center justify-center border border-[#6366F1]/10">
                        <Mail className="w-4 h-4 text-[#6366F1] dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-slate-50">이메일</p>
                        <p className="text-[11px] text-[#94A3B8] dark:text-slate-500">등록된 이메일로 알림 수신</p>
                      </div>
                    </div>
                    <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                  </div>

                  {emailEnabled && (
                    <div className="mt-3 ml-12 flex gap-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl h-9 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#E2E8F0] dark:border-slate-700 text-[#6366F1] dark:text-indigo-400 bg-[#EEF2FF] dark:bg-indigo-500/10 hover:bg-[#E0E7FF] dark:hover:bg-indigo-500/20 rounded-xl h-9 text-xs"
                      >
                        <Send className="w-3 h-3 mr-1.5" />
                        테스트
                      </Button>
                    </div>
                  )}
              </div>

              <Separator className="bg-[#F1F5F9] dark:bg-slate-700/50" />

              {/* ── DND ── */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] dark:bg-indigo-500/10 flex items-center justify-center border border-[#6366F1]/10">
                      <Moon className="w-4 h-4 text-[#6366F1] dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A] dark:text-slate-50">방해 금지</p>
                      <p className="text-[11px] text-[#94A3B8] dark:text-slate-500">설정된 시간 동안 알림을 차단합니다</p>
                    </div>
                  </div>
                  <Switch checked={dndEnabled} onCheckedChange={setDndEnabled} />
                </div>

                {dndEnabled && (
                  <div className="mt-3 ml-12 flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] font-medium text-[#64748b] dark:text-slate-400 mb-1 block">시작 시간</label>
                      <Input
                        type="time"
                        value={dndStart}
                        onChange={(e) => setDndStart(e.target.value)}
                        className="bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl h-9 text-sm"
                      />
                    </div>
                    <span className="text-[#94A3B8] dark:text-slate-500 pb-2 text-sm">~</span>
                    <div className="flex-1">
                      <label className="text-[11px] font-medium text-[#64748b] dark:text-slate-400 mb-1 block">종료 시간</label>
                      <Input
                        type="time"
                        value={dndEnd}
                        onChange={(e) => setDndEnd(e.target.value)}
                        className="bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl h-9 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* ── Save Button (tab bottom) ── */}
          <Button
            onClick={handleNotificationsSave}
            className="w-full bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] hover:to-[#4338CA] hover:-translate-y-0.5 rounded-xl h-12 text-base font-bold shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-300 border-none"
          >
            저장
          </Button>
            </>
          )}

          {/* ═══════════ Payment Tab ═══════════ */}
          {activeTab === 'payment' && (
            <>
              <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#6366F1]" />
                    <CardTitle className="text-[#0F172A] dark:text-slate-50">기본 결제 모드</CardTitle>
                  </div>
                  <CardDescription className="text-[#64748b] dark:text-slate-400">
                    조건 충족 시 결제 여부를 전역으로 설정합니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-0 pt-0">
                  {/* ── 알림만 ── */}
                  <button
                    onClick={() => setPaymentMode('alert')}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 hover:bg-[#F8FAFC] dark:hover:bg-slate-900/50"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      paymentMode === 'alert'
                        ? 'bg-[#6366F1] text-white shadow-[0_4px_10px_-4px_rgba(99,102,241,0.4)]'
                        : 'bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 border border-[#6366F1]/10'
                    }`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-bold transition-colors ${
                        paymentMode === 'alert' ? 'text-[#6366F1] dark:text-indigo-400' : 'text-[#0F172A] dark:text-slate-50'
                      }`}>
                        알림만
                      </p>
                      <p className="text-[12px] text-[#64748b] dark:text-slate-400 mt-0.5">조건 충족 시 알림만 발송하고 결제는 직접 진행</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      paymentMode === 'alert'
                        ? 'border-[#6366F1]'
                        : 'border-[#CBD5E1] dark:border-slate-600'
                    }`}>
                      {paymentMode === 'alert' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
                      )}
                    </div>
                  </button>

                  {/* ── 자동결제 ── */}
                  <button
                    onClick={() => setPaymentMode('auto')}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 hover:bg-[#F8FAFC] dark:hover:bg-slate-900/50"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      paymentMode === 'auto'
                        ? 'bg-[#6366F1] text-white shadow-[0_4px_10px_-4px_rgba(99,102,241,0.4)]'
                        : 'bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 border border-[#6366F1]/10'
                    }`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-bold transition-colors ${
                        paymentMode === 'auto' ? 'text-[#6366F1] dark:text-indigo-400' : 'text-[#0F172A] dark:text-slate-50'
                      }`}>
                        자동결제
                      </p>
                      <p className="text-[12px] text-[#64748b] dark:text-slate-400 mt-0.5">조건 충족 시 즉시 결제가 실행됩니다</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      paymentMode === 'auto'
                        ? 'border-[#6366F1]'
                        : 'border-[#CBD5E1] dark:border-slate-600'
                    }`}>
                      {paymentMode === 'auto' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
                      )}
                    </div>
                  </button>
                </CardContent>
              </Card>

              {/* ── 결제 한도 ── */}
              <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#6366F1]" />
                    <CardTitle className="text-[#0F172A] dark:text-slate-50">결제 한도</CardTitle>
                  </div>
                  <CardDescription className="text-[#64748b] dark:text-slate-400">
                    건당 및 월간 결제 한도를 설정하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-0">
                  {/* ── Per-Transaction Limit ── */}
                  <div className="py-4 first:pt-0">
                    <p className="text-sm font-bold text-[#0F172A] dark:text-slate-50 mb-2">건당 결제 한도</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] dark:text-slate-400 font-medium text-sm">₩</span>
                      <Input
                        type="text"
                        value={perTxLimit}
                        onChange={(e) => setPerTxLimit(e.target.value)}
                        placeholder="1,000,000"
                        className="pl-7 bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl h-9 text-sm"
                      />
                    </div>
                    <p className="text-[11px] text-[#94A3B8] dark:text-slate-500 mt-1.5">1회 결제 시 최대 금액을 설정합니다</p>
                  </div>

                  <Separator className="bg-[#F1F5F9] dark:bg-slate-700/50" />

                  {/* ── Monthly Limit ── */}
                  <div className="py-4">
                    <p className="text-sm font-bold text-[#0F172A] dark:text-slate-50 mb-2">월간 결제 한도</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] dark:text-slate-400 font-medium text-sm">₩</span>
                      <Input
                        type="text"
                        value={monthlyLimit}
                        onChange={(e) => setMonthlyLimit(e.target.value)}
                        placeholder="5,000,000"
                        className="pl-7 bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl h-9 text-sm"
                      />
                    </div>
                    <p className="text-[11px] text-[#94A3B8] dark:text-slate-500 mt-1.5">설정된 한도를 초과하면 결제가 제한됩니다</p>
                  </div>
                </CardContent>
              </Card>

              {/* ── 허용 플랫폼 ── */}
              <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛒</span>
                    <CardTitle className="text-[#0F172A] dark:text-slate-50">허용 플랫폼</CardTitle>
                  </div>
                  <CardDescription className="text-[#64748b] dark:text-slate-400">
                    결제를 허용할 쇼핑 플랫폼을 선택하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-0">
                  <div className="flex flex-wrap gap-2.5 py-1">
                    {platformOptions.map((platform) => {
                      const isSelected = allowedPlatforms.includes(platform.id);
                      return (
                        <button
                          key={platform.id}
                          onClick={() => togglePlatform(platform.id)}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                            isSelected
                              ? 'bg-[#EEF2FF] dark:bg-indigo-500/10 text-[#6366F1] dark:text-indigo-400 border-2 border-[#6366F1] dark:border-indigo-400'
                              : 'bg-[#F8FAFC] dark:bg-slate-900 text-[#64748b] dark:text-slate-400 border-2 border-[#E2E8F0] dark:border-slate-700 hover:border-[#6366F1]/40 hover:text-[#6366F1]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {platform.label}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* PBM Wallet */}
              <Card className="bg-white dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 shadow-[0_2px_12px_rgb(15,23,42,0.04)] rounded-[1.5rem]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#6366F1]" />
                    <CardTitle className="text-[#0F172A] dark:text-slate-50">PBM 지갑 설정</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-0">
                  {/* ── Wallet Address ── */}
                  <div className="py-4 first:pt-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Save Button (tab bottom) ── */}
              <Button
                onClick={handleSettingsSave}
                className="w-full bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] hover:to-[#4338CA] hover:-translate-y-0.5 rounded-xl h-12 text-base font-bold shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-300 border-none"
              >
                저장
              </Button>
            </>
          )}

        </div>
      </section>

      {/* ═══════════ Profile Edit Dialog ═══════════ */}
      <Dialog open={showProfileSheet} onOpenChange={setShowProfileSheet}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-extrabold text-[#0F172A] dark:text-slate-50">프로필 편집</h2>
            <p className="text-sm text-[#64748b] dark:text-slate-400 mt-1">이름과 이메일을 변경할 수 있습니다</p>
          </div>

          {/* Form */}
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">닉네임</label>
              <Input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">PBM 지갑 주소</label>
              <Input
                type="text"
                value={profileWalletAddress}
                onChange={(e) => setProfileWalletAddress(e.target.value)}
                placeholder="지갑 주소를 입력하세요"
                className="bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowProfileSheet(false)}
              className="flex-1 border-[#E2E8F0] dark:border-slate-700 text-[#64748b] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-xl h-11 text-sm font-bold"
            >
              취소
            </Button>
            <Button
              onClick={handleProfileSave}
              className="flex-1 bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] hover:to-[#4338CA] rounded-xl h-11 text-sm font-bold shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-300"
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Password Change Dialog ═══════════ */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-extrabold text-[#0F172A] dark:text-slate-50">비밀번호 변경</h2>
            <p className="text-sm text-[#64748b] dark:text-slate-400 mt-1">안전한 비밀번호로 정기적으로 변경해주세요</p>
          </div>

          {/* Form */}
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">현재 비밀번호</label>
              <div className="relative">
                <Input
                  type={visiblePwd['current'] ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePwdVisibility('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748b] dark:hover:text-slate-300 transition-colors"
                >
                  {visiblePwd['current'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">새 비밀번호</label>
              <div className="relative">
                <Input
                  type={visiblePwd['new'] ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상, 영문/숫자/특수문자 포함"
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePwdVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748b] dark:hover:text-slate-300 transition-colors"
                >
                  {visiblePwd['new'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">새 비밀번호 확인</label>
              <div className="relative">
                <Input
                  type={visiblePwd['confirm'] ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePwdVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748b] dark:hover:text-slate-300 transition-colors"
                >
                  {visiblePwd['confirm'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6 pt-2">
            <Button
              variant="outline"
              onClick={handlePasswordCancel}
              disabled={isPasswordSaving}
              className="flex-1 border-[#E2E8F0] dark:border-slate-700 text-[#64748b] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-xl h-11 text-sm font-bold"
            >
              취소
            </Button>
            <Button
              onClick={handlePasswordSave}
              disabled={isPasswordSaving}
              className="flex-1 bg-gradient-to-r from-[#6366F1] dark:from-indigo-500 to-[#4F46E5] dark:to-indigo-600 text-white hover:from-[#4F46E5] hover:to-[#4338CA] rounded-xl h-11 text-sm font-bold shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transition-all duration-300"
            >
              {isPasswordSaving ? '변경 중...' : '변경'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Delete Account Dialog ═══════════ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-extrabold text-[#EF4444] dark:text-red-400 flex items-center gap-2">
              ⚠️ 회원 탈퇴
            </h2>
            <p className="text-sm text-[#64748b] dark:text-slate-400 mt-1 leading-relaxed">
              삭제된 계정은 <span className="font-bold text-[#EF4444] dark:text-red-400">복구할 수 없으며</span>, 모든 결제 내역과 설정 정보가 영구적으로 소멸됩니다.
            </p>
          </div>

          {/* Form */}
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">비밀번호</label>
              <div className="relative">
                <Input
                  type={visiblePwd['delete'] ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 placeholder:text-[#94A3B8] focus-visible:border-[#6366F1] focus-visible:ring-[#6366F1]/50 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePwdVisibility('delete')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748b] dark:hover:text-slate-300 transition-colors"
                >
                  {visiblePwd['delete'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] dark:text-slate-50">탈퇴 사유</label>
              <div className="relative">
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-50 rounded-xl text-sm appearance-none focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/50"
                >
                  <option value="" disabled>탈퇴 사유를 선택하세요</option>
                  {deleteReasonOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6 pt-2">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              className="flex-1 border-[#E2E8F0] dark:border-slate-700 text-[#64748b] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-xl h-11 text-sm font-bold"
            >
              취소
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={!deletePassword || !deleteReason}
              className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] disabled:bg-[#FCA5A5] disabled:cursor-not-allowed rounded-xl h-11 text-sm font-bold shadow-[0_4px_14px_rgba(239,68,68,0.25)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)] transition-all duration-300 border-none"
            >
              탈퇴하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
