"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Button } from "@ShiftSync/ui/components/button";
import { Users, Mail, Clock, MapPin, ShieldHalf, UserCog } from "lucide-react";
import { PromoteManagerModal } from "@/components/shared/promote-manager-modal";
import { DemoteManagerModal } from "@/components/shared/demote-manager-modal";

const SKILLS = [
  { value: "all", label: "All Skills" },
  { value: "bartender", label: "Bartender" },
  { value: "server", label: "Server" },
  { value: "host", label: "Host" },
  { value: "line_cook", label: "Line Cook" },
];

export default function AdminStaffPage() {
  const locations = useQuery(api.locations.listLocations, {}) ?? [];
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  const updateRole = useMutation(api.userProfiles.updateRole);

  const [promotingStaff, setPromotingStaff] = useState<{
    _id: Id<"userProfiles">;
    name: string;
  } | null>(null);
  const [demotingManager, setDemotingManager] = useState<{
    _id: Id<"userProfiles">;
    name: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We fetch both staff and managers for the admin directory
  const staffList = useQuery(api.userProfiles.listStaff, {
    includeManagers: true,
  });

  if (staffList === undefined) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const filteredUsers = staffList.filter((s) => {
    // Admins aren't returned by listStaff, but just in case
    if (s.role === "admin") return false;

    if (selectedRole !== "all" && s.role !== selectedRole) {
      return false;
    }
    if (
      selectedLocationId !== "all" &&
      !s.certifiedLocationIds.includes(selectedLocationId as any)
    ) {
      // If it's a manager and they don't have location certs, we might miss them in the filter,
      // but conceptually Managers manage locations, Staff are certified. We filter uniformly for now.
      return false;
    }
    if (selectedSkill !== "all" && !s.skills.includes(selectedSkill as any)) {
      return false;
    }
    return true;
  });

  const handleConfirmDemotion = async () => {
    if (!demotingManager) return;
    setIsSubmitting(true);
    try {
      await updateRole({ userId: demotingManager._id, role: "staff" });
      toast.success(`${demotingManager.name} demoted to Staff successfully`);
      setDemotingManager(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to demote manager",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPromotion = async (locationId: Id<"locations">) => {
    if (!promotingStaff) return;
    setIsSubmitting(true);
    try {
      await updateRole({
        userId: promotingStaff._id,
        role: "manager",
        locationId,
      });
      toast.success(`${promotingStaff.name} promoted to Manager successfully`);
      setPromotingStaff(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to promote staff",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Global Team Directory
        </h1>
        <p className="text-sm text-muted-foreground">
          View and manage Staff and Managers across the organization.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
          <CardDescription className="sr-only">
            Filter members by role, location, and skill
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="w-full sm:max-w-[200px] space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Role
              </label>
              <Select
                value={selectedRole}
                onValueChange={(v) => v && setSelectedRole(v)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedRole === "all"
                      ? "All Roles"
                      : selectedRole === "manager"
                        ? "Managers"
                        : "Staff"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:max-w-[200px] space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Location Certification
              </label>
              <Select
                value={selectedLocationId}
                onValueChange={(v) => v && setSelectedLocationId(v)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedLocationId === "all"
                      ? "All Locations"
                      : (locations.find((l) => l._id === selectedLocationId)
                          ?.name ?? "All Locations")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc._id} value={loc._id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:max-w-[200px] space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Skill
              </label>
              <Select
                value={selectedSkill}
                onValueChange={(v) => v && setSelectedSkill(v)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {SKILLS.find((s) => s.value === selectedSkill)?.label ??
                      "All Skills"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SKILLS.map((skill) => (
                    <SelectItem key={skill.value} value={skill.value}>
                      {skill.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members{" "}
            <span className="text-muted-foreground text-sm font-normal ml-2">
              ({filteredUsers.length})
            </span>
          </h2>
        </div>

        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <p>No team members matched your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((member) => (
              <Card key={member._id} className="overflow-hidden flex flex-col">
                <div
                  className={`h-2 ${member.role === "manager" ? "bg-amber-500/20" : "bg-primary/20"}`}
                />
                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base mb-1">
                        {member.name}
                      </CardTitle>
                      <Badge
                        variant={
                          member.role === "manager" ? "default" : "secondary"
                        }
                        className={`capitalize text-[10px] ${
                          member.role === "manager"
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-200"
                            : ""
                        }`}
                      >
                        {member.role === "manager" && (
                          <ShieldHalf className="mr-1 h-3 w-3" />
                        )}
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="truncate">{member.homeTimezone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {member.role === "manager" ? "Manages" : "Certified at"}{" "}
                        {member.role === "manager"
                          ? member.managedLocationsCount
                          : member.certifiedLocationIds.length}{" "}
                        location(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate text-xs">
                        ID: {member.authUserId.substring(0, 10)}...
                      </span>
                    </div>
                  </div>

                  {member.role === "staff" && (
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {member.skills.length > 0 ? (
                          member.skills.map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="capitalize text-[10px] bg-secondary hover:bg-secondary"
                            >
                              {skill.replace(/_/g, " ")}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No skills set
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <div className="p-4 pt-0 mt-auto">
                  {member.role === "staff" ? (
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => setPromotingStaff(member)}
                    >
                      <ShieldHalf className="mr-2 h-3.5 w-3.5" />
                      Promote to Manager
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-xs border-dashed"
                      onClick={() => setDemotingManager(member)}
                    >
                      <UserCog className="mr-2 h-3.5 w-3.5" />
                      Demote to Staff
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PromoteManagerModal
        isOpen={!!promotingStaff}
        onClose={() => setPromotingStaff(null)}
        staffName={promotingStaff?.name ?? ""}
        locations={locations}
        onConfirm={handleConfirmPromotion}
        isSubmitting={isSubmitting}
      />

      <DemoteManagerModal
        isOpen={!!demotingManager}
        onClose={() => setDemotingManager(null)}
        managerName={demotingManager?.name ?? ""}
        onConfirm={handleConfirmDemotion}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
