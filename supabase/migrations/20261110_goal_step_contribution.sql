alter table public.tasks
  add column if not exists goal_contribution integer not null default 0
    check (goal_contribution between 0 and 100);
