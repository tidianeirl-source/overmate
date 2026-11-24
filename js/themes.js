/* Coopô — js/themes.js
   Thèmes : illustrations, effets animés, décor derrière l'appli, thème Lotus (mare et carpes koï).
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* =========================================================
   THÈMES — illustrations de l'accueil + sélecteur
   ========================================================= */
const rng = seed => () => (seed=(seed*16807)%2147483647,(seed-1)/2147483646);
const svgWrap = (inner,defs='') => `<svg class="bloom" viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${defs}</defs>${inner}</svg>`;

function shapesSVG(){
  const R=rng(5); let out='';
  const cols=['#3EE6B5','#FF5A6E','#9FD4FF','#FF8FD0'];
  const shape=(t,x,y,s,c)=> t===0?`<polygon points="${x},${y-s} ${x+s*.87|0},${y+s*.5|0} ${x-s*.87|0},${y+s*.5|0}" stroke="${c}"/>`
    : t===1?`<circle cx="${x}" cy="${y}" r="${s}" stroke="${c}"/>`
    : t===2?`<path d="M${x-s} ${y-s}L${x+s} ${y+s}M${x+s} ${y-s}L${x-s} ${y+s}" stroke="${c}"/>`
    : `<rect x="${x-s}" y="${y-s}" width="${s*2}" height="${s*2}" rx="${s*.18|0}" stroke="${c}"/>`;
  for(let i=0;i<24;i++){ const t=i%4, x=R()*1200|0, y=R()*640|0, s=18+R()*42|0;
    out+=`<g class="floaty" style="--fdl:${(R()*9).toFixed(1)}s;--fx:${(R()*80-40)|0}px;--fy:${(R()*80-40)|0}px;--fr:${(R()*120-60)|0}deg;opacity:${(.35+R()*.6).toFixed(2)}">${shape(t,x,y,s,cols[t])}</g>`; }
  return svgWrap(`<rect width="1200" height="640" fill="url(#dots)"/><g fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${out}</g>`,
    `<pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="rgba(255,255,255,.2)"/></pattern>`);
}

function lofiSVG(){
  const R=rng(57);
  const f=n=>n.toFixed(1);
  // gros cumulus peints : bulles blanches, ombres bleutées en bas
  let cdefs='';
  const cloud=(cx,cy,w,h,seed,op,cls)=>{ const r=rng(seed), id='etC'+seed; let b='', hl='', sh='';
    cdefs+=`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(cy-h)}" x2="0" y2="${f(cy+h*.3)}"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#F6FAFC"/><stop offset=".8" stop-color="#C9DCEB"/><stop offset="1" stop-color="#9DBBD6"/></linearGradient>`;
    for(let i=0;i<30;i++){ const t=r(), x=cx+(t-.5)*w, k=1-Math.pow(Math.abs(t-.5)*2,1.5), rad=h*(.2+r()*.3)*(.5+k*.7), top=cy-k*h*(.5+r()*.45);
      b+=`<circle cx="${f(x)}" cy="${f(top+rad*.5)}" r="${f(rad)}"/>`;
      if(r()<.45) hl+=`<circle cx="${f(x-rad*.18)}" cy="${f(top+rad*.25)}" r="${f(rad*.6)}"/>`;
      if(r()<.3) sh+=`<circle cx="${f(x+rad*.3)}" cy="${f(top+rad*.95)}" r="${f(rad*.55)}"/>`; }
    b+=`<ellipse cx="${cx}" cy="${f(cy+h*.1)}" rx="${f(w*.5)}" ry="${f(h*.2)}"/>`;
    return `<g class="${cls||''}" opacity="${op}"><g filter="url(#etSoft)"><g fill="url(#${id})">${b}</g><g fill="#B7CFE3" opacity=".25">${sh}</g><g fill="#FFFFFF" opacity=".4">${hl}</g></g></g>`; };
  // herbes hautes au vent
  let grassBack='', grassFront='';
  const blade=(x,base,h,lean,col)=>`<path class="et-blade" style="--dl:${(R()*3).toFixed(1)}s;transform-origin:${f(x)}px ${base}px" d="M${f(x-3.5)} ${base} Q${f(x+lean*.35)} ${f(base-h*.6)} ${f(x+lean)} ${f(base-h)} Q${f(x+lean*.35+3)} ${f(base-h*.55)} ${f(x+3.5)} ${base}Z" fill="${col}"/>`;
  const greens=['#3E8E2A','#55A832','#6CBF3A','#2F7A24','#84CC48'];
  for(let i=0;i<120;i++){ const x=R()*1240-20; grassBack+=blade(x,560,40+R()*70,10+R()*40,greens[(R()*5)|0]); }
  for(let i=0;i<90;i++){ const x=R()*1240-20; grassFront+=blade(x,660,90+R()*130,20+R()*60,greens[(R()*5)|0]); }
  // fleurs des champs
  const fl=(x,y,s,c)=>{ let p=''; for(let i=0;i<5;i++){ const a=i*72*Math.PI/180; p+=`<circle cx="${f(Math.cos(a)*5*s)}" cy="${f(Math.sin(a)*5*s)}" r="${f(3.6*s)}" fill="${c}"/>`; }
    return `<g class="et-flower" style="--dl:${(R()*3).toFixed(1)}s;transform-origin:${f(x)}px ${f(y+40)}px"><path d="M${f(x)} ${f(y)} q2 20 -2 40" stroke="#3E8E2A" stroke-width="2" fill="none"/><g transform="translate(${f(x)} ${f(y)})">${p}<circle r="${f(2.6*s)}" fill="#F7C531"/></g></g>`; };
  let flowers='';
  const fcols=['#FFFFFF','#FFFFFF','#F7B6C8','#FFE07A','#FFFFFF'];
  for(let i=0;i<26;i++){ const x=R()*1200, y=470+R()*120; flowers+=fl(x,y,.8+R()*.7,fcols[(R()*5)|0]); }
  // feuilles qui s'envolent avec le vent
  let leaves='';
  for(let i=0;i<10;i++){ leaves+=`<g class="et-leaf" style="--y:${(120+R()*360)|0}px;--d:${(7+R()*7).toFixed(1)}s;--dl:${(R()*12).toFixed(1)}s"><path d="M0 0 C6 -6 16 -6 22 0 C16 6 6 6 0 0Z" fill="${R()<.5?'#6CBF3A':'#A5D867'}" transform="scale(${(.7+R()*.7).toFixed(2)})"/></g>`; }
  return svgWrap(`<rect width="1200" height="640" fill="url(#etSky)"/>
    <rect width="1200" height="640" fill="url(#etLight)"/>
    ${cloud(980,250,640,260,5,1,'')}${cloud(170,170,420,150,9,1,'et-drift')}${cloud(560,120,260,80,14,.9,'et-drift2')}
    ${cloud(560,470,900,150,21,1,'')}
    <path d="M-20 520 C200 470 420 500 640 480 C860 460 1040 500 1220 470 L1220 640 L-20 640Z" fill="#7CC24A"/>
    <path d="M-20 545 C240 520 470 540 700 525 C900 512 1060 540 1220 520 L1220 640 L-20 640Z" fill="#5FAE36"/>
    <g>${grassBack}</g>
    <g>${flowers}</g>
    <g>${grassFront}</g>
    <g>${leaves}</g>`,
    `<linearGradient id="etSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F6EA8"/><stop offset=".45" stop-color="#1F86C2"/><stop offset=".8" stop-color="#5DB0DB"/><stop offset="1" stop-color="#9ED2EC"/></linearGradient>
     <radialGradient id="etLight" cx=".75" cy=".1" r=".7"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".25"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
     <filter id="etSoft" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>${cdefs}`);
}

function esthSVG(){
  const R=rng(21); let stripes='', vlines='', hlines='', clouds='', spark='';
  for(let k=0;k<7;k++) stripes+=`<rect x="0" y="${345+k*24}" width="1200" height="${(3+k*2.4).toFixed(1)}" fill="#000"/>`;
  for(let i=-14;i<=14;i++) vlines+=`<line x1="600" y1="420" x2="${600+i*110}" y2="640"/>`;
  for(let k=-1;k<9;k++) hlines+=`<line x1="0" y1="${420+k*30}" x2="1200" y2="${420+k*30}"/>`;
  for(let i=0;i<5;i++){ const y=60+R()*220|0; clouds+=`<g class="cloud" style="--dd:${(60+R()*40)|0}s;--cd:${(R()*80)|0}s" fill="#fff" opacity=".75"><ellipse cx="0" cy="${y}" rx="110" ry="24"/><ellipse cx="-40" cy="${y-16}" rx="50" ry="30"/><ellipse cx="30" cy="${y-22}" rx="60" ry="34"/></g>`; }
  for(let i=0;i<14;i++) spark+=`<text class="tw" x="${R()*1200|0}" y="${30+R()*360|0}" font-size="${14+R()*22|0}" fill="#fff" style="--tw:${(R()*3).toFixed(1)}s;--td:${(1.5+R()*2).toFixed(1)}s">✦</text>`;
  return svgWrap(`<rect width="1200" height="640" fill="url(#esky)"/>${spark}
    <circle class="sun" cx="600" cy="330" r="175" fill="url(#esun)" mask="url(#emask)"/>
    ${clouds}
    <rect x="0" y="420" width="1200" height="220" fill="#8C78F0"/>
    <g clip-path="url(#eclip)" stroke="#FFE3F3" stroke-width="2" opacity=".85">${vlines}<g class="gridmove">${hlines}</g></g>`,
    `<linearGradient id="esky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A99BFF"/><stop offset=".6" stop-color="#FFB6D5"/><stop offset="1" stop-color="#FFD9B8"/></linearGradient>
     <linearGradient id="esun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3A8"/><stop offset="1" stop-color="#FF8FC4"/></linearGradient>
     <mask id="emask"><rect width="1200" height="640" fill="#fff"/>${stripes}</mask>
     <clipPath id="eclip"><rect x="0" y="420" width="1200" height="220"/></clipPath>`);
}

