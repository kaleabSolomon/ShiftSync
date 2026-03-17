import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { assertAdminOrManager, requireUserProfile } from "./helpers/auth";

function parseTimeToMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

function getZonedParts(utcMs: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(new Date(utcMs));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const weekday = get("weekday") ?? "Sun";

  return {
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    minutes: hour * 60 + minute,
    dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      weekday,
    ),
  };
}

export async function isStaffAvailableForShift(
  ctx: QueryCtx | MutationCtx,
  staffId: Id<"userProfiles">,
  shiftStart: number,
  shiftEnd: number,
  staffTimezone: string,
  _locationTimezone: string,
) {
  if (shiftEnd <= shiftStart) return false;

  const startParts = getZonedParts(shiftStart, staffTimezone);
  const endParts = getZonedParts(shiftEnd, staffTimezone);

  // To properly handle midnight boundaries, we convert end minutes to 24 * 60 if it's 00:00 of the next day
  let endMinutes = endParts.minutes;
  let endDayKey = endParts.dateKey;
  let endDayOfWeek = endParts.dayOfWeek;

  if (startParts.dateKey !== endParts.dateKey && endParts.minutes === 0) {
    // The shift ends exactly at midnight the next day.
    endMinutes = 24 * 60;
    endDayKey = startParts.dateKey;
    endDayOfWeek = startParts.dayOfWeek;
  }

  // Find all availability slots for the staff member
  const allAvailability = await ctx.db
    .query("availability")
    .withIndex("by_staffId", (q) => q.eq("staffId", staffId))
    .collect();

  // If the staff has no availability preferences set, treat them as fully available
  if (allAvailability.length === 0) return true;

  // Helper to check if a specific time range (in minutes of a specific day) is covered
  const isRangeCovered = (
    dayOfWeek: number,
    rangeStart: number,
    rangeEnd: number,
  ) => {
    // Treat "midnight end" slots as ending at 24:00 (1440 minutes)
    return allAvailability.some((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return false;

      const slotStart = parseTimeToMinutes(slot.startTime);
      let slotEnd = parseTimeToMinutes(slot.endTime);

      if (slotStart === null || slotEnd === null) return false;
      if (slot.endTime === "00:00" || slot.endTime === "24:00")
        slotEnd = 24 * 60;

      return rangeStart >= slotStart && rangeEnd <= slotEnd;
    });
  };

  if (startParts.dateKey === endDayKey) {
    // Single day shift
    return isRangeCovered(startParts.dayOfWeek, startParts.minutes, endMinutes);
  } else {
    // Shift crosses midnight and goes into the next day
    // We need to check if they are available from start...24:00 on startDay
    // AND from 00:00...end on endDay

    // (Note: this simple implementation assumes shifts don't span more than 2 days, e.g. > 24 hours)
    const validStartDay = isRangeCovered(
      startParts.dayOfWeek,
      startParts.minutes,
      24 * 60,
    );
    const validEndDay = isRangeCovered(endParts.dayOfWeek, 0, endParts.minutes);

    return validStartDay && validEndDay;
  }
}

export const setAvailability = mutation({
  args: {
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
  },
  returns: v.id("availability"),
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);
    if (caller.role !== "staff") {
      throw new ConvexError("Only staff can set availability");
    }

    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new ConvexError("dayOfWeek must be between 0 and 6");
    }

    const start = parseTimeToMinutes(args.startTime);
    const end = parseTimeToMinutes(args.endTime);

    if (start === null || end === null) {
      throw new ConvexError("Time must be in HH:MM format");
    }
    if (start >= end) {
      throw new ConvexError("startTime must be before endTime");
    }

    const existing = await ctx.db
      .query("availability")
      .withIndex("by_staffId_and_day", (q) =>
        q.eq("staffId", caller._id).eq("dayOfWeek", args.dayOfWeek),
      )
      .collect();

    for (const slot of existing) {
      await ctx.db.delete(slot._id);
    }

    return await ctx.db.insert("availability", {
      staffId: caller._id,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
    });
  },
});

export const getAvailability = query({
  args: {
    staffId: v.optional(v.id("userProfiles")),
  },
  returns: v.array(
    v.object({
      _id: v.id("availability"),
      _creationTime: v.number(),
      staffId: v.id("userProfiles"),
      dayOfWeek: v.number(),
      startTime: v.string(),
      endTime: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);
    const staffId = args.staffId ?? caller._id;

    if (caller.role === "staff" && staffId !== caller._id) {
      throw new ConvexError("Staff can only view their own availability");
    }

    if (caller.role !== "staff") {
      await assertAdminOrManager(ctx);
    }

    return await ctx.db
      .query("availability")
      .withIndex("by_staffId", (q) => q.eq("staffId", staffId))
      .collect();
  },
});
