"use client";

import { StaffDashboard } from "@/components/dashboard/staff-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { api } from "@ShiftSync/backend/convex/_generated/api";
import { useQuery } from "convex/react";

export default function DashboardIndex() {
  const profile = useQuery(api.userProfiles.getMyProfile);

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {profile.role === "staff" ? (
        <StaffDashboard staffId={profile._id} />
      ) : (
        <ManagerDashboard managerId={profile._id} />
      )}
    </div>
  );
}
