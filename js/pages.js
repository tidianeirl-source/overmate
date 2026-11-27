/* Coopô — js/pages.js
   Pages : accueil (affiches), profil, matchs, recherche, page d'un joueur, réglages, modération depuis le profil d'un joueur.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* =========================================================
   7. PAGES
   ========================================================= */
function bloomSVG(){
  let seed=11; const R=()=>(seed=(seed*16807)%2147483647,(seed-1)/2147483646);
  const W=1200,H=640; let leaves='',flowers='',petals='';
  const greens=['#4E7A4A','#3D6640','#6B9A5A','#2F5236','#5C8C50'];
  for(let i=0;i<80;i++){ const x=R()*W|0,y=R()*H|0,rx=30+R()*55|0;
    leaves+=`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx*.36|0}" transform="rotate(${R()*180|0} ${x} ${y})" fill="${greens[i%5]}"/>`; }
  const pinks=['#F04E8C','#F77BAA','#FBA6C6','#E23C7A','#FFC6DB','#D9447F','#FF93BB'];
  for(let i=0;i<48;i++){ const cx=R()*W, cy=R()*H, r=40+R()*75; let g=''; const n=14+(R()*12|0);
    for(let j=0;j<n;j++){ const a=R()*6.283, d=R()*r, pr=10+R()*17, fx=cx+Math.cos(a)*d|0, fy=cy+Math.sin(a)*d|0;
      g+=`<circle cx="${fx}" cy="${fy}" r="${pr|0}" fill="${pinks[R()*7|0]}"/>`;
      if(R()>.55) g+=`<circle cx="${fx-pr*.3|0}" cy="${fy-pr*.3|0}" r="${pr*.3|0}" fill="#FFE6F0" opacity=".85"/>`; }
    flowers+=`<g class="sway" style="--sd:${(R()*5).toFixed(1)}s">${g}</g>`; }
  for(let i=0;i<16;i++){ petals+=`<ellipse class="petal" cx="${R()*W|0}" cy="-20" rx="${6+R()*4|0}" ry="4" fill="${['#FFD3E4','#FFB3CF','#FFFFFF'][i%3]}" opacity=".9" style="--dur:${(9+R()*7).toFixed(1)}s;--dl:${(R()*14).toFixed(1)}s;--dx:${(R()*240-120)|0}px"/>`; }
  return `<svg class="bloom" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${W}" height="${H}" fill="#3A6340"/>${leaves}${flowers}${petals}</svg>`;
}
function viewHome(){
  if(DB.live&&S.me&&DB._loaded){ DB.refreshPlayers().then(changed=>{ if(changed&&(location.hash==='#/accueil'||location.hash===''||location.hash==='#/')) refreshAfterData(); }).catch(()=>{}); }
  const featured = S.me ? ranked().slice(0,3) : [];
  // Accueil allégé : un bandeau court, ce qu'il y a à traiter, qui est dispo, les meilleurs matchs, un mot de la communauté. Le reste vit dans son onglet.
  if(!document.getElementById('aff-track')) AFF.i=0;   // v17 — on arrive sur l'accueil : la première affiche ; la page se redessine (nouvelles données) : on reste sur la même
  app.innerHTML = `<div class="home">${homeBannerHTML()}${affHTML()}
  <div class="wrap home-top">${todoStrip()}${dispoSection()}${bestMatchesHTML(featured)}${boardsTeaser()}</div></div>`;
  affWire();
}
// Bandeau d'accueil : le dessin du thème en fond et un bonjour (v17 : le nombre de joueurs en ligne est passé sur la première affiche)
function homeBannerHTML(){
  const h=new Date().getHours(), hello = h<5?'Bonsoir':h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir';
  return `<section class="mh" id="showcase">
    <div class="mh-body"><p class="mh-hello">${hello},</p><h1${S.me&&S.me.name.length>12?' class="long"':''}>${esc(S.me?S.me.name:'bienvenue')}</h1></div>
  </section>`;
}
/* ---- v17 — Accueil en affiches : de grandes cartes de couleur qu'on fait glisser du doigt (infos en direct, nouveautés, astuces) ----
   Une affiche = un dessin, un titre, une phrase et un bouton. Ordre : qui est dispo, le prochain tournoi, les nouveautés, le parrainage, une astuce.
   Pour en ajouter une : un objet de plus dans affList() { id, tag, art, title, text, cta:[texte du bouton, attributs du lien ou du bouton] }.
   Une nouveauté disparaît toute seule après sa date « until ». */
