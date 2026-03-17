'use client';

import { useState, useEffect } from 'react';
import RecommendationCard from './RecommendationCard';
import { Recommendation } from '@/types/recommendation';

interface RecommendationListProps {
  userId: string;
  initialLimit?: number;
  algorithm?: 'POPULARITY' | 'HISTORY' | 'COLLABORATIVE';
}

export default function RecommendationList({ userId, initialLimit = 10, algorithm }: RecommendationListProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(initialLimit);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // 構建查詢參數
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (algorithm) {
        params.append('algorithm', algorithm);
      }

      const response = await fetch(`/api/recommendations?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`獲取推薦失敗: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setRecommendations(data.data);
      } else {
        throw new Error(data.error || '獲取推薦失敗');
      }
    } catch (err) {
      console.error('獲取推薦列表失敗:', err);
      setError(err instanceof Error ? err.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [limit, algorithm]);
  
  const handleRefresh = () => {
    fetchRecommendations();
  };
  
  const handleLoadMore = () => {
    setLimit(prev => prev + 10);
  };
  
  const handleRecommendationAction = (recommendationId: string, action: 'view' | 'click' | 'dismiss') => {
    // 更新本地狀態
    setRecommendations(prev => 
      prev.map(rec => {
        if (rec.id === recommendationId) {
          return {
            ...rec,
            ...(action === 'view' && { viewed: true, viewedAt: new Date().toISOString() }),
            ...(action === 'click' && { clicked: true, clickedAt: new Date().toISOString() }),
            ...(action === 'dismiss' && { dismissed: true, dismissedAt: new Date().toISOString() })
          };
        }
        return rec;
      })
    );
  };
  
  if (loading && recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">正在加載推薦...</p>
      </div>
    );
  }
  
  if (error && recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">加載失敗</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          重試
        </button>
      </div>
    );
  }
  
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">暫無推薦</h3>
        <p className="text-gray-600 mb-4">
          系統尚未為您生成採購推薦，請稍後再試或嘗試刷新
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          刷新推薦
        </button>
      </div>
    );
  }
  
  // 過濾掉已被忽略的推薦
  const activeRecommendations = recommendations.filter(rec => !rec.dismissed);
  
  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-gray-600">
            共找到 <span className="font-semibold">{activeRecommendations.length}</span> 個推薦
            {recommendations.length !== activeRecommendations.length && (
              <span className="text-gray-400 ml-2">
                （已忽略 {recommendations.length - activeRecommendations.length} 個）
              </span>
            )}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            刷新
          </button>
          <button
            onClick={() => setLimit(10)}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            顯示較少
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeRecommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onAction={handleRecommendationAction}
          />
        ))}
      </div>
      
      {activeRecommendations.length >= limit && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            載入更多推薦
          </button>
        </div>
      )}
      
      {/* 推薦質量提示 */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-500">
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
          </svg>
          <p>
            推薦質量會隨著您的使用不斷提升。請對推薦進行反饋（點擊、忽略）以幫助系統學習您的偏好。
          </p>
        </div>
      </div>
    </div>
  );
}