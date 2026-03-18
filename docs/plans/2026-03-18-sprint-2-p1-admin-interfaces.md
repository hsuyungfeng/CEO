# Sprint 2 (P1) 四個管理員界面實裝計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實裝 4 個關鍵缺失界面（供應商管理、訂單查看、團購管理、待處理訂單），完成 CEO 平台的核心管理功能。

**Architecture:**
- 使用 Next.js 動態路由 (`[id]/page.tsx`) 實現列表 + 詳情頁模式
- Client-side fetch with `useEffect` + `useState` 進行 API 整合
- 統一的列表表格設計（參考已完成的 `/admin/members`、`/admin/products`）
- Dialog 對話框進行確認/操作動作
- 完整的 loading/error 狀態處理

**Tech Stack:**
- Next.js 16 (React 19, TypeScript)
- shadcn/ui (Table, Dialog, Badge, Button)
- TailwindCSS
- Fetch API with error handling

---

## Task 1: `/admin/suppliers` 供應商管理列表

**Files:**
- Create: `src/app/admin/suppliers/page.tsx`
- Create: `src/components/admin/suppliers-table.tsx`
- Create: `src/components/admin/verify-supplier-dialog.tsx`
- Modify: `src/components/admin/sidebar.tsx` (add navigation link)

**Step 1: 建立 suppliers 列表頁面**

創建 `src/app/admin/suppliers/page.tsx`：

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import SuppliersTable from '@/components/admin/suppliers-table';

interface Supplier {
  id: string;
  name: string;
  taxId: string;
  email: string;
  phone?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  mainAccount?: {
    accountBalance: number;
  };
  createdAt: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const url = new URL('/api/suppliers', window.location.origin);
        if (statusFilter) url.searchParams.append('status', statusFilter);

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch suppliers: ${response.status}`);
        }

        const data = await response.json();
        console.log('[SuppliersPage] Fetched suppliers:', data);

        const suppliersList = Array.isArray(data) ? data : (data.data || data.suppliers || []);
        setSuppliers(suppliersList);
      } catch (err) {
        console.error('[SuppliersPage] Error fetching suppliers:', err);
        setError(err instanceof Error ? err.message : '無法載入供應商列表');
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [statusFilter]);

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      <h1 className="text-3xl font-bold">供應商管理</h1>

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
    </div>
  );
}
```

**Step 2: 建立供應商表格元件**

創建 `src/components/admin/suppliers-table.tsx`：

```typescript
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
  name: string;
  taxId: string;
  email: string;
  phone?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  mainAccount?: {
    accountBalance: number;
  };
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
              <TableHead>帳戶餘額</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.taxId}</TableCell>
                <TableCell>{supplier.email}</TableCell>
                <TableCell>{supplier.phone || '未提供'}</TableCell>
                <TableCell>
                  <Badge variant={statusConfig[supplier.status].variant}>
                    {statusConfig[supplier.status].label}
                  </Badge>
                </TableCell>
                <TableCell>${supplier.mainAccount?.accountBalance || 0}</TableCell>
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
```

**Step 3: 建立審核對話框元件**

創建 `src/components/admin/verify-supplier-dialog.tsx`：

```typescript
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
```

**Step 4: 修改 Admin Sidebar 加入導航連結**

修改 `src/components/admin/sidebar.tsx`，在 navigation 陣列中添加：

```typescript
{
  name: '供應商管理',
  href: '/admin/suppliers',
  icon: Building,
}
```

**Step 5: 提交**

```bash
git add src/app/admin/suppliers/page.tsx src/components/admin/suppliers-table.tsx src/components/admin/verify-supplier-dialog.tsx src/components/admin/sidebar.tsx
git commit -m "feat: add supplier management admin interface with verification workflow"
```

---

## Task 2: `/supplier/orders` 供應商訂單查看

**Files:**
- Create: `src/app/supplier/orders/page.tsx`
- Create: `src/components/supplier/supplier-orders-table.tsx`

**Step 1: 建立供應商訂單列表頁面**

創建 `src/app/supplier/orders/page.tsx`：

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SupplierOrdersTable from '@/components/supplier/supplier-orders-table';

interface SupplierOrder {
  id: string;
  orderNo: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
  buyer?: {
    name: string;
    email: string;
  };
}

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const url = new URL('/api/supplier/orders', window.location.origin);
        if (statusFilter) url.searchParams.append('status', statusFilter);
        if (dateRange.start) url.searchParams.append('startDate', dateRange.start);
        if (dateRange.end) url.searchParams.append('endDate', dateRange.end);

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.status}`);
        }

        const data = await response.json();
        console.log('[SupplierOrdersPage] Fetched orders:', data);

        const ordersList = Array.isArray(data) ? data : (data.data || data.orders || []);
        setOrders(ordersList);
      } catch (err) {
        console.error('[SupplierOrdersPage] Error fetching orders:', err);
        setError(err instanceof Error ? err.message : '無法載入訂單');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [statusFilter, dateRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">我的訂單</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">我的訂單</h1>
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
      <h1 className="text-3xl font-bold">我的訂單</h1>

      <Card>
        <CardHeader>
          <CardTitle>篩選</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">所有狀態</option>
              <option value="PENDING">待處理</option>
              <option value="CONFIRMED">已確認</option>
              <option value="SHIPPED">已出貨</option>
              <option value="COMPLETED">已完成</option>
              <option value="CANCELLED">已取消</option>
            </select>

            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-4 py-2 border rounded-md"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-4 py-2 border rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      <SupplierOrdersTable orders={orders} />

      {orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">沒有訂單</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: 建立供應商訂單表格**

創建 `src/components/supplier/supplier-orders-table.tsx`：

```typescript
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
```

**Step 3: 提交**

```bash
git add src/app/supplier/orders/page.tsx src/components/supplier/supplier-orders-table.tsx
git commit -m "feat: add supplier orders list and viewing interface"
```

---

## Task 3: `/admin/groups` 團購管理

**Files:**
- Create: `src/app/admin/groups/page.tsx`
- Create: `src/components/admin/groups-table.tsx`
- Create: `src/components/admin/finalize-group-dialog.tsx`

**Step 1: 建立團購列表頁面**

創建 `src/app/admin/groups/page.tsx`：

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GroupsTable from '@/components/admin/groups-table';

interface GroupBuy {
  id: string;
  name: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  memberCount: number;
  totalAmount: number;
  discountPercentage: number;
  createdAt: string;
  finalizedAt?: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const url = new URL('/api/admin/groups', window.location.origin);
        if (statusFilter) url.searchParams.append('status', statusFilter);

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch groups: ${response.status}`);
        }

        const data = await response.json();
        console.log('[GroupsPage] Fetched groups:', data);

        const groupsList = Array.isArray(data) ? data : (data.data || data.groups || []);
        setGroups(groupsList);
      } catch (err) {
        console.error('[GroupsPage] Error fetching groups:', err);
        setError(err instanceof Error ? err.message : '無法載入團購');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [statusFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">團購管理</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">團購管理</h1>
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
      <h1 className="text-3xl font-bold">團購管理</h1>

      <Card>
        <CardHeader>
          <CardTitle>篩選</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="ACTIVE">進行中</option>
            <option value="COMPLETED">已完成</option>
            <option value="CANCELLED">已取消</option>
          </select>
        </CardContent>
      </Card>

      <GroupsTable groups={groups} onRefresh={() => window.location.reload()} />
    </div>
  );
}
```

**Step 2: 建立團購表格**

創建 `src/components/admin/groups-table.tsx`：

```typescript
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
import FinalizeGroupDialog from './finalize-group-dialog';

