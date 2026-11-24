/* Coopô — js/apparence.js
   Polices des thèmes, changement de thème (applySkin), fond des conversations (motifs).
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* ---- Retour de paiement ---- */
const FONT_SPECS={"Zen Dots": "Zen+Dots", "Quicksand": "Quicksand:wght@500;600;700", "Righteous": "Righteous", "Nunito": "Nunito:wght@500;700", "Zen Maru Gothic": "Zen+Maru+Gothic:wght@500;700", "Syne": "Syne:wght@600;700;800", "DM Sans": "DM+Sans:wght@500;700", "Chakra Petch": "Chakra+Petch:wght@500;600;700", "Sora": "Sora:wght@500;600", "Outfit": "Outfit:wght@600;700", "Inter": "Inter:wght@400;500;600;700", "Anton": "Anton", "Source Sans 3": "Source+Sans+3:wght@400;600;700", "Noto Serif JP": "Noto+Serif+JP:wght@700", "Shippori Mincho B1": "Shippori+Mincho+B1:wght@700;800", "Zen Kaku Gothic New": "Zen+Kaku+Gothic+New:wght@400;500;700", "Fredoka": "Fredoka:wght@500;600;700"};
const SKIN_FONTS={"soft": ["Zen Dots", "Quicksand"], "lofi": ["Zen Maru Gothic", "Nunito"], "esth": ["Syne", "DM Sans"], "sombre": ["Outfit", "Inter"], "ocean": ["Fredoka", "Nunito"], "defaut": ["Outfit", "Inter"], "samurai": ["Anton", "Source Sans 3", "Noto Serif JP"]};
const _fontsLoaded=new Set();
function loadSkinFonts(id){ const list=(SKIN_FONTS[id]||[]).filter(f=>FONT_SPECS[f]&&!_fontsLoaded.has(f)); if(!list.length) return;
  list.forEach(f=>_fontsLoaded.add(f)); const l=document.createElement('link'); l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?'+list.map(f=>'family='+FONT_SPECS[f]).join('&')+'&display=swap'; document.head.appendChild(l); }
// Changement de thème en fondu : View Transitions quand le navigateur les gère (un seul fondu de toute la page, léger), sinon une courte transition des couleurs
function withSkinFade(fn){ const r=document.documentElement;
  if(reduced()) return fn();
  if(document.startViewTransition){ try{ r.classList.add('skin-vt'); const vt=document.startViewTransition(()=>{ fn(); }); vt.finished.catch(()=>{}).then(()=>r.classList.remove('skin-vt')); return; }catch(e){ r.classList.remove('skin-vt'); } }
  r.classList.add('skin-anim'); setTimeout(()=>r.classList.remove('skin-anim'),380); fn(); }
// opts.preview : aperçu (le choix du joueur n'est pas modifié) · opts.then : à faire une fois le thème en place (réafficher la page…)
/* ---- Fond des conversations : le motif du thème (v12), façon fond WhatsApp ----
   Coopô : petits dessins gaming · Sombre : galaxie · Samouraï : vagues japonaises · Soft : fleurs · Lo-fi : nuages et musique ·
   Esthétique : soleils rétro et étincelles · Lotus : nénuphars et poissons.
   Le motif est dessiné ici (aucune image à télécharger), aux couleurs du thème : un fond à peine teinté et des dessins à peine plus foncés
   (plus clairs sur un thème sombre), pour que les messages restent faciles à lire. Il ne bouge pas quand on fait défiler la conversation.
   Les dessins sont posés au hasard, mais toujours de la même façon, sur une tuile qui se raccorde à elle-même (la répétition ne se voit pas). */
const CHAT_MOTIF = { defaut:'doodles', sombre:'galaxie', samurai:'vagues', soft:'fleurs', lofi:'nuages', esth:'retro', ocean:'lotus' };
const CM_I = {
  arc:'<path d="M3.5 17.5a8.5 8.5 0 0 1 17 0M6.6 17.5a5.4 5.4 0 0 1 10.8 0M9.7 17.5a2.3 2.3 0 0 1 4.6 0"/>',
  ballon:'<circle cx="12" cy="12" r="8.5"/><path d="M12 8.2l3.2 2.3-1.2 3.8h-4l-1.2-3.8zM12 8.2V3.6M15.2 10.5l4.2-1.6M14 14.3l2.6 3.6M10 14.3l-2.6 3.6M8.8 10.5 4.6 8.9"/>',
  bulle:'<path d="M5 5.5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-7.5L7 20v-3H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z"/><path d="M8 11.2h.01M12 11.2h.01M16 11.2h.01" stroke-width="2.4"/>',
  cafe:'<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8.6 3.5c-.8 1 .8 1.8 0 3M12 3.5c-.8 1 .8 1.8 0 3"/>',
  carre:'<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  casque:'<path d="M4.5 14v-2.5a7.5 7.5 0 0 1 15 0V14"/><rect x="3.5" y="13" width="3.6" height="6" rx="1.6"/><rect x="16.9" y="13" width="3.6" height="6" rx="1.6"/>',
  cercle:'<circle cx="12" cy="12" r="2.6"/>',
  cible:'<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2"/>',
  coeur:'<path d="M12 20s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.6 4 4 0 0 1 19.5 10C19.5 15.4 12 20 12 20z"/>',
  comete:'<circle cx="16" cy="8" r="2.6"/><path d="M14 10 5 19M12.4 8.6 7 14M15.6 11.4 10.2 17"/>',
  couronne:'<path d="M4 8.5l4 3.5 4-6 4 6 4-3.5-1.6 9.5H5.6z"/><path d="M5.6 20.5h12.8"/>',
  croix:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  de:'<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01" stroke-width="2.6"/>',
  eclair:'<path d="M13.5 2.5 5.5 13.5h5.5l-1 8 8-11h-5.5z"/>',
  eclat:'<path d="M12 4c.6 4.2 3.8 7.4 8 8-4.2.6-7.4 3.8-8 8-.6-4.2-3.8-7.4-8-8 4.2-.6 7.4-3.8 8-8z"/>',
  etoile:'<path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  feuille:'<path d="M5 19C5 10.2 10.2 5 19 5c0 8.8-5.2 14-14 14z"/><path d="M5 19l8-8"/>',
  flamme:'<path d="M12 21.5a6.2 6.2 0 0 0 6.2-6.2c0-4.3-3.4-6.5-4.4-10.8-1.3 3-3.3 4.3-3.3 6.6-1.2-.8-2-2.1-2.2-3.2-2 2.2-2.5 4.6-2.5 7.4a6.2 6.2 0 0 0 6.2 6.2z"/>',
  fleur:'<circle cx="12" cy="12" r="2.3"/><path transform="rotate(0 12 12)" d="M12 9.7C9.3 8.6 8.7 4.8 12 3.2c3.3 1.6 2.7 5.4 0 6.5z"/><path transform="rotate(72 12 12)" d="M12 9.7C9.3 8.6 8.7 4.8 12 3.2c3.3 1.6 2.7 5.4 0 6.5z"/><path transform="rotate(144 12 12)" d="M12 9.7C9.3 8.6 8.7 4.8 12 3.2c3.3 1.6 2.7 5.4 0 6.5z"/><path transform="rotate(216 12 12)" d="M12 9.7C9.3 8.6 8.7 4.8 12 3.2c3.3 1.6 2.7 5.4 0 6.5z"/><path transform="rotate(288 12 12)" d="M12 9.7C9.3 8.6 8.7 4.8 12 3.2c3.3 1.6 2.7 5.4 0 6.5z"/>',
  fusee:'<path d="M12 2.8c3.2 2.4 4.6 5.8 4.1 10.2l-2 2.4h-4.2l-2-2.4C7.4 8.6 8.8 5.2 12 2.8z"/><circle cx="12" cy="9.2" r="1.6"/><path d="M7.9 13.1 5 16.5l3.6.3M16.1 13.1l2.9 3.4-3.6.3M10.6 18.2 12 21l1.4-2.8"/>',
  herbe:'<path d="M6 20c0-4 1-7 3-10M10.5 20c0-5 .6-9 2-13M15 20c0-3.6 1.4-6.4 4-9"/>',
  joystick:'<rect x="4.5" y="15" width="15" height="5.5" rx="2"/><path d="M12 15V8.5"/><circle cx="12" cy="6.2" r="2.6"/>',
  lotus:'<path d="M12 19c-2.2-2.6-2.2-7.4 0-11 2.2 3.6 2.2 8.4 0 11z"/><path d="M12 19c-3.4-.4-6.4-3.6-6.6-7.6 3 .6 5.4 3 6.6 7.6zM12 19c3.4-.4 6.4-3.6 6.6-7.6-3 .6-5.4 3-6.6 7.6z"/><path d="M7 19h10"/>',
  lune:'<path d="M15.5 4.5a8 8 0 1 0 4 12.8A6.5 6.5 0 0 1 15.5 4.5z"/>',
  manette:'<path d="M7.5 8.5h9a4.5 4.5 0 0 1 4.4 5.4l-.7 3.4a2.3 2.3 0 0 1-3.9 1.1L14.6 16H9.4l-1.7 2.4a2.3 2.3 0 0 1-3.9-1.1l-.7-3.4A4.5 4.5 0 0 1 7.5 8.5z"/><path d="M8.5 11.2v3M7 12.7h3"/><circle cx="15.6" cy="11.8" r=".7"/><circle cx="17.3" cy="13.6" r=".7"/>',
  nenuphar:'<path d="M12 12 18.8 6.7A8.6 8.6 0 1 1 12 3.4z"/><path d="M12 12 6.5 8.2M12 12l-1.6 6.8M12 12l5.8 3.4"/>',
  note:'<path d="M9 18.5V6.5l10-2v11.5"/><circle cx="6.8" cy="18.5" r="2.2"/><circle cx="16.8" cy="16" r="2.2"/>',
  nuage:'<path d="M7.2 18h10.3a3.8 3.8 0 0 0 .6-7.6 5.6 5.6 0 0 0-10.6-1.1A4.4 4.4 0 0 0 7.2 18z"/>',
  oiseau:'<path d="M3 11.5c2.4-2 5-2 7 .5 2-2.5 4.6-2.5 7-.5"/>',
  ondes:'<path d="M4 13a8 8 0 0 1 16 0M7.2 13a4.8 4.8 0 0 1 9.6 0M10.4 13a1.6 1.6 0 0 1 3.2 0"/>',
  papillon:'<path d="M12 8.2v9"/><path d="M12 10.2C9.6 6.2 4.6 5.2 4.1 8.6c-.4 3 3.2 4.5 7.9 3.4zM12 10.2c2.4-4 7.4-5 7.9-1.6.4 3-3.2 4.5-7.9 3.4zM12 12.6c-3.2.2-6 1.6-5.5 4 .4 1.9 3.5 1.4 5.5-2zM12 12.6c3.2.2 6 1.6 5.5 4-.4 1.9-3.5 1.4-5.5-2z"/>',
  piece:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5.2"/><path d="M12 9.6v4.8"/>',
  pizza:'<path d="M12 21 3.8 6.2A16 16 0 0 1 20.2 6.2z"/><path d="M5.6 9.3a13 13 0 0 1 12.8 0"/><circle cx="11" cy="11.6" r="1"/><circle cx="13.4" cy="15.2" r="1"/><circle cx="14.2" cy="10" r=".9"/>',
  planete:'<circle cx="12" cy="12" r="5.4"/><ellipse cx="12" cy="12" rx="10.4" ry="3.4" transform="rotate(-18 12 12)"/>',
  plus:'<path d="M12 8v8M8 12h8"/>',
  point:'<circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  poisson:'<path d="M3.5 12c2.6-3.6 6.8-5 11-3.2l3.4-2.3-.6 4 .6 4-3.4-2.3C10.3 14 6.1 13.6 3.5 12z"/><path d="M7 11.3h.01" stroke-width="2.2"/>',
  retro:'<path d="M3.5 16.5a8.5 8.5 0 0 1 17 0z"/><path d="M4.4 13.2h15.2M6.4 10.1h11.2"/><path d="M2.5 19.5h19"/>',
  rond:'<circle cx="12" cy="12" r="6.5"/>',
  smiley:'<circle cx="12" cy="12" r="8.5"/><path d="M8.6 14.2c.9 1.3 2 1.9 3.4 1.9s2.5-.6 3.4-1.9"/><path d="M9.3 9.8h.01M14.7 9.8h.01" stroke-width="2.4"/>',
  soleil:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
  tel:'<rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M11 18h2"/>',
  triangle:'<path d="M12 5 19 17H5z"/>',
  trophee:'<path d="M8 4h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 6H5.2a2.8 2.8 0 0 0 3.1 3.9M16 6h2.8a2.8 2.8 0 0 1-3.1 3.9M12 13.5v3.5M8.5 20.5h7M10 17h4v3.5h-4z"/>',
  tulipe:'<path d="M12 21v-8.2"/><path d="M12 12.8c-3.4 0-5.4-2.5-5.4-6.4l2.7 1.8L12 4.4l2.7 3.8 2.7-1.8c0 3.9-2 6.4-5.4 6.4z"/><path d="M12 18.4c-1.6-2-3.5-2.6-5.4-2.4.6 2.2 2.8 3.4 5.4 2.4zM12 17.2c1.4-1.8 3.1-2.4 4.9-2.2-.5 2-2.5 3.1-4.9 2.2z"/>',
  vinyle:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 6.2a5.8 5.8 0 0 1 5.8 5.8"/>'
};
const CM_SETS = {
  doodles:[['manette','eclair','coeur','casque','etoile','trophee','bulle','triangle','piece','flamme','de','fusee','smiley','croix','joystick','couronne','cible','pizza','rond','ballon','note','tel','carre','point','plus','point','cercle'],{size:360,count:70,minD:39,min:22,max:34,seed:11}],
  galaxie:[['planete','planete','eclat','eclat','lune','comete','etoile','point','point','point','plus','plus','cercle'],{size:340,count:58,minD:36,min:18,max:34,seed:23,rot:25}],
  lotus:[['nenuphar','nenuphar','lotus','ondes','poisson','point','cercle','point','lotus','ondes'],{size:340,count:44,minD:44,min:26,max:40,seed:31,rot:40}],
  fleurs:[['fleur','fleur','tulipe','coeur','eclat','feuille','papillon','point','cercle','coeur','fleur'],{size:340,count:52,minD:40,min:22,max:34,seed:41,rot:35}],
  nuages:[['nuage','nuage','note','soleil','herbe','oiseau','cafe','casque','vinyle','point','note','cercle'],{size:340,count:50,minD:42,min:22,max:34,seed:53,rot:18}],
  retro:[['retro','arc','eclat','eclat','coeur','etoile','lune','nuage','point','cercle','smiley','retro'],{size:340,count:52,minD:40,min:22,max:34,seed:67,rot:20}]
};
function cmScatter([list,o],col){ let x=o.seed; const rnd=()=>(x=(x*16807)%2147483647)/2147483647, S=o.size, pts=[]; let tries=0;
  while(pts.length<o.count&&tries<o.count*400){ tries++; const px=rnd()*S, py=rnd()*S;   // des points assez éloignés les uns des autres, en comptant les bords qui se raccordent
    if(pts.every(q=>{ let dx=Math.abs(q.x-px), dy=Math.abs(q.y-py); dx=Math.min(dx,S-dx); dy=Math.min(dy,S-dy); return dx*dx+dy*dy>=o.minD*o.minD; })) pts.push({x:px,y:py}); }
  const wraps=(cx,cy,r)=>{ const xs=[cx], ys=[cy]; if(cx-r<0) xs.push(cx+S); if(cx+r>S) xs.push(cx-S); if(cy-r<0) ys.push(cy+S); if(cy+r>S) ys.push(cy-S); const out=[]; xs.forEach(a=>ys.forEach(b=>out.push([a,b]))); return out; };
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round" color="${col}">`, bag=[];
  pts.forEach(pt=>{ if(!bag.length){ bag=list.slice(); for(let i=bag.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; } }
    const name=bag.pop(), small=['plus','point','cercle'].includes(name), sz=small?12:(o.min||26)+rnd()*((o.max||38)-(o.min||26)), rot=small?0:(rnd()-.5)*2*(o.rot||32), sc=sz/24;
    wraps(pt.x,pt.y,sz*.75).forEach(([a,b])=>{ out+=`<g transform="translate(${(a-sz/2).toFixed(1)} ${(b-sz/2).toFixed(1)}) rotate(${rot.toFixed(1)} ${(sz/2).toFixed(1)} ${(sz/2).toFixed(1)}) scale(${sc.toFixed(3)})" stroke-width="${(1.5/sc).toFixed(2)}">${CM_I[name]}</g>`; }); });
  return out+'</svg>'; }
// Vagues japonaises : des écailles d'arcs, chaque rangée devant la précédente (le fond cache l'arrière)
function cmVagues(col,bg){ const r=22, W=2*r; let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${r}" viewBox="0 0 ${W} ${r}" stroke="${col}" stroke-width="1.3" fill="${bg}">`;
  for(let k=-3;k<=3;k++){ const y=k*r/2, x0=(k%2+2)%2?r:0; for(let j=-1;j<=1;j++){ const cx=x0+j*W; [1,.7,.4].forEach(f=>{ out+=`<circle cx="${cx}" cy="${y+r}" r="${(r*f).toFixed(1)}"/>`; }); } }
  return out+'</svg>'; }
let _cmKey='', _cmCtx=null;
function chatMotif(){ try{ const root=document.documentElement, cs=getComputedStyle(root), id=root.dataset.skin||'defaut';
    const rgb=v=>{ const c=_cmCtx||(_cmCtx=document.createElement('canvas').getContext('2d')); c.fillStyle='#ffffff'; c.fillStyle=String(v||'').trim()||'#ffffff'; const h=c.fillStyle;
      if(h[0]==='#') return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)); const m=h.match(/[\d.]+/g); return m?m.slice(0,3).map(Number):[255,255,255]; };
    const mix=(a,b,t)=>a.map((v,i)=>Math.round(v*t+b[i]*(1-t))), lum=c=>(.2126*c[0]+.7152*c[1]+.0722*c[2])/255;
    const s1=rgb(cs.getPropertyValue('--s1')), s2=rgb(cs.getPropertyValue('--s2')), tx=rgb(cs.getPropertyValue('--tx')), dark=lum(s1)<.4;
    const bg=dark?mix(s2,s1,.35):mix(s2,s1,.7), fg=mix(tx,bg,dark?.1:.11), css=c=>`rgb(${c.join(',')})`, motif=CHAT_MOTIF[id]||'doodles', key=[id,css(bg),css(fg)].join('|');
    if(key===_cmKey) return; _cmKey=key;
    const svg=motif==='vagues'?cmVagues(css(fg),css(bg)):cmScatter(CM_SETS[motif]||CM_SETS.doodles,css(fg));
    root.style.setProperty('--chat-bg',css(bg)); root.style.setProperty('--chat-pat',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`); }
  catch(e){ console.error(e); } }
function applySkin(id, anim, opts={}){
  if(!SKINS[id]) id='defaut';
  const guest=AUTH_LIVE&&!S.auth;   // pas connecté (accueil visiteur, connexion, inscription) : toujours le thème par défaut ; le thème choisi revient une fois connecté
  if(guest){ id='defaut'; if(_preview) endPreview(true); }
  else if(!opts.preview){ S.skinWanted=id; if(_preview) endPreview(true); }
  if(!opts.preview && !canUseSkin(id)) id='defaut';
  loadSkinFonts(id);
  const r=document.documentElement;
  const core=()=>{ r.dataset.skin=id; S.skin=id; if(!opts.preview) S.skinOk=id; save(); buildFx(); buildWorld(); chatMotif(); if(opts.then) opts.then();
    const m=document.querySelector('meta[name="theme-color"]'); if(m){ const c=getComputedStyle(r).getPropertyValue('--w-top').trim(); m.content=c?`rgb(${c})`:'#150F3F'; } updateFavicon(); };
  if(anim && id!==r.dataset.skin) withSkinFade(core); else core();
}
