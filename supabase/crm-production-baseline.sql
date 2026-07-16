-- ============================================================================
-- CRM Schema — Production Baseline (Source of Truth)
-- ============================================================================
-- این فایل یک **snapshot read-only از schema production** است.
-- برای مرجع و بازبینی، نه برای اجرای مستقیم روی دیتابیس.
--
-- ⚠️ IMPORTANT:
--   - جداول و اشیاء موجود هستند. این فایل را blindly روی production اجرا نکن.
--   - برای DEPLOY از migration idempotent (IF NOT EXISTS / DO block) استفاده کن.
--   - این فایل baseline است، نه migration اجرایی.
--
-- تاریخ استخراج: ۲۵ تیر ۱۴۰۵ (۲۰۲۶-۰۷-۱۶)
-- استخراج شده از: production Supabase (Pooler)
-- روش: pg_dump --schema-only + pg_policies + pg_indexes
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE public.customer_grade_enum AS ENUM (
    'standard',
    'silver',
    'gold',
    'vip',
    'custom'
);

CREATE TYPE public.customer_legal_enum AS ENUM (
    'individual',
    'corporate'
);

CREATE TYPE public.order_status_enum AS ENUM (
    'registered',
    'pending_review',
    'confirmed',
    'proforma_issued',
    'pending_payment',
    'payment_confirmed',
    'in_production',
    'ready_to_ship',
    'shipped',
    'delivered',
    'cancelled',
    'customer_approval',
    'stock_check',
    'exit_approval',
    'rejected',
    'done'
);

CREATE TYPE public.payment_type_enum AS ENUM (
    'cash',
    'credit',
    'mixed'
);

-- ============================================================================
-- 2. TRIGGER FUNCTIONS (public schema)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_next_team_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_recipient TEXT;
  v_label     TEXT;
  v_msg       TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status::TEXT
    WHEN 'pending_review'    THEN v_recipient := 'ardestani';  v_label := 'بررسی استعلام';
    WHEN 'registered'        THEN v_recipient := 'ardestani';  v_label := 'تایید سفارش';
    WHEN 'customer_approval' THEN v_recipient := 'karimloo';   v_label := 'تایید مشتری جدید';
    WHEN 'stock_check'       THEN v_recipient := 'hosseini';   v_label := 'کنترل موجودی';
    WHEN 'proforma_issued'   THEN v_recipient := 'dolatkhah';  v_label := 'صدور پیش فاکتور';
    WHEN 'payment_confirmed' THEN v_recipient := 'seraj';      v_label := 'تسویه مالی';
    WHEN 'in_production'     THEN v_recipient := 'ghasembik';  v_label := 'تولید سفارشی';
    WHEN 'ready_to_ship'     THEN v_recipient := 'moradi';     v_label := 'ارسال سفارش';
    WHEN 'shipped'           THEN v_recipient := 'bozorgmehr'; v_label := 'سفارش ارسال شد';
    WHEN 'delivered'         THEN v_recipient := 'bozorgmehr'; v_label := 'سفارش تحویل شد';
    WHEN 'done'              THEN v_recipient := 'bozorgmehr'; v_label := 'سفارش بسته شد';
    WHEN 'cancelled'         THEN v_recipient := 'ardestani';  v_label := 'سفارش لغو شد';
    WHEN 'rejected'          THEN v_recipient := 'ardestani';  v_label := 'سفارش رد شد';
    ELSE RETURN NEW;
  END CASE;

  v_msg := 'سفارش #' || NEW.id::TEXT || ' - ' || v_label
        || E'\nمشتری #' || COALESCE(NEW.customer_id::TEXT, '?')
        || E'\n' || COALESCE(NEW.amount::TEXT, '-') || ' تومان';

  INSERT INTO crm_notifications (channel, recipient, message, sent_at, status, order_id, customer_id)
  VALUES ('app', v_recipient, v_msg, NOW(), 'unread', NEW.id, NEW.customer_id);

  RETURN NEW;
END;
$function$
;

