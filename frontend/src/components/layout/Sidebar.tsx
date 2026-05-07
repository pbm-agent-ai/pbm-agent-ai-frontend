import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { LayoutDashboard, ClipboardList, TrendingUp, Receipt, LogOut, Zap, Sparkles, Search, Key, Settings as SettingsIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';

export function Sidebar() {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: '대시보드' },
    { path: '/conditions', icon: ClipboardList, label: '조건 관리' },
    { path: '/recommendations', icon: Sparkles, label: '추천' },
    { path: '/image-search', icon: Search, label: '이미지 검색' },
    { path: '/price-history', icon: TrendingUp, label: '가격 히스토리' },
    { path: '/payments', icon: Receipt, label: '결제 내역' },
    { path: '/settings', icon: SettingsIcon, label: '설정' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div 
      className="w-[84px] hover:w-[240px] group transition-all duration-300 h-screen bg-white border-r border-[#e2e8f0] flex flex-col shrink-0 z-20 overflow-hidden"
      onMouseLeave={() => setIsProfileOpen(false)}
    >
      {/* Logo and Service Name */}
      <div className="p-4 flex items-center h-20 shrink-0">
        <Link to="/dashboard" className="flex items-center w-full">
          <div className="w-[52px] flex items-center justify-center shrink-0">
            <div className="w-12 h-12 bg-[#10b981] rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-[140px] shrink-0 whitespace-nowrap ml-2">
            <div className="text-[#0f172a] font-bold text-base">PBM Agent</div>
          </div>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
        <ul className="space-y-2 group/menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <li key={item.path} className="transition-opacity duration-300 group-hover/menu:opacity-40 hover:!opacity-100">
                <Button
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  className={`w-full justify-start h-12 px-0 ${
                    active
                      ? 'bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/15 hover:text-[#10b981]'
                      : 'text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
                  }`}
                >
                  <Link to={item.path} className="flex items-center">
                    <div className="w-[60px] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                      {item.label}
                    </span>
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Chip with Dropdown */}
      <div className="p-3 relative">
        <div 
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center h-12 rounded-xl hover:bg-[#f8fafc] border border-transparent hover:border-[#e2e8f0] transition-colors overflow-hidden cursor-pointer"
        >
          <div className="w-[60px] flex items-center justify-center shrink-0">
            <Avatar className="w-10 h-10 bg-[#10b981]">
              <AvatarFallback className="bg-[#10b981] text-white font-semibold text-sm">
                KL
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between whitespace-nowrap min-w-0 pr-3">
            <div>
              <div className="text-[#0f172a] text-sm font-medium truncate">김레온</div>
              <div className="text-[#94a3b8] text-xs font-mono truncate">0x8a9d...4f2c</div>
            </div>
            {isProfileOpen ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />}
          </div>
        </div>

        {/* Dropdown Menu */}
        {isProfileOpen && (
          <div className="absolute bottom-full left-4 mb-2 w-[200px] bg-white border border-[#e2e8f0] rounded-xl shadow-lg overflow-hidden py-1 z-50">
            <Link to="/settings/password" className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] text-sm font-medium text-[#0f172a] transition-colors">
              <Key className="w-4 h-4 text-[#64748b]" />
              비밀번호 변경
            </Link>
            <Link to="/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] text-sm font-medium text-[#0f172a] transition-colors">
              <SettingsIcon className="w-4 h-4 text-[#64748b]" />
              환경 설정
            </Link>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="p-3 mb-2">
        <Button
          asChild
          variant="ghost"
          className="w-full justify-start h-12 px-0 text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
        >
          <Link to="/login" className="flex items-center">
            <div className="w-[60px] flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-[#ef4444]" />
            </div>
            <span className="text-sm font-medium text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              로그아웃
            </span>
          </Link>
        </Button>
      </div>
    </div>
  );
}