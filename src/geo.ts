export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export function watchPosition(
  onUpdate: (pos: GeoPosition) => void,
  onError: (message: string) => void
): number | null {
  if (!('geolocation' in navigator)) {
    onError('This browser does not support location.');
    return null;
  }
  return navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      });
    },
    (err) => onError(err.message),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
  );
}

export function clearWatch(id: number | null) {
  if (id !== null) navigator.geolocation.clearWatch(id);
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser does not support location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}
