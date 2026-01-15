// ============================================
// Study Planner - Scheduler Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateScheduleBlocks,
  checkCollision,
  doTimeRangesOverlap,
  _testHelpers,
  DEFAULT_SCHEDULER_CONFIG,
} from '../scheduler';
import type { Task, FixedEvent, ScheduleBlock, SchedulerConfig } from '@/types';

// ============================================
// Test Data Factories
// ============================================

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Test Task',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    estimated_hours: 4,
    difficulty: 3,
    importance: 3,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createFixedEvent(overrides: Partial<FixedEvent> = {}): FixedEvent {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0); // Tomorrow 10:00
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0); // Tomorrow 12:00

  return {
    id: 'fixed-1',
    user_id: 'user-1',
    title: 'Fixed Event',
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    description: null,
    color: '#6b7280',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createScheduleBlock(overrides: Partial<ScheduleBlock> = {}): ScheduleBlock {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0); // Tomorrow 14:00
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 0); // Tomorrow 15:00

  return {
    id: 'block-1',
    user_id: 'user-1',
    task_id: 'task-1',
    title: 'Study Block',
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    duration_minutes: 60,
    is_locked: false,
    color: '#3b82f6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================
// Test: doTimeRangesOverlap
// ============================================

describe('doTimeRangesOverlap', () => {
  it('should return true for overlapping ranges', () => {
    const start1 = new Date('2026-01-20T10:00:00');
    const end1 = new Date('2026-01-20T12:00:00');
    const start2 = new Date('2026-01-20T11:00:00');
    const end2 = new Date('2026-01-20T13:00:00');

    expect(doTimeRangesOverlap(start1, end1, start2, end2)).toBe(true);
  });

  it('should return true when one range contains another', () => {
    const start1 = new Date('2026-01-20T09:00:00');
    const end1 = new Date('2026-01-20T17:00:00');
    const start2 = new Date('2026-01-20T10:00:00');
    const end2 = new Date('2026-01-20T12:00:00');

    expect(doTimeRangesOverlap(start1, end1, start2, end2)).toBe(true);
  });

  it('should return false for non-overlapping ranges', () => {
    const start1 = new Date('2026-01-20T10:00:00');
    const end1 = new Date('2026-01-20T12:00:00');
    const start2 = new Date('2026-01-20T14:00:00');
    const end2 = new Date('2026-01-20T16:00:00');

    expect(doTimeRangesOverlap(start1, end1, start2, end2)).toBe(false);
  });

  it('should return false for adjacent ranges (no overlap)', () => {
    const start1 = new Date('2026-01-20T10:00:00');
    const end1 = new Date('2026-01-20T12:00:00');
    const start2 = new Date('2026-01-20T12:00:00');
    const end2 = new Date('2026-01-20T14:00:00');

    expect(doTimeRangesOverlap(start1, end1, start2, end2)).toBe(false);
  });
});

// ============================================
// Test: checkCollision
// ============================================

describe('checkCollision', () => {
  it('should detect collision with fixed event', () => {
    const fixedEvent = createFixedEvent({
      start_at: '2026-01-20T10:00:00.000Z',
      end_at: '2026-01-20T12:00:00.000Z',
    });

    const result = checkCollision(
      new Date('2026-01-20T11:00:00.000Z'),
      new Date('2026-01-20T13:00:00.000Z'),
      [fixedEvent],
      []
    );

    expect(result.hasCollision).toBe(true);
    expect(result.type).toBe('fixed_event');
    expect(result.message).toContain('événement fixe');
  });

  it('should detect collision with locked block', () => {
    const lockedBlock = createScheduleBlock({
      start_at: '2026-01-20T14:00:00.000Z',
      end_at: '2026-01-20T16:00:00.000Z',
      is_locked: true,
    });

    const result = checkCollision(
      new Date('2026-01-20T15:00:00.000Z'),
      new Date('2026-01-20T17:00:00.000Z'),
      [],
      [lockedBlock]
    );

    expect(result.hasCollision).toBe(true);
    expect(result.type).toBe('locked_block');
    expect(result.message).toContain('bloc verrouillé');
  });

  it('should NOT detect collision when ranges do not overlap', () => {
    const fixedEvent = createFixedEvent({
      start_at: '2026-01-20T10:00:00.000Z',
      end_at: '2026-01-20T12:00:00.000Z',
    });

    const result = checkCollision(
      new Date('2026-01-20T14:00:00.000Z'),
      new Date('2026-01-20T16:00:00.000Z'),
      [fixedEvent],
      []
    );

    expect(result.hasCollision).toBe(false);
  });

  it('should exclude the block being moved from collision check', () => {
    const lockedBlock = createScheduleBlock({
      id: 'block-to-move',
      start_at: '2026-01-20T14:00:00.000Z',
      end_at: '2026-01-20T16:00:00.000Z',
      is_locked: true,
    });

    // Moving the same block to a new position should not collide with itself
    const result = checkCollision(
      new Date('2026-01-20T14:30:00.000Z'),
      new Date('2026-01-20T16:30:00.000Z'),
      [],
      [lockedBlock],
      'block-to-move' // Exclude this block
    );

    expect(result.hasCollision).toBe(false);
  });
});

// ============================================
// Test: generateScheduleBlocks
// ============================================

describe('generateScheduleBlocks', () => {
  it('should never place blocks during fixed events', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Fixed event from 10:00 to 18:00 (blocks most of the day)
    const fixedEvent = createFixedEvent({
      start_at: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000).toISOString(),
      end_at: new Date(tomorrow.getTime() + 18 * 60 * 60 * 1000).toISOString(),
    });

    const task = createTask({
      deadline: new Date(tomorrow.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
      estimated_hours: 2,
    });

    const result = await generateScheduleBlocks([task], [fixedEvent], []);

    // Verify no blocks overlap with the fixed event
    for (const block of result.createdBlocks) {
      const blockStart = new Date(block.start_at);
      const blockEnd = new Date(block.end_at);
      const eventStart = new Date(fixedEvent.start_at);
      const eventEnd = new Date(fixedEvent.end_at);

      const overlaps = doTimeRangesOverlap(blockStart, blockEnd, eventStart, eventEnd);
      expect(overlaps).toBe(false);
    }
  });

  it('should respect locked blocks as walls', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Locked block from 10:00 to 12:00
    const lockedBlock = createScheduleBlock({
      start_at: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000).toISOString(),
      end_at: new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      is_locked: true,
      task_id: 'other-task',
    });

    const task = createTask({
      id: 'new-task',
      deadline: new Date(tomorrow.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_hours: 2,
    });

    const result = await generateScheduleBlocks([task], [], [lockedBlock]);

    // Verify no new blocks overlap with the locked block
    for (const block of result.createdBlocks) {
      const blockStart = new Date(block.start_at);
      const blockEnd = new Date(block.end_at);
      const lockedStart = new Date(lockedBlock.start_at);
      const lockedEnd = new Date(lockedBlock.end_at);

      const overlaps = doTimeRangesOverlap(blockStart, blockEnd, lockedStart, lockedEnd);
      expect(overlaps).toBe(false);
    }
  });

  it('should create blocks within working hours only', async () => {
    const task = createTask({
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_hours: 4,
    });

    const config: SchedulerConfig = {
      workStartHour: 9,
      workEndHour: 17,
      minBlockMinutes: 30,
      maxBlockMinutes: 120,
      breakBetweenBlocks: 15,
    };

    const result = await generateScheduleBlocks([task], [], [], config);

    // Verify all blocks are within working hours
    for (const block of result.createdBlocks) {
      const blockStart = new Date(block.start_at);
      const blockEnd = new Date(block.end_at);

      expect(blockStart.getHours()).toBeGreaterThanOrEqual(config.workStartHour);
      expect(blockEnd.getHours()).toBeLessThanOrEqual(config.workEndHour);
    }
  });

  it('should return warning when task cannot be fully scheduled', async () => {
    // Create a task with deadline very soon and lots of hours
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 2); // 2 hours from now

    const task = createTask({
      deadline: deadline.toISOString(),
      estimated_hours: 100, // Impossible to schedule 100h in 2h
    });

    const result = await generateScheduleBlocks([task], [], []);

    expect(result.success).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].taskId).toBe(task.id);
    expect(result.warnings[0].unscheduledHours).toBeGreaterThan(0);
  });

  it('should not schedule tasks with past deadlines', async () => {
    const pastDeadline = new Date();
    pastDeadline.setDate(pastDeadline.getDate() - 1); // Yesterday

    const task = createTask({
      deadline: pastDeadline.toISOString(),
      estimated_hours: 2,
    });

    const result = await generateScheduleBlocks([task], [], []);

    // Should not create any blocks for past deadline task
    expect(result.createdBlocks.length).toBe(0);
  });

  it('should prioritize tasks by deadline urgency', async () => {
    const urgentDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
    const laterDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const urgentTask = createTask({
      id: 'urgent-task',
      title: 'Urgent Task',
      deadline: urgentDeadline.toISOString(),
      estimated_hours: 2,
      importance: 5,
    });

    const laterTask = createTask({
      id: 'later-task',
      title: 'Later Task',
      deadline: laterDeadline.toISOString(),
      estimated_hours: 2,
      importance: 1,
    });

    const result = await generateScheduleBlocks([laterTask, urgentTask], [], []);

    // Find first block for each task
    const urgentBlocks = result.createdBlocks.filter((b) => b.task_id === 'urgent-task');
    const laterBlocks = result.createdBlocks.filter((b) => b.task_id === 'later-task');

    if (urgentBlocks.length > 0 && laterBlocks.length > 0) {
      const firstUrgentBlock = new Date(urgentBlocks[0].start_at);
      const firstLaterBlock = new Date(laterBlocks[0].start_at);

      // Urgent task should generally be scheduled first
      expect(firstUrgentBlock.getTime()).toBeLessThanOrEqual(firstLaterBlock.getTime());
    }
  });

  it('should account for already scheduled (locked) hours', async () => {
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const task = createTask({
      id: 'task-with-locked',
      deadline: deadline.toISOString(),
      estimated_hours: 3, // 3 hours total
    });

    // Already have 2 hours locked for this task
    const lockedBlock = createScheduleBlock({
      task_id: 'task-with-locked',
      duration_minutes: 120, // 2 hours
      is_locked: true,
    });

    const result = await generateScheduleBlocks([task], [], [lockedBlock]);

    // Should only schedule 1 more hour (since 2h already locked)
    const newBlocksMinutes = result.createdBlocks.reduce(
      (sum, b) => sum + b.duration_minutes,
      0
    );

    // Allow some flexibility due to block sizing
    expect(newBlocksMinutes).toBeLessThanOrEqual(90); // ~1.5h max
  });
});

