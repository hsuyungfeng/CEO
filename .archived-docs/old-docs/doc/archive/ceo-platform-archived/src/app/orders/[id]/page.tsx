'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
  unit: string;
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  date: string;
  note?: string;
  shippingAddress: string;
  billingAddress: string;
  items: OrderItem[];
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('訂單不存在');
          } else {
            throw new Error('載入訂單失敗');
          }
          return;
        }
        const data = await response.json();
        setOrder(data.data || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入訂單時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }
  }, [id]);

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

  if (loading) {
    return <OrderLoadingSkeleton />;
  }

  if (error) {
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

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!order) {
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
            <h2 className="text-2xl font-bold mb-4">訂單未找到</h2>
            <Button onClick={() => router.push('/orders')}>
              返回訂單列表
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const shippingFee = 150;

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
                <CardTitle>訂單編號: {order.orderNo}</CardTitle>
                <CardDescription>訂購日期: {order.date}</CardDescription>
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
                <p className="text-gray-600">{order.shippingAddress}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">發票資訊</h3>
                <p className="text-gray-600">{order.billingAddress}</p>
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
                    <div className="w-16 h-16 bg-gray-200 mr-4 relative">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.quantity} {item.unit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${item.price}/{item.unit}</p>
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
                <div className="flex justify-between py-2">
                  <span>運費</span>
                  <span>${shippingFee}</span>
                </div>
                <div className="flex justify-between py-2 border-t font-bold text-lg">
                  <span>總計</span>
                  <span>${order.totalAmount + shippingFee}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrderLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Skeleton className="h-10 w-32 mb-6" />

        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end w-1/3 ml-auto space-y-2">
              <Skeleton className="h-6 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
