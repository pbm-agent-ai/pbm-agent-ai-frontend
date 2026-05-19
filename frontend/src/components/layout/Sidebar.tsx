import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, LogOut, Monitor, Moon, Settings as SettingsIcon, Sun, Zap, Menu, X } from 'lucide-react';
import { getStoredThemePreference, persistThemePreference, type ThemePreference } from '@/theme';
import { logoutAuth } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

// 2026-05-08: Sidebar palette를 Dashboard와 맞추고, 중앙 메뉴 정렬 및 유튜브 스타일 2단계 테마 드롭다운을 추가한다.
// 2026-05-08: 반응형 레이아웃 적용: 좁은 화면에서는 중앙 메뉴를 숨기고 전체 화면을 덮는 모바일 메뉴를 표시한다.
export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isThemeSubmenuOpen, setIsThemeSubmenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => getStoredThemePreference());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  const menuItems = [
    { path: '/dashboard', label: '대시보드' },
    { path: '/conditions', label: '조건 관리' },
    { path: '/recommendations', label: '추천' },
    { path: '/image-search', label: '이미지 검색' },
    { path: '/price-history', label: '가격 히스토리' },
    { path: '/payments', label: '결제 내역' },
  ];

  const themeMenuItems: Array<{
    value: ThemePreference;
    label: string;
    icon: typeof Sun;
  }> = [
    { value: 'light', label: '밝은 테마', icon: Sun },
    { value: 'dark', label: '어두운 테마', icon: Moon },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
        setIsThemeSubmenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleThemeSelect = (theme: ThemePreference) => {
    persistThemePreference(theme);
    setThemePreference(theme);
    setIsThemeMenuOpen(false);
    setIsThemeSubmenuOpen(false);
  };

  // 2026-05-18 수정 18: 로그아웃 버튼은 auth/logout API를 호출한 뒤 메모리 토큰을 비우고 로그인 화면으로 이동한다.
  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const message = await logoutAuth();
      alert(message);
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }

      logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="shrink-0 z-50 w-full bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-sm border-b border-[#E2E8F0] dark:border-[#1E293B] transition-colors duration-300">
      <div className="relative max-w-[1200px] mx-auto h-[72px] px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center">
          {/* Brand Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-[#6366F1] rounded-[14px] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
              <Zap className="w-[22px] h-[22px] text-white fill-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-[#0F172A] dark:text-white font-extrabold text-[17px] tracking-tight transition-colors duration-300">나의 구매 비서</div>
            </div>
          </Link>
          
        </div>

        {/* Main Nav Links */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 lg:flex items-center gap-1 whitespace-nowrap">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[15px] font-bold transition-all duration-300 ${
                  active
                    ? 'bg-[#EEF2FF] dark:bg-[#312E81]/30 text-[#6366F1] dark:text-[#A5B4FC]' 
                    : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Utilities (Desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="relative" ref={themeMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsThemeMenuOpen((prev) => {
                  const nextOpen = !prev;

                  if (!nextOpen) {
                    setIsThemeSubmenuOpen(false);
                  }

                  return nextOpen;
                });
              }}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                isThemeMenuOpen || isActive('/settings')
                  ? 'bg-[#F8FAFC] dark:bg-[#111827] text-[#0F172A] dark:text-white'
                  : 'hover:bg-[#F8FAFC] dark:hover:bg-[#111827] text-[#64748B] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white'
              }`}
              title="설정"
              aria-haspopup="menu"
              aria-expanded={isThemeMenuOpen}
            >
              <SettingsIcon className="w-[22px] h-[22px]" />
            </button>

            {isThemeMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-52 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-2 shadow-[0_8px_24px_rgb(15,23,42,0.08)]">
                {isThemeSubmenuOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsThemeSubmenuOpen(false)}
                      className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="flex-1">화면 테마</span>
                    </button>
                    <div className="space-y-1">
                      {themeMenuItems.map((item) => {
                        const Icon = item.icon;
                        const active = themePreference === item.value;

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => handleThemeSelect(item.value)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#EEF2FF] dark:bg-[#312E81]/30 text-[#6366F1] dark:text-[#A5B4FC]'
                                : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="flex-1">{item.label}</span>
                            {active && <Check className="h-4 w-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsThemeSubmenuOpen(true)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <Monitor className="h-4 w-4" />
                      <span className="flex-1">화면 테마</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="my-2 h-px bg-[#E2E8F0] dark:bg-[#1E293B]" />
                    <Link
                      to="/settings"
                      onClick={() => {
                        setIsThemeMenuOpen(false);
                        setIsThemeSubmenuOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      상세 설정
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[#FEF2F2] dark:hover:bg-[#3F1D24] text-[#64748B] dark:text-[#CBD5E1] hover:text-[#EF4444] transition-colors disabled:opacity-60"
            title="로그아웃"
            aria-label="로그아웃"
          >
            <LogOut className="w-[22px] h-[22px]" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded-full text-[#64748B] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white transition-colors"
          aria-label="메뉴 열기"
        >
          <Menu className="w-[22px] h-[22px]" />
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

        {/* 2026-05-08: 모바일 메뉴를 스크롤형 드로어가 아닌, 화면 전체를 덮는 고정 풀스크린 메뉴로 전환한다. */}
        {/* Mobile Fullscreen Menu */}
        <div 
          className={`fixed inset-0 z-[70] h-screen overflow-hidden bg-white dark:bg-[#0F172A] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${
            isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
          }`}
        >
          <div className="flex items-center justify-between h-[72px] px-4 md:px-8 shrink-0 border-b border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-[#6366F1] rounded-[14px] flex items-center justify-center shadow-sm">
                <Zap className="w-[22px] h-[22px] text-white fill-white" />
              </div>
              <div className="text-[#0F172A] dark:text-white font-extrabold text-[17px] tracking-tight transition-colors duration-300">
                나의 구매 비서
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-full text-[#64748B] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="w-[22px] h-[22px]" />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-between bg-white dark:bg-[#0F172A] px-4 py-6">
          <section className="shrink-0">
            <div className="mb-3 px-4 py-2 text-xs font-bold tracking-[0.08em] text-[#64748B] dark:text-[#94A3B8] uppercase">
              메뉴
            </div>
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-4 rounded-2xl text-[18px] font-bold transition-colors ${
                      active
                        ? 'bg-[#EEF2FF] dark:bg-[#312E81]/30 text-[#6366F1] dark:text-[#A5B4FC]'
                        : 'text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </section>

          <section className="mt-8 shrink-0 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-6">
            <div className="px-4 py-2 text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              화면 테마
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
            {themeMenuItems.map((item) => {
              const Icon = item.icon;
              const active = themePreference === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleThemeSelect(item.value)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#EEF2FF] dark:bg-[#312E81]/30 text-[#6366F1] dark:text-[#A5B4FC]'
                      : 'bg-[#F8FAFC] dark:bg-[#111827] text-[#475569] dark:text-[#CBD5E1]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            </div>

            <Link
              to="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#111827] hover:text-[#0F172A] dark:hover:text-white transition-colors"
            >
              <SettingsIcon className="h-5 w-5" />
              상세 설정
            </Link>
            <button
              type="button"
              onClick={async () => {
                setIsMobileMenuOpen(false);
                await handleLogout();
              }}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#3F1D24] transition-colors disabled:opacity-60"
            >
              <LogOut className="h-5 w-5" />
              로그아웃
            </button>
          </section>
        </div>
      </div>
    </header>
  );
}
