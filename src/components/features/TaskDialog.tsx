"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Plus, Pencil } from "lucide-react";
import { usePlannerStore } from "@/store/plannerStore";
import type { Task } from "@/types";

// Mapping priorité -> difficulté/importance
const PRIORITY_MAP = {
  low: { difficulty: 1, importance: 1 },
  medium: { difficulty: 2, importance: 3 },
  high: { difficulty: 4, importance: 4 },
  critical: { difficulty: 5, importance: 5 },
} as const;

type PriorityLevel = keyof typeof PRIORITY_MAP;

// Reverse mapping: difficulty/importance -> priority
function getPriorityFromTask(difficulty: number, importance: number): PriorityLevel {
  if (difficulty >= 5 || importance >= 5) return "critical";
  if (difficulty >= 4 || importance >= 4) return "high";
  if (difficulty >= 2 || importance >= 2) return "medium";
  return "low";
}

// Format datetime-local value from ISO string
function formatDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface TaskDialogProps {
  onTaskAdded?: () => void;
  taskToEdit?: Task;
  trigger?: React.ReactNode;
}

export function TaskDialog({ onTaskAdded, taskToEdit, trigger }: TaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const addTask = usePlannerStore((state) => state.addTask);
  const updateTask = usePlannerStore((state) => state.updateTask);

  const isEditMode = !!taskToEdit;

  // Les champs du formulaire
  const [formData, setFormData] = useState({
    title: "",
    deadline: "",
    estimated_hours: "2",
    priority: "medium" as PriorityLevel,
  });

  // Pré-remplir le formulaire en mode édition
  useEffect(() => {
    if (taskToEdit && open) {
      setFormData({
        title: taskToEdit.title,
        deadline: formatDateTimeLocal(taskToEdit.deadline),
        estimated_hours: String(taskToEdit.estimated_hours),
        priority: getPriorityFromTask(taskToEdit.difficulty, taskToEdit.importance),
      });
    } else if (!open) {
      // Reset form when dialog closes
      setFormData({
        title: "",
        deadline: "",
        estimated_hours: "2",
        priority: "medium",
      });
    }
  }, [taskToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Mapper la priorité vers difficulté/importance
    const { difficulty, importance } = PRIORITY_MAP[formData.priority];

    const taskData = {
      title: formData.title,
      deadline: new Date(formData.deadline).toISOString(),
      estimated_hours: parseFloat(formData.estimated_hours),
      difficulty,
      importance,
    };

    let success: boolean;

    if (isEditMode) {
      success = await updateTask(taskToEdit.id, taskData);
      if (success) {
        toast.success("Examen modifié !");
      } else {
        toast.error("Erreur lors de la modification");
      }
    } else {
      success = await addTask(taskData);
      if (success) {
        toast.success("Examen ajouté !");
        onTaskAdded?.();
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    }

    if (success) {
      setOpen(false);
    }
    setLoading(false);
  };

  const defaultTrigger = (
    <Button 
      className="w-full gap-2 rounded-xl border-dashed border-2 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-600 transition-all bg-transparent"
      variant="outline"
    >
      <Plus className="h-4 w-4" />
      Ajouter un examen
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              {isEditMode ? (
                <Pencil className="h-4 w-4 text-indigo-600" />
              ) : (
                <BookOpen className="h-4 w-4 text-indigo-600" />
              )}
            </div>
            {isEditMode ? "Modifier l'examen" : "Ajouter un examen"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          {/* Titre */}
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-sm font-medium text-slate-700">Nom du cours / examen</Label>
            <Input
              id="title"
              placeholder="Ex: Maths - Algèbre Linéaire"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label htmlFor="deadline" className="text-sm font-medium text-slate-700">Date de l&apos;examen</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
              className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
          </div>

          {/* Heures estimées */}
          <div className="grid gap-2">
            <Label htmlFor="hours" className="text-sm font-medium text-slate-700">Heures de révision estimées</Label>
            <Input
              id="hours"
              type="number"
              min="0.5"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              required
              className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
          </div>

          {/* Priorité */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700">Priorité</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: PriorityLevel) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger className="w-full rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200">
                <SelectValue placeholder="Sélectionner une priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Basse</SelectItem>
                <SelectItem value="medium">🟡 Moyenne</SelectItem>
                <SelectItem value="high">🟠 Haute</SelectItem>
                <SelectItem value="critical">🔴 Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md"
            >
              {loading ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}