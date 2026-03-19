import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/purchase-templates/[id] - 獲取單個模板詳情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入' },
        { status: 401 }
      );
    }
    
    const templateId = id;
    const userId = session.user.id;
    
    const template = await prisma.purchaseTemplate.findUnique({
      where: { id: templateId },
      include: {
        items: {
          include: {
            product: {
              include: {
                priceTiers: {
                  orderBy: { minQty: 'asc' }
                },
                firm: true,
                category: true
              }
            },
            supplier: {
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                phone: true,
                email: true,
                avgRating: true,
                totalRatings: true,
                onTimeDeliveryRate: true
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!template) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }
    
    // 檢查權限（只能查看自己的模板或公開模板）
    if (template.userId !== userId && !template.isPublic) {
      return NextResponse.json(
        { error: '權限不足' },
        { status: 403 }
      );
    }
    
    // 增加使用次數（如果是查看詳情）
    if (template.userId === userId) {
      await prisma.purchaseTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: template
    });
    
  } catch (error) {
    console.error('獲取模板詳情失敗:', error);
    return NextResponse.json(
      { error: '獲取模板詳情失敗' },
      { status: 500 }
    );
  }
}

// PUT /api/purchase-templates/[id] - 更新模板
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入' },
        { status: 401 }
      );
    }
    
    const templateId = id;
    const userId = session.user.id;
    
    // 檢查模板是否存在且屬於當前用戶
    const existingTemplate = await prisma.purchaseTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!existingTemplate) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }
    
    if (existingTemplate.userId !== userId) {
      return NextResponse.json(
        { error: '只能修改自己的模板' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      isPublic: z.boolean().optional(),
      items: z.array(z.object({
        productId: z.string().cuid(),
        supplierId: z.string().cuid().optional(),
        quantity: z.number().min(1),
        notes: z.string().optional()
      })).min(1).max(50).optional()
    });
    
    const validationResult = schema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '輸入資料無效', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: { name?: string; description?: string | null; isPublic?: boolean; items?: any } = {};

    // 更新基本資訊
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    // 如果更新項目，先刪除舊項目再創建新項目
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let itemsUpdate: any = undefined;
    if (data.items) {
      // 檢查所有產品是否存在
      const productIds = data.items.map(item => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true }
      });
      
      if (products.length !== productIds.length) {
        return NextResponse.json(
          { error: '部分產品不存在' },
          { status: 400 }
        );
      }
      
      // 刪除舊項目
      await prisma.purchaseTemplateItem.deleteMany({
        where: { templateId }
      });
      
      itemsUpdate = {
        create: data.items.map((item, index) => ({
          productId: item.productId,
          supplierId: item.supplierId,
          quantity: item.quantity,
          notes: item.notes,
          sortOrder: index
        }))
      };
    }
    
    if (itemsUpdate) {
      updateData.items = itemsUpdate;
    }
    
    const updatedTemplate = await prisma.purchaseTemplate.update({
      where: { id: templateId },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: '模板更新成功'
    });
    
  } catch (error) {
    console.error('更新模板失敗:', error);
    return NextResponse.json(
      { error: '更新模板失敗，請稍後再試' },
      { status: 500 }
    );
  }
}

// DELETE /api/purchase-templates/[id] - 刪除模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '需要登入' },
        { status: 401 }
      );
    }
    
    const templateId = id;
    const userId = session.user.id;
    
    // 檢查模板是否存在且屬於當前用戶
    const existingTemplate = await prisma.purchaseTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!existingTemplate) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }
    
    if (existingTemplate.userId !== userId) {
      return NextResponse.json(
        { error: '只能刪除自己的模板' },
        { status: 403 }
      );
    }
    
    // 刪除模板（關聯項目會自動刪除，因為有 onDelete: Cascade）
    await prisma.purchaseTemplate.delete({
      where: { id: templateId }
    });
    
    return NextResponse.json({
      success: true,
      message: '模板刪除成功'
    });
    
  } catch (error) {
    console.error('刪除模板失敗:', error);
    return NextResponse.json(
      { error: '刪除模板失敗，請稍後再試' },
      { status: 500 }
    );
  }
}