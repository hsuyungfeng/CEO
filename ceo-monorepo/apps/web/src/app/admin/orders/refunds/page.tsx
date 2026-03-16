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

interface Refund {
  id: string;
  orderNo: string;
  buyerName: string;
  refundAmount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function RefundsPage() {
  const [loading, setLoading] = useState(false);
  const [refunds, setRefunds] = useState<Refund[]>([]);

  useEffect(() => {
    setRefunds([]);
  }, []);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: '待審核',
      approved: '已批准',
      rejected: '已拒絕',
    };
    return labels[status] || status;
  };

  const stats = {
    total: refunds.length,
    pending: refunds.filter(r => r.status === 'pending').length,
    approved: refunds.filter(r => r.status === 'approved').length,
    totalAmount: refunds.reduce((sum, r) => sum + r.refundAmount, 0),
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">退款管理</h1>
          <p className="mt-2 text-gray-600">管理所有退款申請</p>
        </div>
        <Button onClick={() => setLoading(!loading)} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">總退款申請</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">待審核</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">已批准</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">待退總額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">TWD ${stats.totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 退款表格 */}
      <Card>
        <CardHeader>
          <CardTitle>退款申請列表</CardTitle>
        </CardHeader>
        <CardContent>
          {refunds.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>訂單號</TableHead>
                    <TableHead>買家名稱</TableHead>
                    <TableHead className="text-right">退款金額</TableHead>
                    <TableHead>退款原因</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>申請時間</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="font-mono text-sm">{refund.orderNo}</TableCell>
                      <TableCell>{refund.buyerName}</TableCell>
                      <TableCell className="text-right font-bold">
                        TWD ${refund.refundAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{refund.reason}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(refund.status)}>
                          {getStatusLabel(refund.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(refund.createdAt).toLocaleDateString('zh-TW')}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {refund.status === 'pending' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <Check className="h-4 w-4 mr-1" />
                              批准
                            </Button>
                            <Button size="sm" variant="destructive">
                              <X className="h-4 w-4 mr-1" />
                              拒絕
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              暫無退款申請
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
