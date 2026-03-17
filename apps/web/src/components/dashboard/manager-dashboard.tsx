"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { format } from "date-fns";

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ShiftSync/ui/components/tabs";
import { Badge } from "@ShiftSync/ui/components/badge";

export function ManagerDashboard({
  managerId,
}: {
  managerId: Id<"userProfiles">;
}) {
  const locations = useQuery(api.locations.listLocations);
  const [selectedLocationId, setSelectedLocationId] = useState<
    Id<"locations"> | undefined
  >(undefined);

  // Default to first location if none selected
  const activeLocationId =
    selectedLocationId ??
    (locations && locations.length > 0 ? locations[0]._id : undefined);

  // Memoize date range so useQuery args are stable across renders
  const { weekStart, weekEnd } = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return {
      weekStart: today.getTime(),
      weekEnd: today.getTime() + 7 * 24 * 60 * 60 * 1000,
    };
  }, []);

  const locationShifts = useQuery(
    api.shifts.listShifts,
    activeLocationId
      ? {
          locationId: activeLocationId,
          rangeStart: weekStart,
          rangeEnd: weekEnd,
        }
      : "skip",
  );

  const swapRequests = useQuery(
    api.swapRequests.listSwapRequests,
    activeLocationId ? { status: "accepted" } : "skip",
  ); // Managers see accepted requests waiting for approval

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Location Overview
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage schedules and requests for your locations.
          </p>
        </div>

        {locations && locations.length > 0 && (
          <Select
            value={activeLocationId}
            onValueChange={(val) =>
              setSelectedLocationId(val as Id<"locations">)
            }
          >
            <SelectTrigger className="w-[200px]">
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
      </div>

      <Tabs defaultValue="shifts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shifts">Upcoming Shifts</TabsTrigger>
          <TabsTrigger value="requests">
            Pending Approvals
            {swapRequests && swapRequests.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 w-5 justify-center rounded-full p-0"
              >
                {swapRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Schedule: {format(weekStart, "PP")} - {format(weekEnd, "PP")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!activeLocationId ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                  You are not assigned to manage any locations.
                </div>
              ) : locationShifts === undefined ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-12 w-full rounded bg-muted"></div>
                  <div className="h-12 w-full rounded bg-muted"></div>
                </div>
              ) : locationShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No shifts scheduled for this week.
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {locationShifts.map((shift) => (
                    <div
                      key={shift._id}
                      className="flex items-center justify-between p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {format(shift.startTime, "p")} -{" "}
                            {format(shift.endTime, "p")}
                          </span>
                          {shift.status === "draft" ? (
                            <Badge
                              variant="outline"
                              className="text-yellow-600 border-yellow-200 bg-yellow-50"
                            >
                              Draft
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-200 bg-green-50"
                            >
                              Published
                            </Badge>
                          )}
                          {shift.isPremium && (
                            <Badge variant="secondary">Premium</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 capitalize">
                          {shift.requiredSkill.replace("_", " ")} • Headcount:{" "}
                          {shift.headcount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Swap Approvals</CardTitle>
              <CardDescription>
                Review and approve shift swap requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!activeLocationId ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                  You are not assigned to manage any locations.
                </div>
              ) : swapRequests === undefined ? (
                <div className="animate-pulse h-12 w-full rounded bg-muted"></div>
              ) : swapRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No swap requests pending your approval.
                </p>
              ) : (
                <div className="space-y-4">
                  {swapRequests.map((swap) => (
                    <div
                      key={swap._id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">
                          Swap Request for Shift {swap.shiftId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Requested {format(swap.createdAt, "PPp")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
