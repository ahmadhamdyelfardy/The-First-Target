/* =========================================================
   THE FIRST TARGET — منطق التطبيق
   الأقسام: التخزين والحالة، الدخول، الإعداد، التنقل،
   الخطة والمهام، المواد، التقدم والحساب، المذاكرة والمؤقت.
   ========================================================= */

const STORAGE_KEY = 'the_first_target_v2';
const ACCOUNTS_STORAGE_KEY = 'the_first_target_accounts_v1';
const TIMER_STORAGE_KEY = 'the_first_target_active_timer';
const TIMER_POSITION_KEY = 'the_first_target_timer_position';
const todayKey = () => new Date().toISOString().slice(0,10);
const uid = (p='id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);

let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {
  user:null, subjects:[], tasks:[], studyMinutes:0, setup:{name:'',age:'',stage:'',grade:'',hours:3,start:'18:00',subjects:[]}, lastPlanDate:'', streak:0, studySecondsTotal:0, studySecondsByDay:{}
};
state.studySecondsTotal = Number(state.studySecondsTotal || 0);
state.studySecondsByDay = state.studySecondsByDay || {};
function normalizeEmail(email){return String(email||'').trim().toLowerCase()}
function readAccounts(){try{return JSON.parse(localStorage.getItem(ACCOUNTS_STORAGE_KEY)||'{}')||{}}catch{return {}}}
let authMode='login', setupStep=1;
let studyCurriculum='', studyYear='', studyMonitorTimer=null, studyMonitorSeconds=0, studyMonitorStartedAt=0;
function currentDayKey(){return new Date().toLocaleDateString('en-CA')}
function persistTimer(){if(!timer.active){localStorage.removeItem(TIMER_STORAGE_KEY);return}const {seconds,initialSeconds,endsAt,running,active,taskId,subjectId,subjectName,title,questionsCompleted,recordedSeconds}=timer;localStorage.setItem(TIMER_STORAGE_KEY,JSON.stringify({seconds,initialSeconds,endsAt,running,active,taskId,subjectId,subjectName,title,questionsCompleted,recordedSeconds}))}
function todayStudySeconds(){return Number(state.studySecondsByDay[currentDayKey()]||0)}
function formatStudyTime(seconds){const m=Math.floor(seconds/60),s=seconds%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function totalStudySeconds(){return Number(state.studySecondsTotal||0)||Number(state.studyMinutes||0)*60}
function formatStudyDuration(seconds){const total=Math.max(0,Math.floor(seconds)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),remainder=total%60;if(hours)return `${hours} س ${minutes} د`;if(minutes)return remainder?`${minutes} د ${String(remainder).padStart(2,'0')} ث`:`${minutes} د`;return `${remainder} ث`}
function recordStudySecond(seconds){const day=currentDayKey();state.studySecondsTotal=(state.studySecondsTotal||0)+seconds;state.studySecondsByDay[day]=(state.studySecondsByDay[day]||0)+seconds;studyMonitorSeconds+=seconds;const el=document.getElementById('studyMonitorTime');if(el)el.textContent=formatStudyTime(studyMonitorSeconds);save();const todayEl=document.getElementById('statTodayStudy');if(todayEl)todayEl.textContent=formatStudyDuration(todayStudySeconds());const totalEl=document.getElementById('statStudyTime');if(totalEl)totalEl.textContent=formatStudyDuration(totalStudySeconds());const progressEl=document.getElementById('progressMinutes');if(progressEl)progressEl.textContent=formatStudyDuration(totalStudySeconds())}
function syncStudyMonitor(){if(!studyMonitorStartedAt)return;const elapsed=Math.floor((Date.now()-studyMonitorStartedAt)/1000),difference=elapsed-studyMonitorSeconds;if(difference>0)recordStudySecond(difference)}
function startStudyMonitor(){stopStudyMonitor(true);studyMonitorSeconds=0;studyMonitorStartedAt=Date.now();const box=document.getElementById('studyMonitor');if(box)box.classList.remove('hidden');const el=document.getElementById('studyMonitorTime');if(el)el.textContent='00:00';studyMonitorTimer=setInterval(syncStudyMonitor,1000)}
function stopStudyMonitor(saveSession=false){const wasRunning=studyMonitorStartedAt>0;if(wasRunning)syncStudyMonitor();if(studyMonitorTimer){clearInterval(studyMonitorTimer);studyMonitorTimer=null}studyMonitorStartedAt=0;if(saveSession&&wasRunning&&studyMonitorSeconds>0){state.studyMinutes=(state.studyMinutes||0)+Math.floor(studyMonitorSeconds/60);save()}}

let studySubjectId=null, studyTerm='', studyStage='', studyGrade='', studyUnit='', studyLesson='', studyReviewType='', studyReviewMonth='', studyReviewTerm='';
let timer={id:null,seconds:1500,initialSeconds:1500,endsAt:0,running:false,active:false,taskId:null,subjectId:null,subjectName:'',title:'',questionsCompleted:false,recordedSeconds:0};
let timerDrag=null,timerDockWasDragged=false;
const savedTimer=JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY)||'null');
if(savedTimer?.active){timer={...timer,...savedTimer,id:null,recordedSeconds:Number(savedTimer.recordedSeconds||0)};if(timer.running){timer.seconds=Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000));if(timer.seconds===0){timer.running=false;timer.endsAt=0}}}

