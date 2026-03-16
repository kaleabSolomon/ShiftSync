import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@ShiftSync/ui/components/dialog";
import { Button } from "@ShiftSync/ui/components/button";
import { Badge } from "@ShiftSync/ui/components/badge";
import type { Id } from "@ShiftSync/backend/convex/_generated/dataModel";

interface StaffMember {
  _id: Id<"userProfiles">;
  name: string;
  skills: string[];
}

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftTime: number;
  requiredSkill: string;
  availableStaff: StaffMember[];
  onAssign: (staffId: Id<"userProfiles">) => void;
}

export function AssignStaffModal({
  isOpen,
  onClose,
  shiftTime,
  requiredSkill,
  availableStaff,
  onAssign,
}: AssignStaffModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Staff</DialogTitle>
          <DialogDescription>
            Assign available staff members to the {format(shiftTime, "PPp")}{" "}
            shift.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm font-medium mb-2">
            Available {requiredSkill.replace(/_/g, " ")}s
          </p>
          {availableStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No available staff for this skill.
            </p>
          ) : (
            availableStaff.map((staff) => (
              <div
                key={staff._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3"
              >
                <div>
                  <p className="font-medium text-sm">{staff.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {staff.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-[10px] capitalize px-1 py-0 h-4"
                      >
                        {skill.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button size="sm" onClick={() => onAssign(staff._id)}>
                  Assign
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
