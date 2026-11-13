export const maximumLocationAccuracyMeters = 20;

const locationSamplingWindowMs = 5000;
const locationTimeoutMs = 30000;

export function getBestLocation() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let bestPosition;
    let watchId;
    let samplingIntervalId;
    let timeoutId;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (samplingIntervalId !== undefined) window.clearInterval(samplingIntervalId);
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      callback(value);
    };

    watchId = navigator.geolocation.watchPosition((position) => {
      if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
        bestPosition = position;
      }
    }, (error) => finish(reject, error), { enableHighAccuracy: true, maximumAge: 0 });

    samplingIntervalId = window.setInterval(() => {
      if (Date.now() - startedAt < locationSamplingWindowMs) return;
      if (bestPosition?.coords.accuracy <= maximumLocationAccuracyMeters) {
        finish(resolve, bestPosition);
      }
    }, 250);

    timeoutId = window.setTimeout(() => {
      if (bestPosition) {
        finish(resolve, bestPosition);
      } else {
        finish(reject, Object.assign(new Error("Timed out while getting your location."), { code: 3 }));
      }
    }, locationTimeoutMs);
  });
}
