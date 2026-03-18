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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { FaqSortableItem } from './FaqSortableItem';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
}

interface FaqReorderProps {
  onBack?: () => void;
}

export function FaqReorder({ onBack }: FaqReorderProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 加載 FAQ 數據
  const loadFaqs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/faqs?limit=100');
      const result = await response.json();
      
      if (result.success) {
        // 按當前排序值排序
        const sortedFaqs = [...result.data].sort((a, b) => a.sortOrder - b.sortOrder);
        setFaqs(sortedFaqs);
        setHasChanges(false);
      } else {
        toast.error(result.error || '加載 FAQ 失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('加載 FAQ 錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  // 處理拖拽結束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFaqs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // 更新排序值（從 1 開始）
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          sortOrder: index + 1,
        }));
        
        setHasChanges(true);
        return updatedItems;
      });
    }
  };

  // 保存排序
  const handleSave = async () => {
    setSaving(true);
    try {
      const items = faqs.map((faq, index) => ({
        id: faq.id,
        sortOrder: index + 1, // 確保從 1 開始
      }));

      const response = await fetch('/api/admin/faqs/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('FAQ 排序更新成功');
        setHasChanges(false);
        loadFaqs(); // 重新加載以確認更新
      } else {
        toast.error(result.error || '排序更新失敗');
        if (result.errors) {
          result.errors.forEach((error: { field: string; message: string }) => {
            console.error(`字段 ${error.field}: ${error.message}`);
          });
        }
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('更新排序錯誤:', error);
    } finally {
      setSaving(false);
    }
  };

  // 重置排序
  const handleReset = () => {
    loadFaqs();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">加載 FAQ 中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>FAQ 排序</CardTitle>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                disabled={saving}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回列表
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={saving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重置
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? '保存中...' : '保存排序'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4 text-sm text-gray-600">
          <p>拖拽 FAQ 項目以重新排序，排序值將從 1 開始自動更新。</p>
          <p className="mt-1">提示：拖拽左側的抓取手柄進行排序。</p>
        </div>

        {faqs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暫無 FAQ 數據
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={faqs.map(faq => faq.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {faqs.map((faq) => (
                  <FaqSortableItem key={faq.id} faq={faq} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {hasChanges && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              有未保存的排序變更，請點擊「保存排序」按鈕以保存變更。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}