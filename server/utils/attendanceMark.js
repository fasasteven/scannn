export function calculateMarkOutOfTen(present, totalSessions) {
	return totalSessions ? Math.round((present / totalSessions) * 100) / 10 : null;
}
