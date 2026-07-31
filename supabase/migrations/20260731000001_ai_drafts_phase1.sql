-- Migration: 20260731000001_ai_drafts_phase1.sql
-- تاریخ: ۲۰۲۶-۰۷-۳۱
-- Phase 1 — جدول پیش‌نویس‌های هوش مصنوعی (موتور Omnichannel AI Agent)
--
-- نکته: این مایگریشن idempotent است؛ روی production نیز می‌تواند اجرا شود.
-- ستون‌های legacy (approval_status و ...) برای سازگاری با هندلر موجود
-- backend/handlers/ai-drafts.js حفظ شده‌اند و ستون‌های جدید (status و ...)
-- متعلق به موتور AI جدید (backend/services/aiAgentService.js) هستند.

CREATE TABLE IF NOT EXISTS public.ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,               -- meeting_minutes | task | ...
  entity_id UUID,
  draft_type TEXT NOT NULL,                -- meeting_summary | action_items | task_brief | ...
  input_text TEXT,                         -- متن خام ورودی
  output_text TEXT,                        -- خروجی متنی (سازگاری با هندلر legacy)
  summary TEXT,                            -- خلاصه استخراج‌شده توسط AI
  decisions JSONB DEFAULT '[]'::jsonb,     -- تصمیم‌های استخراج‌شده
  action_items JSONB DEFAULT '[]'::jsonb,  -- اکشن‌آیتم‌های استخراج‌شده
  status TEXT DEFAULT 'DRAFT',             -- موتور AI جدید: DRAFT | APPROVED | REJECTED
  approval_status TEXT DEFAULT 'PENDING',  -- هندلر legacy: PENDING | APPROVED | REJECTED
  created_by UUID,
  approved_by UUID,
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ستون‌های جدید برای محیط‌هایی که جدول از قبل دارند (idempotent)
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS decisions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT';
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.ai_drafts ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- ایندکس برای فیلتر وضعیت و نوع
CREATE INDEX IF NOT EXISTS idx_ai_drafts_status ON public.ai_drafts (status);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_entity ON public.ai_drafts (entity_type, entity_id);
