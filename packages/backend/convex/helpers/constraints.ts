import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isStaffAvailableForShift } from "../availability";

//  Types

type Ctx = QueryCtx | MutationCtx;

interface ConstraintResult {
  ok: boolean;
  message?: string;
  isWarning?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

//  Helpers

/** Get all shifts a staff member is currently assigned to. */
async function getAssignedShifts(ctx: Ctx, staffId: Id<"userProfiles">) {
  const assignments = await ctx.db
    .query("assignments")
    .withIndex("by_staffId", (q) => q.eq("staffId", staffId))
    .collect();

  const shifts = await Promise.all(
    assignments.map((a) => ctx.db.get(a.shiftId)),
  );

  return shifts.filter((s) => s !== null);
}

/** Convert UTC ms to a date key and day-of-week in the given timezone. */
function getZonedDate(utcMs: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(new Date(utcMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
}

/** Get the start-of-week (Monday 00:00 UTC) for a given UTC ms timestamp. */
function getWeekStartUtc(utcMs: number): number {
  const d = new Date(utcMs);
  const dayOfWeek = d.getUTCDay(); // 0=Sun
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // shift so Monday=0
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.getTime();
}

function shiftDurationHours(startMs: number, endMs: number): number {
  return (endMs - startMs) / (1000 * 60 * 60);
}

function timeRangesOverlap(
  s1: number,
  e1: number,
  s2: number,
  e2: number,
): boolean {
  return s1 < e2 && s2 < e1;
}

export async function checkDoubleBooking(
  ctx: Ctx,
  staffId: Id<"userProfiles">,
  newStart: number,
  newEnd: number,
): Promise<ConstraintResult> {
  const shifts = await getAssignedShifts(ctx, staffId);

  for (const shift of shifts) {
    if (timeRangesOverlap(newStart, newEnd, shift.startTime, shift.endTime)) {
      return {
        ok: false,
        message: `Double booking: overlaps with shift ${shift._id} (${new Date(shift.startTime).toISOString()} – ${new Date(shift.endTime).toISOString()})`,
      };
    }
  }
  return { ok: true };
}

export async function checkMinRestPeriod(
  ctx: Ctx,
  staffId: Id<"userProfiles">,
  newStart: number,
  newEnd: number,
): Promise<ConstraintResult> {
  const MIN_REST_MS = 10 * 60 * 60 * 1000; // 10 hours
  const shifts = await getAssignedShifts(ctx, staffId);

  for (const shift of shifts) {
    // Check gap between this shift's end and new shift's start
    if (shift.endTime <= newStart) {
      const gap = newStart - shift.endTime;
      if (gap < MIN_REST_MS) {
        const gapHours = (gap / (1000 * 60 * 60)).toFixed(1);
        return {
          ok: false,
          message: `Insufficient rest: only ${gapHours}h gap before this shift (minimum 10h required)`,
        };
      }
    }
    // Check gap between new shift's end and this shift's start
    if (newEnd <= shift.startTime) {
      const gap = shift.startTime - newEnd;
      if (gap < MIN_REST_MS) {
        const gapHours = (gap / (1000 * 60 * 60)).toFixed(1);
        return {
          ok: false,
          message: `Insufficient rest: only ${gapHours}h gap after this shift (minimum 10h required)`,
        };
      }
    }
  }
  return { ok: true };
}

export async function checkSkillMatch(
  ctx: Ctx,
  staffId: Id<"userProfiles">,
  requiredSkill: string,
): Promise<ConstraintResult> {
  const profile = await ctx.db.get(staffId);
  if (!profile) return { ok: false, message: "Staff profile not found" };

  if (!profile.skills.includes(requiredSkill as any)) {
    return {
      ok: false,
      message: `Staff lacks required skill: ${requiredSkill}`,
    };
  }
  return { ok: true };
}

export async function checkLocationCertification(
  ctx: Ctx,
  staffId: Id<"userProfiles">,
  locationId: Id<"locations">,
): Promise<ConstraintResult> {
  const profile = await ctx.db.get(staffId);
  if (!profile) return { ok: false, message: "Staff profile not found" };

  if (!profile.certifiedLocationIds.includes(locationId)) {
    return {
      ok: false,
      message: "Staff is not certified for this location",
    };
  }
  return { ok: true };
}

export async function checkAvailabilityWindow(
  ctx: Ctx,
  staffId: Id<"userProfiles">,
  shiftStart: number,
  shiftEnd: number,
): Promise<ConstraintResult> {
  const profile = await ctx.db.get(staffId);
  if (!profile) return { ok: false, message: "Staff profile not found" };

  const shift = { startTime: shiftStart, endTime: shiftEnd };

  const available = await isStaffAvailableForShift(
    ctx,
    staffId,
    shift.startTime,
    shift.endTime,
    profile.homeTimezone,
    profile.homeTimezone,
  );

  if (!available) {
    return {
      ok: false,
      message: "Shift falls outside staff's availability window",
    };
  }
  return { ok: true };
}

export async function checkDailyHours(
  ctx: Ctx,
  staffId: Id<"userProfiles">,
  newStart: number,
  newEnd: number,
  staffTimezone: string,
): Promise<ConstraintResult> {
  const newShiftDate = getZonedDate(newStart, staffTimezone);
  const newHours = shiftDurationHours(newStart, newEnd);

  const shifts = await getAssignedShifts(ctx, staffId);
  let totalHours = newHours;

  for (const shift of shifts) {
    const shiftDate = getZonedDate(shift.startTime, staffTimezone);
    if (shiftDate.dateKey === newShiftDate.dateKey) {
      totalHours += shiftDurationHours(shift.startTime, shift.endTime);
    }
  }

  if (totalHours > 12) {
    return {
      ok: false,
      message: `Daily hours would be ${totalHours.toFixed(1)}h (max 12h)`,
    };
  }
  if (totalHours > 8) {
    return {
      ok: true,
      isWarning: true,
      message: `Daily hours would be ${totalHours.toFixed(1)}h (recommended max 8h)`,
    };
  }
  return { ok: true };
}

export async function checkWeeklyHours(
  ctx: Ctx,
  staffId: Id<"userProfiles">,
  newStart: number,
  newEnd: number,
): Promise<ConstraintResult> {
  const weekStart = getWeekStartUtc(newStart);
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
  const newHours = shiftDurationHours(newStart, newEnd);

  const shifts = await getAssignedShifts(ctx, staffId);
  let totalHours = newHours;

  for (const shift of shifts) {
    // Include shifts that overlap with this week
    if (shift.startTime < weekEnd && shift.endTime > weekStart) {
      // Clamp to week boundaries for partial overlaps
      const effectiveStart = Math.max(shift.startTime, weekStart);
      const effectiveEnd = Math.min(shift.endTime, weekEnd);
      totalHours += shiftDurationHours(effectiveStart, effectiveEnd);
    }
  }

  if (totalHours > 40) {
    return {
      ok: false,
      message: `Weekly hours would be ${totalHours.toFixed(1)}h — overtime blocked (max 40h)`,
    };
  }
  if (totalHours > 35) {
    return {
      ok: true,
      isWarning: true,
      message: `Weekly hours would be ${totalHours.toFixed(1)}h — approaching overtime (threshold 35h)`,
    };
  }
  return { ok: true };
}

export async function checkConsecutiveDays(
  ctx: Ctx,
  staffId: Id<"userProfiles">,
  newStart: number,
  staffTimezone: string,
): Promise<ConstraintResult> {
  const shifts = await getAssignedShifts(ctx, staffId);

  // Collect all unique worked dates (as epoch days for easy math)
  const workedEpochDays = new Set<number>();

  for (const shift of shifts) {
    const d = getZonedDate(shift.startTime, staffTimezone);
    const epochDay = Math.floor(
      new Date(`${d.dateKey}T00:00:00Z`).getTime() / (1000 * 60 * 60 * 24),
    );
    workedEpochDays.add(epochDay);
  }

  // Add the new shift's date
  const newDate = getZonedDate(newStart, staffTimezone);
  const newEpochDay = Math.floor(
    new Date(`${newDate.dateKey}T00:00:00Z`).getTime() / (1000 * 60 * 60 * 24),
  );
  workedEpochDays.add(newEpochDay);

  // Find the longest consecutive streak that includes the new day
  const sortedDays = [...workedEpochDays].sort((a, b) => a - b);
  let maxConsecutiveIncludingNew = 1;
  let currentStreak = 1;
  let streakIncludesNew = sortedDays[0] === newEpochDay;

  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === sortedDays[i - 1] + 1) {
      currentStreak++;
      if (sortedDays[i] === newEpochDay) streakIncludesNew = true;
    } else {
      if (streakIncludesNew) {
        maxConsecutiveIncludingNew = Math.max(
          maxConsecutiveIncludingNew,
          currentStreak,
        );
      }
      currentStreak = 1;
      streakIncludesNew = sortedDays[i] === newEpochDay;
    }
  }
  if (streakIncludesNew) {
    maxConsecutiveIncludingNew = Math.max(
      maxConsecutiveIncludingNew,
      currentStreak,
    );
  }

  if (maxConsecutiveIncludingNew >= 7) {
    return {
      ok: false,
      message: `${maxConsecutiveIncludingNew} consecutive days — override required (max 6 without override)`,
    };
  }
  if (maxConsecutiveIncludingNew >= 6) {
    return {
      ok: true,
      isWarning: true,
      message: `${maxConsecutiveIncludingNew} consecutive days worked — approaching limit`,
    };
  }
  return { ok: true };
}

// ─── Composite Validator ─────────────────────────────────────────────────────

export async function validateAssignment(
  ctx: Ctx,
  staffId: Id<"userProfiles">,
  shiftId: Id<"shifts">,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const shift = await ctx.db.get(shiftId);
  if (!shift) {
    return { valid: false, errors: ["Shift not found"], warnings: [] };
  }

  const profile = await ctx.db.get(staffId);
  if (!profile) {
    return { valid: false, errors: ["Staff profile not found"], warnings: [] };
  }

  const location = await ctx.db.get(shift.locationId);
  if (!location) {
    return { valid: false, errors: ["Location not found"], warnings: [] };
  }

  // Run all checks in parallel
  const results = await Promise.all([
    checkDoubleBooking(ctx, staffId, shift.startTime, shift.endTime),
    checkMinRestPeriod(ctx, staffId, shift.startTime, shift.endTime),
    checkSkillMatch(ctx, staffId, shift.requiredSkill),
    checkLocationCertification(ctx, staffId, shift.locationId),
    checkAvailabilityWindow(ctx, staffId, shift.startTime, shift.endTime),
    checkDailyHours(
      ctx,
      staffId,
      shift.startTime,
      shift.endTime,
      profile.homeTimezone,
    ),
    checkWeeklyHours(ctx, staffId, shift.startTime, shift.endTime),
    checkConsecutiveDays(ctx, staffId, shift.startTime, profile.homeTimezone),
  ]);

  for (const result of results) {
    if (!result.ok && result.message) {
      errors.push(result.message);
    } else if (result.isWarning && result.message) {
      warnings.push(result.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
