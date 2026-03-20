'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Eye, Search, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

interface AdminOrder {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    taxId: string;
  };
}

const STATUS_TABS: Array<{ value: OrderStatus | 'ALL'; label: string; color?: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待確認', color: 'text-yellow-700' },
  { value: 'CONFIRMED', label: '已確認', color: 'text-blue-700' },
  { value: 'SHIPPED', label: '已出貨', color: 'text-indigo-700' },
  { value: 'COMPLETED', label: '已完成', color: 'text-green-700' },
  { value: 'CANCELLED', label: '已取消', color: 'text-gray-500' },
];

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
  SHIPPED:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: '待確認', CONFIRMED: '已確認', SHIPPED: '已出貨', COMPLETED: '已完成', CANCELLED: '已取消',
};

const fmt = (n: number) => `NT$ ${Number(n).toLocaleString('zh-TW')}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('zh-TW');

export default function AdminOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders?limit=200&sortBy=createdAt&sortOrder=desc');
      const result = await res.json();
      if (result.success && result.data) {
        setOrders(result.data.orders || []);
      }
    } catch (err) {
      console.error('載入訂單錯誤:', err);
      toast.error('載入訂單失敗');
    } finally {
      setLoading(false);
    }
  }

  async function confirmOrder(orderId: string) {
    setConfirmingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || '操作失敗');
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CONFIRMED' as OrderStatus } : o));
      toast.success('訂單已確認');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '確認失敗');
    } finally {
      setConfirmingId(null);
    }
  }

  async function cancelOrder(orderId: string) {
    if (!confirm('確定要取消此訂單？')) return;
    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || '操作失敗');
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' as OrderStatus } : o));
      toast.success('訂單已取消');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '取消失敗');
    } finally {
      setCancellingId(null);
    }
  }

  // 計數
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    orders.forEach(o => { c[o.status] = (c[o.status] ?? 0) + 1; });
    return c;
  }, [orders]);

  // 篩選
  const filtered = useMemo(() => {
    let list = activeStatus === 'ALL' ? orders : orders.filter(o => o.status === activeStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.orderNo.toLowerCase().includes(q) ||
        o.user.name.toLowerCase().includes(q) ||
        o.user.taxId.includes(q)
      );
    }
    return list;
  }, [orders, activeStatus, search]);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-2 text-gray-600">載入訂單中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">訂單管理</h1>
          <p className="mt-1 text-sm text-gray-500">共 {orders.length} 筆訂單</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* 搜尋 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          placeholder="搜尋訂單號、買家名稱、統一編號..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 狀態 Tab */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map(({ value, label }) => {
          const count = counts[value] ?? 0;
          const isActive = activeStatus === value;
          return (
            <button
              key={value}
              onClick={() => setActiveStatus(value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {label}
              {count > 0 && <span className={`ml-1.5 text-xs ${isActive ? 'opacity-80' : 'text-gray-400'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* 訂單表格 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>訂單號</TableHead>
                  <TableHead>買家</TableHead>
                  <TableHead className="text-center">商品數</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                      {search ? `找不到「${search}」相關訂單` : '此分類下無訂單'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm text-blue-600">
                      {order.orderNo}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{order.user.name}</div>
                      <div className="text-xs text-gray-400">{order.user.taxId}</div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{order.itemCount}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(order.totalAmount)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_STYLE[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{fmtDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {order.status === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={confirmingId === order.id}
                              onClick={() => confirmOrder(order.id)}
                              title="確認訂單"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={cancellingId === order.id}
                              onClick={() => cancelOrder(order.id)}
                              title="取消訂單"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
