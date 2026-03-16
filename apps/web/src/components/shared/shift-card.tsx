import { format } from "date-fns";
import { Badge } from "@ShiftSync/ui/components/badge";
import { Clock, MapPin, Users } from "lucide-react";
import { PremiumShiftBadge } from "./premium-shift-badge";

interface ShiftCardProps {
  startTime: number;
  endTime: number;
  requiredSkill: string;
  headcount: number;
  status: string;
  isPremium: boolean;
  locationName?: string;
  assignmentCount?: number;
  actions?: React.ReactNode;
}

export function ShiftCard({
  startTime,
  endTime,
  requiredSkill,
  headcount,
  status,
  isPremium,
  locationName,
  assignmentCount,
  actions,
}: ShiftCardProps) {
  const durationHours = ((endTime - startTime) / (1000 * 60 * 60)).toFixed(1);

  return (
    <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {format(startTime, "EEEE, MMM d")}
          </span>
          {status === "draft" ? (
            <Badge
              variant="outline"
              className="border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400"
            >
              Draft
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
            >
              Published
            </Badge>
          )}
          {isPremium && <PremiumShiftBadge />}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {format(startTime, "p")} – {format(endTime, "p")} ({durationHours}h)
          </span>
          {locationName && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {locationName}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {assignmentCount !== undefined
              ? `${assignmentCount}/${headcount}`
              : headcount}{" "}
            staff
          </span>
          <span className="capitalize">{requiredSkill.replace(/_/g, " ")}</span>
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
