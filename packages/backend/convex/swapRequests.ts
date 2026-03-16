import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  assertAdminOrManager,
  assertManagerOfLocation,
  requireUserProfile,
} from "./helpers/auth";
import { validateAssignment } from "./helpers/constraints";

const MAX_PENDING_REQUESTS = 3;

export const requestSwap = mutation({
  args: {
    shiftId: v.id("shifts"),
    targetId: v.id("userProfiles"),
  },
  returns: v.id("swapRequests"),
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);
    if (caller.role !== "staff") {
      throw new ConvexError("Only staff can request swaps");
    }

    // Verify the requester is actually assigned to this shift
    const assignment = await ctx.db
      .query("assignments")
      .withIndex("by_staffId_and_shiftId", (q) =>
        q.eq("staffId", caller._id).eq("shiftId", args.shiftId),
      )
      .unique();

    if (!assignment) {
      throw new ConvexError("You are not assigned to this shift");
    }

    // Cannot swap with yourself
    if (args.targetId === caller._id) {
      throw new ConvexError("Cannot request a swap with yourself");
    }

    // Check pending request limit
    const pendingRequests = await ctx.db
      .query("swapRequests")
      .withIndex("by_requesterId_and_status", (q) =>
        q.eq("requesterId", caller._id).eq("status", "pending"),
      )
      .collect();

    if (pendingRequests.length >= MAX_PENDING_REQUESTS) {
      throw new ConvexError(
        `You can have at most ${MAX_PENDING_REQUESTS} pending swap requests`,
      );
    }

    // Verify target is a staff member
    const target = await ctx.db.get(args.targetId);
    if (!target || target.role !== "staff") {
      throw new ConvexError("Target must be a staff member");
    }

    // Verify target is qualified for the shift (skill + location cert)
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      throw new ConvexError("Shift not found");
    }

    if (!target.skills.includes(shift.requiredSkill as any)) {
      throw new ConvexError(
        `Target staff lacks required skill: ${shift.requiredSkill}`,
      );
    }

    if (!target.certifiedLocationIds.includes(shift.locationId)) {
      throw new ConvexError("Target staff is not certified for this location");
    }

    const now = Date.now();
    const swapId = await ctx.db.insert("swapRequests", {
      shiftId: args.shiftId,
      requesterId: caller._id,
      targetId: args.targetId,
      status: "pending",
      createdAt: now,
    });

    // Notify target staff
    await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
      userId: args.targetId,
      type: "swap_requested",
      message: `${caller.name} has requested to swap a shift with you.`,
      relatedEntityId: swapId,
    });

    return swapId;
  },
});

export const acceptSwap = mutation({
  args: {
    swapRequestId: v.id("swapRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);
    const swap = await ctx.db.get(args.swapRequestId);
    if (!swap) {
      throw new ConvexError("Swap request not found");
    }

    if (swap.targetId !== caller._id) {
      throw new ConvexError("Only the target staff can accept a swap request");
    }

    if (swap.status !== "pending") {
      throw new ConvexError("Only pending swap requests can be accepted");
    }

    await ctx.db.patch(args.swapRequestId, { status: "accepted" });

    // Find all managers for this shift's location and notify them
    const shift = await ctx.db.get(swap.shiftId);
    if (!shift) {
      throw new ConvexError("Associated shift not found");
    }

    const managerAssignments = await ctx.db
      .query("managerLocations")
      .withIndex("by_locationId", (q) => q.eq("locationId", shift.locationId))
      .collect();

    const now = Date.now();
    for (const ma of managerAssignments) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
        userId: ma.managerId,
        type: "swap_accepted",
        message: "A shift swap has been accepted and needs your approval.",
        relatedEntityId: args.swapRequestId,
      });
    }

    return null;
  },
});

