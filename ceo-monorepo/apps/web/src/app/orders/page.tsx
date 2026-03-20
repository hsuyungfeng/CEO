'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingBag, Search, Package } from 'lucide-react';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  productImage?: string;
  productUnit?: string;
}

interface Order {
  id: string;
  orderNo?: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_TABS: Array<{ value: OrderStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待處理' },
  { value: 'CONFIRMED', label: '已確認' },
  { value: 'SHIPPED', label: '已出貨' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
];

const STATUS_BADGE: Record<OrderStatus, { variant: 'secondary' | 'default' | 'destructive' | 'outline'; label: string; color: string }> = {
  PENDING:   { variant: 'secondary',   label: '待處理', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  CONFIRMED: { variant: 'default',     label: '已確認', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  SHIPPED:   { variant: 'outline',     label: '已出貨', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  COMPLETED: { variant: 'outline',     label: '已完成', color: 'text-green-700 bg-green-50 border-green-200' },
  CANCELLED: { variant: 'destructive', label: '已取消', color: 'text-gray-500 bg-gray-50 border-gray-200' },
};

const fmt = (n: number) => `NT$ ${Number(n).toLocaleString('zh-TW')}`;

const fmtDate = (s: string) => {
  try {
    return new Date(s).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return s; }
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || data.orders || []);
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入訂單');
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrder(orderId: string) {
    if (!confirm('確定要取消此訂單嗎？')) return;
    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取消失敗');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' as OrderStatus } : o));
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消訂單失敗');
    } finally {
      setCancellingId(null);
    }
  }

  // 狀態計數
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    orders.forEach(o => { c[o.status] = (c[o.status] ?? 0) + 1; });
    return c;
  }, [orders]);

  // 篩選
  const filtered = useMemo(() => {
    let list = activeStatus === 'ALL' ? orders : orders.filter(o => o.status === activeStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o =>
        (o.orderNo ?? o.id).toLowerCase().includes(q) ||
        o.items.some(i => i.productName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, activeStatus, search]);

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
          <h1 className="text-3xl font-bold mb-6">我的訂單</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
          <Button onClick={fetchOrders}>重新載入</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 標題 */}
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag className="w-7 h-7 text-blue-600" />
          <h1 className="text-3xl font-bold">我的訂單</h1>
          {orders.length > 0 && (
            <Badge variant="secondary" className="text-base px-2">{orders.length} 筆</Badge>
          )}
        </div>

        {/* 搜尋 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="搜尋訂單編號或商品名稱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 狀態 Tab */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {STATUS_TABS.map(({ value, label }) => {
            const count = counts[value] ?? 0;
            const isActive = activeStatus === value;
            return (
              <button
                key={value}
                onClick={() => setActiveStatus(value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs ${isActive ? 'opacity-80' : 'text-gray-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 訂單列表 */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500">
                {search ? `找不到「${search}」相關訂單` : '此分類下沒有訂單'}
              </p>
              {orders.length === 0 && (
                <Button className="mt-4" onClick={() => router.push('/suppliers')}>
                  開始採購
                </Button>
              )}
            </div>
          ) : (
            filtered.map((order) => {
              const s = STATUS_BADGE[order.status];
              const isCancelling = cancellingId === order.id;
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base">
                          訂單 {order.orderNo ?? order.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(order.createdAt)}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.color}`}>
                        {s.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 商品摘要 */}
                    <div className="space-y-1.5 mb-3">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.productImage && (
                              <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden shrink-0">
                                <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <span className="truncate text-gray-700">{item.productName}</span>
                          </div>
                          <span className="text-gray-500 shrink-0 ml-2">
                            {item.quantity} {item.productUnit ?? '件'} × {fmt(item.unitPrice)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-gray-400">還有 {order.items.length - 3} 項商品...</p>
                      )}
                    </div>

                    {/* 底部：金額 + 操作 */}
                    <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-2">
                      <p className="font-bold text-blue-700">{fmt(order.totalAmount)}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/orders/${order.id}`)}>
                          查看詳情
                        </Button>
                        {order.status === 'PENDING' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isCancelling}
                            onClick={() => cancelOrder(order.id)}
                          >
                            {isCancelling ? '取消中...' : '取消訂單'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
