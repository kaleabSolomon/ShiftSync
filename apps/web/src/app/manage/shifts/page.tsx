"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { startOfWeek, addWeeks } from "date-fns";
import Link from "next/link";

import { Button } from "@ShiftSync/ui/components/button";
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
import { WeekPicker } from "@/components/shared/week-picker";
import { ShiftCard } from "@/components/shared/shift-card";
import { Plus } from "lucide-react";

export default function ManageShiftsPage() {
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

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Shifts</h1>
          <p className="text-sm text-muted-foreground">
            View, create, and manage shifts for your locations.
          </p>
        </div>
        <Link href="/manage/shifts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Shift
          </Button>
        </Link>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Shifts ({shifts?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shifts === undefined ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 rounded-lg bg-muted" />
              <div className="h-16 rounded-lg bg-muted" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No shifts for this week.</p>
              <Link href="/manage/shifts/new">
                <Button variant="link" className="mt-2">
                  Create one
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {shifts.map((shift) => (
                <Link
                  key={shift._id}
                  href={`/manage/shifts/${shift._id}`}
                  className="block"
                >
                  <ShiftCard
                    startTime={shift.startTime}
                    endTime={shift.endTime}
                    requiredSkill={shift.requiredSkill}
                    headcount={shift.headcount}
                    status={shift.status}
                    isPremium={shift.isPremium}
                  />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
