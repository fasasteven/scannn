import test from "node:test";
import assert from "node:assert/strict";
import { summarizeAttendance } from "../utils/attendanceSummary.js";

test("counts active check-ins as present and leaves unchecked students pending", () => {
	const sessions = [
		{ _id: "completed-1", active: false },
		{ _id: "active-1", active: true },
	];
	const records = [{ session: "active-1", status: "present" }];

	assert.deepEqual(summarizeAttendance(sessions, records), {
		attendance: [
			{ sessionId: "completed-1", status: "absent" },
			{ sessionId: "active-1", status: "present" },
		],
		present: 1,
		absent: 1,
		pending: 0,
		percentage: 50,
	});
});

test("does not mark students absent for an active session before it ends", () => {
	const sessions = [{ _id: "active-1", active: true }];

	assert.deepEqual(summarizeAttendance(sessions, []), {
		attendance: [{ sessionId: "active-1", status: "pending" }],
		present: 0,
		absent: 0,
		pending: 1,
		percentage: 0,
	});
});
