import { useState } from "react";
import { type Id } from "@ShiftSync/backend/convex/_generated/dataModel";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ShiftSync/ui/components/dialog";
import { Button } from "@ShiftSync/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ShiftSync/ui/components/select";
import { AlertTriangle } from "lucide-react";

export function PromoteManagerModal({
  isOpen,
  onClose,
  staffName,
  locations,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
  locations: { _id: Id<"locations">; name: string }[];
  onConfirm: (locationId: Id<"locations">) => void;
  isSubmitting: boolean;
}) {
  const [selectedLocationId, setSelectedLocationId] = useState<
    Id<"locations"> | undefined
  >(undefined);

  const handleConfirm = () => {
    if (!selectedLocationId) return;
    onConfirm(selectedLocationId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote to Manager</DialogTitle>
          <DialogDescription>
            You are promoting <strong>{staffName}</strong> to Manager. They will
            require a primary location to manage schedules and approvals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign to Location</label>
            <Select
              value={selectedLocationId}
              onValueChange={(val) =>
                setSelectedLocationId(val as Id<"locations">)
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {locations.find((l) => l._id === selectedLocationId)?.name ??
                    "Select a location"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc._id} value={loc._id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex gap-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Impact on Assignments</p>
              <p>
                Any existing shift assignments {staffName} currently holds will
                remain active unless manually removed, but as a Manager they
                should generally be removed from staff schedules.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedLocationId || isSubmitting}
          >
            {isSubmitting ? "Promoting..." : "Confirm Promotion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
