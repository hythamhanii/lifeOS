import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { ArchivedNotification, Goal, Habit, LifeEvent, LifeTask } from './database';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase.config';

interface TaskDefinitionRow extends Pick<LifeTask, 'id' | 'title' | 'description' | 'priority' | 'category'> {
  user_id: string;
  goal_id: string | null;
  goal_contribution: number | null;
  created_at: number;
}

interface TaskOccurrenceRow {
  id: string;
  user_id: string;
  task_id: string;
  scheduled_date: string;
  start_time: string;
  due_time: string | null;
  status: LifeTask['status'];
  completed_at: number | null;
  reminder_minutes: number | null;
  rescheduled_from_id: string | null;
}

interface EventRow extends Omit<LifeEvent, 'createdAt' | 'startTime' | 'endTime' | 'recurrenceUntil' | 'reminderMinutes'> {
  user_id: string;
  start_time: string;
  end_time: string | null;
  recurrence_until: string | null;
  reminder_minutes: number | null;
  created_at: number;
}

interface NotificationRow extends Omit<ArchivedNotification, 'entityType' | 'entityId' | 'scheduledAt' | 'archivedAt' | 'deletedAt'> {
  user_id: string;
  entity_type: ArchivedNotification['entityType'];
  entity_id: string;
  scheduled_at: string;
  archived_at: string;
  deleted_at: string | null;
}

interface HabitRow extends Omit<Habit, 'weekdays' | 'completionDates' | 'lastDone'> {
  user_id: string;
  weekdays: number[] | null;
  completion_dates: string[] | null;
  last_done: string | null;
}

interface GoalRow extends Omit<Goal, 'targetDate' | 'createdAt'> {
  user_id: string;
  target_date: string;
  created_at: number;
}

@Injectable({ providedIn: 'root' })
export class LifeDataService {
  readonly configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  readonly authReady = signal(false);
  readonly user = signal<User | null>(null);
  readonly initializationError = signal('');
  private readonly client: SupabaseClient | null = this.configured
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  async initialize(): Promise<void> {
    if (!this.client) {
      this.authReady.set(true);
      return;
    }

    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      this.user.set(data.session?.user ?? null);
      this.client.auth.onAuthStateChange((_event, session) => {
        this.user.set(session?.user ?? null);
      });
    } catch (error) {
      this.initializationError.set(this.message(error));
    } finally {
      this.authReady.set(true);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.requireClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.requireClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  }

  async signUp(email: string, password: string): Promise<boolean> {
    const { data, error } = await this.requireClient().auth.signUp({ email, password });
    if (error) throw error;
    return Boolean(data.session);
  }

  async signOut(): Promise<void> {
    const { error } = await this.requireClient().auth.signOut();
    if (error) throw error;
  }

  async getTasks(): Promise<LifeTask[]> {
    const userId=this.requireUser().id,client=this.requireClient();
    const [definitions,occurrences]=await Promise.all([
      client.from('task_definitions').select('*').eq('user_id',userId),
      client.from('task_occurrences').select('*').eq('user_id',userId).order('scheduled_date')
    ]);
    if(definitions.error)throw definitions.error;
    if(occurrences.error)throw occurrences.error;
    const byId=new Map((definitions.data as TaskDefinitionRow[]).map(row=>[row.id,row]));
    return (occurrences.data as TaskOccurrenceRow[]).flatMap(occurrence=>{
      const definition=byId.get(occurrence.task_id);
      if(!definition)return [];
      return [{
        id:occurrence.id,
        taskId:definition.id,
        title:definition.title,
        description:definition.description,
        date:occurrence.scheduled_date,
        time:occurrence.start_time,
        dueTime:occurrence.due_time??'',
        priority:definition.priority,
        category:definition.category,
        status:occurrence.status,
        createdAt:definition.created_at,
        completedAt:occurrence.completed_at??undefined,
        reminderMinutes:occurrence.reminder_minutes??0,
        rescheduledFromId:occurrence.rescheduled_from_id??undefined,
        goalId:definition.goal_id??undefined,
        goalContribution:definition.goal_contribution??undefined
      }];
    });
  }

  async saveTask(task: LifeTask): Promise<void> {
    const userId=this.requireUser().id,client=this.requireClient(),taskId=task.taskId??task.id;
    const definition={id:taskId,user_id:userId,title:task.title,description:task.description??'',priority:task.priority,category:task.category,goal_id:task.goalId??null,goal_contribution:task.goalId?task.goalContribution??0:0,created_at:task.createdAt};
    const {error:definitionError}=await client.from('task_definitions').upsert(definition);
    if(definitionError)throw definitionError;
    const {error:occurrenceError}=await client.from('task_occurrences').upsert({
      id:task.id,user_id:userId,task_id:taskId,scheduled_date:task.date,start_time:task.time,due_time:task.dueTime??'',
      status:task.status,completed_at:task.completedAt??null,reminder_minutes:task.reminderMinutes??0,rescheduled_from_id:task.rescheduledFromId??null
    });
    if(occurrenceError)throw occurrenceError;
  }

