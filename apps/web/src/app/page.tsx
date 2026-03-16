"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { useEffect, useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import UserMenu from "@/components/user-menu";
import { StaffDashboard } from "@/components/dashboard/staff-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";

function Dashboard() {
  const profile = useQuery(api.userProfiles.getMyProfile);
  const ensureProfile = useMutation(api.userProfiles.ensureProfile);

  useEffect(() => {
    // If authenticated but no profile exists, create one
    if (profile === null) {
      ensureProfile();
    }
  }, [profile, ensureProfile]);

  if (!profile) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="text-muted-foreground animate-pulse">
          Setting up your profile...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile.name}
          </h1>
          <p className="text-muted-foreground capitalize">
            Signed in as {profile.role}
          </p>
        </div>
        <UserMenu />
      </div>

      {profile.role === "staff" ? (
        <StaffDashboard staffId={profile._id} />
      ) : (
        <ManagerDashboard managerId={profile._id} />
      )}
    </div>
  );
}

export default function Home() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <Authenticated>
        <Dashboard />
      </Authenticated>
      <Unauthenticated>
        <div className="flex min-h-[80vh] items-center justify-center">
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Loading...</div>
        </div>
      </AuthLoading>
    </>
  );
}
