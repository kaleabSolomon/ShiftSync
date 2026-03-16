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
import { Textarea } from "@ShiftSync/ui/components/textarea";

interface OverrideReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  warnings: string[];
  isSubmitting?: boolean;
}

export function OverrideReasonModal({
  isOpen,
  onClose,
  onConfirm,
  warnings,
  isSubmitting,
}: OverrideReasonModalProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (reason.trim().length >= 10) {
      onConfirm(reason);
      setReason("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-600">
            Override Required
          </DialogTitle>
          <DialogDescription>
            This assignment triggers scheduling warnings. To proceed, you must
            provide a reason for the override.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-900">
            <ul className="list-disc pl-4 space-y-1 text-amber-800 dark:text-amber-200">
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-foreground">
              Justification Reason
            </label>
            <Textarea
              placeholder="e.g., Short-staffed due to illness, approved by GM."
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setReason(e.target.value)
              }
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/10 minimum characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={reason.trim().length < 10 || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? "Overriding..." : "Confirm Override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
