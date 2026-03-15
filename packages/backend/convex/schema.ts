import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Reusable validators
const skillValidator = v.union(
  v.literal("bartender"),
  v.literal("server"),
  v.literal("host"),
  v.literal("line_cook"),
);

const roleValidator = v.union(
  v.literal("admin"),
  v.literal("manager"),
  v.literal("staff"),
);

const shiftStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
);

const swapStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("rejected"),
  v.literal("approved"),
  v.literal("cancelled"),
);

export default defineSchema({
  // Locations
  locations: defineTable({
    name: v.string(),
    timezone: v.string(), // IANA timezone, e.g. "America/New_York"
    address: v.string(),
  }),

  //  User profiles (extends Better Auth user)
  // Better Auth manages its own user/session tables via the component.
  userProfiles: defineTable({
    authUserId: v.string(), // Better Auth user ID
    name: v.string(),
    role: roleValidator,
    homeTimezone: v.string(), // IANA timezone
    skills: v.array(skillValidator),
    certifiedLocationIds: v.array(v.id("locations")),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_role", ["role"]),

  //  Manager ↔ Location assignment (join table)
  managerLocations: defineTable({
    managerId: v.id("userProfiles"),
    locationId: v.id("locations"),
  })
    .index("by_managerId", ["managerId"])
    .index("by_locationId", ["locationId"]),

  //  Staff availability (recurring weekly)
  availability: defineTable({
    staffId: v.id("userProfiles"),
    dayOfWeek: v.number(), // 0 = Sunday, 6 = Saturday
    startTime: v.string(), // HH:MM in staff's home timezone
    endTime: v.string(), // HH:MM in staff's home timezone
  })
    .index("by_staffId", ["staffId"])
    .index("by_staffId_and_day", ["staffId", "dayOfWeek"]),

  //  Shifts
  shifts: defineTable({
    locationId: v.id("locations"),
    startTime: v.number(), // UTC milliseconds
    endTime: v.number(), // UTC milliseconds
    requiredSkill: skillValidator,
    headcount: v.number(),
    status: shiftStatusValidator,
    isPremium: v.boolean(),
    createdBy: v.id("userProfiles"),
  })
    .index("by_locationId", ["locationId"])
    .index("by_locationId_and_status", ["locationId", "status"])
    .index("by_locationId_and_startTime", ["locationId", "startTime"])
    .index("by_status", ["status"]),

  //  Shift assignments
  assignments: defineTable({
    shiftId: v.id("shifts"),
    staffId: v.id("userProfiles"),
    assignedBy: v.id("userProfiles"),
    assignedAt: v.number(),
  })
    .index("by_shiftId", ["shiftId"])
    .index("by_staffId", ["staffId"])
    .index("by_staffId_and_shiftId", ["staffId", "shiftId"]),

  //  Swap requests
  swapRequests: defineTable({
    shiftId: v.id("shifts"),
    requesterId: v.id("userProfiles"),
    targetId: v.id("userProfiles"),
    status: swapStatusValidator,
    managerId: v.optional(v.id("userProfiles")), // approver
    createdAt: v.number(), // UTC milliseconds
  })
    .index("by_shiftId", ["shiftId"])
    .index("by_requesterId", ["requesterId"])
    .index("by_targetId", ["targetId"])
    .index("by_requesterId_and_status", ["requesterId", "status"])
    .index("by_status", ["status"]),

  //  Notifications
  notifications: defineTable({
    userId: v.id("userProfiles"),
    type: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(), // UTC milliseconds
    relatedEntityId: v.optional(v.string()), // generic reference
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_isRead", ["userId", "isRead"])
    .index("by_userId_and_createdAt", ["userId", "createdAt"]),

  //  Audit log
  auditLog: defineTable({
    actorId: v.id("userProfiles"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    beforeState: v.optional(v.any()),
    afterState: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_entityType_and_entityId", ["entityType", "entityId"])
    .index("by_actorId", ["actorId"])
    .index("by_timestamp", ["timestamp"]),
});
