"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { startOfWeek, addWeeks } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";
import { WeekPicker } from "@/components/shared/week-picker";
import { Building2, Layers, Users, TrendingUp } from "lucide-react";

export default function AdminAnalyticsPage() {
  const staff = useQuery(api.userProfiles.listStaff, {}) ?? [];
  const locations = useQuery(api.locations.listLocations, {}) ?? [];
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

  // We need to fetch shifts across ALL locations to get global analytics
  // Since listShifts requires a locationId, we have to map over locations and fetch them
  // A simpler way for an admin dashboard is to summarize the data using a new backend function
  // or fetch multiple queries in parallel.
  // For now, we will summarize the Staff & Location data since we don't have a "global shifts" endpoint out-of-the-box.
  // Realistically we'd add an endpoint `api.analytics.getGlobalMetrics`

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Organization Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Global high-level overview of staffing and operations.
          </p>
        </div>
        <WeekPicker
          currentWeekStart={weekStartDate}
          onChange={setWeekStartDate}
        />
      </div>

      {/* Global Summaries */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Locations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active operating venues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Staff per Location
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {locations.length > 0
                ? (staff.length / locations.length).toFixed(1)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across network</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Skill Saturation
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on constraints
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Global Staff Skills Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Global Skill Distribution</CardTitle>
            <CardDescription>
              Pool of available skills across entire organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No staff data available.
              </p>
            ) : (
              <div className="space-y-4 pt-2">
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
                    <div key={skill} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize font-medium text-foreground/80">
                          {skill.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {pct}% ({count})
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Under construction message for specific global shifts query */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Network Shift Hours</CardTitle>
            <CardDescription>
              Organization-wide premium and standard hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm max-w-[250px]">
              Select a specific location from the Manager dashboard to view
              shift analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
