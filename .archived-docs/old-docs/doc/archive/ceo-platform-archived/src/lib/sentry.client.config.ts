/**
 * Sentry Client-Side Configuration
 * Handles error tracking and performance monitoring for browser
 * Note: Sentry is optional and can be configured later
 */

// Sentry is optional - functions will be no-ops if not configured
export function initSentryClient() {
  // No-op: Sentry is optional
  console.log('Sentry is optional - error tracking disabled by default');
}

/**
 * Capture security-related exceptions
 */
export function captureSecurityEvent(
  eventType: 'csrf_failure' | 'validation_failure' | 'auth_failure' | 'xss_detected' | 'sql_injection_detected',
  context: Record<string, any>,
  level: 'warning' | 'error' = 'warning'
) {
  // No-op: Sentry is optional
  console.log(`Security event: ${eventType}`, context);
}

/**
 * Track performance metrics
 */
export function trackPerformance(
  operationName: string,
  duration: number,
  tags?: Record<string, string>
) {
  // No-op for now
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(userId: string, email?: string, username?: string) {
  // No-op: Sentry is optional
}

/**
 * Clear user context
 */
export function clearSentryUser() {
  // No-op: Sentry is optional
}

/**
 * Add breadcrumb for context
 */
export function addSentryBreadcrumb(
  message: string,
  category: string = 'user-action',
  level: any = 'info',
  data?: Record<string, any>
) {
  // No-op: Sentry is optional
}
