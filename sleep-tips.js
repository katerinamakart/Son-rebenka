(()=>{
'use strict';
const base=new URL('.',document.currentScript.src),art=new URL('sleep-tips-art.png',base).href;
const cards=[
 {id:'duration',title:'Сколько сна нужно?',text:'Сравнивайте сон с возрастным диапазоном, а не с одной строгой цифрой.',x:4,y:342},
 {id:'wake',title:'Промежутки бодрствования',text:'Промежутки индивидуальны: учитывайте возраст, сонливость и самочувствие.',x:386,y:342},
 {id:'bedtime',title:'Вечернее укладывание',text:'Записывайте отдельно начало укладывания и фактическое засыпание.',x:772,y:342},
 {id:'night',title:'Ночные пробуждения',text:'Отмечайте не только количество, но и общую длительность ночного бодрствования.',x:1156,y:342},
 {id:'ritual',title:'Ритуал перед сном',text:'Выберите спокойную последовательность, которая подходит вашей семье.',x:4,y:682},
 {id:'environment',title:'Среда для сна',text:'Температура на картинке — пример, не обязательная норма. Учитывайте одежду и самочувствие ребёнка.',x:386,y:682},
 {id:'activity',title:'Нагрузка днём',text:'Нагрузка может быть связана со сном, но сама по себе не доказывает причину трудностей.',x:772,y:682},
 {id:'wellbeing',title:'Самочувствие днём',text:'Бодрость, настроение и сонливость дополняют оценку количества часов.',x:1156,y:682}
];
const first={home:'duration',age:'duration',sleep:'wake',supplement:'night',morning:'wellbeing',evening:'bedtime',load:'activity',conditions:'environment',result:'duration',diary:'night',week:'wellbeing'};
const app=document.getElementById('app');if(!app)return;
let current='',index=0,hidden=false;
const css=document.createElement('style');css.textContent=`
.sleepTips{min-width:0;border:1px solid var(--line,#dceaf4);border-radius:24px;padding:18px;margin:0 0 20px;background:linear-gradient(145deg,#edf8ff,#fff3f8);color:var(--ink,#24384e)}
.sleepTips[hidden],.tipShow[hidden]{display:none}.sleepTips h2{font-size:19px;line-height:1.35;margin:0 0 12px}.tipArt{position:relative;overflow:hidden;aspect-ratio:375/334;border-radius:17px;background:#f6f3ff}.tipArt img{position:absolute;display:block;width:409.6%;height:auto;max-width:none}.sleepTips figure{margin:0}.sleepTips figcaption{font-size:14px;line-height:1.5;margin:12px 0;min-height:64px}.tipNav{display:flex;align-items:center;justify-content:space-between;gap:12px}.tipNav button{min-width:48px;min-height:48px;border:1px solid #bdd9ec;border-radius:15px;background:white;color:#2d77ae;font-size:25px}.tipCount{font-size:14px;color:#55768e}.tipHide{display:block;margin:12px auto 0;border:0;background:transparent;padding:10px;color:#2d77ae;text-decoration:underline;min-height:44px}.tipShow{display:flex;align-items:flex-start;gap:14px;text-align:left;width:100%;border:1px solid #cce3f3;background:linear-gradient(120deg,#eaf6ff,#fff0f6);border-radius:22px;padding:20px;min-height:48px;color:#24384e;cursor:pointer;box-shadow:0 6px 20px #beddeb28}.tipTeaserIcon{display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;border-radius:16px;background:#fff;color:#729cc9;font-size:34px;line-height:1}.tipTeaserText{display:grid;gap:7px;min-width:0}.tipTeaserText strong{font-size:18px;line-height:1.35}.tipTeaserText>span{font-size:14px;line-height:1.5;color:#64788c}.tipTeaserText b{font-size:15px;color:#2d77ae}.tipShow:hover{border-color:#8fbfe0}.tipShow:active{transform:translateY(1px)}.tipSource{font-size:13px;margin:10px 0 0;text-align:center}.tipShow:focus-visible,.sleepTips button:focus-visible,.tipArt:focus-visible{outline:3px solid #a45b8e;outline-offset:3px}
@media(min-width:1200px){#app.hasSleepTips{width:min(1040px,calc(100% - 32px));display:grid;grid-template-columns:minmax(0,735px) 280px;gap:24px;align-items:start}.sleepTips,.tipShow{position:sticky;top:20px;margin:0}.sleepTips{padding:14px}.sleepTips figcaption{min-height:84px}}
@media(prefers-reduced-motion:reduce){.sleepTips *{scroll-behavior:auto}}`;
document.head.append(css);
function mount(){
 if(app.querySelector('.sleepTips,.tipShow'))return;
 const screen=app.dataset.sleepScreen||'home';
 if(!Object.hasOwn(first,screen)){app.classList.remove('hasSleepTips');return;}
 if(current!==screen){current=screen;hidden=false;index=Math.max(0,cards.findIndex(c=>c.id===first[screen]));}
 app.classList.add('hasSleepTips');
 const show=document.createElement('button');show.className='tipShow';show.type='button';show.setAttribute('aria-label','Как помочь ребёнку со сном? Посмотреть 8 подсказок');show.innerHTML='<span class=tipTeaserIcon aria-hidden=true>☾</span><span class=tipTeaserText><strong>Как помочь ребёнку со сном?</strong><span>8 коротких подсказок с картинками</span><b>Посмотреть <span aria-hidden=true>→</span></b></span>';show.hidden=!hidden;
 const box=document.createElement('aside');box.className='sleepTips';box.hidden=hidden;box.setAttribute('aria-label','Подсказки с иллюстрациями');box.setAttribute('aria-roledescription','карусель');
 box.innerHTML='<h2>Подсказки о сне</h2><figure><div class="tipArt" tabindex="0" aria-label="Иллюстрация. Листать стрелками влево и вправо"></div><figcaption></figcaption></figure><div class="tipNav"><button type="button" aria-label="Предыдущая подсказка">‹</button><span class="tipCount" aria-live="polite" aria-atomic="true"></span><button type="button" aria-label="Следующая подсказка">›</button></div><p class="tipSource"><a href="science.html#routine">Научная основа подсказок</a></p><button type="button" class="tipHide">Скрыть подсказки</button>';
 const image=document.createElement('img');image.src=art;image.width=1536;image.height=1024;image.loading='lazy';image.decoding='async';box.querySelector('.tipArt').append(image);
 function render(){const c=cards[index];image.alt=c.title+' — иллюстрированная карточка';image.style.left=(-c.x/375*100)+'%';image.style.top=(-c.y/334*100)+'%';box.querySelector('figcaption').textContent=c.text;box.querySelector('.tipCount').textContent=(index+1)+' из '+cards.length+' · '+c.title;}
 function step(delta){index=(index+delta+cards.length)%cards.length;render();}
 box.querySelector('[aria-label="Предыдущая подсказка"]').onclick=()=>step(-1);box.querySelector('[aria-label="Следующая подсказка"]').onclick=()=>step(1);
 box.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();step(e.key==='ArrowRight'?1:-1);}});
 let touch=null;box.querySelector('.tipArt').addEventListener('touchstart',e=>{const t=e.changedTouches[0];touch={x:t.clientX,y:t.clientY};},{passive:true});box.querySelector('.tipArt').addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))step(dx<0?1:-1);touch=null;},{passive:true});
 box.querySelector('.tipHide').onclick=()=>{hidden=true;box.hidden=true;show.hidden=false;show.focus();};show.onclick=()=>{hidden=false;box.hidden=false;show.hidden=true;box.querySelector('.tipArt').focus();};
 image.onerror=()=>{box.querySelector('.tipArt').hidden=true;};
 app.append(box,show);render();
}
const observer=new MutationObserver(mount);observer.observe(app,{childList:true});mount();
})();
