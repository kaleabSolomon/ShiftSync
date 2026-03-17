"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, Clock, MapPin, X } from "lucide-react";

import { Badge } from "@ShiftSync/ui/components/badge";
import { Button } from "@ShiftSync/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ShiftSync/ui/components/tabs";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
        >
          Pending
        </Badge>
      );
    case "accepted":
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
        >
          Accepted — Awaiting Manager
        </Badge>
      );
    case "approved":
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
        >
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          Rejected
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// A single enriched swap card row
function SwapCard({
  swap,
  currentUserId,
  onAccept,
  onReject,
}: {
  swap: {
    _id: Id<"swapRequests">;
    shiftId: Id<"shifts">;
    requesterId: Id<"userProfiles">;
    targetId: Id<"userProfiles">;
    status: string;
    createdAt: number;
  };
  currentUserId: Id<"userProfiles">;
  onAccept?: (id: Id<"swapRequests">) => void;
  onReject?: (id: Id<"swapRequests">) => void;
}) {
  const shift = useQuery(api.shifts.getShift, { shiftId: swap.shiftId });
  const requester = useQuery(api.userProfiles.getProfileById, {
    userId: swap.requesterId,
  });
  const target = useQuery(api.userProfiles.getProfileById, {
    userId: swap.targetId,
  });

  const isRequester = swap.requesterId === currentUserId;
  const otherPerson = isRequester ? target : requester;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-3 transition-colors hover:bg-muted/30">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">
            {isRequester
              ? `Swap with ${otherPerson?.name ?? "…"}`
              : `Request from ${otherPerson?.name ?? "…"}`}
          </span>
          <StatusBadge status={swap.status} />
        </div>

        {shift ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(shift.startTime, "EEE, MMM d")} ·{" "}
              {format(shift.startTime, "h:mm a")} –{" "}
              {format(shift.endTime, "h:mm a")}
            </span>
            {shift.locationId && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {(shift as { location?: { name?: string } }).location?.name ??
                  "Location"}
              </span>
            )}
            <Badge variant="secondary" className="capitalize text-[10px]">
              {shift.requiredSkill.replace(/_/g, " ")}
            </Badge>
          </div>
        ) : (
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        )}

        <p className="text-xs text-muted-foreground">
          Requested {format(swap.createdAt, "PP")}
        </p>
      </div>

      {/* Action buttons: receiver can accept/reject pending, either side can see status */}
      {!isRequester && swap.status === "pending" && onAccept && onReject && (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            onClick={() => onReject(swap._id)}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Decline
          </Button>
          <Button size="sm" onClick={() => onAccept(swap._id)}>
            <Check className="mr-1 h-3.5 w-3.5" />
            Accept
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SwapsPage() {
  const profile = useQuery(api.userProfiles.getMyProfile);
  const allSwaps = useQuery(
    api.swapRequests.listSwapRequests,
    profile ? {} : "skip",
  );

  const acceptSwap = useMutation(api.swapRequests.acceptSwap);
  const rejectSwap = useMutation(api.swapRequests.rejectSwap);

  const handleAccept = async (swapRequestId: Id<"swapRequests">) => {
    try {
      await acceptSwap({ swapRequestId });
      toast.success("Swap accepted! Your manager will be notified.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to accept swap";
      toast.error(message);
    }
  };

  const handleReject = async (swapRequestId: Id<"swapRequests">) => {
    try {
      await rejectSwap({ swapRequestId });
      toast.success("Swap declined.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to decline swap";
      toast.error(message);
    }
  };

  if (!profile || allSwaps === undefined) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const sent = allSwaps.filter((s) => s.requesterId === profile._id);
  const received = allSwaps.filter((s) => s.targetId === profile._id);

  const pendingSentCount = sent.filter((s) => s.status === "pending").length;
  const pendingReceivedCount = received.filter(
    (s) => s.status === "pending",
  ).length;

  const renderEmpty = (message: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Swap Requests</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your shift swap requests.
        </p>
      </div>

      <Tabs defaultValue="received" className="space-y-4">
        <TabsList>
          <TabsTrigger value="received">
            Received
            {pendingReceivedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingReceivedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent
            {pendingSentCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingSentCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Received Requests</CardTitle>
              <CardDescription>
                Swap requests others have sent you. Accept or decline them
                below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {received.length === 0 ? (
                renderEmpty("No swap requests received.")
              ) : (
                <div className="space-y-3">
                  {received.map((swap) => (
                    <SwapCard
                      key={swap._id}
                      swap={swap}
                      currentUserId={profile._id}
                      onAccept={handleAccept}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sent Requests</CardTitle>
              <CardDescription>
                Swaps you've requested with other staff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent.length === 0 ? (
                renderEmpty(
                  "You haven't sent any swap requests. Go to your schedule to request one.",
                )
              ) : (
                <div className="space-y-3">
                  {sent.map((swap) => (
                    <SwapCard
                      key={swap._id}
                      swap={swap}
                      currentUserId={profile._id}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
