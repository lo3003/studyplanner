"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { CalendarPlus, Trash2, Clock, Plus } from "lucide-react";
import { usePlannerStore } from "@/store/plannerStore";
import type { FixedEvent, CreateFixedEventInput } from "@/types";

// ============================================
// Fixed Event Dialog (Create/Edit)
// ============================================

interface FixedEventDialogProps {
  event?: FixedEvent; // If provided, we're in edit mode
  onClose?: () => void;
}

export function FixedEventDialog({ event, onClose }: FixedEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const addFixedEvent = usePlannerStore((state) => state.addFixedEvent);
  const updateFixedEvent = usePlannerStore((state) => state.updateFixedEvent);

  const isEditMode = !!event;

  // Form state
  const [formData, setFormData] = useState({
    title: event?.title ?? "",
    startDate: event ? formatDateTimeLocal(event.start_at) : "",
    endDate: event ? formatDateTimeLocal(event.end_at) : "",
    description: event?.description ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    const startAt = new Date(formData.startDate);
    const endAt = new Date(formData.endDate);

    if (endAt <= startAt) {
      toast.error("La date de fin doit être après la date de début");
      setLoading(false);
      return;
    }

    const payload: CreateFixedEventInput = {
      title: formData.title,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      description: formData.description || undefined,
    };

    let success: boolean;

    if (isEditMode && event) {
      success = await updateFixedEvent(event.id, payload);
    } else {
      success = await addFixedEvent(payload);
    }

    if (success) {
      toast.success(isEditMode ? "Événement modifié !" : "Événement fixe ajouté !");
      setOpen(false);
      onClose?.();
      // Reset form
      if (!isEditMode) {
        setFormData({ title: "", startDate: "", endDate: "", description: "" });
      }
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }

    setLoading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full gap-2 rounded-xl border-dashed border-2 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-600 transition-all"
        >
          <Plus className="h-4 w-4" />
          Ajouter un événement fixe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <CalendarPlus className="h-4 w-4 text-indigo-600" />
            </div>
            {isEditMode ? "Modifier l'événement" : "Nouvel événement fixe"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="fe-title" className="text-sm font-medium text-slate-700">Nom de l&apos;événement</Label>
            <Input
              id="fe-title"
              placeholder="Ex: Cours de Physique, RDV médecin..."
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
          </div>

          {/* Start Date */}
          <div className="grid gap-2">
            <Label htmlFor="fe-start" className="text-sm font-medium text-slate-700">Début</Label>
            <Input
              id="fe-start"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              required
              className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
          </div>

          {/* End Date */}
          <div className="grid gap-2">
            <Label htmlFor="fe-end" className="text-sm font-medium text-slate-700">Fin</Label>
            <Input
              id="fe-end"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              required
              className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
          </div>

          {/* Description (optional) */}
          <div className="grid gap-2">
            <Label htmlFor="fe-desc" className="text-sm font-medium text-slate-700">Description (optionnel)</Label>
            <Input
              id="fe-desc"
              placeholder="Notes supplémentaires..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
            />
          </div>

          <DialogFooter className="mt-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md"
            >
              {loading ? "Sauvegarde..." : isEditMode ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Fixed Event List Item (with delete)
// ============================================

interface FixedEventItemProps {
  event: FixedEvent;
}

export function FixedEventItem({ event }: FixedEventItemProps) {
  const [deleting, setDeleting] = useState(false);
  const deleteFixedEvent = usePlannerStore((state) => state.deleteFixedEvent);

  const handleDelete = async () => {
    if (!confirm(`Supprimer "${event.title}" ?`)) return;

    setDeleting(true);
    const success = await deleteFixedEvent(event.id);
    
    if (success) {
      toast.success("Événement supprimé");
    } else {
      toast.error("Erreur lors de la suppression");
    }
    setDeleting(false);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-slate-800 truncate">{event.title}</h4>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <p className="text-xs text-slate-500">
            {formatDisplayDate(event.start_at)} → {formatDisplayDate(event.end_at)}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDisplayDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
