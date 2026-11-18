-- Calendar integrity: blocked dates (manual blocks and iCal imports from Booking.com / Airbnb) are
-- enforced in the database too, not only in application code, so a guest booking racing an admin
-- block or a feed sync can never end up overlapping it.
--
-- Both triggers take the same transaction-level advisory lock, which serialises the check-then-write
-- between a booking insert and a block insert. Errors use SQLSTATE 23P01 (exclusion_violation) so
-- the application treats them exactly like the bookings_no_overlap constraint.

create or replace function bookings_respect_blocked_ranges() returns trigger
language plpgsql as $$
begin
  if new.status = 'cancelled' then
    return new;
  end if;
  -- Only new stays, changed dates, or a cancelled booking being reactivated are checked. A pending
  -- booking that a later feed import overlaps stays visible to the owner instead of erroring.
  if tg_op = 'UPDATE'
     and old.status <> 'cancelled'
     and old.check_in = new.check_in
     and old.check_out = new.check_out then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('ab_calendar'));
  if exists (
    select 1 from blocked_ranges r
    where daterange(r.start_date, r.end_date, '[)') && daterange(new.check_in, new.check_out, '[)')
  ) then
    raise exception 'dates overlap a blocked range' using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_blocked_ranges_check on bookings;
create trigger bookings_blocked_ranges_check before insert or update on bookings
  for each row execute function bookings_respect_blocked_ranges();

create or replace function manual_blocks_respect_bookings() returns trigger
language plpgsql as $$
begin
  -- Imported (iCal) ranges are always accepted: they describe reservations that already exist on
  -- another platform, and refusing them would hide a real double booking from the owner.
  if new.source <> 'manual' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('ab_calendar'));
  if exists (
    select 1 from bookings b
    where b.status <> 'cancelled'
      and daterange(b.check_in, b.check_out, '[)') && daterange(new.start_date, new.end_date, '[)')
  ) then
    raise exception 'blocked range overlaps an active booking' using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists blocked_ranges_booking_check on blocked_ranges;
create trigger blocked_ranges_booking_check before insert or update on blocked_ranges
  for each row execute function manual_blocks_respect_bookings();

-- Imported ranges are replaced wholesale on every sync; do it in one transaction so the calendar is
-- never briefly empty (a guest could otherwise book into the gap between delete and insert).
create or replace function replace_feed_ranges(p_feed_id uuid, p_ranges jsonb) returns void
language plpgsql security invoker as $$
begin
  perform pg_advisory_xact_lock(hashtext('ab_calendar'));
  delete from blocked_ranges where feed_id = p_feed_id;
  insert into blocked_ranges (start_date, end_date, reason, source, feed_id, external_uid)
  select (r->>'start_date')::date, (r->>'end_date')::date, r->>'reason', 'ical', p_feed_id, r->>'external_uid'
  from jsonb_array_elements(coalesce(p_ranges, '[]'::jsonb)) as r;
end;
$$;

revoke all on function replace_feed_ranges(uuid, jsonb) from public, anon, authenticated;

-- Expired payment holds keep their history: append to admin_note instead of overwriting it.
create or replace function expire_stale_holds(p_now timestamptz default now()) returns integer
language sql security invoker as $$
  with expired as (
    update bookings
    set status = 'cancelled',
        cancelled_at = p_now,
        admin_note = concat_ws(E'\n', nullif(admin_note, ''), 'Payment hold expired')
    where status = 'awaiting_payment'
      and payment_status <> 'paid'
      and hold_expires_at is not null
      and hold_expires_at <= p_now
    returning 1
  )
  select count(*)::integer from expired;
$$;

revoke all on function expire_stale_holds(timestamptz) from public, anon, authenticated;

grant execute on function replace_feed_ranges(uuid, jsonb) to service_role;
grant execute on function expire_stale_holds(timestamptz) to service_role;

create index if not exists bookings_payment_intent_idx on bookings (stripe_payment_intent) where stripe_payment_intent is not null;

-- ---------------------------------------------------------------------------
-- Shared rate limiting (login, booking requests) across all serverless instances.
-- Keys are SHA-256 hashes, never raw IP addresses.
-- ---------------------------------------------------------------------------
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);
alter table rate_limits enable row level security;

create or replace function hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security invoker as $$
declare
  v_hits integer;
begin
  insert into rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  -- Opportunistic cleanup keeps the table tiny.
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_limit;
end;
$$;

revoke all on function hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function hit_rate_limit(text, integer, integer) to service_role;
