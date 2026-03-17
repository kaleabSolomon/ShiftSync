"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { startOfWeek, addWeeks } from "date-fns";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";
import { Button } from "@ShiftSync/ui/components/button";
import { WeekPicker } from "@/components/shared/week-picker";
import { ShiftCard } from "@/components/shared/shift-card";
import { SwapRequestModal } from "@/components/shared/swap-request-modal";

type ShiftRow = {
  _id: Id<"shifts">;
  assignmentId: Id<"assignments">;
  locationId: Id<"locations">;
  requiredSkill: string;
  startTime: number;
  endTime: number;
  headcount: number;
  status: "draft" | "published";
  isPremium: boolean;
  location?: { name: string; timezone: string } | null;
};

// Inner component so useQuery for eligible targets can be per-shift
function RequestSwapButton({ shift }: { shift: ShiftRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestSwap = useMutation(api.swapRequests.requestSwap);

  // Only fetch eligible targets when the modal is open
  const eligibleTargets = useQuery(
    api.userProfiles.getEligibleSwapTargets,
    isOpen ? { shiftId: shift._id } : "skip",
  );

  const handleRequestSwap = async (targetId: Id<"userProfiles">) => {
    setIsSubmitting(true);
    try {
      await requestSwap({ shiftId: shift._id, targetId });
      toast.success("Swap request sent successfully!");
      setIsOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send swap request";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
        Request Swap
      </Button>

      <SwapRequestModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        staffList={(eligibleTargets ?? []).map((s) => ({
          _id: s._id,
          name: s.name,
        }))}
        onRequestSwap={handleRequestSwap}
        isSubmitting={isSubmitting}
      />
    </>
  );
}

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
                    shift.status === "published" ? (
                      <RequestSwapButton shift={shift as ShiftRow} />
                    ) : null
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
