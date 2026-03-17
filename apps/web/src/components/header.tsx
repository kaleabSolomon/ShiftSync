"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "@ShiftSync/backend/convex/_generated/api";

import { ModeToggle } from "./mode-toggle";
import { NotificationBadge } from "./notification-badge";
import UserMenu from "./user-menu";

function AuthenticatedNav() {
  const profile = useQuery(api.userProfiles.getMyProfile);

  if (!profile) return null;

  return (
    <>
      <nav className="hidden gap-6 text-sm font-medium transition-colors md:flex">
        {profile.role === "staff" ? (
          <>
            <Link href="/dashboard/schedule" className="hover:text-primary">
              Schedule
            </Link>
            <Link href="/dashboard/availability" className="hover:text-primary">
              Availability
            </Link>
            <Link href="/dashboard/swaps" className="hover:text-primary">
              Swaps
            </Link>
          </>
        ) : (
          <>
            {profile.role === "admin" ? (
              <>
                <Link href="/admin/locations" className="hover:text-primary">
                  Locations
                </Link>
                <Link href="/admin/staff" className="hover:text-primary">
                  Global Staff
                </Link>
                <Link href="/admin/schedule" className="hover:text-primary">
                  Global Schedule
                </Link>
                <Link href="/admin/analytics" className="hover:text-primary">
                  Analytics
                </Link>
                <Link href="/admin/audit" className="hover:text-primary">
                  Audit Logs
                </Link>
              </>
            ) : (
              <>
                <Link href="/manage/shifts" className="hover:text-primary">
                  Shifts
                </Link>
                <Link href="/manage/schedule" className="hover:text-primary">
                  Schedule
                </Link>
                <Link href="/manage/staff" className="hover:text-primary">
                  Staff
                </Link>
                <Link href="/manage/swaps" className="hover:text-primary">
                  Swaps
                </Link>
                <Link href="/manage/analytics" className="hover:text-primary">
                  Analytics
                </Link>
              </>
            )}
          </>
        )}
      </nav>
    </>
  );
}

export default function Header() {
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
          <Authenticated>
            <AuthenticatedNav />
          </Authenticated>
          <Unauthenticated>
            <nav className="hidden gap-6 text-sm font-medium transition-colors md:flex">
              <Link href="/" className="hover:text-primary">
                Home
              </Link>
            </nav>
          </Unauthenticated>
        </div>

        <div className="flex items-center gap-4">
          <Unauthenticated>
            <Link
              href="/?auth=login"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Login
            </Link>
          </Unauthenticated>
          <Authenticated>
            <div className="flex items-center gap-2">
              <NotificationBadge />
              <UserMenu />
            </div>
          </Authenticated>
          <ModeToggle />
        </div>
      </div>
    </div>
  );
}
