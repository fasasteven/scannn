import test from "node:test";
import assert from "node:assert/strict";
import { calculateDistanceMeters } from "../utils/calculateDistance.js";

test("calculates distance in metres between two coordinates", () => {
	const latitudeFor46Meters = 46 / 6371000 * 180 / Math.PI;

	assert.equal(calculateDistanceMeters(
		{ latitude: 0, longitude: 0 },
		{ latitude: 0, longitude: 0 },
	), 0);
	assert.ok(Math.abs(calculateDistanceMeters(
		{ latitude: 0, longitude: 0 },
		{ latitude: latitudeFor46Meters, longitude: 0 },
	) - 46) < 0.01);
});
