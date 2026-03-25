/**
 * 3D 模型生成隊列
 * =====================================
 *
 * 用途：
 * - 管理 3D 模型生成隊列
 * - 發送生成任務到 TRELLIS.2 服務
 * - 追蹤任務進度
 * - 處理重試邏輯
 *
 * 架構：
 * - Bull Queue 管理隊列
 * - Redis 儲存持久狀態
 * - Prisma 追蹤資料庫記錄
 */

import Queue from 'bull';
import Redis from 'ioredis';
import { prisma } from '../prisma';
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

export interface TrillisResponse {
  status: 'completed' | 'error';
  job_id: string;
  glb_path?: string;
  usdz_path?: string;
  metadata?: Record<string, any>;
  error?: string;
}

// ============ Redis 連線設定 ============

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Bull 要求
  enableReadyCheck: false,
};

const redis = new Redis(redisConfig);
const redisSubscriber = new Redis(redisConfig);

// ============ 隊列初始化 ============

/**
 * 建立 3D 生成隊列
 *
 * 配置：
 * - 隊列名稱：`3d:generation`
 * - 最大併發：2（避免過度載入 GPU）
 * - 重試：每次任務最多 3 次
 * - 超時：10 分鐘
 */
const generate3dQueue = new Queue<Generate3DJobData>(
  '3d:generation',
  {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5 秒開始
      },
      removeOnComplete: {
        age: 3600, // 1 小時後移除完成的任務
      },
      removeOnFail: false, // 保留失敗的任務用於診斷
    },
  }
);

// ============ 隊列事件監聽 ============

generate3dQueue.on('active', async (job) => {
  console.log(
    `[3D 生成] 任務 ${job.id} 開始處理 (productId: ${job.data.productId})`
  );

  // 更新 DB 狀態
  await prisma.generationQueue.update({
    where: { id: job.id },
    data: {
      status: GenerationQueueStatus.PROCESSING,
      startedAt: new Date(),
    },
  });

  // 更新 3D 模型狀態
  await prisma.product3DModel.update({
    where: { productId: job.data.productId },
    data: { status: Product3DModelStatus.GENERATING },
  });
});

generate3dQueue.on('progress', async (job, progress) => {
  console.log(
    `[3D 生成] 任務 ${job.id} 進度: ${progress}%`
  );
});

generate3dQueue.on('completed', async (job, result: Generate3DJobResult) => {
  console.log(
    `[3D 生成] ✅ 任務 ${job.id} 完成 (productId: ${job.data.productId})`
  );

  try {
    // 更新隊列記錄
    await prisma.generationQueue.update({
      where: { id: job.id },
      data: {
        status: GenerationQueueStatus.COMPLETE,
        completedAt: new Date(),
      },
    });

    // 更新 3D 模型記錄
    const updatePayload: any = {
      status: Product3DModelStatus.COMPLETED,
      generatedAt: new Date(),
    };

    if (result.glbPath) updatePayload.modelUrlGLB = result.glbPath;
    if (result.usdzPath) updatePayload.modelUrlUSDZ = result.usdzPath;

    await prisma.product3DModel.update({
      where: { productId: job.data.productId },
      data: updatePayload,
    });

    // 記錄審計日誌
    await prisma.generationLog.create({
      data: {
        productId: job.data.productId,
        newStatus: GenerationQueueStatus.COMPLETE,
        previousStatus: GenerationQueueStatus.PROCESSING,
        metadata: {
          glbPath: result.glbPath,
          usdzPath: result.usdzPath,
        },
      },
    });

    console.log(
      `[3D 生成] 📁 模型已儲存: GLB=${result.glbPath}, USDZ=${result.usdzPath}`
    );
  } catch (error) {
    console.error(
      `[3D 生成] ❌ 完成處理失敗 (${job.id}):`,
      error
    );
  }
});

generate3dQueue.on('failed', async (job, err) => {
  console.error(
    `[3D 生成] ❌ 任務 ${job.id} 失敗 (嘗試: ${job.attemptsMade}/${job.opts.attempts}):`
  );
  console.error(`   錯誤: ${err.message}`);

  try {
    // 檢查是否還有重試次數
    if (job.attemptsMade >= job.opts.attempts!) {
      // 已無重試次數，標記為失敗
      await prisma.generationQueue.update({
        where: { id: job.id },
        data: {
          status: GenerationQueueStatus.ERROR,
          errorMessage: err.message,
          completedAt: new Date(),
        },
      });

      // 更新 3D 模型狀態為失敗
      await prisma.product3DModel.update({
        where: { productId: job.data.productId },
        data: {
          status: Product3DModelStatus.FAILED,
        },
      });

      // 記錄審計日誌
      await prisma.generationLog.create({
        data: {
          productId: job.data.productId,
          newStatus: GenerationQueueStatus.ERROR,
          previousStatus: GenerationQueueStatus.PROCESSING,
          metadata: {
            error: err.message,
            attemptsMade: job.attemptsMade,
            maxAttempts: job.opts.attempts,
          },
        },
      });

      console.log(
        `[3D 生成] 📋 已記錄為失敗: ${job.data.productId}`
      );
    } else {
      // 仍有重試機會
      console.log(
        `[3D 生成] 🔄 將在 ${Math.round(job.delay / 1000)} 秒後重試...`
      );
    }
  } catch (dbError) {
    console.error(
      `[3D 生成] ❌ 失敗記錄寫入失敗:`,
      dbError
    );
  }
});

generate3dQueue.on('error', (err) => {
  console.error('[3D 生成] ❌ 隊列錯誤:', err);
});

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

  // 建立 Bull 任務
  const job = await generate3dQueue.add(
    {
      productId,
      sourceImageUrl,
      priority,
      resolution: 512,
    },
    {
      jobId: queueRecord.id,
      priority,
      delay: 0,
    }
  );

  // 記錄審計日誌
  await prisma.generationLog.create({
    data: {
      productId,
      newStatus: GenerationQueueStatus.QUEUED,
      metadata: {
        jobId: job.id,
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

  const job = await generate3dQueue.getJob(jobId);

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
  const counts = await generate3dQueue.getJobCounts();
  const pendingCount = counts.waiting + counts.delayed;
  const activeCount = counts.active;
  const completedCount = counts.completed;
  const failedCount = counts.failed;

  return {
    pending: pendingCount,
    active: activeCount,
    completed: completedCount,
    failed: failedCount,
    total: pendingCount + activeCount + completedCount + failedCount,
  };
}

/**
 * 清理隊列（僅用於測試或維護）
 */
export async function clearQueue() {
  await generate3dQueue.clean(0, 1000);
  console.log('[3D 生成] 🧹 隊列已清理');
}

export default generate3dQueue;
