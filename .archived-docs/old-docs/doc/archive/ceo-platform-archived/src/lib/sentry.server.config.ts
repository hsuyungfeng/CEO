/**
 * Sentry Server-Side Configuration
 * Handles error tracking for API routes and server-side operations
 * Note: Sentry is optional and can be configured later
 */

// Sentry is optional - functions will be no-ops if not configured
export function initSentryServer() {
  // No-op: Sentry is optional
  console.log('Sentry is optional - server error tracking disabled by default');
}

/**
 * Capture security events on server
 */
export function captureServerSecurityEvent(
  eventType: 'csrf_failure' | 'validation_failure' | 'auth_failure' | 'rate_limit_exceeded' | 'injection_attempt',
  context: Record<string, any>,
  level: 'warning' | 'error' = 'warning'
) {
  // No-op: Sentry is optional
  console.log(`Server security event: ${eventType}`, context);
}

/**
 * Track request duration and status
 */
export function trackApiRequest(
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  // No-op: Sentry is optional
}

/**
 * Monitor database operations
 */
export function trackDatabaseOperation(
  operation: string,
  table: string,
  duration: number,
  error?: Error
) {
  // No-op: Sentry is optional
  if (error) {
    console.error(`Database error: ${operation} on ${table}`, error);
  }
}

/**
 * Track email operations
 */
export function trackEmailOperation(
  templateType: string,
  recipient: string,
  success: boolean,
  error?: Error
) {
  // No-op: Sentry is optional
  if (error) {
    console.error(`Email error: ${templateType} to ${maskEmail(recipient)}`, error);
  }
}

/**
 * Set server user context
 */
export function setSentryServerUser(userId: string, email?: string) {
  // No-op: Sentry is optional
}

/**
 * Clear server user context
 */
export function clearSentryServerUser() {
  // No-op: Sentry is optional
}

/**
 * Mask email for privacy
 */
function maskEmail(email?: string): string {
  if (!email) return '';
  const [name, domain] = email.split('@');
  return `${name.substring(0, 1)}***@${domain}`;
}

/**
 * Add server-side breadcrumb
 */
export function addServerBreadcrumb(
  message: string,
  category: string = 'server',
  level: any = 'info',
  data?: Record<string, any>
) {
  // No-op: Sentry is optional
}

/**
 * Flush pending Sentry events (call before server shutdown)
 */
export async function flushSentry(timeout = 5000) {
  // No-op: Sentry is optional
  return Promise.resolve();
}
