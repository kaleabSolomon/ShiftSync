import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUserProfile } from "./helpers/auth";
import type { Id } from "./_generated/dataModel";

export const sendNotification = internalMutation({
  args: {
    userId: v.id("userProfiles"),
    type: v.string(),
    message: v.string(),
    relatedEntityId: v.optional(v.string()),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      message: args.message,
      isRead: false,
      createdAt: Date.now(),
      relatedEntityId: args.relatedEntityId,
    });
  },
});

export const getNotifications = query({
  args: {
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);

    let notifications;
    if (args.unreadOnly) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_userId_and_isRead", (q) =>
          q.eq("userId", caller._id).eq("isRead", false),
        )
        .collect();
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_userId", (q) => q.eq("userId", caller._id))
        .collect();
    }

    return notifications.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const caller = await requireUserProfile(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError("Notification not found");
    }

    if (notification.userId !== caller._id) {
      throw new ConvexError(
        "You do not have permission to mark this notification as read",
      );
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
    return null;
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const caller = await requireUserProfile(ctx);

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", caller._id).eq("isRead", false),
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return null;
  },
});
