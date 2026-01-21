"use client";

import { useCallback, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addMonths, addWeeks, addDays, subMonths, subWeeks, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Lock, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { checkCollision } from "@/lib/scheduler";
import { usePlannerStore } from "@/store/plannerStore";
import type { CalendarEvent, FixedEvent, ScheduleBlock, Task } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DayPicker } from "@/components/ui/calendar";

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
  const [view, setView] = useState<View>("week");

  // ========================================
  // Transform data to calendar events
  // ========================================

  const events = useMemo((): CalendarEvent[] => {
    const allEvents: CalendarEvent[] = [];

    // Deadlines (from tasks) - HOT PINK
    for (const task of tasks) {
      allEvents.push({
        id: `deadline-${task.id}`,
        title: `⚠️ DEADLINE: ${task.title}`,
        start: new Date(task.deadline),
        end: new Date(new Date(task.deadline).getTime() + 60 * 60 * 1000), // 1h display
        type: "deadline",
        resource: {
          color: "#EC4899", // Pink-500
          originalEvent: task,
        },
      });
    }

    // Fixed Events - PURPLE
    for (const event of fixedEvents) {
      allEvents.push({
        id: `fixed-${event.id}`,
        title: `${event.title}`,
        start: new Date(event.start_at),
        end: new Date(event.end_at),
        type: "fixed_event",
        resource: {
          color: "#8B5CF6", // Violet-500
          originalEvent: event,
        },
      });
    }

    // Schedule Blocks - CYAN / BLUE (with lock indicator if locked)
    for (const block of scheduleBlocks) {
      allEvents.push({
        id: `block-${block.id}`,
        title: block.is_locked ? `🔒 ${block.title}` : block.title,
        start: new Date(block.start_at),
        end: new Date(block.end_at),
        type: "schedule_block",
        resource: {
          color: block.color || "#06B6D4", // Cyan-500
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
      backgroundColor: "white", // Default to white for card-look
      borderLeft: `4px solid ${event.resource?.color || "#3B82F6"}`,
      color: "#1E293B", // Dark text
      borderRadius: "4px",
      opacity: 1,
      fontSize: "12px",
      fontWeight: 600,
      padding: "2px 6px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      borderTop: "1px solid #F1F5F9",
      borderRight: "1px solid #F1F5F9",
      borderBottom: "1px solid #F1F5F9",
    };

    // Style overrides based on type to add "fill" look if preferred or stick to "border" look
    // Let's make Schedule Blocks filled for better visibility
    if (event.type === "schedule_block") {
      baseStyle.backgroundColor = "#E0F2FE"; // Light Blue bg
      baseStyle.color = "#0369A1"; // Dark Blue text
      baseStyle.borderLeft = "4px solid #0EA5E9";
    }

    if (event.type === "fixed_event") {
      baseStyle.backgroundColor = "#F3E8FF"; // Light Purple
      baseStyle.color = "#6B21A8"; // Dark Purple
      baseStyle.borderLeft = "4px solid #9333EA";
      baseStyle.cursor = "default";
    }

    if (event.type === "deadline") {
      baseStyle.backgroundColor = "#FCE7F3"; // Light Pink
      baseStyle.color = "#9D174D"; // Dark Pink
      baseStyle.borderLeft = "4px solid #EC4899";
      baseStyle.cursor = "default";
    }

    // Locked override
    if (event.resource?.isLocked) {
      baseStyle.borderLeft = "4px solid #F59E0B"; // Amber
      baseStyle.backgroundColor = "#FFFBEB"; // Light Amber
      baseStyle.color = "#92400E";
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

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // ========================================
  // Render
  // ========================================

  const headerLabel = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy", { locale: fr });
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      // Same month?
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "d", { locale: fr })} - ${format(end, "d MMMM yyyy", { locale: fr })}`;
      }
      return `${format(start, "d MMM", { locale: fr })} - ${format(end, "d MMM yyyy", { locale: fr })}`;
    }
    return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
  }, [currentDate, view]);

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* iOS Style Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">

        {/* Left: Today & Picker */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs font-medium h-8 rounded-lg"
          >
            Aujourd&apos;hui
          </Button>

          <div className="flex items-center bg-secondary/50 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => {
                if (view === 'month') handleNavigate(subMonths(currentDate, 1));
                else if (view === 'week') handleNavigate(subWeeks(currentDate, 1));
                else handleNavigate(subDays(currentDate, 1));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => {
                if (view === 'month') handleNavigate(addMonths(currentDate, 1));
                else if (view === 'week') handleNavigate(addWeeks(currentDate, 1));
                else handleNavigate(addDays(currentDate, 1));
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2 font-semibold text-sm">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span className="capitalize">{headerLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && setCurrentDate(date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: View Selector (Segmented Control) */}
        <div className="flex bg-secondary/50 p-1 rounded-lg">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all capitalize",
                view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Jour'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Area */}
      <div className="flex-1 overflow-hidden relative">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          culture="fr"
          view={view}
          onView={handleViewChange}
          date={currentDate}
          onNavigate={handleNavigate}
          toolbar={false}
          min={new Date(2024, 0, 1, 7, 0)} // Start at 7am
          eventPropGetter={eventPropGetter}
          draggableAccessor={draggableAccessor}
          resizableAccessor={resizableAccessor}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          resizable={true}
          selectable={true}
          step={30}
          timeslots={2}
        />
      </div>
    </div>
  );
}