function samuraiSVG(){
  const R=rng(17); let petals='', wind='', splat='';
  for(let i=0;i<14;i++) petals+=`<ellipse class="petal" cx="${R()*1200|0}" cy="-20" rx="${5+R()*4|0}" ry="3.5" fill="${i%3?'#C41E3A':'#E8697F'}" opacity=".85" style="--dur:${(8+R()*7).toFixed(1)}s;--dl:${(R()*14).toFixed(1)}s;--dx:${(R()*260-200)|0}px"/>`;
  for(let i=0;i<7;i++){ const y=120+R()*420|0, w=80+R()*160|0; wind+=`<line class="wind" x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#1E1416" stroke-width="1.5" stroke-linecap="round" opacity=".5" style="--wd:${(3+R()*3).toFixed(1)}s;--wl:${(R()*5).toFixed(1)}s"/>`; }
  for(let i=0;i<10;i++) splat+=`<circle cx="${470+R()*220|0}" cy="${230+R()*300|0}" r="${(1.5+R()*5).toFixed(1)}" fill="#C41E3A" opacity="${(.5+R()*.5).toFixed(2)}"/>`;
  return svgWrap(`
    <circle class="redsun" cx="640" cy="250" r="185" fill="url(#samht)"/>
    <circle cx="640" cy="250" r="130" fill="#C41E3A" opacity=".9"/>
    <text x="960" y="330" font-family="'Noto Serif JP','Yu Mincho',serif" font-size="300" font-weight="700" fill="#C41E3A" opacity=".08">侍</text>
    ${wind}
    <ellipse cx="560" cy="636" rx="230" ry="18" fill="#1E1416" opacity=".18"/>
    <g class="breathe-s">
      <!-- robe -->
      <path d="M468 212 Q560 192 652 212 L700 330 L676 362 L712 640 L408 640 L444 362 L420 330 Z" fill="#17110F"/>
      <path class="robe-flap" d="M444 470 L408 640 L470 640 Z" fill="#241A1A"/>
      <path d="M560 214 L520 360 M560 214 L600 360" stroke="#3A2828" stroke-width="5" fill="none"/>
      <path d="M470 420 L460 640 M560 400 L560 640 M650 420 L662 640" stroke="#2A1E1E" stroke-width="3"/>
      <!-- manches -->
      <path d="M470 214 L394 334 L424 430 L480 388 Z" fill="#1D1514"/>
      <path d="M650 214 L726 334 L696 430 L640 388 Z" fill="#1D1514"/>
      <!-- ceinture -->
      <rect x="452" y="352" width="216" height="24" fill="#3A2626"/>
      <rect x="452" y="352" width="216" height="5" fill="#C41E3A" opacity=".8"/>
      <!-- cou et visage dans l'ombre -->
      <path d="M534 168 h52 v46 h-52z" fill="#0F0A0A"/>
      <!-- chapeau conique -->
      <path d="M560 66 L716 162 Q560 186 404 162 Z" fill="#221816"/>
      <path d="M560 66 L716 162 Q560 186 404 162 Z" fill="url(#hatlines)" opacity=".35"/>
      <ellipse cx="560" cy="163" rx="156" ry="13" fill="#120C0B"/>
      ${splat}
      <!-- katana -->
      <g>
        <path d="M372 506 L782 352 L789 366 L379 520 Z" fill="#7A1020"/>
        <path d="M782 352 L866 321 L872 335 L789 366 Z" fill="#141010"/>
        <circle cx="785" cy="359" r="11" fill="#A9853A"/>
        <line class="glint" x1="376" y1="508" x2="784" y2="355" stroke="#FFD9C9" stroke-width="2.5" stroke-linecap="round"/>
      </g>
    </g>
    ${petals}`,
    `<pattern id="samht" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><circle cx="4.5" cy="4.5" r="2.4" fill="#C41E3A"/></pattern>
     <pattern id="hatlines" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(60)"><line x1="0" y1="0" x2="0" y2="10" stroke="#8A6A4A" stroke-width="1.5"/></pattern>`);
}

/* =========================================================
   EFFETS ANIMÉS PAR THÈME
   orbs : halos lumineux · particles : ambiance · click : effet au clic · wipe : transition de page
   ========================================================= */
const FX = {
  defaut: { orbs:['#7C5CFF','#5B3FE8','#C8FF4D'], orbO:.3,
            particles:{ kind:'sparkle', chars:['✦','✺'], colors:['#B4A1FF','#C8FF4D'], n:10, dmin:4, dmax:7 }, click:'ripple' },
  samurai:{ particles:{ kind:'petal', colors:['#F4ECE1','#F2B8C2','#FFFFFF'], n:12, dmin:10, dmax:17 }, click:'ink', wipe:'slash' },
  soft:   { orbs:['#FF9CC0','#FFC6DB','#F77BAA'], orbO:.35,
            particles:{ kind:'petal', colors:['#FFC6DB','#FFFFFF','#FF9CC0'], n:14, dmin:9, dmax:16 }, click:'hearts' },
  lofi:   { orbs:['#9ED2EC','#FFE07A','#7CC24A'], orbO:.22,
            particles:{ kind:'dot', colors:['#FFF4E0','#FFCCA6'], n:22, dmin:14, dmax:24 }, click:'notes' },
  esth:   { orbs:['#C9B8FF','#FFC2DF','#BFF0E0'], orbO:.5,
            particles:{ kind:'sparkle', chars:['✦','✧','⋆'], colors:['#FFFFFF','#FFC2DF','#BFF0E0'], n:16, dmin:3, dmax:6 }, click:'sparkles' },
  sombre: { orbs:['#7C5CFF','#5B3FE8','#C8FF4D'], orbO:.3,
            particles:{ kind:'sparkle', chars:['✦','✺'], colors:['#B4A1FF','#C8FF4D'], n:10, dmin:4, dmax:7 }, click:'ripple' },
  ocean:  { particles:{ kind:'dot', colors:['#8FF0C6','#BFF3FF','#FFC2DA'], n:14, dmin:18, dmax:30 }, click:'ripple' },   // points lumineux qui dérivent sur l'eau (les carpes : voir POND)
};
// Mode léger : coupe les halos, particules et effets au clic. Activé d'office sur les appareils modestes ou en économie de données ; le joueur peut le changer dans les Paramètres.
const LOW_END = (()=>{ try{ return (navigator.deviceMemory&&navigator.deviceMemory<=2) || (navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2) || !!(navigator.connection&&navigator.connection.saveData); }catch(e){ return false; } })();
const liteOn = () => typeof S.lite==='boolean' ? S.lite : LOW_END;
function setLite(on){ S.lite=!!on; save(); document.documentElement.classList.toggle('lite',liteOn()); buildFx(); worldLive(); worldScroll(true); }
document.documentElement.classList.toggle('lite',liteOn());
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.random()*a.length|0];
const reduced=()=>liteOn()||matchMedia('(prefers-reduced-motion: reduce)').matches;

function buildFx(){
  const fx=document.getElementById('fx'), orbs=document.querySelector('.orbs');
  if(!fx||!orbs) return;
  fx.innerHTML=''; orbs.innerHTML='';
  const f=FX[S.skin]; if(!f||reduced()) return;
  if(f.orbs) orbs.innerHTML=[...f.orbs,...f.orbs].slice(0,5).map((c,i)=>
    `<i style="--c:${c};--x:${rand(-15,75)|0}%;--y:${(i*20+rand(-6,8))|0}%;--s:${rand(280,540)|0}px;--d:${rand(16,26)|0}s;--dl:${rand(0,20)|0}s;--o:${f.orbO||.3}"></i>`).join('');
  const p=f.particles; if(!p) return;
  const n = innerWidth<700 ? Math.ceil(p.n*.5) : p.n; let h='';
  for(let i=0;i<n;i++){
    const st=`--l:${rand(0,100).toFixed(1)}%;--c:${pick(p.colors)};--dur:${rand(p.dmin,p.dmax).toFixed(1)}s;--dl:${rand(0,18).toFixed(1)}s;--dx:${rand(-140,140)|0}px;--r:${rand(180,720)|0}deg`;
    if(p.kind==='petal'||p.kind==='leaf') h+=`<i class="p ${p.kind}" style="${st};--w:${rand(9,15)|0}px"></i>`;
    else if(p.kind==='sparkle') h+=`<i class="p spk" style="${st};--t:${rand(6,94).toFixed(1)}%;--w:${rand(10,22)|0}px">${pick(p.chars)}</i>`;
    else if(p.kind==='dot') h+=`<i class="p dot" style="${st};--w:${rand(2,5).toFixed(1)}px"></i>`;
  }
  fx.innerHTML=h;
}
function playWipe(){
  const f=FX[S.skin], w=document.getElementById('wipe'); if(!w||!f||!f.wipe||reduced()) return;
  w.className=''; w.innerHTML = f.wipe==='panels' ? '<i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i>' : '';
  void w.offsetWidth; w.className=f.wipe;
  clearTimeout(w._t); w._t=setTimeout(()=>{ w.className=''; w.innerHTML=''; },950);
}
function spawn(x,y,o){
  const s=document.createElement('i'); s.className='fxp '+o.cls; if(o.text) s.textContent=o.text;
  s.style.cssText=`left:${x}px;top:${y}px;--dx:${(o.dx||0)|0}px;--dy:${(o.dy||0)|0}px;--r:${rand(-90,90)|0}deg;--t:${o.life}ms;`
    +(o.color?`color:${o.color};`:'')+(o.size&&o.text?`font-size:${o.size|0}px;`:'')+(o.bg?`background:${o.bg};width:${o.size}px;height:${o.size}px;`:'');
  document.body.appendChild(s); setTimeout(()=>s.remove(),o.life+60);
}
document.addEventListener('pointerdown',e=>{
  const f=FX[S.skin]; if(!f||reduced()) return;
  const el=e.target.closest('.btn,.chip,.skin,.navpill a,.tabbar a'); if(!el) return;
  const x=e.clientX, y=e.clientY;
  switch(f.click){
    case 'ripple': { const r=el.getBoundingClientRect(); if(getComputedStyle(el).position==='static') el.style.position='relative'; el.style.overflow='hidden';
      const s=document.createElement('span'); s.className='rip'; s.style.cssText=`--x:${x-r.left}px;--y:${y-r.top}px`; el.appendChild(s); setTimeout(()=>s.remove(),650); break; }
    case 'ink': for(let i=0;i<10;i++) spawn(x,y,{cls:'burst blob',bg:pick(['#C41E3A','#9A152D','#1E1416']),size:rand(4,11),dx:rand(-70,70),dy:rand(-60,70),life:700}); break;
    case 'hearts': for(let i=0;i<5;i++) spawn(x,y,{cls:'float',text:'♥',color:pick(['#E23C7A','#F77BAA','#D9478A']),size:rand(14,22),dx:rand(-45,45),life:1100}); break;
    case 'sparkles': for(let i=0;i<8;i++) spawn(x,y,{cls:'burst',text:pick(['✦','✧','⋆']),color:pick(['#8A6CF0','#FF8FC4','#5FCFAE','#F5B935']),size:rand(12,20),dx:rand(-70,70),dy:rand(-70,70),life:800}); break;
    case 'notes': for(let i=0;i<3;i++) spawn(x,y,{cls:'float',text:pick(['♪','♫','♩']),color:pick(['#FFB37C','#FFCCA6','#F6E7D7']),size:rand(16,24),dx:rand(-40,40),life:1300}); break;
  }
});
let fxW=innerWidth; addEventListener('resize',()=>{ if((innerWidth<700)!==(fxW<700)){ fxW=innerWidth; buildFx(); } });

