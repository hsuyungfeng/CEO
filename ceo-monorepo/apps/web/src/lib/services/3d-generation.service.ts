/**
 * 3D 模型生成服務
 * =====================================
 *
 * 用途：
 * - 與 TRELLIS.2 Python 微服務通信
 * - 下載圖像、上傳到生成服務
 * - 查詢生成進度
 * - 儲存生成結果
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import { Readable } from 'stream';

// ============ 類型定義 ============

export interface TrillisGenerationResponse {
  status: 'completed' | 'error';
  job_id?: string;
  glb_path?: string;
  usdz_path?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface TrillisStatusResponse {
  job_id: string;
  status: 'completed' | 'processing' | 'not_found';
  glb_path?: string;
  usdz_path?: string;
}

export interface TrillisHealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  model_loaded: boolean;
  device: string;
}

// ============ 服務配置 ============

const TRELLIS_SERVICE_URL =
  process.env.TRELLIS_SERVICE_URL || 'http://localhost:5001';

const TRELLIS_TIMEOUT = 600000; // 10 分鐘超時

/**
 * 健康檢查：驗證 TRELLIS.2 服務可用
 */
export async function checkTrillisHealth(): Promise<TrillisHealthResponse> {
  try {
    const response = await fetch(`${TRELLIS_SERVICE_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as TrillisHealthResponse;
    return data;
  } catch (error) {
    console.error('[3D 生成] ❌ 健康檢查失敗:', error);
    throw new Error(
      `無法連接到 TRELLIS.2 服務 (${TRELLIS_SERVICE_URL}): ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 下載圖像並轉換為 Buffer
 */
async function downloadImage(imageUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(imageUrl, {
      timeout: 30000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.buffer();
    if (buffer.length === 0) {
      throw new Error('圖像檔案為空');
    }

    return buffer;
  } catch (error) {
    console.error(`[3D 生成] ❌ 圖像下載失敗 (${imageUrl}):`, error);
    throw new Error(
      `無法下載圖像: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 調用 TRELLIS.2 生成端點
 *
 * @param imageUrl - 圖像 URL
 * @param resolution - 輸出解析度（預設 512）
 * @returns 生成結果
 */
export async function generateModel(
  imageUrl: string,
  resolution: number = 512
): Promise<TrillisGenerationResponse> {
  try {
    console.log(
      `[3D 生成] 🎬 開始生成: ${imageUrl} (${resolution}³)`
    );

    // 驗證服務健康狀態
    try {
      await checkTrillisHealth();
    } catch (healthError) {
      throw new Error(`服務不可用: ${healthError instanceof Error ? healthError.message : String(healthError)}`);
    }

    // 下載圖像
    const imageBuffer = await downloadImage(imageUrl);
    console.log(`[3D 生成] 📥 圖像已下載 (${imageBuffer.length} bytes)`);

    // 建立 multipart 請求
    const form = new FormData();
    form.append('image', Readable.from([imageBuffer]), {
      filename: 'image.png',
      contentType: 'image/png',
    });
    form.append('resolution', resolution.toString());

    // 調用生成端點
    const response = await fetch(`${TRELLIS_SERVICE_URL}/generate`, {
      method: 'POST',
      body: form as any,
      timeout: TRELLIS_TIMEOUT,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `服務返回 HTTP ${response.status}: ${errorText.substring(0, 200)}`
      );
    }

    const result = (await response.json()) as TrillisGenerationResponse;

    if (result.status === 'error') {
      throw new Error(result.error || '生成失敗');
    }

    console.log(
      `[3D 生成] ✅ 生成完成: ${result.job_id} (GLB: ${result.glb_path})`
    );

    return result;
  } catch (error) {
    console.error('[3D 生成] ❌ 生成端點調用失敗:', error);
    throw error;
  }
}

/**
 * 查詢生成狀態
 */
export async function queryGenerationStatus(
  jobId: string
): Promise<TrillisStatusResponse> {
  try {
    const response = await fetch(
      `${TRELLIS_SERVICE_URL}/status/${jobId}`,
      {
        method: 'GET',
        timeout: 5000,
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          job_id: jobId,
          status: 'not_found',
        };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as TrillisStatusResponse;
    return data;
  } catch (error) {
    console.error('[3D 生成] ❌ 狀態查詢失敗:', error);
    throw new Error(
      `無法查詢生成狀態: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 獲取服務資訊
 */
export async function getServiceInfo() {
  try {
    const response = await fetch(`${TRELLIS_SERVICE_URL}/info`, {
      method: 'GET',
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[3D 生成] ❌ 無法獲取服務資訊:', error);
    throw error;
  }
}