interface GroupBuy {
  id: string;
  name: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  memberCount: number;
  totalAmount: number;
  discountPercentage: number;
  createdAt: string;
}

interface GroupsTableProps {
  groups: GroupBuy[];
  onRefresh: () => void;
}

const statusConfig = {
  ACTIVE: { label: '進行中', variant: 'secondary' as const },
  COMPLETED: { label: '已完成', variant: 'success' as const },
  CANCELLED: { label: '已取消', variant: 'destructive' as const },
};

export default function GroupsTable({ groups, onRefresh }: GroupsTableProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupBuy | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFinalize = (group: GroupBuy) => {
    setSelectedGroup(group);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>團購名稱</TableHead>
              <TableHead>成員數</TableHead>
              <TableHead>總金額</TableHead>
              <TableHead>折扣</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>建立日期</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{group.memberCount}</TableCell>
                <TableCell>${group.totalAmount}</TableCell>
                <TableCell>{group.discountPercentage}%</TableCell>
                <TableCell>
                  <Badge variant={statusConfig[group.status].variant}>
                    {statusConfig[group.status].label}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(group.createdAt).toLocaleDateString('zh-TW')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/admin/groups/${group.id}`}>
                      <Button variant="outline" size="sm">查看</Button>
                    </Link>
                    {group.status === 'ACTIVE' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleFinalize(group)}
                      >
                        結算
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedGroup && (
        <FinalizeGroupDialog
          group={selectedGroup}
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
```

**Step 3: 建立結算對話框**

創建 `src/components/admin/finalize-group-dialog.tsx`：

```typescript
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
```

**Step 4: 修改 Admin Sidebar 加入團購管理**

修改 `src/components/admin/sidebar.tsx`，在 navigation 陣列中添加：

```typescript
{
  name: '團購管理',
  href: '/admin/groups',
  icon: Users,
}
```

**Step 5: 提交**

```bash
git add src/app/admin/groups/page.tsx src/components/admin/groups-table.tsx src/components/admin/finalize-group-dialog.tsx src/components/admin/sidebar.tsx
git commit -m "feat: add group buying management interface with settlement workflow"
```

---

## Task 4: `/admin/orders/pending` 待處理訂單確認邏輯

**Files:**
- Modify: `src/app/admin/orders/pending/page.tsx`
- Create: `src/components/admin/pending-orders-table.tsx`
- Create: `src/components/admin/confirm-order-dialog.tsx`

**Step 1: 查看現有待處理訂單頁面**

檢查 `src/app/admin/orders/pending/page.tsx` 的當前狀態（已存在但有 TODO）

**Step 2: 建立待處理訂單表格**

創建 `src/components/admin/pending-orders-table.tsx`：

```typescript
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
import { Badge } from '@/components/ui/badge';
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
                <TableCell>{new Date(order.createdAt).toLocaleDateString('zh-TW')}</TableCell>
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
```

**Step 3: 建立訂單確認對話框**

創建 `src/components/admin/confirm-order-dialog.tsx`：

```typescript
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
```

**Step 4: 更新待處理訂單頁面**

替換 `src/app/admin/orders/pending/page.tsx`：

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import PendingOrdersTable from '@/components/admin/pending-orders-table';

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

export default function PendingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/orders?status=PENDING');

        if (!response.ok) {
          throw new Error(`Failed to fetch pending orders: ${response.status}`);
        }

        const data = await response.json();
        console.log('[PendingOrdersPage] Fetched pending orders:', data);

        const ordersList = Array.isArray(data) ? data : (data.data || data.orders || []);
        setOrders(ordersList);
      } catch (err) {
        console.error('[PendingOrdersPage] Error fetching pending orders:', err);
        setError(err instanceof Error ? err.message : '無法載入待處理訂單');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingOrders();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">待處理訂單</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">待處理訂單</h1>
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
        <h1 className="text-3xl font-bold">待處理訂單</h1>
        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
          {orders.length} 個待處理
        </span>
      </div>

      {orders.length > 0 ? (
        <PendingOrdersTable orders={orders} onRefresh={() => window.location.reload()} />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">沒有待處理訂單</p>
        </div>
      )}
    </div>
  );
}
```

**Step 5: 提交**

```bash
git add src/app/admin/orders/pending/page.tsx src/components/admin/pending-orders-table.tsx src/components/admin/confirm-order-dialog.tsx
git commit -m "feat: implement pending order confirmation and rejection workflow"
```

---

## Final: 整體驗證與提交

**Step 1: 驗證 Build**

```bash
cd ceo-monorepo/apps/web && pnpm build
```

Expected: Build 完成無錯誤

**Step 2: 驗證 TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: 無型別錯誤

**Step 3: 最終提交**

```bash
git log --oneline -10
git status
```

All tasks should be committed.

---

## 完成檢查清單

- [ ] Task 1: `/admin/suppliers` 供應商管理（建立、表格、審核對話框、導航）
- [ ] Task 2: `/supplier/orders` 訂單查看（列表頁、表格）
- [ ] Task 3: `/admin/groups` 團購管理（列表頁、表格、結算對話框、導航）
- [ ] Task 4: `/admin/orders/pending` 待處理訂單（列表、表格、確認對話框）
- [ ] Build 驗證通過
- [ ] TypeScript 型別檢查通過
- [ ] 所有變更已提交至 git

---

## 技術參考

### API 端點（已驗證可用）
- `GET /api/suppliers` - 列表所有供應商
- `POST /api/suppliers/{id}/verify` - 驗證供應商
- `GET /api/supplier/orders` - 供應商訂單
- `GET /api/admin/groups` - 團購列表
- `POST /api/admin/groups/{id}/finalize` - 結算團購
- `GET /api/orders` - 訂單列表（支援狀態過濾）
- `PATCH /api/orders/{id}` - 更新訂單狀態

### 元件參考
- `shadcn/ui Table` - 表格顯示
- `shadcn/ui Dialog` - 確認對話框
- `shadcn/ui Badge` - 狀態標籤
- `shadcn/ui Button` - 按鈕
- `next/link` - 路由連結

### 型別定義範本
所有頁面應包含：
```typescript
interface Item {
  id: string;
  status: 'STATUS1' | 'STATUS2';
  createdAt: string;
}
```

