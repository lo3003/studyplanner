"use client";

import { AlertTriangle, X, Clock, RefreshCw } from "lucide-react";
import { usePlannerStore } from "@/store/plannerStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ============================================
// Warning Alert Component
// Displays scheduler warnings for unscheduled tasks
// ============================================

export function WarningAlert() {
  const generationWarnings = usePlannerStore((state) => state.generationWarnings);
  const clearGenerationWarnings = usePlannerStore((state) => state.clearGenerationWarnings);
  const generateSchedule = usePlannerStore((state) => state.generateSchedule);
  const isGenerating = usePlannerStore((state) => state.isGenerating);

  // Don't render if no warnings
  if (generationWarnings.length === 0) {
    return null;
  }

  const handleRegenerate = async () => {
    await generateSchedule();
  };

  const totalUnscheduledHours = generationWarnings.reduce(
    (sum, warning) => sum + warning.unscheduledHours,
    0
  );

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Tâches partiellement planifiées
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
            onClick={clearGenerationWarnings}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </Button>
        </div>

        {/* Summary */}
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
          <Clock className="mr-1 inline h-4 w-4" />
          {totalUnscheduledHours.toFixed(1)}h non planifiées sur{" "}
          {generationWarnings.length} tâche{generationWarnings.length > 1 ? "s" : ""}
        </p>

        {/* Warning List */}
        <ul className="mt-3 space-y-2">
          {generationWarnings.map((warning) => (
            <li
              key={warning.taskId}
              className="flex items-start gap-2 rounded-md bg-amber-100 p-2 text-sm dark:bg-amber-900"
            >
              <span className="flex-1 text-amber-800 dark:text-amber-200">
                <strong>{warning.taskTitle}</strong>
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  — {warning.message}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="border-amber-300 bg-white text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-200 dark:hover:bg-amber-800"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Replanification..." : "Replanifier"}
          </Button>
          <p className="flex items-center text-xs text-amber-600 dark:text-amber-400">
            Conseil : Étendez les deadlines ou réduisez les heures estimées pour ces tâches.
          </p>
        </div>
      </div>
    </Card>
  );
}
