-- ============================================================================
-- MySuperStore — Complete the notification pipeline
-- 1) Enqueue customer notifications on order status changes
-- 2) Enqueue a customer "order_paid" notification on successful payment
-- 3) Add read_at for in-app read/unread tracking
-- 4) RLS: customers, vendors and delivery partners can read + mark their own
--    notification_outbox rows (admins keep full access)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) trg_enqueue_order_status_notifications — now also notifies the customer
--    who owns the order on every fulfillment status transition.
--    (Vendor + delivery-partner broadcasts preserved exactly as before.)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enqueue_order_status_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order_id uuid;
  v_new text;
  v_old text;
  v_vendor_ids uuid[];
  v_delivery_partner_id uuid;
  v_vendor_id uuid;
  v_email text;
  v_phone text;
  v_customer_email text;
  v_payload jsonb;
  v_idem text;
begin
  v_order_id := NEW.order_id;
  v_new := NEW.new_value;
  v_old := NEW.old_value;

  -- Customer notification: always enqueue for the order owner
  select up.email into v_customer_email
  from public.orders o
  join public.user_profiles up on up.user_id = o.user_id
  where o.id = v_order_id
  limit 1;

  if v_customer_email is not null then
    v_payload := jsonb_build_object(
      'order_id', v_order_id,
      'event', 'order_status_updated',
      'old_status', v_old,
      'new_status', v_new
    );
    v_idem := 'status:'||v_order_id::text||':customer:'||coalesce(v_new,'');
    perform public.enqueue_notification_outbox(
      'order_status_updated',
      v_order_id,
      null,
      null,
      v_customer_email,
      null,
      v_payload,
      v_idem
    );
  end if;

  -- Identify (optional) delivery partner assigned for this order
  select ofu.delivery_partner_id
    into v_delivery_partner_id
  from public.order_fulfillments ofu
  where ofu.order_id = v_order_id
  limit 1;

  -- Collect vendor ids
  select array_agg(distinct vof.vendor_id)
    into v_vendor_ids
  from public.vendor_order_fulfillments vof
  where vof.order_id = v_order_id;

  -- Special case: when order becomes ready_for_pickup, broadcast to ALL active
  -- delivery partners (customer notification already handled above)
  if v_new = 'ready_for_pickup' then
    for v_delivery_partner_id in (
      select dp.id
      from public.delivery_partners dp
      where dp.is_active = true
        and dp.email is not null
    )
    loop
      select dp.email, dp.phone
        into v_email, v_phone
      from public.delivery_partners dp
      where dp.id = v_delivery_partner_id
      limit 1;

      v_payload := jsonb_build_object(
        'order_id', v_order_id,
        'event', 'ready_for_delivery',
        'new_status', v_new
      );

      v_idem := 'status:'||v_order_id::text||':dp_ready:'||v_delivery_partner_id::text;

      perform public.enqueue_notification_outbox(
        'order_ready_for_delivery',
        v_order_id,
        null,
        v_delivery_partner_id,
        v_email,
        v_phone,
        v_payload,
        v_idem
      );
    end loop;

    -- Do not run vendor broadcast (and do not notify a single assigned DP)
    return NEW;
  end if;

  -- Always broadcast any status update to: vendor(s) + delivery partner (if assigned)
  if v_vendor_ids is not null then
    foreach v_vendor_id in array v_vendor_ids loop
      select email, phone
        into v_email, v_phone
      from public.vendors
      where id = v_vendor_id
      limit 1;

      v_payload := jsonb_build_object(
        'order_id', v_order_id,
        'event', 'order_status_updated',
        'old_status', v_old,
        'new_status', v_new
      );

      v_idem := 'status:'||v_order_id::text||':v:'||v_vendor_id::text||':'||coalesce(v_new,'');

      perform public.enqueue_notification_outbox(
        'order_status_updated',
        v_order_id,
        v_vendor_id,
        null,
        v_email,
        v_phone,
        v_payload,
        v_idem
      );
    end loop;
  end if;

  if v_delivery_partner_id is not null then
    select email, phone
      into v_email, v_phone
    from public.delivery_partners
    where id = v_delivery_partner_id
    limit 1;

    v_payload := jsonb_build_object(
      'order_id', v_order_id,
      'event', 'order_status_updated',
      'old_status', v_old,
      'new_status', v_new
    );

    v_idem := 'status:'||v_order_id::text||':dp:'||v_delivery_partner_id::text||':'||coalesce(v_new,'');

    perform public.enqueue_notification_outbox(
      'order_status_updated',
      v_order_id,
      null,
      v_delivery_partner_id,
      v_email,
      v_phone,
      v_payload,
      v_idem
    );
  end if;

  return NEW;
end;
$function$;