  async updateTask(id: string, status: LifeTask['status'], completedAt?: number): Promise<void> {
    const { error } = await this.requireClient()
      .from('task_occurrences')
      .update({ status, completed_at: completedAt ?? null })
      .eq('id', id)
      .eq('user_id', this.requireUser().id);
    if (error) throw error;
  }

  async getEvents(): Promise<LifeEvent[]> {
    const { data, error } = await this.requireClient()
      .from('events')
      .select('*')
      .eq('user_id', this.requireUser().id)
      .order('date');
    if (error) throw error;
    return (data as EventRow[]).map(({ user_id, start_time, end_time, recurrence_until, reminder_minutes, created_at, ...row }) => ({
      ...row,
      startTime: start_time,
      endTime: end_time ?? '',
      recurrenceUntil: recurrence_until ?? '',
      reminderMinutes: reminder_minutes ?? 0,
      createdAt: created_at
    }));
  }

  async saveEvent(event: LifeEvent): Promise<void> {
    const user = this.requireUser();
    const { startTime, endTime, recurrenceUntil, reminderMinutes, createdAt, ...fields } = event;
    const { error } = await this.requireClient().from('events').upsert({
      ...fields,
      start_time: startTime,
      end_time: endTime,
      recurrence_until: recurrenceUntil,
      reminder_minutes: reminderMinutes,
      user_id: user.id,
      created_at: createdAt
    });
    if (error) throw error;
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await this.requireClient()
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', this.requireUser().id);
    if (error) throw error;
  }

  async getArchivedNotifications(): Promise<ArchivedNotification[]> {
    const { data, error } = await this.requireClient()
      .from('notifications')
      .select('*')
      .eq('user_id', this.requireUser().id)
      .order('archived_at', { ascending: false });
    if (error) throw error;
    return (data as NotificationRow[]).map(({ user_id, entity_type, entity_id, scheduled_at, archived_at, deleted_at, ...row }) => ({
      ...row,
      entityType: entity_type,
      entityId: entity_id,
      scheduledAt: scheduled_at,
      archivedAt: archived_at,
      deletedAt: deleted_at ?? undefined
    }));
  }

  async archiveNotification(notification: ArchivedNotification): Promise<void> {
    const { error } = await this.requireClient().from('notifications').upsert({
      id: notification.id,
      user_id: this.requireUser().id,
      entity_type: notification.entityType,
      entity_id: notification.entityId,
      title: notification.title,
      message: notification.message,
      scheduled_at: notification.scheduledAt,
      archived_at: notification.archivedAt,
      deleted_at: notification.deletedAt ?? null
    });
    if (error) throw error;
  }

  async deleteArchivedNotification(id: string): Promise<void> {
    const { error } = await this.requireClient()
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', this.requireUser().id);
    if (error) throw error;
  }

  async deleteTask(id: string): Promise<void> {
    const client=this.requireClient(),userId=this.requireUser().id;
    const {data:occurrence,error:lookupError}=await client.from('task_occurrences').select('task_id').eq('id',id).eq('user_id',userId).maybeSingle();
    if(lookupError)throw lookupError;
    const { error } = await client
      .from('task_occurrences')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    if(occurrence){
      const {count,error:countError}=await client.from('task_occurrences').select('id',{count:'exact',head:true}).eq('task_id',occurrence.task_id).eq('user_id',userId);
      if(countError)throw countError;
      if(!count){
        const {error:definitionError}=await client.from('task_definitions').delete().eq('id',occurrence.task_id).eq('user_id',userId);
        if(definitionError)throw definitionError;
      }
    }
  }

  async getHabits(): Promise<Habit[]> {
    const { data, error } = await this.requireClient()
      .from('habits')
      .select('*')
      .eq('user_id', this.requireUser().id)
      .order('title');
    if (error) throw error;
    return (data as HabitRow[]).map(({ weekdays, completion_dates, last_done, ...row }) => ({
      ...row,
      weekdays: weekdays ?? undefined,
      completionDates: completion_dates ?? undefined,
      lastDone: last_done ?? undefined
    }));
  }

  async saveHabit(habit: Habit): Promise<void> {
    const user = this.requireUser();
    const { weekdays, completionDates, lastDone, ...fields } = habit;
    const { error } = await this.requireClient().from('habits').upsert({
      ...fields,
      user_id: user.id,
      weekdays: weekdays ?? null,
      completion_dates: completionDates ?? null,
      last_done: lastDone ?? null
    });
    if (error) throw error;
  }

  async updateHabit(habit: Habit): Promise<void> {
    const { id, ...fields } = habit;
    const { weekdays, completionDates, lastDone, ...row } = fields;
    const { error } = await this.requireClient()
      .from('habits')
      .update({
        ...row,
        weekdays: weekdays ?? null,
        completion_dates: completionDates ?? null,
        last_done: lastDone ?? null
      })
      .eq('id', id)
      .eq('user_id', this.requireUser().id);
    if (error) throw error;
  }

