'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CategoryWithChildren } from '@/types/admin';
import { CategoryTreeNode } from './category-tree-node';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryTreeProps {
  initialCategories?: CategoryWithChildren[];
  onRefresh?: () => void;
}

export function CategoryTree({ initialCategories = [], onRefresh }: CategoryTreeProps) {
  const [categories, setCategories] = useState<CategoryWithChildren[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 加載分類數據
  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/categories?includeInactive=${showInactive}`);
      const result = await response.json();
      
      if (result.success) {
        setCategories(result.data);
      } else {
        toast.error(result.error || '加載分類失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('加載分類錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [showInactive]);

  // 處理拖拽結束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      try {
        // 發送重新排序請求
        const response = await fetch(`/api/admin/categories/${active.id}/reorder`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newSortOrder: parseInt(over.id as string),
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast.success('分類排序更新成功');
          loadCategories(); // 重新加載數據
        } else {
          toast.error(result.error || '排序更新失敗');
        }
      } catch (error) {
        toast.error('網絡錯誤，請稍後再試');
        console.error('更新排序錯誤:', error);
      }
    }
  };

  // 展開/收合所有分類
  const [expandedAll, setExpandedAll] = useState(false);
  const toggleExpandAll = () => {
    setExpandedAll(!expandedAll);
  };

  // 遞歸渲染分類樹
  const renderCategoryTree = (categories: CategoryWithChildren[], level = 0) => {
    return categories.map((category) => (
      <CategoryTreeNode
        key={category.id}
        category={category}
        level={level}
        expandedAll={expandedAll}
        onRefresh={loadCategories}
      >
        {category.children && category.children.length > 0 && (
          <div className="ml-6 mt-2 border-l-2 border-gray-200 pl-4">
            {renderCategoryTree(category.children, level + 1)}
          </div>
        )}
      </CategoryTreeNode>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpandAll}
          >
            {expandedAll ? '收合所有' : '展開所有'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {showInactive ? '只顯示啟用' : '顯示所有'}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadCategories}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
            <div className="col-span-5">分類名稱</div>
            <div className="col-span-2">層級</div>
            <div className="col-span-2">排序</div>
            <div className="col-span-1">商品數</div>
            <div className="col-span-2 text-right">操作</div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={categories.map((c, index) => index.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  加載中...
                </div>
              ) : categories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  暫無分類數據
                </div>
              ) : (
                renderCategoryTree(categories)
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}