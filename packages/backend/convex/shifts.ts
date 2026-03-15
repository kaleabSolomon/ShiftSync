import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  assertAdminOrManager,
  assertManagerOfLocation,
  requireUserProfile,
} from "./helpers/auth";
import { validateAssignment } from "./helpers/constraints";

const skillValidator = v.union(
  v.literal("bartender"),
  v.literal("server"),
  v.literal("host"),
  v.literal("line_cook"),
);

const shiftStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
);

// Helper to determine if a shift is "premium"
// A premium shift starts after 17:00 (5:00 PM) local time on a Friday or Saturday.
function isPremiumShift(startTimeMs: number, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    weekday: "short",
    hour: "numeric",
  });
  const parts = formatter.formatToParts(new Date(startTimeMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const weekday = get("weekday");
  const hour = Number(get("hour"));

  return (weekday === "Fri" || weekday === "Sat") && hour >= 17;
}

export const createShift = mutation({
  args: {
    locationId: v.id("locations"),
    startTime: v.number(), // UTC ms
    endTime: v.number(), // UTC ms
    requiredSkill: skillValidator,
    headcount: v.number(),
  },
  returns: v.id("shifts"),
  handler: async (ctx, args) => {
    const caller = await assertManagerOfLocation(ctx, args.locationId);

    if (args.startTime >= args.endTime) {
      throw new ConvexError("Start time must be before end time");
    }
    if (args.headcount <= 0) {
      throw new ConvexError("Headcount must be greater than zero");
    }

    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new ConvexError("Location not found");
    }

    const isPremium = isPremiumShift(args.startTime, location.timezone);

    return await ctx.db.insert("shifts", {
      locationId: args.locationId,
      startTime: args.startTime,
      endTime: args.endTime,
      requiredSkill: args.requiredSkill,
      headcount: args.headcount,
      status: "draft",
      isPremium,
      createdBy: caller._id,
    });
  },
});

export const updateShift = mutation({
  args: {
    shiftId: v.id("shifts"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    requiredSkill: v.optional(skillValidator),
    headcount: v.optional(v.number()),
  },
  returns: v.id("shifts"),
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      throw new ConvexError("Shift not found");
    }

    await assertManagerOfLocation(ctx, shift.locationId);

    if (shift.status !== "draft") {
      throw new ConvexError("Only draft shifts can be updated");
    }

    const patch: Record<string, unknown> = {};
    if (args.requiredSkill !== undefined)
      patch.requiredSkill = args.requiredSkill;
    if (args.headcount !== undefined) {
      if (args.headcount <= 0) {
        throw new ConvexError("Headcount must be greater than zero");
      }
      patch.headcount = args.headcount;
    }

    const newStart = args.startTime ?? shift.startTime;
    const newEnd = args.endTime ?? shift.endTime;

    if (newStart >= newEnd) {
      throw new ConvexError("Start time must be before end time");
    }

    if (args.startTime !== undefined || args.endTime !== undefined) {
      patch.startTime = newStart;
      patch.endTime = newEnd;

      const location = (await ctx.db.get(shift.locationId))!;
      patch.isPremium = isPremiumShift(newStart, location.timezone);
    }

    // Cancel any pending swap requests for this shift since it was updated
    const pendingSwaps = await ctx.db
      .query("swapRequests")
      .withIndex("by_shiftId", (q) => q.eq("shiftId", shift._id))
      .collect();

    for (const swap of pendingSwaps) {
      if (swap.status === "pending") {
        await ctx.db.patch(swap._id, { status: "cancelled" });

        // Notify both users
        const now = Date.now();
        await ctx.db.insert("notifications", {
          userId: swap.requesterId,
          type: "swap_cancelled",
          message:
            "Your swap request was cancelled because the shift details changed.",
          isRead: false,
          createdAt: now,
          relatedEntityId: swap._id,
        });
        await ctx.db.insert("notifications", {
          userId: swap.targetId,
          type: "swap_cancelled",
          message:
            "A swap request assigned to you was cancelled because the shift details changed.",
          isRead: false,
          createdAt: now + 1,
          relatedEntityId: swap._id,
        });
      }
    }

    await ctx.db.patch(args.shiftId, patch);
    return args.shiftId;
  },
});

