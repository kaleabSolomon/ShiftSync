import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertManagerOfLocation, requireUserProfile } from "./helpers/auth";
import { validateAssignment } from "./helpers/constraints";

export const assignStaffToShift = mutation({
  args: {
    shiftId: v.id("shifts"),
    staffId: v.id("userProfiles"),
    overrideReason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    warnings: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      throw new ConvexError("Shift not found");
    }

    const caller = await assertManagerOfLocation(ctx, shift.locationId);

    const existingAssignment = await ctx.db
      .query("assignments")
      .withIndex("by_staffId_and_shiftId", (q) =>
        q.eq("staffId", args.staffId).eq("shiftId", args.shiftId),
      )
      .unique();

    if (existingAssignment) {
      return { success: true, warnings: [] }; // Idempotent
    }

    // Run constraint validation
    const validation = await validateAssignment(
      ctx,
      args.staffId,
      args.shiftId,
    );

    // Filter out the consecutive days error if an override was provided
    let filteredErrors = validation.errors;
    if (args.overrideReason) {
      filteredErrors = validation.errors.filter(
        (err) => !err.includes("consecutive days — override required"),
      );
    }

    if (filteredErrors.length > 0) {
      throw new ConvexError(`Assignment failed: ${filteredErrors[0]}`);
    }

    // Insert assignment
    const now = Date.now();
    await ctx.db.insert("assignments", {
      shiftId: args.shiftId,
      staffId: args.staffId,
      assignedBy: caller._id,
      assignedAt: now,
    });

    // Write audit log
    await ctx.db.insert("auditLog", {
      actorId: caller._id,
      action: "assign_staff",
      entityType: "shift",
      entityId: args.shiftId,
      afterState: {
        staffId: args.staffId,
        overrideReason: args.overrideReason,
      },
      timestamp: now,
    });

    // Notify staff
    await ctx.db.insert("notifications", {
      userId: args.staffId as any,
      type: "shift_assigned",
      message: "You have been assigned to a new shift.",
      isRead: false,
      createdAt: now + 1,
      relatedEntityId: args.shiftId,
    });

    return {
      success: true,
      warnings: validation.warnings,
    };
  },
});

export const unassignStaffFromShift = mutation({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new ConvexError("Assignment not found");
    }

    const shift = await ctx.db.get(assignment.shiftId);
    if (!shift) {
      throw new ConvexError("Shift not found");
    }

    const caller = await assertManagerOfLocation(ctx, shift.locationId);

    const now = Date.now();

    await ctx.db.delete(args.assignmentId);

    // Write audit log
    await ctx.db.insert("auditLog", {
      actorId: caller._id,
      action: "unassign_staff",
      entityType: "shift",
      entityId: shift._id,
      beforeState: { staffId: assignment.staffId },
      timestamp: now,
    });

    // Notify staff
    await ctx.db.insert("notifications", {
      userId: assignment.staffId as any,
      type: "shift_unassigned",
      message: "You have been unassigned from a shift.",
      isRead: false,
      createdAt: now + 1,
      relatedEntityId: shift._id,
    });

    return null;
  },
});

export const getShiftAssignments = query({
  args: {
    shiftId: v.id("shifts"),
  },
  handler: async (ctx, args) => {
    await requireUserProfile(ctx);

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_shiftId", (q) => q.eq("shiftId", args.shiftId))
      .collect();

    return Promise.all(
      assignments.map(async (assignment) => {
        const staff = await ctx.db.get(assignment.staffId);
        return {
          ...assignment,
          staff,
        };
      }),
    );
  },
});

export const getStaffSchedule = query({
  args: {
    staffId: v.id("userProfiles"),
    rangeStart: v.number(),
    rangeEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);

    // Staff can only view their own schedule, managers/admins can view any
    if (caller.role === "staff" && caller._id !== args.staffId) {
      throw new ConvexError("Staff can only view their own schedule");
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_staffId", (q) => q.eq("staffId", args.staffId))
      .collect();

    const shifts = await Promise.all(
      assignments.map(async (assignment) => {
        const shift = await ctx.db.get(assignment.shiftId);
        if (!shift) return null;
        if (
          shift.startTime < args.rangeStart ||
          shift.startTime > args.rangeEnd
        ) {
          return null;
        }

        const location = await ctx.db.get(shift.locationId);
        return {
          ...shift,
          location,
          assignmentId: assignment._id,
        };
      }),
    );

    // Filter out nulls and sort by start time
    return shifts
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.startTime - b.startTime);
  },
});
