alter table public.tasks
  add column if not exists description text not null default '',
  add column if not exists due_time text not null default '',
  add column if not exists completed_at bigint,
  add column if not exists reminder_minutes integer not null default 120,
  add column if not exists rescheduled_from_id uuid references public.tasks(id) on delete set null,
  add column if not exists goal_id uuid references public.goals(id) on delete set null,
  add column if not exists goal_contribution integer not null default 0
    check (goal_contribution between 0 and 100);

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('open', 'in-progress', 'done', 'missed', 'skipped'));

alter table public.tasks
  alter column reminder_minutes set default 120;

create table if not exists public.task_definitions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null check (priority in ('low', 'medium', 'high')),
  category text not null default 'Personal',
  goal_id uuid references public.goals(id) on delete set null,
  goal_contribution integer not null default 0 check (goal_contribution between 0 and 100),
  created_at bigint not null
);

create table if not exists public.task_occurrences (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.task_definitions(id) on delete cascade,
  scheduled_date text not null,
  start_time text not null default '',
  due_time text not null default '',
  status text not null check (status in ('open', 'in-progress', 'done', 'missed', 'skipped')),
  completed_at bigint,
  reminder_minutes integer not null default 120,
  rescheduled_from_id uuid,
  unique (task_id, scheduled_date)
);

insert into public.task_definitions (id, user_id, title, description, priority, category, goal_id, goal_contribution, created_at)
select id, user_id, title, description, priority, category, goal_id, goal_contribution, created_at
from public.tasks
on conflict (id) do nothing;

insert into public.task_occurrences (id, user_id, task_id, scheduled_date, start_time, due_time, status, completed_at, reminder_minutes, rescheduled_from_id)
select id, user_id, id, date, time, due_time, status, completed_at, reminder_minutes, rescheduled_from_id
from public.tasks
on conflict (id) do nothing;

create table if not exists public.events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  date text not null,
  start_time text not null,
  end_time text not null default '',
  location text not null default '',
  reminder_minutes integer not null default 0,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  recurrence_until text not null default '',
  status text not null default 'upcoming'
    check (status in ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at bigint not null
);

create table if not exists public.notifications (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('task', 'event')),
  entity_id uuid not null,
  title text not null,
  message text not null,
  scheduled_at timestamptz not null,
  archived_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists tasks_user_rescheduled_from_idx
  on public.tasks (user_id, rescheduled_from_id);
create index if not exists events_user_date_idx
  on public.events (user_id, date);
create index if not exists task_definitions_user_idx on public.task_definitions (user_id);
create index if not exists task_occurrences_user_date_idx on public.task_occurrences (user_id, scheduled_date);
create index if not exists notifications_user_archived_idx
  on public.notifications (user_id, archived_at desc);

alter table public.events enable row level security;
alter table public.notifications enable row level security;
alter table public.task_definitions enable row level security;
alter table public.task_occurrences enable row level security;

drop policy if exists "Users manage their own task definitions" on public.task_definitions;
create policy "Users manage their own task definitions"
  on public.task_definitions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own task occurrences" on public.task_occurrences;
create policy "Users manage their own task occurrences"
  on public.task_occurrences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own events" on public.events;
create policy "Users manage their own events"
  on public.events for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own notifications" on public.notifications;
create policy "Users manage their own notifications"
  on public.notifications for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
