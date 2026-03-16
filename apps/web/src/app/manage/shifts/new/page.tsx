"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@ShiftSync/ui/components/button";
import { Input } from "@ShiftSync/ui/components/input";
import { Label } from "@ShiftSync/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
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

const SKILLS = [
  { value: "bartender", label: "Bartender" },
  { value: "server", label: "Server" },
  { value: "host", label: "Host" },
  { value: "line_cook", label: "Line Cook" },
] as const;

export default function NewShiftPage() {
  const router = useRouter();
  const locations = useQuery(api.locations.listLocations) ?? [];
  const createShift = useMutation(api.shifts.createShift);

  const [locationId, setLocationId] = useState<Id<"locations"> | "">("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [skill, setSkill] = useState<
    "bartender" | "server" | "host" | "line_cook"
  >("server");
  const [headcount, setHeadcount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !date) {
      toast.error("Please select a location and date.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date + time into UTC ms
      const startMs = new Date(`${date}T${startTime}:00`).getTime();
      const endMs = new Date(`${date}T${endTime}:00`).getTime();

      if (endMs <= startMs) {
        toast.error("End time must be after start time.");
        setIsSubmitting(false);
        return;
      }

      const shiftId = await createShift({
        locationId: locationId as Id<"locations">,
        startTime: startMs,
        endTime: endMs,
        requiredSkill: skill,
        headcount,
      });

      toast.success("Shift created!");
      router.push(`/manage/shifts/${shiftId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create shift";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Shift</CardTitle>
          <CardDescription>
            Add a new shift to one of your locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Select
                value={locationId}
                onValueChange={(val) => setLocationId(val as Id<"locations">)}
              >
                <SelectTrigger id="location">
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

            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="skill">Required Skill</Label>
                <Select
                  value={skill}
                  onValueChange={(val) => setSkill(val as typeof skill)}
                >
                  <SelectTrigger id="skill">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILLS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="headcount">Headcount</Label>
                <Input
                  id="headcount"
                  type="number"
                  min={1}
                  max={50}
                  value={headcount}
                  onChange={(e) => setHeadcount(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Creating..." : "Create Shift"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
