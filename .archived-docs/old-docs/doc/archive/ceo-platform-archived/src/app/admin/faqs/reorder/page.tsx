'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { FaqReorder } from '../components/FaqReorder';

export default function FaqReorderPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/admin/faqs');
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/faqs">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回 FAQ 列表
          </Button>
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FAQ 排序</h1>
          <p className="mt-2 text-gray-600">拖拽 FAQ 項目以重新排序</p>
        </div>
      </div>

      <FaqReorder onBack={handleBack} />
    </div>
  );
}