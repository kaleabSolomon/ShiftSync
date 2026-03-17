"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@ShiftSync/ui/components/button";
import { Badge } from "@ShiftSync/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ShiftSync/ui/components/tabs";
import { PremiumShiftBadge } from "@/components/shared/premium-shift-badge";
import {
  AlertTriangle,
  Clock,
  Trash2,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

export default function ShiftDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shiftId = params.shiftId as Id<"shifts">;

  const shift = useQuery(api.shifts.getShift, { shiftId });
  const assignments = useQuery(api.shiftAssignments.getShiftAssignments, {
    shiftId,
  });
  const auditLog = useQuery(api.auditLog.getShiftAuditLog, { shiftId });
  const staff = useQuery(api.userProfiles.listStaff, {});
  const deleteShift = useMutation(api.shifts.deleteShift);
  const assignStaff = useMutation(api.shiftAssignments.assignStaffToShift);
  const unassignStaff = useMutation(
    api.shiftAssignments.unassignStaffFromShift,
  );
  const eligibleReplacements = useQuery(api.shifts.suggestAlternatives, {
    shiftId,
  });

  const isUrgent =
    shift &&
    shift.startTime - Date.now() < 24 * 60 * 60 * 1000 &&
    shift.startTime > Date.now();

  if (!shift) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">
          Loading shift...
        </div>
      </div>
    );
  }

  const assignedStaffIds = new Set((assignments ?? []).map((a) => a.staffId));
  const availableStaff = (staff ?? []).filter(
    (s) =>
      !assignedStaffIds.has(s._id) &&
      s.skills.includes(
        shift.requiredSkill as "bartender" | "server" | "host" | "line_cook",
      ),
  );

  const handleAssign = async (staffId: Id<"userProfiles">) => {
    try {
      const result = await assignStaff({ shiftId, staffId });
      if (result.warnings.length > 0) {
        toast.warning(result.warnings.join(", "));
      } else {
        toast.success("Staff assigned.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Assignment failed";
      toast.error(message);
    }
  };

  const handleUnassign = async (assignmentId: Id<"assignments">) => {
    try {
      await unassignStaff({ assignmentId });
      toast.success("Staff unassigned.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unassignment failed";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteShift({ shiftId });
      toast.success("Shift deleted.");
      router.push("/manage/shifts");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift Detail</h1>
          <p className="text-sm text-muted-foreground">
            {format(shift.startTime, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Shift
        </Button>
      </div>

      {/* Shift Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {format(shift.startTime, "p")} – {format(shift.endTime, "p")}
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              {assignments?.length ?? 0}/{shift.headcount} assigned
            </div>
            <Badge
              variant="outline"
              className={
                shift.status === "draft"
                  ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                  : "border-green-200 bg-green-50 text-green-700"
              }
            >
              {shift.status === "draft" ? "Draft" : "Published"}
            </Badge>
            {shift.isPremium && <PremiumShiftBadge />}
            <Badge variant="secondary" className="capitalize">
              {shift.requiredSkill.replace(/_/g, " ")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="assignments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assignments">
            Assignments ({assignments?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="assign">Assign Staff</TabsTrigger>
          <TabsTrigger value="coverage" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Find Coverage
            {isUrgent && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">
            Audit Log ({auditLog?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Current Assignments */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {!assignments || assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No staff assigned yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {assignments.map((a) => (
                    <div
                      key={a._id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {a.staff?.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {a.staff?.skills?.join(", ") ?? "No skills"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleUnassign(a._id)}
                      >
                        Unassign
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assign Staff */}
        <TabsContent value="assign">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Staff</CardTitle>
              <CardDescription>
                Staff with the required skill "
                {shift.requiredSkill.replace(/_/g, " ")}" who are not already
                assigned.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No available staff with the required skill.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableStaff.map((s) => (
                    <div
                      key={s._id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {s.skills.join(", ")}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleAssign(s._id)}>
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Find Coverage (Emergency) */}
        <TabsContent value="coverage">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                Emergency Coverage
              </CardTitle>
              <CardDescription>
                Staff who pass all constraint checks for this shift, ranked by
                fewest warnings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isUrgent && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    This shift starts within <strong>24 hours</strong>.
                    Prioritize assignment.
                  </span>
                </div>
              )}

              {eligibleReplacements === undefined ? (
                <div className="py-8 text-center">
                  <div className="animate-pulse text-muted-foreground text-sm">
                    Running constraint checks against all staff...
                  </div>
                </div>
              ) : eligibleReplacements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No eligible staff found. All candidates have constraint
                  violations.
                </p>
              ) : (
                <div className="space-y-3">
                  {eligibleReplacements.map((candidate) => (
                    <div
                      key={candidate.staffId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-3 gap-3"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-sm flex items-center gap-2">
                          {candidate.name}
                          {candidate.warnings.length === 0 && (
                            <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-none">
                              No warnings
                            </Badge>
                          )}
                        </p>
                        {candidate.warnings.length > 0 && (
                          <div className="space-y-0.5">
                            {candidate.warnings.map((w, i) => (
                              <p
                                key={i}
                                className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
                              >
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {w}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleAssign(candidate.staffId as Id<"userProfiles">)
                        }
                      >
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              {!auditLog || auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No audit entries.
                </p>
              ) : (
                <div className="space-y-3">
                  {auditLog.map((entry) => (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {entry.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {entry.actorName} ·{" "}
                          {format(entry.timestamp, "PPp")}
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
