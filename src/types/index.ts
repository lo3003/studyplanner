// ============================================
// Study Planner - Type Definitions
// ============================================

// ============================================
// Database Types (mirror Supabase schema)
// ============================================

export interface Task {
  id: string;
  user_id: string;
  title: string;
  deadline: string; // ISO timestamp
  estimated_hours: number;
  difficulty: number; // 1-5
  importance: number; // 1-5
  created_at: string;
}

export interface FixedEvent {
  id: string;
  user_id: string;
  title: string;
  start_at: string; // ISO timestamp
  end_at: string; // ISO timestamp
  description?: string | null;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleBlock {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  start_at: string; // ISO timestamp
  end_at: string; // ISO timestamp
  duration_minutes: number;
  is_locked: boolean;
  color?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Input Types (for create/update operations)
// ============================================

export interface CreateFixedEventInput {
  title: string;
  start_at: string;
  end_at: string;
  description?: string;
  color?: string;
}

export interface UpdateFixedEventInput {
  title?: string;
  start_at?: string;
  end_at?: string;
  description?: string;
  color?: string;
}

export interface CreateScheduleBlockInput {
  task_id: string;
  title: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  is_locked?: boolean;
  color?: string;
}

export interface UpdateScheduleBlockInput {
  start_at?: string;
  end_at?: string;
  is_locked?: boolean;
}

export interface CreateTaskInput {
  title: string;
  deadline: string;
  estimated_hours: number;
  difficulty: number;
  importance: number;
}

export interface UpdateTaskInput {
  title?: string;
  deadline?: string;
  estimated_hours?: number;
  difficulty?: number;
  importance?: number;
}

// ============================================
// Calendar Event Types (for react-big-calendar)
// ============================================

export type CalendarEventType = 'deadline' | 'fixed_event' | 'schedule_block';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: CalendarEventType;
  resource?: {
    taskId?: string;
    isLocked?: boolean;
    color?: string;
    originalEvent?: Task | FixedEvent | ScheduleBlock;
  };
}

// ============================================
// Scheduler Types
// ============================================

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface DailyWorkHours {
  start: number; // Hour of day (0-23)
  end: number;   // Hour of day (0-23)
}

// Maps day of week (0 = Sunday, 6 = Saturday) to work hours
export type WeeklyWorkHours = {
  [day: number]: DailyWorkHours;
};

export interface SchedulerConfig {
  dailyWorkHours: WeeklyWorkHours; // Work hours per day of week (0-6)
  minBlockMinutes: number; // e.g., 30
  maxBlockMinutes: number; // e.g., 120
  breakBetweenBlocks: number; // minutes
  maxDailyMinutesPerTask: number; // Max minutes per task per day (to spread work)
}

export interface SchedulerResult {
  success: boolean;
  createdBlocks: ScheduleBlock[];
  warnings: SchedulerWarning[];
}

export interface SchedulerWarning {
  taskId: string;
  taskTitle: string;
  message: string;
  unscheduledHours: number;
}

// ============================================
// Date Range Types
// ============================================

export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// ============================================
// Store Types
// ============================================

export interface PlannerState {
  // Data
  tasks: Task[];
  fixedEvents: FixedEvent[];
  scheduleBlocks: ScheduleBlock[];
  
  // Generation warnings
  generationWarnings: SchedulerWarning[];
  
  // Loading states
  isLoading: boolean;
  isGenerating: boolean;
  
  // Error state
  error: string | null;
  
  // Current user
  userId: string | null;
}

export interface PlannerActions {
  // Initialization
  setUserId: (userId: string | null) => void;
  
  // Fetch
  fetchAll: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchFixedEvents: (range?: DateRange) => Promise<void>;
  fetchScheduleBlocks: (range?: DateRange) => Promise<void>;
  
  // Tasks
  addTask: (task: CreateTaskInput) => Promise<boolean>;
  updateTask: (id: string, data: UpdateTaskInput) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  
  // Fixed Events
  addFixedEvent: (event: CreateFixedEventInput) => Promise<boolean>;
  updateFixedEvent: (id: string, event: UpdateFixedEventInput) => Promise<boolean>;
  deleteFixedEvent: (id: string) => Promise<boolean>;
  
  // Schedule Blocks
  updateScheduleBlock: (id: string, data: UpdateScheduleBlockInput) => Promise<boolean>;
  deleteScheduleBlock: (id: string) => Promise<boolean>;
  
  // Scheduler
  generateSchedule: () => Promise<SchedulerResult | null>;
  
  // Utils
  clearError: () => void;
  clearGenerationWarnings: () => void;
  clearAllData: () => Promise<boolean>;
  reset: () => void;
}

export type PlannerStore = PlannerState & PlannerActions;

// ============================================
// Collision Detection Types
// ============================================

export interface CollisionCheckResult {
  hasCollision: boolean;
  collidingEvent?: CalendarEvent;
  message?: string;
}
