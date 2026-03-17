'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  contactInfo: z.object({
    companyName: z.string().min(1, '公司名稱為必填'),
    phone: z.string().min(1, '電話為必填'),
    fax: z.string().optional(),
    address: z.string().min(1, '地址為必填'),
  }),
  groupBuyOwner: z.object({
    name: z.string().min(1, '團購主姓名為必填'),
    phone: z.string().min(1, '團購主電話為必填'),
    email: z.string().email('請輸入有效的 Email'),
    note: z.string().optional(),
  })
});

type FormValues = z.infer<typeof formSchema>;

export default function CompanyInfoSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactInfo: {
        companyName: '',
        phone: '',
        fax: '',
        address: ''
      },
      groupBuyOwner: {
        name: '',
        phone: '',
        email: '',
        note: ''
      }
    }
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) {
          throw new Error('無法取得設定資料');
        }
        
        const data = await response.json();
        
        reset({
          contactInfo: data.contact_info || {
            companyName: '一企實業有限公司',
            phone: '(02) 1234-5678',
            fax: '(02) 1234-5679',
            address: '台北市中山區南京東路一段123號'
          },
          groupBuyOwner: data.group_buy_owner || {
            name: '',
            phone: '',
            email: '',
            note: ''
          }
        });
      } catch (error) {
        setErrorMessage('載入設定失敗，請重新整理頁面。');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, [reset]);

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_info: data.contactInfo,
          group_buy_owner: data.groupBuyOwner
        })
      });

      if (!response.ok) {
        throw new Error('更新設定失敗');
      }

      setSuccessMessage('設定已成功更新！');
      
      // 3 秒後清除成功訊息
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('儲存時發生錯誤，請稍後再試。');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">平台資訊設定</h1>
          <p className="text-gray-500 mt-2">管理頁尾顯示的公司聯絡資訊及團購主資料</p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* 聯絡資訊區塊 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-6 pb-2 border-b">聯絡資訊 (顯示於 Footer)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">公司名稱 <span className="text-red-500">*</span></label>
              <input 
                {...register('contactInfo.companyName')} 
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${errors.contactInfo?.companyName ? 'border-red-500' : ''}`} 
              />
              {errors.contactInfo?.companyName && <p className="text-red-500 text-sm mt-1">{errors.contactInfo.companyName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話 <span className="text-red-500">*</span></label>
              <input 
                {...register('contactInfo.phone')} 
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${errors.contactInfo?.phone ? 'border-red-500' : ''}`} 
              />
              {errors.contactInfo?.phone && <p className="text-red-500 text-sm mt-1">{errors.contactInfo.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">傳真號碼</label>
              <input 
                {...register('contactInfo.fax')} 
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">公司地址 <span className="text-red-500">*</span></label>
              <input 
                {...register('contactInfo.address')} 
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${errors.contactInfo?.address ? 'border-red-500' : ''}`} 
              />
              {errors.contactInfo?.address && <p className="text-red-500 text-sm mt-1">{errors.contactInfo.address.message}</p>}
            </div>
          </div>
        </div>

        {/* 團購主資訊區塊 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-6 pb-2 border-b">團購主資訊</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
              <input 
                {...register('groupBuyOwner.name')} 
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${errors.groupBuyOwner?.name ? 'border-red-500' : ''}`} 
              />
              {errors.groupBuyOwner?.name && <p className="text-red-500 text-sm mt-1">{errors.groupBuyOwner.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話 <span className="text-red-500">*</span></label>
              <input 
                {...register('groupBuyOwner.phone')} 
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${errors.groupBuyOwner?.phone ? 'border-red-500' : ''}`} 
              />
              {errors.groupBuyOwner?.phone && <p className="text-red-500 text-sm mt-1">{errors.groupBuyOwner.phone.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件 <span className="text-red-500">*</span></label>
              <input 
                type="email"
                {...register('groupBuyOwner.email')} 
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${errors.groupBuyOwner?.email ? 'border-red-500' : ''}`} 
              />
              {errors.groupBuyOwner?.email && <p className="text-red-500 text-sm mt-1">{errors.groupBuyOwner.email.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">備註/介紹</label>
              <textarea 
                rows={3}
                {...register('groupBuyOwner.note')}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => router.back()}
          >
            取消
          </Button>
          <Button 
            type="submit" 
            disabled={isSaving}
          >
            {isSaving ? '儲存中...' : '儲存設定'}
          </Button>
        </div>
      </form>
    </div>
  );
}
