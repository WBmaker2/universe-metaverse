create extension if not exists pgcrypto;

create table if not exists public.classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '우주 음악 감상 수업',
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '8 hours')
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 16),
  avatar_id text not null default 'female-adventurer' check (
    avatar_id in (
      'female-adventurer',
      'female-person',
      'male-adventurer',
      'male-person',
      'robot'
    )
  ),
  color text not null default '#7dd3fc',
  x numeric not null default 1100,
  y numeric not null default 700,
  active_planet_id text check (
    active_planet_id in (
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune'
    )
  ),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (session_id, auth_user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  display_name text not null,
  body text not null check (char_length(body) between 1 and 180),
  moderation_status text not null default 'allowed' check (moderation_status in ('allowed', 'blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.planet_tracks (
  id text primary key,
  planet_name text not null,
  track_title text not null,
  audio_path text not null,
  activation_radius integer not null default 180
);

create index if not exists classroom_sessions_teacher_id_idx
  on public.classroom_sessions (teacher_id, created_at desc);

create index if not exists classroom_sessions_code_idx
  on public.classroom_sessions (code)
  where status = 'active';

create index if not exists participants_session_id_last_seen_idx
  on public.participants (session_id, last_seen_at desc);

create index if not exists participants_auth_user_id_idx
  on public.participants (auth_user_id);

create index if not exists chat_messages_session_id_created_at_idx
  on public.chat_messages (session_id, created_at desc);

alter table public.classroom_sessions enable row level security;
alter table public.participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.planet_tracks enable row level security;

create policy "teachers can create sessions"
  on public.classroom_sessions
  for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "teachers can manage their sessions"
  on public.classroom_sessions
  for all
  to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "participants can read active sessions by membership"
  on public.classroom_sessions
  for select
  to authenticated
  using (
    teacher_id = auth.uid()
    or exists (
      select 1
      from public.participants p
      where p.session_id = classroom_sessions.id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "authenticated users can join active sessions"
  on public.participants
  for insert
  to authenticated
  with check (
    auth_user_id = auth.uid()
    and exists (
      select 1
      from public.classroom_sessions s
      where s.id = session_id
        and s.status = 'active'
        and s.expires_at > now()
    )
  );

create policy "session members can read participants"
  on public.participants
  for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.participants self
      where self.session_id = participants.session_id
        and self.auth_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.classroom_sessions s
      where s.id = participants.session_id
        and s.teacher_id = auth.uid()
    )
  );

create policy "participants can update their own presence"
  on public.participants
  for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "session members can read chat"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.participants p
      where p.session_id = chat_messages.session_id
        and p.auth_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.classroom_sessions s
      where s.id = chat_messages.session_id
        and s.teacher_id = auth.uid()
    )
  );

create policy "participants can write chat"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.participants p
      where p.id = participant_id
        and p.session_id = chat_messages.session_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "tracks are readable"
  on public.planet_tracks
  for select
  to authenticated
  using (true);

insert into public.planet_tracks (id, planet_name, track_title, audio_path, activation_radius)
values
  ('mercury', '수성', '행성 중 제3곡 수성', '/audio/mercury.mp3', 150),
  ('venus', '금성', '행성 중 제2곡 금성', '/audio/venus.mp3', 175),
  ('earth', '지구', '푸른 바다 만들기', '/audio/earth-blue-sea.mp3', 190),
  ('mars', '화성', '행성 중 제1곡 화성', '/audio/mars.mp3', 180),
  ('jupiter', '목성', '행성 중 제4곡 목성', '/audio/jupiter.mp3', 235),
  ('saturn', '토성', '행성 중 제5곡 토성', '/audio/saturn.mp3', 220),
  ('uranus', '천왕성', '행성 중 제6곡 천왕성', '/audio/uranus.mp3', 195),
  ('neptune', '해왕성', '행성 중 제7곡 해왕성', '/audio/neptune.mp3', 200)
on conflict (id) do update
set
  planet_name = excluded.planet_name,
  track_title = excluded.track_title,
  audio_path = excluded.audio_path,
  activation_radius = excluded.activation_radius;
