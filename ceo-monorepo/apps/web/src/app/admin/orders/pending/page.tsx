'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Check, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface PendingOrder {
  id: string;
  orderNo: string;
  buyerName: string;
  totalAmount: number;
  quantity: number;
  createdAt: string;
}

export default function PendingOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PendingOrder[]>([]);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/orders');
      const result = await response.json();

      if (result.success && result.data) {
        const ordersData = Array.isArray(result.data) ? result.data : result.data.orders || [];
        const pending = ordersData
          .filter((order: any) => order.status === 'pending')
          .map((order: any) => ({
            id: order.id,
            orderNo: order.orderNo || `ORD-${order.id.substring(0, 8)}`,
            buyerName: order.buyerName || '未知買家',
            totalAmount: order.totalAmount || 0,
            quantity: order.quantity || 0,
            createdAt: order.createdAt,
          }));
        setOrders(pending);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('載入待確認訂單錯誤:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (orderId: string) => {
    // TODO: 實現確認訂單邏輯
    console.log('確認訂單:', orderId);
  };

  const handleReject = async (orderId: string) => {
    // TODO: 實現拒絕訂單邏輯
    console.log('拒絕訂單:', orderId);
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
          <h1 className="text-3xl font-bold text-gray-900">待確認訂單</h1>
          <p className="mt-2 text-gray-600">需要您確認或拒絕的訂單</p>
        </div>
        <Button onClick={fetchPendingOrders} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* 統計 */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">待確認訂單數</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">{orders.length}</div>
        </CardContent>
      </Card>

      {/* 訂單表格 */}
      <Card>
        <CardHeader>
          <CardTitle>待確認訂單列表</CardTitle>
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
                    <TableHead>建立時間</TableHead>
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
                      <TableCell className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('zh-TW')}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleConfirm(order.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          確認
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(order.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          拒絕
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              暫無待確認訂單
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
