const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto(process.env.BASE_URL||'http://127.0.0.1:8000/');await page.getByRole('button',{name:'Проверить режим',exact:false}).click();
await page.locator('#years').selectOption('4');await page.getByRole('button',{name:'Дальше',exact:false}).click();
await page.locator('#wake').fill('07:30');await page.locator('#asleep').fill('21:00');await page.locator('#nap').fill('60');await page.locator('#nightAwake').selectOption('30');await page.getByRole('button',{name:'Дальше',exact:false}).click();
assert.equal(await page.locator('#growth option[value=skill]').count(),0);assert.match(await page.locator('#growth').textContent(),/ребёнок быстро растёт/);
await page.getByRole('button',{name:'Посмотреть результат',exact:false}).click();
let text=await page.locator('#app').innerText();assert.match(text,/10–13/);assert.match(text,/10 ч/);assert.match(text,/11 ч/);assert.match(text,/В пределах рекомендации/);assert(text.indexOf('Рекомендация по возрасту')<text.indexOf('Вывод'));
await page.screenshot({path:'/tmp/result-mobile.png',fullPage:true});
await page.locator('#toDiary').click();await page.locator('#jd').fill('2026-11-05');await page.locator('#jn').fill('90');await page.locator('#jwa').fill('30');await page.locator('#saveEntry').click();
assert.match(await page.locator('#entries').innerText(),/11 ч 30 мин/);
await page.locator('#jd').fill('2026-11-04');await page.locator('#jn').fill('60');await page.locator('#saveEntry').click();
assert.equal(await page.locator('#entries .journalRow').count(),2);
await page.reload();assert.equal(await page.locator('#entries .journalRow').count(),2);
await page.getByRole('button',{name:'К результатам',exact:true}).click();await page.locator('#toDiary').click();assert.equal(await page.locator('#entries .journalRow').count(),2);
await page.getByRole('button',{name:'На главную',exact:true}).click();await page.getByRole('button',{name:'Проверить режим',exact:false}).click();await page.getByRole('button',{name:'Дальше',exact:false}).click();assert.equal(await page.locator('#asleep').inputValue(),'21:00');await page.getByRole('button',{name:'Дальше',exact:false}).click();await page.getByRole('button',{name:'Посмотреть результат',exact:false}).click();await page.locator('#toDiary').click();assert.equal(await page.locator('#entries .journalRow').count(),2);
await page.locator('[data-delete="2026-11-04"]').click();assert.equal(await page.locator('#entries .journalRow').count(),1);await page.getByRole('button',{name:'К результатам',exact:true}).click();await page.locator('#toDiary').click();await page.getByRole('button',{name:'← Назад',exact:true}).click();assert.equal(await page.locator('#toDiary').count(),1);
// Unknown waking duration must not be treated as actual sleep.
await page.getByRole('button',{name:'Изменить ответы'}).click();await page.getByRole('button',{name:'Дальше',exact:false}).click();await page.locator('#nightAwake').selectOption('unknown');await page.getByRole('button',{name:'Дальше',exact:false}).click();await page.getByRole('button',{name:'Посмотреть результат',exact:false}).click();assert.match(await page.locator('#app').innerText(),/Не хватает данных/);
await page.locator('#toDiary').click();await page.getByRole('button',{name:'На главную',exact:true}).click();await page.getByRole('button',{name:'Добавить другого ребёнка'}).click();await page.locator('#years').selectOption('2');await page.getByRole('button',{name:'Дальше',exact:false}).click();await page.locator('#wake').fill('0700');await page.locator('#asleep').fill('2100');await page.locator('#nap').fill('120');await page.locator('#nightAwake').selectOption('0');await page.getByRole('button',{name:'Дальше',exact:false}).click();assert.equal(await page.locator('#growth option[value=skill]').count(),1);
await page.getByRole('button',{name:'Посмотреть результат',exact:false}).click();await page.locator('#toDiary').click();assert.equal(await page.locator('#entries .journalRow').count(),0);
await page.getByRole('button',{name:'На главную',exact:true}).click();await page.getByRole('button',{name:'Семейный аккаунт',exact:true}).click();await page.waitForFunction(()=>document.getElementById('authForm')||document.getElementById('cloudStatus')?.innerText.includes('недоступно'));assert.equal(await page.locator('#authForm').count(),1);await page.screenshot({path:'/tmp/account-mobile.png',fullPage:true});
for(const width of [320,375,390,430,768]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow ${width}`);}
assert.deepEqual(errors,[]);console.log('PASS: age rules, overnight calculation, totals/difference, unknown night, journal save/reload/recheck/delete, navigation, per-child isolation, account form and mobile widths');
await context.close();await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
