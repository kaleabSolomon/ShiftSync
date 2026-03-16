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
import { CalendarIcon } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminSchedulePage() {
  const locations = useQuery(api.locations.listLocations) ?? [];
  const [selectedLocationId, setSelectedLocationId] = useState<
    Id<"locations"> | "all"
  >("all");
  const [weekStartDate, setWeekStartDate] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const { weekStart, weekEnd } = useMemo(
    () => ({
      weekStart: weekStartDate.getTime(),
      weekEnd: addWeeks(weekStartDate, 1).getTime(),
    }),
    [weekStartDate],
  );

  // We query for the specific location if selected, otherwise we query without locationId
  // The backend might complain if listShifts requires locationId, let's check.
  // Actually, listShifts *does* require locationId. So an admin cannot view "all locations at once" easily
  // without a different query. Instead, we'll enforce selecting a location, or we pick the first.

  const activeLocationId =
    selectedLocationId === "all"
      ? locations.length > 0
        ? locations[0]._id
        : undefined
      : selectedLocationId;

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
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Global Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Read-only calendar view of shifts across all locations.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-lg border">
        {locations.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Location:</span>
            <Select
              value={activeLocationId}
              onValueChange={(val) =>
                setSelectedLocationId(val as Id<"locations">)
              }
            >
              <SelectTrigger className="w-[250px] bg-background">
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
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No locations available
          </div>
        )}

        <div className="ml-auto">
          <WeekPicker
            currentWeekStart={weekStartDate}
            onChange={setWeekStartDate}
          />
        </div>
      </div>

      {shifts === undefined ? (
        <div className="animate-pulse space-y-3">
          <div className="h-[400px] rounded-lg bg-muted" />
        </div>
      ) : activeLocationId === undefined ? (
        <Card>
          <CardContent className="py-24 flex flex-col items-center text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
            <p>Create a location first to view schedules.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {DAYS.map((day, i) => {
            const dayDate = addDays(weekStartDate, i);
            const dayShifts = shiftsByDay[day] ?? [];
            return (
              <Card key={day} className="min-h-[250px] flex flex-col">
                <CardHeader className="p-3 pb-2 border-b bg-muted/10">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    {day}
                    <span className="text-xs text-muted-foreground font-normal">
                      {format(dayDate, "MMM d")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-3 space-y-2 flex-1 overflow-y-auto">
                  {dayShifts.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-muted-foreground italic">
                        No shifts
                      </p>
                    </div>
                  ) : (
                    dayShifts.map((shift) => (
                      <div
                        key={shift._id}
                        className={`rounded-md border p-2.5 text-xs space-y-1 ${
                          shift.status === "draft"
                            ? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/50 dark:bg-yellow-950/20"
                            : "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20"
                        }`}
                      >
                        <div className="font-medium flex justify-between">
                          <span>{format(shift.startTime, "p")}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{format(shift.endTime, "p")}</span>
                        </div>
                        <p className="text-muted-foreground capitalize font-medium">
                          {shift.requiredSkill.replace(/_/g, " ")}
                        </p>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/50">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {shift.headcount} slot
                            {shift.headcount > 1 ? "s" : ""}
                          </span>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4 border-foreground/10"
                            >
                              {shift.status}
                            </Badge>
                            {shift.isPremium && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-none"
                              >
                                ★
                              </Badge>
                            )}
                          </div>
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
