import '@testing-library/jest-dom'
import dotenv from 'dotenv'

// Load .env.local for tests
dotenv.config({ path: '.env.local' })

// Polyfill Request, Response, and other Web APIs for Next.js middleware testing
if (typeof global.Request === 'undefined') {
  const { Request, Response, fetch } = require('node-fetch-polyfill')
  global.Request = Request
  global.Response = Response
  global.fetch = fetch
}

// Mock logger module
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock environment variables for tests
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-do-not-use-in-production'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-key-do-not-use-in-production'
process.env.NODE_ENV = 'test'
