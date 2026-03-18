'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SupplierOrder {
  id: string;
  orderNo: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  createdAt: string;
  buyer?: {
    name: string;
  };
}

interface SupplierOrdersTableProps {
  orders: SupplierOrder[];
}

const statusConfig = {
  PENDING: { label: '待處理', variant: 'secondary' as const },
  CONFIRMED: { label: '已確認', variant: 'default' as const },
  SHIPPED: { label: '已出貨', variant: 'warning' as const },
  COMPLETED: { label: '已完成', variant: 'success' as const },
  CANCELLED: { label: '已取消', variant: 'destructive' as const },
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW');
};

export default function SupplierOrdersTable({ orders }: SupplierOrdersTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>訂單編號</TableHead>
            <TableHead>買家名稱</TableHead>
            <TableHead>商品數量</TableHead>
            <TableHead>訂單金額</TableHead>
            <TableHead>狀態</TableHead>
            <TableHead>訂購日期</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.orderNo}</TableCell>
              <TableCell>{order.buyer?.name || '未知買家'}</TableCell>
              <TableCell>{order.items.length}</TableCell>
              <TableCell>${order.totalAmount}</TableCell>
              <TableCell>
                <Badge variant={statusConfig[order.status].variant}>
                  {statusConfig[order.status].label}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(order.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Link href={`/supplier/orders/${order.id}`}>
                  <Button variant="outline" size="sm">查看詳情</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
