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
          color: event.color || "#6b7280",
          originalEvent: event,
        },
      });
    }

    // Schedule Blocks - BLUE (with lock indicator if locked)
    for (const block of scheduleBlocks) {
      allEvents.push({
        id: `block-${block.id}`,
        title: block.is_locked ? `🔐 ${block.title}` : block.title,
        start: new Date(block.start_at),
        end: new Date(block.end_at),
        type: "schedule_block",
        resource: {
          color: block.color || "#3b82f6",
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
      backgroundColor: event.resource?.color || "#3b82f6",
      borderRadius: "4px",
      opacity: 0.9,
      color: "white",
      border: "none",
      display: "block",
    };

    // Add yellow border for locked blocks
    if (event.type === "schedule_block" && event.resource?.isLocked) {
      baseStyle.border = "2px solid #facc15";
      baseStyle.boxShadow = "0 0 4px #facc15";
    }

    // Deadlines are not draggable - make them look different
    if (event.type === "deadline") {
      baseStyle.opacity = 0.7;
      baseStyle.cursor = "default";
    }

    // Fixed events are not draggable
    if (event.type === "fixed_event") {
      baseStyle.cursor = "default";
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
    <div className="space-y-4">
      {/* Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-lg shadow-sm border">
        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <Input
            type="date"
            value={format(currentDate, "yyyy-MM-dd")}
            onChange={handleDateInputChange}
            className="w-auto"
          />
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
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
          <span className="text-sm font-medium min-w-[150px] text-center">
            {view === "month" && format(currentDate, "MMMM yyyy", { locale: fr })}
            {view === "week" && `Semaine du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: fr })}`}
            {view === "day" && format(currentDate, "EEEE d MMMM", { locale: fr })}
          </span>
          <Button
            variant="outline"
            size="icon"
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

        {/* View Selector */}
        <div className="flex items-center gap-1">
          <Button
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("month")}
          >
            Mois
          </Button>
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("week")}
          >
            Semaine
          </Button>
          <Button
            variant={view === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("day")}
          >
            Jour
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Deadlines</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Blocs de travail</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-500" />
          <span>Événements fixes</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-700 border-2 border-yellow-400" />
          <Lock className="w-3 h-3" />
          <span>Verrouillé</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="h-[600px] bg-white p-4 rounded-lg shadow-sm">
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
          toolbar={false} // Désactiver la toolbar native
          min={new Date(2024, 0, 1, 8, 0)}
          max={new Date(2024, 0, 1, 22, 0)}
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