// Relative time formatting for card "updated" dates. Pure function — the
// `now` param is the only source of "current time" so callers can pass a
// fixed date in tests (no wall-clock reliance).

// `dateStr` ("YYYY-MM-DD") is parsed as UTC midnight by `Date`, but `now`
// (default `new Date()`) carries the caller's local time-of-day. Diffing
// those two raw instants drifts by up to a full day depending on the
// local UTC offset and time of day — e.g. under UTC+8 at 03:00 local,
// "today" reads as 1 day stale. Normalize both sides to their own
// UTC-midnight-of-calendar-day before diffing so the day count reflects
// whole calendar days, not partial-day instant deltas.
function dateOnlyUTC(d) {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Format a "YYYY-MM-DD" date string as a relative-time label in zh. */
export function formatRelative(dateStr, now = new Date()) {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;

  const msPerDay = 24 * 60 * 60 * 1000;
  const parsedDay = Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  );
  const days = Math.round((dateOnlyUTC(now) - parsedDay) / msPerDay);
  if (days < 0) return dateStr;

  if (days < 1) return "今天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 週前`;
  if (days < 365) return `${Math.floor(days / 30)} 個月前`;
  return `${Math.floor(days / 365)} 年前`;
}
