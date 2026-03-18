'use client'

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
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: '儀表板', href: '/admin', icon: Home },
  { name: '商品管理', href: '/admin/products', icon: Package },
  { name: '訂單管理', href: '/admin/orders', icon: ShoppingCart },
  { name: '會員管理', href: '/admin/members', icon: Users },
  { name: '分類管理', href: '/admin/categories', icon: FolderTree },
  { name: '廠商管理', href: '/admin/firms', icon: Building },
  { name: '聯絡訊息', href: '/admin/messages', icon: MessageSquare },
  { name: 'FAQ 管理', href: '/admin/faqs', icon: HelpCircle },
  { name: '系統設定', href: '/admin/settings', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-4">
            <div className="h-8 w-auto">
              <span className="text-xl font-bold text-gray-900">CEO 團購管理</span>
            </div>
          </div>
          <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname?.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
          <Button
            variant="ghost"
            className="flex w-full items-center justify-start text-gray-600 hover:text-gray-900"
            onClick={() => {
              // 登出邏輯
              window.location.href = '/api/auth/logout'
            }}
          >
            <LogOut className="mr-3 h-5 w-5" />
            登出
          </Button>
        </div>
      </div>
    </div>
  )
}