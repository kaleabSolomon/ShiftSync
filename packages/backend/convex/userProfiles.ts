import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import {
  assertAdmin,
  assertAdminOrManager,
  getCurrentUserProfile,
  requireUserProfile,
} from "./helpers/auth";

const skillValidator = v.union(
  v.literal("bartender"),
  v.literal("server"),
  v.literal("host"),
  v.literal("line_cook"),
);

function isValidIanaTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

// Ensures a userProfile exists for the authenticated user.
// Reads the name from Better Auth's user record — no frontend args needed.
// Safe to call multiple times (idempotent).
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError("Not authenticated");
    }

    // Check if profile already exists
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) =>
        q.eq("authUserId", String(authUser._id)),
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    // Create profile using name from Better Auth user record
    const fallbackName =
      typeof authUser.name === "string" && authUser.name.trim().length > 0
        ? authUser.name
        : (authUser.email ?? "User");

    const profileId = await ctx.db.insert("userProfiles", {
      authUserId: String(authUser._id),
      name: fallbackName,
      role: "staff",
      homeTimezone: "America/New_York",
      skills: [],
      certifiedLocationIds: [],
    });

    return profileId;
  },
});

// Get the currently authenticated user's profile
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserProfile(ctx);
  },
});

// Get a user profile by ID (admin/manager access, or self)
export const getProfile = query({
  args: { profileId: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);
    // Staff can only view their own profile
    if (
      caller.role !== "admin" &&
      caller.role !== "manager" &&
      caller._id !== args.profileId
    ) {
      throw new ConvexError("Insufficient permissions");
    }
    return await ctx.db.get(args.profileId);
  },
});

// Get full staff profile (self, admin, or manager)
export const getStaffProfile = query({
  args: { profileId: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);

    // Staff can only view their own profile
    if (caller.role === "staff" && caller._id !== args.profileId) {
      throw new ConvexError("Staff can only view their own profile");
    }

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new ConvexError("Profile not found");
    }

    // Resolve certified locations for richer data
    const locations = await Promise.all(
      profile.certifiedLocationIds.map((id) => ctx.db.get(id)),
    );

    return {
      ...profile,
      certifiedLocations: locations.filter((l) => l !== null),
    };
  },
});

// Update staff profile (self or admin)
export const updateStaffProfile = mutation({
  args: {
    profileId: v.optional(v.id("userProfiles")),
    skills: v.optional(v.array(skillValidator)),
    homeTimezone: v.optional(v.string()),
    certifiedLocationIds: v.optional(v.array(v.id("locations"))),
  },
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);

    // Determine which profile to update
    const targetId = args.profileId ?? caller._id;

    // Only admin can update other profiles
    if (targetId !== caller._id && caller.role !== "admin") {
      throw new ConvexError("Only admins can update other staff profiles");
    }

    const target = await ctx.db.get(targetId);
    if (!target) {
      throw new ConvexError("Profile not found");
    }

    // Build patch object with only provided fields
    const patch: Record<string, unknown> = {};

    if (args.skills !== undefined) {
      patch.skills = args.skills;
    }

    if (args.homeTimezone !== undefined) {
      const tz = args.homeTimezone.trim();
      if (!isValidIanaTimezone(tz)) {
        throw new ConvexError(`Invalid IANA timezone: ${tz}`);
      }
      patch.homeTimezone = tz;
    }

    if (args.certifiedLocationIds !== undefined) {
      // Validate all location IDs exist
      for (const locId of args.certifiedLocationIds) {
        const loc = await ctx.db.get(locId);
        if (!loc) {
          throw new ConvexError(`Location not found: ${locId}`);
        }
      }
      patch.certifiedLocationIds = args.certifiedLocationIds;
    }

    if (Object.keys(patch).length === 0) {
      throw new ConvexError("No fields to update");
    }

    await ctx.db.patch(targetId, patch);
    return targetId;
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("userProfiles"),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("staff")),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// List staff members (manager/admin)
// Managers see only staff certified at their managed locations.
// Admins see all staff. Optional filters by location and skill.
export const listStaff = query({
  args: {
    locationId: v.optional(v.id("locations")),
    skill: v.optional(skillValidator),
  },
  handler: async (ctx, args) => {
    const caller = await assertAdminOrManager(ctx);

    // Fetch all staff profiles using the by_role index
    let staff = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "staff"))
      .collect();

    // Manager: restrict to staff certified at their managed locations
    if (caller.role === "manager") {
      const managerAssignments = await ctx.db
        .query("managerLocations")
        .withIndex("by_managerId", (q) => q.eq("managerId", caller._id))
        .collect();
      const managedLocationIds = new Set(
        managerAssignments.map((a) => a.locationId),
      );

      staff = staff.filter((s) =>
        s.certifiedLocationIds.some((locId) => managedLocationIds.has(locId)),
      );
    }

    // Apply optional filters
    if (args.locationId) {
      staff = staff.filter((s) =>
        s.certifiedLocationIds.includes(args.locationId!),
      );
    }

    if (args.skill) {
      staff = staff.filter((s) => s.skills.includes(args.skill!));
    }

    return staff;
  },
});
