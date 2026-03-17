"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { useEffect, useRef, useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { StaffDashboard } from "@/components/dashboard/staff-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";

function Dashboard() {
  const { isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.userProfiles.getMyProfile);
  const ensureProfile = useMutation(api.userProfiles.ensureProfile);
  const ensureProfileCalled = useRef(false);

  useEffect(() => {
    // Only call when Convex confirms we're authenticated AND profile is null
    if (isAuthenticated && profile === null && !ensureProfileCalled.current) {
      ensureProfileCalled.current = true;
      ensureProfile().catch(() => {
        ensureProfileCalled.current = false;
      });
    }
  }, [isAuthenticated, profile, ensureProfile]);

  if (!profile) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-muted-foreground animate-pulse">
          Getting you started...
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
        </div>
      </div>

      {profile.role === "staff" ? (
        <StaffDashboard staffId={profile._id} />
      ) : (
        <ManagerDashboard
          managerId={profile._id}
          isAdmin={profile.role === "admin"}
        />
      )}
    </div>
  );
}

import { LandingPage } from "@/components/landing-page";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const authSearch = searchParams.get("auth");

  const showSignIn = authSearch === "login";
  const showSignUp = authSearch === "signup";
  const isLanding = !showSignIn && !showSignUp;

  const switchToSignIn = () => router.push("/?auth=login");
  const switchToSignUp = () => router.push("/?auth=signup");

  return (
    <>
      <Authenticated>
        <Dashboard />
      </Authenticated>
      <Unauthenticated>
        {isLanding ? (
          <LandingPage />
        ) : (
          <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
              {showSignIn ? (
                <SignInForm onSwitchToSignUp={switchToSignUp} />
              ) : (
                <SignUpForm onSwitchToSignIn={switchToSignIn} />
              )}
            </div>
          </div>
        )}
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Loading...</div>
        </div>
      </AuthLoading>
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Loading...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