const studyGrades={
 'ابتدائي':['الصف الأول الابتدائي','الصف الثاني الابتدائي','الصف الثالث الابتدائي','الصف الرابع الابتدائي','الصف الخامس الابتدائي','الصف السادس الابتدائي'],
 'إعدادي':['الصف الأول الإعدادي','الصف الثاني الإعدادي','الصف الثالث الإعدادي'],
 'ثانوي':['الصف الأول الثانوي','الصف الثاني الثانوي','الصف الثالث الثانوي']
};

function save(){state.subjects.forEach(subject=>{delete subject.priority;delete subject.difficulty});localStorage.setItem(STORAGE_KEY,JSON.stringify(state));const email=normalizeEmail(state.user?.email);if(email){const accounts=readAccounts();accounts[email]=state;localStorage.setItem(ACCOUNTS_STORAGE_KEY,JSON.stringify(accounts));}}
function createAccountState(user){return {user,subjects:[],tasks:[],studyMinutes:0,setup:{name:user.name||'',age:'',stage:'',grade:'',hours:3,start:'18:00',subjects:[]},lastPlanDate:'',streak:0,studySecondsTotal:0,studySecondsByDay:{}}}
function escapeHTML(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
function showOnly(id){['landingScreen','authScreen','setupScreen','appScreen'].forEach(x=>document.getElementById(x).classList.toggle('hidden',x!==id));}
function showLanding(){showOnly('landingScreen')}
function showAuth(mode='login'){authMode=mode;showOnly('authScreen');renderAuth();}
function renderAuth(){
 document.getElementById('authTitle').textContent=authMode==='login'?'تسجيل الدخول':'إنشاء حساب';
 document.getElementById('authSubtitle').textContent=authMode==='login'?'اختر طريقة الدخول المناسبة لك.':'أنشئ حسابك وابدأ تنظيم مذاكرتك.';
 document.getElementById('nameField').classList.toggle('hidden',authMode==='login');
 document.getElementById('authSubmit').textContent=authMode==='login'?'تسجيل الدخول':'إنشاء حساب';
 document.getElementById('switchText').textContent=authMode==='login'?'ليس لديك حساب؟':'لديك حساب بالفعل؟';
 document.querySelector('.switch-auth button').textContent=authMode==='login'?'إنشاء حساب':'تسجيل الدخول';
}
function toggleAuthMode(){authMode=authMode==='login'?'register':'login';renderAuth()}
function googleLogin(){toast('تسجيل الدخول باستخدام Google غير متاح حاليًا، استخدم البريد وكلمة المرور')}

document.getElementById('authForm').addEventListener('submit',e=>{e.preventDefault();const email=normalizeEmail(document.getElementById('authEmail').value),password=document.getElementById('authPassword').value,name=document.getElementById('authName').value.trim();if(!email||!password)return toast('أكمل بيانات الدخول أولًا');const accounts=readAccounts();if(authMode==='register'){if(accounts[email]||normalizeEmail(state.user?.email)===email)return toast('هذا البريد مسجل بالفعل، سجّل الدخول');state=createAccountState({name:name||email.split('@')[0],email,password});save();startAfterAuth();return}const account=accounts[email];if(account){if(account.user?.password!==password)return toast('كلمة المرور غير صحيحة');state=account}else if(normalizeEmail(state.user?.email)===email){if(state.user?.password!==password)return toast('كلمة المرور غير صحيحة')}else return toast('لا يوجد حساب بهذا البريد، أنشئ حسابًا أولًا');state.user.email=email;state.studySecondsTotal=Number(state.studySecondsTotal||0);state.studySecondsByDay=state.studySecondsByDay||{};save();startAfterAuth();});
function startAfterAuth(){if(state.setup?.name&&state.setup?.grade&&state.subjects?.length)openApp();else startSetup()}
function startSetup(){showOnly('setupScreen');setupStep=1;renderSetup()}
function renderSetup(){
 const labels=['الاسم','العمر','المرحلة الدراسية','المواد'];
 document.getElementById('setupStepLabel').textContent=`الخطوة ${setupStep} من 4`;
 document.getElementById('setupProgressBar').style.width=(setupStep*25)+'%';
 const s=state.setup;
 const content=document.getElementById('setupContent');
 if(setupStep===1){document.getElementById('setupTitle').textContent='أولًا، ما اسمك؟';document.getElementById('setupDescription').textContent='سنستخدم هذه البيانات لبناء خطة مناسبة لك.';content.innerHTML=`<div class="field"><label>الاسم الكامل</label><input id="setupName" value="${escapeHTML(s.name)}" placeholder="اكتب اسمك"></div>`}
 if(setupStep===2){document.getElementById('setupTitle').textContent='كم عمرك؟';document.getElementById('setupDescription').textContent='معلومة تساعدك على إعداد حسابك.';content.innerHTML=`<div class="field"><label>العمر</label><input id="setupAge" type="number" min="5" max="30" value="${escapeHTML(s.age)}" placeholder="مثال: 15"></div>`}
 if(setupStep===3){document.getElementById('setupTitle').textContent='ما مرحلتك الدراسية؟';document.getElementById('setupDescription').textContent='اختر المرحلة ثم الصف الدراسي.';content.innerHTML=`<div class="choice-grid">${['ابتدائي','إعدادي','ثانوي'].map(x=>`<button class="choice ${s.stage===x?'selected':''}" onclick="selectSetupStage('${x}')">${x}</button>`).join('')}</div>${s.stage?`<div class="field"><label>الصف الدراسي</label><select id="setupGrade" class="study-input"><option value="">اختر الصف</option>${studyGrades[s.stage].map(g=>`<option ${s.grade===g?'selected':''}>${g}</option>`).join('')}</select></div>`:''}`}
 if(setupStep===4){document.getElementById('setupTitle').textContent='ما المواد التي تدرسها؟';document.getElementById('setupDescription').textContent='يمكنك إضافة موادك الآن أو تعديلها لاحقًا.';const common=['اللغة العربية','اللغة الإنجليزية','الرياضيات','العلوم','الدراسات الاجتماعية','اللغة الفرنسية','اللغة الألمانية'];content.innerHTML=`<div class="field"><label>إضافة مادة</label><div class="add-subject-row"><input id="setupSubjectInput" placeholder="مثال: الرياضيات" onkeydown="if(event.key==='Enter'){event.preventDefault();setupAddSubject()}"><button type="button" class="btn btn-primary" onclick="setupAddSubject()">+ إضافة</button></div></div><div class="choice-grid">${common.map(x=>`<button class="choice" onclick="setupAddSubjectByName('${x}')">+ ${x}</button>`).join('')}</div><div class="study-summary">${s.subjects.map(x=>`<span class="study-chip">${escapeHTML(x)}</span>`).join('')}</div>`}
 document.getElementById('setupBackBtn').style.visibility=setupStep===1?'hidden':'visible';
}
function selectSetupStage(stage){state.setup.stage=stage;state.setup.grade='';renderSetup()}
function setupAddSubject(){setupAddSubjectByName(document.getElementById('setupSubjectInput').value.trim());}
function setupAddSubjectByName(name){if(!name)return;if(!state.setup.subjects.includes(name))state.setup.subjects.push(name);renderSetup()}
function setupBack(){if(setupStep>1){setupStep--;renderSetup()}}
function setupNext(){
 if(setupStep===1){const v=document.getElementById('setupName').value.trim();if(!v)return toast('اكتب اسمك أولًا');state.setup.name=v}
 if(setupStep===2){const v=document.getElementById('setupAge').value;if(!v)return toast('اكتب عمرك أولًا');state.setup.age=v}
 if(setupStep===3){const g=document.getElementById('setupGrade')?.value||'';if(!state.setup.stage||!g)return toast('اختر المرحلة والصف أولًا');state.setup.grade=g}
 if(setupStep===4){if(!state.setup.subjects.length)return toast('أضف مادة واحدة على الأقل');finishSetup();return}
 save();setupStep++;renderSetup();
}
function finishSetup(){state.user.name=state.setup.name;state.user.age=state.setup.age;state.user.stage=state.setup.stage;state.user.grade=state.setup.grade;state.user.hours=state.setup.hours;state.user.start=state.setup.start;state.subjects=state.setup.subjects.map(name=>({id:uid('sub'),name}));save();generatePlan();openApp()}
function openApp(){showOnly('appScreen');renderAll();navigate('home')}
function navigate(view){if(timer.running)tickStudyTimer();document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));document.getElementById('view-'+view).classList.remove('hidden');document.querySelectorAll('.sidebar nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='home')renderHome();if(view==='schedule')renderSchedule();if(view==='subjects')renderSubjects();if(view==='progress')renderProgress();if(view==='profile')renderProfile()}
function toggleSidebar(){const layout=document.querySelector('.app-layout'),button=document.getElementById('sidebarToggle'),collapsed=layout.classList.toggle('sidebar-collapsed');button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',collapsed?'إظهار القائمة':'إخفاء القائمة');button.title=collapsed?'إظهار القائمة':'إخفاء القائمة'}
function renderAll(){document.getElementById('headerStudentName').textContent=state.user?.name||'خطتك الدراسية';renderHome();renderSubjects();renderSchedule();renderProgress();renderProfile()}
function generatePlan(notify=true){
 if(!state.subjects.length)return toast('أضف مواد أولًا');
 const hours=Number(state.user?.hours||state.setup.hours||3), available=Math.max(60,Math.round(hours*60)), baseDuration=Math.max(1,Math.floor(available/state.subjects.length)), extraMinutes=Math.max(0,available-baseDuration*state.subjects.length);
 const today=todayKey(), year=Number(today.slice(0,4)), lastDate=`${year}-12-31`;
 state.tasks=state.tasks.filter(task=>task.date<today||task.completed);
 const dateCursor=new Date(`${today}T12:00:00Z`), lastDateValue=new Date(`${lastDate}T12:00:00Z`);
 while(dateCursor<=lastDateValue){
  const date=dateCursor.toISOString().slice(0,10), completedSubjects=new Set(state.tasks.filter(task=>task.date===date&&task.completed).map(task=>task.subjectId));
  for(let subjectIndex=0;subjectIndex<state.subjects.length;subjectIndex++){
   const subject=state.subjects[subjectIndex];
   if(completedSubjects.has(subject.id))continue;
   const duration=baseDuration+(subjectIndex<extraMinutes?1:0);
   state.tasks.push({id:uid('task'),date,subjectId:subject.id,subject:subject.name,title:`مذاكرة — ${subject.name}`,duration,completed:false});
  }
  dateCursor.setUTCDate(dateCursor.getUTCDate()+1);
 }
 state.lastPlanDate=today;state.studyScheduleVersion=4;save();renderAll();if(notify)toast('تم بناء الخطة حتى نهاية العام');
}
function renderHome(){
 if(!state.user)return;document.getElementById('welcomeTitle').textContent=`مرحبًا ${state.user.name||''} 👋`;document.getElementById('todayDate').textContent=new Intl.DateTimeFormat('ar-EG',{dateStyle:'full'}).format(new Date());
 const tasks=state.tasks.filter(t=>t.date===todayKey()),done=tasks.filter(t=>t.completed).length,percent=tasks.length?Math.round(done/tasks.length*100):0;
 document.getElementById('statTasks').textContent=tasks.length;document.getElementById('statCompleted').textContent=done;document.getElementById('statStudyTime').textContent=formatStudyDuration(totalStudySeconds());document.getElementById('statStreak').textContent=`${state.streak||0} 🔥`;const todayStudy=document.getElementById('statTodayStudy');if(todayStudy)todayStudy.textContent=formatStudyDuration(todayStudySeconds());document.getElementById('todayProgressText').textContent=percent+'%';document.getElementById('homeProgressBar').style.width=percent+'%';
 const first=tasks.find(t=>!t.completed)||tasks[0];document.getElementById('firstTargetBox').innerHTML=first?`<b>${escapeHTML(first.subject)}</b><br>${escapeHTML(first.title)}<br><span class="muted">${first.duration} دقيقة</span>`:'لم يتم تحديد الهدف بعد.';
 document.getElementById('todayTasks').innerHTML=tasks.length?tasks.map(taskHTML).join(''):'<div class="empty">لا توجد خطة لليوم. اضغط «إعادة بناء الخطة».</div>';
}
function taskHTML(t){const isToday=t.date===todayKey(),scheduledDate=new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(`${t.date}T12:00:00Z`));return `<div class="task ${t.completed?'done':''}"><div class="task-main"><strong>${escapeHTML(t.subject)}</strong><span class="muted">${escapeHTML(t.title)} • ${t.duration} دقيقة</span></div><div class="task-actions"><button class="small-btn primary" onclick="openTimer('${t.id}')" ${isToday?'':'disabled'} title="${isToday?'مذاكرة اليوم':`متاح يوم ${scheduledDate}`}">⏱ مذاكرة</button><button class="small-btn" onclick="toggleTask('${t.id}')">${t.completed?'↩ إلغاء':'✓ تم'}</button></div></div>`}
function toggleTask(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;t.completed=!t.completed;save();renderAll()}
function renderSchedule(){
 const el=document.getElementById('scheduleList'),groups=new Map(),today=todayKey(),lastDate=`${today.slice(0,4)}-12-31`;
 const tasks=state.tasks.filter(task=>task.date>=today&&task.date<=lastDate).sort((a,b)=>a.date.localeCompare(b.date));
 tasks.forEach(task=>{if(!groups.has(task.date))groups.set(task.date,[]);groups.get(task.date).push(task)});
 const dateCursor=new Date(`${today}T12:00:00Z`),lastDateValue=new Date(`${lastDate}T12:00:00Z`),days=[];
 while(dateCursor<=lastDateValue){
  const date=dateCursor.toISOString().slice(0,10),dayTasks=groups.get(date)||[];
  const label=new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
  days.push(`<section class="schedule-day"><div class="panel-head"><h3>${label}</h3><span>${dayTasks.length} مواد</span></div>${dayTasks.length?dayTasks.map(taskHTML).join(''):'<div class="empty">لا توجد جلسات لهذا اليوم.</div>'}</section>`);
  dateCursor.setUTCDate(dateCursor.getUTCDate()+1);
 }
 el.innerHTML=days.join('');
}
function renderSubjects(){
 const el=document.getElementById('subjectsList');
 if(!state.subjects.length){el.innerHTML='<div class="empty">لم تضف مواد بعد.</div>';return}
 el.innerHTML=state.subjects.map(subject=>{
  const tasks=state.tasks.filter(task=>task.subjectId===subject.id),done=tasks.filter(task=>task.completed).length;
  const todayTask=tasks.find(task=>task.date===todayKey()&&!task.completed);
  return `<div class="subject-row"><div class="subject-left"><strong>📚 ${escapeHTML(subject.name)}</strong><span class="muted">${done}/${tasks.length} مهام مكتملة</span></div><div class="subject-actions"><button class="small-btn primary" onclick="openStudyModal('${subject.id}')" ${todayTask?'':'disabled'} title="${todayTask?'مذاكرة اليوم':'لا توجد جلسة لهذه المادة اليوم'}">📖 ذاكر</button><button class="small-btn" onclick="editSubject('${subject.id}')">✎ تعديل</button><button class="small-btn" onclick="deleteSubject('${subject.id}')">حذف</button></div></div>`;
 }).join('');
}
function addSubjectPrompt(){const name=prompt('اكتب اسم المادة');if(!name?.trim())return;if(state.subjects.some(subject=>subject.name.trim()===name.trim()))return toast('المادة موجودة بالفعل');state.subjects.push({id:uid('sub'),name:name.trim()});save();generatePlan()}
function editSubject(id){const s=state.subjects.find(x=>x.id===id);if(!s)return;const name=prompt('اسم المادة',s.name);if(name?.trim())s.name=name.trim();state.tasks.forEach(t=>{if(t.subjectId===id)t.subject=s.name});save();renderAll()}
function deleteSubject(id){const s=state.subjects.find(x=>x.id===id);if(!s)return;if(!confirm(`حذف مادة ${s.name}؟ سيتم حذف مهامها من الجدول أيضًا.`))return;state.subjects=state.subjects.filter(x=>x.id!==id);state.tasks=state.tasks.filter(x=>x.subjectId!==id&&x.subject!==s.name);state.setup={...(state.setup||{}),subjects:state.subjects.map(subject=>subject.name)};save();renderAll()}
function renderProgress(){const total=state.tasks.length,done=state.tasks.filter(t=>t.completed).length;document.getElementById('progressTotal').textContent=total;document.getElementById('progressDone').textContent=done;document.getElementById('progressMinutes').textContent=formatStudyDuration(totalStudySeconds());document.getElementById('subjectProgressList').innerHTML=state.subjects.length?state.subjects.map(s=>{const all=state.tasks.filter(t=>t.subjectId===s.id),d=all.filter(t=>t.completed).length,p=all.length?Math.round(d/all.length*100):0;return `<div class="progress-row"><div><b>${escapeHTML(s.name)}</b><div class="muted">${d} من ${all.length} مهام</div></div><div style="width:45%"><div class="progress"><span style="width:${p}%"></span></div></div><b>${p}%</b></div>`}).join(''):'<div class="empty">لا توجد مواد.</div>'}
function renderProfile(){const u=state.user||{},s=state.setup||{};document.getElementById('profileName').value=u.name||s.name||'';document.getElementById('profileAge').value=u.age||s.age||'';document.getElementById('profileStage').value=u.stage||s.stage||'';document.getElementById('profileGrade').value=u.grade||s.grade||'';document.getElementById('profileHours').value=u.hours||s.hours||3;document.getElementById('hoursValue').textContent=(u.hours||s.hours||3)+' ساعة';document.getElementById('profileStart').value=u.start||s.start||'18:00'}
function saveProfile(){state.user.name=document.getElementById('profileName').value.trim();state.user.age=document.getElementById('profileAge').value;state.user.stage=document.getElementById('profileStage').value.trim();state.user.grade=document.getElementById('profileGrade').value.trim();state.user.hours=Number(document.getElementById('profileHours').value);state.user.start=document.getElementById('profileStart').value;state.setup={...state.setup,name:state.user.name,age:state.user.age,stage:state.user.stage,grade:state.user.grade,hours:state.user.hours,start:state.user.start,subjects:state.subjects.map(s=>s.name)};save();renderAll();toast('تم حفظ التعديلات')}

function openStudyModal(subjectId){const subject=state.subjects.find(item=>item.id===subjectId),task=state.tasks.find(item=>item.subjectId===subjectId&&item.date===todayKey()&&!item.completed);if(!subject||!task)return toast('لا توجد جلسة لهذه المادة اليوم');openTimer(task.id)}
function openStudyQuestions(subjectId){const s=state.subjects.find(x=>x.id===subjectId);if(!s)return;studySubjectId=subjectId;studyCurriculum='';studyYear='';studyTerm='';studyStage='';studyGrade='';studyUnit='';studyLesson='';studyReviewType='';studyReviewMonth='';studyReviewTerm='';document.getElementById('studyMonitor').classList.add('hidden');document.getElementById('studyModalSubject').textContent=`مذاكرة: ${s.name}`;document.getElementById('studyModal').classList.remove('hidden');renderStudyCurriculumStep()}
function closeStudyModal(){stopStudyMonitor(true);document.getElementById('studyModal').classList.add('hidden')}
function studySummary(){const s=state.subjects.find(x=>x.id===studySubjectId),reviewLabel={normal:'مراجعة عادية',monthly:'مراجعة شهرية',term:'مراجعة نهاية الترم'}[studyReviewType];return `<div class="study-summary"><span class="study-chip">${escapeHTML(s?.name||'')}</span>${studyCurriculum?`<span class="study-chip">${escapeHTML(studyCurriculum)}</span>`:''}${studyYear?`<span class="study-chip">${escapeHTML(studyYear)}</span>`:''}${studyTerm?`<span class="study-chip">${escapeHTML(studyTerm)}</span>`:''}${studyStage?`<span class="study-chip">${escapeHTML(studyStage)}</span>`:''}${studyGrade?`<span class="study-chip">${escapeHTML(studyGrade)}</span>`:''}${reviewLabel?`<span class="study-chip">${reviewLabel}</span>`:''}${studyReviewMonth?`<span class="study-chip">${escapeHTML(studyReviewMonth)}</span>`:''}${studyReviewTerm?`<span class="study-chip">${escapeHTML(studyReviewTerm)}</span>`:''}${studyUnit?`<span class="study-chip">الوحدة ${escapeHTML(studyUnit)}</span>`:''}${studyLesson?`<span class="study-chip">الدرس ${escapeHTML(studyLesson)}</span>`:''}</div>`}
function renderStudyCurriculumStep(){document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>اختار نوع المنهج</h3><p class="muted">هل تدرس المنهج العام أم الأزهري؟</p>${studySummary()}<div class="study-options"><button class="study-option" onclick="selectStudyCurriculum('منهج عام')">📘 منهج عام</button><button class="study-option" onclick="selectStudyCurriculum('منهج أزهري')">🕌 منهج أزهري</button></div></div>`}
function selectStudyCurriculum(v){studyCurriculum=v;renderStudyYearStep()}
function renderStudyYearStep(){document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>أي نسخة من المنهج؟</h3><p class="muted">اختار منهج 2027 أو المناهج القديمة.</p>${studySummary()}<div class="study-options"><button class="study-option" onclick="selectStudyYear('منهج 2027')">📅 منهج 2027</button><button class="study-option" onclick="selectStudyYear('مناهج قديمة')">📚 مناهج قديمة</button></div></div>`}
function selectStudyYear(v){studyYear=v;renderStudyTermStep()}
function renderStudyTermStep(){document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>اختر الترم</h3>${studySummary()}<div class="study-options"><button class="study-option" onclick="selectStudyTerm('الترم الأول')">1️⃣ الترم الأول</button><button class="study-option" onclick="selectStudyTerm('الترم الثاني')">2️⃣ الترم الثاني</button></div></div>`}
function selectStudyTerm(v){studyTerm=v;renderStudyStageStep()}
function renderStudyStageStep(){document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>اختر المرحلة الدراسية</h3>${studySummary()}<div class="study-options">${Object.keys(studyGrades).map(x=>`<button class="study-option" onclick="selectStudyStage('${x}')">🎓 ${x}</button>`).join('')}</div></div>`}
function selectStudyStage(v){studyStage=v;studyGrade='';renderStudyGradeStep()}
function renderStudyGradeStep(){document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>اختر الصف الدراسي</h3>${studySummary()}<div class="study-options">${(studyGrades[studyStage]||[]).map(g=>`<button class="study-option" onclick="selectStudyGrade('${g}')">📘 ${g}</button>`).join('')}</div></div>`}
function selectStudyGrade(v){studyGrade=v;renderStudyReviewTypeStep()}
function renderStudyReviewTypeStep(){document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>نوع المراجعة</h3>${studySummary()}<div class="study-options"><button class="study-option" onclick="selectStudyReviewType('normal')">مراجعة عادية</button><button class="study-option" onclick="selectStudyReviewType('monthly')">مراجعة شهرية</button><button class="study-option" onclick="selectStudyReviewType('term')">مراجعة آخر الترم</button></div></div>`}
function selectStudyReviewType(type){studyReviewType=type;studyReviewMonth='';studyReviewTerm='';studyUnit='';studyLesson='';if(type==='normal')renderStudyUnitLessonStep();if(type==='monthly')renderStudyReviewMonthStep();if(type==='term')renderStudyReviewTermStep()}
function renderStudyUnitLessonStep(){document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>حدد الوحدة والدرس</h3>${studySummary()}<div class="field"><label for="studyUnitInput">رقم الوحدة</label><input class="study-input" id="studyUnitInput" type="number" min="1" step="1" inputmode="numeric" placeholder="مثال: 2" oninput="updateStudyMaterialLink()" required></div><div class="field"><label for="studyLessonInput">رقم الدرس</label><input class="study-input" id="studyLessonInput" type="number" min="1" step="1" inputmode="numeric" placeholder="مثال: 3" oninput="updateStudyMaterialLink()" required></div><a class="btn btn-primary full study-youtube-link" id="studyYoutubeLink" href="#" target="_blank" rel="noopener noreferrer" onclick="return prepareStudyMaterial(event)">فتح فيديو الدرس في تبويب جديد ↗</a></div>`;updateStudyMaterialLink()}
function renderStudyReviewMonthStep(){const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>مراجعة شهرية</h3>${studySummary()}<div class="field"><label for="studyReviewMonth">اختار الشهر</label><select class="study-input" id="studyReviewMonth" onchange="selectStudyReviewMonth(this.value)"><option value="">اختر الشهر</option>${months.map(month=>`<option value="${month}" ${studyReviewMonth===month?'selected':''}>${month}</option>`).join('')}</select></div><a class="btn btn-primary full study-youtube-link" id="studyYoutubeLink" href="#" target="_blank" rel="noopener noreferrer" onclick="return prepareStudyMaterial(event)">فتح مراجعة الشهر في تبويب جديد ↗</a></div>`;updateStudyMaterialLink()}
function selectStudyReviewMonth(month){studyReviewMonth=month;updateStudyMaterialLink()}
function renderStudyReviewTermStep(){document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>مراجعة آخر الترم</h3>${studySummary()}<div class="study-options"><button class="study-option" onclick="selectStudyReviewTerm('الترم الأول')">الترم الأول</button><button class="study-option" onclick="selectStudyReviewTerm('الترم الثاني')">الترم الثاني</button></div></div>`}
function selectStudyReviewTerm(term){studyReviewTerm=term;renderStudyReviewLinkStep()}
function renderStudyReviewLinkStep(){document.getElementById('studyModalContent').innerHTML=`<div class="study-step"><h3>مراجعة آخر ${escapeHTML(studyReviewTerm)}</h3>${studySummary()}<a class="btn btn-primary full study-youtube-link" id="studyYoutubeLink" href="#" target="_blank" rel="noopener noreferrer" onclick="return prepareStudyMaterial(event)">فتح مراجعة الترم في تبويب جديد ↗</a></div>`;updateStudyMaterialLink()}
function updateStudyMaterialLink(){const link=document.getElementById('studyYoutubeLink'),unit=document.getElementById('studyUnitInput')?.value.trim(),lesson=document.getElementById('studyLessonInput')?.value.trim();if(!link)return false;studyUnit=unit||'';studyLesson=lesson||'';const ready=studyReviewType==='normal'?Boolean(unit&&lesson):studyReviewType==='monthly'?Boolean(studyReviewMonth):studyReviewType==='term'?Boolean(studyReviewTerm):false;if(!ready){link.href='#';link.setAttribute('aria-disabled','true');return false}link.href='https://www.youtube.com/results?search_query='+encodeURIComponent(buildStudyQuery());link.removeAttribute('aria-disabled');return true}
function prepareStudyMaterial(event){if(!updateStudyMaterialLink()){event?.preventDefault();toast(studyReviewType==='normal'?'اكتب رقم الوحدة ورقم الدرس أولًا':studyReviewType==='monthly'?'اختار شهر المراجعة أولًا':'حدد نوع المراجعة أولًا');return false}timer.questionsCompleted=true;persistTimer();toast('تم تجهيز رابط YouTube في تبويب جديد');return true}
function buildStudyQuery(){const s=state.subjects.find(x=>x.id===studySubjectId),reviewDetails=studyReviewType==='monthly'?[`مراجعة شهر ${studyReviewMonth}`]:studyReviewType==='term'?[`مراجعة آخر ${studyReviewTerm}`]:[`الوحدة ${studyUnit}`,`الدرس ${studyLesson}`];return [s?.name,studyCurriculum,studyYear,studyTerm,studyStage,studyGrade,...reviewDetails,'شرح'].filter(Boolean).join(' ')}
function startStudyTimer({taskId=null,subjectId=null,subjectName,title,seconds=1500}){if(timer.active){restoreTimer();toast('هناك جلسة مذاكرة تعمل بالفعل');return}clearInterval(timer.id);timer.taskId=taskId;timer.subjectId=subjectId;timer.subjectName=subjectName;timer.title=title;timer.seconds=seconds;timer.initialSeconds=seconds;timer.endsAt=0;timer.running=false;timer.active=true;timer.questionsCompleted=false;timer.recordedSeconds=0;document.getElementById('timerSubject').textContent=subjectName;document.getElementById('timerTask').textContent=title;document.getElementById('timerModal').classList.remove('hidden','minimized');document.getElementById('timerDock').classList.add('hidden');updateTimerUI();toggleTimer();openStudyQuestions(subjectId);minimizeTimer()}
function openTimer(taskId){const task=state.tasks.find(item=>item.id===taskId);if(!task)return;if(task.date!==todayKey())return toast('زر المذاكرة متاح في يوم الجلسة فقط');const subjectId=task.subjectId||state.subjects.find(subject=>subject.name===task.subject)?.id;startStudyTimer({taskId,subjectId,subjectName:task.subject,title:task.title,seconds:(task.duration||25)*60})}
function formatTimerClock(seconds){const total=Math.max(0,seconds),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function updateTimerUI(){const clock=formatTimerClock(timer.seconds);document.getElementById('timerNumber').textContent=clock;document.getElementById('timerDockTime').textContent=clock}
function readTimerPositions(){try{return JSON.parse(localStorage.getItem(TIMER_POSITION_KEY)||'{}')||{}}catch{return {}}}
function positionTimerElement(element,key){const position=readTimerPositions()[key];if(!position)return;const rect=element.getBoundingClientRect(),left=Math.max(8,Math.min(Number(position.left)||8,innerWidth-rect.width-8)),top=Math.max(8,Math.min(Number(position.top)||8,innerHeight-rect.height-8));element.style.left=`${left}px`;element.style.top=`${top}px`;element.style.right='auto';element.style.bottom='auto'}
function saveTimerElementPosition(element,key){const rect=element.getBoundingClientRect(),positions=readTimerPositions();positions[key]={left:Math.round(rect.left),top:Math.round(rect.top)};localStorage.setItem(TIMER_POSITION_KEY,JSON.stringify(positions))}
function beginTimerDrag(event,element,key){if(event.button!==0||key==='card'&&event.target.closest('button'))return;const rect=element.getBoundingClientRect();element.style.left=`${rect.left}px`;element.style.top=`${rect.top}px`;element.style.right='auto';element.style.bottom='auto';timerDrag={element,key,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,startLeft:rect.left,startTop:rect.top,moved:false};if(key==='card')event.preventDefault();element.setPointerCapture?.(event.pointerId)}
function moveTimerDrag(event){if(!timerDrag||event.pointerId!==timerDrag.pointerId)return;const rect=timerDrag.element.getBoundingClientRect(),dx=event.clientX-timerDrag.startX,dy=event.clientY-timerDrag.startY;timerDrag.moved ||= Math.abs(dx)+Math.abs(dy)>4;timerDrag.element.style.left=`${Math.max(8,Math.min(timerDrag.startLeft+dx,innerWidth-rect.width-8))}px`;timerDrag.element.style.top=`${Math.max(8,Math.min(timerDrag.startTop+dy,innerHeight-rect.height-8))}px`}
function endTimerDrag(event){if(!timerDrag||event.pointerId!==timerDrag.pointerId)return;if(timerDrag.moved){saveTimerElementPosition(timerDrag.element,timerDrag.key);if(timerDrag.key==='dock')timerDockWasDragged=true}timerDrag=null}
function initTimerDragging(){const modal=document.getElementById('timerModal'),handle=modal.querySelector('.timer-head'),dock=document.getElementById('timerDock');handle.addEventListener('pointerdown',event=>beginTimerDrag(event,modal,'card'));dock.addEventListener('pointerdown',event=>beginTimerDrag(event,dock,'dock'));dock.addEventListener('click',event=>{if(timerDockWasDragged){timerDockWasDragged=false;event.preventDefault();event.stopImmediatePropagation()}},true);document.addEventListener('pointermove',moveTimerDrag);document.addEventListener('pointerup',endTimerDrag);document.addEventListener('pointercancel',endTimerDrag)}
function minimizeTimer(){if(timer.running){tickStudyTimer();if(!timer.active)return}document.getElementById('timerModal').classList.add('minimized');const dock=document.getElementById('timerDock');dock.classList.remove('hidden');positionTimerElement(dock,'dock')}
function restoreTimer(){if(timer.running){tickStudyTimer();if(!timer.active)return}const modal=document.getElementById('timerModal');modal.classList.remove('minimized');document.getElementById('timerDock').classList.add('hidden');positionTimerElement(modal,'card')}
function syncTimerClock(){timer.seconds=Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000));updateTimerUI();recordTimerStudyTime()}
function recordTimerStudyTime(){const elapsed=Math.max(0,timer.initialSeconds-timer.seconds),unrecorded=elapsed-timer.recordedSeconds;if(unrecorded<=0)return;timer.recordedSeconds=elapsed;recordStudySecond(unrecorded);persistTimer()}
function tickStudyTimer(){if(!timer.running)return;syncTimerClock();if(timer.seconds===0)finishTimer()}
function toggleTimer(){if(timer.running){syncTimerClock();if(timer.seconds===0)return finishTimer();timer.running=false;timer.endsAt=0;clearInterval(timer.id);document.getElementById('timerToggleBtn').textContent='▶ متابعة';persistTimer();return}timer.endsAt=Date.now()+timer.seconds*1000;timer.running=true;document.getElementById('timerToggleBtn').textContent='⏸ إيقاف';persistTimer();timer.id=setInterval(tickStudyTimer,250)}
function finishTimer(){if(timer.running)syncTimerClock();clearInterval(timer.id);timer.running=false;timer.active=false;timer.endsAt=0;const t=state.tasks.find(x=>x.id===timer.taskId);if(t)t.completed=true;save();closeTimer();renderAll();toast('انتهت جلسة المذاكرة وتم تسجيل التقدم')}
function closeTimer(){clearInterval(timer.id);timer.running=false;timer.active=false;timer.endsAt=0;persistTimer();document.getElementById('timerModal').classList.add('hidden');document.getElementById('timerDock').classList.add('hidden')}
function restoreSavedTimer(){if(!timer.active)return;document.getElementById('timerSubject').textContent=timer.subjectName;document.getElementById('timerTask').textContent=timer.title;if(timer.seconds===0){updateTimerUI();finishTimer();if(timer.subjectId&&!timer.questionsCompleted)openStudyQuestions(timer.subjectId);return}document.getElementById('timerModal').classList.remove('hidden','minimized');document.getElementById('timerDock').classList.add('hidden');updateTimerUI();if(timer.running){document.getElementById('timerToggleBtn').textContent='⏸ إيقاف';timer.id=setInterval(tickStudyTimer,250)}else document.getElementById('timerToggleBtn').textContent='▶ متابعة';if(timer.subjectId&&!timer.questionsCompleted)openStudyQuestions(timer.subjectId);if(timer.questionsCompleted||timer.subjectId)minimizeTimer()}
window.addEventListener('pagehide',persistTimer);
window.addEventListener('resize',()=>{if(!timer.active)return;if(!document.getElementById('timerModal').classList.contains('minimized'))positionTimerElement(document.getElementById('timerModal'),'card');else positionTimerElement(document.getElementById('timerDock'),'dock')});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&timer.running)tickStudyTimer()});
function requestNotifications(){if('Notification' in window){Notification.requestPermission().then(p=>toast(p==='granted'?'تم تفعيل التنبيهات':'لم يتم تفعيل التنبيهات'))}else toast('المتصفح لا يدعم التنبيهات')}
function logout(){if(!confirm('هل تريد تسجيل الخروج؟'))return;localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(TIMER_STORAGE_KEY);location.reload()}

initTimerDragging();
if(state.user?.email){if(state.subjects.length&&state.studyScheduleVersion!==4)generatePlan(false);save();openApp();restoreSavedTimer()}else showLanding();
