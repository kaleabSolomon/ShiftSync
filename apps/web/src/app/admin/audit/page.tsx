"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@ShiftSync/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ShiftSync/ui/components/select";
import { Badge } from "@ShiftSync/ui/components/badge";
import { Shield, Activity, CalendarDays } from "lucide-react";

export default function AdminAuditPage() {
  const locations = useQuery(api.locations.listLocations, {}) ?? [];
  const [selectedLocationId, setSelectedLocationId] = useState<
    Id<"locations"> | undefined
  >(undefined);

  // For global audit logs, we'll look back 30 days
  const { rangeStart, rangeEnd } = useMemo(() => {
    const end = Date.now();
    const start = subDays(new Date(), 30).getTime();
    return { rangeStart: start, rangeEnd: end };
  }, []);

  // Use the location audit log query which requires admin access.
  // Wait until a location is selected
  const auditLogs = useQuery(
    api.auditLog.getLocationAuditLog,
    selectedLocationId
      ? {
          locationId: selectedLocationId as Id<"locations">,
          rangeStart,
          rangeEnd,
        }
      : "skip",
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Organization Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">
          View immutable history of all critical scheduling events.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Select Location</CardTitle>
          <CardDescription>
            Audit logs are partitioned by location. Select a location to view
            its history over the last 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-sm">
            <Select
              value={selectedLocationId}
              onValueChange={(v) =>
                v && setSelectedLocationId(v as Id<"locations">)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a location" />
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
        </CardContent>
      </Card>

      {!selectedLocationId ? (
        <Card>
          <CardContent className="py-24 flex flex-col items-center justify-center text-center text-muted-foreground">
            <Shield className="h-12 w-12 mb-4 opacity-20" />
            <p>Select a location above to view its audit history.</p>
          </CardContent>
        </Card>
      ) : auditLogs === undefined ? (
        <div className="animate-pulse space-y-3">
          <div className="h-[400px] rounded-lg bg-muted" />
        </div>
      ) : auditLogs.length === 0 ? (
        <Card>
          <CardContent className="py-24 flex flex-col items-center justify-center text-center text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-20" />
            <p>No audit events found for this location in the last 30 days.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Recent Activity</span>
              <Badge
                variant="outline"
                className="font-normal text-muted-foreground"
              >
                <CalendarDays className="mr-1 h-3 w-3" />
                Last 30 Days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLogs.map((entry) => (
                <div
                  key={entry._id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between rounded-lg border p-4 space-y-2 sm:space-y-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm flex items-center gap-2">
                        <span className="capitalize">
                          {entry.action.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] uppercase font-mono px-1.5 py-0 rounded ${
                            entry.action.includes("delete") ||
                            entry.action.includes("unassign")
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30"
                              : entry.action.includes("create") ||
                                  entry.action.includes("publish")
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30"
                                : ""
                          }`}
                        >
                          {entry.entityType}
                        </Badge>
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Performed by{" "}
                      <span className="font-medium text-foreground">
                        {entry.actorName}
                      </span>
                    </p>
                    {entry.action === "update_shift" &&
                      entry.beforeState &&
                      entry.afterState && (
                        <div className="mt-2 text-xs font-mono bg-muted/50 p-2 rounded max-w-sm overflow-x-auto">
                          <span className="text-muted-foreground">
                            Change details attached
                          </span>
                        </div>
                      )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(entry.timestamp, "MMM d, yyyy · p")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
