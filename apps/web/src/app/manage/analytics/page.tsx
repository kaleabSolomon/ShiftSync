"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { startOfWeek, addWeeks } from "date-fns";

import { Badge } from "@ShiftSync/ui/components/badge";
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
import { WeekPicker } from "@/components/shared/week-picker";

export default function ManageAnalyticsPage() {
  const locations = useQuery(api.locations.listLocations) ?? [];
  const staff = useQuery(api.userProfiles.listStaff, {});
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

  // Compute analytics
  const analytics = useMemo(() => {
    if (!shifts)
      return {
        totalShifts: 0,
        publishedShifts: 0,
        draftShifts: 0,
        premiumShifts: 0,
        totalHours: 0,
        totalHeadcount: 0,
      };

    const totalShifts = shifts.length;
    const publishedShifts = shifts.filter(
      (s) => s.status === "published",
    ).length;
    const draftShifts = shifts.filter((s) => s.status === "draft").length;
    const premiumShifts = shifts.filter((s) => s.isPremium).length;
    const totalHours = shifts.reduce(
      (sum, s) => sum + (s.endTime - s.startTime) / (1000 * 60 * 60),
      0,
    );
    const totalHeadcount = shifts.reduce((sum, s) => sum + s.headcount, 0);

    return {
      totalShifts,
      publishedShifts,
      draftShifts,
      premiumShifts,
      totalHours: Math.round(totalHours * 10) / 10,
      totalHeadcount,
    };
  }, [shifts]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Analytics & Fairness
        </h1>
        <p className="text-sm text-muted-foreground">
          Shift distribution and fairness metrics.
        </p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Shifts</CardDescription>
            <CardTitle className="text-3xl">{analytics.totalShifts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Published</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {analytics.publishedShifts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drafts</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">
              {analytics.draftShifts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Premium Shifts</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {analytics.premiumShifts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Hours</CardDescription>
            <CardTitle className="text-3xl">{analytics.totalHours}h</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Headcount</CardDescription>
            <CardTitle className="text-3xl">
              {analytics.totalHeadcount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Staff Skills Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Staff Skills Breakdown</CardTitle>
          <CardDescription>
            Skills distribution across your staff members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!staff || staff.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No staff data available.
            </p>
          ) : (
            <div className="space-y-2">
              {["bartender", "server", "host", "line_cook"].map((skill) => {
                const count = staff.filter((s) =>
                  s.skills.includes(
                    skill as "bartender" | "server" | "host" | "line_cook",
                  ),
                ).length;
                const pct =
                  staff.length > 0
                    ? Math.round((count / staff.length) * 100)
                    : 0;
                return (
                  <div
                    key={skill}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm capitalize">
                      {skill.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs min-w-[3rem] justify-center"
                      >
                        {count}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
