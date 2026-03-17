'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Recommendation } from '@/types/recommendation';
import Image from 'next/image';
import Link from 'next/link';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAction: (recommendationId: string, action: 'view' | 'click' | 'dismiss') => void;
}

export default function RecommendationCard({ recommendation, onAction }: RecommendationCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [actionCompleted, setActionCompleted] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAction = async (action: 'view' | 'click' | 'dismiss') => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/recommendations/${recommendation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        onAction(recommendation.id, action);
        setActionCompleted(action);
      }
    } catch (error) {
      console.error('執行推薦操作失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 查看產品詳情頁面
  const handleViewDetails = async () => {
    // 記錄查看操作
    if (!recommendation.viewed) {
      await handleAction('view');
    }
    // 導向產品詳情頁面（同一標籤頁）
    router.push(`/products/${recommendation.product.id}`);
  };

  // 加入購物車
  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);

      // 首先記錄點擊操作
      await handleAction('click');

      // 然後調用加入購物車 API
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: recommendation.product.id,
          quantity: recommendation.product.priceTiers?.[0]?.minQty || 1,
        }),
      });

      if (response.ok) {
        setActionCompleted('click');
        // 可選：顯示成功訊息或導向購物車
        // 暫時只記錄操作
      } else if (response.status === 401) {
        // 未登入，導向登入頁面
        router.push(`/auth/signin?callbackUrl=/recommendations`);
      } else {
        throw new Error('加入購物車失敗');
      }
    } catch (error) {
      console.error('加入購物車失敗:', error);
      // 顯示錯誤訊息
    } finally {
      setIsAddingToCart(false);
    }
  };
  
  // 計算推薦分數的視覺化表示
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-blue-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-gray-400';
  };
  
  const getScoreText = (score: number) => {
    if (score >= 0.8) return '高度推薦';
    if (score >= 0.6) return '推薦';
    if (score >= 0.4) return '一般推薦';
    return '低度推薦';
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border ${recommendation.viewed ? 'border-gray-300' : 'border-blue-300'} hover:shadow-lg transition-shadow duration-300`}>
      {/* 推薦標頭 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${getScoreColor(recommendation.score)} mr-2`}></div>
          <span className="text-sm font-medium text-gray-700">
            {getScoreText(recommendation.score)}
          </span>
          <span className="ml-2 text-xs text-gray-500">
            分數: {(recommendation.score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center">
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
            {recommendation.algorithm === 'POPULARITY' ? '熱門' : 
             recommendation.algorithm === 'HISTORY' ? '歷史' : 
             recommendation.algorithm === 'COLLABORATIVE' ? '協同' : '混合'}
          </span>
          {recommendation.viewed && (
            <span className="ml-2 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
              已查看
            </span>
          )}
        </div>
      </div>
      
      {/* 產品資訊 */}
      <div className="p-4">
        <div className="flex items-start mb-4">
          {/* 產品圖片 */}
          <div className="flex-shrink-0 mr-4">
            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
              {recommendation.product.image ? (
                <Image
                  src={recommendation.product.image}
                  alt={recommendation.product.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <div className="text-gray-400 text-xs text-center p-2">
                  無圖片
                </div>
              )}
            </div>
          </div>
          
          {/* 產品詳細資訊 */}
          <div className="flex-grow">
            <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
              {recommendation.product.name}
            </h3>
            {recommendation.product.subtitle && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                {recommendation.product.subtitle}
              </p>
            )}
            
            {/* 產品規格 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {recommendation.product.unit && (
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  單位: {recommendation.product.unit}
                </span>
              )}
              {recommendation.product.spec && (
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  規格: {recommendation.product.spec}
                </span>
              )}
            </div>
            
            {/* 價格資訊 */}
            {recommendation.product.priceTiers && recommendation.product.priceTiers.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">
                  NT$ {parseFloat(recommendation.product.priceTiers[0].price.toString()).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  起訂量: {recommendation.product.priceTiers[0].minQty} {recommendation.product.unit}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* 供應商資訊 */}
        {recommendation.supplier && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-blue-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <span className="text-sm font-medium text-blue-800">推薦供應商</span>
              </div>
              {recommendation.supplier.avgRating > 0 && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {recommendation.supplier.avgRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({recommendation.supplier.totalRatings})
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-800 font-medium mb-1">
              {recommendation.supplier.companyName}
            </p>
            {recommendation.supplier.onTimeDeliveryRate > 0 && (
              <p className="text-xs text-gray-600">
                準時交貨率: {(recommendation.supplier.onTimeDeliveryRate * 100).toFixed(0)}%
              </p>
            )}
          </div>
        )}
        
        {/* 推薦原因 */}
        {recommendation.reason && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">推薦原因:</span> {recommendation.reason}
            </p>
          </div>
        )}
      </div>
      
      {/* 操作按鈕 */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between space-x-2">
          <button
            onClick={handleViewDetails}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && actionCompleted === 'view' ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                處理中...
              </span>
            ) : (
              '查看詳情'
            )}
          </button>
          
          <button
            onClick={handleAddToCart}
            disabled={isLoading || recommendation.clicked}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${recommendation.clicked 
              ? 'bg-green-100 text-green-800 cursor-default' 
              : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'}`}
          >
            {isLoading && actionCompleted === 'click' ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                處理中...
              </span>
            ) : recommendation.clicked ? (
              <span className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
                已加入
              </span>
            ) : (
              '加入採購單'
            )}
          </button>
          
          <button
            onClick={() => handleAction('dismiss')}
            disabled={isLoading || recommendation.dismissed}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="忽略此推薦"
          >
            {isLoading && actionCompleted === 'dismiss' ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
          </button>
        </div>
        
        {/* 操作反饋 */}
        {actionCompleted && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-center">
            <p className="text-xs text-green-700">
              {actionCompleted === 'view' && '已記錄查看，感謝您的關注！'}
              {actionCompleted === 'click' && '已記錄點擊，將用於改進推薦質量！'}
              {actionCompleted === 'dismiss' && '已忽略此推薦，將減少類似推薦。'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}