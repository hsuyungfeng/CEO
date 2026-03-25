/**
 * 3D 模型生成隊列 (簡化版)
 * =====================================
 *
 * 用途：
 * - 管理 3D 模型生成佇列
 * - 發送生成任務到 TRELLIS.2 服務
 * - 追蹤任務進度
 * - 處理重試邏輯
 *
 * 架構：
 * - 直接使用 Prisma + 輪詢 (避免 Bull Queue 在 Next.js 中的套件問題)
 * - Redis 快取未來優化
 * - Prisma 追蹤資料庫記錄
 *
 * 注意：Phase 15.1 (gap closure) 將遷移至 Bull Queue
 */

import { prisma } from '../prisma';
import { auditLogger } from '../audit-logger';
import {
  GenerationQueueStatus,
  Product3DModelStatus,
} from '@prisma/client';

// ============ 類型定義 ============

export interface Generate3DJobData {
  productId: string;
  sourceImageUrl: string;
  priority: number; // 1-10
  resolution?: number; // 預設 512
}

export interface Generate3DJobResult {
  jobId: string;
  status: GenerationQueueStatus;
  glbPath?: string;
  usdzPath?: string;
  error?: string;
}

// ============ 公開 API ============

/**
 * 將 3D 生成任務加入隊列
 *
 * @param productId - 產品 ID
 * @param sourceImageUrl - 來源圖像 URL
 * @param priority - 優先級（1-10，10 最高）
 * @returns 隊列記錄 ID
 */
export async function enqueue3DGeneration(
  productId: string,
  sourceImageUrl: string,
  priority: number = 5
): Promise<string> {
  // 驗證輸入
  if (!productId) throw new Error('產品 ID 不能為空');
  if (!sourceImageUrl) throw new Error('來源圖像 URL 不能為空');
  if (priority < 1 || priority > 10) {
    throw new Error('優先級必須在 1-10 之間');
  }

  // 檢查產品是否存在
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error(`產品不存在: ${productId}`);
  }

  // 檢查是否已有生成記錄
  let product3dModel = await prisma.product3DModel.findUnique({
    where: { productId },
  });

  if (!product3dModel) {
    // 建立新的 3D 模型記錄
    product3dModel = await prisma.product3DModel.create({
      data: {
        productId,
        sourceImageUrl,
        status: Product3DModelStatus.PENDING,
      },
    });
  }

  // 建立隊列記錄
  const queueRecord = await prisma.generationQueue.create({
    data: {
      productId,
      status: GenerationQueueStatus.QUEUED,
      priority,
      maxRetries: 3,
    },
  });

  // 記錄審計日誌
  await prisma.generationLog.create({
    data: {
      productId,
      newStatus: GenerationQueueStatus.QUEUED,
      metadata: {
        jobId: queueRecord.id,
        sourceImageUrl,
        priority,
      },
    },
  });

  console.log(
    `[3D 生成] 📤 任務已入隊: ${queueRecord.id} (productId: ${productId}, priority: ${priority})`
  );

  return queueRecord.id;
}

/**
 * 獲取隊列任務狀態
 */
export async function getGenerationStatus(jobId: string): Promise<Generate3DJobResult | null> {
  const queueRecord = await prisma.generationQueue.findUnique({
    where: { id: jobId },
  });

  if (!queueRecord) {
    return null;
  }

  return {
    jobId,
    status: queueRecord.status,
    error: queueRecord.errorMessage || undefined,
  };
}

/**
 * 獲取隊列統計
 */
export async function getQueueStats() {
  const counts = await prisma.generationQueue.groupBy({
    by: ['status'],
    _count: true,
  });

  const stats: Record<string, number> = {
    pending: 0,
    active: 0,
    completed: 0,
    failed: 0,
  };

  counts.forEach((count) => {
    if (count.status === GenerationQueueStatus.QUEUED) stats.pending += count._count;
    if (count.status === GenerationQueueStatus.PROCESSING) stats.active += count._count;
    if (count.status === GenerationQueueStatus.COMPLETE) stats.completed += count._count;
    if (count.status === GenerationQueueStatus.ERROR) stats.failed += count._count;
  });

  return {
    pending: stats.pending,
    active: stats.active,
    completed: stats.completed,
    failed: stats.failed,
    total: stats.pending + stats.active + stats.completed + stats.failed,
  };
}

/**
 * 清理隊列（僅用於測試或維護）
 */
export async function clearQueue() {
  await prisma.generationQueue.deleteMany({
    where: {
      status: GenerationQueueStatus.COMPLETE,
    },
  });
  console.log('[3D 生成] 🧹 隊列已清理');
}
