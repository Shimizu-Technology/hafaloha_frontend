# Web Push Notifications Integration Guide

This document explains how web push notifications are implemented in the Hafaloha application.

## Overview

Web push notifications allow the application to send notifications to users even when they are not actively using the application. This is particularly useful for notifying restaurant staff about new orders.

The implementation uses the Web Push API, which is supported by most modern browsers. On iOS devices (iPad/iPhone), web push notifications are supported in iOS 16.4+ when the web app is installed as a PWA (Progressive Web App).

## Architecture

The web push notification system consists of the following components:

1. **Frontend (React)**
   - Service Worker: Handles receiving push notifications and displaying them to the user
   - Web Push Helper: Provides utility functions for subscribing to and managing push notifications
   - Notification Settings UI: Allows administrators to enable/disable web push notifications and manage subscriptions

2. **Backend (Rails)**
   - Push Subscriptions Controller: Manages push subscription endpoints
   - Web Push Notification Job: Sends push notifications to subscribed devices
   - Restaurant Model: Stores VAPID keys and notification settings

## How It Works

### VAPID Keys

Web Push uses VAPID (Voluntary Application Server Identification) keys for authentication. Each restaurant has its own set of VAPID keys (public and private) stored in the `admin_settings` JSON field of the Restaurant model.

### Setup Process

1. Go to Admin Dashboard > Settings > Notification Settings
2. Enable Web Push Notifications using the toggle
3. Click the "Generate New Keys" button to generate VAPID keys
4. Click "Save Settings" to save your changes

### Subscription Process

1. After setting up web push notifications, click "Subscribe this device" on each device where you want to receive notifications
2. The browser requests permission to show notifications
3. If granted, the browser registers with the push service (e.g., Apple Push Notification Service for Safari)
4. The subscription details (endpoint, p256dh key, auth key) are sent to the server
5. The server stores the subscription in the database

### Sending Notifications

1. When a new order is created, the `send_web_push_notification_job` is triggered
2. The job retrieves all active subscriptions for the restaurant
3. For each subscription, it sends a push message using the webpush gem
4. The push service delivers the message to the browser
5. The service worker receives the push event and displays a notification

## Implementation Details

### Frontend

#### Service Worker (public/service-worker.js)

The service worker handles push events and displays notifications:

```javascript
self.addEventListener('push', event => {
  // Parse the data from the push event
  const data = event.data.json();
  
  // Show a notification
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      // ...other options
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Open or focus the app when the notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // ...
    })
  );
});
```

#### Web Push Helper (src/shared/utils/webPushHelper.ts)

Provides utility functions for managing push notifications:

- `isPushNotificationSupported()`: Checks if the browser supports push notifications
- `getNotificationPermissionStatus()`: Gets the current permission status
- `subscribeToPushNotifications()`: Subscribes the current device to push notifications
- `unsubscribeFromPushNotifications()`: Unsubscribes the current device

### Backend

#### Push Subscriptions Controller

Handles API endpoints for managing push subscriptions:

- `GET /push_subscriptions/vapid_public_key`: Returns the VAPID public key for the restaurant
- `POST /push_subscriptions`: Creates a new push subscription
- `POST /push_subscriptions/unsubscribe`: Unsubscribes a device
- `GET /push_subscriptions`: Lists all subscriptions (admin only)
- `DELETE /push_subscriptions/:id`: Deletes a subscription (admin only)

#### Web Push Notification Job

Sends push notifications to subscribed devices:

```ruby
def perform(restaurant_id, payload)
  restaurant = Restaurant.find(restaurant_id)
  return unless restaurant.web_push_enabled?
  
  vapid_keys = restaurant.web_push_vapid_keys
  subscriptions = restaurant.push_subscriptions.active
  
  subscriptions.each do |subscription|
    begin
      Webpush.payload_send(
        message: payload.to_json,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
        vapid: {
          subject: "mailto:#{restaurant.contact_email || 'notifications@hafaloha.com'}",
          public_key: vapid_keys[:public_key],
          private_key: vapid_keys[:private_key]
        }
      )
    rescue Webpush::InvalidSubscription
      subscription.deactivate!
    rescue => e
      Rails.logger.error("Failed to send push notification: #{e.message}")
    end
  end
end
```

## iOS/iPad Specific Considerations

For iOS devices (iPad/iPhone), web push notifications are only supported when:

1. The device is running iOS 16.4 or later
2. The web app is installed as a PWA (Add to Home Screen)
3. The user has granted notification permission

## Troubleshooting

### Common Issues

1. **Notification permission denied**: The user must grant notification permission in the browser settings
2. **Service worker not registered**: Check if the service worker is properly registered in the browser
3. **Invalid VAPID keys**: Ensure the VAPID keys are properly generated and stored
4. **Subscription failed**: Check browser console for detailed error messages

### Debugging

To debug push notification issues:

1. Check browser console for error messages
2. Verify that the service worker is registered and active
3. Check that the VAPID keys are properly configured
4. Verify that the subscription is stored in the database
5. Check server logs for errors when sending notifications

## References

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Webpush Gem Documentation](https://github.com/zaru/webpush)
