import { AlertTriangle, AlertCircle } from "lucide-react";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@ShiftSync/ui/components/alert";

interface ConstraintErrorProps {
  errors: string[];
  warnings: string[];
}

export function ConstraintErrorDisplay({
  errors,
  warnings,
}: ConstraintErrorProps) {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cannot Assign Staff</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert
          variant="default"
          className="border-amber-500/50 text-amber-900 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-200"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">
            Warnings
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs opacity-80">
              You may override these warnings if necessary, but this will be
              logged.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