  async deleteHabit(id: string): Promise<void> {
    const { error } = await this.requireClient()
      .from('habits')
      .delete()
      .eq('id', id)
      .eq('user_id', this.requireUser().id);
    if (error) throw error;
  }

  async getGoals(): Promise<Goal[]> {
    const { data, error } = await this.requireClient()
      .from('goals')
      .select('*')
      .eq('user_id', this.requireUser().id)
      .order('created_at');
    if (error) throw error;
    return (data as GoalRow[]).map(({ target_date, created_at, ...row }) => ({
      ...row,
      targetDate: target_date,
      createdAt: created_at
    }));
  }

  async saveGoal(goal: Goal): Promise<void> {
    const user = this.requireUser();
    const { targetDate, createdAt, ...fields } = goal;
    const { error } = await this.requireClient().from('goals').insert({
      ...fields,
      user_id: user.id,
      target_date: targetDate,
      created_at: createdAt
    });
    if (error) throw error;
  }

  async updateGoal(goal: Goal): Promise<void> {
    const { error } = await this.requireClient()
      .from('goals')
      .update({
        title: goal.title,
        description: goal.description,
        target_date: goal.targetDate,
        progress: goal.progress
      })
      .eq('id', goal.id)
      .eq('user_id', this.requireUser().id);
    if (error) throw error;
  }

  async deleteGoal(id: string): Promise<void> {
    const { error } = await this.requireClient()
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', this.requireUser().id);
    if (error) throw error;
  }

  async restore(tasks: LifeTask[], habits: Habit[], goals: Goal[], events: LifeEvent[] = [], notifications: ArchivedNotification[] = []): Promise<void> {
    const userId = this.requireUser().id;
    const taskDefinitions=[...new Map(tasks.map(task=>{
      const id=task.taskId??task.id;
      return [id,{id,user_id:userId,title:task.title,description:task.description??'',priority:task.priority,category:task.category,goal_id:task.goalId??null,goal_contribution:task.goalId?task.goalContribution??0:0,created_at:task.createdAt}];
    })).values()];
    const taskOccurrences=tasks.map(task=>({
      id:task.id,user_id:userId,task_id:task.taskId??task.id,scheduled_date:task.date,start_time:task.time,due_time:task.dueTime??'',
      status:task.status,completed_at:task.completedAt??null,reminder_minutes:task.reminderMinutes??0,rescheduled_from_id:task.rescheduledFromId??null
    }));
    const habitRows = habits.map(({ weekdays, completionDates, lastDone, ...row }) => ({
      ...row,
      user_id: userId,
      weekdays: weekdays ?? null,
      completion_dates: completionDates ?? null,
      last_done: lastDone ?? null
    }));
    const goalRows = goals.map(({ targetDate, createdAt, ...row }) => ({
      ...row,
      user_id: userId,
      target_date: targetDate,
      created_at: createdAt
    }));
    const eventRows = events.map(({ startTime, endTime, recurrenceUntil, reminderMinutes, createdAt, ...row }) => ({
      ...row,
      user_id: userId,
      start_time: startTime,
      end_time: endTime,
      recurrence_until: recurrenceUntil,
      reminder_minutes: reminderMinutes,
      created_at: createdAt
    }));
    const notificationRows = notifications.map(({ entityType, entityId, scheduledAt, archivedAt, deletedAt, ...row }) => ({
      ...row,
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      scheduled_at: scheduledAt,
      archived_at: archivedAt,
      deleted_at: deletedAt ?? null
    }));
    const client = this.requireClient();
    if (goalRows.length) {
      const { error } = await client.from('goals').upsert(goalRows);
      if (error) throw error;
    }
    if(taskDefinitions.length){
      const {error}=await client.from('task_definitions').upsert(taskDefinitions);
      if(error)throw error;
    }
    const results = await Promise.all([
      taskOccurrences.length ? client.from('task_occurrences').upsert(taskOccurrences) : Promise.resolve({ error: null }),
      habitRows.length ? client.from('habits').upsert(habitRows) : Promise.resolve({ error: null }),
      eventRows.length ? client.from('events').upsert(eventRows) : Promise.resolve({ error: null }),
      notificationRows.length ? client.from('notifications').upsert(notificationRows) : Promise.resolve({ error: null })
    ]);
    const failure = results.find(result => result.error)?.error;
    if (failure) throw failure;
  }

  private requireClient(): SupabaseClient {
    if (!this.client) throw new Error('Supabase is not configured. Add the project URL and anon key.');
    return this.client;
  }

  private requireUser(): User {
    const user = this.user();
    if (!user) throw new Error('Sign in before accessing your data.');
    return user;
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Could not connect to Supabase.';
  }
}
