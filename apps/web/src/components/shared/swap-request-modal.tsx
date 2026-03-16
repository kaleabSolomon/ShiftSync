import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@ShiftSync/ui/components/dialog";
import { Button } from "@ShiftSync/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ShiftSync/ui/components/select";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";

interface StaffMember {
  _id: Id<"userProfiles">;
  name: string;
}

interface SwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  onRequestSwap: (targetStaffId: Id<"userProfiles">) => void;
  isSubmitting?: boolean;
}

export function SwapRequestModal({
  isOpen,
  onClose,
  staffList,
  onRequestSwap,
  isSubmitting,
}: SwapRequestModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<
    Id<"userProfiles"> | undefined
  >(undefined);

  const handleSubmit = () => {
    if (selectedStaffId) {
      onRequestSwap(selectedStaffId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Shift Swap</DialogTitle>
          <DialogDescription>
            Select a co-worker to request a shift swap. They must have the same
            skills and location certification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Staff Member</label>
            <Select
              value={selectedStaffId ?? ""}
              onValueChange={(val) =>
                val && setSelectedStaffId(val as Id<"userProfiles">)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a co-worker" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((staff) => (
                  <SelectItem key={staff._id} value={staff._id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStaffId || isSubmitting}
          >
            {isSubmitting ? "Requesting..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
