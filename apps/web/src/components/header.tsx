"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@ShiftSync/backend/convex/_generated/api";

import { ModeToggle } from "./mode-toggle";
import { NotificationBadge } from "./notification-badge";

export default function Header() {
  const profile = useQuery(api.userProfiles.getMyProfile);

  const renderLinks = () => {
    // If not loaded or no profile (unauthenticated), just show home
    if (profile === undefined || profile === null) {
      return (
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
      );
    }

    if (profile.role === "staff") {
      return (
        <>
          <Link href="/dashboard" className="hover:text-primary">
            My Schedule
          </Link>
          <Link href="/dashboard/swaps" className="hover:text-primary">
            Swap Requests
          </Link>
        </>
      );
    }

    if (profile.role === "manager" || profile.role === "admin") {
      return (
        <>
          <Link href="/dashboard" className="hover:text-primary">
            Location Schedule
          </Link>
          <Link href="/dashboard/metrics" className="hover:text-primary">
            Metrics & Analytics
          </Link>
          <Link href="/dashboard/audit" className="hover:text-primary">
            Audit Logs
          </Link>
        </>
      );
    }
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold tracking-tight"
          >
            ShiftSync
          </Link>
          <nav className="hidden gap-6 text-sm font-medium transition-colors md:flex">
            {renderLinks()}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ModeToggle />
          {profile && <NotificationBadge />}
        </div>
      </div>
    </div>
  );
}
