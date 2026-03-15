import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getCurrentUserProfile, requireUserProfile } from "./helpers/auth";

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
    const profileId = await ctx.db.insert("userProfiles", {
      authUserId: String(authUser._id),
      name: authUser.name,
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

// Get a user profile by ID (admin/manager access)
export const getProfile = query({
  args: { profileId: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);
    if (caller.role !== "admin" && caller.role !== "manager") {
      throw new ConvexError("Insufficient permissions");
    }
    return await ctx.db.get(args.profileId);
  },
});
