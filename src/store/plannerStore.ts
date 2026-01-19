// ============================================
// Study Planner - Zustand Store
// Centralized state management
// ============================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Task,
  FixedEvent,
  ScheduleBlock,
  CreateTaskInput,
  UpdateTaskInput,
  CreateFixedEventInput,
  UpdateFixedEventInput,
  UpdateScheduleBlockInput,
  DateRange,
  PlannerStore,
  SchedulerResult,
  SchedulerWarning,
} from '@/types';
import * as services from '@/lib/supabase/services';
import { generateScheduleBlocks } from '@/lib/scheduler';

// ============================================
// Initial State
// ============================================

const initialState = {
  tasks: [] as Task[],
  fixedEvents: [] as FixedEvent[],
  scheduleBlocks: [] as ScheduleBlock[],
  generationWarnings: [] as SchedulerWarning[],
  isLoading: false,
  isGenerating: false,
  error: null as string | null,
  userId: null as string | null,
};

// ============================================
// Store Implementation
// ============================================

export const usePlannerStore = create<PlannerStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================
      // Initialization
      // ========================================

      setUserId: (userId) => {
        set({ userId }, false, 'setUserId');
      },

      // ========================================
      // Fetch Operations
      // ========================================

      fetchAll: async () => {
        set({ isLoading: true, error: null }, false, 'fetchAll/start');

        try {
          // Fetch all data in parallel
          const [tasksRes, fixedEventsRes, blocksRes] = await Promise.all([
            services.getTasks(),
            services.getFixedEvents(),
            services.getScheduleBlocks(),
          ]);

          // Check for errors
          if (tasksRes.error) throw new Error(tasksRes.error);
          if (fixedEventsRes.error) throw new Error(fixedEventsRes.error);
          if (blocksRes.error) throw new Error(blocksRes.error);

          set(
            {
              tasks: tasksRes.data ?? [],
              fixedEvents: fixedEventsRes.data ?? [],
              scheduleBlocks: blocksRes.data ?? [],
              isLoading: false,
            },
            false,
            'fetchAll/success'
          );
        } catch (error) {
          set(
            {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to fetch data',
            },
            false,
            'fetchAll/error'
          );
        }
      },

      fetchTasks: async () => {
        const res = await services.getTasks();
        if (res.error) {
          set({ error: res.error }, false, 'fetchTasks/error');
        } else {
          set({ tasks: res.data ?? [] }, false, 'fetchTasks/success');
        }
      },

      fetchFixedEvents: async (range?: DateRange) => {
        const res = await services.getFixedEvents(range);
        if (res.error) {
          set({ error: res.error }, false, 'fetchFixedEvents/error');
        } else {
          set({ fixedEvents: res.data ?? [] }, false, 'fetchFixedEvents/success');
        }
      },

      fetchScheduleBlocks: async (range?: DateRange) => {
        const res = await services.getScheduleBlocks(range);
        if (res.error) {
          set({ error: res.error }, false, 'fetchScheduleBlocks/error');
        } else {
          set({ scheduleBlocks: res.data ?? [] }, false, 'fetchScheduleBlocks/success');
        }
      },

      // ========================================
      // Task Operations
      // ========================================

      addTask: async (input: CreateTaskInput) => {
        const res = await services.createTask(input);
        if (res.error) {
          set({ error: res.error }, false, 'addTask/error');
          return false;
        }
        if (res.data) {
          set(
            (state) => ({ tasks: [...state.tasks, res.data!] }),
            false,
            'addTask/success'
          );
        }
        return true;
      },

      updateTask: async (id: string, data: UpdateTaskInput) => {
        const res = await services.updateTask(id, data);
        if (res.error) {
          set({ error: res.error }, false, 'updateTask/error');
          return false;
        }
        if (res.data) {
          set(
            (state) => ({
              tasks: state.tasks.map((t) =>
                t.id === id ? res.data! : t
              ),
            }),
            false,
            'updateTask/success'
          );
        }
        return true;
      },

      deleteTask: async (taskId: string) => {
        const res = await services.deleteTask(taskId);
        if (res.error) {
          set({ error: res.error }, false, 'deleteTask/error');
          return false;
        }
        set(
          (state) => ({
            tasks: state.tasks.filter((t) => t.id !== taskId),
            // Also remove associated schedule blocks
            scheduleBlocks: state.scheduleBlocks.filter((b) => b.task_id !== taskId),
          }),
          false,
          'deleteTask/success'
        );
        return true;
      },

      // ========================================
      // Fixed Event Operations
      // ========================================

      addFixedEvent: async (input: CreateFixedEventInput) => {
        const res = await services.createFixedEvent(input);
        if (res.error) {
          set({ error: res.error }, false, 'addFixedEvent/error');
          return false;
        }
        if (res.data) {
          set(
            (state) => ({ fixedEvents: [...state.fixedEvents, res.data!] }),
            false,
            'addFixedEvent/success'
          );
        }
        return true;
      },

      updateFixedEvent: async (id: string, input: UpdateFixedEventInput) => {
        const res = await services.updateFixedEvent(id, input);
        if (res.error) {
          set({ error: res.error }, false, 'updateFixedEvent/error');
          return false;
        }
        if (res.data) {
          set(
            (state) => ({
              fixedEvents: state.fixedEvents.map((e) =>
                e.id === id ? res.data! : e
              ),
            }),
            false,
            'updateFixedEvent/success'
          );
        }
        return true;
      },

      deleteFixedEvent: async (id: string) => {
        const res = await services.deleteFixedEvent(id);
        if (res.error) {
          set({ error: res.error }, false, 'deleteFixedEvent/error');
          return false;
        }
        set(
          (state) => ({
            fixedEvents: state.fixedEvents.filter((e) => e.id !== id),
          }),
          false,
          'deleteFixedEvent/success'
        );
        return true;
      },

      // ========================================
      // Schedule Block Operations
      // ========================================

      updateScheduleBlock: async (id: string, data: UpdateScheduleBlockInput) => {
        const res = await services.updateScheduleBlock(id, data);
        if (res.error) {
          set({ error: res.error }, false, 'updateScheduleBlock/error');
          return false;
        }
        if (res.data) {
          set(
            (state) => ({
              scheduleBlocks: state.scheduleBlocks.map((b) =>
                b.id === id ? res.data! : b
              ),
            }),
            false,
            'updateScheduleBlock/success'
          );
        }
        return true;
      },

      deleteScheduleBlock: async (id: string) => {
        const res = await services.deleteScheduleBlock(id);
        if (res.error) {
          set({ error: res.error }, false, 'deleteScheduleBlock/error');
          return false;
        }
        set(
          (state) => ({
            scheduleBlocks: state.scheduleBlocks.filter((b) => b.id !== id),
          }),
          false,
          'deleteScheduleBlock/success'
        );
        return true;
      },

      // ========================================
      // Schedule Generation
      // ========================================

      generateSchedule: async (): Promise<SchedulerResult | null> => {
        const { tasks, fixedEvents, scheduleBlocks } = get();

        set({ isGenerating: true, error: null }, false, 'generateSchedule/start');

        try {
          // 1. Delete future unlocked blocks
          const deleteRes = await services.deleteFutureUnlockedBlocks();
          if (deleteRes.error) throw new Error(deleteRes.error);

          // 2. Get locked blocks (they're walls)
          const lockedRes = await services.getLockedBlocks();
          if (lockedRes.error) throw new Error(lockedRes.error);
          const lockedBlocks = lockedRes.data ?? [];

          // 3. Generate new schedule
          const result = await generateScheduleBlocks(tasks, fixedEvents, lockedBlocks);

          // 4. Save to DB
          if (result.createdBlocks.length > 0) {
            const createRes = await services.createScheduleBlocksBatch(
              result.createdBlocks.map((block) => ({
                task_id: block.task_id,
                title: block.title,
                start_at: block.start_at,
                end_at: block.end_at,
                duration_minutes: block.duration_minutes,
                is_locked: block.is_locked,
                color: block.color,
              }))
            );

            if (createRes.error) throw new Error(createRes.error);

            // 5. Update local state with new blocks + locked blocks + warnings
            set(
              {
                scheduleBlocks: [
                  ...lockedBlocks,
                  ...(createRes.data ?? []),
                ],
                generationWarnings: result.warnings,
                isGenerating: false,
              },
              false,
              'generateSchedule/success'
            );
          } else {
            // No new blocks created, just keep locked ones
            set(
              {
                scheduleBlocks: lockedBlocks,
                generationWarnings: result.warnings,
                isGenerating: false,
              },
              false,
              'generateSchedule/noBlocks'
            );
          }

          return result;
        } catch (error) {
          set(
            {
              isGenerating: false,
              error: error instanceof Error ? error.message : 'Failed to generate schedule',
            },
            false,
            'generateSchedule/error'
          );
          return null;
        }
      },

      // ========================================
      // Utilities
      // ========================================

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },

      clearGenerationWarnings: () => {
        set({ generationWarnings: [] }, false, 'clearGenerationWarnings');
      },

      clearAllData: async () => {
        set({ isLoading: true, error: null }, false, 'clearAllData/start');
        
        const res = await services.deleteAllUserData();
        if (res.error) {
          set({ error: res.error, isLoading: false }, false, 'clearAllData/error');
          return false;
        }
        
        set(
          {
            ...initialState,
            userId: get().userId, // Keep the userId
          },
          false,
          'clearAllData/success'
        );
        return true;
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    { name: 'PlannerStore' }
  )
);

// ============================================
// Selectors (for optimized rerenders)
// ============================================

export const selectTasks = (state: PlannerStore) => state.tasks;
export const selectFixedEvents = (state: PlannerStore) => state.fixedEvents;
export const selectScheduleBlocks = (state: PlannerStore) => state.scheduleBlocks;
export const selectGenerationWarnings = (state: PlannerStore) => state.generationWarnings;
export const selectIsLoading = (state: PlannerStore) => state.isLoading;
export const selectIsGenerating = (state: PlannerStore) => state.isGenerating;
export const selectError = (state: PlannerStore) => state.error;
