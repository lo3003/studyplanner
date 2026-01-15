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
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
      toast.success("Tâche ajoutée !");
      setOpen(false); // Fermer la fenêtre
      setFormData({ title: "", deadline: "", estimated_hours: "2", difficulty: "3", importance: "3" }); // Reset
      onTaskAdded(); // Rafraichir la liste derrière
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">+ Ajouter une tâche</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un examen / projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          {/* Titre */}
          <div className="grid gap-2">
            <Label htmlFor="title">Nom du cours</Label>
            <Input
              id="title"
              placeholder="Ex: Maths - Algèbre"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label htmlFor="deadline">Date de l'examen (Deadline)</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
          </div>

          {/* Heures estimées */}
          <div className="grid gap-2">
            <Label htmlFor="hours">Heures de révision nécessaires (Estimation)</Label>
            <Input
              id="hours"
              type="number"
              min="0.5"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              required
            />
          </div>

          {/* Difficulté & Importance (Côte à côte) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Difficulté (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Importance (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.importance}
                onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Sauvegarde..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}