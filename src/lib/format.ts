import { APP_TIMEZONE } from "@/lib/timezone";

// All times are shown in 12-hour format with uppercase AM/PM (Bangladesh time).
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: APP_TIMEZONE,
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: APP_TIMEZONE,
});

const fullFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: APP_TIMEZONE,
});

// Date-badge parts for the fixtures poster (weekday / day / month), each in
// Bangladesh time so they line up with the rest of the app.
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: APP_TIMEZONE });
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: APP_TIMEZONE });
const monthAbbrFmt = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: APP_TIMEZONE });

// Renders parts, forcing the am/pm marker to uppercase (en-GB emits lowercase).
function render(fmt: Intl.DateTimeFormat, d: Date) {
  return fmt
    .formatToParts(d)
    .map((p) => (p.type === "dayPeriod" ? p.value.toUpperCase() : p.value))
    .join("");
}

export const formatDate = (d: Date) => render(dateFmt, d);
export const formatTime = (d: Date) => render(timeFmt, d);
export const formatFull = (d: Date) => render(fullFmt, d);

export const formatWeekday = (d: Date) => render(weekdayFmt, d).toUpperCase();
export const formatDayNum = (d: Date) => render(dayFmt, d);
export const formatMonthAbbr = (d: Date) => render(monthAbbrFmt, d).toUpperCase();

// Money — all amounts are Bangladeshi Taka (whole taka, no decimals).
const bdtFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export const formatBdt = (amount: number) => `৳${bdtFmt.format(amount)}`;

/** Human label for who covered a booking. */
export const paidByLabel = (paidBy: string) => (paidBy === "self" ? "We pay" : "Office");

// Value for <input type="datetime-local"> in local time.
export function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