const AFF={ i:0, at:0, down:false, t:0 };   // i : l'affiche regardée (gardée quand la page se redessine) · at, down : le doigt fait glisser les affiches
const affBusy = () => AFF.down || Date.now()-AFF.at < 900;   // pendant un glissement, la page attend avant de se redessiner
const affNew = until => Date.now() < Date.parse(until+'T23:59:59Z');
const AF_SVG = (d,w=2.2) => `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const AF_ART = {
  trophy:'<path d="M20 10h24v14a12 12 0 0 1-24 0z"/><path d="M20 14h-7v3a8 8 0 0 0 8 8M44 14h7v3a8 8 0 0 1-8 8"/><path d="M32 36v8M24 54h16M27 54l1.5-10h7L37 54"/>',
  gift:'<rect x="10" y="24" width="44" height="11" rx="2.5"/><path d="M14 35v19h36V35M32 24v30"/><path d="M32 24c-2-7-13-10-13-3.5 0 3.5 6 4 13 3.5zm0 0c2-7 13-10 13-3.5 0 3.5-6 4-13 3.5z"/>',
  phone:'<path d="M19 13h8l4 10-5 3a22 22 0 0 0 10 10l3-5 10 4v8a4 4 0 0 1-4 4A32 32 0 0 1 15 17a4 4 0 0 1 4-4z"/>',
  bell:'<path d="M18 42V30a14 14 0 0 1 28 0v12l5 5H13z"/><path d="M27 52a5 5 0 0 0 10 0"/>',
  tag:'<path d="M12 20h40v24H12z"/><path d="M20 28h12M20 36h20"/><circle cx="45" cy="28" r="2.5"/>',
  mega:'<path d="M14 26h8l20-12v36L22 38h-8z"/><path d="M22 38l4 13h6l-3-13M50 26a8 8 0 0 1 0 12"/>',
  users:'<circle cx="24" cy="22" r="8"/><circle cx="44" cy="25" r="6"/><path d="M8 50c1.5-9 7.5-14 16-14s14.5 5 16 14M40 38c7 0 12 4 14 11"/>',
  pin:'<path d="M26 10h12l-2 14 8 8H20l8-8z"/><path d="M32 32v20"/>'
};
// Le radar de « Qui est dispo » : toi au milieu, les joueurs dispo (ou en ligne) autour
function affRadar(me,ppl){
  const pos=ppl.slice(0,6).map((p,k)=>`<span class="af-rp af-rp${k}">${avatar(p,46)}${isOnline(p)||dispoActive(p)?'<i class="af-on"></i>':''}</span>`).join('');
  const empty=ppl.length?'':[0,1,2].map(k=>`<span class="af-rp af-rp${k} af-rq">?</span>`).join('');
  return `<div class="af-radar"><i class="af-rg r1"></i><i class="af-rg r2"></i><i class="af-rg r3"></i><i class="af-sweep"></i><span class="af-me">${me?avatar(me,76):''}${dispoActive(S.me)?'<i class="af-on"></i>':''}</span>${pos}${empty}</div>`;
}
// L'appel à plusieurs : 4 cases comme pendant un vrai appel
function affCallArt(me){
  const mates=matesList(), pool=(mates.length>=2||!S.me?mates:[...mates,...ranked().map(x=>x.p)]).filter((p,k,a)=>a.findIndex(q=>q.id===p.id)===k).slice(0,2);
  const tile=(p,lbl,cls='')=>`<span class="af-tile${cls}">${avatar(p,50)}<b>${esc(lbl)}</b></span>`;
  const tiles=[me?tile(me,'Toi',' talk'):'', ...pool.map(p=>tile(p,p.name))].filter(Boolean);
  while(tiles.length<4) tiles.push(`<span class="af-tile add"><i>+</i><b>Ajouter</b></span>`);
  return `<div class="af-call">${tiles.join('')}<span class="af-ph">${AF_SVG(AF_ART.phone,3)}</span></div>`;
}
// Deux petits écrans : Coopô en blanc et en noir
const affLookArt = () => `<div class="af-look">${['lt','dk'].map(c=>`<span class="af-mp ${c}"><i class="mp-a"></i><i class="mp-l"></i><i class="mp-l s"></i><i class="mp-c"></i><i class="mp-c"></i><i class="mp-b"></i></span>`).join('')}</div>`;
function affList(){
  const me=S.me?publicMe():null, L=[];
  const on=visible().filter(isOnline), dl=dispoList(), mine=dispoActive(S.me);
  const nOn = on.length ? `${on.length} joueur${on.length>1?'s':''} en ligne. ` : '';
  // 1. Qui est dispo, en direct
  L.push({ id:'dispo', tag:'En direct', art:affRadar(me,dl.length?dl:on),
    title: mine ? 'Tu es dispo' : dl.length ? `${dl.length} joueur${dl.length>1?'s':''} dispo maintenant` : 'Sois le premier dispo',
    text: mine ? `Pour ${esc(S.me.dispo.game)}, jusqu'à ${fmtUntil(S.me.dispo.until)}. Les joueurs compatibles te voient en premier.`
      : `${nOn}Dis que tu es dispo : les joueurs compatibles te verront tout de suite.`,
    cta: mine ? ['Voir qui est dispo','data-aff-dispo'] : S.me ? ['Je suis dispo','data-dispo-go'] : ['Créer mon profil','href="#/profil"'] });
  // 2. Le prochain tournoi ouvert
  let t=null; try{ t=tournoisAll().find(x=>x.status==='open'&&x.date>Date.now()&&tournoiOpenTo(x)); }catch(e){}
  if(t){ const d=new Date(t.date), day=d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}), n=(t.players||[]).length;
    L.push({ id:'tournoi', tag:'Tournoi', art:`<div class="af-cup">${AF_SVG(AF_ART.trophy,2)}<span class="af-date"><b>${d.getDate()}</b>${esc(d.toLocaleDateString('fr-FR',{month:'short'}))}</span></div>`,
      title:esc(t.title), text:`${esc(t.game)} · ${esc(day)} · ${n}/${+t.max||0} inscrits${t.prize?`. À gagner : ${esc(t.prize)}`:''}`, cta:['Voir le tournoi','href="#/groupes/tournois"'] }); }
  // 3. Nouveauté : les appels à plusieurs
  if(canCall()&&affNew('2027-01-31')) L.push({ id:'appels', tag:'Nouveau', art:affCallArt(me), title:'Appelle jusqu\'à 4 mates',
    text:'Pendant un appel vocal, touche « Ajouter » pour faire venir un autre mate.', cta:['Ouvrir mes messages','href="#/messages"'] });
  // 4. Les plaques illustrées : « Bientôt » tant qu'elles sont en préparation (soon:true), puis « Nouveau » jusqu'à la date
  const pl=['koi','soleil','nuages'].filter(k=>PLATES[k]&&!RETIRED_PLATES.includes(k)), soon=pl.some(k=>PLATES[k].soon);
  if(pl.length&&me&&(soon||affNew('2027-01-31'))){ const names=pl.map(k=>PLATES[k].label), nm=names.length>1?names.slice(0,-1).join(', ')+' et '+names[names.length-1]:names[0];
    L.push({ id:'plaques', tag:soon?'Bientôt':'Nouveau', art:`<div class="af-plq">${pl.map(plqDemo).join('')}</div>`,
      title:soon?'De nouvelles plaques arrivent':'Nouvelles plaques dans la boutique', text:`${esc(nm)} : ${soon?'regarde-les déjà':'essaie-les'} avec ton pseudo.`,
      cta:[soon?'Voir l\'aperçu':'Voir les plaques','href="#/boutique/plaques"'] }); }
  // 5. Nouveauté : le noir et blanc
  if(affNew('2027-01-15')){ const sk=S.skin;
    L.push({ id:'look', tag:'Nouveau', art:affLookArt(), title:'Coopô passe au noir et blanc',
      text: sk==='defaut' ? 'Un look plus net. Envie d\'un fond noir ? Essaie le thème Sombre.' : sk==='sombre' ? 'Un look plus net, de jour comme de nuit. Le thème Coopô existe aussi en blanc.' : 'Les thèmes Coopô et Sombre ont un nouveau look, tout en noir et blanc.',
      cta: sk==='defaut' ? ['Essayer le sombre','data-use-skin="sombre"'] : sk==='sombre' ? ['Passer en clair','data-use-skin="defaut"'] : ['Voir mes thèmes','href="#/inventaire"'] }); }
  // 6. Le parrainage (jusqu'à ce que tous les thèmes soient débloqués)
  const rn=(S.rewards||{}).referrals||0;
  if(me&&rn<REF_REWARD.all){ const left=REF_REWARD.all-rn, slots=Array.from({length:REF_REWARD.all},(x,k)=>`<i class="${k<rn?'ok':''}">${k<rn?'✓':k+1}</i>`).join('');
    L.push({ id:'parrain', tag:'Cadeau', art:`<div class="af-gift">${AF_SVG(AF_ART.gift,2)}<span class="af-slots">${slots}</span></div>`,
      title: rn ? `Plus que ${left} ami${left>1?'s':''} pour tous les thèmes` : 'Invite un ami, gagne un thème',
      text: rn ? `Tu as déjà invité ${rn} ami${rn>1?'s':''}. À ${REF_REWARD.all}, tu débloques tous les thèmes de la boutique.` : `Quand un ami crée son compte avec ton lien, le thème ${esc(SKINS[REF_REWARD.one].label)} est à toi. À ${REF_REWARD.all} amis : tous les thèmes.`,
      cta:['Inviter mes amis','data-ref-share'] }); }
  // 7. Une astuce (celles qui te servent d'abord, sinon une différente chaque jour)
  if(L.length<7&&me){ const tips=[], hasTags=Object.values(S.me.tags||{}).some(Boolean);
    let nt=false; try{ nt='Notification' in window&&Notification.permission!=='denied'&&!(S.notifyOn&&Notification.permission==='granted'); }catch(e){}
    if(!hasTags) tips.push({ic:'tag',title:'Ajoute tes pseudos en jeu',text:'Tes mates te retrouvent plus vite dans la partie.',cta:['Modifier mon profil','href="#/profil/modifier"']});
    if(nt) tips.push({ic:'bell',title:'Active les notifications',text:'Tes appels et tes messages arrivent même quand Coopô est fermée.',cta:['Ouvrir les réglages','href="#/parametres"']});
    const daily=[{ic:'mega',title:'Publie une annonce',text:'« Je cherche 2 joueurs ce soir » : les joueurs intéressés te répondent.',cta:['Voir les annonces','href="#/groupes/annonces"']},
      {ic:'users',title:'Crée ton groupe',text:'Un salon pour ton équipe : messages, vocaux et appels à plusieurs.',cta:['Mes groupes','href="#/groupe"']},
      {ic:'pin',title:'Épingle tes mates préférés',text:'Dans Messages, garde le doigt sur un mate pour le garder en haut de la liste.',cta:['Ouvrir mes messages','href="#/messages"']}];
    const tip=tips[0]||daily[Math.floor(Date.now()/864e5)%daily.length];
    L.push({ id:'astuce', tag:'Astuce', art:`<div class="af-tip">${AF_SVG(AF_ART[tip.ic],2.2)}</div>`, title:tip.title, text:tip.text, cta:tip.cta }); }
  return L;
}
const affNb = t => String(t).replace(/ ([:;!?»])/g,'\u00A0$1').replace(/« /g,'«\u00A0');   // espaces insécables du français : « Ajouter » et les deux-points restent collés au mot
function affHTML(){
  const L=affList(), n=L.length; if(!n) return '';
  const dots=k=>n>1?`<div class="af-dots" aria-hidden="true">${L.map((x,j)=>`<button type="button" tabindex="-1" data-aff-to="${j}"${j===k?' class="on"':''}></button>`).join('')}</div>`:'';
  const cta=c=>/(^|\s)href=/.test(c[1]) ? `<a class="af-cta" ${c[1]}>${c[0]}</a>` : `<button class="af-cta" type="button" ${c[1]}>${c[0]}</button>`;
  return `<section class="wrap aff-wrap" aria-roledescription="carrousel" aria-label="À la une">
    <div class="aff-track" id="aff-track">${L.map((x,k)=>`<article class="aff${k%2?' alt':''}" data-aff="${x.id}" aria-roledescription="affiche" aria-label="${k+1} sur ${n}${x.tag?' · '+x.tag:''}">
      <div class="af-art" aria-hidden="true">${x.tag?`<span class="af-tag">${x.tag}</span>`:''}${x.art}</div>
      <div class="af-body">${dots(k)}<h2 class="af-h">${affNb(x.title)}</h2><p class="af-p">${affNb(x.text)}</p>${cta(x.cta)}</div></article>`).join('')}</div>
    ${n>1?`<button class="aff-nav aff-prev" type="button" data-aff-step="-1" aria-label="Affiche précédente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
    <button class="aff-nav aff-next" type="button" data-aff-step="1" aria-label="Affiche suivante"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>`:''}
  </section>`;
}
// Après l'affichage : revenir sur la bonne affiche, suivre le doigt, animer seulement l'affiche visible
function affWire(){
  const tr=document.getElementById('aff-track'); if(!tr) return;
  const n=tr.children.length; AFF.i=Math.max(0,Math.min(n-1,AFF.i));
  if(AFF.i) tr.scrollLeft=AFF.i*affStep(tr);
  affMark(tr);
  let raf=0;
  tr.addEventListener('scroll',()=>{ AFF.at=Date.now(); if(raf) return; raf=requestAnimationFrame(()=>{ raf=0; const i=Math.max(0,Math.min(n-1,Math.round(tr.scrollLeft/affStep(tr)))); if(i!==AFF.i){ AFF.i=i; affMark(tr); } }); },{passive:true});
  tr.addEventListener('pointerdown',()=>{ AFF.down=true; AFF.at=Date.now(); },{passive:true});
  ['pointerup','pointercancel','touchend'].forEach(ev=>tr.addEventListener(ev,()=>{ AFF.down=false; AFF.at=Date.now(); },{passive:true}));
  tr.addEventListener('keydown',e=>{ if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return; e.preventDefault(); affGo(AFF.i+(e.key==='ArrowRight'?1:-1),true); });
}
const affStep = tr => tr.children.length>1 ? tr.children[1].offsetLeft-tr.children[0].offsetLeft : tr.clientWidth;
function affMark(tr){
  [...tr.children].forEach((a,k)=>{ a.classList.toggle('on',k===AFF.i); a.querySelectorAll('.plq-demo').forEach(d=>d.classList.toggle('plq-live',k===AFF.i)); });
  const w=tr.closest('.aff-wrap'); if(!w) return;
  const p=w.querySelector('.aff-prev'), x=w.querySelector('.aff-next'); if(p) p.disabled=AFF.i<=0; if(x) x.disabled=AFF.i>=tr.children.length-1;
}
function affGo(i,focus){
  const tr=document.getElementById('aff-track'); if(!tr) return; i=Math.max(0,Math.min(tr.children.length-1,i));
  AFF.at=Date.now(); tr.scrollTo({left:i*affStep(tr), behavior:reduced()?'auto':'smooth'});
  if(focus){ const c=tr.children[i].querySelector('.af-cta'); if(c) c.focus({preventScroll:true}); }
}
document.addEventListener('click',e=>{
  const to=e.target.closest('[data-aff-to]'); if(to){ affGo(+to.dataset.affTo); return; }
  const st=e.target.closest('[data-aff-step]'); if(st){ affGo(AFF.i+(+st.dataset.affStep)); return; }
  if(e.target.closest('[data-aff-dispo]')){ const d=document.getElementById('dispo'); if(d) d.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'}); }
});
// Ce qui attend une réponse : demandes de mate reçues et messages non lus (rien ne s'affiche s'il n'y a rien)
function todoStrip(){
  const pend=pendingReceived().length, unread=Object.values(S.unread||{}).reduce((a,b)=>a+(+b||0),0);
  if(!pend&&!unread) return '';
  const go='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  return `<div class="todo">${pend?`<button class="todo-item" type="button" data-notif-open><b>${pend}</b><span>demande${pend>1?'s':''} de mate à traiter</span>${go}</button>`:''}${unread?`<a class="todo-item" href="#/messages"><b>${unread}</b><span>message${unread>1?'s':''} non lu${unread>1?'s':''}</span>${go}</a>`:''}</div>`;
}
// Accueil : les 3 joueurs les plus compatibles, juste sous « Dispo maintenant »
function bestMatchesHTML(featured){
  if(!S.me) return '';
  return `<section class="home-sec reveal best"><div class="dispo-head"><h3>Meilleurs matchs</h3>${featured.length?'<a class="linkbtn" href="#/matchs">Tout voir</a>':''}</div>
    ${featured.length?`<div class="list-card rows">${featured.map(({p,c})=>`<a class="row" href="#/joueur/${p.id}">${avatar(p,48)}<div><b>${esc(p.name)}${modBadge(p)}</b><p>${esc(p.games.slice(0,2).join(', '))}${p.games.length>2?` +${p.games.length-2}`:''}</p></div>${ring(c.pct,'ring-sm')}</a>`).join('')}</div>`
      :`<div class="list-card pad"><p class="muted">Aucun joueur compatible pour l'instant : Coopô vient d'ouvrir. Invite tes amis, chaque inscrit peut devenir ton mate.</p><div><button class="btn btn-sm btn-ac" type="button" data-ref-share>Inviter mes amis</button></div></div>`}</section>`;
}
/* ----- Mon profil (création / modification) ----- */
let draft;
// Icônes des lignes du menu Profil (même trait que les icônes de navigation)
const MENU_ICO={
  gift:'<path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13"/><path d="M12 7c-1-3.5-5-3.5-5-.8C7 8 9.5 7 12 7zm0 0c1-3.5 5-3.5 5-.8C17 8 14.5 7 12 7z"/>',
  share:'<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.2 10.9l6.6-3.7M8.2 13.1l6.6 3.7"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17h.01"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.4-2l-.3-.8c-.4-1.1.4-2.2 1.6-2.2H17a4 4 0 0 0 4-4c0-5-4-9-9-9z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
};
const menuRow = (ico,title,sub,href,attr='') => { const inner=`<i class="menu-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ico}</svg></i><span class="menu-txt"><b>${title}</b><small>${sub}</small></span><svg class="menu-go" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
  return href ? `<a class="menu-row" href="${href}" ${attr}>${inner}</a>` : `<button class="menu-row" type="button" ${attr}>${inner}</button>`; };
// Page Profil : qui je suis, puis tout ce qui concerne mon compte, une ligne par chose à faire
function viewProfileHub(){
  const me=publicMe(), mates=matesList().length, rj=+S.me.rejoue||0, games=(S.me.games||[]).slice(0,3);
  app.innerHTML=`<div class="wrap page" style="max-width:760px">
    <div class="page-head"><div><h2>Profil</h2></div></div>
    <section class="panel me-card">
      <div class="me-id${plqOn(me,1)}">${plq(me)}${avatar(me,72)}<div class="me-who"><b class="me-name">${esc(me.name)}${modBadge(me)}</b>${games.length?`<span class="muted">${esc(games.join(' · '))}</span>`:''}
        <span class="me-stats">${mates} mate${mates>1?'s':''}${rj?` · ${rj} ${rj>1?'rejoueraient':'rejouerait'} avec toi`:''}</span></div></div>
      <div class="me-actions"><a class="btn btn-ac" href="#/profil/modifier">Modifier mon profil</a><button class="btn btn-ghost" type="button" data-preview-profile>Voir mon profil public</button></div>
    </section>
    <nav class="menu" aria-label="Mon compte">
      ${menuRow(ICONS.parametres,'Réglages','Confidentialité et compte','#/parametres')}
      ${menuRow(INV_ICON.replace(/^<svg[^>]*>|<\/svg>$/g,''),'Inventaire','Équipe tes thèmes et tes plaques','#/inventaire')}
      ${menuRow(MENU_ICO.palette,'Boutique',`Thèmes et plaques · thème actuel : ${esc((SKINS[S.skin]||SKINS.defaut).label)}`,'#/boutique')}
      ${menuRow(MENU_ICO.gift,'Inviter des amis','Un thème offert quand ton ami s\'inscrit','','data-ref-share')}
      ${menuRow(MENU_ICO.share,'Partager mon profil','Envoie ton lien à tes amis','','data-share-profile')}
      ${menuRow(MENU_ICO.help,'Aide','Questions et contact','#/aide')}
      ${isAdmin()?menuRow(MENU_ICO.shield,'Modération','Signalements, messages reçus, suspensions','#/moderation'):''}
    </nav>
    ${S.auth?'<button class="menu-out" type="button" data-signout>Se déconnecter</button>':''}
  </div>`;
}
// Petit mot d'explication pour ceux qui avaient le thème Awalé (affiché une seule fois)
function retiredNotice(){ if(!S.retiredMsg) return; const nm=esc(typeof S.retiredMsg==='string'?S.retiredMsg:'Awalé'); S.retiredMsg=false; save();
  setTimeout(()=>modal(`<h3>Le thème ${nm} a été retiré</h3><p class="muted">Coopô fait le ménage dans ses thèmes : ${nm} n'est plus disponible, et ton compte est repassé au thème Coopô.</p>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Fermer</button><a class="btn btn-ac" href="#/boutique/themes" data-close>Voir les thèmes</a></div>`),1600); }
function previewProfile(){ modal(`<h3>Ton profil public</h3><p class="muted">Ce que les autres joueurs voient.</p><div style="margin-top:16px">${matchCard({p:publicMe(),c:null})}</div>
    <p class="hint" style="margin-top:12px">Pseudos en jeu : ${S.privacy.tags?'visibles':'masqués'}</p><div class="dlg-actions"><button class="btn" data-close>Fermer</button></div>`); }
document.addEventListener('click',e=>{ if(e.target.closest('[data-preview-profile]')) previewProfile(); if(e.target.closest('[data-share-profile]')) shareProfile(); });
function viewProfile(tab){
  if(!S.auth && !S.me){ location.hash='#/inscription'; return; }
  if(!S.me && dataPending()) return loadingView('Mon profil');   // compte existant en cours de chargement : ne pas afficher l'inscription
  if(!S.me) return viewOnboard();
  if(tab!=='modifier' && profileComplete()) return viewProfileHub();   // profil complet : la page menu ; le formulaire s'ouvre avec « Modifier mon profil »
  const isNew=!S.me;
  draft = JSON.parse(JSON.stringify(S.me || { name:S.auth?suggestName(S.auth.name):'', avatar:{hue:[265,330,10,45,150,200][Math.floor(Math.random()*6)]}, games:[], tags:{}, ranks:{}, roles:{}, hours:[], days:[], style:'', goal:'both', voice:'parfois', platforms:[], country:'', langs:['fr'] }));
  // profil incomplet (ancienne version, données partielles) : on complète les champs manquants au lieu de planter
  draft={ name:'', avatar:{hue:265}, games:[], tags:{}, ranks:{}, roles:{}, hours:[], days:[], style:'', goal:'both', voice:'parfois', platforms:[], country:'', langs:['fr'], ...draft };
  if(!draft.avatar||typeof draft.avatar!=='object') draft.avatar={hue:265};
  ['games','hours','days','platforms','langs'].forEach(k=>{ if(!Array.isArray(draft[k])) draft[k]=[]; }); ['tags','ranks','roles'].forEach(k=>{ if(!draft[k]||typeof draft[k]!=='object') draft[k]={}; });
  draft.ranks=draft.ranks||{}; draft.langs=draft.langs||['fr'];
  if(!draft.dob) draft.dob=knownDob();
  const hues=[265,330,10,45,150,200];
  app.innerHTML = `<div class="wrap page">${profileComplete()?backLink('#/profil','Profil'):''}
  <div class="page-head"><div><h2>${isNew?'Créer mon profil':profileComplete()?'Modifier mon profil':'Complète ton profil'}</h2>
    <p>${isNew?'Étape 2 sur 3 · Ajoute tes jeux et tes habitudes pour découvrir tes matchs. Ton profil est nécessaire pour accéder à Coopô.':'Tes modifications mettent à jour tes pourcentages de compatibilité.'}</p>${isNew&&S.auth?`<p class="muted" style="font-size:13px">Connecté : ${esc(S.auth.email||S.auth.name||'')} · <button class="linklike" type="button" data-signout>Se déconnecter</button></p>`:''}</div>
    ${isNew?'':'<button class="btn btn-ghost btn-sm" type="button" data-preview-profile>Aperçu</button>'}</div>
  ${isNew&&!S.auth?`<section class="panel login" style="margin-bottom:18px"><h3>Gagne du temps</h3><p class="muted">Crée ton compte en un clic : ton nom et ta photo sont préremplis.</p><div class="gbtn"></div><div class="or"><span>ou remplis le formulaire avec un mot de passe</span></div></section>`:''}
  <form class="form" id="pf" novalidate>
    <section class="panel"><h3>Compte</h3>
      <div class="two">
        <div class="field"><label for="f-name">Nom d'utilisateur</label><input id="f-name" type="text" autocomplete="username" maxlength="${CONFIG.maxUsername}" value="${esc(draft.name)}"><span class="hint">${CONFIG.minUsername} à ${CONFIG.maxUsername} caractères : lettres, chiffres, _ . -</span></div>
        ${dobField()}
      </div>
      ${S.auth ? '' : `<div class="two">
        <div class="field"><label for="f-pw">${isNew?'Mot de passe':'Nouveau mot de passe (facultatif)'}</label><input id="f-pw" type="password" autocomplete="new-password">
          <div class="strength"><i id="pw-bar" style="--w:0%"></i></div><span class="hint" id="pw-hint">Au moins ${CONFIG.minPassword} caractères, avec une lettre et un chiffre.</span></div>
        <div class="field"><label for="f-pw2">Confirmer le mot de passe</label><input id="f-pw2" type="password" autocomplete="new-password"></div>
      </div>`}
      <div class="field"><span class="lbl">Avatar</span>
        <div class="avatar-pick" id="avpick">${hues.map(h=>`<button type="button" data-hue="${h}" aria-label="Avatar couleur ${h}" aria-pressed="${!draft.avatar.src&&draft.avatar.hue===h}">${avatar({name:draft.name||'Toi',avatar:{hue:h}},48)}</button>`).join('')}
          <span class="btn btn-ghost btn-sm upload">Importer une image<input type="file" accept="image/*" id="f-av" aria-label="Importer une image d\'avatar"></span>${ageGroup(draft)==='minor'?'<span class="hint">Ta photo est vue par tous les joueurs. Choisis-en une qui ne montre ni ton adresse, ni ton école.</span>':''}
          <span id="av-prev">${draft.avatar.src?avatar(draft,48):''}</span></div></div>
    </section>
    <section class="panel"><h3>Jeux joués</h3>
      ${(()=>{ const all=[...new Set([...GAMES,...draft.games])], main=all.filter(g=>TOP_GAMES.includes(g)||draft.games.includes(g)), more=all.filter(g=>!main.includes(g));
        return chips('games',main.map(g=>[g,g]),draft.games)+`<details class="ob-more"><summary>Autres jeux (${more.length})</summary><div style="margin:10px 0">${chips('games',more.map(g=>[g,g]),draft.games)}</div>
          <div class="range-row" style="max-width:420px"><input type="text" id="f-other" placeholder="Un autre jeu ?" aria-label="Ajouter un autre jeu"><button type="button" class="btn btn-sm" id="add-game">Ajouter</button></div></details>`; })()}
      <div class="field"><span class="lbl">Ton profil par jeu</span><span class="hint">Pseudo ou ID, rang et rôle : ça aide à trouver des mates de ton niveau.</span><div class="gameprofs" id="tags"></div></div>
    </section>
    <section class="panel"><h3>Disponibilités</h3>
      <div class="field"><span class="lbl">Horaires de jeu</span>${chips('hours',HOURS,draft.hours)}</div>
      <div class="field"><span class="lbl">Jours</span>${chips('days',DAYS,draft.days)}</div>
    </section>
    <section class="panel"><h3>Style et préférences</h3>
      <div class="field"><span class="lbl">Style de jeu</span>${chips('style',STYLES,draft.style,true)}</div>
      <div class="field"><span class="lbl">Tu cherches des joueurs pour…</span>${chips('goal',GOALS,draft.goal,true)}</div>
      <div class="field"><span class="lbl">Communication</span>${chips('voice',VOICE,draft.voice,true)}</div>
      <div class="field"><span class="lbl">Plateformes</span>${chips('platforms',PLATFORMS,draft.platforms)}</div>
      <div class="two"><div class="field"><label for="f-country">Pays</label><select id="f-country"><option value="">Choisir…</option>${COUNTRIES.map(([v,l])=>`<option value="${v}" ${draft.country===v?'selected':''}>${esc(l)}</option>`).join('')}</select></div>
        ${langField()}</div>
    </section>
    <p class="err" id="ferr" role="alert"></p>
    <div class="form-actions"><button class="btn btn-ac btn-lg" type="submit">${isNew?'Créer mon profil':'Enregistrer les modifications'}</button></div>
  </form></div>`;
  renderTags();
  const f=document.getElementById('pf');
  f.addEventListener('click',e=>{
    const c=e.target.closest('.chip'); if(c){ toggleChip(c); return; }
    const h=e.target.closest('[data-hue]'); if(h){ draft.avatar={hue:+h.dataset.hue}; f.querySelectorAll('[data-hue]').forEach(b=>b.setAttribute('aria-pressed',b===h)); document.getElementById('av-prev').innerHTML=''; }
  });
  initDob();
  document.getElementById('f-name').addEventListener('input',e=>{ draft.name=e.target.value; f.querySelectorAll('[data-hue] .av').forEach(a=>a.textContent=(draft.name||'To').slice(0,2).toUpperCase()); });
  document.getElementById('f-pw')?.addEventListener('input',e=>{ const s=pwStrength(e.target.value); const bar=document.getElementById('pw-bar');
    bar.style.setProperty('--w',s*25+'%'); bar.style.setProperty('--sc',['var(--lo)','var(--lo)','var(--warm)','var(--mid)','var(--hi)'][s]); });
  document.getElementById('f-av')?.addEventListener('change',e=>loadAvatar(e.target.files[0]));
  document.getElementById('f-country').addEventListener('change',e=>{ draft.country=e.target.value; });
  document.getElementById('add-game').addEventListener('click',addOtherGame);
  document.getElementById('f-other').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); addOtherGame(); }});
  f.addEventListener('submit',submitProfile);
}

