'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SupplierOrdersTable from '@/components/supplier/supplier-orders-table';

interface SupplierOrder {
  id: string;
  orderNo: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
  buyer?: {
    name: string;
    email: string;
  };
}

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const url = new URL('/api/supplier/orders', window.location.origin);
        if (statusFilter) url.searchParams.append('status', statusFilter);
        if (dateRange.start) url.searchParams.append('startDate', dateRange.start);
        if (dateRange.end) url.searchParams.append('endDate', dateRange.end);

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.status}`);
        }

        const data = await response.json();
        console.log('[SupplierOrdersPage] Fetched orders:', data);

        const ordersList = Array.isArray(data) ? data : (data.data || data.orders || []);
        setOrders(ordersList);
      } catch (err) {
        console.error('[SupplierOrdersPage] Error fetching orders:', err);
        setError(err instanceof Error ? err.message : '無法載入訂單');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [statusFilter, dateRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">我的訂單</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">我的訂單</h1>
        <div className="text-center py-12">
          <p className="text-red-500">錯誤：{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">我的訂單</h1>

      <Card>
        <CardHeader>
          <CardTitle>篩選</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">所有狀態</option>
              <option value="PENDING">待處理</option>
              <option value="CONFIRMED">已確認</option>
              <option value="SHIPPED">已出貨</option>
              <option value="COMPLETED">已完成</option>
              <option value="CANCELLED">已取消</option>
            </select>

            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-4 py-2 border rounded-md"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-4 py-2 border rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      <SupplierOrdersTable orders={orders} />

      {orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">沒有訂單</p>
        </div>
      )}
    </div>
  );
}
