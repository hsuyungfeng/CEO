'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
}

interface FaqSortableItemProps {
  faq: FaqItem;
}

export function FaqSortableItem({ faq }: FaqSortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-2 ${isDragging ? 'shadow-lg' : ''}`}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 拖拽手柄 */}
            <div
              className="cursor-grab active:cursor-grabbing touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>

            {/* 內容 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 line-clamp-1">
                  {faq.question}
                </h3>
                <Badge variant={faq.isActive ? "default" : "secondary"}>
                  {faq.isActive ? '啟用' : '停用'}
                </Badge>
                <span className="text-xs text-gray-500 ml-auto">
                  排序: {faq.sortOrder}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2">
                {faq.answer}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}