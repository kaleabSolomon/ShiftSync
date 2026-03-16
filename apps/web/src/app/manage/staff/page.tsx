"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import { Badge } from "@ShiftSync/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";

export default function ManageStaffPage() {
  const staff = useQuery(api.userProfiles.listStaff, {});

  if (staff === undefined) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Members</h1>
        <p className="text-sm text-muted-foreground">
          View staff for your managed locations ({staff.length} total).
        </p>
      </div>

      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No staff members found for your locations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <Card key={member._id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {member.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">
                    Skills:
                  </span>
                  {member.skills.length > 0 ? (
                    member.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="capitalize text-xs"
                      >
                        {skill.replace(/_/g, " ")}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      None
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Timezone: {member.homeTimezone} · Certified at{" "}
                  {member.certifiedLocationIds.length} location(s)
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
