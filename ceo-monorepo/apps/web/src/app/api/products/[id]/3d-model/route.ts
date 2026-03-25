/**
 * GET /api/products/[id]/3d-model
 * =====================================
 *
 * 查詢 3D 模型狀態與進度
 *
 * 認證：公開（若產品公開可見），或認證用戶
 * 回應：當前模型狀態、URLs、生成進度
 *
 * 查詢參數：無
 *
 * 回應 (200):
 *   {
 *     "success": true,
 *     "productId": "123",
 *     "status": "GENERATING" | "COMPLETED" | "FAILED" | "PENDING",
 *     "progress": 45,
 *     "modelUrls": {
 *       "glb": "https://...",
 *       "usdz": "https://..."
 *     },
 *     "metadata": {
 *       "generatedAt": "2026-03-25T10:30:00Z",
 *       "pbrInfo": {...}
 *     }
 *   }
 *
 * 回應 (404): 產品或 3D 模型不存在
 * 回應 (500): 伺服器錯誤
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  getGenerationStatus,
  getQueueStats,
} from '@/lib/queues/3d-generation.queue';
import { Product3DModelStatus } from '@prisma/client';

// ============ 路由處理 ============

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    // 取得參數
    const { id: productId } = await params;

    // 取得產品和 3D 模型記錄
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        product3DModel: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: '產品不存在' },
        { status: 404 }
      );
    }

    // 如果沒有 3D 模型記錄，返回 PENDING 狀態
    if (!product.product3DModel) {
      return NextResponse.json(
        {
          success: true,
          productId,
          status: Product3DModelStatus.PENDING,
          message: '尚未請求 3D 模型生成',
          modelUrls: null,
          metadata: null,
        },
        { status: 200 }
      );
    }

    // 構建回應
    const response: any = {
      success: true,
      productId,
      status: product.product3DModel.status,
      generatedAt: product.product3DModel.generatedAt,
      expiresAt: product.product3DModel.expiresAt,
    };

    // 如果已完成，返回 URLs
    if (product.product3DModel.status === Product3DModelStatus.COMPLETED) {
      response.modelUrls = {
        glb: product.product3DModel.modelUrlGLB,
        usdz: product.product3DModel.modelUrlUSDZ,
      };
      response.metadata = product.product3DModel.pbrMetadata;
      response.message = '3D 模型已生成';
    }

    // 如果正在生成，嘗試取得進度信息
    if (product.product3DModel.status === Product3DModelStatus.GENERATING) {
      response.message = '正在生成 3D 模型，請稍候...';

      // 嘗試從隊列中取得更多信息
      try {
        const queueRecord = await prisma.generationQueue.findFirst({
          where: { productId },
          orderBy: { createdAt: 'desc' },
        });

        if (queueRecord) {
          response.queueId = queueRecord.id;
          response.queueStatus = queueRecord.status;

          // 計算粗略進度（可以根據隊列統計優化）
          if (queueRecord.startedAt) {
            const elapsedSeconds = Math.floor(
              (Date.now() - queueRecord.startedAt.getTime()) / 1000
            );
            // 假設生成需要 2-5 分鐘，按線性顯示進度
            response.progress = Math.min(
              Math.floor((elapsedSeconds / 300) * 100),
              95 // 最多 95%，完成時跳到 100%
            );
          } else {
            response.progress = 0;
          }
        }
      } catch (queueError) {
        console.warn('[3D API] ⚠️  無法取得隊列進度:', queueError);
        response.progress = null;
      }
    }

    // 如果生成失敗
    if (product.product3DModel.status === Product3DModelStatus.FAILED) {
      response.message = '3D 模型生成失敗';

      // 取得最後的錯誤信息
      const failedQueue = await prisma.generationQueue.findFirst({
        where: { productId },
        orderBy: { createdAt: 'desc' },
      });

      if (failedQueue?.errorMessage) {
        response.errorMessage = failedQueue.errorMessage;
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[3D API] ❌ 狀態查詢端點錯誤:', error);

    return NextResponse.json(
      {
        error: '伺服器錯誤',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS 端點（CORS 預檢）
 */
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
