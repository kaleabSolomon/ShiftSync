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
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="text-muted-foreground animate-pulse">
          Setting up your profile...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <section className="rounded-lg border p-4 mb-6">
        <h2 className="mb-2 font-medium text-sm text-muted-foreground uppercase tracking-wider">
          Your Profile
        </h2>
        <div className="space-y-1">
          <p className="text-lg font-medium">{profile.name}</p>
          <p className="text-sm text-muted-foreground capitalize">
            Role: {profile.role}
          </p>
        </div>
      </section>
      <UserMenu />
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
