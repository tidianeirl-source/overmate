/* Coopô — js/navigation.js
   Navigation : menus, barre du bas, route() qui affiche chaque page, glissement des conversations, animations après affichage.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* =========================================================
   6. NAVIGATION
   ========================================================= */
const ICONS = {
  accueil:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  profil:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  matchs:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
  recherche:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  groupes:'<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.8-4 3.5-6 6.5-6s5.7 2 6.5 6M15 14c2.8 0 5.2 1.6 6.5 5"/>',
  messages:'<path d="M4 5h16v11H9l-5 4z"/>',
  groupe:'<path d="M3 4.5h12v8.5H7.5L3 16.5z"/><path d="M18 8.5h3v11L17.5 16H10v-3"/>',   // deux bulles : la discussion à plusieurs
  moderation:'<path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
  boutique:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  parametres:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};
// LOGO_MASK (la planète Coopô) est défini dans l'en-tête de la page, avant le premier affichage
const LOGO='<i class="logo-mark" aria-hidden="true"></i>';
// Badge de certification des modérateurs
const MOD_SVG='<svg class="mod-badge" viewBox="0 0 24 24" role="img" aria-label="Modérateur certifié Coopô"><title>Modérateur certifié Coopô</title><path class="mb-seal" d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path class="mb-check" d="m9 12 2 2 4-4"/></svg>';
const isMod = p => !!p && (p.moderator===true || ((p.id==='me' || (S.auth && p.id===S.auth.uid)) && isAdmin()));
const modBadge = p => isMod(p) ? MOD_SVG : '';
// Favicon aux couleurs du thème actif
const _favImg=new Image(); _favImg.src=LOGO_MASK;
function updateFavicon(){ const draw=()=>{ try{ const cs=getComputedStyle(document.documentElement), bg=cs.getPropertyValue('--pk').trim()||'#7C5CFF', fg=cs.getPropertyValue('--on-pk').trim()||'#fff';
  const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  const t=document.createElement('canvas'); t.width=t.height=64; const y=t.getContext('2d'); y.drawImage(_favImg,4,4,56,56); y.globalCompositeOperation='source-in'; y.fillStyle=fg; y.fillRect(0,0,64,64);
  x.fillStyle=bg; x.beginPath(); x.arc(32,32,32,0,Math.PI*2); x.fill(); x.drawImage(t,0,0);
  let l=document.querySelector('link[rel="icon"]'); if(!l){ l=document.createElement('link'); l.rel='icon'; document.head.appendChild(l); } l.type='image/png'; l.href=c.toDataURL('image/png'); }catch(e){} };
  _favImg.complete ? draw() : _favImg.onload=draw; }