let scTimer=null;   // gardé pour clearInterval(scTimer) dans route()
/* ---- Scène plein écran de l'accueil (thèmes Coopô et Sombre) ---- */
function coopoSceneHTML(){
  let seed=7; const rnd=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
  // étoiles
  let stars=''; for(let i=0;i<70;i++){ const x=(rnd()*1600).toFixed(0), y=(rnd()*430).toFixed(0), r=(rnd()*1.6+.4).toFixed(1);
    stars+=`<circle class="cs-star" cx="${x}" cy="${y}" r="${r}" style="animation-delay:${(rnd()*4).toFixed(2)}s"/>`; }
  // ville au loin, fenêtres allumées
  let city='', wins=''; let x=560;
  const towers=[[46,150],[30,110],[58,205],[36,135],[70,250],[40,170],[52,120],[34,190],[62,140],[44,215],[30,100],[56,165],[40,125]];
  towers.forEach(([w,h],i)=>{ const y=600-h; city+=`<rect x="${x}" y="${y}" width="${w}" height="${h+40}" rx="3"/>`;
    if(i===4) city+=`<rect x="${x+w/2-2}" y="${y-46}" width="4" height="46"/><circle class="cs-blink" cx="${x+w/2}" cy="${y-48}" r="4"/>`;
    for(let wy=y+12; wy<590; wy+=16) for(let wx=x+7; wx<x+w-8; wx+=12) if(rnd()>.62) wins+=`<rect class="${rnd()>.85?'cs-win cs-win-b':'cs-win'}" x="${wx}" y="${wy}" width="5" height="7" rx="1"/>`;
    x+=w+10; });
  // antennes relais
  const mast=(mx,my,s)=>`<g transform="translate(${mx} ${my}) scale(${s})"><path d="M-14 0 L0 -150 L14 0 M-9 -45 H9 M-6 -90 H6 M-11 -20 L8 -70 M11 -20 L-8 -70" fill="none" stroke-width="3"/><circle class="cs-blink" cx="0" cy="-154" r="5"/><path class="cs-wave" d="M-22 -168 Q0 -186 22 -168 M-34 -176 Q0 -204 34 -176" fill="none" stroke-width="3"/></g>`;
  // baobab
  const baobab=(bx,by,s)=>`<g transform="translate(${bx} ${by}) scale(${s})"><path d="M-16 0 C-14 -40 -20 -70 -12 -96 C-26 -104 -44 -112 -52 -128 M-12 -96 C-10 -112 -16 -126 -8 -140 M-12 -96 C2 -104 6 -118 4 -136 M-12 -96 C10 -96 30 -104 44 -122 M16 0 C14 -40 18 -70 12 -96 L-12 -96 Z" stroke-width="7" stroke-linecap="round"/><ellipse cx="-52" cy="-134" rx="22" ry="11"/><ellipse cx="-8" cy="-148" rx="18" ry="10"/><ellipse cx="6" cy="-142" rx="20" ry="10"/><ellipse cx="46" cy="-128" rx="24" ry="12"/></g>`;
  // petites maisons
  const house=(hx,hy)=>`<g transform="translate(${hx} ${hy})"><rect x="-22" y="-26" width="44" height="26" rx="2"/><path d="M-28 -24 L0 -46 L28 -24 Z"/><rect class="cs-win" x="-12" y="-18" width="9" height="9" rx="1"/><rect class="cs-win cs-win-b" x="4" y="-18" width="9" height="9" rx="1"/></g>`;
  // lucioles
  let flies=''; for(let i=0;i<16;i++){ flies+=`<circle class="cs-fly" cx="${(rnd()*1600).toFixed(0)}" cy="${(620+rnd()*200).toFixed(0)}" r="${(rnd()*2+2).toFixed(1)}" style="animation-delay:${(rnd()*6).toFixed(2)}s;animation-duration:${(5+rnd()*5).toFixed(1)}s"/>`; }
  // herbes hautes du premier plan (side 0 = gauche, 1 = droite)
  const blades=side=>{ const B=side?[[1600,1500,560,40],[1580,1430,640,34],[1560,1380,700,30],[1620,1530,690,34],[1540,1330,760,26],[1600,1460,740,30],[1520,1300,810,22],[1580,1410,800,24]]
      :[[0,100,560,40],[20,170,640,34],[40,220,700,30],[-20,70,690,34],[60,270,760,26],[0,140,740,30],[80,300,810,22],[20,190,800,24]];
    return B.map(([bx,tx,ty,w],i)=>{ const cx=(bx+tx)/2+(side?40:-40), cy=(900+ty)/2; return `<path class="${i%2?'cs-fg2':'cs-fg'}" d="M${bx-w} 900 Q${cx-w*.3} ${cy} ${tx} ${ty} Q${cx+w*.6} ${cy+20} ${bx+w} 900 Z"/>`; }).join('')
      + (side?'<circle class="cs-flower" cx="1500" cy="560" r="9"/><circle class="cs-flower" cx="1330" cy="760" r="7"/>':'<circle class="cs-flower" cx="100" cy="560" r="9"/><circle class="cs-flower" cx="270" cy="760" r="7"/>'); };
  return `<div class="cscene" aria-hidden="true">
  <svg class="cs-l cs-sky" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <defs><radialGradient id="csSun"><stop offset="0" stop-color="#E4FF7A"/><stop offset=".45" stop-color="#D4FF3F" stop-opacity=".55"/><stop offset="1" stop-color="#D4FF3F" stop-opacity="0"/></radialGradient></defs>
    <g class="cs-stars">${stars}</g>
    <circle cx="1210" cy="250" r="190" fill="url(#csSun)" class="cs-glow"/>
    <circle cx="1210" cy="250" r="62" class="cs-sun"/>
    <g class="cs-clouds"><path d="M120 210 q40 -40 90 -12 q30 -34 76 -6 q44 -6 52 30 Z"/><path d="M820 150 q30 -28 70 -8 q26 -26 62 -4 q34 -2 40 24 Z"/><path d="M1380 380 q30 -30 72 -10 q24 -24 60 -2 q32 0 38 26 Z"/></g>
  </svg>
  <svg class="cs-l cs-far" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <g class="cs-city">${city}</g><g>${wins}</g>
    <path class="cs-hill1" d="M0 640 C180 560 330 600 470 560 C640 512 760 590 930 566 C1110 540 1260 600 1400 570 C1500 552 1560 560 1600 556 V900 H0 Z"/>
  </svg>
  <svg class="cs-l cs-mid" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <g class="cs-mast">${mast(1040,640,1)}${mast(1290,662,.8)}${mast(300,676,.7)}</g>
    <path class="cs-hill2" d="M0 700 C160 650 300 690 460 662 C640 630 780 700 980 680 C1180 660 1300 700 1460 672 C1530 660 1570 664 1600 662 V900 H0 Z"/>
    <g class="cs-tree">${baobab(190,700,1.05)}${baobab(1440,690,.85)}${baobab(760,712,.6)}</g>
    <g class="cs-house">${house(560,690)}${house(626,696)}${house(1180,704)}</g>
  </svg>
  <svg class="cs-l cs-near" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <path class="cs-hill3" d="M0 780 C200 740 380 770 600 752 C820 734 980 778 1200 760 C1380 746 1500 764 1600 756 V900 H0 Z"/>
    <g>${flies}</g>
  </svg>
  <svg class="cs-l cs-front" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
    <g class="cs-sway">${blades(0)}</g>
    <g class="cs-sway cs-sway-r">${blades(1)}</g>
  </svg>
</div>`;
}
/* ---- Décor immersif : le dessin du thème derrière toute l'appli (une seule fois par thème, il reste en place d'une page à l'autre) ---- */
// Cadrage : pour chaque thème, f = le point d'intérêt du dessin (dans ses propres unités), t = l'endroit de l'écran où le placer (0 à 1, largeur puis hauteur).
// Le sujet est placé vers la droite : la gauche reste calme pour le bonjour et les titres. flip : dessin en miroir.
const WORLD_VIEW = {
  defaut:{ f:[1210,255], t:[.56,.12], zoom:1.25, tw:[.5,.1] }, sombre:{ f:[1210,255], t:[.56,.12], zoom:1.25, tw:[.5,.1] },
  samurai:{ f:[590,230], t:[.62,.36] }, soft:{ f:[600,300], t:[.5,.5] }, lofi:{ f:[900,160], t:[.6,.3] }, esth:{ f:[500,275], t:[.66,.42] },
  ocean:{ f:[1040,60], t:[.833,.1] },    // Lotus (id ocean) : les nénuphars dans le coin en haut à droite
};
function frameWorld(){ ['w-art','w-art-top'].forEach(frameArt); }   // le dessin, et la couche du dessus (les nénuphars du thème Océan) cadrée pareil
function frameArt(artId){
  const el=document.getElementById(artId); if(!el) return; const W=el.clientWidth, H=el.clientHeight; if(!W||!H) return;
  const v=WORLD_VIEW[el.dataset.skin]||{f:[600,320],t:[.5,.5]}, wide=W>H*1.5, t=(wide&&v.tw)||v.t, zoom=wide?(v.zoomw||1):(v.zoom||1);
  el.querySelectorAll(':scope > svg, :scope > .cscene > svg').forEach(svg=>{
    let vb=svg.dataset.vb; if(!vb){ vb=svg.getAttribute('viewBox'); if(!vb) return; svg.dataset.vb=vb; }
    const [,,VW,VH]=vb.split(/\s+/).map(Number); if(!VW||!VH) return;
    const k=Math.max(W/VW,H/VH)*zoom, w=W/k, h=H/k;
    const x=Math.min(Math.max(v.f[0]-t[0]*w,0),VW-w), y=Math.min(Math.max(v.f[1]-t[1]*h,0),VH-h);
    svg.setAttribute('viewBox',`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`); svg.setAttribute('preserveAspectRatio','xMidYMid slice');
  });
  el.style.transform=v.flip?'scaleX(-1)':'';
}
/* Le sol du monde, dessiné à la volée à la largeur de l'écran (silhouettes sombres + quelques touches de la couleur du thème).
   Tout ce qui est clair ou détaillé reste dans le bas (y > 205) : au-dessus, là où passent les liens du bas de page, le dessin reste discret. */
