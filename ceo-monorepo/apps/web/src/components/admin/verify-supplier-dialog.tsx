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

interface Supplier {
  id: string;
  name: string;
  taxId: string;
  email: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
}

interface VerifySupplierDialogProps {
  supplier: Supplier;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VerifySupplierDialog({
  supplier,
  isOpen,
  onClose,
  onSuccess,
}: VerifySupplierDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/suppliers/${supplier.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to verify supplier: ${response.status}`);
      }

      console.log('[VerifySupplierDialog] Supplier verified successfully');
      onSuccess();
    } catch (err) {
      console.error('[VerifySupplierDialog] Error verifying supplier:', err);
      setError(err instanceof Error ? err.message : '無法驗證供應商');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>審核供應商</DialogTitle>
          <DialogDescription>
            確認審核並啟用供應商帳戶
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p><strong>供應商名稱：</strong> {supplier.name}</p>
            <p><strong>統一編號：</strong> {supplier.taxId}</p>
            <p><strong>聯絡郵件：</strong> {supplier.email}</p>
            <p><strong>目前狀態：</strong> 待審核</p>
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
          <Button onClick={handleVerify} disabled={loading}>
            {loading ? '驗證中...' : '確認審核'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
