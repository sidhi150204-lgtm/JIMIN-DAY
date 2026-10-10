-- Supabase > SQL Editor mein ye poora paste karke Run dabao

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null check (char_length(name) <= 40),
  age int check (age between 1 and 120),
  message text not null check (char_length(message) <= 600),
  media jsonb default '[]'::jsonb,
  approved boolean default true
);

alter table public.cards enable row level security;

create policy "anyone can read approved cards" on public.cards
  for select to anon using (approved = true);

create policy "anyone can add a card" on public.cards
  for insert to anon with check (approved = true);

grant select, insert on public.cards to anon;

-- photos / videos / gifs ke liye storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-media', 'card-media', true, 10485760,
  array['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;

create policy "anyone can upload card media" on storage.objects
  for insert to anon with check (bucket_id = 'card-media');
