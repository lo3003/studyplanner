// ============================================
// Study Planner - Scheduler Algorithm
// Generates study blocks respecting constraints
// ============================================

import {
  addMinutes,
  addDays,
  startOfDay,
  setHours,
  setMinutes,
  isAfter,
  isBefore,
  areIntervalsOverlapping,
  differenceInMinutes,
  format,
} from 'date-fns';
import type {
  Task,
  FixedEvent,
  ScheduleBlock,
  SchedulerConfig,
  SchedulerResult,
  SchedulerWarning,
  TimeSlot,
  CreateScheduleBlockInput,
} from '@/types';

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  workStartHour: 8,    // 8:00 AM
  workEndHour: 22,     // 10:00 PM
  minBlockMinutes: 30, // Minimum 30 min blocks
  maxBlockMinutes: 120, // Maximum 2h blocks
  breakBetweenBlocks: 15, // 15 min break
};

// ============================================
// Helper: Check if two time ranges overlap
// ============================================

export function doTimeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return areIntervalsOverlapping(
    { start: start1, end: end1 },
    { start: start2, end: end2 }
  );
}

// ============================================
// Helper: Get blocked time ranges (walls)
// ============================================

function getBlockedRanges(
  fixedEvents: FixedEvent[],
  lockedBlocks: ScheduleBlock[]
): Array<{ start: Date; end: Date }> {
  const blocked: Array<{ start: Date; end: Date }> = [];

  // Add fixed events as blocked
  for (const event of fixedEvents) {
    blocked.push({
      start: new Date(event.start_at),
      end: new Date(event.end_at),
    });
  }

  // Add locked blocks as blocked
  for (const block of lockedBlocks) {
    blocked.push({
      start: new Date(block.start_at),
      end: new Date(block.end_at),
    });
  }

  // Sort by start time
  blocked.sort((a, b) => a.start.getTime() - b.start.getTime());

  return blocked;
}

// ============================================
// Helper: Get working hours for a specific day
// ============================================

function getWorkingSlots(
  day: Date,
  config: SchedulerConfig
): TimeSlot {
  const dayStart = startOfDay(day);
  return {
    start: setMinutes(setHours(dayStart, config.workStartHour), 0),
    end: setMinutes(setHours(dayStart, config.workEndHour), 0),
  };
}

// ============================================
// Helper: Find free slots in a day
// ============================================

function findFreeSlots(
  day: Date,
  blockedRanges: Array<{ start: Date; end: Date }>,
  config: SchedulerConfig
): TimeSlot[] {
  const workingHours = getWorkingSlots(day, config);
  const freeSlots: TimeSlot[] = [];

  // Filter blocked ranges that fall on this day
  const dayBlockedRanges = blockedRanges.filter((range) =>
    doTimeRangesOverlap(
      workingHours.start,
      workingHours.end,
      range.start,
      range.end
    )
  );

  // Start with full working hours
  let currentStart = workingHours.start;

  for (const blocked of dayBlockedRanges) {
    // If blocked starts after current slot start
    if (isAfter(blocked.start, currentStart)) {
      // Create a free slot before the blocked range
      const freeEnd = isBefore(blocked.start, workingHours.end)
        ? blocked.start
        : workingHours.end;

      if (isAfter(freeEnd, currentStart)) {
        freeSlots.push({ start: currentStart, end: freeEnd });
      }
    }

    // Move current start past the blocked range
    if (isAfter(blocked.end, currentStart)) {
      currentStart = blocked.end;
    }
  }

  // Add remaining time after last blocked range
  if (isBefore(currentStart, workingHours.end)) {
    freeSlots.push({ start: currentStart, end: workingHours.end });
  }

  // Filter out slots smaller than minimum block size
  return freeSlots.filter(
    (slot) =>
      differenceInMinutes(slot.end, slot.start) >= config.minBlockMinutes
  );
}

// ============================================
// Helper: Calculate task priority score
// ============================================

function calculatePriorityScore(task: Task): number {
  const deadline = new Date(task.deadline);
  const now = new Date();
  const daysUntilDeadline = Math.max(0, differenceInMinutes(deadline, now) / (60 * 24));
  
  // Higher score = higher priority
  // Factor in: deadline urgency, difficulty, importance
  const urgencyScore = Math.max(0, 100 - daysUntilDeadline * 5);
  const difficultyScore = task.difficulty * 10;
  const importanceScore = task.importance * 15;
  
  return urgencyScore + difficultyScore + importanceScore;
}

// ============================================
// Main: Generate Schedule Blocks
// ============================================

