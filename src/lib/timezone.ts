import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// All match kickoffs are scheduled and shown in Bangladesh time.
export const APP_TIMEZONE = "Asia/Dhaka";

/** UTC instant → naive dayjs for DatePicker (wall clock in app TZ). */
export function utcToPickerValue(d: Date | string): Dayjs {
  const wall = dayjs(d).tz(APP_TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
  return dayjs(wall);
}

/** DatePicker value → UTC ISO string (wall clock interpreted as app TZ). */
export function pickerValueToUtcIso(value: Dayjs): string {
  const wall = value.format("YYYY-MM-DD HH:mm:ss");
  return dayjs.tz(wall, APP_TIMEZONE).toISOString();
}