-- ============================================================================
-- 3. SEQUENCES
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.crm_customers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.crm_draft_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.crm_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.crm_order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- ============================================================================
-- 4. TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_customers (
    id                      bigint NOT NULL,
    name                    text,
    type                    text DEFAULT 'کارخانه'::text,
    city                    text,
    phone                   text,
    contact                 text,
    grade                   public.customer_grade_enum,
    account                 text,
    debt                    bigint DEFAULT 0,
    av                      text,
    notes                   jsonb DEFAULT '[]'::jsonb,
    created_at              timestamp with time zone DEFAULT now(),
    status                  text DEFAULT 'pending'::text,
    approved_by             integer,
    user_id                 integer,
    deleted_at              timestamp with time zone,
    mobile                  text,
    store_name              text,
    email                   text,
    password                text,
    username                text,
    role                    text,
    updated_at              timestamp with time zone DEFAULT now(),
    legal_type              public.customer_legal_enum DEFAULT 'individual'::public.customer_legal_enum,
    min_order_qty           integer DEFAULT 1,
    inquiry_threshold       integer DEFAULT 100,
    national_id             text,
    birth_date              date,
    company_name            text,
    company_national_id     text,
    economic_code           text,
    registration_no         text,
    ceo_name                text,
    province                text,
    address                 text,
    postal_code             text,
    warehouse_address       text,
    whatsapp                text,
    eitaa_id                text,
    portal_username         text,
    portal_password         text,
    portal_active           boolean DEFAULT false,
    last_login_at           timestamp with time zone,
    credit_limit            numeric(14,0) DEFAULT 0,
    payment_terms           text DEFAULT 'نقد'::text,
    bank_name               text,
    bank_account            text,
    sheba                   text,
    total_orders            integer DEFAULT 0,
    total_spent             numeric(14,0) DEFAULT 0,
    last_order_at           timestamp with time zone,
    assigned_to             integer,
    internal_note           text,
    credit_allowed          boolean DEFAULT false,
    credit_days             integer DEFAULT 30,
    customer_status         text DEFAULT 'active'::text,
    sales_segment           text DEFAULT 'retail'::text,
    source_channel          text DEFAULT 'crm'::text,
    loyalty_tier            text DEFAULT 'standard'::text,
    loyalty_points          integer DEFAULT 0,
    legal_consent_version   text,
    legal_consent_at        timestamp with time zone,
    auth_user_id            uuid,
    customer_kind           text DEFAULT 'individual'::text,
    customer_type           character varying(10) DEFAULT 'wholesale'::character varying,
    CONSTRAINT crm_customers_customer_status_check CHECK (
        customer_status = ANY (ARRAY['active'::text, 'new'::text, 'suspended'::text])
    ),
    CONSTRAINT crm_customers_customer_type_check CHECK (
        (customer_type)::text = ANY (
            (ARRAY['retail'::character varying, 'wholesale'::character varying])::text[]
        )
    )
);

CREATE TABLE IF NOT EXISTS public.crm_draft_orders (
    id              bigint NOT NULL,
    customer_id     bigint NOT NULL,
    status          text DEFAULT 'draft'::text NOT NULL,
    items           jsonb DEFAULT '[]'::jsonb NOT NULL,
    note            text,
    pricing_scope   text DEFAULT 'basket'::text,
    sales_channel   text DEFAULT 'wholesale'::text,
    source_app      text DEFAULT 'crm'::text,
    expires_at      timestamp with time zone,
    created_at      timestamp with time zone DEFAULT now() NOT NULL,
    updated_at      timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at      timestamp with time zone,
    CONSTRAINT crm_draft_orders_status_check CHECK (
        status = ANY (ARRAY['draft'::text, 'abandoned'::text, 'converted'::text])
    )
);

CREATE TABLE IF NOT EXISTS public.crm_orders (
    id                        bigint NOT NULL,
    customer_id               bigint,
    product                   text,
    qty                       numeric,
    unit                      text DEFAULT 'تن'::text,
    amount                    bigint,
    status                    public.order_status_enum DEFAULT 'registered'::public.order_status_enum,
    description               text,
    created_at                timestamp with time zone DEFAULT now(),
    order_no                  text,
    created_by                integer,
    deleted_at                timestamp with time zone,
    total_amount              numeric DEFAULT 0,
    order_status              text DEFAULT 'registered'::public.order_status_enum,
    is_inquiry                boolean DEFAULT false,
    subtotal                  numeric(14,0) DEFAULT 0,
    discount                  numeric(14,0) DEFAULT 0,
    tax                       numeric(14,0) DEFAULT 0,
    shipping_cost             numeric(14,0) DEFAULT 0,
    payment_method            text,
    payment_ref               text,
    paid_at                   timestamp with time zone,
    tracking_code             text,
    shipped_at                timestamp with time zone,
    delivered_at              timestamp with time zone,
    shipping_address          text,
    customer_note             text,
    admin_note                text,
    updated_at                timestamp with time zone DEFAULT now(),
    customer_name             text,
    customer_phone            text,
    delivery_address          text,
    note                      text,
    order_type                text DEFAULT 'stock'::text,
    sales_channel             text DEFAULT 'wholesale'::text,
    proforma_status           text DEFAULT 'draft'::text,
    proforma_issued_at        timestamp with time zone,
    proforma_approved_at      timestamp with time zone,
    proforma_rejected_at      timestamp with time zone,
    customer_ip_address       text,
    customer_user_agent       text,
    source_app                text DEFAULT 'crm'::text,
    workflow_status           character varying DEFAULT 'submitted'::character varying NOT NULL,
    current_owner             character varying,
    payment_type              public.payment_type_enum,
    payment_documents         jsonb DEFAULT '[]'::jsonb,
    subtotal_amount           numeric(12,0),
    tier_discount_percent     numeric(5,2) DEFAULT 0.00,
    discount_amount           numeric(12,0) DEFAULT 0,
    total_qty                 bigint,
    pricing_scope             text DEFAULT 'basket'::text,
    request_id                uuid
);