function groundSVG(id,W){
  W=Math.round(Math.max(420,Math.min(1500,W||1200)));
  const R=rng(57), H=320, q=W/1200, n0=v=>v.toFixed(0), dk=a=>`rgba(0,0,0,${a})`, lt=a=>`rgba(255,255,255,${a})`, cnt=n=>Math.max(4,Math.round(n*q));
  const hill=(y,amp,fill)=>{ let d=`M0 ${H} L0 ${y}`; for(let x=0;x<W;x+=150) d+=` Q${x+75} ${n0(y-amp+R()*amp*2)} ${x+150} ${n0(y+(R()-.5)*amp)}`; return `<path d="${d} L${W+150} ${H}Z" fill="${fill}"/>`; };
  const blades=(n,y0,hMin,hMax,fill)=>{ let d=''; for(let i=0;i<n;i++){ const x=R()*W, h=hMin+R()*(hMax-hMin), w=3+R()*5, lean=(R()-.5)*26; d+=`M${n0(x-w)} ${y0} Q${n0(x+lean*.4)} ${n0(y0-h*.6)} ${n0(x+lean)} ${n0(y0-h)} Q${n0(x+lean*.5+w)} ${n0(y0-h*.5)} ${n0(x+w)} ${y0}Z`; } return `<path d="${d}" fill="${fill}"/>`; };
  let s='';
  if(id==='defaut'||id==='sombre'){
    const tree=(x,y,k)=>`<g transform="translate(${n0(x)} ${y}) scale(${k})" fill="${dk(.34)}" stroke="${dk(.34)}"><path d="M-9 0C-8-24-12-42-7-58C-16-63-26-67-31-77M-7-58C-6-67-10-76-5-84M-7-58C1-63 4-71 2-82M-7-58C6-58 18-63 26-73M9 0C8-24 11-42 7-58L-7-58Z" stroke-width="4" stroke-linecap="round"/><ellipse cx="-31" cy="-81" rx="14" ry="7"/><ellipse cx="-5" cy="-89" rx="11" ry="6"/><ellipse cx="4" cy="-85" rx="12" ry="6"/><ellipse cx="28" cy="-77" rx="15" ry="7"/></g>`;
    const house=(x,y)=>`<g transform="translate(${n0(x)} ${y})"><path d="M-13-17h30v17h-30zM-19-16L0-31L19-16Z" fill="${dk(.38)}"/><rect x="-9" y="-12" width="6" height="6" rx="1" fill="#D4FF3F" opacity=".8"/><rect x="3" y="-12" width="6" height="6" rx="1" fill="#D4FF3F" opacity=".55"/></g>`;
    s+=hill(168,18,dk(.13))+hill(214,16,dk(.19))+tree(W*.14,258,.95)+tree(W*.88,254,1.1)+house(W*.36,262)+house(W*.36+44,266)+(W>700?house(W*.66,260)+tree(W*.55,262,.6):'')+hill(264,12,dk(.27));
    for(let i=0;i<cnt(16);i++) s+=`<circle cx="${n0(R()*W)}" cy="${n0(212+R()*96)}" r="${(1.6+R()*2).toFixed(1)}" fill="#D4FF3F" opacity="${(.35+R()*.5).toFixed(2)}"/>`;
    s+=blades(cnt(40),H,22,62,dk(.32));
  } else if(id==='samurai'){
    for(let row=0;row<6;row++){ const y=96+row*44; for(let x=-60;x<W+60;x+=110){ const cx=x+(row%2?55:0), o=row<3?.6:1;
      s+=`<g transform="translate(${cx} ${y})"><circle r="54" fill="${dk(.1+row*.035)}" stroke="rgba(244,236,225,${(.24*o).toFixed(2)})" stroke-width="1.6"/><circle r="38" fill="none" stroke="rgba(244,236,225,${(.17*o).toFixed(2)})" stroke-width="1.6"/><circle r="22" fill="none" stroke="rgba(244,236,225,${(.12*o).toFixed(2)})" stroke-width="1.6"/></g>`; } }
  } else if(id==='soft'){
    const pinks=['#F7A1C4','#F27FAE','#E85C97','#FFC6DB','#D9478A'];
    for(let i=0;i<cnt(20);i++){ const x=R()*W, y=190+R()*150; s+=`<ellipse cx="${n0(x)}" cy="${n0(y)}" rx="${n0(26+R()*30)}" ry="${n0(9+R()*8)}" transform="rotate(${n0(R()*180)} ${n0(x)} ${n0(y)})" fill="rgba(20,70,40,.42)"/>`; }
    for(let i=0;i<cnt(30);i++){ const cx=R()*W, cy=232+R()*110, rr=14+R()*30; for(let j=0;j<9;j++){ const a=R()*6.283, d=R()*rr; s+=`<circle cx="${n0(cx+Math.cos(a)*d)}" cy="${n0(cy+Math.sin(a)*d)}" r="${n0(7+R()*12)}" fill="${pinks[(R()*5)|0]}" opacity="${(.55+R()*.35).toFixed(2)}"/>`; } }
  } else if(id==='lofi'){
    s+=hill(176,16,'rgba(140,210,90,.13)')+hill(220,14,'rgba(110,190,70,.2)')+hill(262,10,'rgba(70,150,50,.34)')+blades(cnt(120),H,22,70,'rgba(120,205,80,.4)')+blades(cnt(60),H,14,46,dk(.22));
    for(let i=0;i<cnt(26);i++){ const x=R()*W, y=232+R()*78; s+=`<circle cx="${n0(x)}" cy="${n0(y)}" r="${(2.6+R()*2.4).toFixed(1)}" fill="${['#FFFFFF','#FFE07A','#FFC6DB'][i%3]}" opacity=".8"/><circle cx="${n0(x)}" cy="${n0(y)}" r="1.2" fill="#F0A93B"/>`; }
  } else if(id==='esth'){
    const hy=252, sx=W*.78; s+=`<defs><linearGradient id="gSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8"/><stop offset="1" stop-color="#FF9FCB"/></linearGradient><clipPath id="gSunC"><rect x="0" y="0" width="${W}" height="${hy}"/></clipPath></defs>
      <circle cx="${n0(sx)}" cy="${hy}" r="42" fill="url(#gSun)" opacity=".85" clip-path="url(#gSunC)"/><rect x="0" y="${hy}" width="${W}" height="${H-hy}" fill="${dk(.18)}"/><path d="M0 ${hy}H${W}" stroke="${lt(.6)}" stroke-width="2"/>`;
    let g=''; for(let k=1;k<=7;k++){ const y=hy+Math.pow(k/7,1.8)*(H-hy); g+=`M0 ${n0(y)}H${W}`; } for(let i=-18;i<=18;i++) g+=`M${n0(W/2)} ${hy}L${n0(W/2+i*130)} ${H}`;
    s+=`<path d="${g}" stroke="${lt(.34)}" stroke-width="1.4" fill="none"/>`;
  } else if(id==='ocean'){
    // le bord de la mare, vu de dessus : galets sombres au fond, nénuphars en surface, un ou deux lotus (le clair reste en bas)
    s+=`<defs>${pondDefs('gp')}</defs>`;
    for(let i=0;i<cnt(16);i++){ const x=R()*W, y=262+R()*56; s+=`<ellipse cx="${n0(x)}" cy="${n0(y)}" rx="${n0(22+R()*40)}" ry="${n0(12+R()*16)}" transform="rotate(${n0(R()*40-20)} ${n0(x)} ${n0(y)})" fill="${dk(.16+R()*.14)}"/>`; }
    const np=cnt(10); for(let i=0;i<np;i++) s+=padSVG(n0((i+.2+R()*.6)/np*W), n0(216+R()*78), Math.round(13+R()*24), n0(R()*360), i%3, 'gp');   // un par tranche de largeur : ils ne se chevauchent pas
    s+=lotusSVG(n0(W*(.16+R()*.1)), 268, 15, 20, 'gp')+(W>700?lotusSVG(n0(W*(.72+R()*.1)), 254, 12, -15, 'gp'):'');
    for(let i=0;i<cnt(14);i++) s+=`<circle cx="${n0(R()*W)}" cy="${n0(205+R()*100)}" r="${(1.4+R()*1.8).toFixed(1)}" fill="#9FF3D2" opacity="${(.3+R()*.45).toFixed(2)}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${s}</svg>`;
}
function buildGround(){ try{ const g=document.getElementById('ground'); if(!g) return; const id=SKINS[S.skin]?S.skin:'defaut', w=g.clientWidth||innerWidth, h=g.clientHeight||260, key=id+':'+Math.round(w/40); if(g.dataset.key===key) return; g.dataset.key=key; g.innerHTML=groundSVG(id, w*320/h); }catch(e){ console.error(e); } }
function buildWorld(){
  const el=document.getElementById('w-art'); if(!el) return;
  const id=SKINS[S.skin]?S.skin:'defaut'; if(el.dataset.skin===id) return;
  el.dataset.skin=id;
  const top=document.getElementById('w-art-top');   // couche posée au-dessus du dessin (thème Océan : les nénuphars, sous lesquels passent les carpes) ; vide ailleurs
  try{ el.innerHTML = (id==='defaut'||id==='sombre') ? coopoSceneHTML() : SKINS[id].art();
    if(top){ top.dataset.skin=id; top.innerHTML = SKINS[id].artTop ? SKINS[id].artTop() : ''; }
    frameWorld(); }catch(e){ console.error(e); el.innerHTML=''; if(top) top.innerHTML=''; }
  buildGround(); worldLive(); worldScroll(true);
  document.documentElement.classList.add('world-on');
}
{ let wt=0; addEventListener('resize',()=>{ cancelAnimationFrame(wt); wt=requestAnimationFrame(()=>{ frameWorld(); buildGround(); worldScroll(true); }); }); }
// Quand on fait défiler la page, la « caméra » monte dans le décor et avance un peu (coupé en mode léger).
// Thèmes Coopô et Sombre : le dessin est fait de plusieurs plans, chacun bouge à sa vitesse (le ciel presque pas, l'herbe du premier plan plus vite).
const WORLD_LAYERS={ 'cs-sky':[.22,0], 'cs-far':[.15,0], 'cs-mid':[.08,0], 'cs-near':[.03,0], 'cs-front':[-.1,.0004] };
let _wLast=-1, _wTick=false, _wH=0, _wLayers=null, _wCam2=null;
function worldScroll(force){
  _wTick=false; const w=document.getElementById('world'); if(!w) return;
  const r=document.documentElement, y=NAVX.under&&NAVX.from?NAVX.y:window.scrollY; r.classList.toggle('scrolled', y>10);   // v18 — dans une conversation, le décor reste où était la page d'avant (on la revoit en glissant)
  const par=!reduced(); if(r.classList.contains('world-par')!==par) r.classList.toggle('world-par',par);
  const cam=w.firstElementChild; if(force||!_wH){ _wH=(cam&&cam.offsetHeight)||400; _wLayers=[...w.querySelectorAll('.cs-l')].map(l=>[l,WORLD_LAYERS[[...l.classList].find(c=>WORLD_LAYERS[c])]]).filter(x=>x[1]); _wCam2=document.querySelector('#world-top > .w-cam'); }
  POND.sync();   // thème Océan : les carpes ne nagent que lorsqu'on voit l'eau, et s'arrêtent dans les autres thèmes (appelée ici car on passe par cette fonction à chaque changement de thème, de mode léger, de taille et de défilement)
  // la caméra descend deux fois moins vite que la page, jusqu'à ce que le dessin soit sorti de l'écran : ensuite on est « dans » le monde
  const sy=par?Math.min(Math.max(y,0),_wH*2.4):0; if(sy===_wLast&&!force) return; _wLast=sy;
  const z=Math.min(sy,600);
  if(cam) cam.style.transform=sy?`translate3d(0,${(-sy*.5).toFixed(1)}px,0) scale(${(1+z*.00028).toFixed(4)})`:'';
  if(_wCam2&&S.skin==='ocean') _wCam2.style.transform=cam?cam.style.transform:'';   // la couche du dessus (nénuphars) suit la même caméra
  _wLayers.forEach(([l,k])=>{ l.style.transform=z?`translate3d(0,${(z*k[0]).toFixed(1)}px,0)`+(k[1]?` scale(${(1+z*k[1]).toFixed(4)})`:''):''; });
}
window.addEventListener('scroll',()=>{ if(!_wTick){ _wTick=true; requestAnimationFrame(()=>worldScroll()); } },{passive:true});
// Appareil puissant (ordinateur, iPhone, Android avec beaucoup de mémoire) : le dessin lui-même est animé en haut de page
const WORLD_FAST=(()=>{ try{ const m=navigator.deviceMemory; return m ? m>=8 : (navigator.hardwareConcurrency||4)>=4; }catch(e){ return false; } })();
function worldLive(){ document.documentElement.classList.toggle('world-live', WORLD_FAST && !reduced()); }
/* ---- Illustration : Océan (une mare vue de dessus) ----
   pondSVG : l'eau (lumière vers le centre, reflets, ombre des feuilles au fond, points lumineux)
   pondTopSVG : les nénuphars et les lotus, posés AU-DESSUS des carpes (voir POND) : elles passent dessous.
   Tout est placé à droite : la gauche reste calme pour le bonjour et les titres. */
const POND_PADS=[ [1040,54,70,205,0],[1120,168,48,330,1],[931,29,26,120,2],[1062,238,38,80,1],[905,96,19,250,0],[1168,300,36,150,2],[520,34,18,20,1] ];   // x, y, rayon, sens de l'encoche, teinte
const POND_LOTUS=[ [992,104,22,12],[1126,236,14,-30] ];   // x, y, taille, rotation
// dégradés des feuilles (3 teintes) et des pétales ; gid : préfixe, pour que le décor et le bas de page aient chacun les leurs
const pondDefs = gid => [['#4ACB82','#27A866','#1A8C54'],['#33B074','#1E9160','#13744A'],['#7BD77F','#49B96A','#2F9A58']].map((c,i)=>
    `<radialGradient id="${gid}${i}"><stop offset="0" stop-color="${c[0]}"/><stop offset=".62" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>`).join('')
  +`<linearGradient id="${gid}p" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF5F9B"/><stop offset=".55" stop-color="#FF8DB8"/><stop offset="1" stop-color="#FFD3E2"/></linearGradient>`;
// Un nénuphar vu de dessus : un disque vert avec une encoche, ses nervures, un reflet en haut à gauche et un bord sombre en bas à droite. bob : [durée, décalage] du léger balancement
function padSVG(x,y,r,rot,tone,gid,bob){
  const a=.2, c=(Math.cos(a)*r).toFixed(1), s=(Math.sin(a)*r).toFixed(1), f=n=>n.toFixed(1); let v='';
  for(let k=1;k<9;k++){ const t=a+k*(Math.PI*2-2*a)/9; v+=`M0 0L${f(Math.cos(t)*r*.9)} ${f(Math.sin(t)*r*.9)}`; }
  return `<g transform="translate(${x} ${y})"><g${bob?` class="pd-bob" style="--d:${bob[0]}s;--dl:${bob[1]}s"`:''}>
    <g transform="rotate(${rot})"><path d="M0 0L${c} ${s}A${r} ${r} 0 1 1 ${c} -${s}Z" fill="url(#${gid}${tone})"/><path d="${v}" stroke="rgba(255,255,255,.16)" stroke-width="${f(Math.max(1,r*.022))}" fill="none" stroke-linecap="round"/></g>
    <path d="M${f(-r*.94)} ${f(-r*.16)}A${f(r*.95)} ${f(r*.95)} 0 0 1 ${f(-r*.16)} ${f(-r*.94)}" stroke="rgba(255,255,255,.34)" stroke-width="${f(Math.max(1.2,r*.035))}" fill="none" stroke-linecap="round"/>
    <path d="M${f(r*.94)} ${f(r*.16)}A${f(r*.95)} ${f(r*.95)} 0 0 1 ${f(r*.16)} ${f(r*.94)}" stroke="rgba(3,40,30,.2)" stroke-width="${f(Math.max(1.2,r*.04))}" fill="none" stroke-linecap="round"/>
    <circle r="${f(Math.max(1.2,r*.045))}" fill="rgba(255,255,255,.32)"/></g></g>`;
}
// Une fleur de lotus vue de dessus : deux rangs de pétales roses, un cœur jaune, et son ombre
function lotusSVG(x,y,r,rot,gid){
  const f=n=>n.toFixed(1); let o='', i='';
  for(let k=0;k<8;k++) o+=`<ellipse rx="${f(r*.3)}" ry="${f(r*.56)}" cy="${f(-r*.5)}" transform="rotate(${k*45})"/>`;
  for(let k=0;k<6;k++) i+=`<ellipse rx="${f(r*.22)}" ry="${f(r*.4)}" cy="${f(-r*.3)}" transform="rotate(${k*60+30})"/>`;
  return `<g transform="translate(${x} ${y})"><circle cx="${f(r*.12)}" cy="${f(r*.16)}" r="${f(r*1.02)}" fill="rgba(2,30,40,.24)"/>
    <g transform="rotate(${rot})"><g fill="url(#${gid}p)" stroke="rgba(200,50,110,.28)" stroke-width=".6">${o}</g><g fill="#FFDCE8" stroke="rgba(225,90,140,.3)" stroke-width=".5">${i}</g>
    <circle r="${f(r*.2)}" fill="#FFD25A" stroke="#F0A52B" stroke-width="${f(r*.05)}"/></g></g>`;
}
function pondSVG(){
  const R=rng(41), f=n=>n.toFixed(0); let glow='', lines='', sh='', dots='';
  // reflets : de longues taches de lumière, presque à plat
  for(let i=0;i<10;i++){ const x=R()*1200, y=30+R()*560, rx=110+R()*230, ry=7+R()*15; glow+=`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#pwl)" opacity="${(.35+R()*.5).toFixed(2)}" transform="rotate(${(R()*14-7).toFixed(1)} ${f(x)} ${f(y)})"/>`; }
  // rides fines à la surface
  for(let i=0;i<8;i++){ const x=R()*1000, y=50+R()*520, w=150+R()*260; lines+=`<path d="M${f(x)} ${f(y)}q${f(w*.25)} ${f(-5-R()*8)} ${f(w*.5)} 0t${f(w*.5)} 0" fill="none" stroke="rgba(190,236,255,.1)" stroke-width="${(1.4+R()*2).toFixed(1)}" stroke-linecap="round"/>`; }
  // l'ombre des feuilles et des fleurs, au fond de l'eau
  POND_PADS.forEach(([x,y,r])=>{ sh+=`<circle cx="${f(x+r*.22)}" cy="${f(y+r*.3)}" r="${f(r*1.12)}" fill="url(#pws)"/>`; });
  POND_LOTUS.forEach(([x,y,r])=>{ sh+=`<circle cx="${f(x+r*.3)}" cy="${f(y+r*.4)}" r="${f(r*1.2)}" fill="url(#pws)"/>`; });
  // points lumineux
  for(let i=0;i<36;i++) dots+=`<circle cx="${f(R()*1200)}" cy="${f(R()*640)}" r="${(1+R()*2.2).toFixed(1)}" fill="${i%5?'#9FF3D2':'#DDFBFF'}" opacity="${(.25+R()*.5).toFixed(2)}"/>`;
  return svgWrap(`<rect width="1200" height="640" fill="url(#pw)"/>${glow}${lines}${sh}${dots}`,
    `<radialGradient id="pw" cx="68%" cy="38%" r="82%"><stop offset="0" stop-color="#2393BB"/><stop offset=".26" stop-color="#16729E"/><stop offset=".58" stop-color="#0C4C7A"/><stop offset="1" stop-color="#083457"/></radialGradient>
     <radialGradient id="pwl"><stop offset="0" stop-color="#D8F6FF" stop-opacity=".2"/><stop offset="1" stop-color="#D8F6FF" stop-opacity="0"/></radialGradient>
     <radialGradient id="pws"><stop offset="0" stop-color="#021C30" stop-opacity=".42"/><stop offset=".7" stop-color="#021C30" stop-opacity=".3"/><stop offset="1" stop-color="#021C30" stop-opacity="0"/></radialGradient>`);
}
function pondTopSVG(){
  const R=rng(53); let s='';
  [[1004,152,4],[989,163,3],[1152,112,4],[884,58,3.5],[1092,98,3],[1034,292,4],[944,182,3],[1142,262,3.5],[560,60,3]].forEach(([x,y,r])=>{ s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="#5FD489" opacity=".85"/>`; });   // lentilles d'eau
  POND_PADS.forEach(([x,y,r,rot,tone])=>{ s+=padSVG(x,y,r,rot,tone,'pl',[(9+R()*6).toFixed(1),(R()*9).toFixed(1)]); });
  s+=`<g transform="translate(960 66) rotate(-25)"><ellipse rx="6" ry="9.5" fill="url(#plp)" stroke="rgba(200,50,110,.3)" stroke-width=".6"/><path d="M0 -9.5V9.5" stroke="rgba(200,50,110,.35)" stroke-width=".8"/></g>`;   // un bouton de fleur
  POND_LOTUS.forEach(([x,y,r,rot])=>{ s+=lotusSVG(x,y,r,rot,'pl'); });
  return svgWrap(s, pondDefs('pl'));
}
/* ---- Les carpes koï du thème Océan ----
   Dessinées et animées sur le canevas #koi, posé entre l'eau et les nénuphars.
   Elles nagent seules. Quand le doigt ou la souris passe sur l'eau (pas sur une carte ni un bouton), elles viennent et tournent autour, puis repartent.
   Un appui sur l'eau fait un rond et les attire plus vite.
   Trois façons de les afficher (voir sync) :
   - « live » (mode normal) : canevas fixe, plein écran. Sur téléphone, il s'arrête dès qu'on descend dans la page (on ne voit plus l'eau : on économise la batterie).
   - « eco » (mode léger) : 3 carpes seulement, dans la bande du haut de page (le canevas défile avec elle), 30 images par seconde, sans ombres floues.
   - « still » (« réduire les animations » demandé par l'appareil, ou appareil qui peine) : 2 ou 3 carpes immobiles en haut de page, dessinées une seule fois.
   Si l'appareil peine (moins de 24 images par seconde pendant plusieurs secondes, page au premier plan), on allège : ombres nettes, puis moins de carpes, puis l'image fixe.
   Quand la page revient au premier plan, on redonne sa chance à l'animation (3 fois au plus). */
const POND=(()=>{
  const TAU=Math.PI*2, NB=11, NT=4, N=NB+NT;                      // points de la colonne : 11 pour le corps, 4 pour la queue
  const PROF=[.5,.82,.96,1,.97,.89,.76,.6,.44,.31,.22];           // largeur du corps, du museau à la base de la queue
  const TW=[0,.42,.8,1,.9];                                       // largeur de la nageoire de la queue
  const AMP=[], PHS=[]; for(let i=0;i<N;i++){ const s=i/(NB-1); AMP.push(.012+.05*Math.pow(s,2.2)); PHS.push(5*s); }   // l'ondulation grandit vers la queue
  const WATER='#0F5E8A';
  const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const turnTo=(a,b)=>{ let d=(b-a)%TAU; if(d>Math.PI) d-=TAU; else if(d<-Math.PI) d+=TAU; return d; };
  const ch=(h,i)=>parseInt(h.slice(i,i+2),16);
  const mix=(h,g,t)=>'#'+[1,3,5].map(i=>Math.round(ch(h,i)+(ch(g,i)-ch(h,i))*t).toString(16).padStart(2,'0')).join('');
  const rgba=(h,a)=>`rgba(${ch(h,1)},${ch(h,3)},${ch(h,5)},${a})`;
  // Variétés. pats : taches [place le long du corps (0 museau, 1 queue), côté (-1 à 1), taille, couleur]
  const KINDS=[
    { base:'#FBF4EA', fin:'#FFF8EF', pats:[[.1,.05,.105,'#E8431C'],[.36,-.4,.125,'#E8431C'],[.44,.45,.08,'#EE5B24'],[.68,.1,.105,'#E8431C'],[.88,-.25,.055,'#EE5B24']] },   // kohaku : blanc et rouge
    { base:'#FAF2E6', fin:'#FFF6EA', pats:[[.14,.1,.1,'#E6461F'],[.5,-.15,.13,'#E6461F'],[.3,.6,.04,'#1D1C23'],[.62,.5,.045,'#1D1C23'],[.8,-.45,.035,'#1D1C23']] },         // sanke : blanc, rouge, points noirs
    { base:'#F7A91B', fin:'#FFCB62', pats:[[.3,0,.09,'#FFC64D'],[.62,0,.07,'#FFC64D']] },                                                                                 // ogon : doré
    { base:'#FCF7EF', fin:'#FFFAF2', pats:[[.1,0,.082,'#E2381B']] },                                                                                                      // tancho : blanc, rond rouge sur la tête
    { base:'#25242D', fin:'#55545F', pats:[[.13,.25,.1,'#EA4B20'],[.4,-.35,.115,'#F6EFE4'],[.62,.3,.1,'#EA4B20'],[.85,-.1,.06,'#F6EFE4']], dark:true },                   // showa : noir, rouge, blanc
    { base:'#FF7B1E', fin:'#FFB56E', pats:[[.3,0,.1,'#FF9C40']], fat:1.22, tail:1.45, twin:true, len:.72 },                                                               // poisson rouge : rond, grande queue double
    { base:'#F6EFE6', fin:'#FFF6EC', pats:[[.2,-.3,.11,'#F08A1D'],[.52,.3,.12,'#F08A1D'],[.8,-.1,.06,'#F08A1D']] },                                                       // blanc et orange
  ];
  const ORDER=[0,5,2,1,4,3,6], SIZES=[1,.8,.9,.7,.84,.62,.74];
  const BX=new Float32Array(32), BY=new Float32Array(32);         // points de contrôle du tracé en cours (réutilisés : aucune allocation à chaque image)
  let cv=null, ctx=null, W=0, H=0, dpr=1, fish=[], rings=[], raf=0, on=false, kind='', band=false, last=0, q=0, nf=0, ns=0, began=0, away=false, lives=3, hideT=0, bound=false, drawn=0, rsT=0, touch=false, calm=null;   // kind : '' (rien), 'live', 'eco' ou 'still' · band : le canevas est la bande du haut de page (il défile avec elle) et non l'écran entier
  const ptr={ x:0, y:0, at:-1e9, hit:-1e9 };
  // Y a-t-il quelque chose d'opaque (carte, bouton, barre) à cet endroit ? On remonte de l'élément jusqu'à la page.
  function dry(el){
    for(let n=el; n&&n.nodeType===1&&n!==document.body&&n!==document.documentElement; n=n.parentElement){ const cs=getComputedStyle(n), bg=cs.backgroundColor, m=/^rgba?\(([^)]+)\)$/.exec(bg);
      const a=m?(p=>p.length>3?parseFloat(p[3]):1)(m[1].split(/[,/]/)):(bg&&bg!=='transparent'?1:0);
      if(a>.2||cs.backgroundImage!=='none') return true; }
    return false; }
  // Le doigt est-il sur l'eau ? On ne recalcule que lorsque l'élément survolé change.
  let wetEl=null, wetOk=true;
  const wet=el=>{ if(el!==wetEl){ wetEl=el; wetOk=!dry(el); } return wetOk; };
  // Ce point de l'écran : 0 = une carte ou un bouton · 1 = de l'eau avec du texte ou une icône dessus · 2 = de l'eau libre
  function water(x,y){ const el=document.elementFromPoint(x,band?y-scrollY:y); if(!el||dry(el)) return 0;
    if(el.ownerSVGElement||/^(svg|img|canvas|video|input|select|textarea|button|a)$/i.test(el.tagName)) return 1;
    for(let n=el.firstChild;n;n=n.nextSibling) if(n.nodeType===3&&n.nodeValue.trim()) return 1;
    return 2; }
  const bandH=()=>{ if(_wH) return _wH; const c=document.querySelector('#world > .w-cam'); return (c&&c.offsetHeight)||400; };
  const vw=()=>document.documentElement.clientWidth||innerWidth;
  const longest=()=>clamp(W*.07,Math.min(66,W*.185),110);   // longueur de la plus grande carpe, selon la largeur de l'écran

  function make(K,len){
    const Lb=len*(K.len||1), depth=clamp((92-Lb)/92,0,.6), tint=c=>mix(c,WATER,depth*.3);
    const f={ K, Lb, hw:Lb*.128*(K.fat||1), tw:Lb*.17*(K.tail||1), depth, x:0, y:0, dir:0, v:0, ph:rnd(0,TAU), turn:0, amp:1, tx:0, ty:0, next:0,
      orbR:40, spin:1, cruise:rnd(26,36)*(.7+Lb/170), seg:[],
      px:new Float32Array(N), py:new Float32Array(N), dx:new Float32Array(N), dy:new Float32Array(N), nx:new Float32Array(N), ny:new Float32Array(N),
      base:tint(K.base), fin:rgba(tint(K.fin),.62), ray:rgba(tint(K.base),.5), pats:K.pats.map(p=>({ i:p[0]*(NB-1), s:p[1], r:p[2]*Lb, c:tint(p[3]) })) };
    const s=Lb/(NB-1), t=Lb*.36*(K.tail||1)/NT; for(let i=0;i<N;i++) f.seg.push(i<NB?s:t);
    return f;
  }
  // pose une carpe : la tête en (x, y), le corps derrière elle, légèrement courbé
  function pose(f,x,y,dir,bend){ f.x=x; f.y=y; f.dir=dir; let a=dir+Math.PI; f.px[0]=x; f.py[0]=y;
    for(let i=1;i<N;i++){ a+=bend||0; f.px[i]=f.px[i-1]+Math.cos(a)*f.seg[i]; f.py[i]=f.py[i-1]+Math.sin(a)*f.seg[i]; } }
  // un nouveau but de promenade : de préférence dans de l'eau libre (ni carte ni texte), le plus souvent dans le haut de l'écran
  function wander(f,now){ const m=40, top=band?H*.5:Math.max(m+60,Math.min(H*.46,340)), low=band?H*.56:H-m; let bx=W/2, by=top/2, best=-1;
    for(let k=0;k<7&&best<2;k++){ const x=rnd(m,W-m), y=Math.random()<.68?rnd(m,top):rnd(m,low); let s=water(x,y);
      if(s===2&&!(water(x-34,y)===2&&water(x+34,y)===2&&water(x,y-34)===2&&water(x,y+34)===2)) s=1.5;   // trop près d'une carte ou d'un texte
      if(s>best){ best=s; bx=x; by=y; } }
    f.tx=bx; f.ty=by; f.next=now+rnd(4200,9500); }
  function populate(){
    const n=kind==='eco'?3:(W<520?5:W<1100?6:7)-(q>=2?2:0), base=longest(), now=performance.now(), top=band?H*.5:Math.max(170,Math.min(H*.5,360)); fish=[];
    for(let i=0;i<n;i++){ const f=make(KINDS[ORDER[i%ORDER.length]],base*SIZES[i%SIZES.length]);   // elles sont déjà là, en haut de l'écran : le canevas apparaît en fondu
      pose(f,rnd(W*.06,W*.94),rnd(24,top),rnd(0,TAU),rnd(-.05,.05)); f.v=f.cruise; wander(f,now); fish.push(f); }
    fish.sort((a,b)=>a.Lb-b.Lb);   // les petites d'abord : elles sont plus au fond
    fish.forEach((f,i)=>{ f.orbR=34+i*base*.3; f.spin=i%2?-1:1; });   // autour du doigt : chacune son cercle, une sur deux dans l'autre sens
  }
  function step(f,dt,now){
    const follow=now-ptr.at<6000, hot=now-ptr.hit<1400; let hx, hy, vd=f.cruise;
    if(follow){ const ex=ptr.x-f.x, ey=ptr.y-f.y, d=Math.hypot(ex,ey)||1, over=d-f.orbR;
      if(over>90){ hx=ex/d; hy=ey/d; }   // loin du doigt : droit dessus
      else { const k=clamp(over/f.orbR*1.6,-1,1.6); hx=ey/d*f.spin+ex/d*k; hy=-ex/d*f.spin+ey/d*k; }   // tout près : en rond autour, en revenant vers son cercle
      vd=f.cruise*clamp(1.5+over/55,1.5,hot?6:4.2); }   // vite quand on est loin, on ralentit en arrivant
    else { if(now>f.next||Math.hypot(f.tx-f.x,f.ty-f.y)<30||f.x<-90||f.x>W+90||f.y<-90||f.y>H+90) wander(f,now);
      const ex=f.tx-f.x, ey=f.ty-f.y, d=Math.hypot(ex,ey)||1; hx=ex/d; hy=ey/d; }
    let sx=0, sy=0;   // on s'écarte des voisines trop proches
    for(const o of fish){ if(o===f) continue; const ex=f.x-o.x, ey=f.y-o.y, d=Math.hypot(ex,ey), r=(f.Lb+o.Lb)*.55; if(d<r&&d>.01){ const w=(r-d)/r; sx+=ex/d*w; sy+=ey/d*w; } }
    const d=turnTo(f.dir,Math.atan2(hy+sy*1.8,hx+sx*1.8)), agile=(follow?2.6:1.4)*(hot?1.5:1)*(.55+42/Math.max(42,f.Lb));
    const st=clamp(d,-agile*dt,agile*dt); f.dir+=st; f.turn+=(st/dt-f.turn)*Math.min(1,dt*6);
    vd*=1-Math.min(.45,Math.abs(d)*.25);                         // on ralentit dans les virages serrés
    f.v+=(vd-f.v)*Math.min(1,dt*(vd>f.v?2.4:1.1));               // on accélère vite, on se laisse glisser pour ralentir
    f.x+=Math.cos(f.dir)*f.v*dt; f.y+=Math.sin(f.dir)*f.v*dt;
    f.ph+=dt*(5+f.v*.08*(90/f.Lb)); f.amp+=(.55+Math.min(1.2,f.v/f.cruise*.42)-f.amp)*Math.min(1,dt*3);
    const px=f.px, py=f.py; px[0]=f.x; py[0]=f.y;   // le corps suit la tête, comme une chaîne
    for(let i=1;i<N;i++){ const ax=px[i]-px[i-1], ay=py[i]-py[i-1], m=Math.hypot(ax,ay)||1; px[i]=px[i-1]+ax/m*f.seg[i]; py[i]=py[i-1]+ay/m*f.seg[i]; }
  }
  // la forme du moment : la colonne ondule, puis on calcule la perpendiculaire en chaque point
  function geom(f){ const px=f.px, py=f.py, dx=f.dx, dy=f.dy, nx=f.nx, ny=f.ny, A=f.Lb*f.amp;
    for(let i=0;i<N;i++){ const a=i?i-1:0, b=i<N-1?i+1:i; let tx=px[a]-px[b], ty=py[a]-py[b]; const m=Math.hypot(tx,ty)||1, w=A*AMP[i]*Math.sin(f.ph-PHS[i]); dx[i]=px[i]-ty/m*w; dy[i]=py[i]+tx/m*w; }
    for(let i=0;i<N;i++){ const a=i?i-1:0, b=i<N-1?i+1:i, tx=dx[a]-dx[b], ty=dy[a]-dy[b], m=Math.hypot(tx,ty)||1; nx[i]=-ty/m; ny[i]=tx/m; } }
  // tracé fermé et lisse, qui passe près des points de contrôle
  function loop(c,m){ c.moveTo((BX[m-1]+BX[0])/2,(BY[m-1]+BY[0])/2); for(let j=0;j<m;j++){ const k=(j+1)%m; c.quadraticCurveTo(BX[j],BY[j],(BX[j]+BX[k])/2,(BY[j]+BY[k])/2); } c.closePath(); }
  function pathBody(c,f){ const dx=f.dx, dy=f.dy, nx=f.nx, ny=f.ny, h0=f.hw*PROF[0]*1.15; let m=0;
    BX[m]=dx[0]+ny[0]*h0; BY[m++]=dy[0]-nx[0]*h0;   // le museau
    for(let i=0;i<NB;i++){ const w=f.hw*PROF[i]; BX[m]=dx[i]+nx[i]*w; BY[m++]=dy[i]+ny[i]*w; }
    for(let i=NB-1;i>=0;i--){ const w=f.hw*PROF[i]; BX[m]=dx[i]-nx[i]*w; BY[m++]=dy[i]-ny[i]*w; }
    c.beginPath(); loop(c,m); }
  // la nageoire de la queue (side 0), ou l'un des deux voiles d'une queue double (side 1 ou -1)
  function pathTail(c,f,side){ const dx=f.dx, dy=f.dy, nx=f.nx, ny=f.ny, b=NB-1, tw=f.tw*(side?.62:1); let m=0;
    for(let j=0;j<=NT;j++){ const i=b+j, w=j?tw*TW[j]:f.hw*PROF[b], o=side*f.tw*.5*TW[j]; BX[m]=dx[i]+nx[i]*(o+w); BY[m++]=dy[i]+ny[i]*(o+w); }
    BX[m]=dx[N-2]+nx[N-2]*side*f.tw*.42; BY[m++]=dy[N-2]+ny[N-2]*side*f.tw*.42;   // l'échancrure
    for(let j=NT;j>=0;j--){ const i=b+j, w=j?tw*TW[j]:f.hw*PROF[b], o=side*f.tw*.5*TW[j]; BX[m]=dx[i]+nx[i]*(o-w); BY[m++]=dy[i]+ny[i]*(o-w); }
    c.beginPath(); loop(c,m); }
  // une nageoire du flanc : attachée au point i, tournée vers l'arrière et l'extérieur (th : son ouverture)
  function pathFin(c,f,i,side,len,th){ const ox=f.nx[i]*side, oy=f.ny[i]*side, bx=-f.ny[i], by=f.nx[i], hw=f.hw*PROF[i]*.8, X=f.dx[i]+ox*hw, Y=f.dy[i]+oy*hw;
    const c0=Math.cos(th), s0=Math.sin(th), c1=Math.cos(th+.6), s1=Math.sin(th+.6), c2=Math.cos(th-.4), s2=Math.sin(th-.4);
    c.beginPath(); c.moveTo(X,Y);
    c.quadraticCurveTo(X+(c1*bx+s1*ox)*len*.72,Y+(c1*by+s1*oy)*len*.72,X+(c0*bx+s0*ox)*len,Y+(c0*by+s0*oy)*len);
    c.quadraticCurveTo(X+(c2*bx+s2*ox)*len*.5,Y+(c2*by+s2*oy)*len*.5,X,Y); }
  function drawFish(f){ const c=ctx, dx=f.dx, dy=f.dy, nx=f.nx, ny=f.ny, L=f.Lb, dk=f.K.dark, flap=.14*Math.sin(f.ph*.5), tr=clamp(f.turn*.2,-.45,.45);
    c.fillStyle=f.fin;   // les nageoires, sous le corps
    pathFin(c,f,3,1,L*.27,.92+flap+tr); c.fill(); pathFin(c,f,3,-1,L*.27,.92+flap-tr); c.fill();
    pathFin(c,f,6,1,L*.15,1.1+flap*.6); c.fill(); pathFin(c,f,6,-1,L*.15,1.1+flap*.6); c.fill();
    if(f.K.twin){ pathTail(c,f,1); c.fill(); pathTail(c,f,-1); c.fill(); } else { pathTail(c,f,0); c.fill(); }
    c.strokeStyle=f.ray; c.lineWidth=.7; c.beginPath();   // les rayons de la queue
    for(let k=-1;k<=1;k++){ c.moveTo(dx[NB-1],dy[NB-1]); c.lineTo(dx[N-1]+nx[N-1]*k*f.tw*.55,dy[N-1]+ny[N-1]*k*f.tw*.55); } c.stroke();
    c.save(); pathBody(c,f); c.fillStyle=f.base; c.fill(); c.clip();   // le corps, puis ses taches (elles ne dépassent pas)
    for(const p of f.pats){ const i=p.i|0, j=Math.min(NB-1,i+1), t=p.i-i, o=f.hw*(PROF[i]+(PROF[j]-PROF[i])*t)*.8*p.s;
      c.beginPath(); c.ellipse(dx[i]+(dx[j]-dx[i])*t+nx[i]*o,dy[i]+(dy[j]-dy[i])*t+ny[i]*o,p.r*1.3,p.r*.92,Math.atan2(-nx[i],ny[i]),0,TAU); c.fillStyle=p.c; c.fill(); }
    pathBody(c,f); c.lineWidth=f.hw*.5; c.strokeStyle=dk?'rgba(0,0,0,.25)':'rgba(70,30,10,.13)'; c.stroke();   // un bord un peu plus sombre : le corps est rond
    c.beginPath(); c.moveTo(dx[1],dy[1]); for(let i=2;i<8;i++) c.lineTo(dx[i],dy[i]); c.lineWidth=f.hw*.4; c.lineCap='round'; c.strokeStyle=dk?'rgba(255,255,255,.1)':'rgba(255,255,255,.22)'; c.stroke();   // le reflet sur le dos
    c.restore();
    c.beginPath(); c.moveTo(dx[3],dy[3]); for(let i=4;i<8;i++) c.lineTo(dx[i],dy[i]); c.lineWidth=Math.max(1,f.hw*.13); c.lineCap='round'; c.strokeStyle=dk?'rgba(255,255,255,.16)':'rgba(40,24,18,.2)'; c.stroke();   // la nageoire du dos, vue de dessus : un trait
    const ex=dx[0]+(dx[1]-dx[0])*.3, ey=dy[0]+(dy[1]-dy[0])*.3, ew=f.hw*PROF[0]*.84, er=Math.max(.9,L*.017);   // les yeux
    c.fillStyle=dk?'#F4EFE6':'#10151B'; c.beginPath(); c.arc(ex+nx[0]*ew,ey+ny[0]*ew,er,0,TAU); c.moveTo(ex-nx[0]*ew+er,ey-ny[0]*ew); c.arc(ex-nx[0]*ew,ey-ny[0]*ew,er,0,TAU); c.fill();
  }
  function paint(now){ const c=ctx; c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,H);
    for(const f of fish) geom(f);
    c.fillStyle='rgba(2,18,34,.2)'; if(q<1&&kind==='live'&&!touch){ c.shadowColor='rgba(2,18,34,.32)'; c.shadowBlur=7*dpr; }   // les ombres au fond de l'eau, sous toutes les carpes (floues sur ordinateur seulement : le flou coûte cher sur téléphone)
    for(const f of fish){ const o=f.Lb*(.1+.08*(1-f.depth)); c.save(); c.translate(o*.7,o); pathBody(c,f); c.fill(); pathTail(c,f,0); c.fill(); c.restore(); }
    c.shadowColor='transparent'; c.shadowBlur=0;
    for(const f of fish) drawFish(f);
    for(let i=rings.length-1;i>=0;i--){ const r=rings[i]; let alive=false;   // les ronds dans l'eau, là où on a appuyé
      for(let k=0;k<2;k++){ const a=(now-r.t-k*170)/1100; if(a<0){ alive=true; continue; } if(a>=1) continue; alive=true;
        c.beginPath(); c.arc(r.x,r.y,9+62*(1-Math.pow(1-a,3)),0,TAU); c.lineWidth=1.6; c.strokeStyle=`rgba(214,244,255,${(.5*(1-a)).toFixed(3)})`; c.stroke(); }
      if(!alive) rings.splice(i,1); }
  }
  // Une image d'animation. 60 par seconde au plus quand on joue avec les carpes ; 30 suffisent quand personne ne touche l'eau, et en mode léger.
  function frame(t){ raf=0; if(!on) return; const gap=t-last; last=t;
    // L'appareil peine-t-il ? Sur 150 images, plus de 6 sur 10 arrivent en retard (moins de 24 par seconde) : on allège. On ne juge que si la page est restée
    // au premier plan (en arrière-plan, le navigateur la ralentit exprès : ce n'est pas l'appareil qui peine), et pas pendant les 3 premières secondes (chargement).
    if(gap<250&&t-began>3000){ nf++; if(gap>42) ns++; if(nf>=150){ const slow=ns>nf*.6&&!away&&document.hasFocus(); nf=ns=0; away=false; if(slow){ ease(); if(!on) return; } } }
    raf=requestAnimationFrame(frame);
    const since=t-drawn; if(since<(kind==='eco'||(t-ptr.at>7000&&!rings.length)?28:10)) return;   // trop tôt pour redessiner
    drawn=t; const dt=clamp(since/1000,.001,.05);
    for(const f of fish) step(f,dt,t); paint(t); }
  // De retour au premier plan après un allègement : on redonne sa chance à l'animation. 3 fois au plus : un appareil vraiment trop lent finit sur l'image fixe.
  function revive(){ nf=ns=0; away=false; if(S.skin==='ocean'&&q>0&&lives>0){ lives--; q=Math.max(0,q-2); fish=[]; began=performance.now(); sync(true); } }
  function ease(){ q=kind==='eco'?3:q+1; if(q===2){ size(true); fish.splice(0,Math.min(2,Math.max(0,fish.length-3))); } else if(q>=3) drawStill(); }
  function size(force){ const w=vw(), h=band?bandH():innerHeight;
    let d=Math.min(window.devicePixelRatio||1,kind==='still'?2:q>=2?1:(touch||band)?1.5:2); d=Math.max(.75,Math.min(d,Math.sqrt(4e6/(w*h||1))));   // jamais plus de 4 millions de points à redessiner (très grands écrans)
    if(!force&&w===W&&h===H&&d===dpr) return false; W=w; H=h; dpr=d; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); return true; }
  function halt(){ on=false; clearTimeout(hideT); hideT=0; if(raf) cancelAnimationFrame(raf); raf=0; }
  function layout(k){ kind=k; band=k!=='live'; cv.classList.toggle('band',band); }
  // l'image fixe. Les carpes sont posées là où il n'y a jamais de texte : tout en haut, entre les titres et les nénuphars (une partie du corps dessous).
  function drawStill(){ halt(); layout('still'); size(true); rings.length=0; const base=longest(), G=make(KINDS[5],base*.8), O=make(KINDS[2],base*.9), K=make(KINDS[0],base);
    if(W<700){ fish=[O,K]; pose(K,W*.6,20,Math.PI*1.02,.03); pose(O,W*.8,H*.5,-2.2,-.05); }   // téléphone : une qui sort de sous le grand nénuphar, une à droite du bonjour
    else { fish=[G,O,K]; pose(K,W*.56,42,Math.PI*1.03,.03); pose(O,W*.705,84,-.2,.02); pose(G,W*.955,78,2.4,.03); }
    fish.forEach(f=>{ f.ph=1.1; f.amp=.9; }); paint(0); cv.classList.add('on'); }
  function start(k){ clearTimeout(hideT); hideT=0; const fresh=kind!==k||!fish.length; layout(k); size(fresh); if(fresh) populate(); cv.classList.add('on');
    if(!on){ on=true; last=drawn=began=performance.now(); nf=ns=0; if(!raf) raf=requestAnimationFrame(frame); } }
  function pause(){ if(!on||hideT) return; cv.classList.remove('on'); hideT=setTimeout(()=>{ hideT=0; halt(); },650); }   // on laisse le fondu se terminer, puis on arrête tout
  function bind(){ if(bound) return; bound=true;
    const mq=()=>{ try{ touch=matchMedia('(pointer:coarse)').matches; }catch(e){ touch=false; } }; mq();
    const at=e=>{ const y=band?e.clientY+scrollY:e.clientY; if((band&&y>H*.8)||!wet(e.target)) return false; ptr.x=e.clientX; ptr.y=y; ptr.at=performance.now(); return true; };
    addEventListener('pointermove',e=>{ if(on) at(e); },{passive:true});
    addEventListener('pointerdown',e=>{ if(on&&at(e)){ ptr.hit=ptr.at; if(rings.length<5) rings.push({x:ptr.x,y:ptr.y,t:ptr.at}); } },{passive:true});
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) revive(); sync(); });
    addEventListener('blur',()=>{ away=true; }); addEventListener('focus',revive);
    addEventListener('hashchange',()=>setTimeout(sync,80));
    addEventListener('resize',()=>{ clearTimeout(rsT); rsT=setTimeout(()=>{ mq(); sync(true); },140); });
    try{ calm=matchMedia('(prefers-reduced-motion: reduce)'); calm.addEventListener('change',sync); }catch(e){} }
  // À appeler quand le thème, le mode léger, la page ou le défilement changent : met les carpes dans le bon état (ne lève jamais d'erreur).
  // resized : la fenêtre a changé de taille. Appelée à chaque défilement : quand rien ne change, elle ne touche à rien.
  function sync(resized){ try{
      if(S.skin!=='ocean'){ if(on||kind||hideT){ halt(); kind=''; fish=[]; if(cv){ cv.classList.remove('on'); if(ctx){ ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height); } } } return; }
      if(!cv){ cv=document.getElementById('koi'); ctx=cv&&cv.getContext('2d'); if(!ctx){ cv=null; return; } } bind();
      if(q>=3||(calm&&calm.matches)){ if(kind!=='still'||(resized&&(W!==vw()||H!==bandH()))) drawStill(); return; }
      const k=liteOn()?'eco':'live', narrow=innerWidth<1000;
      if(document.hidden || ((k==='eco'||narrow)&&scrollY>bandH()*.9) || (narrow&&document.querySelector('.chat-page'))) pause();
      else if(!on||hideT||kind!==k||resized) start(k);
    }catch(e){ console.error(e); } }
  return { sync, ptr, get running(){ return on; }, get kind(){ return kind; }, get fish(){ return fish; }, get level(){ return q; } };
})();
const SKINS = {
  defaut:{label:'Coopô',   desc:'Officiel : blanc, noir et citron',     sw:['#FFFFFF','#F4F4F5','#141416'], art:shapesSVG},
  samurai:{label:'Samouraï',  desc:'Rouge, crème et vagues japonaises', sw:['#C41E3A','#F4ECE1','#17110F'], art:samuraiSVG},
  soft:  {label:'Soft',       desc:'Rose pastel et fleurs',            sw:['#E9779E','#FFFFFF','#D9478A'], art:()=>bloomSVG()},
  lofi:  {label:'Lo-fi',      desc:'Ciel d\'été, nuages et herbes au vent', sw:['#1F86C2','#FFFFFF','#6CBF3A'], art:lofiSVG},
  esth:  {label:'Esthétique', desc:'Pastels et soleil rétro',          sw:['#C9B8FF','#FCFAFF','#8A6CF0'], art:esthSVG},
  sombre:{label:'Sombre',     desc:'La version nuit du thème officiel',             sw:['#000000','#141416','#F4F4F5'], art:shapesSVG},
  ocean: {label:'Lotus',      desc:'Nénuphars et carpes koï qui te suivent',     sw:['#0A3D62','#FFFFFF','#0B8452'], art:pondSVG, artTop:pondTopSVG},
};
