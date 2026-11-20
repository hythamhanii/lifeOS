import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { ArchivedNotification, EventRecurrence, EventStatus, Habit, Goal, LifeEvent, LifeTask, TaskStatus, habitStreak, habitWeekdays, isHabitScheduled } from './database';
import { LifeDataService } from './life-data.service';
import { ARABIC_TRANSLATIONS } from './translations';

interface LifeReminder {
  id: string;
  title: string;
  message: string;
  kind: 'upcoming' | 'overdue' | 'end-of-day' | 'adhkar' | 'event';
  taskId?: string;
  eventId?: string;
  scheduledAt?: string;
  adhkarPeriod?: 'morning' | 'evening';
}

interface DailyDhikr {
  title: string;
  count: string;
  text: string;
  source: string;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly backend = inject(LifeDataService);
  nav=[['overview','Overview','◫'],['day','My Day','☼'],['tasks','My Tasks','☷'],['events','Events','◷'],['history','History','↺'],['notifications','Notifications','♧'],['timer','Timer','◷'],['habits','Daily Habits','✳'],['calendar','Calendar','▦'],['goals','Goals','◎'],['weekly','Weekly Review','↗'],['settings','Settings','⚙']];
  language=signal<'en'|'ar'>(localStorage.getItem('life-os-language')==='ar'?'ar':'en');
  private readonly languageEffect=effect(()=>{const language=this.language();document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';localStorage.setItem('life-os-language',language)});
  readonly adhkar: DailyDhikr[]=[
    {title:'آية الكرسي',count:'مرة واحدة',text:'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ.',source:'البقرة: 255'},
    {title:'سورة الإخلاص',count:'3 مرات',text:'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ.',source:'الإخلاص: 1-4'},
    {title:'سورة الفلق',count:'3 مرات',text:'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِنْ شَرِّ مَا خَلَقَ ۝ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ.',source:'الفلق: 1-5'},
    {title:'سورة الناس',count:'3 مرات',text:'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ.',source:'الناس: 1-6'},
    {title:'سيد الاستغفار',count:'مرة واحدة',text:'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.',source:'رواه البخاري'},
    {title:'الرضا بالله',count:'3 مرات',text:'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا.',source:'رواه أبو داود والترمذي'},
    {title:'التوكل على الله',count:'7 مرات',text:'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ.',source:'رواه أبو داود'},
    {title:'التحصن باسم الله',count:'3 مرات',text:'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ، وَهُوَ السَّمِيعُ الْعَلِيمُ.',source:'رواه أبو داود والترمذي'},
    {title:'طلب العافية',count:'3 مرات',text:'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ.',source:'رواه أبو داود'},
    {title:'طلب العفو والعافية',count:'مرة واحدة',text:'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي.',source:'رواه أبو داود وابن ماجه'},
    {title:'الاستعانة بالحي القيوم',count:'3 مرات',text:'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ.',source:'رواه الحاكم'},
    {title:'الصلاة على النبي ﷺ',count:'10 مرات',text:'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ.',source:'رواه الطبراني'},
    {title:'التهليل',count:'100 مرة',text:'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.',source:'متفق عليه'},
    {title:'التسبيح والتحميد',count:'100 مرة',text:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ.',source:'متفق عليه'}
  ];
  readonly shortAdhkar=[
    'اللهم صل على سيدنا محمد',
    'أستغفر الله العلي العظيم وأتوب إليه',
    'سبحان الله - الحمدلله - الله أكبر',
    'لا حول ولا قوة إلا بالله العلي العظيم',
    'لا إله إلا الله',
    'لا إله إلا أنت سبحانك إني كنت من الظالمين',
    'سبحان الله وبحمده سبحان الله العظيم',
    'اللهم إنك عفو تحب العفو فاعف عنا',
    'اللهم يا مقلب القلوب ثبت قلبي على دينك',
    'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم',
    'سبحان الله وبحمده عدد خلقه ورضا نفسه وزنة عرشه ومداد كلماته',
    'اللهم ارض عنا واغفر لنا وارحمنا',
    'سبحان الله والحمدلله ولا إله إلا الله والله أكبر'
  ];
  private readonly stopwatchElapsed=computed(()=>this.elapsedMilliseconds()+(this.stopwatchRunning()?this.timerNow()-this.stopwatchStartedAt:0));
  readonly stopwatchDisplay=computed(()=>{const totalSeconds=Math.floor(this.stopwatchElapsed()/1000),hours=Math.floor(totalSeconds/3600),minutes=Math.floor(totalSeconds%3600/60),seconds=totalSeconds%60;return`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`});
  readonly stopwatchMilliseconds=computed(()=>`.${String(Math.floor(this.stopwatchElapsed()%1000)).padStart(3,'0')}`);
  page=signal('overview'); tasks=signal<LifeTask[]>([]); events=signal<LifeEvent[]>([]); archivedNotifications=signal<ArchivedNotification[]>([]); habits=signal<Habit[]>([]); goals=signal<Goal[]>([]);
  animatedPercent=signal(0);
  private progressFrame=0;
  modal=signal(''); title=signal(''); date=signal(this.key(new Date())); time=signal(''); priority=signal('medium'); category=signal(''); goalId=signal(''); goalContribution=signal(10); filter=signal('all'); search=signal(''); toast=signal(''); dark=signal(localStorage.getItem('life-os-theme')==='dark');
  notificationSound=signal(localStorage.getItem('life-os-notification-sound')==='true');
  authMode=signal<'signin'|'signup'>('signin'); authEmail=signal(''); authPassword=signal(''); confirmPassword=signal(''); showPassword=signal(false); authBusy=signal(false); authError=signal(''); backendError=signal('');
  passwordStrength=computed(()=>this.getPasswordStrength(this.authPassword()));
  passwordsMatch=computed(()=>!this.confirmPassword()||this.confirmPassword()===this.authPassword());
  editing=signal(''); editingEvent=signal(''); editingHabit=signal(''); editingGoal=signal(''); goalFilter=signal<'all'|'active'|'completed'>('all'); freq=signal(''); desc=signal(''); goalDate=signal('');
  taskDescription=signal(''); dueTime=signal(''); reminderMinutes=signal(120); taskStatus=signal<TaskStatus>('open'); eventLocation=signal(''); eventEndTime=signal(''); eventRecurrence=signal<EventRecurrence>('none'); eventRecurrenceUntil=signal(''); eventReminderMinutes=signal(0);   eventStatusFilter=signal<'all'|'upcoming'|'ongoing'|'completed'|'cancelled'>('all');
  historyDate=signal(this.key(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()-1))); scheduleFilter=signal<'all'|'tasks'|'events'>('all'); archivedNotificationsVisible=signal(false);
  reschedulingTask=signal(''); rescheduleDate=signal('');
  dismissedAdhkarReminders=signal<string[]>([]);
  activeAdhkarReminder=signal<{id:string;period:'morning'|'evening';userId:string}|null>(null);
  private readonly adhkarDismissalEffect=effect(()=>{const userId=this.backend.user()?.id;this.dismissedAdhkarReminders.set(userId?(localStorage.getItem(this.adhkarDismissalStorageKey(userId))||'').split(',').filter(Boolean):[])});
  weeklyFocus=signal('');
  private readonly weeklyFocusEffect=effect(()=>{const user=this.backend.user();if(this.page()==='weekly'){this.reviewWeekStart();if(user)this.loadWeeklyFocus();else this.weeklyFocus.set('')}});
  selectedWeekdays=signal<number[]>([]);
  weekdayOptions=[{day:1,label:'Mon'},{day:2,label:'Tue'},{day:3,label:'Wed'},{day:4,label:'Thu'},{day:5,label:'Fri'},{day:6,label:'Sat'},{day:7,label:'Sun'}];
  clock=signal(Date.now());
  get todayISO(): string { return this.key(new Date(this.clock())); }
  get todayLabel(): string { return new Intl.DateTimeFormat(this.locale,{weekday:'long',month:'long',day:'numeric'}).format(new Date(this.clock())); }
  get todayEyebrow(): string { return this.todayLabel.toUpperCase(); }
  dayDate=signal(this.todayISO);
  dayLabel=computed(()=>{const [y,m,d]=this.dayDate().split('-').map(Number);return new Intl.DateTimeFormat(this.locale,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(y,m-1,d))});
  selectedDate=signal(this.todayISO);
  monthAnchor=signal(new Date(new Date().getFullYear(),new Date().getMonth(),1));
  reminderToast=signal(false);
  quickDhikrToast=signal('');
  stopwatchRunning=signal(false);
  timerFullscreen=signal(false);
  timerFullscreenError=signal('');
  elapsedMilliseconds=signal(0);
  private timerNow=signal(Date.now());
  private stopwatchStartedAt=0;
  private stopwatchInterval=0;
  private readonly fullscreenChangeHandler=()=>{if(!document.fullscreenElement&&this.timerFullscreen()){this.timerFullscreen.set(false);this.timerFullscreenError.set('')}};
  private readonly announcedReminders=new Set<string>();
  private activeDataUserId='';
  private reminderToastTimeout=0;
  private quickDhikrInterval=0;
  private quickDhikrToastTimeout=0;
  private previousShortDhikrIndex=-1;
  private notificationAudioContext:AudioContext|null=null;
  pageTitle=computed(()=>this.translate(this.nav.find(x=>x[0]===this.page())?.[1]||'Overview'));
  todayTasks=computed(()=>this.tasks().filter(t=>t.date===this.todayISO).sort((a,b)=>(a.time||'').localeCompare(b.time||'')));
  dayTasks=computed(()=>this.tasks().filter(t=>t.date===this.dayDate()).sort((a,b)=>(a.time||'').localeCompare(b.time||'')));
  dayEvents=computed(()=>this.eventsOnDate(this.dayDate()));
  daySchedule=computed(()=>[
    ...this.dayTasks().map(task=>({type:'task' as const,task,time:task.time})),
    ...this.dayEvents().map(event=>({type:'event' as const,event,time:event.startTime}))
  ].sort((a,b)=>a.time.localeCompare(b.time)));
  dayDone=computed(()=>this.dayTasks().filter(t=>t.status==='done').length);
  dayPercent=computed(()=>this.dayTasks().length?Math.round(this.dayDone()/this.dayTasks().length*100):0);
  historyTasks=computed(()=>this.tasks().filter(task=>task.date===this.historyDate()).sort((a,b)=>(a.time||'').localeCompare(b.time||'')));
  historyCompleted=computed(()=>this.historyTasks().filter(task=>task.status==='done').length);
  historyMissed=computed(()=>this.historyTasks().filter(task=>task.status==='missed').length);
  historySkipped=computed(()=>this.historyTasks().filter(task=>task.status==='skipped').length);
  historyCompletion=computed(()=>this.historyTasks().length?Math.round(this.historyCompleted()/this.historyTasks().length*100):0);
  visibleEvents=computed(()=>this.events().filter(event=>this.eventStatusFilter()==='all'||this.eventStatusLabel(event).toLowerCase()===this.eventStatusFilter()).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime)));
  visibleArchivedNotifications=computed(()=>this.archivedNotifications().filter(notification=>!notification.deletedAt));
  done=computed(()=>this.todayTasks().filter(t=>t.status==='done').length);
  percent=computed(()=>this.todayTasks().length?Math.round(this.done()/this.todayTasks().length*100):0);
  openCount=computed(()=>this.tasks().filter(t=>['open','in-progress'].includes(t.status)&&t.date>=this.todayISO).length);
  todayHabits=computed(()=>this.habits().filter(h=>this.isScheduledToday(h)));
  habitsDone=computed(()=>this.todayHabits().filter(h=>this.isHabitDone(h)).length);
  bestHabitStreak=computed(()=>Math.max(0,...this.habits().map(h=>habitStreak(h,this.todayISO))));
  activeGoalCount=computed(()=>this.goals().filter(goal=>this.goalProgress(goal)<100).length);
  completedGoalCount=computed(()=>this.goals().filter(goal=>this.goalProgress(goal)>=100).length);
  averageGoalProgress=computed(()=>{const active=this.goals().filter(goal=>this.goalProgress(goal)<100);return active.length?Math.round(active.reduce((sum,goal)=>sum+this.goalProgress(goal),0)/active.length):0});
  visibleGoals=computed(()=>this.goals().filter(goal=>this.goalFilter()==='all'||(this.goalFilter()==='active'?this.goalProgress(goal)<100:this.goalProgress(goal)>=100)).sort((a,b)=>{if((this.goalProgress(a)>=100)!==(this.goalProgress(b)>=100))return this.goalProgress(a)>=100?1:-1;if(!a.targetDate)return b.targetDate?1:a.createdAt-b.createdAt;if(!b.targetDate)return -1;return a.targetDate.localeCompare(b.targetDate)}));
  dayNumber=computed(()=>new Date(this.clock()).getDate());
  weekBars=computed(()=>{const anchor=new Date(this.clock());const data=Array.from({length:7},(_,i)=>{const d=new Date(anchor);d.setDate(anchor.getDate()-6+i);const key=this.key(d);return {key,label:new Intl.DateTimeFormat(this.locale,{weekday:'short'}).format(d),count:this.tasks().filter(t=>t.date===key&&t.status==='done').length,today:key===this.todayISO}});const max=Math.max(8,Math.ceil(Math.max(0,...data.map(d=>d.count))/4)*4);return data.map(d=>({...d,height:d.count?Math.max(3,d.count/max*100):0}))});
  reviewWeekStart=computed(()=>{const start=new Date(this.clock());start.setHours(12,0,0,0);start.setDate(start.getDate()-(start.getDay()+6)%7);return this.key(start)});
  reviewWeekEnd=computed(()=>{const end=new Date(this.reviewWeekStart()+'T12:00:00');end.setDate(end.getDate()+6);return this.key(end)});
  reviewWeekLabel=computed(()=>{const start=new Date(this.reviewWeekStart()+'T12:00:00'),end=new Date(this.reviewWeekEnd()+'T12:00:00'),format=new Intl.DateTimeFormat(this.locale,{month:'short',day:'numeric'});return `${format.format(start)} – ${new Intl.DateTimeFormat(this.locale,{month:'short',day:'numeric',year:'numeric'}).format(end)}`});
  reviewWeekDays=computed(()=>Array.from({length:7},(_,index)=>{const date=new Date(this.reviewWeekStart()+'T12:00:00');date.setDate(date.getDate()+index);const key=this.key(date);return{key,label:new Intl.DateTimeFormat(this.locale,{weekday:'short'}).format(date),count:this.tasks().filter(task=>task.date===key&&task.status==='done').length,today:key===this.todayISO,future:key>this.todayISO}}));
  reviewBarHeight(count:number){return `${count?Math.min(100,Math.max(8,count*18)):0}%`}
  weeklyBarTitle(label:string,count:number,today:boolean){return this.language()==='ar'?`${label}: ${count} مكتمل${today?' · اليوم':''}`:`${label}: ${count} completed${today?' · Today':''}`}
  weeklyCompletedTasks=computed(()=>this.tasks().filter(task=>task.status==='done'&&task.date>=this.reviewWeekStart()&&task.date<=this.todayISO).length);
  weeklyPlannedTasks=computed(()=>this.tasks().filter(task=>task.date>=this.reviewWeekStart()&&task.date<=this.todayISO).length);
  weeklyOpenTasks=computed(()=>this.tasks().filter(task=>task.status==='open'&&task.date>=this.todayISO&&task.date<=this.reviewWeekEnd()).length);
  weeklyHabitStats=computed(()=>{const habits=this.habits(),today=this.todayISO,lastDate=today<this.reviewWeekEnd()?today:this.reviewWeekEnd();let scheduled=0,completed=0;for(const habit of habits){const dates=new Set(habit.completionDates??(habit.done?[today]:[]));const date=new Date(this.reviewWeekStart()+'T12:00:00');while(this.key(date)<=lastDate){const key=this.key(date);if(isHabitScheduled(habit,key)){scheduled++;if(dates.has(key))completed++}date.setDate(date.getDate()+1)}}return{scheduled,completed,rate:scheduled?Math.round(completed/scheduled*100):0}});
  weeklyCompletedGoalSteps=computed(()=>this.tasks().filter(task=>task.goalId&&task.status==='done'&&task.date>=this.reviewWeekStart()&&task.date<=this.todayISO).length);
  weekDone=computed(()=>this.weekBars().reduce((sum,day)=>sum+day.count,0));
  currentDateKey=computed(()=>this.key(new Date(this.clock())));
  canToggleTask(task:LifeTask){return task.date>=this.currentDateKey()}
  currentTasks=computed(()=>this.tasks().filter(task=>task.date>=this.currentDateKey()&&task.status!=='missed'));
  selectedTasks=computed(()=>this.scheduleFilter()==='events'?[]:this.tasks().filter(t=>t.date===this.selectedDate()).sort((a,b)=>(a.time||'').localeCompare(b.time||'')));
  selectedEvents=computed(()=>this.scheduleFilter()==='tasks'?[]:this.eventsOnDate(this.selectedDate()));
  selectedDateLabel=computed(()=>{const [y,m,d]=this.selectedDate().split('-').map(Number);return new Intl.DateTimeFormat(this.locale,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(y,m-1,d))});
  monthLabel=computed(()=>new Intl.DateTimeFormat(this.locale,{month:'long',year:'numeric'}).format(this.monthAnchor()));
  monthDays=computed(()=>{const anchor=this.monthAnchor(),y=anchor.getFullYear(),m=anchor.getMonth(),offset=(new Date(y,m,1).getDay()+6)%7,count=new Date(y,m+1,0).getDate(),length=Math.ceil((offset+count)/7)*7;return Array.from({length},(_,i)=>{const date=new Date(y,m,i-offset+1);return{day:date.getDate(),current:date.getMonth()===m,date:this.key(date)}})});
  private readonly baseReminders=computed(()=>{const now=new Date(this.clock()),today=this.key(now),reminders:LifeReminder[]=[];for(const task of this.tasks()){const scheduledTime=task.dueTime||task.time;if(!['open','in-progress'].includes(task.status)||!scheduledTime)continue;const [year,month,day]=task.date.split('-').map(Number),[hours,minutes]=scheduledTime.split(':').map(Number);if(!year||!month||!day||!Number.isFinite(hours)||!Number.isFinite(minutes))continue;const due=new Date(year,month-1,day,hours,minutes),minutesUntil=Math.ceil((due.getTime()-now.getTime())/60000),todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()),dueStart=new Date(year,month-1,day),daysUntil=Math.round((dueStart.getTime()-todayStart.getTime())/86400000),lead=task.reminderMinutes??120;if(daysUntil<0||daysUntil>1||(daysUntil===1&&due.getTime()<=now.getTime())||(daysUntil===0&&(minutesUntil<=0||minutesUntil>lead)))continue;const timeLabel=daysUntil===1?`is scheduled tomorrow at ${scheduledTime}`:`is scheduled in ${minutesUntil===0?'now':minutesUntil<60?`${minutesUntil} ${minutesUntil===1?'minute':'minutes'}`:`${Math.floor(minutesUntil/60)} ${Math.floor(minutesUntil/60)===1?'hour':'hours'}${minutesUntil%60?` ${minutesUntil%60} ${minutesUntil%60===1?'minute':'minutes'}`:''}`}`;reminders.push({id:'due-'+task.id,title:daysUntil===1?'Tomorrow':'Task coming up',message:`${task.title} ${timeLabel}.`,kind:'upcoming',taskId:task.id})}const remaining=this.tasks().filter(task=>task.date===today&&['open','in-progress'].includes(task.status));const dismissed=new Set(this.dismissedAdhkarReminders());if(now.getHours()>=7&&!dismissed.has(`adhkar-morning-${today}`))reminders.push({id:`adhkar-morning-${today}`,title:'أذكار الصباح',message:'حان وقت أذكار الصباح.',kind:'adhkar',adhkarPeriod:'morning'});if(now.getHours()>=16&&!dismissed.has(`adhkar-evening-${today}`))reminders.push({id:`adhkar-evening-${today}`,title:'أذكار المساء',message:'حان وقت أذكار المساء.',kind:'adhkar',adhkarPeriod:'evening'});if(now.getHours()>=21&&remaining.length){const nextMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);const minutesLeft=Math.ceil((nextMidnight.getTime()-now.getTime())/60000);const hoursLeft=Math.floor(minutesLeft/60),remainingMinutes=minutesLeft%60;const timeLeft=hoursLeft?`${hoursLeft} ${hoursLeft===1?'hour':'hours'}${remainingMinutes?` ${remainingMinutes} ${remainingMinutes===1?'minute':'minutes'}`:''}`:`${minutesLeft} ${minutesLeft===1?'minute':'minutes'}`;reminders.push({id:'end-of-day-'+today,title:`${timeLeft} left in your day`,message:`${remaining.length} ${remaining.length===1?'activity is':'activities are'} still unfinished today.`,kind:'end-of-day'})}return reminders});
  reminders=computed(()=>{
    const now=this.clock();
    const taskReminders=this.baseReminders().filter(reminder=>{
      if(!reminder.taskId)return true;
      const task=this.tasks().find(item=>item.id===reminder.taskId);
      return Boolean(task&&task.reminderMinutes!==0&&!this.archivedNotifications().some(notification=>notification.entityType==='task'&&notification.entityId===task.id&&notification.deletedAt));
    });
    const eventReminders:LifeReminder[]=[];
    for(const event of this.events()){
      if(event.status!=='upcoming'||!event.reminderMinutes)continue;
      for(const date of this.eventDatesAroundToday(event)){
        const [year,month,day]=date.split('-').map(Number),[hours,minutes]=event.startTime.split(':').map(Number);
        const startsAt=new Date(year,month-1,day,hours,minutes).getTime(),minutesUntil=Math.ceil((startsAt-now)/60000);
        if(minutesUntil>event.reminderMinutes||minutesUntil<=0)continue;
        eventReminders.push({id:`event-${event.id}-${date}`,title:'Event coming up',message:`${event.title} starts in ${minutesUntil===1?'1 minute':minutesUntil<60?`${minutesUntil} minutes`:`${Math.floor(minutesUntil/60)} ${Math.floor(minutesUntil/60)===1?'hour':'hours'}`}.`,kind:'event',eventId:event.id,scheduledAt:new Date(startsAt).toISOString()});
      }
    }
    const activeEvents=eventReminders.filter(reminder=>!this.archivedNotifications().some(notification=>notification.entityType==='event'&&notification.entityId===reminder.eventId&&notification.scheduledAt===reminder.scheduledAt&&notification.deletedAt));
    return [...taskReminders,...activeEvents];
  });
  reminderCount=computed(()=>this.reminders().length);
  rows=computed(()=>this.currentTasks().filter(t=>(this.filter()==='all'||t.status===this.filter())&&(t.title+' '+t.category).toLowerCase().includes(this.search().toLowerCase())).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||'')));
  private get locale(){return this.language()==='ar'?'ar-EG':'en'}
  translate(value:string){return this.language()==='ar'?ARABIC_TRANSLATIONS[value]??value:value}
  toggleLanguage(){this.language.update(value=>value==='en'?'ar':'en')}
  navLabel(value:string){return this.translate(value)}
  constructor(){
    document.documentElement.classList.toggle('dark-theme',this.dark());
    void this.backend.initialize();
    effect(()=>{
      if(!this.backend.authReady())return;
      const user=this.backend.user();
      if(user){
        if(this.activeDataUserId!==user.id){
          this.activeDataUserId=user.id;
          this.tasks.set([]);this.events.set([]);this.archivedNotifications.set([]);this.habits.set([]);this.goals.set([]);
        }
        this.startQuickDhikrReminders();
        void this.refresh();
      }else{
        this.activeDataUserId='';
        this.stopQuickDhikrReminders();
        this.tasks.set([]);
        this.events.set([]);
        this.archivedNotifications.set([]);
        this.habits.set([]);
        this.goals.set([]);
      }
    });
    window.addEventListener('keydown',e=>{
      if(e.key.toLowerCase()==='n'&&!['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)&&this.backend.user()){
        e.preventDefault();
        this.addNew();
      }
      if(e.key==='Escape'){
        this.modal.set('');
        if(this.activeAdhkarReminder())this.closeAdhkarReminder();
        this.timerFullscreen.set(false);
      }
    });
    document.addEventListener('fullscreenchange',this.fullscreenChangeHandler);
    const reminderInterval=window.setInterval(()=>{
      const previousToday=this.todayISO;
      this.clock.set(Date.now());
      const currentToday=this.todayISO;
      if(currentToday!==previousToday){
        if(this.dayDate()===previousToday)this.dayDate.set(currentToday);
        if(this.selectedDate()===previousToday){
          this.selectedDate.set(currentToday);
          const today=new Date(this.clock());
          this.monthAnchor.set(new Date(today.getFullYear(),today.getMonth(),1));
        }
      }
      void this.processExpiredTasks()
        .then(()=>this.notifyReminders())
        .catch(error=>this.backendError.set(this.errorMessage(error)));
    },60000);
    inject(DestroyRef).onDestroy(()=>{
      window.clearInterval(reminderInterval);
      window.clearInterval(this.stopwatchInterval);
      window.clearTimeout(this.reminderToastTimeout);
      this.stopQuickDhikrReminders();
      if(this.notificationAudioContext)void this.notificationAudioContext.close();
      document.removeEventListener('fullscreenchange',this.fullscreenChangeHandler);
    });
  }
  key(d:Date){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  shiftDay(amount:number){const [y,m,d]=this.dayDate().split('-').map(Number);const next=new Date(y,m-1,d);next.setDate(next.getDate()+amount);this.dayDate.set(this.key(next))}
  shiftMonth(amount:number){const selected=this.selectedDate().split('-').map(Number),year=this.monthAnchor().getFullYear(),month=this.monthAnchor().getMonth()+amount,next=new Date(year,month,1),day=Math.min(selected[2],new Date(next.getFullYear(),next.getMonth()+1,0).getDate());this.monthAnchor.set(next);this.selectedDate.set(this.key(new Date(next.getFullYear(),next.getMonth(),day)))}
  goToCalendarToday(){const today=new Date();this.monthAnchor.set(new Date(today.getFullYear(),today.getMonth(),1));this.selectedDate.set(this.todayISO)}
  selectCalendarDate(date:string){this.selectedDate.set(date);const [year,month]=date.split('-').map(Number);this.monthAnchor.set(new Date(year,month-1,1))}
  calendarDayLabel(date:string,current:boolean){const [year,month,day]=date.split('-').map(Number);const label=new Intl.DateTimeFormat(this.locale,{weekday:'long',month:'long',day:'numeric'}).format(new Date(year,month-1,day));return `${label}${current?'':this.language()==='ar'?' (خارج هذا الشهر)':this.translate(' (outside this month)')}`}
  private eventOccursOn(event:LifeEvent,date:string){
    if(date<event.date||(event.recurrenceUntil&&date>event.recurrenceUntil))return false;
    if(event.recurrence==='none')return date===event.date;
    const start=new Date(event.date+'T12:00:00'),current=new Date(date+'T12:00:00');
    const days=Math.round((current.getTime()-start.getTime())/86400000);
    if(event.recurrence==='daily')return true;
    if(event.recurrence==='weekly')return days%7===0;
    return start.getDate()===current.getDate();
  }
  private eventsOnDate(date:string){return this.events().filter(event=>this.eventOccursOn(event,date)).sort((a,b)=>a.startTime.localeCompare(b.startTime))}
  private eventDatesAroundToday(event:LifeEvent){
    const today=new Date(this.todayISO+'T12:00:00');
    const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
    const tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
    const dates=[this.key(yesterday),this.todayISO,this.key(tomorrow)];
    return dates.filter(date=>this.eventOccursOn(event,date));
  }
  hasScheduledItems(date:string){return (this.scheduleFilter()!=='events'&&this.tasks().some(task=>task.date===date))||(this.scheduleFilter()!=='tasks'&&this.events().some(event=>this.eventOccursOn(event,date)))}
  shiftHistory(amount:number){const date=new Date(this.historyDate()+'T12:00:00');date.setDate(date.getDate()+amount);this.historyDate.set(this.key(date))}
  formatCompletionTime(timestamp?:number){return timestamp?new Intl.DateTimeFormat(this.locale,{dateStyle:'medium',timeStyle:'short'}).format(timestamp):this.translate('Completion time not recorded')}
  formatNotificationDate(timestamp:string){return new Intl.DateTimeFormat(this.locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(timestamp))}
  eventStatusLabel(event:LifeEvent,date=event.date){
    if(event.status!=='upcoming')return event.status;
    if(date!==this.todayISO)return date<this.todayISO?'Completed':'Upcoming';
    const now=this.clock(),start=new Date(`${date}T${event.startTime}`).getTime(),end=event.endTime?new Date(`${date}T${event.endTime}`).getTime():start;
    if(now<start)return'Upcoming';
    if(now<=end)return'Ongoing';
    return'Completed';
  }
  reminderDateLabel(id:string){const task=this.reminderTask(id);if(!task)return'';const [year,month,day]=task.date.split('-').map(Number),date=new Intl.DateTimeFormat(this.locale,{month:'short',day:'numeric'}).format(new Date(year,month-1,day)),times=task.time&&task.dueTime?`${task.time}–${task.dueTime}`:task.dueTime||task.time;return `${date}${times?' · '+times:''}`}
  reminderTitle(reminder:LifeReminder){if(this.language()==='ar'&&reminder.kind==='end-of-day'){const amount=reminder.title.replace(' left in your day','');return `متبقي ${amount} من يومك`}return this.translate(reminder.title)}
  reminderMessage(reminder:LifeReminder){if(this.language()!=='ar')return this.translate(reminder.message);if(reminder.kind==='adhkar')return reminder.message;if(reminder.kind==='end-of-day'){const count=this.tasks().filter(task=>task.date===this.todayISO&&['open','in-progress'].includes(task.status)).length;return `${count} ${count===1?'نشاط لم يكتمل':'أنشطة لم تكتمل'} اليوم.`}if(reminder.taskId){const task=this.reminderTask(reminder.taskId);if(task){const scheduled=reminder.message.match(/is scheduled (.+)\.$/)?.[1]??'';return `موعد ${task.title} ${scheduled.includes('tomorrow')?'غدًا':'قريبًا'} ${scheduled.match(/at (.+)/)?.[1]?`الساعة ${scheduled.match(/at (.+)/)?.[1]}`:''}.`}}if(reminder.eventId){const event=this.events().find(item=>item.id===reminder.eventId);if(event){const duration=reminder.message.match(/starts in (.+)\.$/)?.[1]??'';return `يبدأ ${event.title} بعد ${duration}.`}}return this.translate(reminder.message)}
  reminderToastMessage(count:number){return this.language()==='ar'?`${count} ${count===1?'تذكير بانتظارك.':'تذكيرات بانتظارك.'}`:`${count} ${count===1?'reminder is':'reminders are'} waiting for you.`}
  async refresh(){
    const userId=this.backend.user()?.id;
    if(!userId){this.tasks.set([]);this.events.set([]);this.archivedNotifications.set([]);this.habits.set([]);this.goals.set([]);return}
    try{
      const [tasks,habits,goals,events]=await Promise.all([this.backend.getTasks(),this.backend.getHabits(),this.backend.getGoals(),this.backend.getEvents()]);
      if(this.backend.user()?.id!==userId)return;
      this.tasks.set(tasks);
      this.habits.set(habits);
      this.goals.set(goals);
      this.events.set(events);
      await this.processExpiredTasks();
      const archived=await this.backend.getArchivedNotifications();
      if(this.backend.user()?.id!==userId)return;
      this.archivedNotifications.set(archived);
      this.backendError.set('');
      this.animateDailyProgress(this.percent());
      this.clock.set(Date.now());
      this.notifyReminders();
    }catch(error){this.backendError.set(this.errorMessage(error))}
  }
  async processExpiredTasks(){
    const now=new Date(this.clock()),today=this.todayISO;
    const archivedIds=new Set(this.archivedNotifications().map(item=>item.id));
    for(const task of this.tasks()){
      if(!['open','in-progress'].includes(task.status))continue;
      const scheduledTime=task.dueTime||task.time;
      const taskStart=scheduledTime?new Date(`${task.date}T${scheduledTime}`):null;
      if(task.reminderMinutes&&taskStart&&taskStart.getTime()<=now.getTime()&&!archivedIds.has(task.id)){
        const notification:ArchivedNotification={id:task.id,entityType:'task',entityId:task.id,title:'Task reminder expired',message:`The reminder for “${task.title}” has expired.`,scheduledAt:taskStart.toISOString(),archivedAt:now.toISOString()};
        await this.backend.archiveNotification(notification);
        this.archivedNotifications.update(items=>[notification,...items]);
        archivedIds.add(task.id);
      }
      if(task.date<today){
        await this.backend.updateTask(task.id,'missed');
        this.tasks.update(items=>items.map(item=>item.id===task.id?{...item,status:'missed'}:item));
      }
    }
    for(const event of this.events()){
      if(event.status!=='upcoming'||!event.reminderMinutes)continue;
      for(const date of this.eventDatesAroundToday(event)){
        const startsAt=new Date(`${date}T${event.startTime}`);
        if(startsAt.getTime()>now.getTime())continue;
        if(this.archivedNotifications().some(item=>item.entityType==='event'&&item.entityId===event.id&&item.scheduledAt===startsAt.toISOString()))continue;
        const notification:ArchivedNotification={id:crypto.randomUUID(),entityType:'event',entityId:event.id,title:'Event reminder expired',message:`The reminder for “${event.title}” has expired.`,scheduledAt:startsAt.toISOString(),archivedAt:now.toISOString()};
        await this.backend.archiveNotification(notification);
        this.archivedNotifications.update(items=>[notification,...items]);
      }
    }
  }
  private startQuickDhikrReminders(){
    if(this.quickDhikrInterval)return;
    this.quickDhikrInterval=window.setInterval(()=>{
      if(document.visibilityState==='visible')this.showQuickDhikrReminder();
    },4*60*1000);
  }
  private stopQuickDhikrReminders(){
    window.clearInterval(this.quickDhikrInterval);
    this.quickDhikrInterval=0;
    this.closeQuickDhikrToast();
    this.previousShortDhikrIndex=-1;
  }
  showQuickDhikrReminder(){
    if(!this.backend.user())return;
    const choices=this.shortAdhkar.map((text,index)=>({text,index})).filter(item=>item.index!==this.previousShortDhikrIndex);
    const choice=choices[Math.floor(Math.random()*choices.length)];
    this.previousShortDhikrIndex=choice.index;
    this.quickDhikrToast.set(choice.text);
    void this.playNotificationSound();
    window.clearTimeout(this.quickDhikrToastTimeout);
    this.quickDhikrToastTimeout=window.setTimeout(()=>this.quickDhikrToast.set(''),7000);
  }
  closeQuickDhikrToast(){
    window.clearTimeout(this.quickDhikrToastTimeout);
    this.quickDhikrToastTimeout=0;
    this.quickDhikrToast.set('');
  }
  private notifyReminders(){const active=this.reminders(),activeIds=new Set(active.map(reminder=>reminder.id));for(const id of this.announcedReminders)if(!activeIds.has(id))this.announcedReminders.delete(id);const fresh=active.filter(reminder=>!this.announcedReminders.has(reminder.id));if(!fresh.length)return;for(const reminder of fresh)this.announcedReminders.add(reminder.id);this.reminderToast.set(true);void this.playNotificationSound();window.clearTimeout(this.reminderToastTimeout);this.reminderToastTimeout=window.setTimeout(()=>this.reminderToast.set(false),9000)}
  setNotificationSound(enabled:boolean){
    if(!enabled){
      this.notificationSound.set(false);
      localStorage.setItem('life-os-notification-sound','false');
      return;
    }
    if(typeof window.AudioContext!=='function'){
      this.say('Notification sound is not supported in this browser.');
      return;
    }
    this.notificationSound.set(true);
    localStorage.setItem('life-os-notification-sound','true');
    void this.playNotificationSound(true);
  }
  private async playNotificationSound(preview=false){
    if(!preview&&!this.notificationSound())return;
    if(typeof window.AudioContext!=='function'){
      this.disableNotificationSound('Notification sound is not supported in this browser.');
      return;
    }
    try{
      const context=this.notificationAudioContext??=new window.AudioContext();
      await context.resume();
      const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime;
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(740,start);
      oscillator.frequency.exponentialRampToValueAtTime(520,start+.16);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(.12,start+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start+.23);
    }catch{
      this.disableNotificationSound('Could not play notification sound. Check your browser audio settings.');
    }
  }
  private disableNotificationSound(message:string){
    this.notificationSound.set(false);
    localStorage.setItem('life-os-notification-sound','false');
    this.say(message);
  }
  private adhkarDismissalStorageKey(userId:string){return`life-os-dismissed-adhkar:${userId}`}
  openAdhkarReminder(reminder:LifeReminder){const userId=this.backend.user()?.id;if(reminder.adhkarPeriod&&userId)this.activeAdhkarReminder.set({id:reminder.id,period:reminder.adhkarPeriod,userId})}
  closeAdhkarReminder(){const active=this.activeAdhkarReminder();if(!active)return;if(this.backend.user()?.id===active.userId){const dismissed=new Set(this.dismissedAdhkarReminders());dismissed.add(active.id);const ids=[...dismissed];this.dismissedAdhkarReminders.set(ids);localStorage.setItem(this.adhkarDismissalStorageKey(active.userId),ids.join(','))}this.activeAdhkarReminder.set(null)}
  startStopwatch(){if(this.stopwatchRunning()){this.elapsedMilliseconds.update(value=>value+Date.now()-this.stopwatchStartedAt);this.stopwatchRunning.set(false);window.clearInterval(this.stopwatchInterval);this.stopwatchInterval=0;return}this.stopwatchStartedAt=Date.now();this.timerNow.set(this.stopwatchStartedAt);this.stopwatchRunning.set(true);this.stopwatchInterval=window.setInterval(()=>this.timerNow.set(Date.now()),25)}
  async toggleTimerFullscreen(event:MouseEvent){
    const shell=(event.currentTarget as HTMLElement).closest('.shell');
    if(this.timerFullscreen()){
      if(document.fullscreenElement===shell){try{await document.exitFullscreen()}catch{this.timerFullscreenError.set('Could not exit browser full screen. Press Esc to leave full screen.');return}}
      this.timerFullscreen.set(false);
      this.timerFullscreenError.set('');
      return;
    }
    this.timerFullscreen.set(true);
    this.timerFullscreenError.set('');
    if(shell&&typeof shell.requestFullscreen==='function'){
      try{await shell.requestFullscreen()}catch{this.timerFullscreenError.set('Browser full screen is unavailable; the timer is still expanded in this window.')}
    }
  }
  resetStopwatch(){this.stopwatchRunning.set(false);window.clearInterval(this.stopwatchInterval);this.stopwatchInterval=0;this.elapsedMilliseconds.set(0);this.timerNow.set(Date.now());this.stopwatchStartedAt=0}
  private errorMessage(error:unknown){
    const errorDetails=error&&typeof error==='object'?error as {code?:unknown;message?:unknown;msg?:unknown;details?:unknown;hint?:unknown}:null;
    const message=error instanceof Error?error.message:typeof errorDetails?.message==='string'?errorDetails.message:typeof errorDetails?.msg==='string'?errorDetails.msg:'';
    if(['task_definitions','task_occurrences','public.events','public.notifications'].some(table=>message.includes(table)))return 'Your Supabase database needs the task, event, and history update. Run supabase/migrations/20261115_tasks_events_history.sql in the Supabase SQL Editor, then refresh.';
    if(message.toLowerCase().includes('unsupported provider')&&message.toLowerCase().includes('provider is not enabled'))return 'Google sign-in is not enabled in Supabase. Open Authentication → Sign In / Providers → Google, enable the provider, and save your Google OAuth client ID and secret.';
    if(error instanceof Error)return error.message;
    if(error&&typeof error==='object'){
      if((errorDetails?.code==='PGRST204'||errorDetails?.code==='42703')&&message.includes('goal_id'))return 'Your Supabase database is missing the goal-link update. Run supabase/migrations/20261110_goal_steps.sql in the Supabase SQL Editor, then try saving again.';
      if((errorDetails?.code==='PGRST204'||errorDetails?.code==='42703')&&message.includes('goal_contribution'))return 'Your Supabase database is missing the goal contribution update. Run supabase/migrations/20261110_goal_step_contribution.sql in the Supabase SQL Editor, then try saving again.';
      if(message)return [message,typeof errorDetails?.details==='string'?errorDetails.details:'',typeof errorDetails?.hint==='string'?errorDetails.hint:''].filter(Boolean).join(' ');
    }
    return 'An unexpected error occurred.';
  }
  private async run(action:()=>Promise<void>){this.backendError.set('');try{await action()}catch(error){this.backendError.set(this.errorMessage(error))}}
  getPasswordStrength(password:string){
    if(!password)return {score:0,label:'Add a password'};
    const variety=[/[a-z]/.test(password),/[A-Z]/.test(password),/\d/.test(password),/[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
    const score=password.length<8||variety<2?1:password.length>=16&&variety>=3?4:password.length>=12&&variety>=3?3:2;
    return {score,label:['Add a password','Weak','Medium','Good','Strong'][score]};
  }
  switchAuthMode(){this.authMode.update(mode=>mode==='signin'?'signup':'signin');this.authError.set('');this.confirmPassword.set('');this.authPassword.set('');this.showPassword.set(false)}
  generatePassword(){
    const groups=['abcdefghijkmnopqrstuvwxyz','ABCDEFGHJKLMNPQRSTUVWXYZ','23456789','!@#$%&*+-_='];
    const chars=[...groups.map(group=>this.randomCharacter(group)),...Array.from({length:14},()=>this.randomCharacter(groups.join('')))];
    for(let i=chars.length-1;i>0;i--){const j=this.randomInt(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}
    const password=chars.join('');
    this.authPassword.set(password);
    this.confirmPassword.set(password);
    this.showPassword.set(true);
    this.authError.set('');
  }
  async copyGeneratedPassword(){try{await navigator.clipboard.writeText(this.authPassword());this.say('Generated password copied')}catch{this.authError.set('Could not copy the password. Check clipboard permissions and try again.')}}
  private randomCharacter(characters:string){return characters[this.randomInt(characters.length)]}
  private randomInt(max:number){
    const limit=Math.floor(0x100000000/max)*max;
    const value=new Uint32Array(1);
    do{crypto.getRandomValues(value)}while(value[0]>=limit);
    return value[0]%max;
  }
  async submitAuth(){const email=this.authEmail().trim(),password=this.authPassword();if(!email||!password){this.authError.set('Enter your email and password.');return}if(this.authMode()==='signup'){if(password.length<8){this.authError.set('Use at least 8 characters for your password.');return}if(password!==this.confirmPassword()){this.authError.set('Your passwords do not match.');return}}this.authBusy.set(true);this.authError.set('');try{if(this.authMode()==='signin'){await this.backend.signIn(email,password);await this.refresh()}else{const signedIn=await this.backend.signUp(email,password);if(signedIn)await this.refresh();else this.authError.set('Account created. Check your email to confirm it, then sign in.')}}catch(error){this.authError.set(this.errorMessage(error))}finally{this.authBusy.set(false)}}
  async signInWithGoogle(){this.authBusy.set(true);this.authError.set('');try{await this.backend.signInWithGoogle()}catch(error){this.authError.set(this.errorMessage(error));this.authBusy.set(false)}}
  async signOut(){await this.run(()=>this.backend.signOut())}
  private animateDailyProgress(target:number){if(typeof requestAnimationFrame==='undefined'){this.animatedPercent.set(target);return}if(this.progressFrame)cancelAnimationFrame(this.progressFrame);const start=this.animatedPercent(),startedAt=performance.now(),duration=720;const frame=(now:number)=>{const linear=Math.min(1,(now-startedAt)/duration),eased=1-Math.pow(1-linear,3);this.animatedPercent.set(Math.round(start+(target-start)*eased));if(linear<1)this.progressFrame=requestAnimationFrame(frame);else this.progressFrame=0};this.progressFrame=requestAnimationFrame(frame)}
  addNew(){this.modal.set('add-choice')}
  private prepareTask(goalId=''){
    this.title.set('');this.taskDescription.set('');this.date.set(this.page()==='calendar'?this.selectedDate():this.page()==='day'?this.dayDate():this.todayISO);this.time.set('');this.dueTime.set('');this.reminderMinutes.set(120);this.taskStatus.set('open');this.priority.set('medium');this.category.set('');this.goalId.set(goalId);this.goalContribution.set(goalId?10:0);this.editing.set('');
  }
  addTask(goalId=''){this.prepareTask(goalId);this.modal.set('task')}
  addEvent(){this.title.set('');this.desc.set('');this.date.set(this.page()==='calendar'?this.selectedDate():this.page()==='day'?this.dayDate():this.todayISO);this.time.set('');this.eventEndTime.set('');this.eventLocation.set('');this.eventReminderMinutes.set(0);this.eventRecurrence.set('none');this.eventRecurrenceUntil.set('');this.editingEvent.set('');this.modal.set('event')}
  addHabit(){this.title.set('');this.freq.set('');this.selectedWeekdays.set([]);this.editingHabit.set('');this.modal.set('habit')}
  editHabit(h:Habit){this.title.set(h.title);this.selectedWeekdays.set(habitWeekdays(h));this.editingHabit.set(h.id);this.modal.set('habit')}
  toggleWeekday(day:number){this.selectedWeekdays.update(days=>days.includes(day)?days.filter(d=>d!==day):[...days,day].sort((a,b)=>a-b))}
  setWeekdayPreset(preset:'everyday'|'weekdays'|'weekends'){this.selectedWeekdays.set(preset==='everyday'?[1,2,3,4,5,6,7]:preset==='weekdays'?[1,2,3,4,5]:[6,7])}
  scheduleLabel(h:Habit){return this.scheduleLabelForDays(habitWeekdays(h))}
  localizedScheduleLabel(h:Habit){const days=habitWeekdays(h);if(days.length===7)return this.translate('Every day');if(days.join(',')==='1,2,3,4,5')return this.translate('Weekdays');if(days.join(',')==='6,7')return this.translate('Weekends');const labels=days.map(day=>this.weekdayOptions.find(option=>option.day===day)?.label).filter((label):label is string=>Boolean(label)).map(label=>this.translate(label));return this.language()==='ar'?`أسبوعيًا · ${labels.join('، ')}`:`Weekly · ${labels.join(', ')}`}
  scheduleLabelForDays(days:number[]){if(days.length===7)return'Every day';if(days.join(',')==='1,2,3,4,5')return'Weekdays';if(days.join(',')==='6,7')return'Weekends';return'Weekly · '+days.map(d=>this.weekdayOptions.find(x=>x.day===d)?.label).filter(Boolean).join(', ')}
  isScheduledToday(h:Habit){return isHabitScheduled(h,this.todayISO)}
  isHabitDone(h:Habit){return h.completionDates?.includes(this.todayISO)??h.done}
  streak(h:Habit){return habitStreak(h,this.todayISO)}
  addGoal(){this.title.set('');this.desc.set('');this.goalDate.set('');this.editingGoal.set('');this.modal.set('goal')}
  editGoal(goal:Goal){this.title.set(goal.title);this.desc.set(goal.description);this.goalDate.set(goal.targetDate);this.editingGoal.set(goal.id);this.modal.set('goal')}
  goalTasks(goal:Goal){return this.tasks().filter(task=>task.goalId===goal.id).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||''))}
  goalProgress(goal:Goal){const contributions=this.goalTasks(goal).filter(task=>task.status==='done').reduce((sum,task)=>sum+(task.goalContribution??0),0);return Math.min(100,Math.max(0,goal.progress+contributions))}
  goalStepSummary(goal:Goal){const steps=this.goalTasks(goal),done=steps.filter(task=>task.status==='done'),contribution=done.reduce((sum,task)=>sum+(task.goalContribution??0),0);return this.language()==='ar'?`اكتمل ${done.length} من ${steps.length} خطوات · +${contribution}%`:`${done.length} of ${steps.length} steps complete · +${contribution}%`}
  loadWeeklyFocus(){const userId=this.backend.user()?.id;if(!userId){this.weeklyFocus.set('');return}this.weeklyFocus.set(localStorage.getItem(`life-os-weekly-focus:${userId}:${this.reviewWeekStart()}`)||'')}
  setWeeklyFocus(value:string){this.weeklyFocus.set(value);const userId=this.backend.user()?.id;if(userId)localStorage.setItem(`life-os-weekly-focus:${userId}:${this.reviewWeekStart()}`,value)}
  goalDueLabel(goal:Goal){const arabic=this.language()==='ar';if(this.goalProgress(goal)>=100)return this.translate('Completed');if(!goal.targetDate)return this.translate('No target date');const target=new Date(goal.targetDate+'T12:00:00');if(Number.isNaN(target.getTime()))return this.translate('No target date');const today=new Date(this.todayISO+'T12:00:00');const days=Math.round((target.getTime()-today.getTime())/86400000);if(days<0)return arabic?`متأخر ${Math.abs(days)} ${Math.abs(days)===1?'يوم':'أيام'}`:`Overdue by ${Math.abs(days)} ${Math.abs(days)===1?'day':'days'}`;if(days===0)return this.translate('Due today');return arabic?`متبقي ${days} ${days===1?'يوم':'أيام'}`:days===1?'1 day left':`${days} days left`}
  goalIsOverdue(goal:Goal){return this.goalProgress(goal)<100&&Boolean(goal.targetDate)&&goal.targetDate<this.todayISO}
  translateStatus(status:string){const labels:Record<string,string>={open:'Pending','in-progress':'In progress',done:'Completed',missed:'MISSED',skipped:'Skipped',low:'Low',medium:'Medium',high:'High',upcoming:'Upcoming',ongoing:'Ongoing',completed:'Completed',cancelled:'Cancelled',daily:'Daily',weekly:'Weekly',monthly:'Monthly',none:'Does not repeat'};return this.translate(labels[status]??status)}
  formatGoalDate(date:string){if(!date)return'';const parsed=new Date(date+'T12:00:00');return Number.isNaN(parsed.getTime())?'':new Intl.DateTimeFormat(this.locale,{month:'short',day:'numeric',year:'numeric'}).format(parsed)}
  edit(t:LifeTask){this.editing.set(t.id);this.title.set(t.title);this.taskDescription.set(t.description||'');this.date.set(t.date);this.time.set(t.time);this.dueTime.set(t.dueTime||'');this.reminderMinutes.set(t.reminderMinutes??120);this.taskStatus.set(t.status);this.priority.set(t.priority);this.category.set(t.category);this.goalId.set(t.goalId||'');this.goalContribution.set(t.goalId?t.goalContribution??10:0);this.modal.set('task')}
  async saveTask(){if(!this.title().trim())return;await this.run(async()=>{const old=this.tasks().find(t=>t.id===this.editing());const status=this.taskStatus();await this.backend.saveTask({id:this.editing()||crypto.randomUUID(),taskId:old?.taskId,title:this.title().trim(),description:this.taskDescription().trim(),date:this.date(),time:this.time(),dueTime:this.dueTime(),reminderMinutes:this.reminderMinutes(),priority:this.priority() as LifeTask['priority'],category:this.category()||'Personal',status,completedAt:status==='done'?(old?.completedAt??Date.now()):undefined,createdAt:old?.createdAt||Date.now(),goalId:this.goalId()||undefined,goalContribution:this.goalId()?this.goalContribution():undefined,rescheduledFromId:old?.rescheduledFromId});await this.refresh();this.modal.set('');this.say('Task saved')})}
  editEvent(event:LifeEvent){this.editingEvent.set(event.id);this.title.set(event.title);this.desc.set(event.description);this.date.set(event.date);this.time.set(event.startTime);this.eventEndTime.set(event.endTime);this.eventLocation.set(event.location);this.eventReminderMinutes.set(event.reminderMinutes);this.eventRecurrence.set(event.recurrence);this.eventRecurrenceUntil.set(event.recurrenceUntil);this.modal.set('event')}
  async saveEvent(){if(!this.title().trim()||!this.time())return;await this.run(async()=>{const old=this.events().find(event=>event.id===this.editingEvent());await this.backend.saveEvent({id:this.editingEvent()||crypto.randomUUID(),title:this.title().trim(),description:this.desc().trim(),date:this.date(),startTime:this.time(),endTime:this.eventEndTime(),location:this.eventLocation().trim(),reminderMinutes:this.eventReminderMinutes(),recurrence:this.eventRecurrence(),recurrenceUntil:this.eventRecurrenceUntil(),status:old?.status||'upcoming',createdAt:old?.createdAt||Date.now()});await this.refresh();this.modal.set('');this.say('Event saved')})}
  async updateEventStatus(event:LifeEvent,status:EventStatus){await this.run(async()=>{await this.backend.saveEvent({...event,status});await this.refresh()})}
  completeReminderEvent(id:string){const event=this.events().find(item=>item.id===id);if(event)void this.updateEventStatus(event,'completed')}
  async removeEvent(event:LifeEvent){await this.run(async()=>{await this.backend.deleteEvent(event.id);await this.refresh();this.say('Event removed')})}
  async completeHistoryTask(task:LifeTask){await this.run(async()=>{await this.backend.updateTask(task.id,'done',Date.now());await this.refresh()})}
  skipHistoryTask(task:LifeTask){void this.run(async()=>{await this.backend.updateTask(task.id,'skipped');await this.refresh()})}
  startReschedule(task:LifeTask){const tomorrow=new Date(this.todayISO+'T12:00:00');tomorrow.setDate(tomorrow.getDate()+1);this.reschedulingTask.set(task.id);this.rescheduleDate.set(this.key(tomorrow));this.modal.set('reschedule')}
  async rescheduleMissedTask(){const original=this.tasks().find(task=>task.id===this.reschedulingTask());if(!original||!this.rescheduleDate())return;await this.run(async()=>{await this.backend.saveTask({...original,id:crypto.randomUUID(),taskId:original.taskId,date:this.rescheduleDate(),status:'open',completedAt:undefined,createdAt:Date.now(),rescheduledFromId:original.id});this.modal.set('');await this.refresh();this.say('Rescheduled as a new task; original stays in history')})}
  async deleteActiveNotification(reminder:LifeReminder){
    const task=reminder.taskId?this.tasks().find(item=>item.id===reminder.taskId):undefined;
    const event=reminder.eventId?this.events().find(item=>item.id===reminder.eventId):undefined;
    const entityId=task?.id??event?.id;
    if(!entityId)return;
    const date=task?.date??(event?reminder.id.slice(`event-${event.id}-`.length):this.todayISO);
    const time=task?(task.dueTime||task.time||'00:00'):(event?.startTime??'00:00');
    const now=new Date().toISOString();
    const notification:ArchivedNotification={id:task?.id??crypto.randomUUID(),entityType:task?'task':'event',entityId,title:reminder.title,message:reminder.message,scheduledAt:reminder.scheduledAt??new Date(`${date}T${time}`).toISOString(),archivedAt:now,deletedAt:now};
    await this.run(async()=>{await this.backend.archiveNotification(notification);this.archivedNotifications.update(items=>[notification,...items.filter(item=>item.id!==notification.id)]);this.say('Notification deleted without removing its task or event')});
  }
  async deleteArchivedNotification(notification:ArchivedNotification){await this.run(async()=>{await this.backend.deleteArchivedNotification(notification.id);this.archivedNotifications.update(items=>items.map(item=>item.id===notification.id?{...item,deletedAt:new Date().toISOString()}:item));this.say('Notification deleted')})}
  reminderTask(id:string){return this.tasks().find(task=>task.id===id)}
  completeReminder(id:string){const task=this.reminderTask(id);if(task)void this.toggle(task)}
  async toggle(t:LifeTask){if(!this.canToggleTask(t))return;await this.run(async()=>{const nextStatus:TaskStatus=t.status==='done'?'open':'done';await this.backend.updateTask(t.id,nextStatus,nextStatus==='done'?Date.now():undefined);await this.refresh()})}
  async removeTask(t:LifeTask){await this.run(async()=>{await this.backend.deleteTask(t.id);await this.refresh()})}
  async saveHabit(){const title=this.title().trim(),weekdays=this.selectedWeekdays();if(!title||!weekdays.length)return;await this.run(async()=>{const editing=this.editingHabit(),old=this.habits().find(h=>h.id===editing);const row:Habit={id:editing||crypto.randomUUID(),title,frequency:this.scheduleLabelForDays(weekdays),weekdays,completionDates:old?.completionDates??(old?.done?[this.todayISO]:[]),icon:old?.icon||'star',streak:old?.streak||0,done:old?.completionDates?.includes(this.todayISO)??old?.done??false};await this.backend.saveHabit(row);await this.refresh();this.modal.set('');this.editingHabit.set('');this.say(editing?'Routine updated':'Routine created')})}
  async toggleHabit(h:Habit){if(!this.isScheduledToday(h))return;await this.run(async()=>{const dates=new Set(h.completionDates??(h.done?[this.todayISO]:[]));if(dates.has(this.todayISO))dates.delete(this.todayISO);else dates.add(this.todayISO);const completionDates=[...dates].sort();const done=dates.has(this.todayISO);const updated={...h,completionDates,done};await this.backend.updateHabit({...updated,streak:habitStreak(updated,this.todayISO),lastDone:done?this.todayISO:h.lastDone});await this.refresh()})}
  async removeHabit(h:Habit){await this.run(async()=>{await this.backend.deleteHabit(h.id);await this.refresh();this.say('Routine removed')})}
  async saveGoal(){const title=this.title().trim();if(!title)return;await this.run(async()=>{const id=this.editingGoal(),old=this.goals().find(goal=>goal.id===id);const goal:Goal={id:id||crypto.randomUUID(),title,description:this.desc().trim(),targetDate:this.goalDate(),progress:old?.progress??0,createdAt:old?.createdAt??Date.now()};if(id)await this.backend.updateGoal(goal);else await this.backend.saveGoal(goal);await this.refresh();this.modal.set('');this.editingGoal.set('');this.say(id?'Goal updated':'Goal created')})}
  async bumpGoal(g:Goal,n:number){const target=Math.max(0,Math.min(100,this.goalProgress(g)+n)),completedContribution=this.goalTasks(g).filter(task=>task.status==='done').reduce((sum,task)=>sum+(task.goalContribution??0),0);await this.run(async()=>{await this.backend.updateGoal({...g,progress:Math.max(0,Math.min(100,target-completedContribution))});await this.refresh()})}
  async removeGoal(g:Goal){await this.run(async()=>{await this.backend.deleteGoal(g.id);await this.refresh();this.say('Goal removed')})}
  theme(){this.dark.update(x=>!x);document.documentElement.classList.toggle('dark-theme',this.dark());localStorage.setItem('life-os-theme',this.dark()?'dark':'light')}
  say(s:string){this.toast.set(s);setTimeout(()=>this.toast.set(''),2200)}
  async export(){const data={format:'life-os-backup',version:2,tasks:this.tasks(),events:this.events(),archivedNotifications:this.archivedNotifications(),habits:this.habits(),goals:this.goals()};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='life-os-backup-'+this.todayISO+'.json';a.click();URL.revokeObjectURL(a.href)}
  async import(e:Event){const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;await this.run(async()=>{const d=JSON.parse(await f.text());if(d.format!=='life-os-backup'||!Array.isArray(d.tasks)||!Array.isArray(d.habits)||!Array.isArray(d.goals)||('events'in d&&!Array.isArray(d.events))||('archivedNotifications'in d&&!Array.isArray(d.archivedNotifications)))throw new Error('This is not a valid Life OS backup.');await this.backend.restore(d.tasks,d.habits,d.goals,d.events??[],d.archivedNotifications??[]);await this.refresh();this.say('Backup restored')})}
}
