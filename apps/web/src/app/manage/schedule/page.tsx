"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { startOfWeek, addWeeks, addDays, format } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ShiftSync/ui/components/select";
import { Badge } from "@ShiftSync/ui/components/badge";
import { WeekPicker } from "@/components/shared/week-picker";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ManageSchedulePage() {
  const locations = useQuery(api.locations.listLocations) ?? [];
  const [selectedLocationId, setSelectedLocationId] = useState<
    Id<"locations"> | undefined
  >(undefined);
  const [weekStartDate, setWeekStartDate] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const activeLocationId =
    selectedLocationId ?? (locations.length > 0 ? locations[0]._id : undefined);

  const { weekStart, weekEnd } = useMemo(
    () => ({
      weekStart: weekStartDate.getTime(),
      weekEnd: addWeeks(weekStartDate, 1).getTime(),
    }),
    [weekStartDate],
  );

  const shifts = useQuery(
    api.shifts.listShifts,
    activeLocationId
      ? {
          locationId: activeLocationId,
          rangeStart: weekStart,
          rangeEnd: weekEnd,
        }
      : "skip",
  );

  // Group shifts by day of week
  const shiftsByDay = useMemo(() => {
    if (!shifts) return {};
    const groups: Record<string, typeof shifts> = {};
    for (const shift of shifts) {
      const day = format(shift.startTime, "EEE");
      if (!groups[day]) groups[day] = [];
      groups[day].push(shift);
    }
    return groups;
  }, [shifts]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Calendar view of all shifts.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        {locations.length > 0 && (
          <Select
            value={activeLocationId}
            onValueChange={(val) =>
              setSelectedLocationId(val as Id<"locations">)
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc._id} value={loc._id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <WeekPicker
          currentWeekStart={weekStartDate}
          onChange={setWeekStartDate}
        />
      </div>

      {shifts === undefined ? (
        <div className="animate-pulse space-y-3">
          <div className="h-32 rounded-lg bg-muted" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, i) => {
            const dayDate = addDays(weekStartDate, i);
            const dayShifts = shiftsByDay[day] ?? [];
            return (
              <Card key={day} className="min-h-[200px]">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {day}
                    <span className="block text-xs text-muted-foreground font-normal">
                      {format(dayDate, "MMM d")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-1.5">
                  {dayShifts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No shifts
                    </p>
                  ) : (
                    dayShifts.map((shift) => (
                      <div
                        key={shift._id}
                        className={`rounded border p-2 text-xs space-y-0.5 ${
                          shift.status === "draft"
                            ? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/30"
                            : "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
                        }`}
                      >
                        <p className="font-medium">
                          {format(shift.startTime, "p")} –{" "}
                          {format(shift.endTime, "p")}
                        </p>
                        <p className="text-muted-foreground capitalize">
                          {shift.requiredSkill.replace(/_/g, " ")}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0"
                          >
                            {shift.status}
                          </Badge>
                          {shift.isPremium && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1 py-0"
                            >
                              ★
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
