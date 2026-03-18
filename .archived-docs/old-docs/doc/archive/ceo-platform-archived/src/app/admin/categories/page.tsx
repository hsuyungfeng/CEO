'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { CategoryTree } from '@/components/admin/category-tree';
import { BatchCategoryActions } from '@/components/admin/batch-category-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategoryForm } from '@/components/admin/category-form';

export default function CategoriesPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setSelectedIds([]);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">分類管理</h1>
          <p className="mt-2 text-gray-600">管理商品分類的樹狀結構</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增分類
        </Button>
      </div>

      <div className="mb-4">
        <BatchCategoryActions
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onSuccess={handleRefresh}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>分類列表</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryTree 
            key={refreshKey}
            onRefresh={handleRefresh}
          />
        </CardContent>
      </Card>

      {/* 創建分類對話框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增分類</DialogTitle>
            <DialogDescription>
              創建新的商品分類
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            onSuccess={() => {
              setShowCreateDialog(false);
              handleRefresh();
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}