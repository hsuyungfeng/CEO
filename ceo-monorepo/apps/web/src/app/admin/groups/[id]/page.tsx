'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface GroupDetail {
  id: string;
  name: string;
  status: string;
  memberCount: number;
  totalAmount: number;
  totalItems: number;
  discountPercentage: number;
  deadline: string | null;
  createdAt: string;
  orders: {
    id: string;
    orderNo: string;
    status: string;
    totalAmount: number;
    groupRefund: number;
    isGroupLeader: boolean;
    createdAt: string;
    user: { id: string; name: string; email: string };
    items: { productName: string; quantity: number; unitPrice: number }[];
  }[];
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING:   { label: '待確認', variant: 'secondary' },
  CONFIRMED: { label: '進行中', variant: 'default' },
  SHIPPED:   { label: '已出貨', variant: 'outline' },
  COMPLETED: { label: '已完成', variant: 'outline' },
  CANCELLED: { label: '已取消', variant: 'destructive' },
};

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/groups/${params.id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setGroup(json.data);
        else setError(json.error || '載入失敗');
      })
      .catch(() => setError('無法連線'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;
  if (error) return (
    <div className="p-6 space-y-4">
      <p className="text-red-500">{error}</p>
      <Button variant="outline" onClick={() => router.back()}>返回</Button>
    </div>
  );
  if (!group) return null;

  const st = statusConfig[group.status] ?? { label: group.status, variant: 'secondary' as const };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>← 返回</Button>
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <Badge variant={st.variant}>{st.label}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="成員數" value={`${group.memberCount} 人`} />
        <StatCard label="總金額" value={`$${group.totalAmount.toLocaleString()}`} />
        <StatCard label="總件數" value={`${group.totalItems} 件`} />
        <StatCard label="折扣" value={`${group.discountPercentage}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>基本資訊</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="團購 ID" value={group.id} />
            <Row label="建立時間" value={new Date(group.createdAt).toLocaleString('zh-TW')} />
            <Row label="截止時間" value={group.deadline ? new Date(group.deadline).toLocaleString('zh-TW') : '未設定'} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>訂單列表（{group.orders.length} 筆）</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>訂單號</TableHead>
                <TableHead>成員</TableHead>
                <TableHead>金額</TableHead>
                <TableHead>預計返利</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>是否團長</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.orders.map(order => {
                const os = statusConfig[order.status] ?? { label: order.status, variant: 'secondary' as const };
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.orderNo}</TableCell>
                    <TableCell>{order.user.name}</TableCell>
                    <TableCell>${order.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>${order.groupRefund.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={os.variant}>{os.label}</Badge></TableCell>
                    <TableCell>{order.isGroupLeader ? '✓ 團長' : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
