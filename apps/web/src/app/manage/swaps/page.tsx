"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
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
import { Check, X } from "lucide-react";

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
      toast.success("Swap approved.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Approval failed";
      toast.error(message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectSwap({
        swapRequestId: id as Parameters<typeof rejectSwap>[0]["swapRequestId"],
      });
      toast.success("Swap rejected.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Rejection failed";
      toast.error(message);
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
                <div
                  key={swap._id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Swap Request</span>
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700"
                      >
                        Awaiting Approval
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested {format(swap.createdAt, "PP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleApprove(swap._id)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleReject(swap._id)}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
