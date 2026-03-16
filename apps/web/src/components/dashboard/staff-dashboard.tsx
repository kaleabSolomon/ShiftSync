"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { useMemo } from "react";

import { Button } from "@ShiftSync/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";

export function StaffDashboard({ staffId }: { staffId: Id<"userProfiles"> }) {
  // Memoize date range so useQuery args are stable across renders
  const { weekStart, weekEnd } = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return {
      weekStart: today.getTime(),
      weekEnd: today.getTime() + 7 * 24 * 60 * 60 * 1000,
    };
  }, []);

  const schedule = useQuery(api.shiftAssignments.getStaffSchedule, {
    staffId,
    rangeStart: weekStart,
    rangeEnd: weekEnd,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Upcoming Shifts</CardTitle>
          <CardDescription>
            Your schedule from {format(weekStart, "PP")} to{" "}
            {format(weekEnd, "PP")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schedule === undefined ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 rounded bg-muted" />
              <div className="h-10 rounded bg-muted" />
            </div>
          ) : schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no shifts scheduled for the next 7 days.
            </p>
          ) : (
            <div className="space-y-4">
              {schedule.map((shift) => (
                <div
                  key={shift.assignmentId}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">
                      {format(shift.startTime, "EEEE, MMMM do")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(shift.startTime, "p")} -{" "}
                      {format(shift.endTime, "p")} at {shift.location?.name}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Request Swap
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
