"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@ShiftSync/ui/components/badge";
import { Button } from "@ShiftSync/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";
import { Check, X, ArrowRightLeft } from "lucide-react";

function extractErrorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    return typeof err.data === "string" ? err.data : "Operation failed";
  }
  if (err instanceof Error) return err.message;
  return "Operation failed";
}

/** Sub-component that resolves and renders details for a single swap card */
function SwapCard({
  swap,
  onApprove,
  onReject,
}: {
  swap: {
    _id: Id<"swapRequests">;
    shiftId: Id<"shifts">;
    requesterId: Id<"userProfiles">;
    targetId: Id<"userProfiles">;
    createdAt: number;
    status: string;
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const requester = useQuery(api.userProfiles.getProfileById, {
    userId: swap.requesterId,
  });
  const target = useQuery(api.userProfiles.getProfileById, {
    userId: swap.targetId,
  });
  const shift = useQuery(api.shifts.getShift, { shiftId: swap.shiftId });

  const requesterName = requester?.name ?? "Loading...";
  const targetName = target?.name ?? "Loading...";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4">
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{requesterName}</span>
          <span className="text-xs text-muted-foreground">→</span>
          <span className="font-medium text-sm truncate">{targetName}</span>
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
          >
            Awaiting Approval
          </Badge>
        </div>
        {shift && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              <span className="font-medium">Shift:</span>{" "}
              {format(shift.startTime, "EEE MMM d, h:mm a")} –{" "}
              {format(shift.endTime, "h:mm a")}
            </p>
            <p>
              <span className="font-medium">Skill:</span>{" "}
              <span className="capitalize">
                {shift.requiredSkill.replace(/_/g, " ")}
              </span>
              {shift.location && (
                <>
                  {" · "}
                  <span className="font-medium">Location:</span>{" "}
                  {shift.location.name}
                </>
              )}
            </p>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Requested {format(swap.createdAt, "PP 'at' p")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={() => onApprove(swap._id)}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onReject(swap._id)}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Reject
        </Button>
      </div>
    </div>
  );
}

export default function ManageSwapsPage() {
  const swapRequests = useQuery(api.swapRequests.listSwapRequests, {
    status: "accepted",
  });
  const approveSwap = useMutation(api.swapRequests.approveSwap);
  const rejectSwap = useMutation(api.swapRequests.rejectSwap);

  if (swapRequests === undefined) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleApprove = async (id: string) => {
    try {
      await approveSwap({
        swapRequestId: id as Parameters<typeof approveSwap>[0]["swapRequestId"],
      });
      toast.success("Swap approved successfully.");
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectSwap({
        swapRequestId: id as Parameters<typeof rejectSwap>[0]["swapRequestId"],
      });
      toast.success("Swap rejected.");
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Swap Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Review swap requests that have been accepted by target staff and need
          your approval.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Pending Approvals ({swapRequests.length})
          </CardTitle>
          <CardDescription>
            These swaps have been accepted by the target staff member and are
            awaiting your final approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {swapRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                No swap requests pending approval.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {swapRequests.map((swap) => (
                <SwapCard
                  key={swap._id}
                  swap={swap}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