// 6 onglets : la recherche se range dans Matchs, les réglages dans Profil. « groupes » = la Communauté (ancien nom), « groupe » = l'onglet Groupes.
// v17 — sur téléphone, 5 onglets : l'Accueil au milieu (et plus grand).
// v20 — sur téléphone : Matchs · Commu · Accueil · Messages · Profil (avec ta photo). Les groupes sont dans Messages, avec les mates, comme sur Snapchat.
const NAV=[['accueil','Accueil'],['matchs','Matchs'],['groupes','Communauté'],['messages','Messages'],['groupe','Groupes'],['profil','Profil']];
const NAV_PARENT={recherche:'matchs',parametres:'profil',boutique:'profil',inventaire:'profil','faux-paiement':'profil',paiement:'profil',aide:'profil',contact:'profil',app:'profil',cgu:'profil',confidentialite:'profil',cookies:'profil',remboursement:'profil',moderation:'profil'};   // page secondaire → onglet allumé
const TAB_LBL={groupes:'Commu'};
const NAV_PHONE=['matchs','groupes','accueil','messages','profil'];
const NAV_PHONE_PARENT={groupe:'messages'};   // téléphone : les pages des groupes allument l'onglet Messages
function renderNav(active){
  const navItems = isAdmin() ? [...NAV,['moderation','Modération']] : NAV;
  const top = navItems.some(([r])=>r===active) ? active : (NAV_PARENT[active]||active);   // menu du haut (ordinateur) : « Modération » y a son propre onglet
  active=NAV_PARENT[active]||active;
  const tabOn=NAV_PHONE_PARENT[active]||active;
  const cur = r => r===tabOn ? 'aria-current="page"' : '';
  document.querySelectorAll('.navpill').forEach(n=>n.innerHTML = navItems.map(([r,l])=>`<a href="#/${r}" data-nav="${r}" ${r===top?'aria-current="page"':''}>${l}</a>`).join(''));
  // Colonne de gauche (ordinateur) : logo, pages en icônes, groupes, puis cloche et boutique
  const rail=document.getElementById('siderail');
  if(rail) rail.innerHTML=`<a class="logo" href="#/accueil" aria-label="Coopô, retour à l'accueil" title="Coopô"></a>
    <nav class="sr-nav" aria-label="Navigation principale">${navItems.map(([r,l])=>`<a class="sr-i" href="#/${r}" data-nav="${r}" ${r===top?'aria-current="page"':''} title="${esc(l)}" aria-label="${esc(l)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[r]||ICONS.accueil}</svg></a>`).join('')}</nav>
    <span class="dm-sep" aria-hidden="true"></span><nav class="sr-groups" id="sr-groups" aria-label="Mes groupes">${railGroups()}</nav>
    <div class="sr-foot"><button class="notif-btn" type="button" aria-label="Notifications" title="Notifications"></button><button class="inv-btn skin-btn" type="button" aria-label="Inventaire : mes thèmes et plaques" title="Inventaire" data-inv-go></button><button class="skin-btn" type="button" aria-label="Boutique : thèmes et plaques" title="Boutique"></button></div>`;
  document.querySelectorAll('.logo').forEach(l=>l.innerHTML=LOGO);
  document.querySelectorAll('.skin-btn').forEach(b=>b.innerHTML=b.classList.contains('inv-btn')?INV_ICON:PALETTE_ICON);
  const online=visible().filter(p=>isOnline(p)).length;
  const liveTxt = online ? `${online} joueur${online>1?'s':''} en ligne` : (S.auth ? 'Bienvenue sur Coopô' : 'Nouveau : rejoins les premiers');
  document.querySelectorAll('.top-right').forEach(t=>t.innerHTML=`<span class="live">${liveTxt}</span><small>${S.auth?'connecté : '+esc(S.me?.name||S.auth.name):S.me?'profil : '+esc(S.me.name):'<a href="#/connexion">se connecter</a>'}</small>`);
  const lbl=Object.fromEntries(NAV), meAv=S.me?avatar(publicMe(),26):'';   // l'onglet Profil montre ta photo (sinon l'icône)
  document.getElementById('tabbar').innerHTML = NAV_PHONE.map(r=>{ const me=r==='profil'&&meAv;
    return `<a href="#/${r}" data-nav="${r}" ${cur(r)}${r==='accueil'?' class="tb-home"':me?' class="tb-me"':''}><i class="tb-ico">${me?meAv:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[r]}</svg>`}</i><span>${TAB_LBL[r]||lbl[r]}</span></a>`; }).join('');
  renderNotifBadge();
}
const app=document.getElementById('app');
let NAV_COUNT=0;   // nombre de pages vues dans cette visite (sert au bouton Retour)
let PAGE_T0=0, PAGE_IN=false;   // v21 — l'heure où la page affichée est apparue, et si elle est entrée en fondu (voir keepIn)
// Profil complet = pseudo, date de naissance et au moins un jeu
const profileComplete = () => !!(S.me && S.me.name && S.me.dob && Array.isArray(S.me.games) && S.me.games.length);
// Pages accessibles sans être connecté (connexion, pages légales, aide, contact, installation)
const PUBLIC_ROUTES=['bienvenue','connexion','inscription','cgu','confidentialite','cookies','remboursement','contact','aide','app'];
const OFFLINE_OK=['bienvenue','cgu','confidentialite','cookies','remboursement','aide','app'];   // pages lisibles sans serveur
function route(){
  const [, name='accueil', arg] = location.hash.split('/');
  NAV_COUNT++; if(!(name==='messages'&&arg)) DB.stopChat(); if(name!=='groupe') DB.stopGroup();   // on n'écoute une conversation que lorsqu'elle est ouverte
  if(NET_FAIL && !OFFLINE_OK.includes(name) && (S.auth||['connexion','inscription','contact'].includes(name))){ document.body.classList.toggle('logged-out',!S.auth); netFailView(); renderNav(''); return; }
  if(!S.auth && !PUBLIC_ROUTES.includes(name)){
    try{ if(name && name!=='accueil') sessionStorage.setItem('coopo_after_login', location.hash); }catch(e){}
    document.body.classList.add('logged-out');
    let invited=false; try{ invited=!!localStorage.getItem('coopo_ref'); }catch(e){}
    let known=false; try{ known=!!localStorage.getItem('coopo_known'); }catch(e){}
    const gate=invited?'#/inscription':(known?'#/connexion':'#/bienvenue');   // invité → inscription ; déjà venu → connexion ; nouveau → présentation
    if(location.hash!==gate){ location.replace(gate); return; }
  }
  document.body.classList.toggle('logged-out', !S.auth);
  // Connecté mais profil pas encore rempli : seule la création du profil est accessible
  if(S.auth && !profileComplete() && !PUBLIC_ROUTES.includes(name) && name!=='profil'){
    if(dataPending()){ document.body.classList.add('no-profile'); loadingView('Coopô'); renderNav(''); return; }   // on attend de savoir si le profil existe
    try{ if(name && name!=='accueil') sessionStorage.setItem('coopo_after_profile', location.hash); }catch(e){}
    if(location.hash!=='#/profil'){ location.replace('#/profil'); return; }
  }
  document.body.classList.toggle('no-profile', !!S.auth && !profileComplete());
  document.body.classList.toggle('has-profile', !!S.auth && profileComplete());
  const views={accueil:viewHome, connexion:()=>viewAuth('login'), inscription:()=>viewAuth('signup'), profil:viewProfile, matchs:viewMatches, recherche:viewSearch, parametres:viewSettings, joueur:viewPlayer,
    messages:viewMessages, groupes:viewSquads, groupe:viewGroup, aide:viewHelp, cgu:()=>viewLegal('cgu'), confidentialite:()=>viewLegal('privacy'), cookies:viewCookies, remboursement:viewRefund, contact:viewContact, app:viewApp, bienvenue:viewWelcome, paiement:viewPayment, 'faux-paiement':viewFakePay, boutique:viewShop, inventaire:viewInventory, moderation:viewAdmin};
  if(name.startsWith('@')){ let nm=''; try{ nm=decodeURIComponent(name.slice(1)).toLowerCase(); }catch(e){} const p=PLAYERS.find(x=>x.name.toLowerCase()===nm); document.body.classList.remove('is-home'); document.body.dataset.route='joueur'; viewPlayer(S.me&&S.me.name.toLowerCase()===nm?'me':(p?p.id:'?')); renderNav(''); window.scrollTo(0,0); app.firstElementChild?.classList.add('page-in'); animateAfterRender(); return; }
  const v = views[name] || viewHome;
  clearInterval(scTimer);
  const navH=location.hash||'#/accueil';
  // v21 — la même page qui se redessine (nouvelles données) : on note ce qui était déjà apparu, pour ne rien refaire apparaître
  const again=NAVX.prev===navH, shown=again?[...app.querySelectorAll('.reveal')].map(el=>el.classList.contains('in')):null;
  navBefore(navH);   // v18 — vers une conversation : la page qu'on quitte passe dessous
  document.body.classList.toggle('is-home', v===viewHome);
  document.body.dataset.route = views[name] ? name : 'accueil';   // la page affichée : sert à ne montrer la cloche et la boutique que là où elles servent
  v(arg);
  { // pages de lecture : tout ce qui suit le titre est posé sur une « feuille » (lisible sur n'importe quel décor)
    const lg=app.querySelector('.wrap.page.legal'); if(lg && !lg.querySelector(':scope > .sheet')){ const kids=[...lg.children].filter(c=>!c.matches('.back,.page-head'));
      if(kids.length && kids.some(c=>!c.matches('.panel'))){ const sh=document.createElement('div'); sh.className='sheet'; kids[0].before(sh); kids.forEach(k=>sh.appendChild(k)); } } }
  renderNav(name==='joueur' ? '' : (views[name]?name:'accueil'));
  window.scrollTo(0,0);
  const prevH=NAVX.prev, slid=navAfter(navH);   // v18 — entrée dans une conversation, ou retour en glissant : pas d'autre animation de page
  // v19 — pas d'animation de page non plus quand la même page se redessine (nouvelles données), ni d'une conversation à l'autre (Messages, Groupes)
  const calm = slid || prevH===navH || (MSG_AREA.test(prevH)&&MSG_AREA.test(navH));
  if(!again){ PAGE_T0=performance.now(); PAGE_IN=!calm; }   // v21 — l'heure où la page est apparue, et si elle est entrée en fondu
  if(!calm||(again&&PAGE_IN)) app.firstElementChild?.classList.add('page-in');
  animateAfterRender(app, again?PAGE_T0:0);
  if(again) keepIn(shown);   // v21 — rien ne repart de zéro : cartes, cercles et apparitions continuent là où ils en étaient
  renderGoogleButtons(app);
  if(!calm) playWipe();
}
/* v21 — Une page qui se redessine parce que de nouvelles données sont arrivées (un joueur qui se connecte…) ne doit pas
   avoir l'air de se recharger : chaque animation d'entrée (cartes qui montent, cercles qui se remplissent, titres, fondu)
   reprend exactement où elle en était depuis l'arrivée sur la page, et se termine tout de suite si elle était finie.
   Les animations qui tournent en boucle (décor, plaques…) ne sont pas touchées. */
