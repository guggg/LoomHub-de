import { describe, it, expect } from "vitest";
import { formatRelative } from "../relativeTime.js";

// Use the local-time constructor (year, month, day, ...), not a date-only
// string. `new Date("2026-06-15")` parses as UTC midnight, which under a
// negative UTC offset (e.g. America/Los_Angeles) is actually the *previous*
// local calendar day — that mismatch made this whole fixture silently
// TZ-dependent and papers over the exact UTC-vs-local drift `formatRelative`
// must guard against.
const NOW = new Date(2026, 5, 15);

describe("formatRelative", () => {
  it("returns 今天 for today", () => {
    expect(formatRelative("2026-06-15", NOW)).toBe("今天");
  });

  it("returns N 天前 for 1 day ago", () => {
    expect(formatRelative("2026-06-14", NOW)).toBe("1 天前");
  });

  it("returns N 天前 for 6 days ago", () => {
    expect(formatRelative("2026-06-09", NOW)).toBe("6 天前");
  });

  it("returns N 週前 at the 7-day boundary", () => {
    expect(formatRelative("2026-06-08", NOW)).toBe("1 週前");
  });

  it("returns N 週前 for 29 days ago", () => {
    expect(formatRelative("2026-05-17", NOW)).toBe("4 週前");
  });

  it("returns N 個月前 at the 30-day boundary", () => {
    expect(formatRelative("2026-05-16", NOW)).toBe("1 個月前");
  });

  it("returns N 個月前 for 364 days ago", () => {
    expect(formatRelative("2025-06-16", NOW)).toBe("12 個月前");
  });

  it("returns N 年前 at the 365-day boundary", () => {
    expect(formatRelative("2025-06-15", NOW)).toBe("1 年前");
  });

  it("returns the original string for a future date", () => {
    expect(formatRelative("2026-07-01", NOW)).toBe("2026-07-01");
  });

  it("returns the original string for an invalid date", () => {
    expect(formatRelative("not-a-date", NOW)).toBe("not-a-date");
  });

  // Regression: `dateStr` parses as UTC midnight, but a real `now` (the
  // default `new Date()`) carries local time-of-day. Under a positive UTC
  // offset, a naive `now.getTime() - parsed.getTime()` diff makes "today"
  // read as stale by a day. Use a local-time `Date` constructor (not a
  // date-only string) for `now` to actually exercise that mismatch.
  it("treats a same-calendar-day update as 今天 even when now is a local-time instant past midnight UTC", () => {
    // Local components 2026-06-15 03:00 — under UTC+ offsets this instant is
    // still 2026-06-14 in UTC, which is exactly where the naive diff broke.
    const localNow = new Date(2026, 5, 15, 3, 0, 0);
    expect(formatRelative("2026-06-15", localNow)).toBe("今天");
  });

  it("counts 1 天前 for yesterday when now is a local-time instant", () => {
    const localNow = new Date(2026, 5, 15, 3, 0, 0);
    expect(formatRelative("2026-06-14", localNow)).toBe("1 天前");
  });
});