export const approveSwap = mutation({
  args: {
    swapRequestId: v.id("swapRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const swap = await ctx.db.get(args.swapRequestId);
    if (!swap) {
      throw new ConvexError("Swap request not found");
    }

    if (swap.status !== "accepted") {
      throw new ConvexError(
        "Only accepted swap requests can be approved by a manager",
      );
    }

    const shift = await ctx.db.get(swap.shiftId);
    if (!shift) {
      throw new ConvexError("Associated shift not found");
    }

    const caller = await assertManagerOfLocation(ctx, shift.locationId);

    // Validate that the target staff can actually take this shift
    const validation = await validateAssignment(
      ctx,
      swap.targetId,
      swap.shiftId,
    );

    if (!validation.valid) {
      // Reject the swap with the constraint error
      await ctx.db.patch(args.swapRequestId, { status: "rejected" });

      await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
        userId: swap.requesterId,
        type: "swap_rejected",
        message: `Swap rejected: ${validation.errors[0]}`,
        relatedEntityId: args.swapRequestId,
      });

      throw new ConvexError(
        `Swap failed constraint validation: ${validation.errors[0]}`,
      );
    }

    const now = Date.now();

    // Remove requester's assignment
    const requesterAssignment = await ctx.db
      .query("assignments")
      .withIndex("by_staffId_and_shiftId", (q) =>
        q.eq("staffId", swap.requesterId).eq("shiftId", swap.shiftId),
      )
      .unique();

    if (requesterAssignment) {
      await ctx.db.delete(requesterAssignment._id);
    }

    // Assign target staff
    await ctx.db.insert("assignments", {
      shiftId: swap.shiftId,
      staffId: swap.targetId,
      assignedBy: caller._id,
      assignedAt: now,
    });

    // Update swap request
    await ctx.db.patch(args.swapRequestId, {
      status: "approved",
      managerId: caller._id,
    });

    // Write audit log
    await ctx.scheduler.runAfter(0, internal.auditLog.writeAuditLog, {
      actorId: caller._id,
      action: "approve_swap",
      entityType: "shift",
      entityId: shift._id,
      beforeState: { staffId: swap.requesterId },
      afterState: { staffId: swap.targetId },
    });

    // Notify both staff
    await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
      userId: swap.requesterId,
      type: "swap_approved",
      message: "Your shift swap request has been approved.",
      relatedEntityId: args.swapRequestId,
    });
    await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
      userId: swap.targetId,
      type: "swap_approved",
      message:
        "A shift swap you accepted has been approved. You are now assigned.",
      relatedEntityId: args.swapRequestId,
    });

    return null;
  },
});

export const rejectSwap = mutation({
  args: {
    swapRequestId: v.id("swapRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);
    const swap = await ctx.db.get(args.swapRequestId);
    if (!swap) {
      throw new ConvexError("Swap request not found");
    }

    // Target staff can reject a pending request, manager can reject an accepted request
    if (swap.status === "pending" && swap.targetId === caller._id) {
      // Target staff rejecting
    } else if (swap.status === "accepted") {
      const shift = await ctx.db.get(swap.shiftId);
      if (!shift) throw new ConvexError("Associated shift not found");
      await assertManagerOfLocation(ctx, shift.locationId);
    } else {
      throw new ConvexError(
        "You do not have permission to reject this swap request",
      );
    }

    await ctx.db.patch(args.swapRequestId, { status: "rejected" });

    await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
      userId: swap.requesterId,
      type: "swap_rejected",
      message: "Your shift swap request has been rejected.",
      relatedEntityId: args.swapRequestId,
    });

    return null;
  },
});

export const listSwapRequests = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);

    if (caller.role === "staff") {
      // Staff sees their own requests (as requester or target)
      const asRequester = await ctx.db
        .query("swapRequests")
        .withIndex("by_requesterId", (q) => q.eq("requesterId", caller._id))
        .collect();

      const asTarget = await ctx.db
        .query("swapRequests")
        .withIndex("by_targetId", (q) => q.eq("targetId", caller._id))
        .collect();

      let all = [...asRequester, ...asTarget];

      // Deduplicate (in case both indexes return the same doc — shouldn't happen but safe)
      const seen = new Set<string>();
      all = all.filter((r) => {
        if (seen.has(r._id)) return false;
        seen.add(r._id);
        return true;
      });

      if (args.status) {
        all = all.filter((r) => r.status === args.status);
      }

      return all.sort((a, b) => b.createdAt - a.createdAt);
    }

    // Manager/admin sees swap requests for their locations
    await assertAdminOrManager(ctx);

    let swaps = args.status
      ? await ctx.db
          .query("swapRequests")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("swapRequests").collect();

    // For managers, filter to only their managed locations
    if (caller.role === "manager") {
      const managedLocations = await ctx.db
        .query("managerLocations")
        .withIndex("by_managerId", (q) => q.eq("managerId", caller._id))
        .collect();
      const managedLocationIds = new Set(
        managedLocations.map((ml) => ml.locationId),
      );

      const filtered = [];
      for (const swap of swaps) {
        const shift = await ctx.db.get(swap.shiftId);
        if (!shift) continue;
        if (managedLocationIds.has(shift.locationId)) {
          filtered.push(swap);
        }
      }
      swaps = filtered;
    }

    return swaps.sort((a, b) => b.createdAt - a.createdAt);
  },
});
