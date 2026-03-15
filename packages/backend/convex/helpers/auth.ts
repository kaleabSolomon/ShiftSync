import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

// Get the current authenticated user's profile from userProfiles table.
// Returns null if not authenticated or no profile exists.
export async function getCurrentUserProfile(ctx: QueryCtx | MutationCtx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) return null;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", String(authUser._id)))
    .unique();

  if (!profile) return null;

  return { ...profile, authUser };
}

// Require authentication and a profile. Throws if either is missing.
export async function requireUserProfile(ctx: QueryCtx | MutationCtx) {
  const result = await getCurrentUserProfile(ctx);
  if (!result) {
    throw new ConvexError("Not authenticated or profile not found");
  }
  return result;
}

// Role guards — throw ConvexError if the user doesn't have the required role.
export async function assertAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireUserProfile(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("Admin access required");
  }
  return user;
}

export async function assertManager(ctx: QueryCtx | MutationCtx) {
  const user = await requireUserProfile(ctx);
  if (user.role !== "manager") {
    throw new ConvexError("Manager access required");
  }
  return user;
}

export async function assertStaff(ctx: QueryCtx | MutationCtx) {
  const user = await requireUserProfile(ctx);
  if (user.role !== "staff") {
    throw new ConvexError("Staff access required");
  }
  return user;
}

// Assert the user is a manager AND is assigned to the given location.
export async function assertManagerOfLocation(
  ctx: QueryCtx | MutationCtx,
  locationId: string,
) {
  const user = await assertManager(ctx);

  const assignment = await ctx.db
    .query("managerLocations")
    .withIndex("by_managerId", (q) => q.eq("managerId", user._id))
    .collect();

  const isAssigned = assignment.some((a) => a.locationId === locationId);

  if (!isAssigned) {
    throw new ConvexError("You are not assigned to manage this location");
  }

  return user;
}

// Assert the user is either an admin or a manager (for shared views).
export async function assertAdminOrManager(ctx: QueryCtx | MutationCtx) {
  const user = await requireUserProfile(ctx);
  if (user.role !== "admin" && user.role !== "manager") {
    throw new ConvexError("Admin or Manager access required");
  }
  return user;
}
