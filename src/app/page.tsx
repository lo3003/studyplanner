"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  LogOut,
  BookOpen,
  CalendarDays,
  Target,
  LayoutGrid,
  Settings,
  Search,
  Bell
} from "lucide-react";
import { usePlannerStore } from "@/store/plannerStore";
import { Input } from "@/components/ui/input";

// Views
import { DashboardView } from "@/components/views/DashboardView";
import { CalendarPageView } from "@/components/views/CalendarPageView";
import { GoalsView } from "@/components/views/GoalsView";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"dashboard" | "calendar" | "goals">("dashboard");

  // Zustand store actions
  const fetchAll = usePlannerStore((state) => state.fetchAll);
  const setUserId = usePlannerStore((state) => state.setUserId);

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

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Navigation Items Config
  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutGrid },
    { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
    { id: 'goals', label: 'Objectifs', icon: Target },
  ] as const;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">

      {/* Dark Sidebar */}
      <aside className="w-[280px] bg-sidebar text-sidebar-foreground flex flex-col shadow-xl z-50 flex-none">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/30">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mr-3">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">StudyPlanner</span>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto">

          {/* Navigation */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">Menu Principal</p>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => setCurrentView(item.id as any)}
                  className={`w-full justify-start h-10 rounded-lg transition-all ${currentView === item.id
                      ? "bg-primary text-white shadow-md shadow-primary/20 font-medium"
                      : "text-sidebar-foreground hover:bg-white/10 hover:text-white"
                    }`}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>


          {/* Promotion / Hint Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50">
            <h4 className="text-xs font-medium text-blue-200 mb-2 uppercase tracking-wide">Astuce Pro</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Définissez vos contraintes horaires avant de générer le planning pour éviter les conflits.
            </p>
          </div>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-sidebar-border/30 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {(user?.user_metadata?.full_name || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.user_metadata?.full_name || "Utilisateur"}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">Étudiant</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-sidebar-foreground/70 hover:text-white hover:bg-white/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">

        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-40 flex-none">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className="text-slate-900 font-semibold">{
              currentView === 'dashboard' ? 'Tableau de bord' :
                currentView === 'calendar' ? 'Calendrier' : 'Objectifs'
            }</span>
            <span className="text-slate-300">/</span>
            <span>Vue d&apos;ensemble</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Rechercher..." className="w-64 pl-9 h-9 bg-slate-50 border-transparent focus:bg-white focus:border-primary/20 transition-all rounded-lg" />
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-primary relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-primary">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* View Content Container */}
        <main className="flex-1 overflow-hidden relative">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'calendar' && <CalendarPageView />}
          {currentView === 'goals' && <GoalsView />}
        </main>
      </div>
    </div>
  );
}