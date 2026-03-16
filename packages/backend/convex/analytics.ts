import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { assertAdminOrManager, requireUserProfile } from "./helpers/auth";
import type { Id } from "./_generated/dataModel";

export const getPremiumShiftReport = query({
  args: {
    locationId: v.id("locations"),
    weekStart: v.number(), // UTC ms
    weekEnd: v.number(), // UTC ms
  },
  handler: async (ctx, args) => {
    await assertAdminOrManager(ctx);

    // Get all published shifts in range at this location
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
      .collect();

    const premiumShifts = shifts.filter(
      (s) =>
        s.isPremium &&
        s.startTime >= args.weekStart &&
        s.startTime <= args.weekEnd,
    );

    // Count premium shifts per staff member
    const staffCounts = new Map<string, number>();

    for (const shift of premiumShifts) {
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_shiftId", (q) => q.eq("shiftId", shift._id))
        .collect();

      for (const a of assignments) {
        staffCounts.set(a.staffId, (staffCounts.get(a.staffId) ?? 0) + 1);
      }
    }

    // Enrich with staff names
    const report = await Promise.all(
      Array.from(staffCounts.entries()).map(async ([staffId, count]) => {
        const profile = await ctx.db.get(staffId as Id<"userProfiles">);
        return {
          staffId,
          staffName: profile?.name ?? "Unknown",
          premiumShiftCount: count,
        };
      }),
    );

    return report.sort((a, b) => b.premiumShiftCount - a.premiumShiftCount);
  },
});

export const getWeeklyHoursSummary = query({
  args: {
    locationId: v.id("locations"),
    weekStart: v.number(), // UTC ms (Monday 00:00)
  },
  handler: async (ctx, args) => {
    await assertAdminOrManager(ctx);

    const weekEnd = args.weekStart + 7 * 24 * 60 * 60 * 1000;

    // Get all shifts for this location in the week
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
      .collect();

    const weekShifts = shifts.filter(
      (s) => s.startTime >= args.weekStart && s.startTime < weekEnd,
    );

    // Aggregate hours per staff
    const staffHours = new Map<string, number>();

    for (const shift of weekShifts) {
      const durationHours =
        (shift.endTime - shift.startTime) / (1000 * 60 * 60);

      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_shiftId", (q) => q.eq("shiftId", shift._id))
        .collect();

      for (const a of assignments) {
        staffHours.set(
          a.staffId,
          (staffHours.get(a.staffId) ?? 0) + durationHours,
        );
      }
    }

    // Enrich with staff names and overtime flags
    const summary = await Promise.all(
      Array.from(staffHours.entries()).map(async ([staffId, totalHours]) => {
        const profile = await ctx.db.get(staffId as Id<"userProfiles">);
        return {
          staffId,
          staffName: profile?.name ?? "Unknown",
          totalHours: Math.round(totalHours * 100) / 100,
          overtimeWarning: totalHours > 35,
          overtimeBlocked: totalHours > 40,
        };
      }),
    );

    return summary.sort((a, b) => b.totalHours - a.totalHours);
  },
});

export const getStaffWeeklyHours = query({
  args: {
    staffId: v.id("userProfiles"),
    weekStart: v.number(), // UTC ms
  },
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);

    // Staff can view their own, managers/admins can view any
    if (caller.role === "staff" && caller._id !== args.staffId) {
      throw new ConvexError("Staff can only view their own hours");
    }

    const weekEnd = args.weekStart + 7 * 24 * 60 * 60 * 1000;

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .collect();

    let totalHours = 0;
    const shiftDetails = [];

    for (const assignment of assignments) {
      const shift = await ctx.db.get(assignment.shiftId);
      if (!shift) continue;
      if (shift.startTime < args.weekStart || shift.startTime >= weekEnd)
        continue;

      const durationHours =
        (shift.endTime - shift.startTime) / (1000 * 60 * 60);
      totalHours += durationHours;

      const location = await ctx.db.get(shift.locationId);
      shiftDetails.push({
        shiftId: shift._id,
        locationName: location?.name ?? "Unknown",
        startTime: shift.startTime,
        endTime: shift.endTime,
        durationHours: Math.round(durationHours * 100) / 100,
        isPremium: shift.isPremium,
      });
    }

    return {
      staffId: args.staffId,
      weekStart: args.weekStart,
      totalHours: Math.round(totalHours * 100) / 100,
      overtimeWarning: totalHours > 35,
      overtimeBlocked: totalHours > 40,
      shifts: shiftDetails.sort((a, b) => a.startTime - b.startTime),
    };
  },
});