-- ----------------------------------------------------------------------------
-- 2) trg_enqueue_paid_notifications — also notify the customer that their
--    order was paid/confirmed (vendor + assigned DP behavior preserved).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enqueue_paid_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_vendor_id uuid;
  v_vendor_email text;
  v_vendor_phone text;
  v_delivery_partner_id uuid;
  v_delivery_email text;
  v_delivery_phone text;
  v_customer_email text;
  v_payload jsonb;
  v_order_id uuid;
begin
  if (TG_OP = 'INSERT' and NEW.status <> 'success') or (TG_OP = 'UPDATE' and NEW.status <> 'success') then
    return NEW;
  end if;

  v_order_id := NEW.order_id;

  -- Customer notification
  select up.email into v_customer_email
  from public.orders o
  join public.user_profiles up on up.user_id = o.user_id
  where o.id = v_order_id
  limit 1;

  if v_customer_email is not null then
    v_payload := jsonb_build_object(
      'order_id', v_order_id,
      'event', 'paid'
    );

    perform public.enqueue_notification_outbox(
      'order_paid',
      v_order_id,
      null,
      null,
      v_customer_email,
      null,
      v_payload,
      'order_paid:customer:'||v_order_id::text
    );
  end if;

  -- For all vendors tied to this order
  for v_vendor_id in (
    select distinct vof.vendor_id
    from public.vendor_order_fulfillments vof
    where vof.order_id = v_order_id
  )
  loop
    select email, phone
      into v_vendor_email, v_vendor_phone
    from public.vendors
    where id = v_vendor_id
    limit 1;

    v_payload := jsonb_build_object(
      'order_id', v_order_id,
      'event', 'paid'
    );

    perform public.enqueue_notification_outbox(
      'order_paid',
      v_order_id,
      v_vendor_id,
      null,
      v_vendor_email,
      v_vendor_phone,
      v_payload,
      'order_paid:'||v_order_id::text||':'||v_vendor_id::text
    );
  end loop;

  -- Delivery partner (if already assigned)
  select ofu.delivery_partner_id
    into v_delivery_partner_id
  from public.order_fulfillments ofu
  where ofu.order_id = v_order_id
  limit 1;

  if v_delivery_partner_id is not null then
    select email, phone
      into v_delivery_email, v_delivery_phone
    from public.delivery_partners
    where id = v_delivery_partner_id
    limit 1;

    v_payload := jsonb_build_object(
      'order_id', v_order_id,
      'event', 'paid'
    );

    perform public.enqueue_notification_outbox(
      'order_paid',
      v_order_id,
      null,
      v_delivery_partner_id,
      v_delivery_email,
      v_delivery_phone,
      v_payload,
      'order_paid:'||v_order_id::text||':dp:'||v_delivery_partner_id::text
    );
  end if;

  return NEW;
end;
$function$;

-- ----------------------------------------------------------------------------
-- 3) read_at column for in-app read/unread tracking
-- ----------------------------------------------------------------------------
alter table public.notification_outbox
  add column if not exists read_at timestamptz;

-- ----------------------------------------------------------------------------
-- 4) RLS policies — customers, vendors and delivery partners may read and
--    mark-read only their own notification rows. Admins keep full access via
--    the existing "notification_outbox_admin" policy.
-- ----------------------------------------------------------------------------
drop policy if exists "notification_outbox_select_customer" on public.notification_outbox;
create policy "notification_outbox_select_customer"
  on public.notification_outbox
  for select to authenticated
  using (
    (order_id in (select id from public.orders where user_id = auth.uid()))
    or (recipient_email = (select email from public.user_profiles where user_id = auth.uid()))
  );

drop policy if exists "notification_outbox_select_vendor" on public.notification_outbox;
create policy "notification_outbox_select_vendor"
  on public.notification_outbox
  for select to authenticated
  using (vendor_id in (select id from public.vendors where user_id = auth.uid()));

drop policy if exists "notification_outbox_select_delivery" on public.notification_outbox;
create policy "notification_outbox_select_delivery"
  on public.notification_outbox
  for select to authenticated
  using (delivery_partner_id in (select id from public.delivery_partners where user_id = auth.uid()));

-- Own-row update (used to mark notifications read). USING applies to both the
-- existing row and (by default) the WITH CHECK of the new row.
drop policy if exists "notification_outbox_update_own" on public.notification_outbox;
create policy "notification_outbox_update_own"
  on public.notification_outbox
  for update to authenticated
  using (
    (order_id in (select id from public.orders where user_id = auth.uid()))
    or (recipient_email = (select email from public.user_profiles where user_id = auth.uid()))
    or (vendor_id in (select id from public.vendors where user_id = auth.uid()))
    or (delivery_partner_id in (select id from public.delivery_partners where user_id = auth.uid()))
  );
