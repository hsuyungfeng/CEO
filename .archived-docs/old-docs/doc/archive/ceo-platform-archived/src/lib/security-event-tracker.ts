/**
 * Security Event Tracker
 * Integrates with Sentry to track security-related events
 * Logs CSRF failures, validation errors, auth issues, etc.
 */

import { logger } from '@/lib/logger';

interface SecurityEventContext {
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  [key: string]: any;
}

class SecurityEventTracker {
  /**
   * Track CSRF token validation failure
   */
  trackCSRFFailure(context: SecurityEventContext, reason: string) {
    logger.warn(
      {
        eventType: 'csrf_failure',
        reason,
        ...context,
      },
      'CSRF token validation failed'
    );

    // Send to Sentry if available
    try {
      const { captureSecurityEvent } = require('@/lib/sentry.client.config');
      captureSecurityEvent('csrf_failure', {
        reason,
        ...context,
      }, 'warning');
    } catch {
      // Sentry not available in server context, will use server config
    }
  }

  /**
   * Track input validation failure
   */
  trackValidationFailure(
    context: SecurityEventContext,
    field: string,
    violation: string
  ) {
    logger.warn(
      {
        eventType: 'validation_failure',
        field,
        violation,
        ...context,
      },
      `Input validation failed for field: ${field}`
    );
  }

  /**
   * Track authentication failure
   */
  trackAuthFailure(context: SecurityEventContext, reason: string) {
    logger.warn(
      {
        eventType: 'auth_failure',
        reason,
        ...context,
      },
      'Authentication failed'
    );

    try {
      const { captureSecurityEvent } = require('@/lib/sentry.client.config');
      captureSecurityEvent('auth_failure', {
        reason,
        ...context,
      }, 'warning');
    } catch {
      // Sentry not available
    }
  }

  /**
   * Track XSS injection attempt
   */
  trackXSSDetection(context: SecurityEventContext, input: string) {
    logger.warn(
      {
        eventType: 'xss_detected',
        input: input.substring(0, 100),
        ...context,
      },
      'XSS injection attempt detected'
    );

    try {
      const { captureSecurityEvent } = require('@/lib/sentry.client.config');
      captureSecurityEvent('xss_detected', {
        inputLength: input.length,
        ...context,
      }, 'error');
    } catch {
      // Sentry not available
    }
  }

  /**
   * Track SQL injection attempt
   */
  trackSQLInjectionDetection(context: SecurityEventContext, input: string) {
    logger.warn(
      {
        eventType: 'sql_injection_detected',
        input: input.substring(0, 100),
        ...context,
      },
      'SQL injection attempt detected'
    );

    try {
      const { captureSecurityEvent } = require('@/lib/sentry.client.config');
      captureSecurityEvent('sql_injection_detected', {
        inputLength: input.length,
        ...context,
      }, 'error');
    } catch {
      // Sentry not available
    }
  }

  /**
   * Track rate limit exceeded
   */
  trackRateLimitExceeded(context: SecurityEventContext) {
    logger.warn(
      {
        eventType: 'rate_limit_exceeded',
        ...context,
      },
      'Rate limit exceeded'
    );
  }

  /**
   * Track JWT token issues
   */
  trackJWTIssue(
    context: SecurityEventContext,
    issue: 'expired' | 'invalid' | 'mismatched_type'
  ) {
    logger.warn(
      {
        eventType: 'jwt_issue',
        issue,
        ...context,
      },
      `JWT token issue: ${issue}`
    );
  }

  /**
   * Track successful security events (for audit trail)
   */
  trackSecurityEvent(
    eventType: string,
    context: SecurityEventContext,
    status: 'success' | 'failure'
  ) {
    if (status === 'success') {
      logger.info(
        {
          eventType,
          status,
          ...context,
        },
        `Security event: ${eventType}`
      );
    } else {
      logger.warn(
        {
          eventType,
          status,
          ...context,
        },
        `Security event failed: ${eventType}`
      );
    }
  }

  /**
   * Get context from request
   */
  static getContextFromRequest(request: any): SecurityEventContext {
    return {
      ip: request.headers?.get('x-forwarded-for') || request.ip || 'unknown',
      userAgent: request.headers?.get('user-agent') || 'unknown',
      endpoint: request.url || 'unknown',
    };
  }

  /**
   * Get context from Express/Node request
   */
  static getContextFromExpressRequest(req: any): SecurityEventContext {
    return {
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      endpoint: req.originalUrl || req.url || 'unknown',
      method: req.method || 'unknown',
    };
  }
}

export const securityEventTracker = new SecurityEventTracker();
