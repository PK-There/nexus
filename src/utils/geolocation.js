/**
 * Signal — Geolocation Utility
 * 
 * Provides getCurrentLocation() that wraps the browser's Geolocation API
 * into a clean Promise-based interface for use in the beacon creation form.
 * 
 * Returns { lat, lng } on success, or throws with a descriptive error message
 * so the UI can fall back to manual map pin-drop.
 */

/**
 * Attempt to get the device's current GPS coordinates.
 * 
 * @param {object} [options] - PositionOptions overrides
 * @param {boolean} [options.enableHighAccuracy=true] - Use GPS if available
 * @param {number}  [options.timeout=10000] - Max wait time in ms
 * @param {number}  [options.maximumAge=60000] - Accept cached position up to this age (ms)
 * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
 */
export function getCurrentLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,     // Accept a cached position up to 1 min old (useful offline)
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. You can drop a pin on the map instead.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable (GPS/network issue). Drop a pin on the map.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Drop a pin on the map.';
            break;
          default:
            message = 'Unknown geolocation error. Drop a pin on the map.';
        }
        reject(new Error(message));
      },
      geoOptions,
    );
  });
}
