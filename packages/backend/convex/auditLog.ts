import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { assertAdminOrManager, requireUserProfile } from "./helpers/auth";

export const writeAuditLog = internalMutation({
  args: {
    actorId: v.id("userProfiles"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    beforeState: v.optional(v.any()),
    afterState: v.optional(v.any()),
  },
  returns: v.id("auditLog"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLog", {
      actorId: args.actorId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      beforeState: args.beforeState,
      afterState: args.afterState,
      timestamp: Date.now(),
    });
  },
});

export const getShiftAuditLog = query({
  args: {
    shiftId: v.id("shifts"),
  },
  handler: async (ctx, args) => {
    await assertAdminOrManager(ctx);

    const entries = await ctx.db
      .query("auditLog")
      .withIndex("by_entityType_and_entityId", (q) =>
        q.eq("entityType", "shift").eq("entityId", args.shiftId),
      )
      .collect();

    // Enrich with actor names
    return Promise.all(
      entries
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(async (entry) => {
          const actor = await ctx.db.get(entry.actorId);
          return {
            ...entry,
            actorName: actor?.name ?? "Unknown",
          };
        }),
    );
  },
});

export const getLocationAuditLog = query({
  args: {
    locationId: v.id("locations"),
    rangeStart: v.number(),
    rangeEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);
    if (caller.role !== "admin") {
      throw new ConvexError("Only admins can view location audit logs");
    }

    // Get all shifts for this location
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
      .collect();

    const shiftIds = new Set(shifts.map((s) => s._id as string));

    // Get audit entries for these shifts within the date range
    const allEntries = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.rangeStart).lte("timestamp", args.rangeEnd),
      )
      .collect();

    const filtered = allEntries.filter(
      (e) => e.entityType === "shift" && shiftIds.has(e.entityId),
    );

    return Promise.all(
      filtered
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(async (entry) => {
          const actor = await ctx.db.get(entry.actorId);
          return {
            ...entry,
            actorName: actor?.name ?? "Unknown",
          };
        }),
    );
  },
});
