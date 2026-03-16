"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { format } from "date-fns";

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
import { Users, Mail, Clock, MapPin } from "lucide-react";

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

  // We fetch without filters and do clientside filtering for an instant UI feeling
  const staff = useQuery(api.userProfiles.listStaff, {});

  if (staff === undefined) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const filteredStaff = staff.filter((s) => {
    if (
      selectedLocationId !== "all" &&
      !s.certifiedLocationIds.includes(selectedLocationId as any)
    ) {
      return false;
    }
    if (selectedSkill !== "all" && !s.skills.includes(selectedSkill as any)) {
      return false;
    }
    return true;
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Global Staff Directory
        </h1>
        <p className="text-sm text-muted-foreground">
          View all staff members across the organization.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
          <CardDescription className="sr-only">
            Filter staff by location and skill
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:max-w-xs space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Location Certification
              </label>
              <Select
                value={selectedLocationId}
                onValueChange={(v) => v && setSelectedLocationId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
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

            <div className="w-full sm:max-w-xs space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Skill
              </label>
              <Select
                value={selectedSkill}
                onValueChange={(v) => v && setSelectedSkill(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Skills" />
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
            Staff Members{" "}
            <span className="text-muted-foreground text-sm font-normal ml-2">
              ({filteredStaff.length})
            </span>
          </h2>
        </div>

        {filteredStaff.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <p>No staff members matched your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((member) => (
              <Card key={member._id} className="overflow-hidden">
                <div className="h-2 bg-primary/20" />
                <CardHeader className="pb-3 pt-5">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="truncate pr-4">{member.name}</span>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {member.role}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="truncate">{member.homeTimezone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        Certified at {member.certifiedLocationIds.length}{" "}
                        location(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate text-xs">
                        Auth ID: {member.authUserId.substring(0, 10)}...
                      </span>
                    </div>
                  </div>

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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
