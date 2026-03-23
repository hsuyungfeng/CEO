'use client';

import { useState } from 'react';
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
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import VerifySupplierDialog from './verify-supplier-dialog';

interface Supplier {
  id: string;
  companyName: string;
  taxId: string;
  email: string;
  phone?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  mainAccount?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

interface SuppliersTableProps {
  suppliers: Supplier[];
  onRefresh: () => void;
}

const STATUS_STYLE: Record<Supplier['status'], string> = {
  PENDING:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  ACTIVE:    'bg-green-50 text-green-700 border-green-200',
  SUSPENDED: 'bg-orange-50 text-orange-700 border-orange-200',
  REJECTED:  'bg-red-50 text-red-600 border-red-200',
};

const STATUS_LABEL: Record<Supplier['status'], string> = {
  PENDING: '待審核', ACTIVE: '已啟用', SUSPENDED: '已停用', REJECTED: '已拒絕',
};

export default function SuppliersTable({ suppliers: initialSuppliers, onRefresh }: SuppliersTableProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // 同步外部 props 更新
  useState(() => { setSuppliers(initialSuppliers); });

  const handleVerify = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  async function quickAction(supplierId: string, action: 'verify' | 'reject' | 'suspend') {
    setActioningId(supplierId);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || '操作失敗');
      }
      const newStatus: Supplier['status'] =
        action === 'verify' ? 'ACTIVE' : action === 'reject' ? 'REJECTED' : 'SUSPENDED';
      setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, status: newStatus } : s));
      toast.success(action === 'verify' ? '供應商已核准' : action === 'reject' ? '供應商已拒絕' : '供應商已停用');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setActioningId(null);
    }
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>供應商名稱</TableHead>
              <TableHead>統一編號</TableHead>
              <TableHead>聯絡郵件</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>主帳號</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">暫無供應商</TableCell>
              </TableRow>
            )}
            {suppliers.map((supplier) => {
              const isActioning = actioningId === supplier.id;
              return (
                <TableRow key={supplier.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{supplier.companyName}</TableCell>
                  <TableCell className="text-sm text-gray-600">{supplier.taxId}</TableCell>
                  <TableCell className="text-sm">{supplier.email}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${STATUS_STYLE[supplier.status]}`}>
                      {STATUS_LABEL[supplier.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{supplier.mainAccount?.name || '未關聯'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Link href={`/admin/suppliers/${supplier.id}`}>
                        <Button variant="ghost" size="icon" className="w-7 h-7" title="查看詳情">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      {supplier.status === 'PENDING' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={isActioning}
                            onClick={() => quickAction(supplier.id, 'verify')}
                            title="核准供應商"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            disabled={isActioning}
                            onClick={() => quickAction(supplier.id, 'reject')}
                            title="拒絕供應商"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {supplier.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 text-xs h-7 px-2"
                          disabled={isActioning}
                          onClick={() => quickAction(supplier.id, 'suspend')}
                        >
                          停用
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedSupplier && (
        <VerifySupplierDialog
          supplier={selectedSupplier}
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
