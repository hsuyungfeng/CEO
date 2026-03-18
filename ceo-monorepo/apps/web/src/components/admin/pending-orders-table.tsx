'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import ConfirmOrderDialog from './confirm-order-dialog';

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

interface PendingOrdersTableProps {
  orders: Order[];
  onRefresh: () => void;
}

export default function PendingOrdersTable({ orders, onRefresh }: PendingOrdersTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [action, setAction] = useState<'confirm' | 'reject'>('confirm');

  const handleAction = (order: Order, orderAction: 'confirm' | 'reject') => {
    setSelectedOrder(order);
    setAction(orderAction);
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>訂單編號</TableHead>
              <TableHead>買家名稱</TableHead>
              <TableHead>商品數量</TableHead>
              <TableHead>訂單金額</TableHead>
              <TableHead>訂購日期</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNo}</TableCell>
                <TableCell>{order.buyer?.name || '未知買家'}</TableCell>
                <TableCell>{order.itemCount}</TableCell>
                <TableCell>${order.totalAmount}</TableCell>
                <TableCell>{formatDate(order.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAction(order, 'confirm')}
                    >
                      確認
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleAction(order, 'reject')}
                    >
                      拒絕
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedOrder && (
        <ConfirmOrderDialog
          order={selectedOrder}
          action={action}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={() => {
            setIsDialogOpen(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