/* ----- Champ date de naissance (jour / mois / année) ----- */
const knownDob = () => (S.me&&S.me.dob) || (S.auth&&S.dobs&&S.dobs[S.auth.uid]) || '';
const MONTHS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const LOCK_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
function dobField(){
  const kd=knownDob();
  if(kd){
    const [y,m,d]=kd.split('-').map(Number);
    return `<div class="field"><span class="lbl">Date de naissance</span><div class="dob-locked">${LOCK_ICON}<span>${d} ${MONTHS[m-1]} ${y}</span><b>${ageFrom(kd)} ans</b></div><span class="hint">Elle ne peut plus être modifiée. Contacte le support en cas d'erreur.</span></div>`;
  }
  const [y,m,d]=(draft.dob||'--').split('-'), Y=new Date().getFullYear();
  const opt=(v,l,sel)=>`<option value="${v}" ${sel?'selected':''}>${l}</option>`;
  return `<div class="field" role="group" aria-labelledby="dob-lbl"><span class="lbl" id="dob-lbl">Date de naissance</span>
    <div class="dob-row">
      <label class="dob-f"><span>Jour</span><select id="dob-d"><option value="">--</option>${Array.from({length:31},(_,i)=>opt(i+1,i+1,+d===i+1)).join('')}</select></label>
      <label class="dob-f"><span>Mois</span><select id="dob-m"><option value="">--</option>${MONTHS.map((n,i)=>opt(i+1,n[0].toUpperCase()+n.slice(1),+m===i+1)).join('')}</select></label>
      <label class="dob-f"><span>Année</span><select id="dob-y"><option value="">----</option>${Array.from({length:96},(_,i)=>Y-5-i).map(v=>opt(v,v,+y===v)).join('')}</select></label>
    </div>
    <div class="dob-status" id="dob-status" aria-live="polite"></div>
    <span class="hint">Il faut avoir au moins ${CONFIG.minAge} ans. Elle n'est jamais affichée aux autres joueurs.</span></div>`;
}
function initDob(){
  const D=document.getElementById('dob-d'); if(!D) return;
  const M=document.getElementById('dob-m'), Y=document.getElementById('dob-y'), st=document.getElementById('dob-status');
  const update=animate=>{
    const max = M.value ? new Date(+Y.value||2000, +M.value, 0).getDate() : 31;
    [...D.options].forEach(o=>{ if(o.value) o.disabled = +o.value>max; });
    if(+D.value>max) D.value='';
    [D,M,Y].forEach(x=>x.classList.toggle('filled',!!x.value));
    if(D.value && M.value && Y.value){
      draft.dob=`${Y.value}-${M.value.padStart(2,'0')}-${D.value.padStart(2,'0')}`;
      const a=ageFrom(draft.dob);
      if(a<CONFIG.minAge){ st.className='dob-status bad'; st.innerHTML=`<b>${a} ans</b><span>Il faut avoir au moins ${CONFIG.minAge} ans pour utiliser Coopô.</span>`; }
      else{ const minor=a<CONFIG.adultAge; st.className='dob-status ok';
        st.innerHTML=`<b>${a} ans</b><span>${!CONFIG.separateMinors?(minor?'Parfait, tu peux trouver ton mate. Avec les joueurs de 18 ans et plus, c\'est toi qui envoies la demande.':'Parfait, tu peux trouver ton mate.'):minor?`Tu verras les joueurs de ${CONFIG.minAge} à ${CONFIG.adultAge-1} ans.`:`Tu verras les joueurs de ${CONFIG.adultAge} ans et plus.`}</span>`; }
      if(animate){ st.classList.remove('pop'); void st.offsetWidth; st.classList.add('pop'); }
    } else { draft.dob=''; st.className='dob-status'; st.textContent=''; }
  };
  [D,M,Y].forEach(x=>x.addEventListener('change',()=>update(true)));
  update(false);
}
function toggleChip(c){
  c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  const g=c.dataset.chip, v=c.dataset.val;
  if(c.dataset.single){ draft[g]=v; c.parentElement.querySelectorAll('.chip').forEach(b=>b.setAttribute('aria-pressed',b===c)); return; }
  const on = c.getAttribute('aria-pressed')!=='true';
  if(on && g==='langs' && draft.langs.length>=LANG_MAX){ toast(`${LANG_MAX} langues au maximum`); return; }
  c.setAttribute('aria-pressed',on);
  draft[g] = on ? [...draft[g],v] : draft[g].filter(x=>x!==v);
  if(g==='games') renderTags();
}
function addOtherGame(){
  const i=document.getElementById('f-other'), v=i.value.trim().slice(0,40); if(!v) return;
  if(!draft.games.includes(v)) draft.games.push(v);
  const box=document.querySelector('.chips'); if(!box.querySelector(`[data-val="${CSS.escape(v)}"]`)){
    box.insertAdjacentHTML('beforeend',`<button type="button" class="chip" data-chip="games" data-val="${esc(v)}" aria-pressed="true">${esc(v)}</button>`); }
  else box.querySelector(`[data-val="${CSS.escape(v)}"]`).setAttribute('aria-pressed','true');
  i.value=''; renderTags();
}
function renderTags(){
  const el=document.getElementById('tags');
  draft.roles=draft.roles||{};
  el.innerHTML = draft.games.length ? draft.games.map((g,i)=>{ const opts=rankOptions(g), cur=draft.ranks[g];
    return `<div class="gameprof"><b>${esc(g)}</b><div class="gp-row">
      <input id="tag${i}" type="text" data-game="${esc(g)}" maxlength="40" value="${esc(draft.tags[g]||'')}" placeholder="Pseudo ou ID sur ${esc(g)}" aria-label="Ton pseudo ou ID sur ${esc(g)}">
      <select data-rank="${esc(g)}" aria-label="Ton rang sur ${esc(g)}"><option value="">${GAME_RANKS[g]?'Rang…':'Niveau…'}</option>${opts.map(([v,l])=>`<option value="${esc(v)}" ${cur===v?'selected':''}>${esc(l)}</option>`).join('')}${cur&&!opts.some(([v])=>v===cur)?`<option value="${esc(cur)}" selected>${esc(rankLabel(g,cur))}</option>`:''}</select>
      ${GAME_ROLES[g]?`<select data-role="${esc(g)}" aria-label="Ton rôle sur ${esc(g)}"><option value="">Rôle…</option>${GAME_ROLES[g].map(r=>`<option value="${esc(r)}" ${draft.roles[g]===r?'selected':''}>${esc(r)}</option>`).join('')}</select>`:''}
    </div></div>`; }).join('')
    : '<p class="hint">Sélectionne tes jeux pour ajouter ton pseudo, ton rang et ton rôle.</p>';
  el.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>{ draft.tags[i.dataset.game]=i.value.trim(); }));
  el.querySelectorAll('select[data-rank]').forEach(x=>x.addEventListener('change',()=>{ if(x.value) draft.ranks[x.dataset.rank]=x.value; else delete draft.ranks[x.dataset.rank]; }));
  el.querySelectorAll('select[data-role]').forEach(x=>x.addEventListener('change',()=>{ if(x.value) draft.roles[x.dataset.role]=x.value; else delete draft.roles[x.dataset.role]; }));
}
function pwStrength(p){ let s=0; if(p.length>=CONFIG.minPassword) s++; if(/[a-zA-Z]/.test(p)&&/\d/.test(p)) s++; if(/[^a-zA-Z0-9]/.test(p)) s++; if(p.length>=12) s++; return p?Math.max(s,1):0; }
function loadAvatar(file){
  if(!file||!file.type.startsWith('image/')) return;
  const img=new Image(), url=URL.createObjectURL(file);
  img.onload=()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'), m=Math.min(img.width,img.height);   // 128 px suffisent (affichage 88 px max) : image 2 fois plus légère
    x.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,128,128); draft.avatar={src:c.toDataURL('image/jpeg',.72)}; URL.revokeObjectURL(url);
    document.querySelectorAll('[data-hue]').forEach(b=>b.setAttribute('aria-pressed','false')); document.getElementById('av-prev').innerHTML=avatar(draft,48); };
  img.src=url;
}
async function submitProfile(e){
  e.preventDefault(); const sbtn=e.target.querySelector('button[type=submit]'); if(sbtn&&sbtn.disabled) return;
  const isNew=!S.me, pw=document.getElementById('f-pw')?.value||'', pw2=document.getElementById('f-pw2')?.value||'';
  draft.name=draft.name.trim(); delete draft.discord; delete draft.whatsapp; delete draft.socials;   // Coopô ne garde plus aucun pseudo d'autres réseaux
  const errs=[];
  if(!new RegExp(`^[A-Za-z0-9_.-]{${CONFIG.minUsername},${CONFIG.maxUsername}}$`).test(draft.name)) errs.push("Choisis un nom d'utilisateur de 3 à 20 caractères (lettres, chiffres, _ . -).");
  if(PLAYERS.some(p=>p.name.toLowerCase()===draft.name.toLowerCase())) errs.push("Ce nom d'utilisateur est déjà pris.");
  if(!S.auth && (isNew||pw)){ if(pw.length<CONFIG.minPassword||!/[a-zA-Z]/.test(pw)||!/\d/.test(pw)) errs.push(`Le mot de passe doit faire au moins ${CONFIG.minPassword} caractères, avec une lettre et un chiffre.`);
    else if(pw!==pw2) errs.push('Les deux mots de passe ne sont pas identiques.'); }
  const age=ageFrom(draft.dob);
  if(age===null) errs.push('Indique ta date de naissance.');
  else if(age<CONFIG.minAge) errs.push(`Tu dois avoir au moins ${CONFIG.minAge} ans pour utiliser Coopô.`);
  else if(age>100) errs.push('Vérifie ta date de naissance.');
  if(!draft.games.length) errs.push('Sélectionne au moins un jeu.');
  if(!draft.hours.length) errs.push('Indique au moins un horaire de jeu.');
  if(!draft.style) errs.push('Choisis ton style de jeu.');
  if(!draft.platforms.length) errs.push('Sélectionne au moins une plateforme.');
  const fe=document.getElementById('ferr');
  const nameChanged = !!S.me && draft.name.toLowerCase()!==String(S.me.name||'').toLowerCase();
  if(nameChanged && S.me.nameAt && Date.now()-S.me.nameAt < NAME_WAIT_DAYS*864e5) errs.push(nameWaitMsg(S.me.nameAt+NAME_WAIT_DAYS*864e5));
  if(!errs.length && (!S.me || draft.name.toLowerCase()!==String(S.me.name||'').toLowerCase())){ if(sbtn) sbtn.disabled=true; const taken=await DB.nameTaken(draft.name); if(sbtn) sbtn.disabled=false; if(taken) errs.push("Ce nom d'utilisateur est déjà pris."); }
  if(errs.length){ fe.innerHTML=errs.map(esc).join('<br>'); fe.scrollIntoView({block:'center'}); return; }
  // Le mot de passe n'est jamais stocké ici. En production : l'envoyer en HTTPS au serveur, qui le hache (argon2 / bcrypt).
  Object.keys(draft.tags).forEach(g=>{ if(!draft.games.includes(g)) delete draft.tags[g]; });
  Object.keys(draft.ranks).forEach(g=>{ if(!draft.games.includes(g)) delete draft.ranks[g]; });
  Object.keys(draft.roles||{}).forEach(g=>{ if(!draft.games.includes(g)) delete draft.roles[g]; });
  if(!draft.langs.length) draft.langs=['fr'];
  S.langAsk=false;
  const prevMe=S.me, sLabel=sbtn?sbtn.textContent:'', wasComplete=profileComplete();
  S.me={...draft,id:'me'}; if(nameChanged) S.me.nameAt=Date.now(); else if(prevMe&&prevMe.nameAt) S.me.nameAt=prevMe.nameAt;
  if(S.auth) S.profiles[S.auth.uid]=S.me; if(isNew) S.onboard=true; save();
  if(sbtn){ sbtn.disabled=true; sbtn.textContent='Enregistrement…'; }
  if(!(await DB.saveProfile(S.me))){   // échec : on revient à l'ancien profil, sans faire croire que c'est enregistré
    S.me=prevMe; if(S.auth&&prevMe) S.profiles[S.auth.uid]=prevMe; save(); if(sbtn){ sbtn.disabled=false; sbtn.textContent=sLabel; }
    if(DB._saveErr==='nameWait'&&prevMe){ prevMe.nameAt=DB._nameAt; save(); }   // on retient la date pour prévenir tout de suite la prochaine fois
    fe.textContent = DB._saveErr==='nameWait' ? nameWaitMsg(DB._nameAt+NAME_WAIT_DAYS*864e5) : DB._saveErr==='name' ? "Ce nom d'utilisateur vient d'être pris. Choisis-en un autre." : "Tes modifications n'ont pas pu être enregistrées. Vérifie ta connexion et réessaie.";
    fe.scrollIntoView({block:'center'}); return; }
  demoScheduleIncoming();
  toast(isNew?'Profil créé':'Modifications enregistrées');
  let next=wasComplete?'#/profil':'#/matchs'; if(isNew){ try{ next=sessionStorage.getItem('coopo_after_profile')||sessionStorage.getItem('coopo_after_login')||'#/matchs'; sessionStorage.removeItem('coopo_after_profile'); sessionStorage.removeItem('coopo_after_login'); }catch(e){} }
  location.hash=next;
}
function publicMe(){ return {...S.me, online:S.privacy.online, lastSeen:Date.now()}; }

