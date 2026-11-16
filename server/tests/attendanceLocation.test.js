import test from "node:test";
import assert from "node:assert/strict";
import { attendanceRadiusMeters, maximumLocationAccuracyMeters } from "../utils/attendanceLocation.js";

test("uses a 75-metre attendance radius and accuracy limit", () => {
	assert.equal(attendanceRadiusMeters, 75);
	assert.equal(maximumLocationAccuracyMeters, 75);
});
