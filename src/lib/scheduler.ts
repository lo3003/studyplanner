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
  differenceInDays,
  format,
  getDay,
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
  dailyWorkHours: {
    0: { start: 10, end: 18 }, // Sunday: 10:00 AM - 6:00 PM
    1: { start: 8, end: 22 },  // Monday: 8:00 AM - 10:00 PM
    2: { start: 8, end: 22 },  // Tuesday: 8:00 AM - 10:00 PM
    3: { start: 8, end: 22 },  // Wednesday: 8:00 AM - 10:00 PM
    4: { start: 8, end: 22 },  // Thursday: 8:00 AM - 10:00 PM
    5: { start: 8, end: 22 },  // Friday: 8:00 AM - 10:00 PM
    6: { start: 10, end: 18 }, // Saturday: 10:00 AM - 6:00 PM
  },
  minBlockMinutes: 30, // Minimum 30 min blocks
  maxBlockMinutes: 120, // Maximum 2h blocks
  breakBetweenBlocks: 15, // 15 min break
  maxDailyMinutesPerTask: 120, // Max 2h per task per day (spread work)
};

// ============================================
// Round-Robin Scheduler Configuration
// ============================================

export const ROUND_ROBIN_CONFIG = {
  MIN_SPACING_DAYS: 1, // Minimum days between same-task sessions
  MAX_DAILY_TOTAL_STUDY: 360, // 6 hours max total study per day
  DAILY_SATURATION_THRESHOLD: 0.75, // Prefer days under 75% full
  PREFERRED_SESSION_DURATIONS: [120, 90, 60, 45, 30], // In minutes
};

// ============================================
// Round-Robin Data Structures
// ============================================

/**
 * Tracking context for each task in the scheduling process
 */
interface TaskSchedulingContext {
  task: Task;
  remainingMinutes: number;
  targetSessions: number;
  targetSpacingDays: number;
  lastSessionDate: Date | null;
  scheduledSessions: number;
  priority: number;
}

/**
 * Daily slot availability tracking
 */
interface DaySlotInventory {
  date: Date;
  dayIndex: number;
  freeSlots: TimeSlot[];
  totalAvailableMinutes: number;
  usedStudyMinutes: number;
  saturation: number; // 0-1, how full the day is
}

/**
 * Tracks task usage per day
 */