/* ----- Mes matchs ----- */
let _lastRefresh=0;
function refreshAfterData(){
  splashSync();   // les données sont là : l'écran d'ouverture peut se retirer
  if((document.body.classList.contains('is-home') && affBusy()) || navBusy()){ clearTimeout(AFF.t); AFF.t=setTimeout(refreshAfterData,950); return; }   // v17 — le doigt fait glisser les affiches (v18 : ou une conversation) : on redessine juste après
  // Un écran de chargement (squelette) est affiché : on le remplace toujours par la vraie page, quelle que soit la page
  const waiting=!!document.querySelector('#app [aria-busy="true"]');
  if(!waiting && Date.now()-_lastRefresh<800) return; _lastRefresh=Date.now();
  const a=document.activeElement, typing=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.value;
  const h=location.hash||'#/accueil';
  if(waiting || (!typing && /^#\/(accueil|matchs|groupes|messages|moderation|joueur|recherche|parametres)?(\/|$)/.test(h))) { const y=scrollY; route(); scrollTo(0,y); }
}
// Profil venu de Firestore : on complète les champs manquants pour qu'aucune page ne plante
function normP(p){ p=p||{}; ['games','hours','days','platforms','langs'].forEach(k=>{ if(!Array.isArray(p[k])) p[k]=[]; }); ['tags','ranks','roles'].forEach(k=>{ if(!p[k]||typeof p[k]!=='object') p[k]={}; });
  if(!p.avatar||typeof p.avatar!=='object') p.avatar={hue:265}; if(typeof p.name!=='string'||!p.name) p.name='Joueur';
  if(p.langs.some(x=>!LANG_OK.has(x))){ p.langs=p.langs.filter(x=>LANG_OK.has(x)); p._langLost=true; }   // langue retirée de la liste
  return p; }
const dataPending = () => DB.live && !!S.auth && !DB._loaded;
/* Écran squelette : on montre tout de suite la forme des cartes pendant que les données arrivent */
function loadingView(title){ const sk=`<div class="mcard sk-card" aria-hidden="true"><div class="mc-head"><span class="sk sk-av"></span><div class="sk-lines"><span class="sk" style="width:60%"></span><span class="sk" style="width:35%"></span></div></div><span class="sk" style="width:90%"></span><span class="sk" style="width:70%"></span></div>`;
  app.innerHTML=`<div class="wrap page" aria-busy="true"><div class="page-head"><div><h2>${title}</h2><p class="muted">Chargement de tes données…</p></div></div><div class="grid">${sk.repeat(6)}</div></div>`; }
function needProfile(title){
  app.innerHTML=`<div class="wrap page"><div class="page-head"><h2>${title}</h2></div><div class="empty"><h3>Crée ton profil pour voir tes matchs</h3>
  <p class="muted">Tes jeux, horaires et style servent à calculer ta compatibilité avec chaque joueur.</p><a class="btn btn-ac" href="#/profil">Créer mon profil</a>${S.auth?'':'<a class="linkbtn" href="#/connexion">J\'ai déjà un compte</a>'}</div></div>`;
}
let shown=9;
function viewMatches(){
  if(dataPending()) return loadingView('Mes matchs');
  if(!S.me) return needProfile('Mes matchs');
  if(DB.live&&DB._loaded) DB.refreshPlayers().then(ch=>{ if(ch&&location.hash==='#/matchs') refreshAfterData(); }).catch(()=>{});
  if(!S.me.dob){ app.innerHTML=`<div class="wrap page"><div class="page-head"><h2>Mes matchs</h2></div><div class="empty"><h3>Ajoute ta date de naissance</h3><p class="muted">Elle sert à te proposer les bons joueurs. Elle n'est jamais affichée.</p><a class="btn btn-ac" href="#/profil">Compléter mon profil</a></div></div>`; return; }
  const vis=visible(), mates=matesList(), onlineNow=ranked().filter(({p})=>isOnline(p));
  let r=ranked(); if(S.sort==='online') r=[...r].sort((a,b)=>(isOnline(b.p)-isOnline(a.p))||(b.c.pct-a.c.pct));
  app.innerHTML=`<div class="wrap page">
    <div class="page-head"><div><h2>Mes matchs</h2><p>${r.length?`${r.length} joueur${r.length>1?"s":""}, du plus compatible au moins compatible.`:"Aucun joueur n'est encore inscrit."}</p></div></div>
    <a class="search-entry" href="#/recherche"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${ICONS.recherche}</svg><span>Chercher un joueur, un jeu…</span></a>
    ${profileNudge()}
    ${r.length>1?`<div class="chips sort-row" role="group" aria-label="Trier"><span class="sort-lbl">Trier par</span><button type="button" class="chip" data-sort="compat" aria-pressed="${S.sort!=='online'}">Compatibilité</button><button type="button" class="chip" data-sort="online" aria-pressed="${S.sort==='online'}">En ligne d'abord</button></div>`:''}
    ${onlineNow.length?`<h3 style="margin-bottom:10px"><span class="online"></span> En ligne maintenant</h3><div class="online-strip">${onlineNow.slice(0,10).map(({p,c})=>`<a class="online-card" href="#/joueur/${p.id}">${avatar(p,56)}<b>${esc(p.name)}${modBadge(p)}</b><span style="color:${tierTx(c.pct)}">${c.pct} %</span></a>`).join('')}</div>`:''}
    ${mates.length?`<h3 style="margin-bottom:10px">Mes mates</h3><div class="mates-strip">${mates.map(p=>`<a class="mate-pill" href="#/joueur/${p.id}">${avatar(p,28)}${esc(p.name)}${modBadge(p)}</a>`).join('')}</div>`:''}
    ${r.length?'':`<div class="empty"><h3>Coopô vient d'ouvrir</h3><p class="muted">Les premiers joueurs arrivent. Partage le site à tes amis : dès qu'un joueur compatible s'inscrit, il apparaît ici.</p><button class="btn btn-ac" type="button" id="ref-share">Inviter mes amis</button></div>`}
    <div class="grid">${r.slice(0,shown).map((m,i)=>matchCard(m,i===0,i)).join('')}</div>
    ${r.length>shown?'<div style="text-align:center;margin-top:24px"><button class="btn" id="more">Voir plus de joueurs</button></div>':''}
  </div>`;
  document.getElementById('more')?.addEventListener('click',()=>{ shown+=9; viewMatches(); animateAfterRender(); });
  app.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{ S.sort=b.dataset.sort; save(); viewMatches(); animateAfterRender(); });
  onboarding();
}

/* ----- Recherche ----- */
const F={q:'',game:'',level:'',platform:'',hour:'',style:'',lang:'',country:'',online:false,min:0,shown:24};   // shown : nombre de cartes affichées (pagination)
const F_MORE=['level','platform','hour','style','lang','country'];   // filtres rangés sous « Plus de filtres »
const filtersOn = () => ['q','game',...F_MORE].filter(k=>F[k]).length + (F.online?1:0) + (F.min>0?1:0);
function resetFilters(){ Object.assign(F,{q:'',game:'',level:'',platform:'',hour:'',style:'',lang:'',country:'',online:false,min:0,shown:24}); }
function viewSearch(){
  const opt=(arr,sel)=>arr.map(([v,l])=>`<option value="${esc(v)}" ${sel===v?'selected':''}>${esc(l)}</option>`).join('');
  const sel=(id,k,label,all,arr)=>`<div class="field"><label for="${id}">${label}</label><select id="${id}" data-f="${k}"><option value="">${all}</option>${opt(arr,F[k])}</select></div>`;
  const games=[...new Set([...GAMES,...visible().flatMap(p=>p.games),...(F.game?[F.game]:[])])];   // la liste + les jeux ajoutés par les joueurs
  const nMore=F_MORE.filter(k=>F[k]).length;
  app.innerHTML=`<div class="wrap page">
    ${backLink('#/matchs','Mes matchs')}
    <div class="page-head"><div><h2>Recherche</h2><p>Trouve un joueur par son pseudo ou selon tes critères.</p></div></div>
    ${gamesPulse()}
    <div class="filters" id="filters">
      <div class="field"><label for="s-q">Pseudo</label><input id="s-q" type="search" data-f="q" value="${esc(F.q)}" placeholder="Rechercher un joueur" autocomplete="off"></div>
      ${sel('s-g','game','Jeu','Tous',games.map(g=>[g,g]))}
      <label class="f-check"><input type="checkbox" id="s-on" data-f="online" ${F.online?'checked':''}> En ligne ou dispo</label>
      <details class="f-more"${nMore||innerWidth>860?' open':''}><summary>Plus de filtres${nMore?` (${nMore})`:''}</summary><div class="f-more-body">
        ${sel('s-l','level','Niveau','Tous',RANKS)}
        ${sel('s-p','platform','Plateforme','Toutes',PLATFORMS)}
        ${sel('s-h','hour','Horaire','Tous',HOURS)}
        ${sel('s-s','style','Style','Tous',STYLES.slice(0,2))}
        ${sel('s-la','lang','Langue','Toutes',LANGS)}
        ${sel('s-c','country','Pays','Tous',COUNTRIES)}
        ${S.me?`<div class="field f-wide"><label for="s-m">Compatibilité minimum</label><div class="range-row"><input id="s-m" type="range" min="0" max="100" step="5" data-f="min" value="${F.min}"><output id="s-mo">${F.min} %</output></div></div>`:''}
      </div></details>
    </div>
    <p class="count" aria-live="polite"><span id="count"></span> <button type="button" class="linklike" id="s-reset" hidden>Effacer les filtres</button></p><div class="grid" id="results"></div></div>`;
  let tq; // debounce : on attend que le joueur arrête de taper (250 ms) avant de relancer la recherche
  document.getElementById('filters').addEventListener('input',e=>{ const k=e.target.dataset.f; if(!k) return;
    F[k]= k==='min' ? +e.target.value : k==='online' ? e.target.checked : e.target.value; if(k==='min') document.getElementById('s-mo').textContent=F.min+' %';
    clearTimeout(tq); if(k==='q'||k==='min') tq=setTimeout(()=>{ F.shown=24; renderResults(); },250); else { F.shown=24; renderResults(); } });
  document.getElementById('s-reset').onclick=()=>{ resetFilters(); viewSearch(); };
  renderResults();
  if(DB.live&&S.me&&DB._loaded) DB.refreshPlayers().then(ch=>{ if(ch&&location.hash==='#/recherche'&&document.getElementById('results')) renderResults(); }).catch(()=>{});
}
function renderResults(){
  const lvl=(p,g)=>{ const l=rankLevel(g,(p.ranks||{})[g]); return l==null?null:Math.round(l); };   // rang du jeu ramené sur 5 niveaux
  let rows = S.me ? ranked() : visible().map(p=>({p,c:null}));
  rows = rows.filter(({p,c})=>(!F.q||p.name.toLowerCase().includes(F.q.toLowerCase())) && (!F.game||p.games.includes(F.game))
    && (!F.level||(F.game?lvl(p,F.game)===+F.level:p.games.some(g=>lvl(p,g)===+F.level)))
    && (!F.platform||p.platforms.includes(F.platform)) && (!F.hour||p.hours.includes(F.hour))
    && (!F.style||p.style===F.style||p.style==='both')
    && (!F.lang||(p.langs&&p.langs.length?p.langs:['fr']).includes(F.lang)) && (!F.country||p.country===F.country)
    && (!F.online||isOnline(p)||dispoActive(p)) && (!c||c.pct>=F.min));
  document.getElementById('count').textContent = `${rows.length} joueur${rows.length>1?'s':''} trouvé${rows.length>1?'s':''}`;
  document.getElementById('s-reset').hidden = !filtersOn();
  // Pagination : on n'affiche que les 24 premiers joueurs, puis 24 de plus à chaque clic
  document.getElementById('results').innerHTML = rows.length ? rows.slice(0,F.shown).map((m,i)=>matchCard(m,false,Math.min(i,10))).join('')
      + (rows.length>F.shown?`<div style="grid-column:1/-1;text-align:center;margin-top:8px"><button class="btn" type="button" id="more-results">Voir plus de joueurs (${rows.length-F.shown})</button></div>`:'')
    : `<div class="empty" style="grid-column:1/-1"><h3>Aucun mate trouvé</h3><p class="muted">${filtersOn()?'Essaie d\'élargir tes filtres : retires-en un, ou baisse la compatibilité minimum.':'Aucun joueur n\'est encore inscrit. Invite tes amis !'}</p>${filtersOn()?'<button class="btn btn-ac" type="button" id="s-reset2">Effacer les filtres</button>':'<button class="btn btn-ac" type="button" data-ref-share>Inviter mes amis</button>'}</div>`;
  const more=document.getElementById('more-results'); if(more) more.onclick=()=>{ F.shown+=24; renderResults(); };
  const r2=document.getElementById('s-reset2'); if(r2) r2.onclick=()=>{ resetFilters(); viewSearch(); };
  animateAfterRender(document.getElementById('results'));
}
/* ----- Profil public d'un joueur ----- */
// Les jeux du profil (avec le pseudo en jeu quand on a le droit de le voir)
const ppGames = (p,showTags,shared) => (p.games||[]).map(g=>`<div class="gametag${shared(g)?' shared':''}"><span>${esc(g)}${p.ranks&&p.ranks[g]?` <small class="rank">${esc(rankLabel(g,p.ranks[g]))}</small>`:''}${p.roles&&p.roles[g]?` <small class="rank role">${esc(p.roles[g])}</small>`:''}</span>${showTags&&p.tags&&p.tags[g]?`<em>${esc(p.tags[g])}</em>`:shared(g)?'<em class="common">En commun</em>':'<em></em>'}</div>`).join('');
const UNMATE_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9.5" cy="8" r="3.5"/><path d="M3 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M16 10h6"/></svg>';
/* ---- Modération depuis le profil d'un joueur (modérateurs seulement) ----
   Suspendre 1, 7 ou 30 jours (suspendedUntil : le compte ne peut plus se connecter ni écrire jusqu'à cette date),
   masquer le profil, bannir, et lever chaque sanction. Jamais sur un autre modérateur (les règles Firebase le refusent aussi). */
function modState(p){ const ban=S.banned.includes(p.id)||!!p.banned, hid=S.hidden.includes(p.id)||!!p.hidden, su=suspendedP(p);
  return { ban, hid, su, txt: ban?'Banni : ne peut plus se connecter.':su?`Suspendu jusqu'au ${fmtDay(+p.suspendedUntil)}.`:hid?'Profil masqué : les autres joueurs ne le voient plus.':'Compte actif.' }; }
function modPanel(p){ const s=modState(p);
  return `<section class="mod-box" aria-label="Modération"><h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MENU_ICO.shield}</svg>Modération</h3><p class="mod-state${s.ban||s.su?' bad':''}">${s.txt}</p>
    ${s.ban?`<button class="btn btn-sm" type="button" data-mod="unban">Lever le ban</button>`
      :`<div class="mod-acts">${s.su?`<button class="btn btn-sm" type="button" data-mod="unsusp">Lever la suspension</button>`
          :`<span class="mod-lbl">Suspendre</span>${[1,7,30].map(d=>`<button class="btn btn-sm btn-ghost" type="button" data-mod="susp" data-days="${d}">${d} jour${d>1?'s':''}</button>`).join('')}`}</div>
        <div class="mod-acts"><button class="btn btn-sm btn-ghost" type="button" data-mod="hide">${s.hid?'Rétablir le profil':'Masquer le profil'}</button><button class="btn btn-sm btn-danger" type="button" data-mod="ban">Bannir</button></div>`}</section>`; }
function modAction(p,act,days,done){ const id=p.id, nm=esc(p.name), fin=()=>{ save(); if(done) done(); };
  const closeRep=()=>{ DB.closeReports(id); S.reports.forEach(r=>{ if(r.id===id) r.status='done'; }); };
  const fail="Ça n'a pas marché. Vérifie ta connexion et réessaie.";
  if(act==='susp'){ const until=Date.now()+days*864e5;
    modal(`<h3>Suspendre ${nm} ${days} jour${days>1?'s':''} ?</h3><p class="muted">Jusqu'au ${fmtDay(until)}, ${nm} ne pourra plus se connecter ni écrire, et n'apparaîtra plus dans les matchs. Tu pourras lever la suspension avant la fin.</p>
      <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-danger" id="mok">Suspendre</button></div>`,
      d=>d.querySelector('#mok').onclick=async ev=>{ ev.currentTarget.disabled=true; const ok=await DB.adminSuspend(id,until); d.close();
        if(ok){ p.suspendedUntil=until; closeRep(); toast(`${p.name} est suspendu jusqu'au ${fmtDay(until)}`,4000); } else toast(fail); fin(); }); }
  else if(act==='unsusp'){ DB.adminSuspend(id,0).then(ok=>{ if(ok){ p.suspendedUntil=0; toast('Suspension levée'); } else toast(fail); fin(); }); }
  else if(act==='ban'){
    modal(`<h3>Bannir ${nm} ?</h3><p class="muted">Le profil disparaît pour tout le monde et le compte ne peut plus se connecter. Tu pourras lever le ban plus tard.</p><div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-danger" id="mok">Bannir</button></div>`,
      d=>d.querySelector('#mok').onclick=async ev=>{ ev.currentTarget.disabled=true; const ok=await DB.adminBan(id,true); d.close();
        if(ok){ p.banned=p.hidden=true; if(!S.banned.includes(id)) S.banned.push(id); if(!S.hidden.includes(id)) S.hidden.push(id); closeRep(); toast(`${p.name} est banni`); } else toast(fail); fin(); }); }
  else if(act==='unban'){ DB.adminBan(id,false).then(ok=>{ if(ok){ p.banned=p.hidden=false; S.banned=S.banned.filter(x=>x!==id); S.hidden=S.hidden.filter(x=>x!==id); toast('Ban levé'); } else toast(fail); fin(); }); }
  else if(act==='hide'){ const h=!modState(p).hid; DB.adminHide(id,h).then(ok=>{ if(ok){ p.hidden=h; S.hidden=h?[...new Set([...S.hidden,id])]:S.hidden.filter(x=>x!==id); toast(h?'Profil masqué':'Profil rétabli'); } else toast(fail); fin(); }); } }
// Signaler un joueur : depuis son profil, et depuis le bandeau de prudence d'une conversation (v24)
function reportDialog(p,after){ modal(`<h3>Signaler ${esc(p.name)}</h3><p class="muted">La modération examine chaque signalement. ${esc(p.name)} n'est pas prévenu et disparaît tout de suite de ton côté.</p>
    <div class="radio-list">${['Comportement toxique ou harcèlement','Contenu inapproprié','Faux profil ou usurpation','Arnaque','Adulte qui contacte un mineur','Autre'].map((r,i)=>`<label><input type="radio" name="rr" value="${r}" ${i?'':'checked'}> ${r}</label>`).join('')}</div>
    <textarea id="rtxt" rows="3" placeholder="Détails (facultatif)" maxlength="500"></textarea>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" id="rsend">Envoyer le signalement</button></div>`,
    d=>d.querySelector('#rsend').onclick=()=>{ submitReport(p.id,d.querySelector('[name=rr]:checked').value,d.querySelector('#rtxt').value); d.close(); toast('Signalement envoyé'); if(after) after(); else if(S.hidden.includes(p.id)) location.hash='#/matchs'; }); }
// Bloquer un joueur : depuis son profil, et depuis le menu d'une conversation dans la liste (v25)
function blockDialog(p,after){ modal(`<h3>Bloquer ${esc(p.name)} ?</h3><p class="muted">Tu ne verras plus son profil, ${esc(p.name)} ne pourra plus te contacter et sera retiré de tes mates. Tu peux le débloquer dans les paramètres.</p>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-danger" id="bok">Bloquer</button></div>`,
    d=>d.querySelector('#bok').onclick=()=>{ if(!S.blocked.includes(p.id)) S.blocked.push(p.id); removeRequest(p.id); save(); DB.saveBlock(p.id,true); d.close(); toast(`${p.name} est bloqué`); if(after) after(); else location.hash='#/matchs'; }); }
function viewPlayer(id){
  const self = id==='me';
  const p = self ? publicMe() : (visible().find(x=>x.id===id) || (isAdmin() ? PLAYERS.find(x=>x.id===id) : null));   // la modération voit aussi les comptes masqués, suspendus ou bannis
  if(!p){ app.innerHTML=`<div class="wrap page"><div class="empty"><h3>Ce profil n'est pas disponible</h3><a class="btn" href="#/matchs">Retour à mes matchs</a></div></div>`; return; }
  const c=S.me&&!self?compat(S.me,p):null, q=self?null:reqWith(id), mate=!!q&&q.status==='accepted';
  const shared = g => S.me&&!self&&S.me.games.includes(g);
  // Pseudos en jeu : ceux d'un 13-17 ans ne sont montrés qu'aux 13-17 ans et à ses mates
  const showTags = self ? S.privacy.tags : !(p.privacy && p.privacy.tags===false) && (!minorP(p) || myGroupNow()==='minor' || mate);
  const mateBtn = self ? `<a class="btn btn-ac" href="#/profil/modifier">Modifier mon profil</a>` : !S.me ? `<a class="btn btn-ac" href="#/inscription">Crée ton compte pour le contacter</a>`
    : !q && !canAsk(p) ? `<p class="hint pp-minor">Joueur de moins de 18 ans : c'est lui qui peut t'envoyer une demande de mate.</p>`   // un adulte ne démarre pas de conversation avec un 13-17 ans
    : !q ? `<button class="btn btn-ac" id="mate">Envoyer une demande de mate</button>`
    : q.status==='pending' && q.from==='me' ? `<p class="hint">Demande envoyée · en attente</p><button class="btn btn-ghost btn-sm" id="cancel">Annuler la demande</button>`
    : q.status==='pending' ? `<p class="hint">${esc(p.name)} veut devenir ton mate</p><div class="nact"><button class="btn btn-ac" id="accept">Accepter</button><button class="btn btn-ghost" id="decline">Refuser</button></div>`
    : `<p class="mates-ok">✓ Vous êtes mates</p><a class="btn btn-ac" href="#/messages/${p.id}">Envoyer un message</a><button class="btn btn-ghost unmate-btn" type="button" id="unmate">${UNMATE_SVG}Retirer des mates</button>`;
  app.innerHTML=`<div class="wrap page"><a class="back" href="#/matchs" data-back><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Retour</a>
  <div class="pp">
    <div class="pp-head">${plateOf(p)?`<div class="pp-id${plqOn(p,1)}">${plq(p)}`:''}${avatar(p,88)}<div><h1>${esc(p.name)}${modBadge(p)}</h1><div class="pp-meta">${isMod(p)?`<span class="mod-tag">${MOD_SVG}Modérateur</span>`:''}${isOnline(p)?'<span class="online">En ligne</span>':`<span class="muted" style="font-size:13px">${seenTxt(p)}</span>`}${p.country?`<span class="muted">· ${esc(L(COUNTRIES,p.country))}</span>`:''}${(p.langs||[]).length?`<span class="muted">· ${p.langs.map(x=>L(LANGS,x)).join(', ')}</span>`:''}${p.rejoue?`<span class="rejoue" title="Nombre de mates qui rejoueraient avec ce joueur">👍 ${+p.rejoue||0} ${(+p.rejoue||0)>1?'rejoueraient':'rejouerait'} avec lui</span>`:''}</div></div>${plateOf(p)?'</div>':''}${!self&&dispoActive(p)?`<p class="pp-dispo"><i class="dot-live"></i><span><b>Dispo maintenant</b> pour ${esc(p.dispo.game)}, jusqu'à ${fmtUntil(p.dispo.until)}${p.dispo.note?`<em>${esc(p.dispo.note)}</em>`:''}</span></p>`:''}</div>
    <div class="pp-main">
    <section class="panel"><h3>Jeux</h3><div class="tags" id="pp-games">${ppGames(p,showTags,shared)}</div></section>
    <section class="panel"><h3>Habitudes de jeu</h3><dl class="facts">
      <div><dt>Horaires</dt><dd>${list(p.hours,h=>L(HOURS,h))}</dd></div>
      <div><dt>Jours</dt><dd>${list(p.days,d=>L(DAYS,d))}</dd></div>
      <div><dt>Style</dt><dd>${L(STYLES,p.style)}</dd></div>
      <div><dt>Recherche</dt><dd>${L(GOALS,p.goal)}</dd></div>
      <div><dt>Communication</dt><dd>${L(VOICE,p.voice)}</dd></div>
      <div><dt>Plateformes</dt><dd>${list(p.platforms,x=>L(PLATFORMS,x))}</dd></div></dl></section>
    ${mate?`<section class="panel rate"><h3>Vous avez joué ensemble ?</h3><p class="muted">Tu rejouerais avec ${esc(p.name)} ? Ta réponse reste privée et affine tes prochains matchs.</p>
      <div class="nact"><button class="btn ${S.ratings[id]===1?'btn-ac':'btn-ghost'}" data-rate="1">👍 Oui, carrément</button><button class="btn ${S.ratings[id]===-1?'btn-danger':'btn-ghost'}" data-rate="-1">👎 Non, pas trop</button></div></section>`:''}
  </div>
  <aside class="pp-side">
    ${c?`${ring(c.pct,'ring-lg')}<strong style="font-family:var(--fd)">compatible avec toi</strong>
      <div class="breakdown">${c.detail.map((d,n)=>`<div class="bd-row" style="--n:${n}"><span>${CRITERIA[d.k].label}</span><span class="muted">${Math.round(d.s*d.w)} / ${d.w} pts</span><div class="bar"><i style="--w:${d.s*100}%;--k:${CRITERIA[d.k].color}"></i></div></div>`).join('')}</div>`
      :self?`<p class="muted">C'est ton profil tel que les autres joueurs le voient.</p>`:`<p class="muted">Crée ton profil pour voir ta compatibilité avec ${esc(p.name)}.</p>`}
    ${mateBtn}
    ${self?`<button class="btn btn-ghost" id="share2">Partager mon profil</button>`
      : mate ? '' : `<p class="hint">Une fois mates, vous pouvez vous écrire dans les messages de Coopô.</p>`}
    ${self?'':`<div class="safety"><button class="linkbtn" id="report">Signaler</button><button class="linkbtn" id="block">Bloquer</button></div>`}
    ${!self&&isAdmin()&&!isMod(p)?modPanel(p):''}
  </aside></div></div>`;
  const re=()=>{ viewPlayer(id); animateAfterRender(); };
  // Les pseudos en jeu d'un 13-17 ans sont rangés à part (gametags) : on les charge seulement quand on a le droit de les voir
  if(!self && showTags && minorP(p) && DB.live && !p._gt){ p._gt=1;
    DB.loadGameTags(p.id).then(t=>{ if(!t||!Object.keys(t).length) return; p.tags={...(p.tags||{}),...t}; const el=document.getElementById('pp-games'); if(el&&location.hash==='#/joueur/'+id) el.innerHTML=ppGames(p,showTags,shared); }); }
  document.getElementById('share2')?.addEventListener('click',shareProfile);
  document.getElementById('mate')?.addEventListener('click',ev=>{ const b=ev.currentTarget.getBoundingClientRect(); burst(b.left+b.width/2,b.top+b.height/2); sendRequest(p); re(); });
  document.getElementById('cancel')?.addEventListener('click',()=>{ removeRequest(id); toast('Demande annulée'); re(); });
  document.getElementById('accept')?.addEventListener('click',ev=>{ const b=ev.currentTarget.getBoundingClientRect(); burst(b.left+b.width/2,b.top+b.height/2); answerRequest(id,true); renderNotifBadge(); re(); });
  document.getElementById('decline')?.addEventListener('click',()=>{ answerRequest(id,false); renderNotifBadge(); re(); });
  document.getElementById('unmate')?.addEventListener('click',()=>modal(`<h3>Retirer ${esc(p.name)} de tes mates ?</h3><p class="muted">Vous ne pourrez plus vous écrire, sauf nouvelle demande acceptée.</p><div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-danger" id="uok">Retirer</button></div>`,
    d=>d.querySelector('#uok').onclick=()=>{ removeRequest(id); d.close(); toast(`${p.name} retiré de tes mates`); re(); }));
  app.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{ rate(id,+b.dataset.rate); re(); });
  app.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>modAction(p,b.dataset.mod,+b.dataset.days||0,re));
  document.getElementById('report')?.addEventListener('click',()=>reportDialog(p));
  document.getElementById('block')?.addEventListener('click',()=>blockDialog(p));
}

