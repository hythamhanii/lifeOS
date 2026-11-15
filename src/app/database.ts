import Dexie, { Table } from 'dexie';

export type TaskStatus = 'open' | 'in-progress' | 'done' | 'missed' | 'skipped';
export interface LifeTask {
  id: string;
  taskId?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  dueTime?: string;
  priority: 'low'|'medium'|'high';
  category: string;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
  reminderMinutes?: number;
  rescheduledFromId?: string;
  goalId?: string;
  goalContribution?: number;
}
export interface TaskOccurrence {
  id: string;
  taskId: string;
  date: string;
  time: string;
  dueTime: string;
  status: TaskStatus;
  completedAt?: number;
  reminderMinutes: number;
  rescheduledFromId?: string;
}
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type EventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export interface LifeEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  reminderMinutes: number;
  recurrence: EventRecurrence;
  recurrenceUntil: string;
  status: EventStatus;
  createdAt: number;
}
export interface ArchivedNotification {
  id: string;
  entityType: 'task' | 'event';
  entityId: string;
  title: string;
  message: string;
  scheduledAt: string;
  archivedAt: string;
  deletedAt?: string;
}
export interface Habit { id: string; title: string; frequency: string; weekdays?: number[]; completionDates?: string[]; icon: string; streak: number; done: boolean; lastDone?: string; }
export interface Goal { id: string; title: string; description: string; targetDate: string; progress: number; createdAt: number; }

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const weekdayFromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).getDay() || 7;
};
export function habitWeekdays(habit: Pick<Habit, 'weekdays' | 'frequency'>): number[] {
  if (habit.weekdays?.length) return habit.weekdays;
  if (habit.frequency.toLowerCase().includes('weekday')) return [1, 2, 3, 4, 5];
  if (habit.frequency.toLowerCase().includes('weekend')) return [6, 7];
  return WEEKDAYS;
}
export function isHabitScheduled(habit: Pick<Habit, 'weekdays' | 'frequency'>, dateKey: string): boolean {
  return habitWeekdays(habit).includes(weekdayFromKey(dateKey));
}
export function habitStreak(habit: Habit, todayKey: string): number {
  const scheduled = new Set(habitWeekdays(habit));
  const completed = new Set(habit.completionDates ?? (habit.done ? [todayKey] : []));
  const cursor = new Date(todayKey + 'T12:00:00');
  if (scheduled.has(cursor.getDay() || 7) && !completed.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (let checked = 0; checked < 366; checked++, cursor.setDate(cursor.getDate() - 1)) {
    const key = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0') + '-' + String(cursor.getDate()).padStart(2, '0');
    if (!scheduled.has(cursor.getDay() || 7)) continue;
    if (!completed.has(key)) break;
    streak++;
  }
  return streak;
}
export class LifeDatabase extends Dexie {
  static db = new LifeDatabase();
  tasks!: Table<LifeTask,string>; habits!: Table<Habit,string>; goals!: Table<Goal,string>;
  constructor() {
    super('LifeOS');
    this.version(1).stores({tasks:'id,date,status,priority,category',habits:'id,title',goals:'id,title,targetDate'});
    this.version(2).stores({tasks:'id,date,status,priority,category',habits:'id,title',goals:'id,title,targetDate'}).upgrade(async tx => {
      const now = new Date();
      const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      await tx.table('habits').toCollection().modify((habit: Habit) => {
        habit.weekdays ??= habit.frequency.toLowerCase().includes('weekday') ? [1, 2, 3, 4, 5] : habit.frequency.toLowerCase().includes('weekend') ? [6, 7] : WEEKDAYS;
        habit.completionDates ??= habit.done ? [today] : [];
      });
    });
  }
}
