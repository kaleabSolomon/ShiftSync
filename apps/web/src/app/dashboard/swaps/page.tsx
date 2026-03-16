"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { format } from "date-fns";

import { Badge } from "@ShiftSync/ui/components/badge";
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

export default function SwapsPage() {
  const profile = useQuery(api.userProfiles.getMyProfile);
  const allSwaps = useQuery(
    api.swapRequests.listSwapRequests,
    profile ? {} : "skip",
  );

  if (!profile || allSwaps === undefined) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Split into sent (requester) and received (target)
  const sent = allSwaps.filter((s) => s.requesterId === profile._id);
  const received = allSwaps.filter((s) => s.targetId === profile._id);

  const renderSwapList = (
    swaps: typeof allSwaps,
    emptyMessage: string,
    direction: "sent" | "received",
  ) => {
    if (swaps.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {swaps.map((swap) => (
          <div
            key={swap._id}
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Swap Request</span>
                <StatusBadge status={swap.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Requested {format(swap.createdAt, "PP")}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Swap Requests</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your shift swap requests.
        </p>
      </div>

      <Tabs defaultValue="sent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sent">
            Sent
            {sent.filter((s) => s.status === "pending").length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sent.filter((s) => s.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received">
            Received
            {received.filter((s) => s.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {received.filter((s) => s.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sent Requests</CardTitle>
              <CardDescription>
                Swaps you've requested with other staff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSwapList(
                sent,
                "You haven't sent any swap requests.",
                "sent",
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Received Requests</CardTitle>
              <CardDescription>
                Swap requests others have sent you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSwapList(
                received,
                "No swap requests received.",
                "received",
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
