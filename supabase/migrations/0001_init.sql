-- Wardrobe app: initial schema.
-- Run in the Supabase SQL editor, or with `supabase db push`.

-- ---------------------------------------------------------------------------
-- Profiles: one row per user, created automatically on sign-up.
-- Billing columns are written only by the server (Stripe webhook) using the
-- service-role key; signed-in users can update style_notes and nothing else.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  style_notes text not null default '',
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Column-level guard: users may only change their style notes.
revoke update on public.profiles from authenticated, anon;
grant update (style_notes) on public.profiles to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Items: the pieces in a user's closet.
-- Codes follow the lookbook convention: PNT-01, SS-14, LS-53, JKT-08, SHO-03, ACC-02.
-- ---------------------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  code text not null,
  category text not null check (category in ('PNT', 'SS', 'LS', 'JKT', 'SHO', 'ACC')),
  item_type text not null,
  color text not null default '',
  details text not null default '',
  flag text not null default '',
  status text check (status in ('keep', 'tailor', 'donate')),
  favorite boolean not null default false,
  notes text not null default '',
  photo_path text,
  is_new boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

create index items_user_idx on public.items (user_id, category, code);

alter table public.items enable row level security;

create policy "items: own rows" on public.items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Free plan limit, enforced in the database so it cannot be bypassed from the client.
create function public.enforce_item_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  user_plan text;
  item_count int;
begin
  select plan into user_plan from public.profiles where id = new.user_id;
  if coalesce(user_plan, 'free') = 'free' then
    select count(*) into item_count from public.items where user_id = new.user_id;
    if item_count >= 30 then
      raise exception 'FREE_LIMIT: The free plan holds 30 pieces. Upgrade to Pro for unlimited pieces.';
    end if;
  end if;
  return new;
end;
$$;

create trigger items_limit before insert on public.items
  for each row execute function public.enforce_item_limit();

-- ---------------------------------------------------------------------------
-- Outfits: saved combinations, made by the user or suggested by the AI.
-- ---------------------------------------------------------------------------
create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  item_ids uuid[] not null,
  source text not null default 'user' check (source in ('user', 'ai')),
  why text,
  seen boolean not null default true,
  created_at timestamptz not null default now()
);

create index outfits_user_idx on public.outfits (user_id, created_at desc);

alter table public.outfits enable row level security;

create policy "outfits: own rows" on public.outfits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- AI usage log, for monthly limits. Written by the server only.
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('tag', 'outfits', 'review')),
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

create index ai_usage_user_idx on public.ai_usage (user_id, kind, created_at);

alter table public.ai_usage enable row level security;

create policy "ai_usage: read own" on public.ai_usage
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Closet reviews: the latest AI review per user (keep/tailor/donate advice + gaps).
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  summary text not null,
  advice jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "reviews: read own" on public.reviews
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Affiliate: pieces the AI suggests buying, and clicks on their shop links.
-- Both are written by the server only. Clicks are your revenue analytics.
-- ---------------------------------------------------------------------------
create table public.shop_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('review', 'outfit')),
  source_id uuid,
  item_type text not null,
  color text not null default '',
  category text,
  why text not null default '',
  query text not null,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index shop_suggestions_user_idx on public.shop_suggestions (user_id, created_at desc);

alter table public.shop_suggestions enable row level security;

create policy "shop_suggestions: read own" on public.shop_suggestions
  for select using (auth.uid() = user_id);

create table public.affiliate_clicks (
  id bigint generated always as identity primary key,
  suggestion_id uuid references public.shop_suggestions (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  retailer text not null,
  created_at timestamptz not null default now()
);

alter table public.affiliate_clicks enable row level security;
-- No policies: only the service role reads or writes clicks.

-- ---------------------------------------------------------------------------
-- Photo storage: private bucket, each user reads and writes only their own folder.
-- Paths look like  <user_id>/<random>.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('closet', 'closet', false)
  on conflict (id) do nothing;

create policy "closet photos: read own" on storage.objects
  for select using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "closet photos: upload own" on storage.objects
  for insert with check (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "closet photos: delete own" on storage.objects
  for delete using (bucket_id = 'closet' and (storage.foldername(name))[1] = auth.uid()::text);
