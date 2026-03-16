"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { startOfWeek, addWeeks } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";
import { Button } from "@ShiftSync/ui/components/button";
import { WeekPicker } from "@/components/shared/week-picker";
import { ShiftCard } from "@/components/shared/shift-card";

export default function SchedulePage() {
  const profile = useQuery(api.userProfiles.getMyProfile);
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

  const schedule = useQuery(
    api.shiftAssignments.getStaffSchedule,
    profile
      ? {
          staffId: profile._id,
          rangeStart: weekStart,
          rangeEnd: weekEnd,
        }
      : "skip",
  );

  if (!profile) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Your upcoming shift assignments.
          </p>
        </div>
        <WeekPicker
          currentWeekStart={weekStartDate}
          onChange={setWeekStartDate}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shifts This Week</CardTitle>
        </CardHeader>
        <CardContent>
          {schedule === undefined ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 rounded-lg bg-muted" />
              <div className="h-16 rounded-lg bg-muted" />
              <div className="h-16 rounded-lg bg-muted" />
            </div>
          ) : schedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                No shifts scheduled this week.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Use the arrows to browse other weeks.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedule.map((shift) => (
                <ShiftCard
                  key={shift.assignmentId}
                  startTime={shift.startTime}
                  endTime={shift.endTime}
                  requiredSkill={shift.requiredSkill}
                  headcount={shift.headcount}
                  status={shift.status}
                  isPremium={shift.isPremium}
                  locationName={shift.location?.name}
                  actions={
                    <Button variant="outline" size="sm">
                      Request Swap
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
