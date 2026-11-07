const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),script=html.split('<script>')[1].split('</script>')[0].replace(/^go\(.*$/m,'');
const sandbox={document:{getElementById:id=>id==='research-data'?{textContent:'{"cases":[],"sources":{}}'}:{},addEventListener(){}},localStorage:{getItem(){return null}},crypto:require('node:crypto').webcrypto,console,Date};vm.createContext(sandbox);vm.runInContext(script,sandbox);
function run(code){return vm.runInContext(code,sandbox)}
run(`state={...blank(),years:'4',months:'0',wake:'07:00',dayWake:'07:00',asleep:'21:00',bedtime:'20:00',nightAwake:'30',napMode:'intervals',naps:[{start:'16:00',end:'18:00'}]}`);
let d=run('sleepStats()');assert.equal(d.night,570);assert.equal(d.nap,120);assert.equal(d.total,690);assert.equal(d.lastWake,180);assert.equal(d.beforeSettling,120);assert.equal(d.settling,60);assert.equal(d.intervals[0].minutes,540);assert.match(run('scheduleConclusion(state,sleepStats())'),/2 ч/);
run(`state.naps=[{start:'09:00',end:'10:00'},{start:'12:30',end:'13:30'},{start:'16:00',end:'16:45'}]`);d=run('sleepStats()');assert.equal(d.nap,165);assert.equal(d.intervals[1].minutes,150);assert.equal(d.intervals[2].minutes,150);assert.equal(d.lastWake,255);
run(`state.naps=[{start:'12:00',end:'14:00'},{start:'13:00',end:'15:00'}]`);assert.match(run('sleepStats().napError'),/пересекаются/);assert.equal(run('sleepStats().total'),null);
run(`state.naps=[{start:'20:00',end:'22:00'}]`);assert.match(run('sleepStats().napError'),/до ночного/);
run(`state.naps=[{start:'12:00',end:''}]`);assert.equal(run('sleepStats().nap'),null);
run(`state.napMode='none'`);assert.equal(run('sleepStats().nap'),0);run(`state.nightAwake='unknown'`);assert.equal(run('sleepStats().night'),null);assert.equal(run('sleepStats().total'),null);
run(`state.napMode='legacy';state.nap='90';state.nightAwake='0'`);assert.equal(run('sleepStats().total'),690);assert.equal(run('sleepStats().napRows.length'),0);
run(`state.asleep='00:30';state.wake='08:00';state.bedtime='23:45'`);assert.equal(run('sleepStats().night'),450);assert.equal(run('sleepStats().settling'),45);
run(`state.years='0';state.months='2';state.infantNight='10';state.infantDay='6';state.dailySleep=''`);assert.equal(run('sleepStats().total'),960);assert.match(run('scheduleConclusion(state,sleepStats())'),/До 4 месяцев/);
// Entry age and timing never inherit another day's modern naps or current infant mode.
run(`state.years='0';state.months='2';state.napMode='intervals';state.naps=[{start:'12:00',end:'13:00'}]`);assert.equal(run(`entryStats({date:'2026-11-05',ageMonths:48,asleep:'21:00',wake:'07:00',nap:90,awake:0}).total`),690);
run(`state={...blank(),years:'4',months:'0'}`);
run(`var entries=Array.from({length:7},(_,i)=>({date:'2026-11-'+String(i+2).padStart(2,'0'),ageMonths:48,asleep:'21:00',wake:'07:00',nap:60,awake:i===0?null:0}));entries.push({date:'2026-11-01',asleep:'21:00',wake:'07:00',nap:900,awake:0});var w=weeklyData(entries,'2026-11-08')`);assert.equal(run('w.rows.length'),7);assert.equal(run('w.complete.length'),6);assert.equal(run("w.average('total').value"),660);assert.equal(run('w.weekdays.length'),4);assert.equal(run('w.weekends.length'),2);
assert.equal(run(`timeAverage(['23:30','00:30'])`),'00:00');assert.equal(run(`weeklyData(entries.concat(entries[1]),'2026-11-08').rows.length`),7);assert.equal(run(`weeklyData(entries,'2026-10-01').complete.length`),0);
// Distinct morning boundaries: no assumption that consecutive wake times are equal.
run(`state={...blank(),years:'4',months:'0',dayWake:'07:00',wake:'11:00',asleep:'01:00',bedtime:'00:15',napMode:'intervals',naps:[{start:'08:00',end:'09:00'}],nightAwake:'0'}`);assert.equal(run('sleepStats().nap'),60);assert.equal(run('sleepStats().lastWake'),960);assert.equal(run('sleepStats().settling'),45);
run(`state.napMode='none'`);assert.equal(run('sleepStats().lastWake'),1080);assert.equal(run('sleepStats().beforeSettling'),1035);
// Storage feedback must report failures honestly and preserve the diary.
const statusNode={textContent:'',className:''},diaryStatus={textContent:''},warningNode={remove(){}};
sandbox.document.getElementById=id=>id==='localSaveStatus'?statusNode:id==='storageWarning'?warningNode:id==='diarySaveStatus'?diaryStatus:null;
let storedSnapshot;
sandbox.localStorage.setItem=(key,value)=>{storedSnapshot=JSON.parse(value)};
run(`state.profileId='20000000-0000-4000-8000-000000000019';state.journal=[{date:'2026-11-04',asleep:'21:00',wake:'07:00',nap:60,awake:0}];save()`);
assert.equal(storedSnapshot.state.journal.length,1);assert.equal(storedSnapshot.state.profileId,'20000000-0000-4000-8000-000000000019');assert.match(statusNode.textContent,/сохраняются/);
sandbox.localStorage.setItem=()=>{throw new Error('QuotaExceededError')};run('save()');assert.equal(run('storageError'),true);assert.match(statusNode.textContent,/Не удалось сохранить/);assert.match(diaryStatus.textContent,/Не удалось сохранить/);assert.equal(run('state.journal.length'),1);
sandbox.localStorage.setItem=(key,value)=>{storedSnapshot=JSON.parse(value)};run('save()');assert.equal(run('storageError'),false);assert.match(statusNode.textContent,/сохраняются/);
assert.match(diaryStatus.textContent,/сохраняются/);
console.log('PASS: 49 assertions: sleep calculations, legacy data, weekly coverage, storage success/failure feedback and diary preservation.');

// Primary-source attribution at each age boundary, independent from the sleep arithmetic.
for(const [months,min,max,source] of [[0,14,17,'who'],[3,14,17,'who'],[4,12,16,'who'],[11,12,16,'who'],[12,11,14,'aasm'],[35,11,14,'aasm'],[36,10,13,'aasm'],[71,10,13,'aasm'],[72,9,12,'aasm'],[120,9,12,'aasm']]){
 run(`state.years='${Math.floor(months/12)}';state.months='${months%12}'`);
 assert.deepEqual(JSON.parse(JSON.stringify(run('norm()'))),{min,max,label:run('norm().label'),...(months<4?{caution:true}:{}),source});
 assert.match(run('normCitation()'),new RegExp(source==='who'?'who.int':'PMC4877308'));
}
const science=fs.readFileSync('science.html','utf8');
for(const href of [...science.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]))assert.ok(science.includes(`id="${href}"`),`Missing scientific-page target: ${href}`);
for(const href of [...html.matchAll(/science.html#([a-z0-9-]+)/g)].map(m=>m[1]))assert.ok(science.includes(`id="${href}"`),`Missing result target: ${href}`);
console.log('PASS: primary sources for 10 age boundaries and all static scientific-page anchors.');

// Comparison must not confuse unknown, old summed records and known no-nap days.
for(const [month,max] of [[3,0],[4,4],[6,3],[9,2],[15,2],[24,1],[36,1],[60,0]])assert.equal(run(`scheduleAgeGuide(${month}).max`),max);
run(`state={...blank(),years:'4',months:'0',dayWake:'07:00',wake:'07:00',asleep:'21:00',bedtime:'20:00',nightAwake:'0',napMode:'intervals',naps:[{start:'16:00',end:'18:00'}]}`);
assert.equal(run(`regimeComparison().rows.find(r=>r.stage==='1 дневной сон').actual`),'16:00–18:00');
assert.match(run(`regimeComparison().rows.find(r=>r.stage==='1 дневной сон').comment`),/2 ч/);
assert.match(run(`regimeComparison().rows.find(r=>r.stage==='Фактическое засыпание').guide`),/23:00/);
run(`state.years='2';state.napMode='unknown'`);assert.match(run(`regimeComparison().rows.find(r=>r.stage==='1 дневной сон').comment`),/не означает/);
run(`state.napMode='legacy';state.nap='60'`);assert.match(run(`regimeComparison().rows.find(r=>r.stage==='1 дневной сон').comment`),/пропуск не определяем/);
run(`state.napMode='none';state.asleep='23:00'`);assert.match(run(`regimeComparison().rows.find(r=>r.stage==='1 дневной сон').comment`),/Возможный пропуск/);assert.equal(run(`regimeComparison().rows.find(r=>r.stage==='Фактическое засыпание').tone`),'attention');
run(`state.years='6'`);assert.equal(run(`regimeComparison().rows.filter(r=>/дневной сон/.test(r.stage)).length`),0);
run(`state.years='0';state.months='2'`);assert.match(run(`regimeComparison().rows.find(r=>r.stage==='Фактическое засыпание').guide`),/нет/);
assert.ok(science.includes('id="regime-method"'));
console.log('PASS: month-specific comparison, late nap signal, computed sleep boundary, missing vs unknown data, old entries and infant/school-age rows.');

// A normal duration must not hide long settling; unknown quality stays unknown.
run(`state={...blank(),years:'4',months:'0',dayWake:'07:40',wake:'07:00',asleep:'21:08',bedtime:'20:00',nightAwake:'0',napMode:'intervals',naps:[{start:'12:00',end:'15:00'}],dayMood:'good'}`);
assert.equal(run(`resultAssessment().duration.tone`),'good');assert.equal(run(`resultAssessment().quality.tone`),'bad');assert.equal(run(`resultAssessment().headline`),'Стоит поправить укладывание');assert.equal(run(`resultAssessment().d.settling`),68);
run(`state.asleep='20:20'`);assert.equal(run(`resultAssessment().quality.tone`),'good');
run(`state.nightAwake='unknown';state.dayMood='unknown'`);assert.equal(run(`resultAssessment().duration.tone`),'unknown');assert.equal(run(`resultAssessment().quality.tone`),'unknown');
run(`state.nightAwake='0';state.asleep='23:30';state.napMode='none'`);assert.equal(run(`resultAssessment().duration.tone`),'bad');
run(`state.breathing='yes'`);assert.equal(run(`resultAssessment().headline`),'Обсудите дыхание во сне с врачом');
run(`state={...blank(),years:'0',months:'2',dailySleep:'16'}`);assert.equal(run(`resultAssessment().duration.tone`),'unknown');
console.log('PASS: compact result colors distinguish duration, long settling, unknown observations, short sleep and breathing concerns.');

// Four requested duration scenarios. Other issues never turn adequate duration red.
for(const [asleep,awake,expected] of [['21:00','0','good'],['01:00','0','bad'],['18:00','0','watch'],['21:00','unknown','unknown']]){
 run(`state={...blank(),years:'4',months:'0',asleep:'${asleep}',wake:'07:00',bedtime:'17:30',nightAwake:'${awake}',napMode:'legacy',nap:'60',dayMood:'good'}`);
 assert.equal(run('durationSummary(resultAssessment()).tone'),expected);
 assert.equal(run(`sleepDurationScale(resultAssessment()).includes('class="sleepScaleMarker"')`),expected!=='unknown');
 if(expected==='unknown'){assert.notEqual(run('resultAssessment().quality.tone'),'good');assert.notEqual(run('resultAssessment().schedule.tone'),'good');}
}
run(`state.years=''`);assert.equal(run('durationSummary(resultAssessment()).tone'),'unknown');
console.log('PASS: normal / short / long / incomplete duration status, actual scale marker and incomplete-data safeguards.');

async function checkKnowledgeIntegration(){
 const code=fs.readFileSync('sleep-knowledge.js','utf8');
 const aasm={id:'aasm',title:'AASM',url:'https://example.org/sleep',is_published:true};
 const draft={...aasm,id:'draft',is_published:false};
 const bands=[[0,4,840,1020],[4,12,720,960],[12,36,660,840],[36,72,600,780],[72,132,540,720]];
 const norms=bands.map(([age_min_months,age_max_months_exclusive,min_minutes,max_minutes])=>({
  age_min_months,age_max_months_exclusive,min_minutes,max_minutes,source_id:'aasm',is_published:true
 }));
 const makeRule=(trigger_key,priority,age_min_months=4,age_max_months_exclusive=132)=>({
  id:trigger_key,trigger_key,priority,age_min_months,age_max_months_exclusive,title:trigger_key,
  parent_explanation:'Наблюдение',recommendation:'Совет',source_ids:['aasm'],is_published:true
 });
 const rows={
  sources:[aasm,draft],
  age_norms:norms,
  guidance:[
   makeRule('total_sleep_in_range',60),makeRule('total_sleep_below',80),makeRule('total_sleep_above',60),
   makeRule('late_nap_with_bedtime_delay',50,12,72),makeRule('repeated_long_settling',65,12),
   makeRule('sleep_fields_missing',100,0),makeRule('sleep_breathing_warning',1,0),
   makeRule('frequent_night_wakings',70),makeRule('tired_day_mood',50,12),
   makeRule('age_under_4_months',100,0,4),makeRule('screens_close_to_bedtime',55,12),
   makeRule('ritual_absent_or_inconsistent',55),
   {...makeRule('total_sleep_in_range',999),id:'unpublished',is_published:false},
   {...makeRule('total_sleep_in_range',999),id:'unpublished-source',source_ids:['draft']}
  ]
 };
 const requests=[];
 function loadModule(fetch){
  const window={};
  vm.runInNewContext(code,{window,fetch,URL,URLSearchParams,AbortController,setTimeout,clearTimeout});
  return window.SonSleepKnowledge;
 }
 const kb=loadModule(async (url,options)=>{
  requests.push({url,options});
  return {ok:true,json:async()=>rows[url.pathname.split('sleep_kb_')[1]]};
 });
 assert.equal(await kb.load('https://example.org','public-test-key'),true);
 assert.equal(requests.length,3);
 for(const {url,options} of requests){
  assert.equal(url.searchParams.get('is_published'),'eq.true');
  assert.deepEqual([...url.searchParams.keys()].sort(),['is_published','select']);
  assert.equal(options.method,'GET');
  assert.equal(options.credentials,'omit');
  assert.equal(options.body,undefined);
  assert.equal(options.headers.Authorization,undefined);
 }
 sandbox.window={SonSleepKnowledge:kb};
 for(const [min,max,low,high] of bands){
  for(const age of [min,max-1]){
   assert.equal(run(`norm(${age}).minMinutes`),low);
   assert.equal(run(`norm(${age}).maxMinutes`),high);
  }
 }
 const base="state={...blank(),years:'4',wake:'07:00',asleep:'21:00',bedtime:'20:30',nightAwake:'0',napMode:'none'}";
 function matched(changes=''){
  run(base+';'+changes);
  const list=run('window.SonSleepKnowledge.suggestions(resultAssessment(),state,napMode(state))');
  return Array.from(list,rule=>rule.id);
 }
 assert.deepEqual(matched(),['total_sleep_in_range']);
 assert.deepEqual(matched("state.asleep='22:00'").slice(0,2),['total_sleep_below','repeated_long_settling']);
 assert.ok(matched("state.asleep='17:00';state.bedtime='16:30'").includes('total_sleep_above'));
 assert.ok(matched("state.napMode='intervals';state.naps=[{start:'16:00',end:'18:00'}];state.bedtime='20:00'").includes('late_nap_with_bedtime_delay'));
 assert.ok(!matched("state.dayWake='18:00';state.bedtime='20:00'").includes('late_nap_with_bedtime_delay'));
 assert.equal(matched("state.nightAwake='unknown';state.breathing='yes'")[0],'sleep_breathing_warning');
 assert.ok(matched("state.nightAwake='unknown'").includes('sleep_fields_missing'));
 assert.ok(matched("state.nightWakings='3';state.dayMood='tired'").includes('frequent_night_wakings'));
 assert.ok(matched("state.dayMood='tired'").includes('tired_day_mood'));
 assert.ok(matched("state.screenTime='late'").includes('screens_close_to_bedtime'));
 assert.ok(matched("state.rituals=['none']").includes('ritual_absent_or_inconsistent'));
 assert.ok(matched("state.years='0';state.months='2'").includes('age_under_4_months'));
 matched();
 assert.match(run('resultContent()'),/Советы из базы знаний/);
 assert.doesNotMatch(run('resultContent()'),/Возможные шаги/);
 assert.equal(requests.length,3,'Matching and rendering must not send more requests');
 const offline=loadModule(async()=>{throw new Error('offline');});
 assert.equal(await offline.load('https://example.org','public-test-key'),false);
 sandbox.window.SonSleepKnowledge=offline;
 assert.equal(run('norm().min'),10);
 assert.match(run('resultContent()'),/Возможные шаги/);
 assert.doesNotMatch(run('resultContent()'),/Советы из базы знаний/);
 console.log('PASS: published KB access, age boundaries, local matching, alert priority, source filtering and offline fallback.');
}
checkKnowledgeIntegration().catch(error=>{console.error(error);process.exitCode=1;});
