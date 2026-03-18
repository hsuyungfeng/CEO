'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PendingOrdersTable from '@/components/admin/pending-orders-table';

interface Order {
  id: string;
  orderNo: string;
  totalAmount: number;
  itemCount: number;
  buyer?: {
    name: string;
  };
  createdAt: string;
}

export default function PendingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/orders?status=PENDING');

        if (!response.ok) {
          throw new Error(`Failed to fetch pending orders: ${response.status}`);
        }

        const data = await response.json();
        console.log('[PendingOrdersPage] Fetched pending orders:', data);

        const ordersList = Array.isArray(data) ? data : (data.data || data.orders || []);

        // Transform to match Order interface
        const transformedOrders = ordersList.map((order: any) => ({
          id: order.id,
          orderNo: order.orderNo,
          totalAmount: order.totalAmount,
          itemCount: order.items?.length || 0,
          buyer: order.buyer,
          createdAt: order.createdAt,
        }));

        setOrders(transformedOrders);
      } catch (err) {
        console.error('[PendingOrdersPage] Error fetching pending orders:', err);
        setError(err instanceof Error ? err.message : '無法載入待處理訂單');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingOrders();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">待處理訂單</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">待處理訂單</h1>
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">待處理訂單</h1>
        <Badge variant="destructive" className="text-lg px-3 py-1">
          {orders.length} 個待處理
        </Badge>
      </div>

      {orders.length > 0 ? (
        <PendingOrdersTable orders={orders} onRefresh={() => window.location.reload()} />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">沒有待處理訂單</p>
        </div>
      )}
    </div>
  );
}