function keepIn(shown){ const t=Math.max(0,performance.now()-PAGE_T0);
  if(shown) app.querySelectorAll('.reveal').forEach((el,i)=>{ if(shown[i]) el.classList.add('in'); });   // déjà apparu : reste là, sans refaire l'apparition
  [app,document.getElementById('tabbar'),document.getElementById('siderail')].forEach(root=>{ let list=[]; try{ list=root&&root.getAnimations?root.getAnimations({subtree:true}):[]; }catch(e){}
    list.forEach(a=>{ try{ if(a.effect.getComputedTiming().iterations===Infinity) return; if(window.CSSTransition&&a instanceof CSSTransition) a.finish(); else a.currentTime=t; }catch(e){} }); }); }
const MSG_AREA=/^#\/(messages|groupe)(\/|$)/;   // la messagerie : la liste des messages, la page des groupes et leurs conversations
/* ---- v18 — Entrer dans une conversation et en sortir en glissant (téléphone), comme dans Discord ----
   On ouvre une conversation : elle arrive par la droite, par-dessus la page d'où l'on vient, qui reste dessous telle quelle.
   On fait glisser le doigt de la gauche vers la droite : la conversation suit le doigt et laisse voir la page d'avant ;
   lâchée assez loin, ou lancée d'un geste rapide, elle sort par la droite et l'on revient sur cette page, au même endroit ;
   sinon elle reprend sa place. Le bouton ‹ en haut fait la même sortie. On peut rattraper la conversation en plein mouvement.
   Seulement quand la conversation prend tout l'écran (téléphone, petite tablette), et sans animation si l'appareil demande moins d'animations.
   La page d'avant n'est pas redessinée : ses éléments passent dans un calque dessous (#nav-under), puis la vraie page revient à la place. */
