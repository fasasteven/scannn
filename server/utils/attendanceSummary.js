export function summarizeAttendance(sessions, records) {
	const attendance = sessions.map((session) => {
		const isPresent = records.some((record) => (
			record.session.toString() === session._id.toString()
			&& record.status === "present"
		));
		return {
			sessionId: session._id,
			status: isPresent ? "present" : session.active ? "pending" : "absent",
		};
	});
	const present = attendance.filter((entry) => entry.status === "present").length;
	const absent = attendance.filter((entry) => entry.status === "absent").length;
	const pending = attendance.filter((entry) => entry.status === "pending").length;

	return {
		attendance,
		present,
		absent,
		pending,
		percentage: sessions.length ? Math.round((present / sessions.length) * 100) : 0,
	};
}
