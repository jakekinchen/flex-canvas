alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.ai_command_logs enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "boards_insert_authenticated" on public.boards;
create policy "boards_insert_authenticated"
on public.boards for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "boards_select_accessible" on public.boards;
create policy "boards_select_accessible"
on public.boards for select
to authenticated
using (
  owner_id = auth.uid()
  or share_mode in ('link_view', 'link_edit')
  or exists (
    select 1 from public.board_members bm
    where bm.board_id = id and bm.user_id = auth.uid()
  )
);

drop policy if exists "boards_update_owner" on public.boards;
create policy "boards_update_owner"
on public.boards for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "boards_delete_owner" on public.boards;
create policy "boards_delete_owner"
on public.boards for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "board_members_select_accessible" on public.board_members;
create policy "board_members_select_accessible"
on public.board_members for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.boards b
    where b.id = board_id
    and (b.owner_id = auth.uid() or b.share_mode in ('link_view', 'link_edit'))
  )
);

drop policy if exists "board_members_insert_owner_or_link_edit" on public.board_members;
create policy "board_members_insert_owner_or_link_edit"
on public.board_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (
      select 1 from public.boards b
      where b.id = board_id
      and (b.owner_id = auth.uid() or b.share_mode = 'link_edit')
    )
  )
);

drop policy if exists "board_members_update_owner" on public.board_members;
create policy "board_members_update_owner"
on public.board_members for update
to authenticated
using (
  exists (
    select 1 from public.boards b
    where b.id = board_id and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.boards b
    where b.id = board_id and b.owner_id = auth.uid()
  )
);

drop policy if exists "board_members_delete_owner" on public.board_members;
create policy "board_members_delete_owner"
on public.board_members for delete
to authenticated
using (
  exists (
    select 1 from public.boards b
    where b.id = board_id and b.owner_id = auth.uid()
  )
);

drop policy if exists "ai_logs_select_accessible" on public.ai_command_logs;
create policy "ai_logs_select_accessible"
on public.ai_command_logs for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.boards b
    where b.id = board_id
    and (
      b.owner_id = auth.uid()
      or b.share_mode in ('link_view', 'link_edit')
      or exists (
        select 1 from public.board_members bm
        where bm.board_id = b.id and bm.user_id = auth.uid()
      )
    )
  )
);

drop policy if exists "ai_logs_insert_editors" on public.ai_command_logs;
create policy "ai_logs_insert_editors"
on public.ai_command_logs for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.boards b
    where b.id = board_id
    and (
      b.owner_id = auth.uid()
      or b.share_mode = 'link_edit'
      or exists (
        select 1 from public.board_members bm
        where bm.board_id = b.id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'editor')
      )
    )
  )
);
