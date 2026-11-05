const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),script=html.split('<script>')[1].split('</script>')[0].replace(/^go\(.*$/m,'');
const sandbox={document:{getElementById:id=>id==='research-data'?{textContent:'{"cases":[],"sources":{}}'}:{},addEventListener(){}},localStorage:{getItem(){return null}},crypto:require('node:crypto').webcrypto,console,Date};vm.createContext(sandbox);vm.runInContext(script,sandbox);
function run(code){return vm.runInContext(code,sandbox)}
run(`state={...blank(),years:'4',months:'0',wake:'07:00',asleep:'21:00',bedtime:'20:00',nightAwake:'30',napMode:'intervals',naps:[{start:'16:00',end:'18:00'}]}`);
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
console.log('PASS: 34 assertions: night subtraction, 3 naps, wake intervals, settling across midnight, overlaps, invalid/unknown, infant, legacy entry ages, 7-day window, missing days, deduplication, weekday/weekend, circular evening mean.');
