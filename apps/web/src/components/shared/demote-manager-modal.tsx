import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ShiftSync/ui/components/dialog";
import { Button } from "@ShiftSync/ui/components/button";

export function DemoteManagerModal({
  isOpen,
  onClose,
  managerName,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  managerName: string;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demote to Staff</DialogTitle>
          <DialogDescription>
            You are demoting <strong>{managerName}</strong> to Staff. They will
            lose access to the Manager Dashboard and scheduling capabilities.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Demoting..." : "Confirm Demotion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