// ============================================
// Test: findFreeSlots helper
// ============================================

describe('_testHelpers.findFreeSlots', () => {
  it('should return full working hours when no blocks', () => {
    const day = new Date('2026-01-20');
    const slots = _testHelpers.findFreeSlots(day, [], DEFAULT_SCHEDULER_CONFIG);

    expect(slots.length).toBe(1);
    expect(slots[0].start.getHours()).toBe(DEFAULT_SCHEDULER_CONFIG.workStartHour);
    expect(slots[0].end.getHours()).toBe(DEFAULT_SCHEDULER_CONFIG.workEndHour);
  });

  it('should split around blocked ranges', () => {
    const day = new Date('2026-01-20');
    const blocked = [
      {
        start: new Date('2026-01-20T12:00:00'),
        end: new Date('2026-01-20T14:00:00'),
      },
    ];

    const slots = _testHelpers.findFreeSlots(day, blocked, DEFAULT_SCHEDULER_CONFIG);

    // Should have 2 slots: before and after the blocked range
    expect(slots.length).toBe(2);

    // First slot: 8:00 - 12:00
    expect(slots[0].start.getHours()).toBe(8);
    expect(slots[0].end.getHours()).toBe(12);

    // Second slot: 14:00 - 22:00
    expect(slots[1].start.getHours()).toBe(14);
    expect(slots[1].end.getHours()).toBe(22);
  });
});
