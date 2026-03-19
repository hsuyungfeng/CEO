'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/orders');

        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.status}`);
        }

        const data = await response.json();
        console.log('[OrdersPage] Fetched orders:', data);

        // Handle both direct array and paginated response formats
        const ordersList = Array.isArray(data) ? data : (data.data || data.orders || []);
        setOrders(ordersList);
      } catch (err) {
        console.error('[OrdersPage] Error fetching orders:', err);
        setError(err instanceof Error ? err.message : '無法載入訂單');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const cancelOrder = async (orderId: string) => {
    if (!confirm('確定要取消此訂單嗎？')) return;
    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取消失敗');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消訂單失敗');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary';
      case 'CONFIRMED': return 'default';
      case 'SHIPPED': return 'warning';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return '待處理';
      case 'CONFIRMED': return '已確認';
      case 'SHIPPED': return '已出貨';
      case 'COMPLETED': return '已完成';
      case 'CANCELLED': return '已取消';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">我的訂單</h1>
          <div className="text-center py-12">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">我的訂單</h1>
          <div className="text-center py-12">
            <p className="text-red-500">錯誤：{error}</p>
            <Button
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              重新載入
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">我的訂單</h1>

        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                   <div>
                     <CardTitle>訂單編號: {order.orderNo || order.id}</CardTitle>
                     <div className="text-sm text-muted-foreground">訂購日期: {formatDate(order.createdAt)}</div>
                   </div>
                  <div className="mt-2 sm:mt-0">
                    <Badge variant={getStatusVariant(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">訂單明細:</h3>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          {item.productImage && (
                            <div className="w-12 h-12 bg-gray-200 mr-3">
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <span>{item.productName}</span>
                        </div>
                        <div className="text-right">
                          <p>{item.quantity} x NT${Number(item.unitPrice).toLocaleString('zh-TW')} = NT${Number(item.subtotal).toLocaleString('zh-TW')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-lg font-semibold">總計: NT${Number(order.totalAmount).toLocaleString('zh-TW')}</p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      訂單詳情
                    </Button>
                    {order.status === 'PENDING' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancellingId === order.id}
                        onClick={() => cancelOrder(order.id)}
                      >
                        {cancellingId === order.id ? '取消中...' : '取消訂單'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">您還沒有任何訂單</p>
            <Button
              className="mt-4"
              onClick={() => router.push('/products')}
            >
              開始購物
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}