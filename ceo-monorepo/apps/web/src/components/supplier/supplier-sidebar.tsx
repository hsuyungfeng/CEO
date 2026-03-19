'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Wallet,
  Inbox,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  taxId: string;
}

interface SupplierSidebarProps {
  user: User;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  children?: NavigationItem[];
  badge?: string;
}

const navigation: NavigationItem[] = [
  {
    name: '儀表板',
    href: '/supplier/dashboard',
    icon: Home,
  },
  {
    name: '商品管理',
    href: '/supplier/products',
    icon: Package,
    children: [
      { name: '所有商品', href: '/supplier/products', icon: Package },
      { name: '新增商品', href: '/supplier/products/new', icon: Package },
    ],
  },
  {
    name: '訂單管理',
    href: '/supplier/orders',
    icon: ShoppingCart,
  },
  {
    name: '申請單',
    href: '/supplier/applications',
    icon: Inbox,
  },
  {
    name: '發票與帳單',
    href: '/supplier/invoices',
    icon: FileText,
  },
  {
    name: '銷售報表',
    href: '/supplier/reports',
    icon: BarChart3,
  },
  {
    name: '帳戶設定',
    href: '/supplier/account',
    icon: Settings,
    children: [
      { name: '基本資訊', href: '/supplier/account', icon: Settings },
      { name: '財務資訊', href: '/supplier/account/financial', icon: Wallet },
    ],
  },
];

interface NavigationItemProps {
  item: NavigationItem;
  expandedItems: Record<string, boolean>;
  toggleExpanded: (key: string) => void;
}

function NavigationItemComponent({ item, expandedItems, toggleExpanded }: NavigationItemProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.href);
  const isExpanded = expandedItems[item.href];
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      {hasChildren ? (
        <button
          onClick={() => toggleExpanded(item.href)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors',
            isActive || isExpanded
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium text-sm">{item.name}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <Link
          href={item.href}
          className={cn(
            'flex items-center justify-between px-4 py-2 rounded-lg transition-colors',
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium text-sm">{item.name}</span>
          </div>
          {item.badge && (
            <span className="inline-block px-2 py-1 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
              {item.badge}
            </span>
          )}
        </Link>
      )}

      {hasChildren && isExpanded && (
        <div className="ml-2 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
          {item.children?.map((child) => {
            const ChildIcon = child.icon;
            const isChildActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isChildActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <ChildIcon className="h-4 w-4 flex-shrink-0" />
                <span>{child.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SupplierSidebar({ user }: SupplierSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleExpanded = (key: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-transform duration-300 lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo / Header */}
          <div className="flex items-center gap-2 px-4 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">供</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.taxId}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1">
            {navigation.map((item) => (
              <NavigationItemComponent
                key={item.href}
                item={item}
                expandedItems={expandedItems}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </nav>

          {/* Logout */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
              登出
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
