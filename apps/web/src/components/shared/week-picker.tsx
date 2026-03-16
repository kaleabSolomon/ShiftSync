"use client";

import { Button } from "@ShiftSync/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, startOfWeek } from "date-fns";

interface WeekPickerProps {
  currentWeekStart: Date;
  onChange: (newWeekStart: Date) => void;
}

export function WeekPicker({ currentWeekStart, onChange }: WeekPickerProps) {
  const weekEnd = addWeeks(currentWeekStart, 1);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(addWeeks(currentWeekStart, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[200px] text-center text-sm font-medium">
        {format(currentWeekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(addWeeks(currentWeekStart, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
