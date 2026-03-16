"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@ShiftSync/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";
import { Input } from "@ShiftSync/ui/components/input";
import { Label } from "@ShiftSync/ui/components/label";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// dayOfWeek: 0=Sun, 1=Mon, ... 6=Sat — map from our UI order to schema
const UI_TO_DOW = [1, 2, 3, 4, 5, 6, 0];

export default function AvailabilityPage() {
  const profile = useQuery(api.userProfiles.getMyProfile);
  const availability = useQuery(
    api.availability.getAvailability,
    profile ? {} : "skip",
  );
  const setAvailability = useMutation(api.availability.setAvailability);

  const [editing, setEditing] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  if (!profile || availability === undefined) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleSave = async (dayIndex: number) => {
    try {
      await setAvailability({
        dayOfWeek: UI_TO_DOW[dayIndex],
        startTime,
        endTime,
      });
      toast.success(`Availability set for ${DAYS[dayIndex]}`);
      setEditing(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save availability";
      toast.error(message);
    }
  };

  const getSlotForDay = (dayIndex: number) => {
    const dow = UI_TO_DOW[dayIndex];
    return availability.find((a) => a.dayOfWeek === dow);
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Availability</h1>
        <p className="text-sm text-muted-foreground">
          Set the hours you're available each day of the week.
        </p>
      </div>

      <div className="space-y-3">
        {DAYS.map((day, i) => {
          const slot = getSlotForDay(i);
          const isEditing = editing === i;

          return (
            <Card key={day}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{day}</CardTitle>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(i);
                        if (slot) {
                          setStartTime(slot.startTime);
                          setEndTime(slot.endTime);
                        } else {
                          setStartTime("09:00");
                          setEndTime("17:00");
                        }
                      }}
                    >
                      {slot ? "Edit" : "Set"}
                    </Button>
                  )}
                </div>
                {slot && !isEditing && (
                  <CardDescription>
                    {slot.startTime} – {slot.endTime}
                  </CardDescription>
                )}
                {!slot && !isEditing && (
                  <CardDescription className="italic">
                    Not set — unavailable
                  </CardDescription>
                )}
              </CardHeader>

              {isEditing && (
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`start-${i}`}>Start</Label>
                      <Input
                        id={`start-${i}`}
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`end-${i}`}>End</Label>
                      <Input
                        id={`end-${i}`}
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(i)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
