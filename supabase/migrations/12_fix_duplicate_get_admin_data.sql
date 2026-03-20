-- Fix: "function public.get_admin_data(unknown) is not unique"
-- Удаляем ВСЕ перегрузки get_admin_data, затем создаём единственную правильную.

-- Удаляем возможные дубли (разные сигнатуры)
DO $$
DECLARE
  _oid oid;
BEGIN
  FOR _oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_admin_data'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', _oid::regprocedure);
  END LOOP;
END;
$$;

-- Пересоздаём единственную версию: get_admin_data(text) → json
CREATE OR REPLACE FUNCTION public.get_admin_data(admin_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public._admin WHERE secret = admin_password) THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'users',  (SELECT coalesce(json_agg(row_to_json(p)), '[]'::json) FROM public.profiles p),
    'orders', (
      SELECT coalesce(json_agg(
        json_build_object(
          'id',               o.id,
          'user_id',          o.user_id,
          'customer_name',    o.customer_name,
          'customer_phone',   o.customer_phone,
          'customer_email',   o.customer_email,
          'delivery_address', o.delivery_address,
          'pvz_code',         o.pvz_code,
          'pvz_name',         o.pvz_name,
          'total_rub',        o.total_rub,
          'status',           o.status,
          'created_at',       o.created_at,
          'items', (SELECT coalesce(json_agg(row_to_json(i)), '[]'::json)
                    FROM public.order_items i WHERE i.order_id = o.id)
        ) ORDER BY o.created_at DESC
      ), '[]'::json)
      FROM public.orders o
      WHERE o.status IS DISTINCT FROM 'deleted'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Права
GRANT EXECUTE ON FUNCTION public.get_admin_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_data(text) TO authenticated;
