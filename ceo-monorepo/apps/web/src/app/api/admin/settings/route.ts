import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  contact_info: z.object({
    companyName: z.string().min(1, '公司名稱為必填'),
    phone: z.string().min(1, '電話為必填'),
    fax: z.string().optional(),
    address: z.string().min(1, '地址為必填'),
  }),
  group_buy_owner: z.object({
    name: z.string().min(1, '團購主姓名為必填'),
    phone: z.string().min(1, '團購主電話為必填'),
    email: z.string().email('請輸入有效的 Email'),
    note: z.string().optional(),
  })
});

export async function GET(req: NextRequest) {
  try {
    // 檢查管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    // 同時查詢多個設定值
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['contact_info', 'group_buy_owner']
        }
      }
    });

    // 格式化回傳結果
    const result: Record<string, unknown> = {
      contact_info: null,
      group_buy_owner: null
    };

    settings.forEach(setting => {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch (e) {
        console.error(`解析設定值失敗 [${setting.key}]:`, e);
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('取得系統設定失敗:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 檢查管理員權限
    const adminCheck = await requireAdmin();
    if ('error' in adminCheck) {
      return adminCheck.error;
    }

    const json = await req.json();
    
    // 驗證輸入資料
    const validatedData = updateSettingsSchema.parse(json);

    // 批次更新或建立設定
    const updates = [];
    
    for (const [key, value] of Object.entries(validatedData)) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value), description: key === 'contact_info' ? '公司聯絡資訊' : '團購主資訊' }
        })
      );
    }

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('更新系統設定失敗:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
