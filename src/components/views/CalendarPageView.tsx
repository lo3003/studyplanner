"use client";

import { usePlannerStore, selectTasks, selectFixedEvents, selectScheduleBlocks } from "@/store/plannerStore";
import { CalendarView } from "@/components/features/CalendarView";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import { WarningAlert } from "@/components/features/WarningAlert";

export function CalendarPageView() {
    const tasks = usePlannerStore(selectTasks);
    const fixedEvents = usePlannerStore(selectFixedEvents);
    const scheduleBlocks = usePlannerStore(selectScheduleBlocks);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-full bg-slate-50/50 relative overflow-hidden">

            {/* Collapsible Sidebar (Upcoming Tasks) */}
            <div
                className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out relative z-10 ${sidebarOpen ? "w-64" : "w-0 opacity-0 overflow-hidden"
                    }`}
            >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between min-w-[256px]">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <List className="w-4 h-4 text-slate-500" />
                        Examens à venir
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-w-[256px]">
                    {tasks.map(task => {
                        const deadline = new Date(task.deadline);
                        const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                        return (
                            <div key={task.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-slate-700 line-clamp-1">{task.title}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${daysLeft <= 3 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                        }`}>
                                        J-{daysLeft}
                                    </span>
                                </div>
                                <div className="text-slate-500 text-xs flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    {deadline.toLocaleDateString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col min-w-0 relative h-full">
                {/* Controls Overlay */}
                <div className="absolute top-4 left-4 z-20">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="shadow-sm border border-slate-200 bg-white hover:bg-slate-50"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <ChevronLeft className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                        {sidebarOpen ? "Masquer Liste" : "Afficher Liste"}
                    </Button>
                </div>

                <div className="p-4 flex-1 h-full overflow-hidden flex flex-col">
                    <div className="mb-4 flex justify-center">
                        <WarningAlert />
                    </div>
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <CalendarView tasks={tasks} fixedEvents={fixedEvents} scheduleBlocks={scheduleBlocks} />
                    </div>
                </div>
            </div>
        </div>
    );
}
