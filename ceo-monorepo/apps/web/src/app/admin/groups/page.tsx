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
