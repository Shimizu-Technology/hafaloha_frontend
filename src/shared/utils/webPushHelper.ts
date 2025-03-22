// src/shared/utils/webPushHelper.ts
import { api } from '../api/apiClient';

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
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
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
    
    // Get the VAPID public key from the server
    const response = await api.get<{ enabled: boolean; vapid_public_key?: string }>('/push_subscriptions/vapid_public_key');
    
    if (!response.enabled || !response.vapid_public_key) {
      console.error('Web push is not enabled or VAPID public key is missing');
      return false;
    }
    
    // Get the service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // Required for Chrome
      applicationServerKey: urlBase64ToUint8Array(response.vapid_public_key)
    });
    
    // Send the subscription to the server
    await api.post('/push_subscriptions', { subscription });
    
    return true;
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
      await api.post('/push_subscriptions/unsubscribe', { 
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
