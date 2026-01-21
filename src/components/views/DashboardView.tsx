"use client";

import { usePlannerStore, selectTasks, selectFixedEvents, selectIsGenerating } from "@/store/plannerStore";
import { TaskDialog } from "@/components/features/TaskDialog";
import { FixedEventDialog, FixedEventItem } from "@/components/features/FixedEventDialog"; // Assuming FixedEventItem is exported or I will need to refactor
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Plus, Clock, Trash2, Pencil, CalendarClock, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Task, FixedEvent } from "@/types";

// Re-using/Refactoring TaskItem locally since it was inline in page.tsx previously
function TaskItem({ task, onDelete }: { task: Task; onDelete: (e: React.MouseEvent) => void }) {
    const deadline = new Date(task.deadline);
    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isUrgent = daysLeft <= 3 && daysLeft > 0;

    return (
        <div className="group flex items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="min-w-0 flex-1 flex items-center gap-4">
                {/* Difficulty Badge */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-sm shrink-0 bg-gradient-to-br ${(task.importance || 1) >= 5 ? 'from-red-500 to-rose-600' :
                    (task.importance || 1) >= 4 ? 'from-orange-500 to-amber-500' :
                        'from-blue-500 to-cyan-500'
                    }`}>
                    {task.difficulty}
                </div>

                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{task.title}</span>
                        {isUrgent && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">URGENT</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {task.estimated_hours}h révision</span>
                        <span className="flex items-center"><CalendarClock className="w-3.5 h-3.5 mr-1" /> {deadline.toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <TaskDialog
                    taskToEdit={task}
                    trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 text-slate-400 hover:text-blue-600">
                            <Pencil className="w-4 h-4" />
                        </Button>
                    }
                />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-8 w-8 hover:bg-red-50 text-slate-400 hover:text-red-500"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

export function DashboardView() {
    const tasks = usePlannerStore(selectTasks);
    const fixedEvents = usePlannerStore(selectFixedEvents);
    const isGenerating = usePlannerStore(selectIsGenerating);
    const generateSchedule = usePlannerStore((state) => state.generateSchedule);
    const clearSchedule = usePlannerStore((state) => state.clearSchedule);
    const deleteTask = usePlannerStore((state) => state.deleteTask);
    const fetchAll = usePlannerStore((state) => state.fetchAll);

    // Mock Settings State
    const [settings, setSettings] = useState({
        startTime: "08:00",
        endTime: "22:00",
        breakDuration: "15"
    });

    const handleGenerate = async () => {
        const result = await generateSchedule();
        if (result) {
            if (result.success) {
                toast.success("Planning généré avec succès !");
            } else {
                toast.warning("Planning généré avec des conflits.");
            }
        }
    };

    const handleReset = async () => {
        if (confirm("Êtes-vous sûr de vouloir réinitialiser le planning ? Cela effacera toutes les sessions générées mais conservera vos examens.")) {
            await clearSchedule();
            toast.success("Planning réinitialisé");
        }
    };

    const handleDeleteTask = async (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Supprimer ${task.title}?`)) {
            await deleteTask(task.id);
            toast.success("Tâche supprimée");
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
            {/* Left Column: Lists */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden min-w-0">

                {/* Examens Section */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Liste des Examens
                        </h2>
                        <TaskDialog
                            trigger={
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 rounded-lg">
                                    <Plus className="w-4 h-4 mr-1.5" /> Nouvel Examen
                                </Button>
                            }
                            onTaskAdded={() => fetchAll()}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {tasks.length === 0 ? (
                            <div className="h-32 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                                Aucun examen planifié
                            </div>
                        ) : tasks.map(t => (
                            <TaskItem key={t.id} task={t} onDelete={(e) => handleDeleteTask(t, e)} />
                        ))}
                    </div>
                </div>

                {/* Fixed Events Section */}
                <div className="h-1/3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Événements Fixes / Contraintes
                        </h2>
                        <FixedEventDialog
                            trigger={
                                <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-slate-600">
                                    <Plus className="w-4 h-4 mr-1.5" /> Ajouter
                                </Button>
                            }
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {fixedEvents.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                Aucune contrainte définie
                            </div>
                        ) : fixedEvents.map(e => (
                            <FixedEventItem key={e.id} event={e} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Settings & Generate */}
            <div className="w-full md:w-[320px] bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col flex-none">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="font-bold text-lg text-slate-800 mb-1">Paramètres de Génération</h2>
                    <p className="text-sm text-slate-500">Configurez vos disponibilités quotidiennes.</p>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Début de journée</Label>
                            <Input
                                type="time"
                                value={settings.startTime}
                                onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fin de journée</Label>
                            <Input
                                type="time"
                                value={settings.endTime}
                                onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Pause entre sessions (min)</Label>
                            <Input
                                type="number"
                                value={settings.breakDuration}
                                onChange={(e) => setSettings({ ...settings, breakDuration: e.target.value })}
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-700">
                        <p className="font-medium mb-1">💡 Note</p>
                        L&apos;algorithme va essayer de placer {tasks.reduce((acc, t) => acc + t.estimated_hours, 0)} heures de révision dans vos créneaux libres.
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-2xl space-y-3">
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || tasks.length === 0}
                        className="w-full h-12 text-base font-semibold shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                        Générer le Planning
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={handleReset}
                        className="w-full text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Réinitialiser le planning
                    </Button>
                </div>
            </div>
        </div>
    );
}
