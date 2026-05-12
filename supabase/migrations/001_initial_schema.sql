create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  color text not null default '#3B82F6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled board',
  room_id text not null unique,
  share_mode text not null default 'link_edit',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boards_share_mode_check
    check (share_mode in ('private', 'link_view', 'link_edit'))
);

create table if not exists public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (board_id, user_id),
  constraint board_members_role_check
    check (role in ('owner', 'editor', 'viewer'))
);

create table if not exists public.ai_command_logs (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  status text not null default 'started',
  operation_count integer not null default 0,
  operations jsonb,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ai_command_logs_status_check
    check (status in ('started', 'completed', 'failed'))
);

create index if not exists boards_owner_id_idx on public.boards(owner_id);
create index if not exists boards_room_id_idx on public.boards(room_id);
create index if not exists board_members_user_id_idx on public.board_members(user_id);
create index if not exists ai_command_logs_board_id_idx on public.ai_command_logs(board_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists boards_set_updated_at on public.boards;
create trigger boards_set_updated_at
before update on public.boards
for each row execute function public.set_updated_at();
