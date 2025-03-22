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
      
      // Check if there's an existing subscription that might be causing issues
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Found existing subscription, attempting to unsubscribe first');
        try {
          await existingSubscription.unsubscribe();
          console.log('Unsubscribed from existing subscription');
        } catch (unsubError) {
          console.error('Error unsubscribing from existing subscription:', unsubError);
        }
      }
      
      // iOS Safari specific debugging
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      if (isIOS) {
        console.log('Running on iOS device');
        console.log('iOS version:', navigator.userAgent);
        console.log('Is standalone (PWA)?:', isStandalone);
        
        // Check if iOS version is at least 16.4
        const iosVersionMatch = navigator.userAgent.match(/OS (\d+)_(\d+)/);
        let isIOSVersionSupported = false;
        let majorVersion = 0;
        let minorVersion = 0;
        
        if (iosVersionMatch) {
          majorVersion = parseInt(iosVersionMatch[1], 10);
          minorVersion = parseInt(iosVersionMatch[2], 10);
          
          console.log(`Detected iOS version: ${majorVersion}.${minorVersion}`);
          
          // iOS 16.4+ is required for web push
          isIOSVersionSupported = (majorVersion > 16) || (majorVersion === 16 && minorVersion >= 4);
          console.log('Is iOS version supported?', isIOSVersionSupported);
        } else {
          console.warn('Could not detect iOS version from user agent:', navigator.userAgent);
        }
        
        // If not standalone or iOS version < 16.4, show warning
        if (!isStandalone || !isIOSVersionSupported) {
          console.warn('iOS device requirements not met for push notifications');
          console.warn('Is standalone?', isStandalone);
          console.warn('Is iOS version supported?', isIOSVersionSupported);
          
          // Show appropriate warning
          if (!isStandalone) {
            alert('This app must be installed to your home screen (Add to Home Screen) to receive push notifications.');
            return false;
          } else if (!isIOSVersionSupported) {
            alert(`Push notifications require iOS 16.4 or later. Your device appears to be running iOS ${majorVersion}.${minorVersion}.`);
            return false;
          }
        }
      }
      
      console.log('Calling pushManager.subscribe...');
      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true, // Required for Chrome
          applicationServerKey: applicationServerKey
        });
        console.log('Push subscription created successfully:', subscription);
      } catch (subscribeSpecificError: any) {
        console.error('Specific error in pushManager.subscribe:', subscribeSpecificError);
        console.error('Error name:', subscribeSpecificError.name);
        console.error('Error message:', subscribeSpecificError.message);
        
        if (subscribeSpecificError.name === 'NotAllowedError') {
          console.error('Permission denied for push notifications');
          alert('Permission denied for push notifications. Please check your browser settings.');
        } else if (subscribeSpecificError.name === 'AbortError') {
          console.error('Push subscription was aborted');
          alert('Push subscription was aborted. This may be due to a network issue or browser restriction.');
        } else if (subscribeSpecificError.name === 'InvalidStateError') {
          console.error('Service worker is not activated');
          alert('Service worker is not activated. Please refresh the page and try again.');
        } else if (isIOS) {
          // Check if iOS version is at least 16.4
          const iosVersionMatch = navigator.userAgent.match(/OS (\d+)_(\d+)/);
          let isIOSVersionSupported = false;
          
          if (iosVersionMatch) {
            const majorVersion = parseInt(iosVersionMatch[1], 10);
            const minorVersion = parseInt(iosVersionMatch[2], 10);
            isIOSVersionSupported = (majorVersion > 16) || (majorVersion === 16 && minorVersion >= 4);
          }
          
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
          
          if (!isStandalone) {
            console.error('iOS app not installed to home screen');
            alert('This app must be installed to your home screen (Add to Home Screen) to receive push notifications.');
          } else if (!isIOSVersionSupported) {
            console.error('iOS version not supported for push notifications');
            alert('Push notifications require iOS 16.4 or later. Your device appears to be running an older version.');
          } else {
            console.error('Unknown iOS push notification error');
            alert('There was an error setting up push notifications on your iOS device. This may be due to browser restrictions or network issues.');
          }
        }
        
        throw subscribeSpecificError;
      }
      
      if (!subscription) {
        console.error('Subscription is null after pushManager.subscribe');
        return false;
      }
      
      // Send the subscription to the server
      console.log('Sending subscription to server');
      try {
        await api.post(`/push_subscriptions?restaurant_id=${restaurantId}`, { subscription });
        console.log('Subscription sent to server successfully');
      } catch (apiError) {
        console.error('Error sending subscription to server:', apiError);
        // Continue anyway, as the subscription was created successfully
      }
      
      return true;
    } catch (subscribeError) {
      console.error('Error in subscribeToPushNotifications:', subscribeError);
      return false;
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
