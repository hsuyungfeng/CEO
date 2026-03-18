'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateCategorySchema, UpdateCategorySchema, CategoryWithChildren } from '@/types/admin';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// 根據模式選擇 schema
const getSchema = (isEdit: boolean) => {
  return isEdit ? UpdateCategorySchema : CreateCategorySchema;
};

interface CategoryFormProps {
  categoryId?: string;
  initialData?: {
    name: string;
    parentId: string | null;
    sortOrder: number;
    isActive: boolean;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function CategoryForm({ 
  categoryId, 
  initialData, 
  onSuccess, 
  onCancel 
}: CategoryFormProps) {
  const isEdit = !!categoryId;
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);

  // 加載可用分類（用於父分類選擇）
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/admin/categories');
        const result = await response.json();
        
        if (result.success) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error('加載分類錯誤:', error);
      }
    };

    loadCategories();
  }, []);

  // 初始化表單
  const form = useForm<z.infer<ReturnType<typeof getSchema>>>({
    resolver: zodResolver(getSchema(isEdit)),
    defaultValues: initialData || {
      name: '',
      parentId: null,
      sortOrder: 0,
      isActive: true,
    },
  });

  // 提交表單
  const onSubmit = async (data: z.infer<ReturnType<typeof getSchema>>) => {
    setLoading(true);
    try {
      const url = isEdit 
        ? `/api/admin/categories/${categoryId}`
        : '/api/admin/categories';
      
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(isEdit ? '分類更新成功' : '分類創建成功');
        onSuccess();
      } else {
        if (result.errors) {
          result.errors.forEach((error: any) => {
            form.setError(error.field as any, {
              type: 'manual',
              message: error.message,
            });
          });
        }
        toast.error(result.error || (isEdit ? '更新失敗' : '創建失敗'));
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('提交表單錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  // 遞歸生成分類選項
  const renderCategoryOptions = (
    categories: CategoryWithChildren[], 
    level = 0,
    excludeId?: string
  ): React.ReactElement[] => {
    const options: React.ReactElement[] = [];
    
    // 添加"無（頂級分類）"選項
    if (level === 0) {
      options.push(
        <SelectItem key="null" value="null">
          無（頂級分類）
        </SelectItem>
      );
    }

    for (const category of categories) {
      // 排除當前分類（編輯時）及其子分類
      if (category.id === excludeId) continue;

      const indent = '　'.repeat(level);
      options.push(
        <SelectItem key={category.id} value={category.id}>
          {indent}{category.name}
          {!category.isActive && ' (停用)'}
        </SelectItem>
      );

      // 遞歸添加子分類
      if (category.children && category.children.length > 0) {
        options.push(...renderCategoryOptions(category.children, level + 1, excludeId));
      }
    }

    return options;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>分類名稱</FormLabel>
              <FormControl>
                <Input 
                  placeholder="輸入分類名稱" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                分類名稱應簡潔明了，便於識別
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>父分類</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'null' ? null : value)}
                value={field.value || 'null'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇父分類" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {renderCategoryOptions(categories, 0, categoryId)}
                </SelectContent>
              </Select>
              <FormDescription>
                選擇父分類以建立層級關係，最多支持3級
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>排序值</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="0" 
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                數字越小排序越靠前，可為負數
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">啟用狀態</FormLabel>
                <FormDescription>
                  停用的分類將不會在前台顯示
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '處理中...' : (isEdit ? '更新分類' : '創建分類')}
          </Button>
        </div>
      </form>
    </Form>
  );
}