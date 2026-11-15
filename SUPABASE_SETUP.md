# Supabase setup

The app stores tasks, habits, and goals in Supabase. Each row is assigned to the signed-in user's `auth.users` ID, and row-level security (RLS) prevents users from reading or changing another user's rows.

## Create and configure the project

1. Create a project at [supabase.com](https://supabase.com/) and wait for its database to finish provisioning.
2. In the Supabase SQL Editor:
   - For a **new project**, run [`supabase/schema.sql`](./supabase/schema.sql).
   - For an **existing Life OS project**, do not rerun the schema's `create table` statements. Run [`supabase/migrations/20261110_goal_steps.sql`](./supabase/migrations/20261110_goal_steps.sql) and [`supabase/migrations/20261110_goal_step_contribution.sql`](./supabase/migrations/20261110_goal_step_contribution.sql) if they have not already been applied.
   - For **both new and existing projects**, run [`supabase/migrations/20261115_tasks_events_history.sql`](./supabase/migrations/20261115_tasks_events_history.sql). It creates separate task-definition and task-occurrence tables, copies existing task rows without deleting them, and creates events and archived-notification storage.
3. In the Supabase dashboard, open **Project Settings → API** and copy the **Project URL** and the **anon/public key**. Never use or expose the `service_role` key in this browser app.
4. Put those two public values in `src/app/supabase.config.ts`:

   ```ts
   export const SUPABASE_URL = 'https://your-project.supabase.co';
   export const SUPABASE_ANON_KEY = 'your-anon-public-key';
   ```

5. In **Authentication → URL Configuration**, set the site URL to your deployed website URL. Add your local development URL and any preview/deployment URLs to the redirect URL allow list.
6. To enable **Continue with Google**, configure Google as a provider in **Authentication → Sign In / Providers** in Supabase. Create a Google OAuth client in Google Cloud, add the callback URL shown by Supabase to the Google client, and enter its client ID and secret in Supabase. Keep the app's origin in Supabase's redirect URL allow list.
7. Run `npm run start`, create an account from the sign-up screen, and verify that tasks, habits, and goals appear only in that account.

The anon/public key is expected to be present in a browser app. Database privacy depends on the RLS policies installed by the SQL script. Do not disable RLS or add a `service_role` key to the app.

## Existing local data

The old version stored data only in the current browser. Before replacing that version, download a JSON backup from **Settings → Your data**. After configuring Supabase and signing in, use **Settings → Restore from backup** to import it into that account. The existing browser database is not uploaded automatically, so it cannot be accidentally assigned to the wrong account.

Email confirmation may be enabled in Supabase. If sign-up does not immediately sign in, confirm the email first and then sign in.
