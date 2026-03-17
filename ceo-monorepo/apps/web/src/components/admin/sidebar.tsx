'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  Building,
  MessageSquare,
  HelpCircle,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  BarChart3,
  FileText,
  Bell,
  Shield,
  Database,
  CreditCard,
  Truck,
  Tag,
  Image,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  children?: NavigationItem[];
  badge?: string;
  permission?: string;
}

const navigation: NavigationItem[] = [
  { 
    name: '儀表板', 
    href: '/admin', 
    icon: Home,
    badge: 'new'
  },
  { 
    name: '商品管理', 
    href: '/admin/products', 
    icon: Package,
    children: [
      { name: '所有商品', href: '/admin/products', icon: Package },
      { name: '新增商品', href: '/admin/products/new', icon: Package },
      { name: '商品分類', href: '/admin/products/categories', icon: Tag },
      { name: '庫存管理', href: '/admin/products/inventory', icon: Database },
      { name: '圖片管理', href: '/admin/products/images', icon: Image },
    ]
  },
  { 
    name: '訂單管理', 
    href: '/admin/orders', 
    icon: ShoppingCart,
    children: [
      { name: '所有訂單', href: '/admin/orders', icon: ShoppingCart },
      { name: '待處理訂單', href: '/admin/orders/pending', icon: ShoppingCart, badge: '5' },
      { name: '已發貨訂單', href: '/admin/orders/shipped', icon: Truck },
      { name: '退款申請', href: '/admin/orders/refunds', icon: CreditCard, badge: '3' },
    ]
  },
  {
    name: '會員管理',
    href: '/admin/members',
    icon: Users,
  },
  {
    name: '聯絡訊息',
    href: '/admin/messages',
    icon: MessageSquare,
    badge: '12'
  },
  {
    name: '系統設定',
    href: '/admin/settings',
    icon: Settings,
    children: [
      { name: '平台資訊設定', href: '/admin/settings/company-info', icon: Building },
    ]
  },
]

interface NavigationItemProps {
  item: NavigationItem;
  level?: number;
  expandedItems: Record<string, boolean>;
  toggleExpanded: (key: string) => void;
}

function NavigationItem({ item, level = 0, expandedItems, toggleExpanded }: NavigationItemProps) {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedItems[item.href] || false
  const isActive = pathname === item.href || 
    (item.href !== '/admin' && pathname?.startsWith(item.href))

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault()
      toggleExpanded(item.href)
    }
  }

  const itemKey = `${item.href}-${level}`

  return (
    <div className="space-y-1">
      <Link
        href={hasChildren ? '#' : item.href}
        onClick={handleClick}
        className={cn(
          'group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          isActive 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
            : 'text-gray-700 dark:text-gray-300',
          level > 0 && 'ml-4'
        )}
        aria-current={isActive ? 'page' : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-label={item.name + (item.badge ? ` (${item.badge} 個新項目)` : '')}
      >
        <div className="flex items-center">
          <item.icon
            className={cn(
              'mr-3 h-4 w-4 flex-shrink-0 transition-colors',
              isActive 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
            )}
            aria-hidden="true"
          />
          <span className="truncate">{item.name}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {item.badge && (
            <span className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              isActive
                ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
            )}>
              {item.badge}
            </span>
          )}
          
          {hasChildren && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded ? 'rotate-180' : 'rotate-0'
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </Link>

      {hasChildren && isExpanded && (
        <div className="ml-4 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3">
          {item.children!.map((child) => (
            <NavigationItem
              key={`${child.href}-${level + 1}`}
              item={child}
              level={level + 1}
              expandedItems={expandedItems}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState(false)
  const { resolvedTheme } = useTheme()

  // 自動展開當前活動的項目
  const findAndExpandActiveItem = (items: NavigationItem[], currentPath: string) => {
    const expanded: Record<string, boolean> = {}
    
    const checkItem = (item: NavigationItem): boolean => {
      if (currentPath === item.href || 
          (item.href !== '/admin' && currentPath.startsWith(item.href))) {
        expanded[item.href] = true
        return true
      }
      
      if (item.children) {
        for (const child of item.children) {
          if (checkItem(child)) {
            expanded[item.href] = true
            return true
          }
        }
      }
      
      return false
    }
    
    items.forEach(item => checkItem(item))
    return expanded
  }

  // 初始化展開狀態
  useState(() => {
    const initialExpanded = findAndExpandActiveItem(navigation, pathname)
    setExpandedItems(initialExpanded)
  })

  const toggleExpanded = (key: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const toggleCollapsed = () => {
    setCollapsed(!collapsed)
  }

  return (
    <div className={cn(
      'hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300',
      collapsed ? 'lg:w-16' : 'lg:w-64'
    )}>
      <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          {/* 標題和切換按鈕 */}
          <div className="flex items-center justify-between px-4">
            {!collapsed && (
              <div className="h-8 w-auto">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  CEO 團購管理
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="ml-auto"
              aria-label={collapsed ? '展開側邊欄' : '折疊側邊欄'}
            >
              <ChevronRight
                className={cn(
                  'h-5 w-5 transition-transform',
                  collapsed ? 'rotate-0' : 'rotate-180'
                )}
                aria-hidden="true"
              />
            </Button>
          </div>

          {/* 搜尋框（僅在展開時顯示） */}
          {!collapsed && (
            <div className="mt-4 px-3">
              <div className="relative">
                <input
                  type="search"
                  placeholder="搜尋功能..."
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  aria-label="搜尋管理功能"
                />
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
              </div>
            </div>
          )}

          {/* 導航選單 */}
          <nav className="mt-5 flex-1 space-y-1 px-2">
            {navigation.map((item) => (
              <NavigationItem
                key={item.href}
                item={item}
                expandedItems={expandedItems}
                toggleExpanded={toggleExpanded}
              />
            ))}
          </nav>

          {/* 快速操作 */}
          {!collapsed && (
            <div className="mt-6 px-3">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  快速操作
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    asChild
                  >
                    <Link href="/admin/products/new">
                      <Package className="mr-2 h-3 w-3" />
                      新增商品
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    asChild
                  >
                    <Link href="/admin/orders/pending">
                      <ShoppingCart className="mr-2 h-3 w-3" />
                      處理訂單
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部區域 */}
        <div className="flex flex-shrink-0 border-t border-gray-200 dark:border-gray-800 p-4">
           {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={async () => {
                try {
                  const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                  });
                  if (response.ok) {
                    window.location.href = '/';
                  } else {
                    console.error('登出失敗:', response.status);
                  }
                } catch (error) {
                  console.error('登出錯誤:', error);
                }
              }}
              aria-label="登出"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    A
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    管理員
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    admin@ceo-buy.com
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/auth/logout', {
                      method: 'POST',
                    });
                    if (response.ok) {
                      window.location.href = '/';
                    } else {
                      console.error('登出失敗:', response.status);
                    }
                  } catch (error) {
                    console.error('登出錯誤:', error);
                  }
                }}
                aria-label="登出"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 搜尋圖標組件（需要在文件頂部添加 import）
const Search = ({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)