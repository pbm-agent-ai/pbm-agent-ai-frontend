import { Link, useLocation } from 'react-router';
import { LayoutDashboard, ClipboardList, TrendingUp, Receipt, Bell, LogOut, Zap, Sparkles, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';

export function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: '대시보드' },
    { path: '/conditions', icon: ClipboardList, label: '조건 관리' },
    { path: '/recommendations', icon: Sparkles, label: '추천' },
    { path: '/image-search', icon: Search, label: '이미지 검색' },
    { path: '/price-history', icon: TrendingUp, label: '가격 히스토리' },
    { path: '/payments', icon: Receipt, label: '결제 내역' },
    { path: '/settings', icon: Bell, label: '알림 설정' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-[240px] h-screen bg-white border-r border-[#e2e8f0] flex flex-col">
      {/* Logo and Service Name */}
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center shadow-md">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[#0f172a] font-bold text-base">PBM Agent</div>
            <Badge variant="outline" className="border-[#e2e8f0] text-[#94a3b8] font-mono text-[10px] px-1.5 py-0">
              v2.0
            </Badge>
          </div>
        </Link>
      </div>

      <Separator className="bg-[#e2e8f0]" />

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <li key={item.path}>
                <Button
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  className={`w-full justify-start ${
                    active
                      ? 'bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/15 hover:text-[#10b981]'
                      : 'text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
                  }`}
                >
                  <Link to={item.path}>
                    <Icon className="w-4 h-4 mr-3" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator className="bg-[#e2e8f0]" />

      {/* Logout */}
      <div className="p-4">
        <Button
          asChild
          variant="ghost"
          className="w-full justify-start text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
        >
          <Link to="/login">
            <LogOut className="w-4 h-4 mr-3" />
            <span className="text-sm">로그아웃</span>
          </Link>
        </Button>
      </div>

      <Separator className="bg-[#e2e8f0]" />

      {/* User Profile Chip */}
      <div className="p-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
          <Avatar className="w-9 h-9 bg-[#10b981]">
            <AvatarFallback className="bg-[#10b981] text-white font-semibold text-sm">
              KL
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-[#0f172a] text-sm font-medium truncate">김레온</div>
            <div className="text-[#94a3b8] text-xs font-mono truncate">0x8a9d...4f2c</div>
          </div>
        </div>
      </div>
    </div>
  );
}