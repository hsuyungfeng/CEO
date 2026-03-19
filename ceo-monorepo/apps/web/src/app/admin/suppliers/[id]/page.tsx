'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SupplierDetail {
  id: string;
  taxId: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string | null;
  industry: string | null;
  description: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  mainAccount: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  applicationsCount: number;
  productsCount: number;
  avgRating: number;
  totalRatings: number;
  onTimeDeliveryRate: number;
  totalDeliveries: number;
}

const statusConfig = {
  PENDING: { label: '待審核', variant: 'secondary' as const },
  ACTIVE: { label: '已啟用', variant: 'default' as const },
  SUSPENDED: { label: '已停用', variant: 'secondary' as const },
  REJECTED: { label: '已拒絕', variant: 'destructive' as const },
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/suppliers/${params.id}`);
        if (!response.ok) throw new Error(`載入失敗: ${response.status}`);
        const json = await response.json();
        setSupplier(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '無法載入供應商資料');
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [params.id]);

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;
  if (error) return (
    <div className="p-6">
      <p className="text-red-500 mb-4">{error}</p>
      <Button variant="outline" onClick={() => router.back()}>返回</Button>
    </div>
  );
  if (!supplier) return null;

  const status = statusConfig[supplier.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>← 返回</Button>
          <h1 className="text-3xl font-bold">{supplier.companyName}</h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>基本資料</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="統一編號" value={supplier.taxId} />
            <Row label="聯絡人" value={supplier.contactPerson} />
            <Row label="電話" value={supplier.phone} />
            <Row label="電子郵件" value={supplier.email} />
            <Row label="地址" value={supplier.address || '未提供'} />
            <Row label="產業" value={supplier.industry || '未提供'} />
            <Row label="描述" value={supplier.description || '未提供'} />
            <Row label="建立時間" value={new Date(supplier.createdAt).toLocaleDateString('zh-TW')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>主帳號資訊</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {supplier.mainAccount ? (
              <>
                <Row label="姓名" value={supplier.mainAccount.name} />
                <Row label="電子郵件" value={supplier.mainAccount.email} />
                <Row label="電話" value={supplier.mainAccount.phone || '未提供'} />
              </>
            ) : (
              <p className="text-gray-500">尚未關聯主帳號</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>業務統計</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="商品數量" value={`${supplier.productsCount} 項`} />
            <Row label="申請數量" value={`${supplier.applicationsCount} 筆`} />
            <Row label="平均評分" value={supplier.avgRating > 0 ? `${supplier.avgRating.toFixed(1)} / 5` : '尚無評分'} />
            <Row label="總評分數" value={`${supplier.totalRatings} 筆`} />
            <Row label="準時交貨率" value={supplier.totalDeliveries > 0 ? `${(supplier.onTimeDeliveryRate * 100).toFixed(1)}%` : '尚無資料'} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
