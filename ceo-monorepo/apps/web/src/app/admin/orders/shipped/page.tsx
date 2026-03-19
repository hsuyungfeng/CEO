'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Package, TrendingUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ShippedOrder {
  id: string;
  orderNo: string;
  buyerName: string;
  totalAmount: number;
  quantity: number;
  shippedAt: string;
  trackingNo?: string;
}

export default function ShippedOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ShippedOrder[]>([]);

  useEffect(() => {
    fetchShippedOrders();
  }, []);

  const fetchShippedOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/orders');
      const result = await response.json();

      if (result.success && result.data) {
        const ordersData = Array.isArray(result.data) ? result.data : result.data.orders || [];
        const shipped = ordersData
          .filter((order: Record<string, unknown>) => order.status === 'shipped')
          .map((order: Record<string, unknown>) => ({
            id: order.id as string,
            orderNo: (order.orderNo as string) || `ORD-${(order.id as string).substring(0, 8)}`,
            buyerName: (order.buyerName as string) || '未知買家',
            totalAmount: (order.totalAmount as number) || 0,
            quantity: (order.quantity as number) || 0,
            shippedAt: (order.updatedAt as string) || (order.createdAt as string),
            trackingNo: (order.trackingNo as string) || `TRK-${(order.id as string).substring(0, 10).toUpperCase()}`,
          }));
        setOrders(shipped);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('載入已出貨訂單錯誤:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">載入訂單中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">已出貨訂單</h1>
          <p className="mt-2 text-gray-600">已發貨等待配送的訂單</p>
        </div>
        <Button onClick={fetchShippedOrders} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">已出貨訂單</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">配送中商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {orders.reduce((sum, o) => sum + o.quantity, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">出貨總額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              TWD ${orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 已出貨訂單表格 */}
      <Card>
        <CardHeader>
          <CardTitle>已出貨訂單列表</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>訂單號</TableHead>
                    <TableHead>買家名稱</TableHead>
                    <TableHead className="text-right">數量</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>追蹤號</TableHead>
                    <TableHead>出貨時間</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.orderNo}</TableCell>
                      <TableCell>{order.buyerName}</TableCell>
                      <TableCell className="text-right">{order.quantity}</TableCell>
                      <TableCell className="text-right font-bold">
                        TWD ${order.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-blue-600">
                        {order.trackingNo}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(order.shippedAt).toLocaleDateString('zh-TW')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          <Package className="h-4 w-4 mr-1" />
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              暫無已出貨訂單
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
