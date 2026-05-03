// Shared date and number formatting helpers.
// Picks one canonical format per use-case so pages stay consistent.

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const WEIGHT_NUMBER = new Intl.NumberFormat("en-US");

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/** "Apr 23, 2026" — table rows, achievement dates with year context. */
export function formatShortDate(d: Date | string): string {
  return SHORT_DATE.format(toDate(d));
}

/** "Tue, Apr 23" — daily-log style headers. */
export function formatLongDate(d: Date | string): string {
  return LONG_DATE.format(toDate(d));
}

/** "Apr 23" — compact subtitles where year is implicit. */
export function formatMonthDay(d: Date | string): string {
  return MONTH_DAY.format(toDate(d));
}

/** Thousands-separated integer for weight displays. Truncates fractional input. */
export function formatWeight(n: number): string {
  return WEIGHT_NUMBER.format(Math.round(n));
}
