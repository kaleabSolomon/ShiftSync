import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertAdmin, assertAdminOrManager } from "./helpers/auth";

function isValidIanaTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const createLocation = mutation({
  args: {
    name: v.string(),
    timezone: v.string(),
    address: v.string(),
  },
  returns: v.id("locations"),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const name = args.name.trim();
    const address = args.address.trim();
    const timezone = args.timezone.trim();

    if (!name) {
      throw new ConvexError("Location name is required");
    }
    if (!address) {
      throw new ConvexError("Location address is required");
    }
    if (!isValidIanaTimezone(timezone)) {
      throw new ConvexError("Invalid IANA timezone");
    }

    return await ctx.db.insert("locations", {
      name,
      timezone,
      address,
    });
  },
});

export const listLocations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("locations"),
      _creationTime: v.number(),
      name: v.string(),
      timezone: v.string(),
      address: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const caller = await assertAdminOrManager(ctx);

    if (caller.role === "admin") {
      return await ctx.db.query("locations").collect();
    }

    const assignments = await ctx.db
      .query("managerLocations")
      .withIndex("by_managerId", (q) => q.eq("managerId", caller._id))
      .collect();

    const locations = await Promise.all(
      assignments.map((assignment) => ctx.db.get(assignment.locationId)),
    );

    return locations.filter((location) => location !== null);
  },
});

export const assignManagerToLocation = mutation({
  args: {
    managerId: v.id("userProfiles"),
    locationId: v.id("locations"),
  },
  returns: v.id("managerLocations"),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const manager = await ctx.db.get(args.managerId);
    if (!manager) {
      throw new ConvexError("Manager profile not found");
    }
    if (manager.role !== "manager") {
      throw new ConvexError("User is not a manager");
    }

    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new ConvexError("Location not found");
    }

    const existing = await ctx.db
      .query("managerLocations")
      .withIndex("by_managerId", (q) => q.eq("managerId", args.managerId))
      .collect();

    const alreadyAssigned = existing.find(
      (assignment) => assignment.locationId === args.locationId,
    );
    if (alreadyAssigned) {
      return alreadyAssigned._id;
    }

    return await ctx.db.insert("managerLocations", {
      managerId: args.managerId,
      locationId: args.locationId,
    });
  },
});

export const getManagerLocations = query({
  args: {
    managerId: v.optional(v.id("userProfiles")),
  },
  returns: v.array(
    v.object({
      _id: v.id("locations"),
      _creationTime: v.number(),
      name: v.string(),
      timezone: v.string(),
      address: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const caller = await assertAdminOrManager(ctx);

    if (caller.role === "manager") {
      if (args.managerId && args.managerId !== caller._id) {
        throw new ConvexError("Managers can only access their own locations");
      }
    }

    const managerId = args.managerId ?? caller._id;
    const assignments = await ctx.db
      .query("managerLocations")
      .withIndex("by_managerId", (q) => q.eq("managerId", managerId))
      .collect();

    const locations = await Promise.all(
      assignments.map((assignment) => ctx.db.get(assignment.locationId)),
    );

    return locations.filter((location) => location !== null);
  },
});
