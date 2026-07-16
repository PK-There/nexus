

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
