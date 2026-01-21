// ============================================
// Study Planner - Supabase Services
// Centralized typed CRUD operations
// ============================================

import { supabase } from '../supabase';
import type {
  Task,
  FixedEvent,
  ScheduleBlock,
  CreateTaskInput,
  UpdateTaskInput,
  CreateFixedEventInput,
  UpdateFixedEventInput,
  CreateScheduleBlockInput,
  UpdateScheduleBlockInput,
  DateRange,
  ApiResponse,
} from '@/types';

// ============================================
// Helper: Get current user ID
// ============================================

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================
// TASKS Services
// ============================================

export async function getTasks(): Promise<ApiResponse<Task[]>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('deadline', { ascending: true });

  return {
    data: data as Task[] | null,
    error: error?.message ?? null,
  };
}

export async function createTask(input: CreateTaskInput): Promise<ApiResponse<Task>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: input.title,
      deadline: input.deadline,
      estimated_hours: input.estimated_hours,
      difficulty: input.difficulty,
      importance: input.importance,
    })
    .select()
    .single();

  return {
    data: data as Task | null,
    error: error?.message ?? null,
  };
}

export async function updateTask(
  taskId: string,
  updates: UpdateTaskInput
): Promise<ApiResponse<Task>> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  return {
    data: data as Task | null,
    error: error?.message ?? null,
  };
}

export async function deleteTask(taskId: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  return {
    data: null,
    error: error?.message ?? null,
  };
}

// ============================================
// FIXED EVENTS Services
// ============================================

export async function getFixedEvents(range?: DateRange): Promise<ApiResponse<FixedEvent[]>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  let query = supabase
    .from('fixed_events')
    .select('*')
    .eq('user_id', userId)
    .order('start_at', { ascending: true });

  // Filter by date range if provided
  if (range) {
    query = query
      .gte('start_at', range.start.toISOString())
      .lte('end_at', range.end.toISOString());
  }

  const { data, error } = await query;

  return {
    data: data as FixedEvent[] | null,
    error: error?.message ?? null,
  };
}

export async function createFixedEvent(input: CreateFixedEventInput): Promise<ApiResponse<FixedEvent>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  const { data, error } = await supabase
    .from('fixed_events')
    .insert({
      user_id: userId,
      title: input.title,
      start_at: input.start_at,
      end_at: input.end_at,
      description: input.description,
      color: input.color ?? '#6b7280',
    })
    .select()
    .single();

  return {
    data: data as FixedEvent | null,
    error: error?.message ?? null,
  };
}

export async function updateFixedEvent(
  id: string,
  input: UpdateFixedEventInput
): Promise<ApiResponse<FixedEvent>> {
  const { data, error } = await supabase
    .from('fixed_events')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  return {
    data: data as FixedEvent | null,
    error: error?.message ?? null,
  };
}

export async function deleteFixedEvent(id: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('fixed_events')
    .delete()
    .eq('id', id);

  return {
    data: null,
    error: error?.message ?? null,
  };
}

// ============================================
// SCHEDULE BLOCKS Services
// ============================================

export async function getScheduleBlocks(range?: DateRange): Promise<ApiResponse<ScheduleBlock[]>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  let query = supabase
    .from('schedule_blocks')
    .select('*')
    .eq('user_id', userId)
    .order('start_at', { ascending: true });

  // Filter by date range if provided
  if (range) {
    query = query
      .gte('start_at', range.start.toISOString())
      .lte('end_at', range.end.toISOString());
  }

  const { data, error } = await query;

  return {
    data: data as ScheduleBlock[] | null,
    error: error?.message ?? null,
  };
}

export async function createScheduleBlock(
  input: CreateScheduleBlockInput
): Promise<ApiResponse<ScheduleBlock>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert({
      user_id: userId,
      task_id: input.task_id,
      title: input.title,
      start_at: input.start_at,
      end_at: input.end_at,
      duration_minutes: input.duration_minutes,
      is_locked: input.is_locked ?? false,
      color: input.color ?? '#3b82f6',
    })
    .select()
    .single();

  return {
    data: data as ScheduleBlock | null,
    error: error?.message ?? null,
  };
}

export async function createScheduleBlocksBatch(
  inputs: CreateScheduleBlockInput[]
): Promise<ApiResponse<ScheduleBlock[]>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  const records = inputs.map((input) => ({
    user_id: userId,
    task_id: input.task_id,
    title: input.title,
    start_at: input.start_at,
    end_at: input.end_at,
    duration_minutes: input.duration_minutes,
    is_locked: input.is_locked ?? false,
    color: input.color ?? '#3b82f6',
  }));

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert(records)
    .select();

  return {
    data: data as ScheduleBlock[] | null,
    error: error?.message ?? null,
  };
}

export async function updateScheduleBlock(
  id: string,
  input: UpdateScheduleBlockInput
): Promise<ApiResponse<ScheduleBlock>> {
  const { data, error } = await supabase
    .from('schedule_blocks')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  return {
    data: data as ScheduleBlock | null,
    error: error?.message ?? null,
  };
}

export async function deleteScheduleBlock(id: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('id', id);

  return {
    data: null,
    error: error?.message ?? null,
  };
}

export async function deleteAllScheduleBlocks(): Promise<ApiResponse<null>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('user_id', userId);

  return {
    data: null,
    error: error?.message ?? null,
  };
}

export async function deleteFutureUnlockedBlocks(): Promise<ApiResponse<null>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('is_locked', false)
    .gte('start_at', now);

  return {
    data: null,
    error: error?.message ?? null,
  };
}

// ============================================
// LOCKED BLOCKS Services (for scheduler)
// ============================================

export async function getLockedBlocks(range?: DateRange): Promise<ApiResponse<ScheduleBlock[]>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  let query = supabase
    .from('schedule_blocks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_locked', true)
    .order('start_at', { ascending: true });

  if (range) {
    query = query
      .gte('start_at', range.start.toISOString())
      .lte('end_at', range.end.toISOString());
  }

  const { data, error } = await query;

  return {
    data: data as ScheduleBlock[] | null,
    error: error?.message ?? null,
  };
}

// ============================================
// DELETE ALL USER DATA
// ============================================

export async function deleteAllUserData(): Promise<ApiResponse<null>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'User not authenticated' };
  }

  // Delete in order to respect foreign key constraints:
  // 1. schedule_blocks (references tasks)
  // 2. fixed_events
  // 3. tasks

  const { error: blocksError } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('user_id', userId);

  if (blocksError) {
    return { data: null, error: blocksError.message };
  }

  const { error: eventsError } = await supabase
    .from('fixed_events')
    .delete()
    .eq('user_id', userId);

  if (eventsError) {
    return { data: null, error: eventsError.message };
  }

  const { error: tasksError } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId);

  if (tasksError) {
    return { data: null, error: tasksError.message };
  }

  return { data: null, error: null };
}
