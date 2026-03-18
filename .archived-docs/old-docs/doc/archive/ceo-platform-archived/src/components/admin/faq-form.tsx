'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// 從 API schemas 導入
import { faqSchema, faqUpdateSchema } from '@/app/api/admin/faqs/schema';

// 根據模式選擇 schema
const getSchema = (isEdit: boolean) => {
  return isEdit ? faqUpdateSchema : faqSchema;
};

interface FaqFormProps {
  faqId?: string;
  initialData?: {
    question: string;
    answer: string;
    isActive: boolean;
    sortOrder: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function FaqForm({ 
  faqId, 
  initialData, 
  onSuccess, 
  onCancel 
}: FaqFormProps) {
  const isEdit = !!faqId;
  const [loading, setLoading] = useState(false);
  const [questionLength, setQuestionLength] = useState(initialData?.question.length || 0);
  const [answerLength, setAnswerLength] = useState(initialData?.answer.length || 0);

  // 初始化表單
  const form = useForm<z.infer<ReturnType<typeof getSchema>>>({
    resolver: zodResolver(getSchema(isEdit)),
    defaultValues: initialData || {
      question: '',
      answer: '',
      isActive: true,
      sortOrder: 0,
    },
  });

  // 提交表單
  const onSubmit = async (data: z.infer<ReturnType<typeof getSchema>>) => {
    setLoading(true);
    try {
      const url = isEdit 
        ? `/api/admin/faqs/${faqId}`
        : '/api/admin/faqs';
      
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
        toast.success(isEdit ? 'FAQ 更新成功' : 'FAQ 創建成功');
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

  // 處理問題輸入變化
  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuestionLength(value.length);
    form.setValue('question', value);
  };

  // 處理答案輸入變化
  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAnswerLength(value.length);
    form.setValue('answer', value);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="question"
          render={({ field }) => (
            <FormItem>
              <FormLabel>問題</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="輸入常見問題" 
                    {...field}
                    onChange={handleQuestionChange}
                    maxLength={500}
                  />
                  <div className="absolute right-2 top-2 text-xs text-gray-500">
                    {questionLength}/500
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                問題應簡潔明了，便於用戶理解
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="answer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>答案</FormLabel>
              <FormControl>
                <div className="relative">
                  <Textarea 
                    placeholder="輸入詳細解答" 
                    className="min-h-[200px]"
                    {...field}
                    onChange={handleAnswerChange}
                    maxLength={5000}
                  />
                  <div className="absolute right-2 top-2 text-xs text-gray-500">
                    {answerLength}/5000
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                提供清晰完整的解答，可使用簡單的 HTML 標籤進行格式化
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
                  停用的 FAQ 將不會在前台顯示
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
            {loading ? '處理中...' : (isEdit ? '更新 FAQ' : '創建 FAQ')}
          </Button>
        </div>
      </form>
    </Form>
  );
}