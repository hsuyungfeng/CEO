export const pushNotificationConfig = {
  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  },
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
    senderId: process.env.FCM_SENDER_ID,
  },
} as const;

export function validatePushNotificationConfig() {
  if (!pushNotificationConfig.expo.accessToken) {
    throw new Error('EXPO_ACCESS_TOKEN is required for push notifications');
  }
}