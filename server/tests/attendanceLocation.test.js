import test from "node:test";
import assert from "node:assert/strict";
import { attendanceRadiusMeters, maximumLocationAccuracyMeters } from "../utils/attendanceLocation.js";

test("uses a 50-metre attendance radius and keeps the 20-metre accuracy requirement", () => {
	assert.equal(attendanceRadiusMeters, 50);
	assert.equal(maximumLocationAccuracyMeters, 20);
});
