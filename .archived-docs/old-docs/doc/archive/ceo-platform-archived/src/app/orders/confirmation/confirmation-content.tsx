'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Package, Calendar } from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    image: string;
    unit: string;
  };
}

interface Order {
  id: string;
  orderNo: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  payment: {
    id: string;
    status: string;
    paymentMethod: string;
    amount: number;
    currency: string;
    gateway: string | null;
    gatewayTransactionId: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  invoice: {
    id: string;
    status: string;
    type: string;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    taxId: string | null;
    buyerName: string | null;
    buyerAddress: string | null;
    amount: number;
    taxAmount: number;
    carrierType: string | null;
    carrierId: string | null;
    issuedAt: string | null;
    cancelledAt: string | null;
  } | null;
  shipping: {
    id: string;
    shippingMethod: string;
    provider: string | null;
    trackingNumber: string | null;
    status: string;
    estimatedDelivery: string | null;
    actualDelivery: string | null;
    shippingAddress: string;
    receiverName: string;
    receiverPhone: string;
    notes: string | null;
  } | null;
}

export default function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('訂單ID不存在');
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          throw new Error('無法載入訂單資訊');
        }
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入訂單失敗');
      }
    };

    fetchOrder();
  }, [orderId]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto border-destructive/20">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive">無法確認訂單</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">{error}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/">返回首頁</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/orders">查看訂單</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const estimatedDelivery = new Date(order.createdAt);
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

  const statusLabel = {
    PENDING: '待確認',
    CONFIRMED: '已確認',
    SHIPPED: '已出貨',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  }[order.status] || order.status;

  return (
    <div className="min-h-screen bg-linear-to-b from-success/5 to-transparent py-12">
      <div className="container mx-auto px-4">
        {/* Success Banner */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-success/20 rounded-full blur-lg"></div>
                <CheckCircle className="h-16 w-16 text-success relative" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">訂單確認成功！</h1>
            <p className="text-gray-600 text-lg">感謝您的購買，我們已收到您的訂單</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Order Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-gray-600 text-sm mb-2">訂單編號</div>
                  <div className="text-xl font-bold text-primary">{order.orderNo}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-gray-600 text-sm mb-2 flex items-center justify-center gap-1">
                    <Calendar className="h-4 w-4" />
                    預計送達
                  </div>
                  <div className="text-lg font-bold">
                    {estimatedDelivery.toLocaleDateString('zh-TW')}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-gray-600 text-sm mb-2 flex items-center justify-center gap-1">
                    <Package className="h-4 w-4" />
                    訂單狀態
                  </div>
                  <div className="text-lg font-bold text-success">{statusLabel}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                訂單明細
              </CardTitle>
              <CardDescription>共 {order.items.length} 件商品</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                 <div key={item.id} className="flex items-center gap-4 pb-4 border-b last:border-0 last:pb-0">
                   <div className="shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                     {item.product.image ? (
                       <Image
                         src={item.product.image}
                         alt={item.product.name}
                         width={64}
                         height={64}
                         className="w-full h-full object-contain"
                       />
                     ) : (
                       <Package className="h-8 w-8 text-gray-400" />
                     )}
                   </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.product.name}</h3>
                    <p className="text-sm text-gray-600">
                      {item.quantity} {item.product.unit} × ${item.unitPrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">${item.subtotal.toLocaleString()}</p>
                  </div>
                </div>
              ))}

              {/* Order Total */}
              <div className="pt-4 border-t-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">小計</span>
                  <span>${(order.totalAmount * 0.9).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">運費</span>
                  <span>$150</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>總計</span>
                  <span className="text-primary text-2xl">${order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1 h-12 text-base">
              <Link href="/orders">查看我的訂單</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 h-12 text-base">
              <Link href="/products">繼續購物</Link>
            </Button>
          </div>

          {/* Info Box */}
          <Card className="bg-info/5 border-info/20">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm text-info-foreground">
                <p className="font-semibold">📧 訂單確認信已發送</p>
                <p>我們已將訂單確認信發送到您的郵箱，請查收。</p>
                <p className="mt-3 text-xs">如有任何問題，歡迎聯繫我們的客服團隊。</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
