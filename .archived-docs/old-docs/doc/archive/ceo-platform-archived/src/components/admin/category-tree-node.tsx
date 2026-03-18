'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CategoryWithChildren } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Edit,
  Trash2,
  Move,
  ArrowUp,
  ArrowDown,
  MoreVertical,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CategoryForm } from './category-form';

interface CategoryTreeNodeProps {
  category: CategoryWithChildren;
  level: number;
  expandedAll: boolean;
  onRefresh: () => void;
  children?: React.ReactNode;
}

export function CategoryTreeNode({ 
  category, 
  level, 
  expandedAll, 
  onRefresh,
  children 
}: CategoryTreeNodeProps) {
  const [expanded, setExpanded] = useState(expandedAll);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChildren = category.children && category.children.length > 0;

  // 處理刪除分類
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('分類刪除成功');
        onRefresh();
        setShowDeleteDialog(false);
      } else {
        toast.error(result.error || '刪除失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('刪除分類錯誤:', error);
    }
  };

  // 處理移動分類
  const handleMove = async (newParentId: string | null) => {
    try {
      const response = await fetch(`/api/admin/categories/${category.id}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newParentId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('分類移動成功');
        onRefresh();
        setShowMoveDialog(false);
      } else {
        toast.error(result.error || '移動失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('移動分類錯誤:', error);
    }
  };

  // 處理重新排序
  const handleReorder = async (direction: 'up' | 'down') => {
    const newSortOrder = direction === 'up' ? category.sortOrder - 1 : category.sortOrder + 1;
    
    try {
      const response = await fetch(`/api/admin/categories/${category.id}/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newSortOrder }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('分類排序更新成功');
        onRefresh();
      } else {
        toast.error(result.error || '排序更新失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('更新排序錯誤:', error);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center px-4 py-3 hover:bg-gray-50 ${
          isDragging ? 'opacity-50 bg-blue-50' : ''
        }`}
      >
        {/* 拖拽手柄 */}
        <div
          className="mr-2 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>

        {/* 展開/收合按鈕 */}
        <div className="mr-2">
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* 分類名稱 */}
        <div className="col-span-5 flex items-center">
          <div className="flex items-center gap-2">
            <span className="font-medium">{category.name}</span>
            {!category.isActive && (
              <Badge variant="secondary" className="text-xs">
                停用
              </Badge>
            )}
          </div>
        </div>

        {/* 層級 */}
        <div className="col-span-2">
          <Badge variant="outline">
            {category.level} 級
          </Badge>
        </div>

        {/* 排序 */}
        <div className="col-span-2">
          <div className="flex items-center gap-1">
            <span className="font-mono">{category.sortOrder}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleReorder('up')}
                disabled={category.sortOrder === 0}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleReorder('down')}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* 商品數 */}
        <div className="col-span-1">
          <span className="text-sm text-gray-600">
            {category.productCount || 0}
          </span>
        </div>

        {/* 操作按鈕 */}
        <div className="col-span-2 flex justify-end gap-1">
          <Link href={`/admin/products?categoryId=${category.id}`}>
            <Button variant="ghost" size="sm">
              查看商品
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                編輯
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
                <Move className="mr-2 h-4 w-4" />
                移動
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                刪除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 子分類 */}
      {expanded && children}

      {/* 編輯對話框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯分類</DialogTitle>
            <DialogDescription>
              修改分類信息
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            categoryId={category.id}
            initialData={{
              name: category.name,
              parentId: category.parentId,
              sortOrder: category.sortOrder,
              isActive: category.isActive,
            }}
            onSuccess={() => {
              setShowEditDialog(false);
              onRefresh();
            }}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 移動對話框 */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移動分類</DialogTitle>
            <DialogDescription>
              選擇新的父分類或設為頂級分類
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={() => handleMove(null)}
              >
                設為頂級分類
              </Button>
              {/* 這裡可以添加分類選擇器來選擇新的父分類 */}
              <p className="text-sm text-gray-500">
                注意：移動分類可能會影響層級結構
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              確定要刪除分類 &ldquo;{category.name}&rdquo; 嗎？
              {category.productCount && category.productCount > 0 && (
                <p className="mt-2 text-red-600">
                  警告：該分類下有 {category.productCount} 個商品，刪除後這些商品將變為未分類狀態。
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              確認刪除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}