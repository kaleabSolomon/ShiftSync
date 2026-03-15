"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import UserMenu from "@/components/user-menu";

export default function Home() {
  const [showSignIn, setShowSignIn] = useState(false);
  const privateData = useQuery(api.privateData.get);

  return (
    <>
      <Authenticated>
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
          <section className="rounded-lg border p-4 mb-6">
            <h2 className="mb-2 font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Private Data
            </h2>
            <p className="text-lg">
              {privateData?.message || "No data available"}
            </p>
          </section>
          <UserMenu />
        </div>
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
