'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, ArrowLeft, CheckCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function SubmitSupplierRatingPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const supplierId = params.supplierId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [supplierInfo, setSupplierInfo] = useState<{ id: string; companyName: string } | null>(null);
  
  // 評分狀態
  const [overallScore, setOverallScore] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const [deliveryScore, setDeliveryScore] = useState(0);
  const [serviceScore, setServiceScore] = useState(0);
  const [comment, setComment] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && supplierId) {
      fetchSupplierInfo();
    }
  }, [status, supplierId, router]);

  const fetchSupplierInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/suppliers/${supplierId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSupplierInfo(data.data);
        }
      }
    } catch (error) {
      console.error('獲取供應商資訊失敗:', error);
      toast.error('獲取供應商資訊失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (score: number, type: 'overall' | 'quality' | 'delivery' | 'service') => {
    switch (type) {
      case 'overall':
        setOverallScore(score);
        // 如果其他維度未設定，自動設定相同分數
        if (qualityScore === 0) setQualityScore(score);
        if (deliveryScore === 0) setDeliveryScore(score);
        if (serviceScore === 0) setServiceScore(score);
        break;
      case 'quality':
        setQualityScore(score);
        break;
      case 'delivery':
        setDeliveryScore(score);
        break;
      case 'service':
        setServiceScore(score);
        break;
    }
  };

  const handleSubmit = async () => {
    if (!overallScore) {
      toast.error('請選擇整體評分');
      return;
    }

    if (!supplierId) {
      toast.error('供應商資訊錯誤');
      return;
    }

    try {
      setSubmitting(true);
      
      const ratingData = {
        supplierId,
        overallScore,
        qualityScore: qualityScore || overallScore,
        deliveryScore: deliveryScore || overallScore,
        serviceScore: serviceScore || overallScore,
        comment: comment || null,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        isPublic,
        orderId: orderId || undefined
      };

      const response = await fetch('/api/supplier-ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ratingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '提交評分失敗');
      }

      toast.success('評分提交成功！感謝您的回饋。');
      
      // 返回供應商評分詳情頁面
      setTimeout(() => {
        router.push(`/supplier-ratings/${supplierId}`);
      }, 1500);

    } catch (error: unknown) {
      console.error('提交評分失敗:', error);
      toast.error(error instanceof Error ? error.message : '提交評分失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarRating = (
    score: number,
    setScore: (score: number) => void,
    label: string,
    type: 'overall' | 'quality' | 'delivery' | 'service'
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-1"
            onClick={() => handleStarClick(star, type)}
            aria-label={`${star} 星`}
          >
            <Star
              className={`h-8 w-8 ${
                star <= score
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-3 text-lg font-medium">{score}.0</span>
      </div>
    </div>
  );

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!supplierInfo) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="rounded-full bg-red-100 p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
          <Star className="h-12 w-12 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2">找不到供應商</h3>
        <p className="text-gray-500 mb-6">指定的供應商不存在或您無權訪問</p>
        <Button onClick={() => router.push('/supplier-ratings')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回供應商評分列表
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push(`/supplier-ratings/${supplierId}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回供應商詳情
      </Button>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">為供應商評分</CardTitle>
          <CardDescription>
            請分享您對 <strong>{supplierInfo.companyName}</strong> 的採購體驗
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 整體評分 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">整體滿意度</h3>
            {renderStarRating(overallScore, (score) => handleStarClick(score, 'overall'), '整體評分', 'overall')}
          </div>

          {/* 維度評分 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">各維度評分</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderStarRating(qualityScore, (score) => handleStarClick(score, 'quality'), '產品品質', 'quality')}
              {renderStarRating(deliveryScore, (score) => handleStarClick(score, 'delivery'), '交貨準時', 'delivery')}
              {renderStarRating(serviceScore, (score) => handleStarClick(score, 'service'), '客戶服務', 'service')}
            </div>
          </div>

          {/* 評論 */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              詳細評論（選填）
            </Label>
            <Textarea
              id="comment"
              placeholder="請分享您的具體體驗，例如：產品品質、交貨速度、客戶服務等..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            <p className="text-sm text-gray-500">
              您的評論將幫助其他批發商做出更好的採購決策
            </p>
          </div>

          {/* 訂單編號（選填） */}
          <div className="space-y-2">
            <Label htmlFor="orderId" className="text-sm font-medium">
              訂單編號（選填）
            </Label>
            <Input
              id="orderId"
              placeholder="輸入相關訂單編號（如有）"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              提供訂單編號可幫助我們驗證評價的真實性
            </p>
          </div>

          {/* 隱私設定 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPublic" className="text-sm font-medium">
                公開此評價
              </Label>
            </div>
            <p className="text-sm text-gray-500">
              公開評價將顯示給所有用戶查看，有助於建立透明的供應商評分系統
            </p>
          </div>

          {/* 提交按鈕 */}
          <div className="pt-4 border-t">
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => router.push(`/supplier-ratings/${supplierId}`)}
                disabled={submitting}
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !overallScore}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>提交中...</>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    提交評分
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 評分指南 */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-300">
            <Star className="inline h-5 w-5 mr-2" />
            評分指南
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 dark:text-blue-400">
          <ul className="space-y-2">
            <li>• <strong>5 星</strong>：非常滿意，超出預期</li>
            <li>• <strong>4 星</strong>：滿意，符合預期</li>
            <li>• <strong>3 星</strong>：普通，有改善空間</li>
            <li>• <strong>2 星</strong>：不滿意，有明顯問題</li>
            <li>• <strong>1 星</strong>：非常不滿意，強烈不推薦</li>
            <li>• 請根據實際體驗提供真實、客觀的評價</li>
            <li>• 您的評價將幫助建立更透明的批發採購生態</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}