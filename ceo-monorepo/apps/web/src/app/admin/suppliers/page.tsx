'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search } from 'lucide-react';
import SuppliersTable from '@/components/admin/suppliers-table';
import CreateSupplierDialog from '@/components/admin/create-supplier-dialog';

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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  async function fetchSuppliers() {
    try {
      setLoading(true);
      const url = new URL('/api/suppliers', window.location.origin);
      if (statusFilter) url.searchParams.append('status', statusFilter);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const suppliersList = Array.isArray(data) ? data : (data.data || data.suppliers || []);
      setSuppliers(suppliersList);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入供應商列表');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const doFetch = async () => {
      fetchSuppliers();
    };

    fetchSuppliers();
  }, [statusFilter]);

  const filteredSuppliers = suppliers.filter(supplier =>
    (supplier.companyName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.taxId.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">供應商管理</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">供應商管理</h1>
        <div className="text-center py-12">
          <p className="text-red-500">錯誤：{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">供應商管理</h1>
        <Button onClick={() => setIsCreateOpen(true)}>+ 新增供應商</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>篩選</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="搜尋供應商名稱或統一編號..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">所有狀態</option>
              <option value="PENDING">待審核</option>
              <option value="ACTIVE">已啟用</option>
              <option value="SUSPENDED">已停用</option>
              <option value="REJECTED">已拒絕</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <SuppliersTable suppliers={filteredSuppliers} onRefresh={() => window.location.reload()} />

      <CreateSupplierDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