const NAVX={ under:null, from:'', y:0, w:0, prev:'', anim:null, drag:false, leaving:false, back:false, push:false, eat:0 };
const navPhone = () => matchMedia('(max-width:999px)').matches;
const navMotion = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
const chatHash = h => /^#\/(messages|groupe)\/[^/]+$/.test(h||'') && h!=='#/groupe/nouveau';
const chatParent = () => '#/messages';   // v20 — sur téléphone, les groupes sont dans la liste des messages : on y revient toujours
const navBusy = () => NAVX.drag || NAVX.leaving || !!NAVX.anim;   // un glissement est en cours : la page attend avant de se redessiner
const NAV_EASE='cubic-bezier(.23,1,.32,1)';
// Une copie figée d'un élément fixe (barre du haut, barre du bas), telle qu'on la voyait
function navFreeze(el){ const r=el.getBoundingClientRect(), k=el.cloneNode(true), a=[el,...el.querySelectorAll('*')], b=[k,...k.querySelectorAll('*')];
  a.forEach((s,i)=>{ const t=b[i], cs=getComputedStyle(s); if(!t) return; t.removeAttribute('id'); t.style.setProperty('display',cs.display,'important');
    if(cs.position==='absolute') ['top','right','left'].forEach(p=>t.style.setProperty(p,cs[p],'important')); });
  [['position','fixed'],['left',r.left+'px'],['top',r.top+'px'],['width',r.width+'px'],['right','auto'],['bottom','auto'],['margin','0']].forEach(([p,v])=>k.style.setProperty(p,v,'important'));
  return k; }
