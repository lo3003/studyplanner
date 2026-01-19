"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/features/CalendarView";
import { 
  Loader2, 
  Clock, 
  Calendar as CalIcon, 
  Sparkles, 
  Trash2, 
  LogOut,
  BookOpen,
  CalendarDays,
  Target,
  TrendingUp
} from "lucide-react";
import { TaskDialog } from "@/components/features/TaskDialog";
import { FixedEventDialog, FixedEventItem } from "@/components/features/FixedEventDialog";
import { usePlannerStore, selectTasks, selectFixedEvents, selectScheduleBlocks, selectIsLoading, selectIsGenerating } from "@/store/plannerStore";
import { toast } from "sonner";
import type { Task } from "@/types";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "events">("tasks");

  // Zustand store selectors
  const tasks = usePlannerStore(selectTasks);
  const fixedEvents = usePlannerStore(selectFixedEvents);
  const scheduleBlocks = usePlannerStore(selectScheduleBlocks);
  const isLoading = usePlannerStore(selectIsLoading);
  const isGenerating = usePlannerStore(selectIsGenerating);
  
  // Zustand store actions
  const fetchAll = usePlannerStore((state) => state.fetchAll);
  const setUserId = usePlannerStore((state) => state.setUserId);
  const generateSchedule = usePlannerStore((state) => state.generateSchedule);
  const deleteTask = usePlannerStore((state) => state.deleteTask);

  // Auth check and initial data load
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        setUserId(user.id);
        await fetchAll();
      }
      setInitialLoading(false);
    };
    checkUser();
  }, [router, fetchAll, setUserId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Generate schedule handler
  const handleGenerateSchedule = async () => {
    const result = await generateSchedule();
    
    if (result) {
      if (result.success) {
        toast.success(`Planning généré ! ${result.createdBlocks.length} blocs créés.`, {
          description: "Vos sessions d'étude ont été planifiées automatiquement."
        });
      } else {
        for (const warning of result.warnings) {
          toast.warning(warning.message, {
            description: `Tâche: ${warning.taskTitle}`,
            duration: 5000,
          });
        }
        toast.info(`Planning généré avec ${result.warnings.length} avertissement(s)`);
      }
    }
  };

  // Task deletion handler
  const handleDeleteTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer "${task.title}" et tous ses blocs associés ?`)) return;
    
    const success = await deleteTask(task.id);
    if (success) {
      toast.success("Tâche supprimée");
    } else {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Refresh data after task creation
  const handleTaskAdded = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  // Stats calculation
  const totalHours = tasks.reduce((sum, t) => sum + t.estimated_hours, 0);
  const upcomingDeadlines = tasks.filter(t => {
    const deadline = new Date(t.deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            <Sparkles className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-slate-600 font-medium">Chargement de votre planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  StudyPlanner
                </h1>
                <p className="text-xs text-slate-500">Planification intelligente</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100/80">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  {(user?.user_metadata?.full_name || user?.email || "U")[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Target className="w-5 h-5" />} label="Examens à préparer" value={tasks.length} color="indigo" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Heures à planifier" value={`${totalHours}h`} color="purple" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Sessions planifiées" value={scheduleBlocks.length} color="emerald" />
          <StatCard icon={<CalIcon className="w-5 h-5" />} label="Deadlines cette semaine" value={upcomingDeadlines} color="amber" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Tab Switcher */}
            <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/50 flex">
              <button
                onClick={() => setActiveTab("tasks")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "tasks" ? "bg-indigo-500 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <BookOpen className="w-4 h-4 inline-block mr-2" />
                Examens
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "events" ? "bg-indigo-500 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CalendarDays className="w-4 h-4 inline-block mr-2" />
                Événements
              </button>
            </div>

            {/* Tasks Panel */}
            {activeTab === "tasks" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800">Mes Examens</h2>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-600">{tasks.length}</span>
                  </div>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto">
                  {tasks.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">Aucun examen ajouté</p>
                      <p className="text-xs text-slate-400 mt-1">Commencez par ajouter vos examens</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} onDelete={(e) => handleDeleteTask(task, e)} />
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                  <TaskDialog onTaskAdded={handleTaskAdded} />
                </div>
              </div>
            )}

            {/* Events Panel */}
            {activeTab === "events" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800">Événements Fixes</h2>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">{fixedEvents.length}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Cours, RDV et autres contraintes</p>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto">
                  {fixedEvents.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <CalendarDays className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">Aucun événement fixe</p>
                      <p className="text-xs text-slate-400 mt-1">Ajoutez vos cours récurrents</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {fixedEvents.map((event) => (
                        <FixedEventItem key={event.id} event={event} />
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                  <FixedEventDialog />
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button 
              onClick={handleGenerateSchedule}
              disabled={isGenerating || tasks.length === 0}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Générer mon planning
                </>
              )}
            </Button>
          </aside>

          {/* Calendar Area */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
              <CalendarView tasks={tasks} fixedEvents={fixedEvents} scheduleBlocks={scheduleBlocks} />
            </div>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-3 text-slate-600 font-medium">Chargement...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  color: "indigo" | "purple" | "emerald" | "amber";
}) {
  const colors = {
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/20",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/20",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/20",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/20",
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/50 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function TaskCard({ task, onDelete }: { task: Task; onDelete: (e: React.MouseEvent) => void }) {
  const deadline = new Date(task.deadline);
  const now = new Date();
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 3 && daysLeft > 0;
  const isPast = daysLeft < 0;

  return (
    <div className={`p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer group ${
      isPast ? "bg-red-50 border-red-200" :
      isUrgent ? "bg-amber-50 border-amber-200" :
      "bg-slate-50 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-800 truncate">{task.title}</h3>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isPast ? "bg-red-100 text-red-700" :
              isUrgent ? "bg-amber-100 text-amber-700" :
              "bg-indigo-100 text-indigo-700"
            }`}>
              {isPast ? "Passé" : isUrgent ? `${daysLeft}j restants` : deadline.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.estimated_hours}h
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Progress indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${isPast ? "bg-red-500" : isUrgent ? "bg-amber-500" : "bg-indigo-500"}`}
            style={{ width: `${Math.min(100, (task.difficulty / 5) * 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Diff. {task.difficulty}/5</span>
      </div>
    </div>
  );
}