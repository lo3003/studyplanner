"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
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
import { BookOpen, Plus } from "lucide-react";

// Cette fonction permet de dire au parent "Hey, j'ai fini d'ajouter une tâche !"
interface TaskDialogProps {
  onTaskAdded: () => void;
}

export function TaskDialog({ onTaskAdded }: TaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Les champs du formulaire
  const [formData, setFormData] = useState({
    title: "",
    deadline: "",
    estimated_hours: "2",
    difficulty: "3",
    importance: "3",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Récupérer l'utilisateur courant
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    // 2. Sauvegarder dans Supabase
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: formData.title,
      deadline: new Date(formData.deadline).toISOString(),
      estimated_hours: parseFloat(formData.estimated_hours),
      difficulty: parseInt(formData.difficulty),
      importance: parseInt(formData.importance),
    });

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Examen ajouté !");
      setOpen(false); // Fermer la fenêtre
      setFormData({ title: "", deadline: "", estimated_hours: "2", difficulty: "3", importance: "3" }); // Reset
      onTaskAdded(); // Rafraichir la liste derrière
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full gap-2 rounded-xl border-dashed border-2 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-600 transition-all bg-transparent"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Ajouter un examen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-indigo-600" />
            </div>
            Ajouter un examen
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

          {/* Difficulté & Importance (Côte à côte) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-slate-700">Difficulté (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-slate-700">Importance (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.importance}
                onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
                className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
              />
            </div>
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