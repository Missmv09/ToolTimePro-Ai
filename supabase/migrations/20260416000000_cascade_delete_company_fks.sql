-- Ensure every foreign key pointing at public.companies(id) cascades on delete.
-- Several older migrations (recurring_jobs, notifications, google_calendar_connections,
-- payment_plans, webhooks) omitted ON DELETE CASCADE, which blocks deletion of a
-- company row for account resets and tenant offboarding.
--
-- This block rewrites any single-column FK referencing companies whose delete rule
-- is NO ACTION ('a') or RESTRICT ('r'). SET NULL ('n') and SET DEFAULT ('d') are
-- left alone — those are intentional design choices (e.g. website_leads preserves
-- lead history after a company is removed).

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT
      c.conname     AS constraint_name,
      n.nspname     AS schema_name,
      t.relname     AS table_name,
      a.attname     AS column_name
    FROM pg_constraint c
    JOIN pg_class      t  ON t.oid  = c.conrelid
    JOIN pg_namespace  n  ON n.oid  = t.relnamespace
    JOIN pg_class      r  ON r.oid  = c.confrelid
    JOIN pg_namespace  rn ON rn.oid = r.relnamespace
    JOIN pg_attribute  a  ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND rn.nspname = 'public'
      AND r.relname  = 'companies'
      AND c.confdeltype IN ('a', 'r')
      AND array_length(c.conkey, 1) = 1
  LOOP
    RAISE NOTICE 'Rewriting FK % on %.%(%) to ON DELETE CASCADE',
      fk.constraint_name, fk.schema_name, fk.table_name, fk.column_name;

    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      fk.schema_name, fk.table_name, fk.constraint_name
    );

    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.companies(id) ON DELETE CASCADE',
      fk.schema_name, fk.table_name, fk.constraint_name, fk.column_name
    );
  END LOOP;
END $$;
