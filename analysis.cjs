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
