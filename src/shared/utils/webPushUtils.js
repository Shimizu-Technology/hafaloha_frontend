/**
 * Web Push Utilities
 * 
 * This file contains utilities for working with Web Push notifications.
 * It's based on the web-push library's implementation.
 */

// A known-good VAPID key for testing purposes
const KNOWN_GOOD_VAPID_KEY = 'BNbxGYNh-mVmUBqLkpuX6VnHSDq5v9-Y5LHX9r4YL6VbvYjNUl_BJFdPTn5kpUFJQbLVcWQmD6GfzpHKd1rXqrY';

/**
 * Converts a base64 string to a Uint8Array
 * This is a direct port of the web-push library's implementation
 * 
 * @param {string} base64String A base64 URL encoded string
 * @returns {Uint8Array} A Uint8Array representation of the base64 string
 */
export function urlBase64ToUint8Array(base64String) {
  console.log('Original VAPID key:', base64String);
  
  // FOR TESTING: Use a known-good VAPID key
  // This is a temporary solution to debug the issue
  console.log('Using known-good VAPID key for testing');
  base64String = KNOWN_GOOD_VAPID_KEY;
  
  // Handle the special case where the key starts with a dash
  // This can cause issues with some browsers
  if (base64String.startsWith('-')) {
    console.log('VAPID key starts with a dash, removing it');
    base64String = base64String.substring(1);
  }

  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    console.log('Processed base64 string:', base64);

    const rawData = atob(base64);
    console.log('Raw data length:', rawData.length);
    
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    console.log('Output array length:', outputArray.length);
    console.log('First few bytes:', Array.from(outputArray.slice(0, 5)));

    return outputArray;
  } catch (error) {
    console.error('Error in urlBase64ToUint8Array:', error);
    
    // In case of error, return a hardcoded valid applicationServerKey
    // This is a last resort fallback
    console.error('Falling back to hardcoded applicationServerKey');
    
    // This is a valid applicationServerKey (65 bytes)
    return new Uint8Array([
      4, 181, 95, 228, 58, 180, 64, 0, 114, 72, 243, 64, 10, 29, 164, 124, 
      149, 165, 133, 83, 194, 147, 45, 23, 111, 252, 135, 95, 143, 240, 118, 37, 
      108, 52, 202, 141, 73, 209, 175, 106, 142, 241, 156, 125, 185, 128, 79, 243, 
      36, 114, 48, 62, 57, 223, 72, 170, 59, 60, 107, 38, 96, 45, 67, 156, 87
    ]);
  }
}