interface DailyTaskUsage {
  [taskId: string]: number; // minutes used by this task on this day
}

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
): TimeSlot | null {
  const dayOfWeek = getDay(day); // 0 = Sunday, 6 = Saturday
  const dayConfig = config.dailyWorkHours[dayOfWeek];

  // If no config for this day, return null (no working hours)
  if (!dayConfig) {
    return null;
  }

  const dayStart = startOfDay(day);
  return {
    start: setMinutes(setHours(dayStart, dayConfig.start), 0),
    end: setMinutes(setHours(dayStart, dayConfig.end), 0),
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

  // If no working hours for this day, return empty array
  if (!workingHours) {
    return [];
  }

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

/**
 * Calculate a priority score for a task based on its deadline slack, importance and difficulty.
 *
 * score = (importance × BETA + difficulty × ALPHA) / (slackDays + epsilon) × lengthFactor
 */
function calculatePriorityScore(task: Task): number {
  const ALPHA = 1.0;
  const BETA = 1.5;
  const epsilon = 1e-6;

  const now = new Date();
  const deadline = new Date(task.deadline);

  const estimatedMinutes = task.estimated_hours * 60;
  const minutesUntilDeadline = Math.max(0, differenceInMinutes(deadline, now));

  const daysUntilDeadline = minutesUntilDeadline / (60 * 24);
  const estimatedDays = estimatedMinutes / (60 * 24);
  const slackDays = daysUntilDeadline - estimatedDays;

  const effectiveSlack = Math.max(slackDays, 0) + epsilon;
  const weightedScore = task.importance * BETA + task.difficulty * ALPHA;
  const lengthFactor = task.estimated_hours > 0 ? 1 / task.estimated_hours : 1;

  return (weightedScore / effectiveSlack) * lengthFactor;
}

// ============================================
// Phase 1: Pre-Analysis - Task Planning
// ============================================

/**
 * Calculate scheduling plan for a task
 */
function calculateTaskSchedulingPlan(
  task: Task,
  now: Date
): Pick<TaskSchedulingContext, 'targetSessions' | 'targetSpacingDays' | 'remainingMinutes'> {
  const deadline = new Date(task.deadline);
  const totalMinutes = task.estimated_hours * 60;
  const daysUntilDeadline = Math.max(1, Math.ceil(differenceInDays(deadline, now)));

  // Estimate number of sessions (assuming 60-minute avg sessions)
  const avgSessionMinutes = 60;
  const targetSessions = Math.ceil(totalMinutes / avgSessionMinutes);

  // Calculate ideal spacing between sessions
  const targetSpacingDays = targetSessions > 1
    ? Math.max(1, Math.floor(daysUntilDeadline / targetSessions))
    : 0;

  return {
    targetSessions,
    targetSpacingDays,
    remainingMinutes: totalMinutes,
  };
}

// ============================================
// Phase 2: Slot Inventory - Build daily availability
// ============================================

/**
 * Build inventory of available slots for each day
 */
function buildDailySlotInventory(
  startDate: Date,
  numDays: number,
  blockedRanges: Array<{ start: Date; end: Date }>,
  config: SchedulerConfig
): Map<number, DaySlotInventory> {
  const inventory = new Map<number, DaySlotInventory>();

  for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
    const date = addDays(startOfDay(startDate), dayIndex);
    const freeSlots = findFreeSlots(date, blockedRanges, config);

    const totalAvailableMinutes = freeSlots.reduce(
      (sum, slot) => sum + differenceInMinutes(slot.end, slot.start),
      0
    );

    inventory.set(dayIndex, {
      date,
      dayIndex,
      freeSlots,
      totalAvailableMinutes,
      usedStudyMinutes: 0,
      saturation: 0,
    });
  }

  return inventory;
}

/**
 * Get available minutes for a specific day accounting for usage
 */
function getDayAvailableMinutes(dayInventory: DaySlotInventory): number {
  return Math.max(0, dayInventory.totalAvailableMinutes - dayInventory.usedStudyMinutes);
}

/**
 * Update day saturation after scheduling
 */
function updateDaySaturation(dayInventory: DaySlotInventory): void {
  if (dayInventory.totalAvailableMinutes === 0) {
    dayInventory.saturation = 1;
  } else {
    dayInventory.saturation = dayInventory.usedStudyMinutes / dayInventory.totalAvailableMinutes;
  }
}

// ============================================
// Phase 3: Round-Robin Core - Main scheduling logic
// ============================================

/**
 * Find the next suitable day for scheduling a task session
 */
function findNextSuitableDay(
  taskContext: TaskSchedulingContext,
  inventory: Map<number, DaySlotInventory>,
  dailyTaskUsage: Map<number, DailyTaskUsage>,
  startDayIndex: number,
  config: SchedulerConfig
): { dayIndex: number; dayInventory: DaySlotInventory } | null {
  const deadline = new Date(taskContext.task.deadline);

  for (let dayIndex = startDayIndex; dayIndex < inventory.size; dayIndex++) {
    const dayInventory = inventory.get(dayIndex);
    if (!dayInventory) continue;

    // Check if day is before deadline
    if (isAfter(dayInventory.date, deadline)) continue;

    // Check spacing constraint
    if (taskContext.lastSessionDate) {
      const daysSinceLastSession = differenceInDays(dayInventory.date, taskContext.lastSessionDate);
      if (daysSinceLastSession < ROUND_ROBIN_CONFIG.MIN_SPACING_DAYS) continue;
    }

    // Check if day has available capacity
    const availableMinutes = getDayAvailableMinutes(dayInventory);
    if (availableMinutes < config.minBlockMinutes) continue;

    // Check daily total study limit
    if (dayInventory.usedStudyMinutes >= ROUND_ROBIN_CONFIG.MAX_DAILY_TOTAL_STUDY) continue;

    // Check daily task limit
    const taskUsage = dailyTaskUsage.get(dayIndex) || {};
    const taskMinutesUsed = taskUsage[taskContext.task.id] || 0;
    if (taskMinutesUsed >= config.maxDailyMinutesPerTask) continue;

    // Prefer days under saturation threshold
    if (dayInventory.saturation < ROUND_ROBIN_CONFIG.DAILY_SATURATION_THRESHOLD) {
      return { dayIndex, dayInventory };
    }
  }

  // If no ideal day found, relax saturation constraint
  for (let dayIndex = startDayIndex; dayIndex < inventory.size; dayIndex++) {
    const dayInventory = inventory.get(dayIndex);
    if (!dayInventory) continue;

    if (isAfter(dayInventory.date, deadline)) continue;

    if (taskContext.lastSessionDate) {
      const daysSinceLastSession = differenceInDays(dayInventory.date, taskContext.lastSessionDate);
      if (daysSinceLastSession < ROUND_ROBIN_CONFIG.MIN_SPACING_DAYS) continue;
    }

    const availableMinutes = getDayAvailableMinutes(dayInventory);
    if (availableMinutes < config.minBlockMinutes) continue;

    if (dayInventory.usedStudyMinutes >= ROUND_ROBIN_CONFIG.MAX_DAILY_TOTAL_STUDY) continue;

    const taskUsage = dailyTaskUsage.get(dayIndex) || {};
    const taskMinutesUsed = taskUsage[taskContext.task.id] || 0;
    if (taskMinutesUsed >= config.maxDailyMinutesPerTask) continue;

    return { dayIndex, dayInventory };
  }

  return null;
}

/**
 * Calculate optimal session duration for a slot
 */
function calculateOptimalSessionDuration(
  taskContext: TaskSchedulingContext,
  dayInventory: DaySlotInventory,
  dailyTaskUsage: Map<number, DailyTaskUsage>,
  config: SchedulerConfig
): number {
  const taskUsage = dailyTaskUsage.get(dayInventory.dayIndex) || {};
  const taskMinutesUsed = taskUsage[taskContext.task.id] || 0;

  const dailyAllowance = config.maxDailyMinutesPerTask - taskMinutesUsed;
  const dayAvailable = getDayAvailableMinutes(dayInventory);
  const totalStudyAllowance = ROUND_ROBIN_CONFIG.MAX_DAILY_TOTAL_STUDY - dayInventory.usedStudyMinutes;

  const maxPossible = Math.min(
    taskContext.remainingMinutes,
    dailyAllowance,
    dayAvailable,
    totalStudyAllowance,
    config.maxBlockMinutes
  );

  if (maxPossible < config.minBlockMinutes) return 0;

  // Snap to preferred durations
  for (const preferredDuration of ROUND_ROBIN_CONFIG.PREFERRED_SESSION_DURATIONS) {
    if (preferredDuration <= maxPossible && preferredDuration >= config.minBlockMinutes) {
      return preferredDuration;
    }
  }

  return maxPossible >= config.minBlockMinutes ? maxPossible : 0;
}

/**
 * Main round-robin scheduling algorithm
 */
function scheduleTasksRoundRobin(
  tasks: Task[],
  inventory: Map<number, DaySlotInventory>,
  now: Date,
  config: SchedulerConfig
): { contexts: TaskSchedulingContext[]; createdBlocks: ScheduleBlock[] } {
  const taskContexts: TaskSchedulingContext[] = tasks.map(task => {
    const plan = calculateTaskSchedulingPlan(task, now);
    return {
      task,
      ...plan,
      lastSessionDate: null,
      scheduledSessions: 0,
      priority: calculatePriorityScore(task),
    };
  }).sort((a, b) => b.priority - a.priority);

  const createdBlocks: ScheduleBlock[] = [];
  const dailyTaskUsage = new Map<number, DailyTaskUsage>();

  let currentDayIndex = 0;
  let maxRounds = 200;
  let roundsWithoutPlacement = 0;

  while (maxRounds-- > 0) {
    let placedThisRound = false;

    for (const taskContext of taskContexts) {
      if (taskContext.remainingMinutes <= 0) continue;

      const result = findNextSuitableDay(
        taskContext,
        inventory,
        dailyTaskUsage,
        currentDayIndex,
        config
      );

      if (!result) continue;

      const { dayIndex, dayInventory } = result;

      const sessionDuration = calculateOptimalSessionDuration(
        taskContext,
        dayInventory,
        dailyTaskUsage,
        config
      );

      if (sessionDuration < config.minBlockMinutes) continue;

      const suitableSlot = dayInventory.freeSlots.find(
        slot => differenceInMinutes(slot.end, slot.start) >= sessionDuration
      );

      if (!suitableSlot) continue;

      const blockStart = suitableSlot.start;
      const blockEnd = addMinutes(blockStart, sessionDuration);

      const newBlock: ScheduleBlock = {
        id: crypto.randomUUID(),
        user_id: taskContext.task.user_id,
        task_id: taskContext.task.id,
        title: taskContext.task.title,
        start_at: blockStart.toISOString(),
        end_at: blockEnd.toISOString(),
        duration_minutes: sessionDuration,
        is_locked: false,
        color: '#3b82f6',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      createdBlocks.push(newBlock);
      taskContext.remainingMinutes -= sessionDuration;
      taskContext.scheduledSessions++;
      taskContext.lastSessionDate = dayInventory.date;

      dayInventory.usedStudyMinutes += sessionDuration;
      updateDaySaturation(dayInventory);

      const nextStart = addMinutes(blockEnd, config.breakBetweenBlocks);
      suitableSlot.start = nextStart;

      if (!dailyTaskUsage.has(dayIndex)) {
        dailyTaskUsage.set(dayIndex, {});
      }
      const taskUsage = dailyTaskUsage.get(dayIndex)!;
      taskUsage[taskContext.task.id] = (taskUsage[taskContext.task.id] || 0) + sessionDuration;

      placedThisRound = true;
    }

    if (!placedThisRound) {
      roundsWithoutPlacement++;
      currentDayIndex++;

      if (roundsWithoutPlacement > 10 || currentDayIndex >= inventory.size) break;
    } else {
      roundsWithoutPlacement = 0;
    }

    const allComplete = taskContexts.every(tc => tc.remainingMinutes <= 0);
    if (allComplete) break;
  }

  return { contexts: taskContexts, createdBlocks };
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
  const now = new Date();
  // Filter tasks with remaining hours to schedule
  const tasksToSchedule = tasks.filter(task => {
    const deadline = new Date(task.deadline);
    return isAfter(deadline, now) && task.estimated_hours > 0;
  });
  if (tasksToSchedule.length === 0) {
    return { success: true, createdBlocks: [], warnings: [] };
  }
  // Get allblocked ranges
  const blockedRanges = getBlockedRanges(fixedEvents, lockedBlocks);
  // Generate schedule up to the furthest deadline
  const furthestDeadline = tasksToSchedule
    .map(t => new Date(t.deadline))
    .reduce((max, d) => d.getTime() > max.getTime() ? d : max, new Date(now));
  const minHorizonDays = 30;
  const maxHorizonDays = 120;
  const horizonDays = Math.min(
    maxHorizonDays,
    Math.max(minHorizonDays, differenceInDays(furthestDeadline, now) + 1)
  );
  // Build daily slot inventory
  const inventory = buildDailySlotInventory(
    startOfDay(now),
    horizonDays,
    blockedRanges,
    config
  );
  // Run round-robin scheduler
  const { contexts, createdBlocks } = scheduleTasksRoundRobin(
    tasksToSchedule,
    inventory,
    now,
    config
  );
  // Generate warnings for unscheduled work
  for (const taskContext of contexts) {
    if (taskContext.remainingMinutes > 0) {
      const deadline = new Date(taskContext.task.deadline);
      warnings.push({
        taskId: taskContext.task.id,
        taskTitle: taskContext.task.title,
        message: `Impossible de planifier ${Math.round(taskContext.remainingMinutes / 60 * 10) / 10}h avant le ${format(deadline, 'dd/MM/yyyy')}`,
        unscheduledHours: taskContext.remainingMinutes / 60,
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

  for (const block of lockedBlocks) {
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
