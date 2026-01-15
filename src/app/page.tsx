"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarView } from "@/components/features/CalendarView";
import { Loader2, Clock, Calendar as CalIcon, RefreshCw, Trash2 } from "lucide-react";
import { TaskDialog } from "@/components/features/TaskDialog";
import { FixedEventDialog, FixedEventItem } from "@/components/features/FixedEventDialog";
import { usePlannerStore, selectTasks, selectFixedEvents, selectScheduleBlocks, selectIsLoading, selectIsGenerating } from "@/store/plannerStore";
import { toast } from "sonner";
import type { Task } from "@/types";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

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
        toast.success(`Planning généré ! ${result.createdBlocks.length} blocs créés.`);
      } else {
        // Show warnings
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
  const handleDeleteTask = async (task: Task) => {
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

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mon Planning</h1>
          <p className="text-gray-500">
            Bonjour, {user?.user_metadata?.full_name || user?.email} 👋
          </p>
        </div>
        <Button variant="destructive" onClick={handleLogout}>
          Se déconnecter
        </Button>
      </header>

      {/* CONTENU PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Zone 1 : Liste des tâches + Fixed Events */}
        <div className="space-y-6">
          {/* Tasks Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="font-semibold mb-4 text-lg">Mes Cours / Examens</h2>
            
            {/* Liste des tâches */}
            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucune tâche ajoutée.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-slate-900">{task.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          Diff: {task.difficulty}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <CalIcon className="w-3 h-3" />
                        {new Date(task.deadline).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimated_hours}h estimées
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <TaskDialog onTaskAdded={handleTaskAdded} />
          </div>

          {/* Fixed Events Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="font-semibold mb-4 text-lg">Événements Fixes</h2>
            <p className="text-xs text-gray-500 mb-4">
              Cours, RDV, ou autres contraintes qui bloquent votre temps.
            </p>
            
            <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto">
              {fixedEvents.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucun événement fixe.</p>
              ) : (
                fixedEvents.map((event) => (
                  <FixedEventItem key={event.id} event={event} />
                ))
              )}
            </div>

            <FixedEventDialog />
          </div>
        </div>

        {/* Zone 2 : Le Calendrier */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border min-h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Emploi du temps généré</h2>
            <Button 
              variant="default" 
              onClick={handleGenerateSchedule}
              disabled={isGenerating || tasks.length === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Générer le planning
                </>
              )}
            </Button>
          </div>
          
          <div className="mt-4">
            <CalendarView 
              tasks={tasks}
              fixedEvents={fixedEvents}
              scheduleBlocks={scheduleBlocks}
            />
          </div>
        </div>

      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Chargement...</span>
          </div>
        </div>
      )}
    </div>
  );
}