// La page qu'on quitte passe dessous, telle quelle (elle n'est pas redessinée : même défilement, mêmes affiches)
function navCapture(from){ navDrop();
  const kids=[...app.childNodes]; if(!kids.length) return;
  const y=scrollY, ar=app.getBoundingClientRect(), sc=[];   // lus avant de déplacer la page (sans elle, la fenêtre ne défile plus)
  app.querySelectorAll('*').forEach(el=>{ if(el.scrollLeft||el.scrollTop) sc.push([el,el.scrollLeft,el.scrollTop]); });
  const top=document.querySelector('.frame > .top'), tb=document.getElementById('tabbar');
  const fixed=[top,tb].filter(el=>el&&getComputedStyle(el).display!=='none').map(navFreeze);   // copiées avant de déplacer la page : la barre du haut reste collée en haut
  const u=document.createElement('div'); u.id='nav-under'; u.setAttribute('aria-hidden','true'); u.inert=true;
  const box=document.createElement('div'); box.className='nav-page'; box.style.cssText=`left:${ar.left}px;top:${ar.top}px;width:${ar.width}px`;
  kids.forEach(n=>box.appendChild(n)); u.appendChild(box); fixed.forEach(k=>u.appendChild(k));
  u.insertAdjacentHTML('beforeend','<i class="nav-dim"></i>');
  document.body.appendChild(u);
  sc.forEach(([el,l,t])=>{ el.scrollLeft=l; el.scrollTop=t; });
  Object.assign(NAVX,{ under:u, from, y, w:innerWidth }); }
function navDrop(){ if(NAVX.anim){ try{ NAVX.anim.cancel(); }catch(e){} NAVX.anim=null; } if(NAVX.under) NAVX.under.remove(); NAVX.under=null; NAVX.from=''; }
// route() : juste avant d'afficher la nouvelle page
function navBefore(hash){ const prev=NAVX.prev; NAVX.push=false;
  if(hash===prev) return;   // la même page se redessine (nouvelles données) : rien ne change
  if(chatHash(hash)&&navPhone()&&prev&&!chatHash(prev)&&app.firstChild&&!app.querySelector('[aria-busy="true"]')){ navCapture(prev); NAVX.push=!!NAVX.under; }
  else if(chatHash(hash)) navDrop(); }
// route() : la nouvelle page est affichée. Vrai si un glissement s'en est chargé (pas d'autre animation de page)
function navAfter(hash){ const prev=NAVX.prev; NAVX.prev=hash;
  if(hash===prev) return false;
  if(chatHash(hash)){ if(!NAVX.push) return false; NAVX.push=false; return navSlideIn(); }
  const slid=NAVX.back; NAVX.back=false; NAVX.leaving=false;
  if(!NAVX.under) return false;
  const again=NAVX.from===hash, y=NAVX.y; navDrop();
  if(again) scrollTo(0,y);   // retour sur la page d'avant : au même endroit
  return again&&slid; }
const navX = c => { const t=getComputedStyle(c).transform; if(!t||t==='none') return 0; try{ return new DOMMatrixReadOnly(t).m41; }catch(e){ return 0; } };
const navDimEl = () => NAVX.under&&NAVX.under.querySelector('.nav-dim');
function navDim(x){ const d=navDimEl(); if(d) d.style.opacity=String(Math.max(0,1-x/innerWidth)); }
function navSlideIn(){ const c=app.querySelector('.chat-page'), u=NAVX.under; if(!u) return false;
  if(!c){ navDrop(); return false; }
  if(!navMotion()) return true;
  u.classList.add('on'); c.classList.add('nav-mv');
  const W=innerWidth, a=c.animate([{transform:`translate3d(${W}px,0,0)`},{transform:'translate3d(0,0,0)'}],{duration:320,easing:NAV_EASE}), d=navDimEl();
  if(d) d.animate([{opacity:0},{opacity:1}],{duration:320,easing:NAV_EASE});
  NAVX.anim=a; a.finished.then(()=>{ if(NAVX.anim!==a) return; NAVX.anim=null; c.classList.remove('nav-mv'); u.classList.remove('on'); }).catch(()=>{});
  return true; }