export async function generateScheduleBlocks(
  tasks: Task[],
  fixedEvents: FixedEvent[],
  lockedBlocks: ScheduleBlock[],
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): Promise<SchedulerResult> {
  const warnings: SchedulerWarning[] = [];
  const createdBlocks: ScheduleBlock[] = [];
  const now = new Date();

  // Filter tasks with remaining hours to schedule
  const tasksToSchedule = tasks
    .filter((task) => {
      const deadline = new Date(task.deadline);
      return isAfter(deadline, now) && task.estimated_hours > 0;
    })
    .map((task) => ({
      ...task,
      remainingMinutes: task.estimated_hours * 60,
      priority: calculatePriorityScore(task),
    }))
    .sort((a, b) => b.priority - a.priority); // Sort by priority descending

  if (tasksToSchedule.length === 0) {
    return { success: true, createdBlocks: [], warnings: [] };
  }

  // Get all blocked ranges
  const blockedRanges = getBlockedRanges(fixedEvents, lockedBlocks);

  // Generate schedule for the next 30 days
  const schedulingDays = 30;
  const allFreeSlots: Array<TimeSlot & { dayIndex: number }> = [];

  for (let dayIndex = 0; dayIndex < schedulingDays; dayIndex++) {
    const day = addDays(startOfDay(now), dayIndex);
    const dayFreeSlots = findFreeSlots(day, blockedRanges, config);
    
    for (const slot of dayFreeSlots) {
      // Skip slots that are entirely in the past
      if (isAfter(now, slot.end)) continue;
      
      // Adjust start if slot starts in the past
      const adjustedStart = isBefore(slot.start, now) ? now : slot.start;
      
      if (differenceInMinutes(slot.end, adjustedStart) >= config.minBlockMinutes) {
        allFreeSlots.push({
          start: adjustedStart,
          end: slot.end,
          dayIndex,
        });
      }
    }
  }

  // Schedule each task
  for (const task of tasksToSchedule) {
    const deadline = new Date(task.deadline);
    let remainingMinutes = task.remainingMinutes;

    // Calculate already scheduled minutes for this task (from locked blocks)
    const scheduledMinutes = lockedBlocks
      .filter((b) => b.task_id === task.id)
      .reduce((sum, b) => sum + b.duration_minutes, 0);
    
    remainingMinutes = Math.max(0, remainingMinutes - scheduledMinutes);

    if (remainingMinutes <= 0) continue;

    // Try to schedule in free slots before deadline
    for (const slot of allFreeSlots) {
      if (remainingMinutes <= 0) break;
      if (isAfter(slot.start, deadline)) continue; // Slot is after deadline

      const slotDuration = differenceInMinutes(slot.end, slot.start);
      if (slotDuration < config.minBlockMinutes) continue;

      // Determine block duration
      const blockDuration = Math.min(
        remainingMinutes,
        slotDuration,
        config.maxBlockMinutes
      );

      if (blockDuration < config.minBlockMinutes) continue;

      // Create the block
      const blockStart = slot.start;
      const blockEnd = addMinutes(blockStart, blockDuration);

      // Make sure block doesn't exceed deadline
      if (isAfter(blockEnd, deadline)) continue;

      const newBlock: ScheduleBlock = {
        id: crypto.randomUUID(),
        user_id: task.user_id,
        task_id: task.id,
        title: task.title,
        start_at: blockStart.toISOString(),
        end_at: blockEnd.toISOString(),
        duration_minutes: blockDuration,
        is_locked: false,
        color: '#3b82f6',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      createdBlocks.push(newBlock);

      // Update slot (shrink it)
      slot.start = addMinutes(blockEnd, config.breakBetweenBlocks);
      
      // Update remaining
      remainingMinutes -= blockDuration;

      // Add to blocked ranges for subsequent scheduling
      blockedRanges.push({
        start: blockStart,
        end: addMinutes(blockEnd, config.breakBetweenBlocks),
      });
      blockedRanges.sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    // Check if task couldn't be fully scheduled
    if (remainingMinutes > 0) {
      warnings.push({
        taskId: task.id,
        taskTitle: task.title,
        message: `Impossible de planifier ${Math.round(remainingMinutes / 60 * 10) / 10}h avant le ${format(deadline, 'dd/MM/yyyy')}`,
        unscheduledHours: remainingMinutes / 60,
      });
    }
  }

  return {
    success: warnings.length === 0,
    createdBlocks,
    warnings,
  };
}

// ============================================
// Collision Detection for Drag & Drop
// ============================================

export function checkCollision(
  newStart: Date,
  newEnd: Date,
  fixedEvents: FixedEvent[],
  lockedBlocks: ScheduleBlock[],
  excludeBlockId?: string
): { hasCollision: boolean; type?: 'fixed_event' | 'locked_block'; message?: string } {
  // Check collision with fixed events
  for (const event of fixedEvents) {
    const eventStart = new Date(event.start_at);
    const eventEnd = new Date(event.end_at);

    if (doTimeRangesOverlap(newStart, newEnd, eventStart, eventEnd)) {
      return {
        hasCollision: true,
        type: 'fixed_event',
        message: `Conflit avec l'événement fixe "${event.title}"`,
      };
    }
  }

  // Check collision with locked blocks
  for (const block of lockedBlocks) {
    // Skip the block being moved
    if (block.id === excludeBlockId) continue;

    const blockStart = new Date(block.start_at);
    const blockEnd = new Date(block.end_at);

    if (doTimeRangesOverlap(newStart, newEnd, blockStart, blockEnd)) {
      return {
        hasCollision: true,
        type: 'locked_block',
        message: `Conflit avec le bloc verrouillé "${block.title}"`,
      };
    }
  }

  return { hasCollision: false };
}

// ============================================
// Export for Testing
// ============================================

export const _testHelpers = {
  getBlockedRanges,
  findFreeSlots,
  calculatePriorityScore,
  getWorkingSlots,
};
