# Push Notifications Setup Guide

This guide explains how to set up push notifications for the CEO Platform mobile application.

## Overview

The CEO Platform uses Expo Server SDK to send push notifications to mobile devices. The system supports:
- **Expo Push Notifications**: Primary method for sending notifications to Expo apps
- **Firebase Cloud Messaging (FCM)**: Optional for direct FCM integration
- **Apple Push Notifications (APNs)**: Handled automatically by Expo

## Prerequisites

1. **Expo Account**: Create an account at [expo.dev](https://expo.dev)
2. **Expo Project**: Create a project in your Expo account
3. **Expo Access Token**: Generate an access token from Expo account settings
4. **Firebase Project** (optional): For direct FCM integration
5. **Apple Developer Account** (optional): For iOS push notifications via Expo

## Step 1: Expo Push Notifications Setup

### 1.1 Create Expo Account and Project
1. Sign up at [expo.dev](https://expo.dev)
2. Create a new project or use existing project
3. Note your project ID (e.g., `@your-username/your-project`)

### 1.2 Generate Expo Access Token
1. Go to [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
2. Click "Create new token"
3. Give it a name (e.g., "CEO Platform Server")
4. Copy the generated token
5. Add it to your `.env.local` file:
   ```bash
   EXPO_ACCESS_TOKEN=your_expo_access_token_here
   ```

### 1.3 Configure Mobile App
In your Expo mobile app project:
1. Install `expo-notifications` package:
   ```bash
   npx expo install expo-notifications
   ```
2. Configure `app.json`/`app.config.js` with proper notification configuration
3. Request notification permissions in your app code

## Step 2: Firebase Cloud Messaging (Optional)

### 2.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing
3. Add an Android app to your project
4. Download `google-services.json` and add to your Expo project

### 2.2 Get FCM Credentials
1. In Firebase Console, go to Project Settings → Cloud Messaging
2. Copy the **Server Key** and **Sender ID**
3. Add to your `.env.local` file:
   ```bash
   FCM_SERVER_KEY=your_fcm_server_key_here
   FCM_SENDER_ID=your_fcm_sender_id_here
   ```

### 2.3 Configure Expo for FCM
In your Expo project:
1. Install `expo-notifications` if not already installed
2. Configure FCM in `app.json`:
   ```json
   {
     "expo": {
       "android": {
         "googleServicesFile": "./google-services.json"
       }
     }
   }
   ```

## Step 3: Apple Push Notifications via Expo

### 3.1 Apple Developer Account Requirements
1. Active Apple Developer account ($99/year)
2. App ID with Push Notifications capability enabled
3. APNs authentication key or certificate

### 3.2 Configure with Expo
1. In your Expo project, run:
   ```bash
   npx expo credentials:manager
   ```
2. Select "iOS"
3. Choose "Push Notifications"
4. Follow prompts to upload your APNs key or certificate

### 3.3 Environment Variables (Optional)
For direct APNs configuration (if not using Expo):
```bash
APNS_KEY_ID=your_apns_key_id_here
APNS_TEAM_ID=your_apns_team_id_here
APNS_AUTH_KEY=your_apns_auth_key_here
```

## Step 4: Testing Push Notifications

### 4.1 Test with Expo Push Tool
1. Get device push token from your mobile app
2. Use the test endpoint at `POST /api/push/test`
3. Send a test notification:
   ```bash
   curl -X POST http://localhost:3000/api/push/test \
     -H "Content-Type: application/json" \
     -d '{"token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", "title": "Test", "body": "Hello World"}'
   ```

### 4.2 Test with Mobile App
1. Run the mobile app on a physical device
2. Grant notification permissions
3. Trigger a test notification from the app or API

## Step 5: Production Deployment

### 5.1 Environment Variables
Ensure all required environment variables are set in production:
- `EXPO_ACCESS_TOKEN` (required)
- `FCM_SERVER_KEY` (optional)
- `FCM_SENDER_ID` (optional)
- APNs variables (optional)

### 5.2 Verify Configuration
1. Test notifications in production environment
2. Monitor error logs for push notification failures
3. Set up error tracking (Sentry) for notification errors

## Troubleshooting

### Common Issues

**No notifications received:**
- Check device token is valid
- Verify Expo access token has correct permissions
- Ensure app has notification permissions enabled
- Check server logs for errors

**iOS notifications not working:**
- Verify APNs configuration in Expo
- Ensure proper certificates/keys
- Check device is registered with APNs

**Android notifications not working:**
- Verify FCM configuration
- Check `google-services.json` is correctly placed
- Ensure device has Google Play Services

### Debugging Tips
1. Use Expo's push notification tool: `npx expo push:send`
2. Check server logs for API errors
3. Verify environment variables are loaded
4. Test with different device tokens

## Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/push-notifications/overview/)
- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [Expo Server SDK GitHub](https://github.com/expo/expo-server-sdk)

## Support

For issues with push notifications:
1. Check the troubleshooting section above
2. Review Expo documentation
3. Contact development team with error logs
