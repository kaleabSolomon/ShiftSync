"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@ShiftSync/ui/components/button";
import { cn } from "@ShiftSync/ui/lib/utils";

export function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-[var(--header-height,3.5rem)])] bg-background text-foreground px-4 text-center">
      <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-forwards">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-balance">
            Scheduling without the chaos
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground md:text-2xl text-balance max-w-2xl mx-auto font-medium">
            The all-in-one platform for effortless shifts, swaps, and staff
            management. Built for modern teams.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link
            href="/?auth=signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full sm:w-auto text-base h-12 px-8 font-semibold rounded-full",
            )}
          >
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="/?auth=login"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "w-full sm:w-auto text-base h-12 px-8 font-semibold rounded-full",
            )}
          >
            Log In
          </Link>
        </div>
      </div>

      {/* Decorative background gradients to make it sleek */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] opacity-50"></div>
    </div>
  );
}
