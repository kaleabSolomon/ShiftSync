import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@ShiftSync/ui/components/button";

interface Notification {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  _creationTime: number;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  return (
    <div
      className={`flex items-start justify-between p-4 border rounded-lg transition-colors ${
        notification.isRead ? "bg-background" : "bg-muted/30 border-primary/20"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`mt-0.5 rounded-full p-1.5 ${notification.isRead ? "bg-muted" : "bg-primary/10 text-primary"}`}
        >
          <Bell className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">
              {notification.type.replace(/_/g, " ")}
            </span>
            <span>·</span>
            <span>
              {formatDistanceToNow(notification._creationTime, {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>

      {!notification.isRead && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={() => onMarkRead(notification._id)}
        >
          Mark Read
        </Button>
      )}
    </div>
  );
}