CREATE TABLE IF NOT EXISTS public.crm_order_items (
    id                              bigint NOT NULL,
    order_id                        bigint NOT NULL,
    product_id                      bigint,
    quantity                        integer DEFAULT 1 NOT NULL,
    unit_price                      numeric DEFAULT 0 NOT NULL,
    created_at                      timestamp with time zone DEFAULT now() NOT NULL,
    product_name                    text,
    packaging                       text,
    discount                        numeric(12,0) DEFAULT 0,
    line_total                      numeric(12,0) DEFAULT 0,
    qty                             numeric DEFAULT 0,
    total                           numeric DEFAULT 0 NOT NULL,
    line_subtotal                   numeric(12,0),
    line_discount_amount            numeric(12,0) DEFAULT 0,
    tier_discount_percent_applied   numeric(5,2) DEFAULT 0.00,
    item_name                       character varying NOT NULL,
    unit                            character varying
);

-- ============================================================================
-- 5. SEQUENCE OWNERSHIP
-- ============================================================================

ALTER SEQUENCE IF EXISTS public.crm_customers_id_seq OWNED BY public.crm_customers.id;
ALTER SEQUENCE IF EXISTS public.crm_draft_orders_id_seq OWNED BY public.crm_draft_orders.id;
ALTER SEQUENCE IF EXISTS public.crm_orders_id_seq OWNED BY public.crm_orders.id;
ALTER SEQUENCE IF EXISTS public.crm_order_items_id_seq OWNED BY public.crm_order_items.id;

-- ============================================================================
-- 6. DEFAULT VALUES (bigint → sequence)
-- ============================================================================

ALTER TABLE ONLY public.crm_customers ALTER COLUMN id SET DEFAULT nextval('public.crm_customers_id_seq'::regclass);
ALTER TABLE ONLY public.crm_draft_orders ALTER COLUMN id SET DEFAULT nextval('public.crm_draft_orders_id_seq'::regclass);
ALTER TABLE ONLY public.crm_orders ALTER COLUMN id SET DEFAULT nextval('public.crm_orders_id_seq'::regclass);
ALTER TABLE ONLY public.crm_order_items ALTER COLUMN id SET DEFAULT nextval('public.crm_order_items_id_seq'::regclass);

-- ============================================================================
-- 7. PRIMARY KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE ONLY public.crm_customers
    ADD CONSTRAINT crm_customers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.crm_draft_orders
    ADD CONSTRAINT crm_draft_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.crm_orders
    ADD CONSTRAINT crm_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.crm_order_items
    ADD CONSTRAINT crm_order_items_pkey PRIMARY KEY (id);

-- ============================================================================
-- 8. UNIQUE CONSTRAINTS
-- ============================================================================

ALTER TABLE ONLY public.crm_orders
    ADD CONSTRAINT crm_orders_order_no_key UNIQUE (order_no);

-- ============================================================================
-- 9. FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE ONLY public.crm_draft_orders
    ADD CONSTRAINT crm_draft_orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.crm_customers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.crm_orders
    ADD CONSTRAINT crm_orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.crm_customers(id);

ALTER TABLE ONLY public.crm_order_items
    ADD CONSTRAINT crm_order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.crm_orders(id);

ALTER TABLE ONLY public.crm_order_items
    ADD CONSTRAINT crm_order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id);

-- ============================================================================
-- 10. INDEXES
-- ============================================================================

-- crm_customers
CREATE INDEX IF NOT EXISTS idx_crm_customers_deleted_at ON public.crm_customers USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_crm_customers_name ON public.crm_customers USING btree (name);
CREATE INDEX IF NOT EXISTS idx_crm_customers_phone ON public.crm_customers USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_crm_customers_sales_segment ON public.crm_customers USING btree (sales_segment);
CREATE INDEX IF NOT EXISTS idx_crm_customers_status ON public.crm_customers USING btree (customer_status);
CREATE INDEX IF NOT EXISTS idx_crm_customers_store_name ON public.crm_customers USING btree (store_name);
CREATE INDEX IF NOT EXISTS idx_crm_customers_user_id ON public.crm_customers USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_portal_username ON public.crm_customers USING btree (portal_username)
    WHERE (portal_username IS NOT NULL AND portal_username <> ''::text);

