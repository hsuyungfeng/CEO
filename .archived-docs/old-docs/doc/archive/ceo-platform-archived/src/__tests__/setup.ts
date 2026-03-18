import '@testing-library/jest-dom/vitest'

// Set up environment variables for tests
process.env.DATABASE_URL = 'postgresql://ceo_admin:SecureDevPass_2026!@localhost:5432/ceo_platform'
process.env.RESEND_API_KEY = 'test_resend_key'
process.env.JWT_SECRET = 'test_jwt_secret'
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret'
process.env.NEXTAUTH_SECRET = 'test_nextauth_secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Push Notifications
process.env.EXPO_ACCESS_TOKEN = 'test-expo-access-token'
process.env.FCM_SERVER_KEY = 'test-fcm-server-key'
process.env.FCM_SENDER_ID = 'test-fcm-sender-id'