/* ----- Paramètres ----- */
/* E-mail non vérifié (comptes créés avec e-mail + mot de passe) : on propose de renvoyer le lien de vérification */
function emailVerifyPanel(){
  let u=null; try{ u=AUTH_LIVE&&window.firebase&&firebase.auth?firebase.auth().currentUser:null; }catch(e){}
  if(!u||u.emailVerified||!u.providerData.some(x=>x&&x.providerId==='password')) return '';
  return `<section class="panel" id="ev-panel"><h3>Vérifie ton adresse e-mail</h3><p class="hint">Ton adresse n'est pas encore vérifiée. Clique sur le lien reçu par e-mail : ça protège ton compte et permet de le récupérer si tu oublies ton mot de passe.</p><button class="btn" type="button" id="ev-send">Renvoyer l'e-mail de vérification</button></section>`;
}
document.addEventListener('click',async e=>{ const b=e.target.closest&&e.target.closest('#ev-send'); if(!b) return; b.disabled=true;
  try{ const u=firebase.auth().currentUser; await u.reload(); if(u.emailVerified){ toast('Ton e-mail est déjà vérifié'); document.getElementById('ev-panel')?.remove(); return; }
    await u.sendEmailVerification(); toast('E-mail envoyé. Regarde aussi dans tes spams.'); }
  catch(err){ console.error(err); toast("L'e-mail n'a pas pu être envoyé. Réessaie dans quelques minutes."); b.disabled=false; } });
