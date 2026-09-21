const deviceStorageKey = "attendance_device_id";

export function getDeviceId() {
  let deviceId = localStorage.getItem(deviceStorageKey);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(deviceStorageKey, deviceId);
  }
  return deviceId;
}