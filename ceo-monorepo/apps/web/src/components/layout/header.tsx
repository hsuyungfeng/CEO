'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Menu, X, Bell, Search, Moon, Sun, Monitor, User, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUnreadCount } from '@/contexts/websocket-context';
import { Input } from '@/components/ui/input';
import { useTheme, ThemeToggle } from '@/contexts/theme-context';
import { useSession, signOut as authSignOut } from 'next-auth/react';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const unreadCount = useUnreadCount();
  const { theme, resolvedTheme } = useTheme();
  const { data: session, status } = useSession();

  // Mock cart count
  const cartItemCount = 3;

  // 處理搜尋提交
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    
    if (trimmedQuery) {
      // 儲存搜尋歷史
      try {
        await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmedQuery })
        });
      } catch (error) {
        console.error('儲存搜尋歷史失敗:', error);
      }
      
      // 導向搜尋結果頁面
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  // 處理鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K 開啟搜尋
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // ESC 關閉搜尋
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center" aria-label="CEO團購平台首頁">
            <span className="text-xl font-bold text-blue-600">CEO團購平台</span>
          </Link>

          {/* Skip to main content link for keyboard users */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
          >
            跳至主要內容
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8" aria-label="主要導航">
            <Link 
              href="/" 
              className={`font-medium ${pathname === '/' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              aria-current={pathname === '/' ? 'page' : undefined}
            >
              首頁
            </Link>
            <Link 
              href="/products" 
              className={`font-medium ${pathname.startsWith('/products') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              aria-current={pathname.startsWith('/products') ? 'page' : undefined}
            >
              商品
            </Link>
            <Link 
              href="/recommendations" 
              className={`font-medium ${pathname.startsWith('/recommendations') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              aria-current={pathname.startsWith('/recommendations') ? 'page' : undefined}
            >
              採購推薦
            </Link>
            <Link 
              href="/purchase-templates" 
              className={`font-medium ${pathname.startsWith('/purchase-templates') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              aria-current={pathname.startsWith('/purchase-templates') ? 'page' : undefined}
            >
              採購模板
            </Link>
            <Link 
              href="/supplier-ratings" 
              className={`font-medium ${pathname.startsWith('/supplier-ratings') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              aria-current={pathname.startsWith('/supplier-ratings') ? 'page' : undefined}
            >
              供應商評比
            </Link>
            <Link 
              href="/delivery-predictions" 
              className={`font-medium ${pathname.startsWith('/delivery-predictions') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              aria-current={pathname.startsWith('/delivery-predictions') ? 'page' : undefined}
            >
              交貨預測
            </Link>
            <Link 
              href="/notifications" 
              className={`font-medium ${pathname.startsWith('/notifications') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              aria-current={pathname.startsWith('/notifications') ? 'page' : undefined}
            >
              通知
              {unreadCount > 0 && (
                <span 
                  className="ml-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                  aria-label={`${unreadCount} 個未讀通知`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <Link 
              href="/cart" 
              className={`font-medium ${pathname === '/cart' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              aria-current={pathname === '/cart' ? 'page' : undefined}
            >
              購物車
              {cartItemCount > 0 && (
                <span 
                  className="ml-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                  aria-label={`購物車中有 ${cartItemCount} 件商品`}
                >
                  {cartItemCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Right side buttons */}
          <div className="flex items-center space-x-2">
            {/* 主題切換按鈕 */}
            <ThemeToggle />
            
            {/* 搜尋按鈕 - 行動裝置 */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label="開啟搜尋"
            >
              <Search className="h-6 w-6" aria-hidden="true" />
            </Button>

            {/* 搜尋欄 - 桌面版 */}
            <div className="hidden md:block relative">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="search"
                  placeholder="搜尋商品、供應商..."
                  className="w-64 pl-10 pr-4 py-2"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="全域搜尋"
                  aria-describedby="search-hint"
                />
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" 
                  aria-hidden="true"
                />
                <div id="search-hint" className="sr-only">
                  按下 Enter 進行搜尋，或使用 Ctrl+K 快捷鍵開啟搜尋
                </div>
              </form>
            </div>

            <Link href="/notifications" aria-label="通知中心">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                    aria-label={`${unreadCount} 個未讀通知`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            
            <Link href="/cart" aria-label="購物車">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-6 w-6" aria-hidden="true" />
                {cartItemCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                    aria-label={`購物車中有 ${cartItemCount} 件商品`}
                  >
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </Link>
            
            {status === 'loading' ? (
              <Button variant="ghost" className="hidden md:block" disabled>
                載入中...
              </Button>
            ) : session ? (
              <div className="hidden md:flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-800 dark:text-blue-300" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {session.user?.name || '會員'}
                  </span>
                </div>
                 <Button
                   variant="ghost"
                   size="sm"
                   className="hidden md:block"
                   onClick={async () => {
                     try {
                       await authSignOut({ redirect: false });
                       router.push('/');
                       router.refresh();
                     } catch (error) {
                       console.error('登出錯誤:', error);
                     }
                   }}
                   aria-label="登出"
                 >
                   登出
                 </Button>
              </div>
            ) : (
              <Button asChild className="hidden md:block">
                <Link href="/login" aria-label="會員登入">會員登入</Link>
              </Button>
            )}
            
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? "關閉選單" : "開啟選單"}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* 行動裝置搜尋彈出層 */}
        {searchOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-white z-50"
            role="dialog"
            aria-modal="true"
            aria-label="搜尋對話框"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">搜尋</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(false)}
                  aria-label="關閉搜尋"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </Button>
              </div>
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="搜尋商品、供應商..."
                    className="w-full pl-10 pr-4 py-3"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    aria-label="搜尋輸入框"
                  />
                  <Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" 
                    aria-hidden="true"
                  />
                </div>
                <Button type="submit" className="w-full mt-4">
                  搜尋
                </Button>
              </form>
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-2">熱門搜尋</h3>
                <div className="flex flex-wrap gap-2">
                  {['批發商品', '供應商', '採購模板', '交貨預測'].map((term) => (
                    <Button
                      key={term}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(term);
                        router.push(`/search?q=${encodeURIComponent(term)}`);
                        setSearchOpen(false);
                      }}
                      aria-label={`搜尋 ${term}`}
                    >
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div 
            id="mobile-menu" 
            className="md:hidden py-4 border-t"
            role="navigation"
            aria-label="行動裝置導航"
          >
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/" 
                className={`font-medium py-2 ${pathname === '/' ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname === '/' ? 'page' : undefined}
              >
                首頁
              </Link>
              <Link 
                href="/products" 
                className={`font-medium py-2 ${pathname.startsWith('/products') ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname.startsWith('/products') ? 'page' : undefined}
              >
                商品
              </Link>
              <Link 
                href="/recommendations" 
                className={`font-medium py-2 ${pathname.startsWith('/recommendations') ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname.startsWith('/recommendations') ? 'page' : undefined}
              >
                採購推薦
              </Link>
              <Link 
                href="/purchase-templates" 
                className={`font-medium py-2 ${pathname.startsWith('/purchase-templates') ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname.startsWith('/purchase-templates') ? 'page' : undefined}
              >
                採購模板
              </Link>
              <Link 
                href="/supplier-ratings" 
                className={`font-medium py-2 ${pathname.startsWith('/supplier-ratings') ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname.startsWith('/supplier-ratings') ? 'page' : undefined}
              >
                供應商評比
              </Link>
              <Link 
                href="/delivery-predictions" 
                className={`font-medium py-2 ${pathname.startsWith('/delivery-predictions') ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname.startsWith('/delivery-predictions') ? 'page' : undefined}
              >
                交貨預測
              </Link>
              <Link 
                href="/notifications" 
                className={`font-medium py-2 ${pathname.startsWith('/notifications') ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname.startsWith('/notifications') ? 'page' : undefined}
              >
                通知
                {unreadCount > 0 && (
                  <span 
                    className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                    aria-label={`${unreadCount} 個未讀通知`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link 
                href="/cart" 
                className={`font-medium py-2 ${pathname === '/cart' ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={pathname === '/cart' ? 'page' : undefined}
              >
                購物車
                {cartItemCount > 0 && (
                  <span 
                    className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                    aria-label={`購物車中有 ${cartItemCount} 件商品`}
                  >
                    {cartItemCount}
                  </span>
                )}
              </Link>
               {status === 'loading' ? (
                 <Button className="w-full mt-2" disabled>
                   載入中...
                 </Button>
               ) : session ? (
                 <div className="w-full mt-2 space-y-2">
                   <div className="flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                     <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2">
                       <User className="h-4 w-4 text-blue-800 dark:text-blue-300" />
                     </div>
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                       {session.user?.name || '會員'}
                     </span>
                   </div>
                    <Button
                      className="w-full"
                      onClick={async () => {
                        try {
                          await authSignOut({ redirect: false });
                          window.location.href = '/';
                        } catch (error) {
                          console.error('登出錯誤:', error);
                        }
                      }}
                      aria-label="登出"
                    >
                      登出
                    </Button>
                 </div>
               ) : (
                 <Button asChild className="w-full mt-2">
                   <Link href="/login" aria-label="會員登入">會員登入</Link>
                 </Button>
               )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}