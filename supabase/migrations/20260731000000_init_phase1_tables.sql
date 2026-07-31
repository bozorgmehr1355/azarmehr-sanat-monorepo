-- Migration: 20260731000000_init_phase1_tables.sql
-- تاریخ: ۲۰۲۶-۰۷-۳۱
-- Phase 1 (Tasks, Evidences, Meeting Minutes, Audit Logs)

-- 1. Enums
CREATE TYPE task_status AS ENUM (
  'PENDING_ACK',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'BLOCKED'
);

CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'PENDING_ACK',
  priority task_priority NOT NULL DEFAULT 'MEDIUM',
  assignee_id UUID,
  created_by UUID,
  customer_id UUID,
  order_id UUID,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Task Evidences Table
CREATE TABLE IF NOT EXISTS public.task_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL, -- e.g. 'IMAGE', 'FILE', 'TEXT', 'URL'
  content_url TEXT,
  notes TEXT,
  submitted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Meeting Minutes Table
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  session_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_notes TEXT NOT NULL,
  summary TEXT,
  decisions JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  changes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
