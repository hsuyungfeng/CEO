import { pb } from './pocketbase';
import bcrypt from 'bcryptjs';

/**
 * PocketBase 認證輔助函數
 * 用於替換 Prisma 的用戶查詢和 OAuth 帳戶管理
 *
 * 支援：
 * 1. 用戶基本查詢（by taxId, email, id）
 * 2. OAuth 帳戶管理
 * 3. 臨時 OAuth 數據存儲
 */

/**
 * 用戶類型定義（對應 Prisma User model）
 */
export interface PBUser {
  id: string;
  taxId: string;
  email: string;
  password: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: 'MEMBER' | 'ADMIN';
  emailVerified: boolean;
  firmName?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  points?: number;
  created: string;
  updated: string;
}

/**
 * OAuth 帳戶類型定義
 */
export interface PBOAuthAccount {
  id: string;
  userId: string;
  provider: 'google' | 'apple';
  providerId: string;
  email: string;
  name?: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  updatedAt: string;
}

/**
 * 臨時 OAuth 數據類型
 */
export interface PBTempOAuth {
  id: string;
  provider: 'google' | 'apple';
  providerId: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  data: string; // JSON stringified
  expiresAt: string;
}

/**
 * 根據 taxId 查找用戶（用於 Credentials 登入）
 * @param taxId 統一編號（8位數字）
 * @returns 用戶對象或 null
 */
export async function findUserByTaxId(taxId: string): Promise<PBUser | null> {
  try {
    const record = await pb.collection('users').getFirstListItem(
      `taxId = "${taxId}"`
    );
    return record as PBUser;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    console.error('查找用戶失敗 (taxId):', error);
    throw error;
  }
}

/**
 * 根據 email 查找用戶（用於 OAuth 登入）
 * @param email 電子郵件
 * @returns 用戶對象或 null
 */
export async function findUserByEmail(email: string): Promise<PBUser | null> {
  try {
    const record = await pb.collection('users').getFirstListItem(
      `email = "${email}"`
    );
    return record as PBUser;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    console.error('查找用戶失敗 (email):', error);
    throw error;
  }
}

/**
 * 根據 ID 查找用戶（用於 Bearer Token 驗證）
 * @param userId 用戶 ID
 * @returns 用戶對象或 null
 */
export async function findUserById(userId: string): Promise<PBUser | null> {
  try {
    const record = await pb.collection('users').getOne(userId);
    return record as PBUser;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    console.error('查找用戶失敗 (id):', error);
    throw error;
  }
}

/**
 * 驗證用戶密碼
 * @param user 用戶對象
 * @param password 輸入的密碼
 * @returns 密碼是否正確
 */
export async function verifyPassword(
  user: PBUser,
  password: string
): Promise<boolean> {
  if (!user.password) {
    console.error('用戶沒有設定密碼（可能是 OAuth 登入）');
    return false;
  }
  return bcrypt.compare(password, user.password);
}

/**
 * 根據 provider 和 providerId 查找 OAuth 帳戶
 * @param provider OAuth 提供者 ('google' | 'apple')
 * @param providerId 提供者返回的用戶 ID
 * @returns OAuth 帳戶及關聯的用戶對象或 null
 */
export async function findOAuthAccount(
  provider: 'google' | 'apple',
  providerId: string
): Promise<{ account: PBOAuthAccount; user: PBUser } | null> {
  try {
    const account = await pb
      .collection('oAuthAccounts')
      .getFirstListItem(
        `provider = "${provider}" && providerId = "${providerId}"`
      );

    // 取得關聯的用戶
    const user = await pb.collection('users').getOne(account.userId);

    return {
      account: account as PBOAuthAccount,
      user: user as PBUser,
    };
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    console.error('查找 OAuth 帳戶失敗:', error);
    throw error;
  }
}

/**
 * 根據 email 查找 OAuth 帳戶
 * @param email 電子郵件
 * @returns OAuth 帳戶陣列
 */
export async function findOAuthAccountsByEmail(
  email: string
): Promise<PBOAuthAccount[]> {
  try {
    const records = await pb
      .collection('oAuthAccounts')
      .getFullList({
        filter: `email = "${email}"`,
      });
    return records as PBOAuthAccount[];
  } catch (error: any) {
    console.error('查找 OAuth 帳戶失敗 (email):', error);
    throw error;
  }
}

/**
 * 更新 OAuth 帳戶資訊
 * @param accountId OAuth 帳戶 ID
 * @param data 更新的數據
 * @returns 更新後的帳戶
 */
