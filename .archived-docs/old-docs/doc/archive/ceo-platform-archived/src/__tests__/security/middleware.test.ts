import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';

describe('Security Middleware', () => {
  const allowedOrigin = 'http://localhost:3000';
  const notAllowedOrigin = 'http://malicious-site.com';

  const createRequest = (
    method: string = 'GET',
    origin?: string,
    pathname: string = '/api/test'
  ): NextRequest => {
    const url = `http://localhost:3000${pathname}`;
    const request = new NextRequest(new Request(url, { method }));

    if (origin) {
      (request.headers as Headers).set('origin', origin);
    }

    return request;
  };

  describe('CORS Preflight Requests', () => {
    it('should handle OPTIONS request from allowed origin', async () => {
      const request = createRequest('OPTIONS', allowedOrigin);

      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response?.status).toBe(200);
      expect(response?.headers.get('Access-Control-Allow-Origin')).toBe(
        allowedOrigin
      );
    });

    it('should handle OPTIONS request from non-allowed origin', async () => {
      const request = createRequest('OPTIONS', notAllowedOrigin);

      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response?.status).toBe(200);
      // Should not set CORS headers for non-allowed origins
      expect(response?.headers.get('Access-Control-Allow-Origin')).toBe('');
    });

    it('should include CORS preflight headers in OPTIONS response', async () => {
      const request = createRequest('OPTIONS', allowedOrigin);

      const response = await middleware(request);

      expect(response?.headers.get('Access-Control-Allow-Methods')).toContain(
        'GET'
      );
      expect(response?.headers.get('Access-Control-Allow-Methods')).toContain(
        'POST'
      );
      expect(response?.headers.get('Access-Control-Allow-Headers')).toContain(
        'Content-Type'
      );
      expect(response?.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('should allow credentials in CORS response', async () => {
      const request = createRequest('OPTIONS', allowedOrigin);

      const response = await middleware(request);

      expect(response?.headers.get('Access-Control-Allow-Credentials')).toBe(
        'true'
      );
    });
  });

  describe('Security Headers', () => {
    it('should include X-Content-Type-Options header', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should include X-Frame-Options header', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      expect(response?.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should include X-XSS-Protection header', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      expect(response?.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should include Strict-Transport-Security header', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const hsts = response?.headers.get('Strict-Transport-Security');
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
    });

    it('should include Referrer-Policy header', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      expect(response?.headers.get('Referrer-Policy')).toBe(
        'strict-origin-when-cross-origin'
      );
    });

    it('should include Permissions-Policy header', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const policy = response?.headers.get('Permissions-Policy');
      expect(policy).toContain('camera=()');
      expect(policy).toContain('microphone=()');
      expect(policy).toContain('geolocation=()');
    });

    it('should include Content-Security-Policy header', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const csp = response?.headers.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain('default-src');
      expect(csp).toContain('script-src');
      expect(csp).toContain('style-src');
    });

    it('should set cache control headers for sensitive content', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const cacheControl = response?.headers.get('Cache-Control');
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('must-revalidate');
    });
  });

  describe('CORS for allowed origins', () => {
    it('should include origin in response for allowed origin', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      expect(response?.headers.get('Access-Control-Allow-Origin')).toBe(
        allowedOrigin
      );
    });

    it('should include credentials header for allowed origin', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      expect(response?.headers.get('Access-Control-Allow-Credentials')).toBe(
        'true'
      );
    });

    it('should not include origin for non-allowed origin', async () => {
      const request = createRequest('GET', notAllowedOrigin);

      const response = await middleware(request);

      const corsHeader = response?.headers.get('Access-Control-Allow-Origin');
      // Should either be empty string or not include the disallowed origin
      expect(corsHeader === '' || !corsHeader?.includes(notAllowedOrigin)).toBe(true);
    });
  });

  describe('Different HTTP methods', () => {
    it('should handle GET requests', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response?.status).not.toBe(403);
    });

    it('should handle POST requests', async () => {
      const request = createRequest('POST', allowedOrigin);

      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle PUT requests', async () => {
      const request = createRequest('PUT', allowedOrigin);

      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle DELETE requests', async () => {
      const request = createRequest('DELETE', allowedOrigin);

      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle PATCH requests', async () => {
      const request = createRequest('PATCH', allowedOrigin);

      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Request without origin header', () => {
    it('should handle request without origin header gracefully', async () => {
      const request = createRequest('GET');

      const response = await middleware(request);

      expect(response).toBeDefined();
      // Security headers should still be present
      expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Exposed headers', () => {
    it('should expose allowed headers to client', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const exposed = response?.headers.get('Access-Control-Expose-Headers');
      expect(exposed).toBeDefined();
      expect(exposed).toContain('Content-Length');
    });
  });

  describe('CSP (Content Security Policy)', () => {
    it('should restrict default source to self', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const csp = response?.headers.get('Content-Security-Policy');
      expect(csp).toContain("default-src 'self'");
    });

    it('should allow limited script sources', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const csp = response?.headers.get('Content-Security-Policy');
      expect(csp).toContain("script-src 'self'");
      // Should restrict or whitelist eval
      expect(csp).toBeDefined();
    });

    it('should restrict frame-ancestors to none', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const csp = response?.headers.get('Content-Security-Policy');
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should restrict form-action to self', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const csp = response?.headers.get('Content-Security-Policy');
      expect(csp).toContain("form-action 'self'");
    });
  });

  describe('HSTS (HTTP Strict-Transport-Security)', () => {
    it('should enforce HTTPS with long max-age', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const hsts = response?.headers.get('Strict-Transport-Security');
      expect(hsts).toContain('max-age=');

      // Extract max-age value
      const maxAgeMatch = hsts?.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1]);
        expect(maxAge).toBeGreaterThanOrEqual(365 * 24 * 60 * 60); // >= 1 year
      }
    });

    it('should include subdomains in HSTS', async () => {
      const request = createRequest('GET', allowedOrigin);

      const response = await middleware(request);

      const hsts = response?.headers.get('Strict-Transport-Security');
      expect(hsts).toContain('includeSubDomains');
    });
  });
});
