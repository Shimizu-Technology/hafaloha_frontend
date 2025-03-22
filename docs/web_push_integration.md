# Web Push Notifications Integration

This document describes the implementation of Web Push notifications in the Hafaloha application.

## Overview

Web Push notifications allow the application to send notifications to users' devices even when they are not actively using the application. This is particularly useful for notifying restaurant staff about new orders or other important events.

## Requirements

- HTTPS is required for Web Push notifications to work in production
- For iOS devices (iPad/iPhone), the application must be added to the home screen
- iOS support requires iOS 16.4 or later

## Architecture

The Web Push implementation consists of the following components:

### Backend (Rails)

1. **PushSubscription Model**: Stores subscription information for each device
2. **PushSubscriptionsController**: Handles subscription creation, retrieval, and deletion
3. **SendWebPushNotificationJob**: Background job for sending push notifications
4. **Restaurant Model**: Contains methods for managing Web Push settings and sending notifications

### Frontend (React)

1. **Service Worker**: Handles incoming push notifications and displays them to the user
2. **Web Push Helper**: Utility functions for subscribing to and managing push notifications
3. **NotificationSettings Component**: UI for enabling/disabling Web Push notifications

## How It Works

1. The user enables Web Push notifications in the admin settings
2. The application requests permission to send notifications
3. If granted, the browser generates a subscription object with endpoint and keys
4. The subscription is sent to the server and stored in the database
5. When a new order is created, a notification is sent to all subscribed devices
6. The service worker receives the notification and displays it to the user

## VAPID Keys

Web Push uses VAPID (Voluntary Application Server Identification) keys for authentication. These are a pair of public/private keys that are used to sign the push messages.

- The public key is sent to the browser when subscribing
- The private key is kept on the server and used to sign push messages

VAPID keys can be generated in the admin settings or via the Rails console:

```ruby
vapid_keys = Webpush.generate_key
puts "Public Key: #{vapid_keys[:public_key]}"
puts "Private Key: #{vapid_keys[:private_key]}"
```

## iOS Considerations

For iOS devices (iPad/iPhone), Web Push notifications require:

1. iOS 16.4 or later
2. The application must be added to the home screen (via Safari's "Share" → "Add to Home Screen")
3. The PWA must be launched from the home screen icon, not from Safari

## Testing

To test Web Push notifications:

1. Enable Web Push in the admin settings
2. Subscribe a device using the "Subscribe this device" button
3. Create a new order
4. Verify that a notification is received on the subscribed device

Note that in development, you can use `http://localhost` for testing, but production requires HTTPS.

## Troubleshooting

### Common Issues

1. **Notifications not appearing**: Check browser permissions and ensure the service worker is registered
2. **Subscription fails**: Ensure VAPID keys are properly configured
3. **iOS not receiving notifications**: Verify iOS version is 16.4+ and the app is added to home screen

### Debugging

The service worker logs information to the console, which can be helpful for debugging:

1. Open browser developer tools
2. Go to the Application tab
3. Select Service Workers
4. Check the logs for any errors

## API Reference

### Backend Endpoints

- `GET /push_subscriptions/vapid_public_key`: Get the VAPID public key
- `POST /push_subscriptions`: Create a new subscription
- `POST /push_subscriptions/unsubscribe`: Unsubscribe from push notifications

### Frontend Utilities

- `isPushNotificationSupported()`: Check if the browser supports push notifications
- `subscribeToPushNotifications()`: Subscribe to push notifications
- `unsubscribeFromPushNotifications()`: Unsubscribe from push notifications
- `getPushSubscriptionStatus()`: Get the current subscription status

## Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Webpush Gem Documentation](https://github.com/zaru/webpush)
