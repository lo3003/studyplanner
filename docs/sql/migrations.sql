-- ============================================
-- Study Planner - Database Migrations
-- Version: MVP Phase 2
-- Date: 2026-01-15
-- ============================================

-- ============================================
-- CLEANUP: Drop existing tables if they exist (for clean install)
-- WARNING: This will delete all data! Comment out if you want to keep data.
-- ============================================

DROP TABLE IF EXISTS public.schedule_blocks CASCADE;
DROP TABLE IF EXISTS public.fixed_events CASCADE;

-- ============================================
-- TABLE: fixed_events
-- Description: Événements fixes/immuables (cours, RDV, etc.)
-- Ces événements bloquent la génération de schedule_blocks
-- ============================================

CREATE TABLE public.fixed_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6b7280',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fixed_events_valid_time CHECK (end_at > start_at)
);

-- Index pour les requêtes par user et par plage de dates
CREATE INDEX idx_fixed_events_user_id ON public.fixed_events(user_id);
CREATE INDEX idx_fixed_events_time_range ON public.fixed_events(start_at, end_at);

-- RLS: Chaque user ne voit que ses propres événements
ALTER TABLE public.fixed_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own fixed_events" ON public.fixed_events;
CREATE POLICY "Users can view own fixed_events" ON public.fixed_events
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own fixed_events" ON public.fixed_events;
CREATE POLICY "Users can insert own fixed_events" ON public.fixed_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own fixed_events" ON public.fixed_events;
CREATE POLICY "Users can update own fixed_events" ON public.fixed_events
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own fixed_events" ON public.fixed_events;
CREATE POLICY "Users can delete own fixed_events" ON public.fixed_events
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TABLE: schedule_blocks
-- Description: Blocs de travail générés par l'algorithme
-- Peuvent être déplacés par drag & drop et verrouillés
-- ============================================

CREATE TABLE public.schedule_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT schedule_blocks_valid_time CHECK (end_at > start_at)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_schedule_blocks_user_id ON public.schedule_blocks(user_id);
CREATE INDEX idx_schedule_blocks_task_id ON public.schedule_blocks(task_id);
CREATE INDEX idx_schedule_blocks_time_range ON public.schedule_blocks(start_at, end_at);
CREATE INDEX idx_schedule_blocks_locked ON public.schedule_blocks(is_locked) WHERE is_locked = true;

-- RLS: Chaque user ne voit que ses propres blocs
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own schedule_blocks" ON public.schedule_blocks;
CREATE POLICY "Users can view own schedule_blocks" ON public.schedule_blocks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own schedule_blocks" ON public.schedule_blocks;
CREATE POLICY "Users can insert own schedule_blocks" ON public.schedule_blocks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own schedule_blocks" ON public.schedule_blocks;
CREATE POLICY "Users can update own schedule_blocks" ON public.schedule_blocks
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own schedule_blocks" ON public.schedule_blocks;
CREATE POLICY "Users can delete own schedule_blocks" ON public.schedule_blocks
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_fixed_events_updated_at ON public.fixed_events;
CREATE TRIGGER update_fixed_events_updated_at
    BEFORE UPDATE ON public.fixed_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_blocks_updated_at ON public.schedule_blocks;
CREATE TRIGGER update_schedule_blocks_updated_at
    BEFORE UPDATE ON public.schedule_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- OPTIONAL: Add missing columns to tasks table if needed
-- (Uncomment if your tasks table doesn't have these)
-- ============================================

-- ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS remaining_hours NUMERIC DEFAULT 0;
-- ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_hours NUMERIC DEFAULT 0;
