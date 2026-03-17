"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { Bell } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { Button } from "@ShiftSync/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@ShiftSync/ui/components/dropdown-menu";
import { ScrollArea } from "@ShiftSync/ui/components/scroll-area";
import { Badge } from "@ShiftSync/ui/components/badge";

export function NotificationBadge() {
  const [isOpen, setIsOpen] = useState(false);

  // Subscribe to live notifications unread count + list
  const notifications = useQuery(api.notifications.getNotifications, {});
  const markRead = useMutation(api.notifications.markNotificationRead);
  const markAllRead = useMutation(api.notifications.markAllNotificationsRead);

  if (notifications === undefined) {
    // Loading state
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative cursor-default"
        disabled
      >
        <Bell className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: Id<"notifications">) => {
    await markRead({ notificationId: id });
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="outline-none relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  handleMarkAllRead();
                }}
              >
                Mark all read
              </Button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications right now.
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className={`flex flex-col items-start gap-1 p-3 ${!notification.isRead ? "bg-muted/50" : ""}`}
                onClick={(e) => {
                  e.preventDefault(); // keep menu open unless navigating
                  if (!notification.isRead) {
                    handleMarkRead(notification._id);
                  }
                }}
              >
                <div className="flex w-full justify-between gap-2">
                  <span
                    className={`text-sm ${!notification.isRead ? "font-semibold" : ""}`}
                  >
                    {notification.message}
                  </span>
                  {!notification.isRead && (
                    <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(notification.createdAt, {
                    addSuffix: true,
                  })}
                </span>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
        <DropdownMenuSeparator />
        <div className="p-2">
          <Link
            href="/dashboard/notifications"
            onClick={() => setIsOpen(false)}
          >
            <Button
              variant="ghost"
              className="w-full text-sm justify-center h-8"
            >
              See more
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
