'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  unit?: string;
}

interface Order {
  id: string;
  orderNo?: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  shippingAddress?: string;
  billingAddress?: string;
  note?: string;
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/orders/${params.id}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch order: ${response.status}`);
        }

        const data = await response.json();
        console.log('[OrderDetailPage] Fetched order:', data);

        // Handle both direct object and wrapper response formats
        const orderData = data.data || data.order || data;
        setOrder(orderData);
      } catch (err) {
        console.error('[OrderDetailPage] Error fetching order:', err);
        setError(err instanceof Error ? err.message : '無法載入訂單');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id]);

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
          <div className="text-center py-12">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <Button
            variant="outline"
            className="mb-6 flex items-center"
            onClick={() => router.push('/orders')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回訂單列表
          </Button>
          <div className="text-center py-12">
            <p className="text-red-500">錯誤：{error || '訂單不存在'}</p>
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
        <Button
          variant="outline"
          className="mb-6 flex items-center"
          onClick={() => router.push('/orders')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回訂單列表
        </Button>

        <Card className="mb-6">
          <CardHeader>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-3">配送資訊</h3>
                <p className="text-gray-600">{order.shippingAddress || '未提供'}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">發票資訊</h3>
                <p className="text-gray-600">{order.billingAddress || '未提供'}</p>
              </div>
            </div>

            {order.note && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">訂單備註</h3>
                <p className="text-gray-600">{order.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>訂單明細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center">
                    {item.image && (
                      <div className="w-16 h-16 bg-gray-200 mr-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.quantity} {item.unit || '個'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${item.price}/{item.unit || '個'}</p>
                    <p className="text-sm text-gray-600">${item.price * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end">
              <div className="w-full md:w-1/3">
                <div className="flex justify-between py-2">
                  <span>小計</span>
                  <span>${order.totalAmount}</span>
                </div>
                <div className="flex justify-between py-2 border-t font-bold text-lg">
                  <span>總計</span>
                  <span>${order.totalAmount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
