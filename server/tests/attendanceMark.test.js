import test from "node:test";
import assert from "node:assert/strict";
import { calculateMarkOutOfTen } from "../utils/attendanceMark.js";

test("calculates marks out of 10 rounded to one decimal place", () => {
	assert.equal(calculateMarkOutOfTen(8, 10), 8);
	assert.equal(calculateMarkOutOfTen(1, 3), 3.3);
	assert.equal(calculateMarkOutOfTen(2, 3), 6.7);
	assert.equal(calculateMarkOutOfTen(10, 10), 10);
});

test("returns zero when completed sessions exist but none were attended", () => {
	assert.equal(calculateMarkOutOfTen(0, 4), 0);
});

test("returns no mark when there are no completed sessions", () => {
	assert.equal(calculateMarkOutOfTen(0, 0), null);
});
