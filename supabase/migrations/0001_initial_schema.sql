-- ApartmentBookings — initial schema.
-- All application access goes through the server using the service-role key; RLS is enabled on
-- every table with NO public policies, so the anon key cannot read guest data or write anything.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Site settings: one JSON document per key ('property', 'homepage', 'pricing')
-- ---------------------------------------------------------------------------
create table if not exists site_settings (
  key text primary key check (key in ('property', 'homepage', 'pricing')),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Seasonal nightly rates (inclusive night range)
-- ---------------------------------------------------------------------------
create table if not exists seasonal_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  nightly_cents integer not null check (nightly_cents >= 0),
  min_nights integer check (min_nights is null or min_nights >= 1),
  created_at timestamptz not null default now(),
  constraint seasonal_rates_range check (end_date >= start_date)
);

-- ---------------------------------------------------------------------------
-- Media library (photos for carousel and gallery)
-- ---------------------------------------------------------------------------
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  storage_path text,
  alt_bg text not null default '',
  alt_en text not null default '',
  sort_order integer not null default 0,
  in_carousel boolean not null default false,
  in_gallery boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists media_sort_idx on media (sort_order);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  access_token text not null,
  check_in date not null,
  check_out date not null,
  guests integer not null check (guests between 1 and 50),
  guest_name text not null check (char_length(guest_name) between 2 and 120),
  guest_email text not null check (char_length(guest_email) <= 254),
  guest_phone text not null check (char_length(guest_phone) <= 40),
  guest_note text check (guest_note is null or char_length(guest_note) <= 2000),
  locale text not null default 'bg' check (locale in ('bg', 'en')),
  nights integer not null check (nights >= 1),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'EUR',
  price_breakdown jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'awaiting_payment', 'confirmed', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded', 'failed')),
  stripe_session_id text unique,
  stripe_payment_intent text,
  hold_expires_at timestamptz,
  admin_note text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_range check (check_out > check_in)
);

-- Database-level double-booking protection: no two non-cancelled bookings may overlap.
-- Expired payment holds are cancelled by the application before every insert.
alter table bookings drop constraint if exists bookings_no_overlap;
alter table bookings add constraint bookings_no_overlap
  exclude using gist (daterange(check_in, check_out, '[)') with &&)
  where (status <> 'cancelled');

create index if not exists bookings_dates_idx on bookings (check_in, check_out);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_created_idx on bookings (created_at desc);
create index if not exists bookings_email_idx on bookings (lower(guest_email));

-- ---------------------------------------------------------------------------
-- External calendar feeds (Airbnb, Booking.com …) and blocked date ranges
-- ---------------------------------------------------------------------------
create table if not exists calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  last_error text,
  last_event_count integer,
  created_at timestamptz not null default now()
);

create table if not exists blocked_ranges (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null, -- exclusive, like a check-out date
  reason text,
  source text not null default 'manual' check (source in ('manual', 'ical')),
  feed_id uuid references calendar_feeds (id) on delete cascade,
  external_uid text,
  created_at timestamptz not null default now(),
  constraint blocked_ranges_range check (end_date > start_date)
);
create index if not exists blocked_ranges_dates_idx on blocked_ranges (start_date, end_date);
create index if not exists blocked_ranges_feed_idx on blocked_ranges (feed_id);

-- ---------------------------------------------------------------------------
-- Email outbox / audit log
-- ---------------------------------------------------------------------------
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  subject text not null,
  html text not null,
  body_text text not null,
  status text not null check (status in ('sent', 'logged', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists email_log_created_idx on email_log (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_updated_at on bookings;
create trigger bookings_updated_at before update on bookings
  for each row execute function set_updated_at();

drop trigger if exists site_settings_updated_at on site_settings;
create trigger site_settings_updated_at before update on site_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic media reordering
-- ---------------------------------------------------------------------------
create or replace function reorder_media(ids uuid[]) returns void
language sql security invoker as $$
  update media m set sort_order = o.ord - 1
  from unnest(ids) with ordinality as o(id, ord)
  where m.id = o.id;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: deny-by-default. Only the service role (server) has access.
-- ---------------------------------------------------------------------------
alter table site_settings enable row level security;
alter table seasonal_rates enable row level security;
alter table media enable row level security;
alter table bookings enable row level security;
alter table calendar_feeds enable row level security;
alter table blocked_ranges enable row level security;
alter table email_log enable row level security;

revoke all on function reorder_media(uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for photos (public read; uploads only through the server)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;
