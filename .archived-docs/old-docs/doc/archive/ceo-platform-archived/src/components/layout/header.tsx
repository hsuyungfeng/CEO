'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Menu, X, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch cart count on mount
  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const response = await fetch('/api/cart');
        
        if (response.ok) {
          const data = await response.json();
          // Calculate total items in cart
          const count = data.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) || 0;
          setCartItemCount(count);
        } else if (response.status === 401) {
          // User not logged in, show 0
          setCartItemCount(0);
        }
      } catch (error) {
        // Silently fail - don't show error to user for header cart count
        setCartItemCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCartCount();
    
    // Refresh cart count every 30 seconds
    const interval = setInterval(fetchCartCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-primary">CEO團購平台</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              href="/"
              className={`font-medium ${pathname === '/' ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
            >
              首頁
            </Link>
            <Link
              href="/products"
              className={`font-medium ${pathname.startsWith('/products') ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
            >
              商品
            </Link>
            <Link
              href="/cart"
              className={`font-medium ${pathname === '/cart' ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
            >
              購物車
              {cartItemCount > 0 && !loading && (
                <span className="ml-1 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Right side buttons */}
          <div className="flex items-center space-x-4">
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-6 w-6" />
                {loading ? (
                  <span className="absolute -top-1 -right-1">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </span>
                ) : cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </Button>
            </Link>
            
            <Button asChild className="hidden md:block">
              <Link href="/login">會員登入</Link>
            </Button>
            
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/" 
                className={`font-medium py-2 ${pathname === '/' ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                首頁
              </Link>
              <Link 
                href="/products" 
                className={`font-medium py-2 ${pathname.startsWith('/products') ? 'text-blue-600' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                商品
              </Link>
              <Link
                href="/cart"
                className={`font-medium py-2 ${pathname === '/cart' ? 'text-primary' : 'text-gray-700'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                購物車
                {cartItemCount > 0 && !loading && (
                  <span className="ml-2 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </Link>
              <Button asChild className="w-full mt-2">
                <Link href="/login">會員登入</Link>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
