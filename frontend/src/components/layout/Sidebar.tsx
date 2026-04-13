import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  SlidersHorizontal,
  LineChart,
  Sparkles,
  ScanSearch,
  CreditCard,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: '대시보드', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: '조건 관리', path: '/conditions', icon: <SlidersHorizontal size={18} /> },
  { label: '가격 히스토리', path: '/history', icon: <LineChart size={18} /> },
  { label: '추천', path: '/recommendation', icon: <Sparkles size={18} /> },
  { label: '이미지 검색', path: '/image-search', icon: <ScanSearch size={18} /> },
  { label: '결제 내역', path: '/payments', icon: <CreditCard size={18} /> },
  { label: '알림 설정', path: '/settings', icon: <Bell size={18} /> },
];

export default function Sidebar(): React.JSX.Element {
  return (
    <aside
      style={{ width: '240px', minWidth: '240px' }}
      className="h-full bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      {/* 로고 */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
          PBM Agent AI
        </span>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
