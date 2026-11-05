const {chromium}=require('playwright');const assert=require('node:assert/strict');
async function launch(){return chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});}
async function next(page){await page.locator('#next').click();}
async function clock(page,id,value){const [h,m]=(value||':').split(':');await page.locator(`#${id} + .clockPicker [data-clock="hours"]`).selectOption(h);await page.locator(`#${id} + .clockPicker [data-clock="minutes"]`).selectOption(m);}
async function fits(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');}
async function advanceContext(page){for(let i=0;i<3;i++)await next(page);await page.locator('#next').click();}
module.exports={assert,launch,next,clock,fits,advanceContext};
