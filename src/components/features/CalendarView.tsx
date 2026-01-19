"use client";

import { useCallback, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Lock, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { checkCollision } from "@/lib/scheduler";
import { usePlannerStore } from "@/store/plannerStore";
import type { CalendarEvent, FixedEvent, ScheduleBlock, Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

// ============================================
// Localizer Configuration (French)
// ============================================

const locales = { fr };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

// ============================================
// Drag and Drop Calendar
// ============================================

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

// ============================================
// Props Interface
// ============================================

interface CalendarViewProps {
  tasks: Task[];
  fixedEvents: FixedEvent[];
  scheduleBlocks: ScheduleBlock[];
}

// ============================================
// Main Component
// ============================================

export function CalendarView({
  tasks,
  fixedEvents,
  scheduleBlocks,
}: CalendarViewProps) {
  const updateScheduleBlock = usePlannerStore((state) => state.updateScheduleBlock);
  
  // État pour la date courante du calendrier
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("week");

  // ========================================
  // Transform data to calendar events
  // ========================================

  const events = useMemo((): CalendarEvent[] => {
    const allEvents: CalendarEvent[] = [];

    // Deadlines (from tasks) - RED
    for (const task of tasks) {
      allEvents.push({
        id: `deadline-${task.id}`,
        title: `📅 DEADLINE: ${task.title}`,
        start: new Date(task.deadline),
        end: new Date(new Date(task.deadline).getTime() + 60 * 60 * 1000), // 1h display
        type: "deadline",
        resource: {
          color: "#ef4444",
          originalEvent: task,
        },
      });
    }

    // Fixed Events - GRAY
    for (const event of fixedEvents) {
      allEvents.push({
        id: `fixed-${event.id}`,
        title: `🔒 ${event.title}`,
        start: new Date(event.start_at),
        end: new Date(event.end_at),
        type: "fixed_event",
        resource: {
          color: event.color || "#64748b",
          originalEvent: event,
        },
      });
    }

    // Schedule Blocks - INDIGO (with lock indicator if locked)
    for (const block of scheduleBlocks) {
      allEvents.push({
        id: `block-${block.id}`,
        title: block.is_locked ? `🔐 ${block.title}` : block.title,
        start: new Date(block.start_at),
        end: new Date(block.end_at),
        type: "schedule_block",
        resource: {
          color: block.color || "#6366f1",
          originalEvent: block,
          isLocked: block.is_locked,
        },
      });
    }

    return allEvents;
  }, [tasks, fixedEvents, scheduleBlocks]);

  // ========================================
  // Event Style Getter
  // ========================================

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: event.resource?.color || "#6366f1",
      borderRadius: "8px",
      opacity: 1,
      color: "white",
      border: "none",
      display: "block",
      fontSize: "12px",
      fontWeight: 500,
      padding: "2px 6px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    };

    // Add amber border for locked blocks
    if (event.type === "schedule_block" && event.resource?.isLocked) {
      baseStyle.border = "2px solid #fbbf24";
      baseStyle.boxShadow = "0 0 8px rgba(251, 191, 36, 0.4)";
    }

    // Deadlines are not draggable - make them look different
    if (event.type === "deadline") {
      baseStyle.opacity = 0.85;
      baseStyle.cursor = "default";
      baseStyle.backgroundColor = "#ef4444";
    }

    // Fixed events are not draggable
    if (event.type === "fixed_event") {
      baseStyle.cursor = "default";
      baseStyle.backgroundColor = "#64748b";
    }

    return { style: baseStyle };
  }, []);

  // ========================================
  // Drag & Drop Handler
  // ========================================

  const handleEventDrop = useCallback(
    async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
      // Only schedule blocks can be moved
      if (event.type !== "schedule_block") {
        toast.error("Seuls les blocs de travail peuvent être déplacés");
        return;
      }

      const blockId = event.id.toString().replace("block-", "");

      // Check collision
      const collision = checkCollision(
        new Date(start),
        new Date(end),
        fixedEvents,
        scheduleBlocks.filter((b) => b.is_locked),
        blockId
      );

      if (collision.hasCollision) {
        toast.error(collision.message ?? "Conflit détecté");
        return;
      }

      // Update in DB
      const success = await updateScheduleBlock(blockId, {
        start_at: new Date(start).toISOString(),
        end_at: new Date(end).toISOString(),
        is_locked: true, // Lock after manual move
      });

      if (success) {
        toast.success("Bloc déplacé et verrouillé 🔐");
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    },
    [fixedEvents, scheduleBlocks, updateScheduleBlock]
  );

  // ========================================
  // Resize Handler (same logic)
  // ========================================

  const handleEventResize = useCallback(
    async ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
      if (event.type !== "schedule_block") {
        toast.error("Seuls les blocs de travail peuvent être redimensionnés");
        return;
      }

      const blockId = event.id.toString().replace("block-", "");

      const collision = checkCollision(
        new Date(start),
        new Date(end),
        fixedEvents,
        scheduleBlocks.filter((b) => b.is_locked),
        blockId
      );

      if (collision.hasCollision) {
        toast.error(collision.message ?? "Conflit détecté");
        return;
      }

      const success = await updateScheduleBlock(blockId, {
        start_at: new Date(start).toISOString(),
        end_at: new Date(end).toISOString(),
        is_locked: true,
      });

      if (success) {
        toast.success("Bloc redimensionné et verrouillé 🔐");
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    },
    [fixedEvents, scheduleBlocks, updateScheduleBlock]
  );

  // ========================================
  // Determine if an event is draggable
  // ========================================

  const draggableAccessor = useCallback((event: CalendarEvent) => {
    // Only schedule blocks can be dragged
    return event.type === "schedule_block";
  }, []);

  const resizableAccessor = useCallback((event: CalendarEvent) => {
    return event.type === "schedule_block";
  }, []);

  // ========================================
  // Navigation Handlers
  // ========================================

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: "month" | "week" | "day") => {
    setView(newView);
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDateInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    if (!isNaN(selectedDate.getTime())) {
      setCurrentDate(selectedDate);
    }
  }, []);

  // ========================================
  // Render
  // ========================================

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-100">
        {/* Left: Date picker and Today button */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="date"
              value={format(currentDate, "yyyy-MM-dd")}
              onChange={handleDateInputChange}
              className="w-auto pl-9 h-9 border-slate-200 focus:ring-indigo-500 rounded-xl text-sm"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="rounded-xl border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-sm font-medium"
          >
            Aujourd&apos;hui
          </Button>
        </div>

        {/* Center: Navigation */}
        <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm"
            onClick={() => {
              const newDate = new Date(currentDate);
              if (view === "week") newDate.setDate(newDate.getDate() - 7);
              else if (view === "month") newDate.setMonth(newDate.getMonth() - 1);
              else newDate.setDate(newDate.getDate() - 1);
              setCurrentDate(newDate);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-slate-700 min-w-[160px] text-center px-2">
            {view === "month" && format(currentDate, "MMMM yyyy", { locale: fr })}
            {view === "week" && `Semaine du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: fr })}`}
            {view === "day" && format(currentDate, "EEEE d MMMM", { locale: fr })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm"
            onClick={() => {
              const newDate = new Date(currentDate);
              if (view === "week") newDate.setDate(newDate.getDate() + 7);
              else if (view === "month") newDate.setMonth(newDate.getMonth() + 1);
              else newDate.setDate(newDate.getDate() + 1);
              setCurrentDate(newDate);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: View Selector */}
        <div className="flex items-center bg-slate-100/80 rounded-xl p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewChange("month")}
            className={`rounded-lg text-sm font-medium px-4 transition-all ${
              view === "month" 
                ? "bg-white shadow-sm text-indigo-600" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mois
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewChange("week")}
            className={`rounded-lg text-sm font-medium px-4 transition-all ${
              view === "week" 
                ? "bg-white shadow-sm text-indigo-600" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semaine
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewChange("day")}
            className={`rounded-lg text-sm font-medium px-4 transition-all ${
              view === "day" 
                ? "bg-white shadow-sm text-indigo-600" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Jour
          </Button>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex items-center gap-6 px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 text-xs">
        <span className="text-slate-400 font-medium uppercase tracking-wide">Légende:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500 shadow-sm" />
          <span className="text-slate-600">Deadlines</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shadow-sm" />
          <span className="text-slate-600">Sessions de travail</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-slate-500 shadow-sm" />
          <span className="text-slate-600">Événements fixes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-700 ring-2 ring-amber-400 ring-offset-1" />
          <Lock className="w-3 h-3 text-amber-500" />
          <span className="text-slate-600">Verrouillé</span>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="flex-1 p-4 min-h-[550px]">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          culture="fr"
          view={view}
          onView={handleViewChange as (view: string) => void}
          date={currentDate}
          onNavigate={handleNavigate}
          toolbar={false}
          min={new Date(2024, 0, 1, 7, 0)}
          max={new Date(2024, 0, 1, 23, 0)}
          eventPropGetter={eventPropGetter}
          draggableAccessor={draggableAccessor}
          resizableAccessor={resizableAccessor}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          resizable={true}
          selectable={true}
        />
      </div>
    </div>
  );
}