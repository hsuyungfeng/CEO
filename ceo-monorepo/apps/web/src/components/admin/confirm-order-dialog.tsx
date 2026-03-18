'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Order {
  id: string;
  orderNo: string;
  totalAmount: number;
}

interface ConfirmOrderDialogProps {
  order: Order;
  action: 'confirm' | 'reject';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConfirmOrderDialog({
  order,
  action,
  isOpen,
  onClose,
  onSuccess,
}: ConfirmOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    try {
      setLoading(true);
      setError(null);

      const status = action === 'confirm' ? 'CONFIRMED' : 'CANCELLED';
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} order: ${response.status}`);
      }

      console.log(`[ConfirmOrderDialog] Order ${action}d successfully`);
      onSuccess();
    } catch (err) {
      console.error('[ConfirmOrderDialog] Error processing order:', err);
      setError(err instanceof Error ? err.message : `無法${action === 'confirm' ? '確認' : '拒絕'}訂單`);
    } finally {
      setLoading(false);
    }
  };

  const title = action === 'confirm' ? '確認訂單' : '拒絕訂單';
  const description = action === 'confirm' ? '確認該訂單並開始處理' : '拒絕該訂單並退款給買家';
  const buttonText = action === 'confirm' ? '確認訂單' : '拒絕訂單';
  const actionText = action === 'confirm' ? '確認中...' : '拒絕中...';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p><strong>訂單編號：</strong> {order.orderNo}</p>
            <p><strong>訂單金額：</strong> ${order.totalAmount}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button
            onClick={handleAction}
            disabled={loading}
            variant={action === 'confirm' ? 'default' : 'destructive'}
          >
            {loading ? actionText : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
