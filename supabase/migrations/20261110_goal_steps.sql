alter table public.tasks
  add column if not exists goal_id uuid references public.goals(id) on delete set null;

create index if not exists tasks_user_goal_idx on public.tasks (user_id, goal_id);
