"use client";

import { usePlannerStore, selectTasks, selectScheduleBlocks } from "@/store/plannerStore";
import { CheckCircle2, Circle, Clock, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GoalsView() {
    const tasks = usePlannerStore(selectTasks);
    // Sort tasks by deadline
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    // Mock "Done" state for now since we don't have task completion in the provided types yet
    // In a real app, we would check task.status === 'completed'
    // For now, we will assume past tasks are done or just show 0% progress

    // Calculate global stats
    const totalTasks = tasks.length;
    // const completedTasks = tasks.filter(t => new Date(t.deadline) < new Date()).length; // Naive "done" check
    const totalHours = tasks.reduce((acc, t) => acc + t.estimated_hours, 0);

    return (
        <div className="h-full p-6 overflow-y-auto custom-scrollbar bg-slate-50/50">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Examens Totaux</CardTitle>
                            <Target className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalTasks}</div>
                            <p className="text-xs text-slate-500">Objectifs définis</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Heures de Révisions</CardTitle>
                            <Clock className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalHours}h</div>
                            <p className="text-xs text-slate-500">Temps total estimé</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Prochaine Deadline</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {sortedTasks.length > 0 ? new Date(sortedTasks[0].deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "-"}
                            </div>
                            <p className="text-xs text-slate-500">
                                {sortedTasks.length > 0 ? sortedTasks[0].title : "Aucun examen"}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Progress Board */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Timeline List */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Progression des Objectifs
                        </h2>

                        <div className="space-y-6">
                            {sortedTasks.map((task, index) => {
                                const deadline = new Date(task.deadline);
                                const now = new Date();
                                const isPast = deadline < now;

                                return (
                                    <div key={task.id} className="relative pl-8">
                                        {/* Timeline Line */}
                                        {index !== sortedTasks.length - 1 && (
                                            <div className="absolute left-[11px] top-7 bottom-[-24px] w-0.5 bg-slate-100" />
                                        )}

                                        {/* Status Dot */}
                                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isPast ? "border-green-500 bg-green-50 text-green-600" : "border-slate-300 bg-white text-slate-300"
                                            }`}>
                                            {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                        </div>

                                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 hover:border-blue-200 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`font-semibold ${isPast ? "text-slate-500 line-through" : "text-slate-800"}`}>
                                                    {task.title}
                                                </h3>
                                                <span className={`text-xs font-medium px-2 py-1 rounded-md ${isPast ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-700"
                                                    }`}>
                                                    {deadline.toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span>Difficulté: {task.difficulty}/5</span>
                                                <span>Importace: {task.importance}/5</span>
                                                <span>{task.estimated_hours}h est.</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {sortedTasks.length === 0 && (
                                <div className="text-center py-10 text-slate-400">
                                    Aucun objectif défini. Ajoutez des examens dans le tableau de bord.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Simple Stats / Motivation */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-8 text-white shadow-lg">
                            <h3 className="text-xl font-bold mb-2">Continuez comme ça !</h3>
                            <p className="opacity-90 mb-6">Chaque session de révision vous rapproche de votre objectif.</p>

                            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Progression Globale (Simulée)</span>
                                    <span className="font-mono">35%</span>
                                </div>
                                <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                    <div className="bg-white h-full rounded-full" style={{ width: '35%' }} />
                                </div>
                            </div>
                        </div>

                        {/* Task Checklist (Interactive Mock) */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-800 mb-4">Liste de contrôle</h3>
                            <div className="space-y-3">
                                {[
                                    "Définir mes contraintes horaires",
                                    "Ajouter tous mes examens",
                                    "Générer le planning",
                                    "Vérifier les conflits",
                                    "Exporter vers mon calendrier (Bientôt)"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group">
                                        <div className="w-5 h-5 rounded border border-slate-300 group-hover:border-blue-400 flex items-center justify-center text-transparent group-hover:text-blue-400">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <span className="text-slate-600 text-sm group-hover:text-slate-900">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
