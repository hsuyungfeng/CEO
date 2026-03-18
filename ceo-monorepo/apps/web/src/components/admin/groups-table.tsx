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
