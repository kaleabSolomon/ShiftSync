"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@ShiftSync/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";

export default function NotificationsPage() {
  const notifications = useQuery(api.notifications.getNotifications, {});
  const markRead = useMutation(api.notifications.markNotificationRead);
  const markAllRead = useMutation(api.notifications.markAllNotificationsRead);

  if (notifications === undefined) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
              : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead()}>
            Mark all as read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`flex items-start justify-between gap-4 py-4 ${!notification.isRead ? "bg-muted/30 -mx-4 px-4 rounded-lg" : ""}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {!notification.isRead && (
                      <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm ${!notification.isRead ? "font-semibold" : ""}`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(notification.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() =>
                        markRead({ notificationId: notification._id })
                      }
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
