import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import RecommendationClientComponent from '@/components/recommendations/RecommendationClientComponent';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: '採購推薦 - CEO平台',
  description: '根據您的採購歷史和市場趨勢，為您推薦合適的產品和供應商'
};

export default async function RecommendationsPage() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      redirect('/auth/signin?callbackUrl=/recommendations');
    }

    // 獲取用戶的基本信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        points: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      redirect('/auth/signin');
    }

    // 獲取用戶的採購統計
    let purchaseStats = { _sum: { totalQuantity: null, totalOrders: null } };
    try {
      purchaseStats = await prisma.userPurchaseHistory.aggregate({
        where: { userId: user.id },
        _sum: {
          totalQuantity: true,
          totalOrders: true
        }
      });
    } catch (err) {
      console.error('獲取採購統計失敗:', err);
      // 使用預設值
    }

    // 獲取用戶的推薦準確率（點擊率）
    let recommendationStats = { _count: { id: 0 } };
    let clickedRecommendations = 0;
    try {
      recommendationStats = await prisma.purchaseRecommendation.aggregate({
        where: { userId: user.id },
        _count: {
          id: true
        }
      });

      clickedRecommendations = await prisma.purchaseRecommendation.count({
        where: {
          userId: user.id,
          clicked: true
        }
      });
    } catch (err) {
      console.error('獲取推薦統計失敗:', err);
      // 使用預設值
    }

    const recommendationAccuracy = recommendationStats._count.id > 0
      ? Math.round((clickedRecommendations / recommendationStats._count.id) * 100)
      : 0;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">採購推薦</h1>
        <p className="text-gray-600">
          根據您的採購歷史和市場趨勢，為您推薦合適的產品和供應商
        </p>

        {/* 用戶統計卡片 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">累計採購次數</p>
                <p className="text-2xl font-semibold">
                  {purchaseStats._sum.totalOrders || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">累計採購數量</p>
                <p className="text-2xl font-semibold">
                  {purchaseStats._sum.totalQuantity || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">推薦準確率</p>
                <p className="text-2xl font-semibold">
                  {recommendationAccuracy}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 推薦列表和控制 */}
      <RecommendationClientComponent userId={user.id} />

      {/* 推薦說明 */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">推薦系統說明</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="mb-4 md:mb-0">
            <h4 className="font-medium text-blue-700 mb-1">熱門產品推薦</h4>
            <p className="text-sm text-blue-600">
              基於全平台最受歡迎的產品，適合尋找市場熱銷商品的批發商
            </p>
          </div>
          <div className="mb-4 md:mb-0">
            <h4 className="font-medium text-blue-700 mb-1">歷史相似推薦</h4>
            <p className="text-sm text-blue-600">
              根據您過去的採購記錄，推薦類似或相關的產品
            </p>
          </div>
          <div>
            <h4 className="font-medium text-blue-700 mb-1">協同過濾推薦</h4>
            <p className="text-sm text-blue-600">
              分析與您採購習慣相似的其他用戶，推薦他們購買過的產品
            </p>
          </div>
        </div>
        <div className="mt-4 text-sm text-blue-600">
          <p>💡 提示：點擊「查看詳情」可以獲取產品和供應商的完整資訊，點擊「加入採購單」可以快速將產品加入購物車。</p>
        </div>
      </div>
    </div>
    );
  } catch (error) {
    console.error('推薦頁面錯誤:', error);
    // 返回一個簡單的錯誤頁面，而不是完全重定向
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">加載推薦失敗</h1>
          <p className="text-red-700 mb-4">系統無法加載推薦頁面，請稍後再試或聯絡客服</p>
          <a href="/" className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            返回首頁
          </a>
        </div>
      </div>
    );
  }
}