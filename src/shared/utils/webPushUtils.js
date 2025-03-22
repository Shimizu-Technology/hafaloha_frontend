/**
 * Web Push Utilities
 * 
 * This file contains utilities for working with Web Push notifications.
 * It's based on the web-push library's implementation.
 */

/**
 * Converts a base64 string to a Uint8Array
 * This is a direct port of the web-push library's implementation
 * 
 * @param {string} base64String A base64 URL encoded string
 * @returns {Uint8Array} A Uint8Array representation of the base64 string
 */
export function urlBase64ToUint8Array(base64String) {
  // Handle the special case where the key starts with a dash
  // This can cause issues with some browsers
  if (base64String.startsWith('-')) {
    console.log('VAPID key starts with a dash, removing it');
    base64String = base64String.substring(1);
  }

  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
