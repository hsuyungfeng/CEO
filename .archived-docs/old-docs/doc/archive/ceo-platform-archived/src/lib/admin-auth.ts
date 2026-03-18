import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * 驗證當前用戶是否為管理員
 * 如果驗證失敗，返回錯誤響應
 * 如果驗證成功，返回用戶信息
 */
export async function requireAdmin() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        error: NextResponse.json(
          { 
            success: false,
            error: '未授權，請先登入' 
          },
          { status: 401 }
        )
      };
    }
    
    const user = session.user;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    
    if (!isAdmin) {
      return {
        error: NextResponse.json(
          { 
            success: false,
            error: '權限不足，需要管理員權限' 
          },
          { status: 403 }
        )
      };
    }
    
    return { user };
  } catch (error) {
    console.error('管理員權限驗證錯誤:', error);
    return {
      error: NextResponse.json(
        { 
          success: false,
          error: '伺服器錯誤，請稍後再試' 
        },
        { status: 500 }
      )
    };
  }
}

/**
 * 檢查用戶是否為管理員（不返回錯誤響應）
 * 用於需要條件邏輯的情況
 */
export async function isAdminUser() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return { isAdmin: false, user: null };
    }
    
    const user = session.user;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    
    return { isAdmin, user };
  } catch (error) {
    console.error('檢查管理員權限錯誤:', error);
    return { isAdmin: false, user: null };
  }
}