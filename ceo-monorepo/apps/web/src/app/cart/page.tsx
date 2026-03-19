'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Minus, CreditCard, ShoppingBag, Package } from 'lucide-react';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  savings: number;
  product: {
    id: string;
    name: string;
    subtitle: string | null;
    image: string | null;
    unit: string | null;
    spec: string | null;
    priceTiers: Array<{ minQty: number; price: number }>;
    firm: string | null;
  };
}

interface CartSummary {
  totalItems: number;
  totalAmount: number;
  totalSavings: number;
  finalAmount: number;
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 追蹤每個 item 是否正在更新/刪除
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  // debounce timer per item
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    fetchCart();
  }, []);

  async function fetchCart() {
    try {
      setLoading(true);
      const res = await fetch('/api/cart');
      if (!res.ok) {
        if (res.status === 401) { router.push('/auth/signin'); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入購物車失敗');
    } finally {
      setLoading(false);
    }
  }

  // Optimistic update + debounced API call
  function handleQuantityChange(itemId: string, newQty: number) {
    if (newQty < 1) return;

    // Optimistic: 立即更新 UI
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const tier = [...item.product.priceTiers]
        .sort((a, b) => b.minQty - a.minQty)
        .find(t => t.minQty <= newQty);
      const unitPrice = tier ? tier.price : (item.product.priceTiers[0]?.price ?? item.unitPrice);
      return { ...item, quantity: newQty, unitPrice, subtotal: unitPrice * newQty };
    }));

    // Debounce API call (300ms)
    if (debounceRefs.current[itemId]) clearTimeout(debounceRefs.current[itemId]);
    debounceRefs.current[itemId] = setTimeout(async () => {
      setUpdatingIds(prev => new Set(prev).add(itemId));
      try {
        const res = await fetch(`/api/cart/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) {
          const d = await res.json();
          alert(d.error || '更新數量失敗');
          fetchCart(); // 失敗時重刷恢復真實數據
        } else {
          // 重刷 summary
          const cartRes = await fetch('/api/cart');
          const cartData = await cartRes.json();
          setSummary(cartData.summary);
        }
      } catch {
        alert('更新數量失敗');
        fetchCart();
      } finally {
        setUpdatingIds(prev => { const s = new Set(prev); s.delete(itemId); return s; });
      }
    }, 300);
  }

  async function handleRemove(itemId: string) {
    if (!confirm('確定要從購物車移除此商品？')) return;
    setRemovingIds(prev => new Set(prev).add(itemId));
    try {
      const res = await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || '移除失敗');
        return;
      }
      // Optimistic remove
      setItems(prev => prev.filter(i => i.id !== itemId));
      // 更新 summary
      const cartRes = await fetch('/api/cart');
      const cartData = await cartRes.json();
      setSummary(cartData.summary);
    } catch {
      alert('移除失敗');
    } finally {
      setRemovingIds(prev => { const s = new Set(prev); s.delete(itemId); return s; });
    }
  }

  const fmt = (n: number) => `NT$ ${Number(n).toLocaleString('zh-TW')}`;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);
  const totalSavings = summary?.totalSavings ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center py-20">
          <p className="text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">購物車</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
          <Button onClick={fetchCart}>重新載入</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold">購物車</h1>
          {totalItems > 0 && (
            <Badge variant="secondary" className="text-base px-2">{totalItems} 件</Badge>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 text-lg mb-2">您的購物車是空的</p>
            <p className="text-gray-400 text-sm mb-6">前往供應商頁面瀏覽並加入商品</p>
            <Button onClick={() => router.push('/suppliers')}>
              瀏覽供應商
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 商品列表 */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => {
                const isUpdating = updatingIds.has(item.id);
                const isRemoving = removingIds.has(item.id);
                const moq = item.product.priceTiers[0]?.minQty ?? 1;

                return (
                  <Card key={item.id} className={`transition-opacity ${isRemoving ? 'opacity-40' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* 商品圖片 */}
                        <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {item.product.image ? (
                            <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-8 h-8 text-gray-300" />
                          )}
                        </div>

                        {/* 商品資訊 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{item.product.name}</p>
                              {item.product.subtitle && (
                                <p className="text-xs text-gray-500 truncate">{item.product.subtitle}</p>
                              )}
                              {item.product.firm && (
                                <p className="text-xs text-gray-400 mt-0.5">{item.product.firm}</p>
                              )}
                            </div>
                            {/* 移除按鈕 */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 w-7 h-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                              disabled={isRemoving}
                              onClick={() => handleRemove(item.id)}
                              aria-label="移除商品"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* 價格與數量控制 */}
                          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <span className="text-blue-700 font-bold">
                                {fmt(item.unitPrice)}
                              </span>
                              <span className="text-gray-400 text-xs">/{item.product.unit || '個'}</span>
                              {item.savings > 0 && (
                                <span className="ml-2 text-xs text-green-600">省 {fmt(item.savings)}</span>
                              )}
                            </div>

                            {/* 數量控制 */}
                            <div className={`flex items-center gap-1 ${isUpdating ? 'opacity-60' : ''}`}>
                              <Button
                                variant="outline"
                                size="icon"
                                className="w-7 h-7"
                                disabled={item.quantity <= moq || isUpdating}
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <input
                                type="number"
                                min={moq}
                                value={item.quantity}
                                disabled={isUpdating}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value);
                                  if (!isNaN(v) && v >= 1) handleQuantityChange(item.id, v);
                                }}
                                className="w-14 h-7 text-center text-sm border rounded outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="w-7 h-7"
                                disabled={isUpdating}
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              {moq > 1 && (
                                <span className="text-xs text-gray-400 ml-1">最少 {moq}</span>
              )}
                            </div>
                          </div>

                          {/* 小計 */}
                          <div className="mt-2 text-right">
                            <span className="text-sm text-gray-500">小計：</span>
                            <span className="font-semibold text-gray-900">{fmt(item.subtotal)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 訂單摘要 */}
            <div>
              <Card className="sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle>訂單摘要</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">商品小計（{totalItems} 件）</span>
                    <span>{fmt(totalAmount)}</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>批量折扣</span>
                      <span>- {fmt(totalSavings)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>合計</span>
                    <span className="text-blue-700">{fmt(totalAmount)}</span>
                  </div>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 mt-2 gap-2"
                    onClick={() => router.push('/checkout')}
                    disabled={items.length === 0}
                  >
                    <CreditCard className="w-4 h-4" />
                    前往結帳
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => router.push('/suppliers')}
                  >
                    繼續購物
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