export async function updateOAuthAccount(
  accountId: string,
  data: Partial<PBOAuthAccount>
): Promise<PBOAuthAccount> {
  try {
    const record = await pb.collection('oAuthAccounts').update(accountId, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return record as PBOAuthAccount;
  } catch (error) {
    console.error('更新 OAuth 帳戶失敗:', error);
    throw error;
  }
}

/**
 * 建立 OAuth 帳戶連結
 * @param userId 用戶 ID
 * @param provider OAuth 提供者
 * @param providerId 提供者用戶 ID
 * @param data OAuth 帳戶數據
 * @returns 新建的帳戶
 */
export async function createOAuthAccount(
  userId: string,
  provider: 'google' | 'apple',
  providerId: string,
  data: {
    email: string;
    name?: string;
    picture?: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }
): Promise<PBOAuthAccount> {
  try {
    const record = await pb.collection('oAuthAccounts').create({
      userId,
      provider,
      providerId,
      email: data.email,
      name: data.name || '',
      picture: data.picture || '',
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || '',
      expiresAt: data.expiresAt?.toISOString() || null,
      updatedAt: new Date().toISOString(),
    });
    return record as PBOAuthAccount;
  } catch (error) {
    console.error('建立 OAuth 帳戶失敗:', error);
    throw error;
  }
}

/**
 * 建立臨時 OAuth 數據（用於 2 步驟註冊）
 * @param provider OAuth 提供者
 * @param providerId 提供者用戶 ID
 * @param data OAuth 臨時數據
 * @param expiresIn 過期時間（毫秒，預設 1 小時）
 * @returns 臨時記錄
 */
export async function createTempOAuth(
  provider: 'google' | 'apple',
  providerId: string,
  data: {
    email: string;
    name: string;
    picture?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  },
  expiresIn: number = 60 * 60 * 1000
): Promise<PBTempOAuth> {
  try {
    const expiresAt = new Date(Date.now() + expiresIn);
    const record = await pb.collection('tempOAuths').create({
      provider,
      providerId,
      email: data.email,
      name: data.name,
      picture: data.picture || '',
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || '',
      tokenExpiresAt: data.tokenExpiresAt?.toISOString() || null,
      data: JSON.stringify(data),
      expiresAt: expiresAt.toISOString(),
    });
    return record as PBTempOAuth;
  } catch (error) {
    console.error('建立臨時 OAuth 失敗:', error);
    throw error;
  }
}

/**
 * 取得臨時 OAuth 數據
 * @param tempOAuthId 臨時記錄 ID
 * @returns 臨時 OAuth 記錄或 null（如果已過期）
 */
export async function getTempOAuth(
  tempOAuthId: string
): Promise<PBTempOAuth | null> {
  try {
    const record = await pb.collection('tempOAuths').getOne(tempOAuthId);

    // 檢查是否已過期
    if (new Date(record.expiresAt) < new Date()) {
      console.warn('臨時 OAuth 已過期，自動刪除');
      await pb.collection('tempOAuths').delete(tempOAuthId);
      return null;
    }

    return record as PBTempOAuth;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    console.error('取得臨時 OAuth 失敗:', error);
    throw error;
  }
}

/**
 * 刪除臨時 OAuth 數據
 * @param tempOAuthId 臨時記錄 ID
 */
export async function deleteTempOAuth(tempOAuthId: string): Promise<void> {
  try {
    await pb.collection('tempOAuths').delete(tempOAuthId);
  } catch (error) {
    console.error('刪除臨時 OAuth 失敗:', error);
    // 不拋出錯誤，因為這不是關鍵操作
  }
}

/**
 * 建立新用戶帳戶
 * @param userData 用戶數據
 * @returns 新建的用戶
 */
export async function createUser(
  userData: Omit<PBUser, 'id' | 'created' | 'updated'>
): Promise<PBUser> {
  try {
    const record = await pb.collection('users').create({
      ...userData,
      password: userData.password
        ? await bcrypt.hash(userData.password, 12)
        : '',
    });
    return record as PBUser;
  } catch (error) {
    console.error('建立用戶失敗:', error);
    throw error;
  }
}

/**
 * 更新用戶資訊
 * @param userId 用戶 ID
 * @param data 更新的數據
 * @returns 更新後的用戶
 */
export async function updateUser(
  userId: string,
  data: Partial<Omit<PBUser, 'id' | 'created' | 'updated'>>
): Promise<PBUser> {
  try {
    // 如果包含密碼，需要加密
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    }

    const record = await pb.collection('users').update(userId, data);
    return record as PBUser;
  } catch (error) {
    console.error('更新用戶失敗:', error);
    throw error;
  }
}

/**
 * 檢查用戶狀態是否為 ACTIVE
 * @param user 用戶對象
 * @returns 是否為 ACTIVE
 */
export function isUserActive(user: PBUser | null): boolean {
  return user?.status === 'ACTIVE';
}
