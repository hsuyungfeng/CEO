import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const MAX_VERIFICATION_ATTEMPTS = 3;
const VERIFICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Track a failed verification attempt
 * Throws error if max attempts exceeded
 */
export async function trackVerificationAttempt(email: string): Promise<number> {
  const now = new Date();

  // Find or create verification attempt record
  let record = await prisma.emailVerificationAttempt.findUnique({
    where: { email },
  });

  if (!record || now.getTime() - record.updatedAt.getTime() > VERIFICATION_WINDOW_MS) {
    // New window - reset attempts
    record = await prisma.emailVerificationAttempt.upsert({
      where: { email },
      update: {
        attempts: 1,
        updatedAt: now,
      },
      create: {
        email,
        attempts: 1,
        updatedAt: now,
      },
    });

    return 1;
  }

  // Existing window
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    logger.warn(
      { email, attempts: record.attempts },
      '驗證嘗試次數過多'
    );
    throw new Error('驗證嘗試次數過多，請稍後再試');
  }

  // Increment attempt
  record = await prisma.emailVerificationAttempt.update({
    where: { email },
    data: { attempts: record.attempts + 1, updatedAt: now },
  });

  return record.attempts;
}

/**
 * Reset verification attempts after successful verification
 */
export async function resetVerificationAttempts(email: string): Promise<void> {
  await prisma.emailVerificationAttempt.deleteMany({
    where: { email },
  });
}

/**
 * Get remaining attempts before lockout
 */
export async function getRemainingAttempts(email: string): Promise<number> {
  const now = new Date();
  const record = await prisma.emailVerificationAttempt.findUnique({
    where: { email },
  });

  if (!record || now.getTime() - record.updatedAt.getTime() > VERIFICATION_WINDOW_MS) {
    return MAX_VERIFICATION_ATTEMPTS;
  }

  return Math.max(0, MAX_VERIFICATION_ATTEMPTS - record.attempts);
}