export const deleteShift = mutation({
  args: {
    shiftId: v.id("shifts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      throw new ConvexError("Shift not found");
    }

    await assertManagerOfLocation(ctx, shift.locationId);

    if (shift.status !== "draft") {
      throw new ConvexError("Only draft shifts can be deleted");
    }

    // Cascade delete assignments
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_shiftId", (q) => q.eq("shiftId", shift._id))
      .collect();
    for (const a of assignments) {
      await ctx.db.delete(a._id);
    }

    // Cascade delete swap requests
    const swaps = await ctx.db
      .query("swapRequests")
      .withIndex("by_shiftId", (q) => q.eq("shiftId", shift._id))
      .collect();
    for (const s of swaps) {
      await ctx.db.delete(s._id);
    }

    await ctx.db.delete(args.shiftId);
    return null;
  },
});

export const publishSchedule = mutation({
  args: {
    locationId: v.id("locations"),
    rangeStart: v.number(),
    rangeEnd: v.number(),
  },
  handler: async (ctx, args) => {
    await assertManagerOfLocation(ctx, args.locationId);

    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_locationId_and_status", (q) =>
        q.eq("locationId", args.locationId).eq("status", "draft"),
      )
      .collect();

    let publishedCount = 0;
    const notifiedStaffIds = new Set<string>();
    const now = Date.now();

    for (const shift of shifts) {
      if (
        shift.startTime >= args.rangeStart &&
        shift.startTime <= args.rangeEnd
      ) {
        await ctx.db.patch(shift._id, { status: "published" });
        publishedCount++;

        const assignments = await ctx.db
          .query("assignments")
          .withIndex("by_shiftId", (q) => q.eq("shiftId", shift._id))
          .collect();

        for (const assignment of assignments) {
          notifiedStaffIds.add(assignment.staffId);
        }
      }
    }

    // Send exactly one notification per staff member affected
    for (const staffId of notifiedStaffIds) {
      await ctx.db.insert("notifications", {
        userId: staffId as any,
        type: "schedule_published",
        message: "A new schedule for your location has been published.",
        isRead: false,
        createdAt: now,
      });
    }

    return publishedCount;
  },
});

export const listShifts = query({
  args: {
    locationId: v.id("locations"),
    rangeStart: v.number(),
    rangeEnd: v.number(),
    status: v.optional(shiftStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireUserProfile(ctx); // Any authed user

    let queryObj = ctx.db
      .query("shifts")
      .withIndex("by_locationId_and_startTime", (q) =>
        q
          .eq("locationId", args.locationId)
          .gte("startTime", args.rangeStart)
          .lte("startTime", args.rangeEnd),
      );

    const shifts = await queryObj.collect();

    // Filter status in-memory if requested since we used the composite index for time
    if (args.status) {
      return shifts.filter((s) => s.status === args.status);
    }
    return shifts;
  },
});

export const getShift = query({
  args: {
    shiftId: v.id("shifts"),
  },
  handler: async (ctx, args) => {
    await requireUserProfile(ctx); // Any authed user

    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      throw new ConvexError("Shift not found");
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_shiftId", (q) => q.eq("shiftId", shift._id))
      .collect();

    const assignmentsWithStaff = await Promise.all(
      assignments.map(async (assignment) => {
        const staff = await ctx.db.get(assignment.staffId);
        return {
          ...assignment,
          staff,
        };
      }),
    );

    return {
      ...shift,
      assignments: assignmentsWithStaff,
    };
  },
});

export const suggestAlternatives = query({
  args: {
    shiftId: v.id("shifts"),
  },
  handler: async (ctx, args) => {
    await assertAdminOrManager(ctx);

    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      throw new ConvexError("Shift not found");
    }

    // Get all staff members
    const allStaff = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "staff"))
      .collect();

    const eligible: Array<{
      staffId: string;
      name: string;
      warnings: string[];
    }> = [];

    for (const staff of allStaff) {
      const result = await validateAssignment(ctx, staff._id, args.shiftId);
      if (result.valid) {
        eligible.push({
          staffId: staff._id,
          name: staff.name,
          warnings: result.warnings,
        });
      }
    }

    // Sort by fewest warnings first
    eligible.sort((a, b) => a.warnings.length - b.warnings.length);

    return eligible;
  },
});