// Le doigt (ou le bouton ‹) prend la conversation, là où elle est, même en plein mouvement
function navGrab(c){ let x=0; const d0=navDimEl();
  if(NAVX.anim){ x=navX(c); try{ NAVX.anim.cancel(); }catch(e){} NAVX.anim=null; }
  if(d0) d0.getAnimations().forEach(a=>a.cancel());
  if(!NAVX.under){ const u=document.createElement('div'); u.id='nav-under'; u.setAttribute('aria-hidden','true'); u.inert=true; u.innerHTML='<i class="nav-dim"></i>'; document.body.appendChild(u); Object.assign(NAVX,{ under:u, from:'', w:innerWidth }); }   // conversation ouverte directement : un fond uni dessous
  NAVX.under.classList.add('on'); c.classList.add('nav-mv'); c.style.transform=`translate3d(${x}px,0,0)`; navDim(x); return x; }
// Pas assez loin : la conversation reprend sa place
function navSettle(c,x){ NAVX.drag=false; const u=NAVX.under, d=navDimEl();
  const done=()=>{ c.style.transform=''; c.classList.remove('nav-mv'); if(d) d.style.opacity=''; if(u) u.classList.remove('on'); if(u&&!NAVX.from) navDrop(); };
  if(!navMotion()||x<1){ done(); return; }
  const dur=Math.round(Math.min(300,Math.max(180,x*.9))), a=c.animate([{transform:`translate3d(${x}px,0,0)`},{transform:'translate3d(0,0,0)'}],{duration:dur,easing:NAV_EASE});
  c.style.transform=''; if(d){ d.animate([{opacity:Math.max(0,1-x/innerWidth)},{opacity:1}],{duration:dur,easing:NAV_EASE}); d.style.opacity='1'; }
  NAVX.anim=a; a.finished.then(()=>{ if(NAVX.anim!==a) return; NAVX.anim=null; done(); }).catch(()=>{}); }
// Assez loin, ou lancée : la conversation sort par la droite à la vitesse du doigt, et l'on revient sur la page d'avant
function navLeave(c,x,v){ NAVX.drag=false; NAVX.leaving=true; const W=innerWidth, d=navDimEl(), h=location.hash;
  const go=()=>{ NAVX.back=true; const to=NAVX.from;
    if(to){ history.back(); setTimeout(()=>{ if(NAVX.leaving&&location.hash===h) location.hash=to; },700); }   // filet : si le retour n'a rien donné
    else location.hash=chatParent(h); };
  if(!navMotion()){ c.style.transform=`translate3d(${W}px,0,0)`; if(d) d.style.opacity='0'; go(); return; }
  const dur=Math.round(Math.min(360,Math.max(160,4*(W-x)/Math.max(v,.6)))), a=c.animate([{transform:`translate3d(${x}px,0,0)`},{transform:`translate3d(${W}px,0,0)`}],{duration:dur,easing:'cubic-bezier(.2,.8,.2,1)'});
  c.style.transform=`translate3d(${W}px,0,0)`; if(d){ d.animate([{opacity:Math.max(0,1-x/W)},{opacity:0}],{duration:dur,easing:'cubic-bezier(.2,.8,.2,1)'}); d.style.opacity='0'; }
  NAVX.anim=a; a.finished.then(()=>{ if(NAVX.anim!==a) return; NAVX.anim=null; go(); }).catch(()=>{ NAVX.leaving=false; }); }
