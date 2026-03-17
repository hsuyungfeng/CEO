'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RecommendationList from './RecommendationList';

type Algorithm = 'ALL' | 'POPULARITY' | 'HISTORY' | 'COLLABORATIVE';

interface RecommendationClientComponentProps {
  userId: string;
}

export default function RecommendationClientComponent({ userId }: RecommendationClientComponentProps) {
  const router = useRouter();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm>('ALL');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // 處理重新整理推薦
  const handleRefreshRecommendations = useCallback(async () => {
    try {
      setIsGenerating(true);

      const response = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          algorithm: selectedAlgorithm === 'ALL' ? 'HYBRID' : selectedAlgorithm,
          limit: 10,
          forceRegenerate: true,
        }),
      });

      if (response.ok) {
        // 刷新推薦列表
        setRefreshKey(prev => prev + 1);
      } else {
        alert('重新整理推薦失敗，請稍後再試');
      }
    } catch (error) {
      console.error('重新整理推薦時出錯:', error);
      alert('發生錯誤，請稍後再試');
    } finally {
      setIsGenerating(false);
    }
  }, [userId, selectedAlgorithm]);

  // 處理查看所有產品
  const handleViewAllProducts = () => {
    router.push('/products');
  };

  // 處理導航錯誤
  const handleNavigationError = (path: string) => {
    console.error(`導航到 ${path} 失敗`);
    // 可以添加用戶提示邏輯
  };

  // 算法按鈕配置
  const algorithms: Array<{ value: Algorithm; label: string; description: string }> = [
    { value: 'ALL', label: '全部', description: '混合推薦演算法' },
    { value: 'POPULARITY', label: '熱門產品', description: '基於熱門度' },
    { value: 'HISTORY', label: '歷史相似', description: '基於採購歷史' },
    { value: 'COLLABORATIVE', label: '協同過濾', description: '基於用戶相似度' },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">為您推薦的產品</h2>
            <p className="text-sm text-gray-500 mt-1">
              系統根據您的採購歷史、產品熱門度和相似用戶的選擇為您推薦
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefreshRecommendations}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="根據選定的算法重新生成推薦"
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  處理中...
                </span>
              ) : (
                '重新整理推薦'
              )}
            </button>
            <button
              onClick={handleViewAllProducts}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              title="瀏覽平台上的所有產品"
            >
              查看所有產品
            </button>
          </div>
        </div>

        {/* 推薦算法選擇 */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">推薦算法：</span>
          <div className="flex flex-wrap gap-2">
            {algorithms.map((algo) => (
              <button
                key={algo.value}
                onClick={() => setSelectedAlgorithm(algo.value)}
                className={`px-4 py-2 text-sm rounded-full font-medium transition-all ${
                  selectedAlgorithm === algo.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={algo.description}
              >
                {algo.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 推薦列表容器 */}
      <div className="p-6">
        <RecommendationList
          key={`${userId}-${selectedAlgorithm}-${refreshKey}`}
          userId={userId}
          algorithm={selectedAlgorithm === 'ALL' ? undefined : selectedAlgorithm}
        />
      </div>
    </div>
  );
}
