-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add order_id to project_control_projects
-- Links projects to crm_orders for order-to-project conversion path.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE project_control_projects
  ADD COLUMN IF NOT EXISTS order_id INTEGER UNIQUE;

COMMENT ON COLUMN project_control_projects.order_id IS 'شناسه سفارش مرتبط (crm_orders.id) — برای مسیر تبدیل سفارش به پروژه';

-- ایندکس برای جستجوی پروژه‌ها بر اساس سفارش
CREATE INDEX IF NOT EXISTS idx_pcp_order_id ON project_control_projects(order_id);
