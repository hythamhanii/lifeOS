# Life OS

Life OS is a personal workspace built with Angular 21.2, TypeScript, SCSS, and Supabase. Tasks, habits, goals, events, and notification history are stored per signed-in user in Supabase.

## Start locally

Requirements: Node.js 24 and npm 11.

Run npm install, then npm start.

Open http://localhost:4200. Build with npm run build.

## Included

- Overview dashboard with today's task completion and recent activity bars.
- Task create, edit, complete/reopen, delete, date/time, priority, category, search, and status filters.
- Separate task definitions and dated occurrences, with missed-task history, completion timestamps, and rescheduling that retains the original occurrence.
- Events with optional reminders, locations, and daily, weekly, or monthly schedules.
- A unified task/event calendar, selectable history summaries, and archived notifications.
- Daily habits with selectable weekly days, date-specific check-ins, editable schedules, and streaks based on consecutive scheduled occurrences.
- Goals with target dates and manually adjustable progress.
- Calendar and analytics views.
- Light/dark appearance and keyboard quick-add (N).
- JSON backup export and restore.
- Responsive layouts and JSON backup export/restore.

## Data, privacy, and backups

Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to create the database, apply migrations, configure authentication, and set the public project URL/key. Export JSON backups regularly from Settings. Restore merges records by ID; it does not erase records absent from the backup. Keep backups somewhere outside the browser.

## Current limits

This is an initial usable foundation, not every item from the full product brief. Habit completion history is retained per date, but there is not yet a dedicated history heatmap or task recurrence/schedule exceptions for a single occurrence. Recurring events are displayed from their schedule definition; occurrence-specific event exceptions are not yet supported. Calendar currently focuses on the present month. Analytics provides basic summaries, not custom date ranges or interactive ECharts. Milestones, category management, undo, onboarding, and service-worker offline installation are not implemented. Browser notifications are not requested; reminders appear inside the app.

Importing a JSON backup merges its task, habit, and goal arrays into the signed-in account. Review the file before restoring it.

## Validation

Production build: npm run build.

Unit tests: npm test -- --watch=false. The local runner may require a supported browser/test environment.
