/**
 * POST /api/products/[id]/generate-3d
 * =====================================
 *
 * 觸發 3D 模型生成
 *
 * 認證：供應商必須擁有該產品
 * 輸入驗證：Zod 格式檢查
 * 審計日誌：記錄誰請求了生成
 * CSRF 保護：全域中介層已處理
 *
 * 請求：
 *   POST /api/products/123/generate-3d
 *   Content-Type: application/json
 *   {
 *     "sourceImageUrl": "https://...",
 *     "priority": 7
 *   }
 *
 * 回應 (200):
 *   {
 *     "success": true,
 *     "jobId": "queue-123",
 *     "queueStatus": "QUEUED",
 *     "message": "3D 生成任務已排隊"
 *   }
 *
 * 回應 (401): 未認證
 * 回應 (403): 無權限（非供應商或不擁有產品）
 * 回應 (400): 輸入驗證失敗
 * 回應 (500): 伺服器錯誤
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { auditLogger } from '@/lib/audit-logger';
import { enqueue3DGeneration } from '@/lib/queues/3d-generation.queue';

// ============ 驗證模式 ============

const GenerateRequest = z.object({
  sourceImageUrl: z
    .string()
    .url('必須是有效的 URL')
    .min(10)
    .max(2048),
  priority: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(5),
});

type GenerateRequest = z.infer<typeof GenerateRequest>;

// ============ 路由處理 ============

export async function POST(
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

    // 認證檢查
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未認證' },
        { status: 401 }
      );
    }

    // 取得產品和關聯供應商
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: '產品不存在' },
        { status: 404 }
      );
    }

    // 授權檢查：確認用戶是該供應商的成員
    // 通過 SupplierProduct 表檢查
    if (product.id) {
      const supplierProduct = await prisma.supplierProduct.findFirst({
        where: {
          productId: product.id,
          supplier: {
            userSuppliers: {
              some: {
                userId: session.user.id,
              },
            },
          },
        },
      });

      if (!supplierProduct) {
        return NextResponse.json(
          { error: '您沒有權限生成此產品的 3D 模型' },
          { status: 403 }
        );
      }
    }

    // 解析並驗證請求體
    const body = await request.json();
    const validationResult = GenerateRequest.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '輸入驗證失敗',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { sourceImageUrl, priority } = validationResult.data;

    // 將任務加入隊列
    const jobId = await enqueue3DGeneration(
      productId,
      sourceImageUrl,
      priority
    );

    // 記錄審計日誌
    auditLogger.log({
      action: 'PRODUCT_UPDATE',
      actor: session.user.id,
      target: productId,
      details: {
        operation: 'GENERATE_3D_MODEL',
        jobId,
        sourceImageUrl,
        priority,
      },
    });

    console.log(
      `[3D API] ✅ 生成請求已處理: ${jobId} (productId: ${productId}, user: ${session.user.id})`
    );

    return NextResponse.json(
      {
        success: true,
        jobId,
        queueStatus: 'QUEUED',
        message: '3D 生成任務已排隊',
        product: {
          id: product.id,
          name: product.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[3D API] ❌ 生成端點錯誤:', error);

    const message =
      error instanceof Error ? error.message : '發生未知錯誤';

    // 特定錯誤的額外情境
    if (message.includes('無法連接')) {
      return NextResponse.json(
        {
          error: 'TRELLIS.2 服務暫時不可用',
          details: '請稍後重試',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: '伺服器錯誤',
        details: message,
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
