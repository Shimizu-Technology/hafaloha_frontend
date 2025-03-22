// src/shared/utils/webPushHelper.ts
import { api } from '../api/apiClient';
import { useRestaurantStore } from '../store/restaurantStore';

/**
 * Checks if push notifications are supported by the browser
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

/**
 * Gets the current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'default'> {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }
  
  return Notification.permission as 'granted' | 'denied' | 'default';
}

/**
 * Converts a base64 string to a Uint8Array
 * This is used to convert the VAPID public key to the format required by the PushManager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  try {
    // Add padding if needed
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    
    // Convert URL-safe base64 to regular base64
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    console.log('Converted base64:', base64);
    
    // Convert base64 to binary string
    const rawData = window.atob(base64);
    console.log('Raw data length:', rawData.length);
    
    // Convert binary string to Uint8Array
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  } catch (error) {
    console.error('Error in urlBase64ToUint8Array:', error);
    throw error;
  }
}

/**
 * Gets the current push subscription status
 */
export async function getPushSubscriptionStatus(): Promise<'granted' | 'denied' | 'default' | 'not-supported' | 'not-subscribed'> {
  // Check if push notifications are supported
  if (!isPushNotificationSupported()) {
    return 'not-supported';
  }
  
  // Check permission status
  const permission = await getNotificationPermissionStatus();
  if (permission === 'denied') {
    return 'denied';
  }
  
  if (permission === 'default') {
    return 'default';
  }
  
  // Check if we have an active subscription
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      return 'granted';
    } else {
      return 'not-subscribed';
    }
  } catch (error) {
    console.error('Error checking push subscription status:', error);
    return 'not-supported';
  }
}

/**
 * Subscribes to push notifications
 */
export async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    // Check if push notifications are supported
    if (!isPushNotificationSupported()) {
      console.error('Push notifications are not supported');
      return false;
    }
    
    // Request permission if not already granted
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('Notification permission not granted');
      return false;
    }
    
    // Get the restaurant ID from the store
    const restaurant = useRestaurantStore.getState().restaurant;
    const restaurantId = restaurant?.id;
    
    if (!restaurantId) {
      console.error('Restaurant ID not found');
      return false;
    }
    
    console.log('Fetching VAPID public key for restaurant:', restaurantId);
    
    // Get the VAPID public key from the server
    const response = await api.get<{ enabled: boolean; vapid_public_key?: string }>(
      `/push_subscriptions/vapid_public_key?restaurant_id=${restaurantId}`
    );
    
    console.log('VAPID response:', response);
    
    if (!response.enabled || !response.vapid_public_key) {
      console.error('Web push is not enabled or VAPID public key is missing');
      return false;
    }
    
    // Get the service worker registration
    console.log('Getting service worker registration');
    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker registration:', registration);
    
    try {
      // Subscribe to push notifications
      console.log('Subscribing to push notifications with key:', response.vapid_public_key);
      const applicationServerKey = urlBase64ToUint8Array(response.vapid_public_key);
      console.log('Application server key (Uint8Array):', applicationServerKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required for Chrome
        applicationServerKey: applicationServerKey
      });
      
      console.log('Push subscription created:', subscription);
      
      // Send the subscription to the server
      console.log('Sending subscription to server');
      await api.post(`/push_subscriptions?restaurant_id=${restaurantId}`, { subscription });
      console.log('Subscription sent to server successfully');
      
      return true;
    } catch (subscribeError) {
      console.error('Error in pushManager.subscribe:', subscribeError);
      
      // Check if there's an existing subscription that might be causing issues
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Found existing subscription, attempting to unsubscribe first');
        await existingSubscription.unsubscribe();
        console.log('Unsubscribed from existing subscription, please try subscribing again');
      }
      
      throw subscribeError;
    }
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribes from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    // Check if push notifications are supported
    if (!isPushNotificationSupported()) {
      console.error('Push notifications are not supported');
      return false;
    }
    
    // Get the restaurant ID from the store
    const restaurant = useRestaurantStore.getState().restaurant;
    const restaurantId = restaurant?.id;
    
    if (!restaurantId) {
      console.error('Restaurant ID not found');
      return false;
    }
    
    // Get the service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get the current subscription
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.error('No push subscription found');
      return false;
    }
    
    // Unsubscribe from push notifications
    const unsubscribed = await subscription.unsubscribe();
    
    if (unsubscribed) {
      // Notify the server
      await api.post(`/push_subscriptions/unsubscribe?restaurant_id=${restaurantId}`, { 
        subscription: {
          endpoint: subscription.endpoint
        }
      });
      
      return true;
    } else {
      console.error('Failed to unsubscribe from push notifications');
      return false;
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}