// Lien d'invitation du serveur Discord COOPO (laisser vide pour ne rien afficher). Exemple : 'https://discord.gg/abc123'
const DISCORD_INVITE = '';
const discordOK = () => /^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]{2,40}$/.test(DISCORD_INVITE);
const DISCORD_ICO='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
const discordBtn = (cls='btn btn-sm') => discordOK() ? `<a class="${cls} discord-link" href="${esc(DISCORD_INVITE)}" target="_blank" rel="noopener noreferrer">${DISCORD_ICO}Rejoindre le Discord COOPO</a>` : '';
if(discordOK()){ const ft=document.querySelector('.foot'); if(ft) ft.insertAdjacentHTML('afterbegin',`<a href="${esc(DISCORD_INVITE)}" target="_blank" rel="noopener noreferrer">Discord</a>`); }
const backAuto = () => `<a class="back" href="${S.me?'#/profil':'#/bienvenue'}" data-back><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Retour</a>`;
const backLink = (href,label) => `<a class="back" href="${href}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>${label}</a>`;
const fold = (title,body,open=false,id='') => `<details class="panel fold"${id?` id="${id}"`:''}${open?' open':''}><summary><h3>${title}</h3></summary><div class="fold-body">${body}</div></details>`;
function viewSettings(tab){
  if(tab==='themes'){ location.replace('#/boutique'); return; }   // ancien lien « Mes thèmes »
  if(!S.me) return needProfile('Réglages');
  const blocked=PLAYERS.filter(p=>S.blocked.includes(p.id)), w=S.weights||CONFIG.weights;
  const tg=(k,t,h)=>`<div class="toggle"><div><label for="pv-${k}" class="lbl">${t}</label><p class="hint">${h}</p></div><input class="switch" type="checkbox" id="pv-${k}" data-pv="${k}" ${S.privacy[k]?'checked':''}></div>`;
  app.innerHTML=`<div class="wrap page" style="max-width:760px">${backLink('#/profil','Profil')}<div class="page-head"><div><h2>Réglages</h2><p>Thème, confidentialité, notifications et compte.</p></div></div><div class="form">${emailVerifyPanel()}
    <section class="panel"><h3>Thème et plaque</h3><p class="muted">Thème actuel : ${esc((SKINS[S.skin]||SKINS.defaut).label)}${plateOf(S.me)?` · plaque ${esc(PLATES[plateOf(S.me)].label)}`:''}.</p><div><a class="btn btn-sm" href="#/inventaire">Changer dans l'inventaire</a></div></section>
    <section class="panel"><h3>Affichage</h3><div>
      <div class="toggle"><div><label for="set-lite" class="lbl">Mode léger</label><p class="hint">Moins d'animations : plus fluide sur les petits téléphones, et la batterie tient mieux.</p></div><input class="switch" type="checkbox" id="set-lite" ${liteOn()?'checked':''}></div></div></section>
    <section class="panel"><h3>Confidentialité</h3><div>
      ${tg('tags','Afficher mes pseudos en jeu',myGroupNow()==='minor'?'Seulement aux 13-17 ans et à tes mates.':'Sur ton profil public.')}
      ${tg('online','Afficher quand je suis en ligne','Les autres joueurs voient ton statut et ta dernière visite.')}</div></section>
    ${refSection()}
    <section class="panel"><h3>Application</h3><div data-install-box>${installHTML()}</div><div style="margin-top:14px">${notifySettingHTML()}</div></section>
    ${fold(`Joueurs bloqués${blocked.length?` (${blocked.length})`:''}`, blocked.length?blocked.map(p=>`<div class="toggle"><span style="display:flex;gap:10px;align-items:center">${avatar(p,32)}${esc(p.name)}${modBadge(p)}</span><button class="btn btn-sm" data-unblock="${p.id}">Débloquer</button></div>`).join(''):'<p class="muted">Tu n\'as bloqué personne.</p>')}
    ${isAdmin()?fold('Modération : calcul du score',`<p class="hint">Réglage de test : l'importance de chaque critère. 0 désactive le critère.</p>
      <div class="tags">${Object.keys(CRITERIA).map(k=>`<div class="field"><label for="w-${k}">${CRITERIA[k].label}</label><input id="w-${k}" type="text" inputmode="numeric" data-w="${k}" value="${w[k]||0}"></div>`).join('')}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-sm btn-ac" id="wsave">Appliquer</button><button class="btn btn-sm btn-ghost" id="wreset">Valeurs par défaut</button><a class="btn btn-sm" href="#/moderation">Ouvrir la modération</a></div>`):''}
    <section class="panel"><h3>Aide et infos</h3>
      <div class="menu-list"><a href="#/aide">Aide et questions fréquentes</a><a href="#/contact">Nous écrire</a><a href="#/cgu">Conditions d'utilisation</a><a href="#/confidentialite">Confidentialité</a><a href="#/cookies">Cookies</a><a href="#/remboursement">Remboursement</a></div>${discordBtn('btn btn-sm')}</section>
    <section class="panel"><h3>Compte</h3>
      ${S.auth?`<div class="google-note"><strong>${S.auth.provider==='password'?'Compte e-mail':'Connecté avec Google'}</strong><span class="muted">${esc(S.auth.email)}</span></div><div><button class="btn btn-ghost" data-signout>Se déconnecter</button></div>`
        :`<p class="muted">Compte avec mot de passe. Tu peux aussi relier ton compte Google pour te connecter plus vite.</p><div class="gbtn" style="justify-content:flex-start"></div>`}</section>
    ${fold('Supprimer mon compte',`<p class="muted">Ton profil, tes mates et tes réglages sont effacés définitivement.</p><div><button class="btn btn-danger" id="del">Supprimer mon compte</button></div>`)}
  </div></div>`;
  app.querySelectorAll('[data-pv]').forEach(i=>i.onchange=()=>{ S.privacy[i.dataset.pv]=i.checked; save(); DB.savePrivacy(); toast('Préférence enregistrée'); });
  document.getElementById('set-lite').onchange=e=>{ setLite(e.target.checked); toast(e.target.checked?'Mode léger activé':'Animations rétablies'); };
  app.querySelectorAll('[data-unblock]').forEach(b=>b.onclick=()=>{ S.blocked=S.blocked.filter(x=>x!==b.dataset.unblock); save(); DB.saveBlock(b.dataset.unblock,false); toast('Joueur débloqué'); viewSettings(); });
  document.getElementById('wsave')?.addEventListener('click',()=>{ const nw={}; app.querySelectorAll('[data-w]').forEach(i=>nw[i.dataset.w]=Math.max(0,Math.min(100,parseInt(i.value,10)||0)));
    if(!Object.values(nw).some(v=>v>0)){ toast('Au moins un critère doit avoir un poids'); return; } S.weights=nw; save(); toast('Poids appliqués'); viewSettings(); });
  document.getElementById('wreset')?.addEventListener('click',()=>{ S.weights=null; save(); toast('Valeurs par défaut rétablies'); viewSettings(); });
  document.getElementById('del').onclick=()=>modal(`<h3>Supprimer ton compte ?</h3><p class="muted">Cette action est définitive.</p>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-danger" id="dok">Supprimer définitivement</button></div>`,
    d=>d.querySelector('#dok').onclick=async()=>{ const b=d.querySelector('#dok'); if(b.disabled) return; b.disabled=true; if(S.auth && !(await deleteGoogleAccount())){ b.disabled=false; return; } try{ localStorage.removeItem(KEY); localStorage.removeItem('coopo_cache'); localStorage.removeItem('coopo_known'); }catch(e){} const sk=S.skin; S=fresh(); S.skin=sk; save(); d.close(); toast('Compte supprimé'); location.hash='#/accueil'; });
}
