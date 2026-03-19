/**
 * PostgreSQL + Prisma Authentication Functions
 * Replaces pocketbase-auth.ts with PostgreSQL backend
 *
 * Functions for user authentication, OAuth account management,
 * and temporary OAuth registration flow
 */

// Environment variables are automatically loaded by Next.js from .env.local

import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Lazy-loaded singleton Prisma client
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // Verify DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    globalForPrisma.prisma = new PrismaClient({
      log: ['error'],
    });
  }
  return globalForPrisma.prisma;
}

/**
 * PrismaUser type definition matching our Prisma User model
 */
export type PrismaUser = {
  id: string;
  email: string;
  name: string | null;
  taxId: string | null;
  password: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  points: number;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Optional included relations
  member?: {
    id: string;
    userId: string;
    points?: number;
    totalSpent?: number;
    lastPurchaseAt?: Date | null;
  } | null;
};

/**
 * Find user by taxId (統一編號)
 */
export async function findUserByTaxId(taxId: string): Promise<PrismaUser | null> {
  try {
    const user = await getPrisma().user.findUnique({
      where: { taxId },
    });
    return user as PrismaUser | null;
  } catch (error) {
    console.error('查詢 taxId 用戶失敗:', error);
    return null;
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<PrismaUser | null> {
  try {
    const user = await getPrisma().user.findUnique({
      where: { email },
    });
    return user as PrismaUser | null;
  } catch (error) {
    console.error('查詢 email 用戶失敗:', error);
    return null;
  }
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<PrismaUser | null> {
  try {
    const user = await getPrisma().user.findUnique({
      where: { id },
    });
    return user as PrismaUser | null;
  } catch (error) {
    console.error('查詢用戶 ID 失敗:', error);
    return null;
  }
}

/**
 * Verify user password (bcrypt comparison)
 */
export async function verifyPassword(user: PrismaUser, plainPassword: string): Promise<boolean> {
  try {
    if (!user.password) {
      console.error('用戶無密碼雜湊');
      return false;
    }
    const isMatch = await bcrypt.compare(plainPassword, user.password);
    return isMatch;
  } catch (error) {
    console.error('密碼驗證失敗:', error);
    return false;
  }
}

/**
 * Check if user is active
 */
export function isUserActive(user: PrismaUser): boolean {
  return user.status === 'ACTIVE';
}

/**
 * Create a new user
 */
export async function createUser(
  userData: Omit<PrismaUser, 'id' | 'createdAt' | 'updatedAt' | 'member' | 'lastLoginAt'>
): Promise<PrismaUser> {
  try {
    // Hash password if provided
    let hashedPassword = undefined;
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 12);
    }

    const { ...userFields } = userData;
    const user = await getPrisma().user.create({
      data: {
        ...userFields,
        password: hashedPassword,
      },
    });

    return user as PrismaUser;
  } catch (error) {
    console.error('建立用戶失敗:', error);
    throw error;
  }
}

/**
 * Create OAuth account link
 */
export async function createOAuthAccount(
  userId: string,
  provider: string,
  providerId: string,
  data: {
    email: string;
    name?: string;
    picture?: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }
): Promise<unknown> {
  try {
    const oauthAccount = await getPrisma().oAuthAccount.create({
      data: {
        userId,
        provider,
        providerId,
        email: data.email,
        name: data.name,
        picture: data.picture,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      },
    });

    return oauthAccount;
  } catch (error) {
    console.error('建立 OAuth 帳戶失敗:', error);
    throw error;
  }
}

/**
 * Find OAuth account by provider and providerId
 */
export async function findOAuthAccount(
  provider: string,
  providerId: string
): Promise<{ account: { id: string; [key: string]: unknown }; user: PrismaUser } | null> {
  try {
    const account = await getPrisma().oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: true,
      },
    });

    if (!account) return null;

    return {
      account,
      user: account.user as PrismaUser,
    };
  } catch (error) {
    console.error('查詢 OAuth 帳戶失敗:', error);
    return null;
  }
}

/**
 * Find OAuth accounts by email
 */
export async function findOAuthAccountsByEmail(email: string): Promise<unknown[]> {
  try {
    return await getPrisma().oAuthAccount.findMany({
      where: { email },
    });
  } catch (error) {
    console.error('查詢 OAuth 帳戶 (by email) 失敗:', error);
    return [];
  }
}

/**
 * Update OAuth account
 */
export async function updateOAuthAccount(
  accountId: string,
  data: {
    name?: string;
    picture?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string | Date;
  }
): Promise<unknown> {
  try {
    return await getPrisma().oAuthAccount.update({
      where: { id: accountId },
      data,
    });
  } catch (error) {
    console.error('更新 OAuth 帳戶失敗:', error);
    throw error;
  }
}

/**
 * Create temporary OAuth record (for pending registrations)
 */
export async function createTempOAuth(
  provider: string,
  providerId: string,
  data: {
    email: string;
    name: string;
    picture?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  }
): Promise<{ id: string; [key: string]: unknown }> {
  try {
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

    return await getPrisma().tempOAuth.create({
      data: {
        provider,
        providerId,
        email: data.email,
        name: data.name,
        picture: data.picture,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        data: JSON.stringify(data), // Store full data as JSON
        expiresAt,
      },
    });
  } catch (error) {
    console.error('建立暫存 OAuth 失敗:', error);
    throw error;
  }
}

/**
 * Find temporary OAuth by ID
 */
export async function findTempOAuthById(id: string): Promise<unknown> {
  try {
    return await getPrisma().tempOAuth.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error('查詢暫存 OAuth 失敗:', error);
    return null;
  }
}

/**
 * Delete temporary OAuth
 */
export async function deleteTempOAuth(id: string): Promise<void> {
  try {
    await getPrisma().tempOAuth.delete({
      where: { id },
    });
  } catch (error) {
    console.error('刪除暫存 OAuth 失敗:', error);
  }
}

/**
 * Cleanup expired temporary OAuth records
 */
export async function cleanupExpiredTempOAuth(): Promise<number> {
  try {
    const result = await getPrisma().tempOAuth.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error('清理過期 OAuth 失敗:', error);
    return 0;
  }
}