// Le geste : de la gauche vers la droite, n'importe où dans la conversation (sauf la zone où l'on écrit) ; vers le haut ou le bas, c'est la conversation qui défile
{ let d=null; const skip='.chat-form,.cpanel,.qr-stk,.edit-bar,.reply-bar,.rec-bar,input,textarea,select,[contenteditable],[data-noswipe]';
  document.addEventListener('pointerdown',e=>{ d=null;
    if(e.pointerType==='mouse'||!e.isPrimary||NAVX.leaving||!navPhone()) return;
    const c=e.target.closest&&e.target.closest('.chat-page'); if(!c||e.target.closest(skip)||(typeof dlg!=='undefined'&&dlg.open)) return;
    d={ id:e.pointerId, c, x:e.clientX, y:e.clientY, on:false, base:0, x0:0, cur:0, pts:[[e.timeStamp,e.clientX]] }; },{passive:true});
  document.addEventListener('pointermove',e=>{ if(!d||e.pointerId!==d.id) return; const dx=e.clientX-d.x, dy=e.clientY-d.y;
    if(!d.on){ if(Math.abs(dy)>10&&Math.abs(dy)>=Math.abs(dx)){ d=null; return; }   // vers le haut ou le bas : on laisse défiler
      if(dx<10||dx<Math.abs(dy)*1.2) return;
      d.on=true; NAVX.drag=true; d.base=navGrab(d.c); d.x0=e.clientX; try{ d.c.setPointerCapture(e.pointerId); }catch(er){} }
    const x=Math.max(0,d.base+e.clientX-d.x0); d.cur=x; d.c.style.transform=`translate3d(${x}px,0,0)`; navDim(x);
    d.pts.push([e.timeStamp,e.clientX]); if(d.pts.length>6) d.pts.shift(); },{passive:true});
  const end=e=>{ if(!d||e.pointerId!==d.id) return; const g=d; d=null; if(!g.on) return; NAVX.eat=Date.now();
    const a=g.pts[0], b=g.pts[g.pts.length-1], v=(b[1]-a[1])/Math.max(1,b[0]-a[0]), W=innerWidth;
    if(e.type!=='pointercancel'&&(g.cur>W*.33||(v>.4&&g.cur>24))) navLeave(g.c,g.cur,v); else navSettle(g.c,g.cur); };
  document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end);
  document.addEventListener('click',e=>{
    if(NAVX.eat&&Date.now()-NAVX.eat<450){ NAVX.eat=0; e.preventDefault(); e.stopPropagation(); return; }   // le doigt qui lâche la conversation n'ouvre rien
    const b=e.target.closest&&e.target.closest('.chat-page .chat-head .back'); if(!b||!navPhone()||NAVX.leaving||!NAVX.under||NAVX.from!==b.getAttribute('href')) return;   // on ne vient pas de là : le lien fait comme avant
    e.preventDefault(); const c=b.closest('.chat-page'); navLeave(c,navGrab(c),0); },true);
  addEventListener('resize',()=>{ if(NAVX.under&&!navBusy()&&innerWidth!==NAVX.w) navDrop(); }); }   // l'écran a tourné : la page d'avant n'est plus à sa place
/* --- Animations pilotées en JS --- */
function countUp(el,base){   // base (v21) : l'heure où la page est apparue, quand elle se redessine : le compte reprend où il en était
  const target=+el.dataset.count, span=el.querySelector('span'); if(!span||reduced()) return;
  const card=el.closest('.mcard'), delay=(card?+(card.style.getPropertyValue('--i')||0)*70+150:el.closest('.float-match')?900:0);
  const dur=1200, t0=(base||performance.now())+delay;
  const tick=t=>{ const k=Math.min(1,Math.max(0,(t-t0)/dur)), e=1-Math.pow(1-k,3);
    span.firstChild.nodeValue=Math.round(target*e); if(k<1) requestAnimationFrame(tick); };
  tick(performance.now());
}
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }),{threshold:.2}) : null;
function animateAfterRender(root=app,base=0){
  root.querySelectorAll('.ring[data-count]').forEach(el=>countUp(el,base));
  root.querySelectorAll('.reveal').forEach(el=> io ? io.observe(el) : el.classList.add('in'));
  root.querySelectorAll('.panel').forEach((p,i)=>p.style.setProperty('--i',i));
}
function burst(x,y){
  if(reduced()) return;
  const cols=['#D9478A','#FF93BB','#FFC6DB','#F04E8C','#9A6BE0'];
  for(let i=0;i<26;i++){ const s=document.createElement('i'); s.className='spark';
    const a=Math.random()*Math.PI*2, d=60+Math.random()*90;
    s.style.cssText=`left:${x}px;top:${y}px;background:${cols[i%5]};--x:${Math.cos(a)*d}px;--y:${Math.sin(a)*d}px;--r:${Math.random()*540}deg`;
    document.body.appendChild(s); setTimeout(()=>s.remove(),850); }
}
window.addEventListener('hashchange',route);
document.addEventListener('click',e=>{ const b=e.target.closest('[data-back]'); if(!b) return; if(NAV_COUNT>1){ e.preventDefault(); history.back(); } });
