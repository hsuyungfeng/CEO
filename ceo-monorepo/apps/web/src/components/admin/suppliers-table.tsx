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

const statusConfig = {
  PENDING: { label: '待審核', variant: 'secondary' as const },
  ACTIVE: { label: '已啟用', variant: 'success' as const },
  SUSPENDED: { label: '已停用', variant: 'warning' as const },
  REJECTED: { label: '已拒絕', variant: 'destructive' as const },
};

export default function SuppliersTable({ suppliers, onRefresh }: SuppliersTableProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleVerify = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>供應商名稱</TableHead>
              <TableHead>統一編號</TableHead>
              <TableHead>聯絡郵件</TableHead>
              <TableHead>聯絡電話</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>主帳號</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.companyName}</TableCell>
                <TableCell>{supplier.taxId}</TableCell>
                <TableCell>{supplier.email}</TableCell>
                <TableCell>{supplier.phone || '未提供'}</TableCell>
                <TableCell>
                  <Badge variant={statusConfig[supplier.status].variant}>
                    {statusConfig[supplier.status].label}
                  </Badge>
                </TableCell>
                <TableCell>{supplier.mainAccount?.name || '未關聯'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/admin/suppliers/${supplier.id}`}>
                      <Button variant="outline" size="sm">查看</Button>
                    </Link>
                    {supplier.status === 'PENDING' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleVerify(supplier)}
                      >
                        審核
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
