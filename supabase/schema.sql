create table public.tasks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  date text not null,
  time text not null default '',
  due_time text not null default '',
  priority text not null check (priority in ('low', 'medium', 'high')),
  category text not null default 'Personal',
  status text not null check (status in ('open', 'in-progress', 'done', 'missed', 'skipped')),
  completed_at bigint,
  reminder_minutes integer not null default 120,
  rescheduled_from_id uuid references public.tasks(id) on delete set null,
  created_at bigint not null
);

create table public.habits (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  frequency text not null,
  weekdays integer[],
  completion_dates text[],
  icon text not null default 'star',
  streak integer not null default 0,
  done boolean not null default false,
  last_done text
);

create table public.goals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  target_date text not null default '',
  progress integer not null default 0 check (progress between 0 and 100),
  created_at bigint not null
);

create table public.events (
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

create table public.notifications (
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

alter table public.tasks
  add column if not exists goal_id uuid references public.goals(id) on delete set null,
  add column if not exists goal_contribution integer not null default 0
    check (goal_contribution between 0 and 100);

create index if not exists tasks_user_date_idx on public.tasks (user_id, date);
create index if not exists tasks_user_goal_idx on public.tasks (user_id, goal_id);
create index if not exists tasks_user_rescheduled_from_idx on public.tasks (user_id, rescheduled_from_id);
create index if not exists habits_user_title_idx on public.habits (user_id, title);
create index if not exists goals_user_created_idx on public.goals (user_id, created_at);
create index if not exists events_user_date_idx on public.events (user_id, date);
create index if not exists notifications_user_archived_idx on public.notifications (user_id, archived_at desc);

alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.goals enable row level security;
alter table public.events enable row level security;
alter table public.notifications enable row level security;

create policy "Users manage their own tasks"
  on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own habits"
  on public.habits for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own goals"
  on public.goals for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own events"
  on public.events for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own notifications"
  on public.notifications for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
