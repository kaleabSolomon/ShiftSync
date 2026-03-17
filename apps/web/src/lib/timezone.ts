import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// Formats a UTC timestamp into a localized time string in the given IANA timezone.
export function formatShiftTime(
  utcMs: number,
  locationTimezone: string,
  fmt = "h:mm a",
): string {
  const zoned = toZonedTime(new Date(utcMs), locationTimezone);
  return format(zoned, fmt);
}

// Returns the day-of-week (0 = Sunday … 6 = Saturday) for a UTC timestamp
export function shiftDayOfWeek(
  utcMs: number,
  locationTimezone: string,
): number {
  const zoned = toZonedTime(new Date(utcMs), locationTimezone);
  return zoned.getDay();
}

// Converts a local HH:MM time string on a given date into a UTC millisecond
export function convertToUTC(
  localTime: string,
  date: string,
  timezone: string,
): number {
  // Build an ISO-like string that we can parse with timezone awareness
  const [hours, minutes] = localTime.split(":").map(Number);

  // Create a date in the target timezone using the Intl API
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const [year, month, day] = date.split("-").map(Number);

  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const parts = formatter.formatToParts(utcDate);
  const getPart = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const tzHour = getPart("hour");
  const tzMinute = getPart("minute");
  const tzDay = getPart("day");

  // Calculate the offset in minutes
  const utcMinutes = hours * 60 + minutes;
  const tzMinutes = tzHour * 60 + tzMinute;
  let offsetMinutes = tzMinutes - utcMinutes;

  // Adjust for day boundary crossings
  if (tzDay !== day) {
    offsetMinutes += tzDay > day ? 24 * 60 : -24 * 60;
  }

  // The actual UTC time is the local time minus the offset
  const targetUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  targetUtc.setUTCMinutes(targetUtc.getUTCMinutes() - offsetMinutes);

  return targetUtc.getTime();
}

//Formats a full shift time range like "2:00 PM – 10:00 PM EST"

export function formatShiftRange(
  startUtcMs: number,
  endUtcMs: number,
  locationTimezone: string,
): string {
  const start = formatShiftTime(startUtcMs, locationTimezone);
  const end = formatShiftTime(endUtcMs, locationTimezone);
  // Get short timezone abbreviation
  const tzAbbr = new Intl.DateTimeFormat("en-US", {
    timeZone: locationTimezone,
    timeZoneName: "short",
  })
    .formatToParts(new Date(startUtcMs))
    .find((p) => p.type === "timeZoneName")?.value;

  return `${start} – ${end}${tzAbbr ? ` ${tzAbbr}` : ""}`;
}

//Formats a date in the location's timezone.

export function formatShiftDate(
  utcMs: number,
  locationTimezone: string,
  fmt = "EEEE, MMMM d, yyyy",
): string {
  const zoned = toZonedTime(new Date(utcMs), locationTimezone);
  return format(zoned, fmt);
}
