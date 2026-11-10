-- My Style: inspiration board, the user's own photos, and the AI stylist chat.
-- Run after 0001_init.sql.

-- ---------------------------------------------------------------------------
-- Profile: what the AI has learned about the user's look, editable by them.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column appearance_notes text not null default '',
  add column style_summary text not null default '';

grant update (appearance_notes, style_summary) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Style images: 'inspo' = looks the user likes; 'self' = photos of the user.
-- Photos live in the private 'closet' bucket under <user_id>/style/...
-- ---------------------------------------------------------------------------
create table public.style_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('inspo', 'self')),
  photo_path text not null,
  caption text not null default '',
  -- AI read of an inspiration photo: { look, description, key_pieces[], colors[] }
  ai_notes jsonb,
  created_at timestamptz not null default now()
);

create index style_images_user_idx on public.style_images (user_id, kind, created_at desc);

alter table public.style_images enable row level security;

create policy "style_images: own rows" on public.style_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Stylist chat history. Written by the server (it also stores AI replies).
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- For assistant replies: closet codes it referenced, so the UI can show the pieces.
  codes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index chat_messages_user_idx on public.chat_messages (user_id, created_at);

alter table public.chat_messages enable row level security;

create policy "chat_messages: read own" on public.chat_messages
  for select using (auth.uid() = user_id);
create policy "chat_messages: delete own" on public.chat_messages
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Widen existing checks for the new AI features and shop-link sources.
-- ---------------------------------------------------------------------------
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('tag', 'outfits', 'review', 'chat', 'style'));

alter table public.shop_suggestions drop constraint shop_suggestions_source_check;
alter table public.shop_suggestions add constraint shop_suggestions_source_check
  check (source in ('review', 'outfit', 'chat'));

-- Shop suggestions from a chat reply point at that message.
create index shop_suggestions_source_idx on public.shop_suggestions (source, source_id);

-- ---------------------------------------------------------------------------
-- Outfits: AI suggestions start unsaved; the user saves the ones they like.
-- ---------------------------------------------------------------------------
alter table public.outfits add column saved boolean not null default true;
