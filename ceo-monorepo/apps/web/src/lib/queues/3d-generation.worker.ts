/**
 * 3D 生成隊列工作者
 * =====================================
 *
 * 用途：
 * - 監聽隊列工作
 * - 調用 TRELLIS.2 生成端點
 * - 處理生成結果
 * - 管理錯誤和重試
 *
 * 注意：此文件應在單獨的 Node 程序中運行
 * 或使用 Bull Queues 的進程管理
 */

import generate3dQueue, { Generate3DJobData, Generate3DJobResult } from './3d-generation.queue';
import { generateModel } from '../services/3d-generation.service';

// ============ 隊列工作處理 ============

/**
 * 處理 3D 生成任務
 *
 * 流程：
 * 1. 驗證輸入
 * 2. 調用 TRELLIS.2 服務生成模型
 * 3. 返回結果 (GLB/USDZ 路徑)
 * 4. 隊列事件監聽器會自動更新 DB
 */
generate3dQueue.process(async (job) => {
  const { productId, sourceImageUrl, resolution } = job.data as Generate3DJobData;

  console.log(
    `\n${'='.repeat(60)}`
  );
  console.log(
    `[3D 生成] ▶️  開始處理任務 ${job.id}`
  );
  console.log(
    `   產品: ${productId}`
  );
  console.log(
    `   圖像: ${sourceImageUrl}`
  );
  console.log(
    `   解析度: ${resolution}³`
  );
  console.log(
    `${'='.repeat(60)}`
  );

  try {
    // 調用 TRELLIS.2 服務
    const result = await generateModel(sourceImageUrl, resolution);

    if (result.status === 'error') {
      throw new Error(result.error || '生成失敗');
    }

    // 構建返回結果
    const jobResult: Generate3DJobResult = {
      jobId: result.job_id || job.id,
      status: 'COMPLETE' as any, // 隊列事件監聽器會更新
      glbPath: result.glb_path,
      usdzPath: result.usdz_path,
    };

    console.log(
      `[3D 生成] ✅ 任務 ${job.id} 生成成功`
    );
    console.log(
      `   GLB: ${result.glb_path}`
    );
    console.log(
      `   USDZ: ${result.usdz_path}`
    );

    return jobResult;
  } catch (error) {
    console.error(
      `[3D 生成] ❌ 任務 ${job.id} 處理失敗:`
    );
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}`
    );

    // 拋出錯誤將觸發重試或失敗事件
    throw error;
  }
});

// ============ 啟動訊息 ============

console.log(`
╔${'═'.repeat(58)}╗
║ 3D 模型生成隊列工作者已啟動                             ║
║ 監聽隊列: 3d:generation                                ║
║ 並發處理: 2 個任務                                     ║
║ 重試次數: 最多 3 次                                    ║
╚${'═'.repeat(58)}╝
`);

export default generate3dQueue;
