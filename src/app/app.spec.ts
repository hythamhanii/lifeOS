import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ArchivedNotification, Habit, LifeEvent, LifeTask, habitStreak, isHabitScheduled } from './database';
import { LifeDataService } from './life-data.service';

describe('App', () => {
  const savedHabits: Habit[] = [];
  const savedEvents: LifeEvent[] = [];
  const backend = {
    configured: true,
    authReady: signal(true),
    user: signal<{ id: string; email: string } | null>({ id: 'test-user', email: 'test@example.com' }),
    initializationError: signal(''),
    initialize: async () => {},
    getTasks: async (): Promise<LifeTask[]> => [],
    getEvents: async () => savedEvents,
    getArchivedNotifications: async () => [],
    getHabits: async () => savedHabits,
    getGoals: async () => [],
    saveTask: vi.fn(async (_task: LifeTask) => {}),
    updateTask: vi.fn(async (_id: string, _status: LifeTask['status'], _completedAt?: number) => {}),
    deleteTask: vi.fn(async () => {}),
    saveEvent: vi.fn(async (event: LifeEvent) => { savedEvents.push(event); }),
    deleteEvent: async () => {},
    archiveNotification: vi.fn(async (_notification: ArchivedNotification) => {}),
    deleteArchivedNotification: vi.fn(async () => {}),
    updateGoal: async () => {},
    saveHabit: async (habit: Habit) => { savedHabits.push(habit); },
    signIn: async () => {},
    signInWithGoogle: vi.fn(async () => {}),
    signUp: async () => true,
    signOut: async () => {}
  };

  beforeEach(async () => {
    savedHabits.length = 0;
    savedEvents.length = 0;
    vi.clearAllMocks();
    backend.user.set({ id: 'test-user', email: 'test@example.com' });
    localStorage.removeItem('life-os-dismissed-adhkar:test-user');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: LifeDataService, useValue: backend }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('starts on the overview with all primary sections', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.page()).toBe('overview');
    expect(fixture.componentInstance.nav).toHaveLength(13);
    expect(compiled.querySelector('h1')?.textContent).toContain('Make today');
  });

  it('toggles the timer focus view from its full-screen control', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.page.set('timer');
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('.timer-fullscreen-toggle') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    toggle.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.timerFullscreen()).toBe(true);
    expect(fixture.nativeElement.querySelector('.shell')?.classList.contains('timer-fullscreen')).toBe(true);
    expect(fixture.nativeElement.querySelector('.timer-fullscreen-toggle')?.getAttribute('aria-pressed')).toBe('true');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.timerFullscreen()).toBe(false);
  });

  it('schedules a Tuesday routine only on its selected weekday', () => {
    const gym = { weekdays: [2], frequency: 'Weekly' };
    expect(isHabitScheduled(gym, '2026-11-03')).toBe(true);
    expect(isHabitScheduled(gym, '2026-11-04')).toBe(false);
  });

  it('counts consecutive completed scheduled occurrences for a weekly streak', () => {
    const gym: Habit = {
      id: 'gym', title: 'Gym', frequency: 'Weekly', weekdays: [2],
      completionDates: ['2026-10-27', '2026-11-03'], icon: 'star',
      streak: 0, done: false
    };
    expect(habitStreak(gym, '2026-11-04')).toBe(2);
  });

  it('summarizes and filters goals while showing useful deadline states', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const shiftDate = (days: number) => {
      const date = new Date(app.todayISO + 'T12:00:00');
      date.setDate(date.getDate() + days);
      return date.toISOString().slice(0, 10);
    };
    app.goals.set([
      { id: 'later', title: 'Later', description: '', targetDate: shiftDate(8), progress: 40, createdAt: 1 },
      { id: 'done', title: 'Done', description: '', targetDate: '', progress: 100, createdAt: 2 },
      { id: 'soon', title: 'Soon', description: '', targetDate: shiftDate(1), progress: 20, createdAt: 3 },
      { id: 'past', title: 'Past', description: '', targetDate: shiftDate(-2), progress: 0, createdAt: 4 }
    ]);

    expect(app.activeGoalCount()).toBe(3);
    expect(app.completedGoalCount()).toBe(1);
    expect(app.averageGoalProgress()).toBe(20);
    expect(app.visibleGoals().map(goal => goal.id)).toEqual(['past', 'soon', 'later', 'done']);
    expect(app.goalDueLabel(app.goals()[2])).toBe('1 day left');
    expect(app.goalDueLabel(app.goals()[3])).toBe('Overdue by 2 days');
    app.goalFilter.set('completed');
    expect(app.visibleGoals().map(goal => goal.id)).toEqual(['done']);
  });

  it('derives linked goal progress from its steps and preserves unlinked legacy progress', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const goal = { id: 'goal-1', title: 'Learn Spanish', description: '', targetDate: '', progress: 60, createdAt: 1 };
    app.goals.set([goal]);
    expect(app.goalProgress(goal)).toBe(60);

    app.tasks.set([
      { id: 'step-1', title: 'Practice', date: app.todayISO, time: '', priority: 'medium', category: 'Personal', status: 'done', createdAt: 1, goalId: goal.id, goalContribution: 20 },
      { id: 'step-2', title: 'Review', date: app.todayISO, time: '', priority: 'medium', category: 'Personal', status: 'open', createdAt: 2, goalId: goal.id, goalContribution: 30 }
    ]);
    expect(app.goalProgress(goal)).toBe(80);
    expect(app.goalStepSummary(goal)).toBe('1 of 2 steps complete · +20%');
    app.tasks.update(tasks => tasks.map(task => ({ ...task, status: 'done' })));
    expect(app.goalProgress(goal)).toBe(100);
    expect(app.goalDueLabel(goal)).toBe('Completed');
    expect(app.goals()[0].progress).toBe(60);
  });

  it('saves the chosen task contribution without advancing goal progress until completion', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const saveTask = vi.spyOn(backend, 'saveTask');
    const goal = { id: 'goal-2', title: 'Learn Spanish', description: '', targetDate: '', progress: 10, createdAt: 1 };
    app.goals.set([goal]);
    app.addTask(goal.id);
    app.title.set('Watch a lesson');
    app.goalContribution.set(20);

    await app.saveTask();

    expect(saveTask).toHaveBeenCalledWith(expect.objectContaining({
      goalId: goal.id,
      goalContribution: 20,
      status: 'open'
    }));
    expect(app.goalProgress(goal)).toBe(10);
  });

  it('keeps manual goal adjustments available alongside completed task contributions', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const updateGoal = vi.spyOn(backend, 'updateGoal');
    const goal = { id: 'goal-3', title: 'Learn Spanish', description: '', targetDate: '', progress: 30, createdAt: 1 };
    app.goals.set([goal]);
    app.tasks.set([{
      id: 'step-1', title: 'Practice', date: app.todayISO, time: '', priority: 'medium',
      category: 'Personal', status: 'done', createdAt: 1, goalId: goal.id, goalContribution: 20
    }]);

    await app.bumpGoal(goal, -10);

    expect(updateGoal).toHaveBeenCalledWith(expect.objectContaining({ id: goal.id, progress: 20 }));
  });

  it('explains when Supabase is missing the goal-link migration', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    vi.spyOn(backend, 'saveTask').mockRejectedValue({
      code: 'PGRST204',
      message: "Could not find the 'goal_id' column of 'tasks' in the schema cache"
    });
    app.addTask('goal-1');
    app.title.set('Practice');

    await app.saveTask();

    expect(app.backendError()).toContain('supabase/migrations/20261110_goal_steps.sql');
  });

  it('explains when Supabase is missing the task contribution migration', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    vi.spyOn(backend, 'saveTask').mockRejectedValue({
      code: 'PGRST204',
      message: "Could not find the 'goal_contribution' column of 'tasks' in the schema cache"
    });
    app.addTask('goal-1');
    app.title.set('Practice');

    await app.saveTask();

    expect(app.backendError()).toContain('supabase/migrations/20261110_goal_step_contribution.sql');
  });

  it('summarizes the current week and stores a focus per signed-in user and week', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const monday = new Date(2026, 10, 9, 12);
    app.clock.set(new Date(2026, 10, 11, 12).getTime());
    const dateKey = (offset: number) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + offset);
      return app.key(date);
    };
    app.tasks.set([
      { id: 'done', title: 'Step', date: dateKey(0), time: '', priority: 'medium', category: 'Personal', status: 'done', createdAt: 1, goalId: 'goal-1' },
      { id: 'today', title: 'Today', date: dateKey(2), time: '', priority: 'medium', category: 'Personal', status: 'open', createdAt: 2 },
      { id: 'later', title: 'Later', date: dateKey(6), time: '', priority: 'medium', category: 'Personal', status: 'open', createdAt: 3 }
    ]);
    app.habits.set([{
      id: 'daily', title: 'Read', frequency: 'Every day', weekdays: [1, 2, 3, 4, 5, 6, 7],
      completionDates: [dateKey(0), dateKey(1)], icon: 'book', streak: 0, done: false
    }]);

    expect(app.reviewWeekStart()).toBe(dateKey(0));
    expect(app.weeklyCompletedTasks()).toBe(1);
    expect(app.weeklyPlannedTasks()).toBe(2);
    expect(app.weeklyOpenTasks()).toBe(2);
    expect(app.weeklyHabitStats()).toEqual({ scheduled: 3, completed: 2, rate: 67 });
    expect(app.weeklyCompletedGoalSteps()).toBe(1);
    expect(app.reviewWeekDays()[6].future).toBe(true);

    app.setWeeklyFocus('Practice a little each morning');
    app.weeklyFocus.set('');
    app.loadWeeklyFocus();
    expect(app.weeklyFocus()).toBe('Practice a little each morning');
    localStorage.removeItem(`life-os-weekly-focus:test-user:${app.reviewWeekStart()}`);
  });

  it('saves a habit with the selected weekly schedule', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const title = 'Tuesday gym ' + Date.now();
    app.addHabit();
    app.title.set(title);
    app.selectedWeekdays.set([2]);
    await app.saveHabit();
    const saved = savedHabits.find(habit => habit.title === title);
    expect(saved?.weekdays).toEqual([2]);
    expect(saved?.frequency).toBe('Weekly · Tue');
  });

  it('keeps My Day focused on one date while My Tasks contains all dates', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const task = (id: string, date: string): LifeTask => ({
      id, title: id, date, time: '', priority: 'medium',
      category: 'Personal', status: 'open', createdAt: 1
    });
    app.tasks.set([task('today', app.todayISO), task('later', '2099-12-31')]);
    expect(app.dayTasks().map(item => item.id)).toEqual(['today']);
    expect(app.rows().map(item => item.id)).toEqual(['today', 'later']);
  });

  it('shows scheduled and recurring events alongside tasks in the selected My Day schedule', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.dayDate.set('2026-11-09');
    app.tasks.set([{
      id: 'day-task', title: 'Read', date: '2026-11-09', time: '11:00',
      priority: 'medium', category: 'Personal', status: 'open', createdAt: 1
    }]);
    app.events.set([
      {
        id: 'weekly-event', title: 'Weekly meeting', description: '', date: '2026-11-02',
        startTime: '09:00', endTime: '10:00', location: 'Office', reminderMinutes: 0,
        recurrence: 'weekly', recurrenceUntil: '2026-11-30', status: 'upcoming', createdAt: 2
      },
      {
        id: 'other-day-event', title: 'Other day', description: '', date: '2026-11-10',
        startTime: '12:00', endTime: '', location: '', reminderMinutes: 0,
        recurrence: 'none', recurrenceUntil: '', status: 'upcoming', createdAt: 3
      }
    ]);

    expect(app.daySchedule().map(item => item.type === 'event' ? item.event.id : item.task.id))
      .toEqual(['weekly-event', 'day-task']);
    expect(app.dayEvents()).toHaveLength(1);
  });

  it('hides past tasks and advances the My Tasks cutoff when the day changes', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const task = (id: string, date: string): LifeTask => ({
      id, title: id, date, time: '', priority: 'medium',
      category: 'Personal', status: 'open', createdAt: 1
    });
    app.clock.set(new Date(2026, 10, 10, 23, 59).getTime());
    app.tasks.set([
      task('yesterday', '2026-11-09'),
      task('today', '2026-11-10'),
      task('future', '2026-11-15')
    ]);

    expect(app.rows().map(item => item.id)).toEqual(['today', 'future']);
    app.clock.set(new Date(2026, 10, 11, 0, 1).getTime());
    expect(app.rows().map(item => item.id)).toEqual(['future']);
  });

  it('creates a reminder shortly before an open task is scheduled', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const now = new Date(2026, 10, 9, 6, 30);
    app.clock.set(now.getTime());
    app.tasks.set([{
      id: 'soon', title: 'Review notes', date: app.key(now), time: '06:45',
      priority: 'medium', category: 'Work', status: 'open', createdAt: 1
    }]);

    expect(app.reminders()).toContainEqual(expect.objectContaining({
      id: 'due-soon',
      kind: 'upcoming',
      message: 'Review notes is scheduled in 15 minutes.'
    }));
  });

  it('shows each unfinished task starting exactly two hours before its scheduled time', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.tasks.set([
      { id: 'four', title: 'Prepare report', date: '2026-11-10', time: '16:00', priority: 'medium', category: 'Work', status: 'open', createdAt: 1 },
      { id: 'five', title: 'Call Sam', date: '2026-11-10', time: '17:00', priority: 'medium', category: 'Personal', status: 'open', createdAt: 2 }
    ]);

    app.clock.set(new Date(2026, 10, 10, 13, 59).getTime());
    expect(app.reminders().filter(reminder => reminder.taskId)).toHaveLength(0);

    app.clock.set(new Date(2026, 10, 10, 14, 0).getTime());
    expect(app.reminders()).toContainEqual(expect.objectContaining({
      id: 'due-four',
      message: 'Prepare report is scheduled in 2 hours.'
    }));
    expect(app.reminders().some(reminder => reminder.id === 'due-five')).toBe(false);

    app.clock.set(new Date(2026, 10, 10, 15, 0).getTime());
    expect(app.reminders()).toContainEqual(expect.objectContaining({
      id: 'due-five',
      message: 'Call Sam is scheduled in 2 hours.'
    }));

    app.clock.set(new Date(2026, 10, 10, 16, 1).getTime());
    expect(app.reminders().some(reminder => reminder.id === 'due-four')).toBe(false);

    app.clock.set(new Date(2026, 10, 11, 8, 0).getTime());
    expect(app.reminders().some(reminder => reminder.id === 'due-four')).toBe(false);
    app.tasks.update(tasks => tasks.map(task => task.id === 'four' ? { ...task, status: 'done' } : task));
    expect(app.reminders().some(reminder => reminder.id === 'due-four')).toBe(false);
  });

  it('shows a tomorrow reminder the day before, then a two-hour reminder on the task date', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const task: LifeTask = {
      id: 'tomorrow-task', title: 'Calendar appointment', date: '2026-10-10', time: '16:00',
      priority: 'medium', category: 'Personal', status: 'open', createdAt: 1
    };
    app.tasks.set([task]);

    app.clock.set(new Date(2026, 9, 9, 8, 0).getTime());
    expect(app.reminders()).toContainEqual(expect.objectContaining({
      id: 'due-tomorrow-task',
      title: 'Tomorrow',
      message: 'Calendar appointment is scheduled tomorrow at 16:00.'
    }));

    app.clock.set(new Date(2026, 9, 10, 14, 0).getTime());
    expect(app.reminders()).toContainEqual(expect.objectContaining({
      id: 'due-tomorrow-task',
      message: 'Calendar appointment is scheduled in 2 hours.'
    }));
  });

  it('shows the accurate time remaining in the day for unfinished activities', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const lateEvening = new Date(2026, 10, 9, 21, 0);
    app.tasks.set([{
      id: 'unfinished', title: 'Plan tomorrow', date: app.key(lateEvening), time: '',
      priority: 'low', category: 'Personal', status: 'open', createdAt: 1
    }]);

    app.clock.set(new Date(2026, 10, 9, 20, 59).getTime());
    expect(app.reminders().some(reminder => reminder.kind === 'end-of-day')).toBe(false);
    app.clock.set(lateEvening.getTime());
    expect(app.reminders()).toContainEqual(expect.objectContaining({
      id: 'end-of-day-' + app.key(lateEvening),
      title: '3 hours left in your day',
      kind: 'end-of-day'
    }));

    app.clock.set(new Date(2026, 10, 9, 23, 15).getTime());
    expect(app.reminders()).toContainEqual(expect.objectContaining({
      id: 'end-of-day-' + app.key(lateEvening),
      title: '45 minutes left in your day',
      kind: 'end-of-day'
    }));
  });

  it('shows morning and evening adhkar on schedule until opened and closed', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app.page.set('notifications');

    app.clock.set(new Date(2026, 10, 10, 6, 59).getTime());
    expect(app.reminders().filter(reminder => reminder.adhkarPeriod)).toHaveLength(0);

    app.clock.set(new Date(2026, 10, 10, 7, 0).getTime());
    fixture.detectChanges();
    expect(app.reminders().filter(reminder => reminder.adhkarPeriod).map(reminder => reminder.adhkarPeriod)).toEqual(['morning']);
    const openButton = fixture.nativeElement.querySelector('.reminder-adhkar button') as HTMLButtonElement;
    expect(openButton.textContent).toContain('Open adhkar');

    openButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"] h2')?.textContent).toContain('أذكار الصباح');
    expect(fixture.nativeElement.querySelectorAll('.adhkar-list li')).toHaveLength(14);
    expect(fixture.nativeElement.querySelector('.adhkar-item-heading span')?.textContent).toContain('مرة واحدة');
    (fixture.nativeElement.querySelector('.adhkar-modal .modal-actions button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(app.reminders().some(reminder => reminder.adhkarPeriod === 'morning')).toBe(false);
    expect(localStorage.getItem('life-os-dismissed-adhkar:test-user')).toContain(`adhkar-morning-${app.todayISO}`);

    app.clock.set(new Date(2026, 10, 10, 16, 0).getTime());
    expect(app.reminders().filter(reminder => reminder.adhkarPeriod).map(reminder => reminder.adhkarPeriod)).toEqual(['evening']);
    fixture.destroy();

    const reopened = TestBed.createComponent(App);
    await reopened.whenStable();
    reopened.componentInstance.clock.set(new Date(2026, 10, 10, 16, 0).getTime());
    expect(reopened.componentInstance.reminders().filter(reminder => reminder.adhkarPeriod).map(reminder => reminder.adhkarPeriod)).toEqual(['evening']);
    reopened.destroy();
  });

  it('keeps today and the current-day chart highlight aligned with the live local date', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.clock.set(new Date(2026, 10, 9, 23, 59).getTime());
    expect(app.todayISO).toBe('2026-11-09');
    expect(app.weekBars().find(day => day.today)?.key).toBe(app.todayISO);

    app.clock.set(new Date(2026, 10, 10, 0, 1).getTime());
    expect(app.todayISO).toBe('2026-11-10');
    expect(app.weekBars().find(day => day.today)?.key).toBe(app.todayISO);
  });

  it('keeps the selected calendar date visible when changing months', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.monthAnchor.set(new Date(2026, 0, 1));
    app.selectCalendarDate('2026-01-31');
    app.shiftMonth(1);

    expect(app.selectedDate()).toBe('2026-02-28');
    expect(app.monthDays()).toHaveLength(35);
  });

  it('summarizes the selected historical day and records completion without changing task dates', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    vi.spyOn(backend, 'updateTask').mockImplementation(async (id, status, completedAt) => {
      app.tasks.update(tasks => tasks.map(task => task.id === id ? { ...task, status, completedAt } : task));
    });
    vi.spyOn(backend, 'getTasks').mockImplementation(async () => app.tasks());
    app.historyDate.set('2026-11-12');
    app.tasks.set([
      { id: 'completed', title: 'Done', date: '2026-11-12', time: '', priority: 'medium', category: 'Personal', status: 'done', createdAt: 1, completedAt: 2 },
      { id: 'missed', title: 'Missed', date: '2026-11-12', time: '', priority: 'high', category: 'Work', status: 'missed', createdAt: 2 },
      { id: 'skipped', title: 'Skipped', date: '2026-11-12', time: '', priority: 'low', category: 'Personal', status: 'skipped', createdAt: 3 }
    ]);

    expect(app.historyCompleted()).toBe(1);
    expect(app.historyMissed()).toBe(1);
    expect(app.historySkipped()).toBe(1);
    expect(app.historyCompletion()).toBe(33);

    await app.completeHistoryTask(app.historyTasks()[1]);
    expect(backend.updateTask).toHaveBeenCalledWith('missed', 'done', expect.any(Number));
    expect(app.historyTasks().find(task => task.id === 'missed')).toMatchObject({
      date: '2026-11-12',
      status: 'done'
    });
  });

  it('prevents completing or reopening tasks from dates before today', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.clock.set(new Date(2026, 10, 15, 12).getTime());
    app.tasks.set([
      { id: 'old-open', title: 'Old task', date: '2026-11-14', time: '', priority: 'medium', category: 'Personal', status: 'open', createdAt: 1 },
      { id: 'old-done', title: 'Completed task', date: '2026-11-14', time: '', priority: 'medium', category: 'Personal', status: 'done', createdAt: 2 },
      { id: 'today-task', title: 'Today task', date: '2026-11-15', time: '', priority: 'medium', category: 'Personal', status: 'open', createdAt: 3 }
    ]);

    await app.toggle(app.tasks()[0]);
    await app.toggle(app.tasks()[1]);
    expect(backend.updateTask).not.toHaveBeenCalled();

    await app.toggle(app.tasks()[2]);
    expect(backend.updateTask).toHaveBeenCalledWith('today-task', 'done', expect.any(Number));
  });

  it('marks previous-day tasks missed and archives their expired reminders without moving them', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.clock.set(new Date(2026, 10, 12, 8, 0).getTime());
    app.tasks.set([
      { id: 'old-task', title: 'Old task', date: '2026-11-11', time: '17:00', priority: 'medium', category: 'Personal', status: 'open', createdAt: 1, reminderMinutes: 30 }
    ]);

    await app.processExpiredTasks();

    expect(backend.updateTask).toHaveBeenCalledWith('old-task', 'missed');
    expect(backend.archiveNotification).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'task',
      entityId: 'old-task'
    }));
    expect(app.tasks()[0]).toMatchObject({ date: '2026-11-11', status: 'missed' });
  });

  it('reschedules a missed occurrence as a new occurrence and retains its original record', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const original: LifeTask = {
      id: 'old-occurrence', taskId: 'task-definition', title: 'Review chapter', date: '2026-11-11',
      time: '10:00', priority: 'medium', category: 'Study', status: 'missed', createdAt: 1
    };
    app.tasks.set([original]);
    app.reschedulingTask.set(original.id);
    app.rescheduleDate.set('2026-11-13');

    await app.rescheduleMissedTask();

    expect(backend.saveTask).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 'task-definition',
      date: '2026-11-13',
      status: 'open',
      rescheduledFromId: 'old-occurrence'
    }));
    expect(backend.saveTask.mock.calls.at(-1)?.[0].id).not.toBe(original.id);
    expect(original).toMatchObject({ id: 'old-occurrence', date: '2026-11-11', status: 'missed' });
  });

  it('keeps recurring events on matching dates and displays them in the selected calendar day', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const weekly: LifeEvent = {
      id: 'weekly-meeting', title: 'Team meeting', description: '', date: '2026-11-02',
      startTime: '10:00', endTime: '11:00', location: '', reminderMinutes: 0,
      recurrence: 'weekly', recurrenceUntil: '2026-11-30', status: 'upcoming', createdAt: 1
    };
    app.events.set([weekly]);
    app.selectCalendarDate('2026-11-09');
    expect(app.selectedEvents()).toEqual([weekly]);
    app.selectCalendarDate('2026-11-10');
    expect(app.selectedEvents()).toHaveLength(0);
  });

  it('creates events with recurrence and keeps them separate from tasks', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    vi.spyOn(backend, 'getTasks').mockResolvedValue([]);
    app.addEvent();
    app.title.set('Weekly planning');
    app.date.set('2026-11-16');
    app.time.set('09:30');
    app.eventEndTime.set('10:00');
    app.eventRecurrence.set('weekly');
    app.eventRecurrenceUntil.set('2026-12-31');

    await app.saveEvent();

    expect(backend.saveEvent).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Weekly planning',
      recurrence: 'weekly',
      recurrenceUntil: '2026-12-31',
      status: 'upcoming'
    }));
    expect(app.tasks()).toHaveLength(0);
    expect(app.events()).toHaveLength(1);
  });

  it('deletes an active notification without deleting its task', async () => {
    const app = TestBed.createComponent(App).componentInstance;
    const date = app.key(new Date());
    app.clock.set(new Date(`${date}T10:00:00`).getTime());
    app.tasks.set([
      { id: 'keep-task', title: 'Keep this task', date, time: '11:00', priority: 'medium', category: 'Personal', status: 'open', createdAt: 1, reminderMinutes: 120 }
    ]);
    const reminder = app.reminders().find(item => item.taskId === 'keep-task');
    expect(reminder).toBeTruthy();

    await app.deleteActiveNotification(reminder!);

    expect(app.reminders().some(item => item.taskId === 'keep-task')).toBe(false);
    expect(app.tasks()).toHaveLength(1);
    expect(backend.deleteTask).not.toHaveBeenCalled();
    expect(backend.archiveNotification).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'task',
      entityId: 'keep-task',
      deletedAt: expect.any(String)
    }));
  });

  it('provides the Arabic adhkar list in the scheduled reminder dialog', () => {
    const app = TestBed.createComponent(App).componentInstance;

    expect(app.adhkar).toHaveLength(14);
    expect(app.adhkar[0]).toMatchObject({
      title: 'آية الكرسي',
      count: 'مرة واحدة',
      source: 'البقرة: 255'
    });
    expect(app.adhkar[0].text).toContain('اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ');
    expect(app.adhkar[13]).toMatchObject({ title: 'التسبيح والتحميد', count: '100 مرة' });
  });

  it('shows a rotating short dhikr toast and allows dismissing it', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);

    app.showQuickDhikrReminder();
    const first = app.quickDhikrToast();
    expect(app.shortAdhkar).toContain(first);

    app.showQuickDhikrReminder();
    expect(app.quickDhikrToast()).not.toBe(first);
    expect(app.shortAdhkar).toContain(app.quickDhikrToast());

    app.closeQuickDhikrToast();
    expect(app.quickDhikrToast()).toBe('');
    random.mockRestore();
    fixture.destroy();
  });

  it('formats the focus timer as an elapsed stopwatch', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.elapsedMilliseconds.set(3_661_234);

    expect(app.stopwatchDisplay()).toBe('01:01:01');
    expect(app.stopwatchMilliseconds()).toBe('.234');
    app.resetStopwatch();
    expect(app.stopwatchDisplay()).toBe('00:00:00');
    expect(app.stopwatchMilliseconds()).toBe('.000');
    expect(app.stopwatchRunning()).toBe(false);
  });

  it('scales each weekly bar to the completed count instead of the tallest bar', () => {
    const app = TestBed.createComponent(App).componentInstance;
    const task = (id: string): LifeTask => ({
      id, title: id, date: app.todayISO, time: '', priority: 'medium',
      category: 'Personal', status: 'done', createdAt: 1
    });
    app.tasks.set([task('one')]);
    const oneDone = app.weekBars().find(day => day.today)?.height ?? 0;
    app.tasks.set([task('one'), task('two')]);
    const twoDone = app.weekBars().find(day => day.today)?.height ?? 0;
    expect(oneDone).toBeGreaterThan(0);
    expect(twoDone).toBeGreaterThan(oneDone);
  });

  it('rates short or simple passwords as weak and long mixed passwords as strong', () => {
    const app = TestBed.createComponent(App).componentInstance;
    expect(app.getPasswordStrength('abc123').label).toBe('Weak');
    expect(app.getPasswordStrength('Correct-Horse-72!').label).toBe('Strong');
  });

  it('generates a strong password and fills its confirmation', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.generatePassword();
    expect(app.authPassword()).toHaveLength(18);
    expect(app.confirmPassword()).toBe(app.authPassword());
    expect(app.passwordStrength().label).toBe('Strong');
    expect(app.showPassword()).toBe(true);
  });

  it('shows a copy action for generated passwords and keeps confirmation masked without a toggle', async () => {
    const fixture = TestBed.createComponent(App);
    backend.user.set(null);
    fixture.componentInstance.authMode.set('signup');
    fixture.componentInstance.generatePassword();
    fixture.detectChanges();

    const generatedPassword = fixture.componentInstance.authPassword();
    const confirmInput = fixture.nativeElement.querySelector('#confirm-password') as HTMLInputElement;
    expect(confirmInput.type).toBe('password');
    expect(confirmInput.parentElement?.querySelector('.password-action')).toBeNull();
    expect(fixture.nativeElement.querySelector('.copy-generated-password')).toBeTruthy();

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await fixture.componentInstance.copyGeneratedPassword();
    expect(writeText).toHaveBeenCalledWith(generatedPassword);
    expect(fixture.componentInstance.toast()).toBe('Generated password copied');
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('offers Google sign-in on the authentication screen', async () => {
    const fixture = TestBed.createComponent(App);
    backend.user.set(null);
    fixture.detectChanges();

    const googleButton = fixture.nativeElement.querySelector('.auth-google') as HTMLButtonElement;
    expect(googleButton).toBeTruthy();
    expect(googleButton.querySelector('.google-mark')).toBeTruthy();
    expect(googleButton.textContent).toContain('Continue with Google');
    expect(googleButton.previousElementSibling?.textContent).toContain('Sign in');

    googleButton.click();
    await fixture.whenStable();
    expect(backend.signInWithGoogle).toHaveBeenCalled();
    fixture.destroy();
  });

  it('explains how to enable Google in Supabase when its provider is disabled', async () => {
    const fixture = TestBed.createComponent(App);
    backend.user.set(null);
    vi.mocked(backend.signInWithGoogle).mockRejectedValueOnce(
      new Error('Unsupported provider: provider is not enabled')
    );
    fixture.detectChanges();

    await fixture.componentInstance.signInWithGoogle();

    expect(fixture.componentInstance.authError()).toContain(
      'Authentication → Sign In / Providers → Google'
    );
    fixture.destroy();
  });
});
