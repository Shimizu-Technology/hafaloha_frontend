// A simple, reliable implementation for converting VAPID keys
// Based on the web-push library's implementation

/**
 * Takes a base64 URL encoded string and converts it to a Uint8Array
 * @param {string} base64String A base64 URL encoded string
 * @returns {Uint8Array} A Uint8Array representation of the base64 string
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
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
