import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

// Configure how notifications should be handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // Expo SDK 54 (expo-notifications@0.32.x) adds banner/list behaviors
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      // Get the device push token (FCM for Android)
      // Note: This requires google-services.json to be configured in app.json for Android
      // If running in Expo Go, this might fail or return an Expo Go token which won't work with direct FCM
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
      console.log('FCM Token:', token);

      // Send to backend
      if (token) {
        await api.post('/fcm-token', { fcm_token: token });
        console.log('FCM Token sent to backend successfully');
      }
    } catch (error) {
      console.error('Error getting push token:', error);
      // Fallback for development/Expo Go (optional, depends on if backend supports Expo Push Token)
      // For this implementation, we strictly need FCM token as backend uses FCM API directly.
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
