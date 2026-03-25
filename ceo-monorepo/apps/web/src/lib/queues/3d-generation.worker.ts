/**
 * 3D 生成隊列工作者 (簡化版)
 * =====================================
 *
 * 用途：
 * - 輪詢 Prisma 隊列表
 * - 調用 TRELLIS.2 生成端點
 * - 處理生成結果
 * - 管理錯誤和重試
 *
 * 注意：此為臨時簡化版本，Phase 15.1 將改用 Bull Queue
 */

import { prisma } from '../prisma';
import { GenerationQueueStatus, Product3DModelStatus } from '@prisma/client';
import { generateModel } from '../services/3d-generation.service';

// ============ 工作處理邏輯 ============

/**
 * 處理 3D 生成任務
 *
 * 流程：
 * 1. 驗證輸入
 * 2. 調用 TRELLIS.2 服務生成模型
 * 3. 返回結果 (GLB/USDZ 路徑)
 * 4. 更新資料庫狀態
 */
export async function processGenerationJob(jobId: string) {
  const job = await prisma.generationQueue.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error(`任務不存在: ${jobId}`);
  }

  const { productId, sourceImageUrl } = job;

  try {
    console.log(
      `\n${'='.repeat(60)}`
    );
    console.log(`[3D 生成] ▶️  開始處理任務 ${jobId}`);
    console.log(`   產品: ${productId}`);
    console.log(`   圖像: ${sourceImageUrl}`);
    console.log(`${'='.repeat(60)}`);

    // 更新狀態為處理中
    await prisma.generationQueue.update({
      where: { id: jobId },
      data: {
        status: GenerationQueueStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    await prisma.product3DModel.update({
      where: { productId },
      data: { status: Product3DModelStatus.GENERATING },
    });

    // 調用 TRELLIS.2 服務生成模型
    const result = await generateModel(productId, sourceImageUrl);

    // 更新為完成
    await prisma.generationQueue.update({
      where: { id: jobId },
      data: {
        status: GenerationQueueStatus.COMPLETE,
        completedAt: new Date(),
      },
    });

    await prisma.product3DModel.update({
      where: { productId },
      data: {
        status: Product3DModelStatus.COMPLETED,
        generatedAt: new Date(),
        modelUrlGLB: result.glbPath,
        modelUrlUSDZ: result.usdzPath,
      },
    });

    // 記錄審計日誌
    await prisma.generationLog.create({
      data: {
        productId,
        newStatus: GenerationQueueStatus.COMPLETE,
        previousStatus: GenerationQueueStatus.PROCESSING,
        metadata: {
          glbPath: result.glbPath,
          usdzPath: result.usdzPath,
        },
      },
    });

    console.log(
      `[3D 生成] ✅ 任務 ${jobId} 完成 (productId: ${productId})`
    );
    console.log(
      `   📁 模型已儲存: GLB=${result.glbPath}, USDZ=${result.usdzPath}`
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 檢查重試次數
    if (job.retriesCount < job.maxRetries) {
      // 有重試機會，標記為待重試
      await prisma.generationQueue.update({
        where: { id: jobId },
        data: {
          retriesCount: job.retriesCount + 1,
          status: GenerationQueueStatus.QUEUED, // 重新加入隊列
          errorMessage: `Retry ${job.retriesCount + 1}: ${errorMessage}`,
        },
      });

      console.log(
        `[3D 生成] 🔄 將在稍後重試 (嘗試: ${job.retriesCount + 1}/${job.maxRetries})`
      );
    } else {
      // 已無重試次數，標記為失敗
      await prisma.generationQueue.update({
        where: { id: jobId },
        data: {
          status: GenerationQueueStatus.ERROR,
          errorMessage,
          completedAt: new Date(),
        },
      });

      await prisma.product3DModel.update({
        where: { productId },
        data: { status: Product3DModelStatus.FAILED },
      });

      // 記錄審計日誌
      await prisma.generationLog.create({
        data: {
          productId,
          newStatus: GenerationQueueStatus.ERROR,
          previousStatus: GenerationQueueStatus.PROCESSING,
          metadata: {
            error: errorMessage,
            attemptsMade: job.retriesCount + 1,
            maxAttempts: job.maxRetries,
          },
        },
      });

      console.error(
        `[3D 生成] ❌ 任務 ${jobId} 失敗: ${errorMessage}`
      );
    }

    throw error;
  }
}

// ============ 啟動訊息 ============

console.log(`
╔${'═'.repeat(58)}╗
║ 3D 模型生成隊列工作者已初始化                             ║
║ 模式: Prisma 輪詢 (Phase 15.1 改用 Bull Queue)          ║
║ 重試次數: 最多 3 次                                    ║
╚${'═'.repeat(58)}╝
`);

export default { processGenerationJob };