-- crm_draft_orders
CREATE INDEX IF NOT EXISTS idx_crm_draft_orders_customer ON public.crm_draft_orders USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_draft_orders_customer_id ON public.crm_draft_orders USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_draft_orders_deleted_at ON public.crm_draft_orders USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_crm_draft_orders_expires ON public.crm_draft_orders USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_crm_draft_orders_status ON public.crm_draft_orders USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_draft_orders_active_per_customer
    ON public.crm_draft_orders USING btree (customer_id)
    WHERE (deleted_at IS NULL AND status = 'draft'::text);

-- crm_orders
CREATE INDEX IF NOT EXISTS idx_crm_orders_created ON public.crm_orders USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_crm_orders_created_at ON public.crm_orders USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_orders_customer ON public.crm_orders USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_orders_customer_id ON public.crm_orders USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_orders_proforma_status ON public.crm_orders USING btree (proforma_status);
CREATE INDEX IF NOT EXISTS idx_crm_orders_sales_channel ON public.crm_orders USING btree (sales_channel);
CREATE INDEX IF NOT EXISTS idx_crm_orders_status ON public.crm_orders USING btree (order_status);

-- crm_order_items
CREATE INDEX IF NOT EXISTS idx_crm_order_items_order_id ON public.crm_order_items USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_crm_order_items_product_id ON public.crm_order_items USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.crm_order_items USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.crm_order_items USING btree (product_id);

-- ============================================================================
-- 11. TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS crm_customers_updated_at ON public.crm_customers;
CREATE TRIGGER crm_customers_updated_at
    BEFORE UPDATE ON public.crm_customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS crm_draft_orders_updated_at ON public.crm_draft_orders;
CREATE TRIGGER crm_draft_orders_updated_at
    BEFORE UPDATE ON public.crm_draft_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS crm_orders_updated_at ON public.crm_orders;
CREATE TRIGGER crm_orders_updated_at
    BEFORE UPDATE ON public.crm_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crm_orders_updated ON public.crm_orders;
CREATE TRIGGER trg_crm_orders_updated
    BEFORE UPDATE ON public.crm_orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_order_status_notify ON public.crm_orders;
CREATE TRIGGER trg_order_status_notify
    AFTER UPDATE OF status ON public.crm_orders
    FOR EACH ROW EXECUTE FUNCTION public.notify_next_team_member();

-- ============================================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.crm_customers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_draft_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_order_items    ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 13. POLICIES
-- ============================================================================

-- Only customer-scoped read policies currently deployed.
-- Admin access is handled via backend service-role (bypasses RLS).
-- No admin_all policies exist in production as of this baseline.

DROP POLICY IF EXISTS crm_customers_customer_read ON public.crm_customers;
CREATE POLICY crm_customers_customer_read ON public.crm_customers
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS crm_draft_orders_customer_read ON public.crm_draft_orders;
CREATE POLICY crm_draft_orders_customer_read ON public.crm_draft_orders
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.crm_customers c
            WHERE c.id = crm_draft_orders.customer_id
              AND c.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS crm_orders_customer_read ON public.crm_orders;
CREATE POLICY crm_orders_customer_read ON public.crm_orders
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.crm_customers c
            WHERE c.id = crm_orders.customer_id
              AND c.auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS crm_order_items_customer_read ON public.crm_order_items;
CREATE POLICY crm_order_items_customer_read ON public.crm_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.crm_orders o
            JOIN public.crm_customers c ON c.id = o.customer_id
            WHERE o.id = crm_order_items.order_id
              AND c.auth_user_id = auth.uid()
        )
    );

-- ============================================================================
-- 14. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.crm_customers IS 'مشتریان CRM (خرده و عمده)';
COMMENT ON COLUMN public.crm_customers.phone IS 'شماره تماس (کلید جستجوی portal-login-retail)';
COMMENT ON COLUMN public.crm_customers.deleted_at IS 'soft-delete marker (handler فیلتر می‌کند)';
COMMENT ON TABLE public.crm_draft_orders IS 'پیش‌نویس سفارش مشتری (wholesale portal)';
COMMENT ON COLUMN public.crm_draft_orders.customer_id IS 'FK منطقی → crm_customers.id (tenant isolation در handler)';
COMMENT ON COLUMN public.crm_draft_orders.items IS 'آرایه آیتم سفارش (product_id, item_name, quantity, unit_price)';
COMMENT ON TABLE public.crm_orders IS 'سفارش نهایی‌شده از پیش‌نویس (crm-draft-orders submit)';
COMMENT ON COLUMN public.crm_order_items.order_id IS 'FK منطقی → crm_orders.id';
COMMENT ON TABLE public.crm_order_items IS 'آیتم‌های سفارش (insert از crm-draft-orders submit)';

COMMIT;
