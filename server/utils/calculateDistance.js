const EARTH_RADIUS_METERS = 6371000;

export function calculateDistanceMeters(first, second) {
	const toRadians = (value) => value * Math.PI / 180;
	const latitudeDelta = toRadians(second.latitude - first.latitude);
	const longitudeDelta = toRadians(second.longitude - first.longitude);
	const latitude = toRadians(first.latitude);
	const secondLatitude = toRadians(second.latitude);
	const value = Math.sin(latitudeDelta / 2) ** 2
		+ Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitude) * Math.cos(secondLatitude);
	return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
