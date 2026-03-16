import { Badge } from "@ShiftSync/ui/components/badge";
import { Star } from "lucide-react";

export function PremiumShiftBadge() {
  return (
    <Badge
      variant="secondary"
      className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
    >
      <Star className="h-3 w-3 fill-current" />
      Premium
    </Badge>
  );
}
