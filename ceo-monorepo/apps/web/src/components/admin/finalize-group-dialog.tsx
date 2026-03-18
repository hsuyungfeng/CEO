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

interface GroupBuy {
  id: string;
  name: string;
  memberCount: number;
  totalAmount: number;
  discountPercentage: number;
}

interface FinalizeGroupDialogProps {
  group: GroupBuy;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DISCOUNT_TIERS = [
  { min: 1, max: 99, discount: 0 },
  { min: 100, max: 499, discount: 5 },
  { min: 500, max: Infinity, discount: 10 },
];

export default function FinalizeGroupDialog({
  group,
  isOpen,
  onClose,
  onSuccess,
}: FinalizeGroupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateDiscount = () => {
    const tier = DISCOUNT_TIERS.find(t => group.memberCount >= t.min && group.memberCount <= t.max);
    return tier?.discount || 0;
  };

  const discount = calculateDiscount();
  const discountAmount = (group.totalAmount * discount) / 100;
  const finalAmount = group.totalAmount - discountAmount;

  const handleFinalize = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/groups/${group.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountPercentage: discount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to finalize group: ${response.status}`);
      }

      console.log('[FinalizeGroupDialog] Group finalized successfully');
      onSuccess();
    } catch (err) {
      console.error('[FinalizeGroupDialog] Error finalizing group:', err);
      setError(err instanceof Error ? err.message : '無法結算團購');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>結算團購</DialogTitle>
          <DialogDescription>
            確認結算並計算折扣
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p><strong>團購名稱：</strong> {group.name}</p>
            <p><strong>成員數：</strong> {group.memberCount}</p>
            <p><strong>折扣層級：</strong> {discount}% ({group.memberCount} 件)</p>
            <hr className="my-2" />
            <p><strong>原始金額：</strong> ${group.totalAmount}</p>
            <p><strong>折扣金額：</strong> -${discountAmount.toFixed(2)}</p>
            <p className="text-lg font-bold"><strong>結算金額：</strong> ${finalAmount.toFixed(2)}</p>
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
          <Button onClick={handleFinalize} disabled={loading}>
            {loading ? '結算中...' : '確認結算'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
