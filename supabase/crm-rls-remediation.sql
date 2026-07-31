DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_customers'
      AND column_name = 'id'
      AND data_type = 'bigint'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: crm_customers.id is not bigint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_customers'
      AND column_name = 'auth_user_id'
      AND data_type = 'uuid'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: crm_customers.auth_user_id is not uuid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_draft_orders'
      AND column_name = 'customer_id'
      AND data_type = 'bigint'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: crm_draft_orders.customer_id is not bigint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_orders'
      AND column_name = 'customer_id'
      AND data_type = 'bigint'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: crm_orders.customer_id is not bigint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_order_items'
      AND column_name = 'order_id'
      AND data_type = 'bigint'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: crm_order_items.order_id is not bigint';
  END IF;
END $$;

ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_draft_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_read ON public.crm_customers;
DROP POLICY IF EXISTS customers_insert ON public.crm_customers;
DROP POLICY IF EXISTS customers_update ON public.crm_customers;

DROP POLICY IF EXISTS crm_customers_customer_read ON public.crm_customers;
DROP POLICY IF EXISTS crm_draft_orders_customer_read ON public.crm_draft_orders;
DROP POLICY IF EXISTS crm_orders_customer_read ON public.crm_orders;
DROP POLICY IF EXISTS crm_order_items_customer_read ON public.crm_order_items;

CREATE POLICY crm_customers_customer_read ON public.crm_customers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

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
