/* Coopô — js/messages.js
   Messages privés, « Vu » et « écrit… », historique des appels.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* ---- Messages privés (entre mates uniquement) ---- */
// Dernier message connu d'une conversation : le dernier message chargé ou, s'il est plus récent, celui annoncé par une notification
function lastMsg(id){ const ca=clearedAt(id), m=(S.chats[id]||[]).filter(x=>!ca||(x.at||0)>ca).slice(-1)[0]||null, n=S.notifs.filter(x=>x.type==='message'&&x.from===id&&(!ca||(x.at||0)>ca)).sort((a,b)=>(b.at||0)-(a.at||0))[0];
  if(n&&(!m||(n.at||0)>(m.at||0))){ const t=String(n.text||''), i=t.indexOf(' : '); return {from:id,text:i>=0?t.slice(i+3):t,at:n.at||0}; }
  return m&&m.del ? {...m,text:MSG_DEL_TEXT} : m; }
/* Colonne des conversations (ordinateur seulement) : les mates puis les groupes, le plus récent en haut. key = 'c:<joueur>' ou 'g:<groupe>'. */
function dmSideInner(key){
  const mates=pinSort(matesList().sort((a,b)=>{ const la=lastMsg(a.id), lb=lastMsg(b.id); return (lb?lb.at:0)-(la?la.at:0); }));   // v15 — les mates épinglés en haut
  return `<h3><span>Messages privés</span>${canCall()&&AUTH_LIVE?`<button class="dm-calls" type="button" data-calls aria-label="Voir mes appels" title="Mes appels">${CALLS_SVG}</button>`:''}</h3>${mates.length?mates.map((p,i)=>{ const last=lastMsg(p.id), u=S.unread[p.id]||0;   // les plaques des 12 premières lignes sont animées (au-delà : au survol)
      return `<a class="dm-row${key==='c:'+p.id?' on':''}${u?' unread':''}${plqOn(p,i<12)}" href="#/messages/${p.id}"${key==='c:'+p.id?' aria-current="page"':''}>${plq(p)}${avatar(p,36)}<div><b><span>${esc(p.name)}</span>${isOnline(p)?'<span class="online"></span>':''}${rowMarks('c',p.id)}</b><span class="muted">${last?esc((last.from==='me'?'Toi : ':'')+last.text):'Dis bonjour 👋'}</span></div>${u?`<span class="badge static">${u}</span>`:''}</a>`; }).join(''):'<p class="muted dm-none">Pas encore de mates.</p>'}`; }
// Les groupes dans la colonne de gauche du site (ordinateur) : un rond par groupe, puis « + »
function railGroups(){ if(!S.auth||!S.me) return ''; const m=location.hash.match(/^#\/groupe\/([^/?]+)/), cur=m?decodeURIComponent(m[1]):'';
  const groups=GROUPS.filter(gIn).sort((a,b)=>tsMs(b.lastAt||b.at)-tsMs(a.lastAt||a.at));
  return groups.map(g=>`<a class="dm-ico${cur===g.id?' on':''}${gLoud(g)?' unread':''}" href="#/groupe/${esc(g.id)}" title="${esc(g.name)}" aria-label="Groupe ${esc(g.name)}${gLoud(g)?' (nouveaux messages)':''}"${cur===g.id?' aria-current="page"':''}>${gAvatar(g,48)}${gLoud(g)?'<span class="dm-dot" aria-hidden="true">•</span>':''}</a>`).join('')
    +railPlus(); }
// v23 — Le « + » sous les groupes (colonne de gauche, ordinateur), qui remplace l'onglet Groupes : il crée un groupe.
// S'il y a des invitations, il porte une pastille et mène à la page des groupes, où elles sont en haut (avec les groupes publics et « Créer un groupe »).
// Sur la page des groupes, c'est lui qui est marqué comme la page ouverte.
function railPlusInfo(){ let inv=0; try{ inv=gInvites().length; }catch(e){}
  const on=location.hash==='#/groupe'||location.hash==='#/groupe/nouveau';
  return { inv, on, href:inv?'#/groupe':'#/groupe/nouveau', label:inv?`Groupes : ${inv} invitation${inv>1?'s':''}`:'Créer un groupe' }; }
function railPlus(){ const i=railPlusInfo();
  return `<a class="dm-ico plus${i.on?' on':''}" href="${i.href}" title="${i.label}" aria-label="${i.label}"${i.on?' aria-current="page"':''}>+${i.inv?`<span class="dm-dot" aria-hidden="true">${i.inv>9?'9+':i.inv}</span>`:''}</a>`; }
// Met le « + » à jour sans le redessiner (une invitation arrive, est acceptée ou refusée)
function railPlusSync(){ document.querySelectorAll('#sr-groups .dm-ico.plus').forEach(a=>{ const i=railPlusInfo();
  a.setAttribute('href',i.href); a.title=i.label; a.setAttribute('aria-label',i.label); a.classList.toggle('on',i.on); if(i.on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  let d=a.querySelector('.dm-dot'); if(!i.inv){ if(d) d.remove(); return; } if(!d){ d=document.createElement('span'); d.className='dm-dot'; d.setAttribute('aria-hidden','true'); a.appendChild(d); } d.textContent=i.inv>9?'9+':String(i.inv); }); }
const railGroupsRefresh = () => { const el=document.getElementById('sr-groups'); if(el) el.innerHTML=railGroups(); gSideRefresh(); };
// Barre des groupes (ordinateur) : le bouton des messages privés, puis un rond par groupe, puis « + »
function dmRailInner(key){ const groups=GROUPS.filter(gIn).sort((a,b)=>tsMs(b.lastAt||b.at)-tsMs(a.lastAt||a.at)); const dmU=Object.entries(S.unread||{}).reduce((n,[k,x])=>n+(rowMuted('c',k)?0:(+x||0)),0);
  return `<a class="dm-ico${key.startsWith('g:')?'':' on'}${dmU?' unread':''}" href="#/messages" title="Messages privés" aria-label="Messages privés${dmU?' ('+dmU+' non lus)':''}"${key.startsWith('g:')?'':' aria-current="page"'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>${dmU?`<span class="dm-dot">${dmU>99?'99+':dmU}</span>`:''}</a><span class="dm-sep" aria-hidden="true"></span>
    ${groups.map(g=>`<a class="dm-ico${key==='g:'+g.id?' on':''}${gLoud(g)?' unread':''}" href="#/groupe/${esc(g.id)}" title="${esc(g.name)}" aria-label="Groupe ${esc(g.name)}${gLoud(g)?' (nouveaux messages)':''}"${key==='g:'+g.id?' aria-current="page"':''}>${gAvatar(g,48)}${gLoud(g)?'<span class="dm-dot" aria-hidden="true">•</span>':''}</a>`).join('')}
    <a class="dm-ico plus" href="#/groupe/nouveau" title="Créer un groupe" aria-label="Créer un groupe">+</a>`; }
const dmSide = key => `<nav class="dm-rail" id="dm-rail" aria-label="Groupes" data-key="${esc(key||'')}">${dmRailInner(key||'')}</nav><nav class="dm-side" id="dm-side" aria-label="Messages privés" data-key="${esc(key||'')}">${dmSideInner(key)}</nav>`;
const dmRefresh = () => { railGroupsRefresh(); const sd=document.getElementById('dm-side'); if(sd&&sd.offsetParent!==null){ const y=sd.scrollTop; sd.innerHTML=dmSideInner(sd.dataset.key); sd.scrollTop=y; const rl=document.getElementById('dm-rail'); if(rl){ const ry=rl.scrollTop; rl.innerHTML=dmRailInner(rl.dataset.key||''); rl.scrollTop=ry; } } };
// Place la colonne à la bonne hauteur : juste sous l'en-tête du site, jusqu'en bas de la fenêtre
function dmFit(){ const sh=document.querySelector('.dm-shell'); if(!sh) return; const top=sh.getBoundingClientRect().top+window.scrollY; sh.style.setProperty('--dm-top',Math.round(top+24)+'px'); const on=sh.querySelector('.dm-row.on'); if(on&&on.scrollIntoView) on.scrollIntoView({block:'nearest'}); }
window.addEventListener('resize',dmFit);
// Téléphone : la conversation prend exactement la hauteur visible, même quand le clavier est ouvert
(function(){ const vv=window.visualViewport; if(!vv) return; const fit=()=>{ document.documentElement.style.setProperty('--vvh',Math.round(vv.height)+'px'); const b=document.getElementById('chatbox'); if(b&&document.activeElement&&document.activeElement.id==='chatin') b.scrollTop=b.scrollHeight; }; vv.addEventListener('resize',fit); fit(); })();
/* Liste des messages sur téléphone, avec l'état du dernier message.
   v20 — comme sur Snapchat : les mates et les groupes dans une seule liste, le plus récent en haut (les mates épinglés d'abord).
   Juste au-dessus : les invitations aux groupes. Tout en bas : « Trouver un groupe ». Le bouton + crée un groupe.
   (Sur ordinateur, cette liste est cachée : les mates et les groupes sont dans les colonnes de gauche.) */
const CHAT_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
// v25 — petites marques après le nom dans les listes : épinglé, en sourdine
const rowMarks = (kind,id) => ((kind==='c'?isPinned(id):gPinned(id))?PIN_SVG+'<span class="sr-only">épinglé</span>':'')+(rowMuted(kind,id)?MUTE_IC+'<span class="sr-only">en sourdine</span>':'');
const shortAgo = t => ago(t).replace('il y a ','');
// Une ligne de groupe façon liste de messages (téléphone : dans Messages, et sur la page des groupes)
const gRowSn = g => { const u=gUnread(g);
  return `<a class="sn-row grp${u?' unread':''}" href="#/groupe/${esc(g.id)}" data-f="group${u?' unread':''}" data-n="${esc(g.name.toLowerCase())}"><span class="sn-av">${gAvatar(g,56)}</span><div class="sn-mid"><b><span>${esc(g.name)}</span>${g.private?'<span class="g-lock" title="Groupe privé">'+LOCK_SVG+'</span>':''}${rowMarks('g',g.id)}</b>
    <span class="sn-st${u?' new':''}"><i></i><span class="t">${u?'Nouveaux messages':esc(g.game||'Tous les jeux')}</span><span class="x">${u&&g.lastAt?'· '+shortAgo(tsMs(g.lastAt)):`· ${g.members.length} membre${g.members.length>1?'s':''}${g.lastAt?' · '+shortAgo(tsMs(g.lastAt)):''}`}</span></span></div><span class="sn-end">${u?'<span class="badge static" aria-label="Nouveaux messages">•</span>':CHAT_SVG}</span></a>`; };
let SN_F='all';   // v20 — le filtre choisi (Tous, Non lus, Groupes…) : gardé quand la liste se redessine et quand on revient d'une conversation
// v24 — bandeau de prudence entre un adulte et un 13-17 ans (conversations privées)
const SHIELD_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9.5 12l1.8 1.8L15 10"/></svg>';
const CHEV_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
function snList(mates){
  const groups=gMine(), inv=gInvites();
  const all=mates.map(p=>({p,at:(lastMsg(p.id)||{}).at||0})).concat(groups.map(g=>({g,at:tsMs(g.lastAt||g.at)}))).sort((x,y)=>y.at-x.at), up=x=>x.p?isPinned(x.p.id):gPinned(x.g.id);
  const items=all.filter(up).concat(all.filter(x=>!up(x)));   // v15 — les mates épinglés en haut ; v25 — les groupes épinglés aussi
  const nU=mates.filter(p=>S.unread[p.id]).length+groups.filter(gUnread).length;
  const rows=items.map(it=>{ if(it.g) return gRowSn(it.g);
    const p=it.p, last=lastMsg(p.id), u=S.unread[p.id]||0, f=flameState(p.id), on=isOnline(p), fl=f&&f.count>=FLAME_FROM;
    const st=u?['new',u>1?`${u} nouveaux messages`:'Nouveau message']:!last?['','Dis bonjour 👋']:last.from==='me'?(seenOf(p.id)>=last.at?['seen','Vu']:['sent','Envoyé']):['','Reçu'];   // v15 — « Vu » quand le mate a lu
    return `<a class="sn-row${u?' unread':''}${plqOn(p)}" href="#/messages/${p.id}" data-f="${u?'unread ':''}${on?'online ':''}${fl?'flame':''}" data-n="${esc(String(p.name||'').toLowerCase())}">${plq(p)}<span class="sn-av">${avatar(p,56)}${on?'<span class="online" title="En ligne"></span>':''}</span><div class="sn-mid"><b><span>${esc(p.name)}</span>${modBadge(p)}${rowMarks('c',p.id)}</b>
      <span class="sn-st ${st[0]}">${last||u?'<i></i>':''}<span class="t">${st[1]}</span><span class="x">${last?'· '+shortAgo(last.at):''}${fl?` · ${f.count} ${f.warn?'⏳':'🔥'}`:''}</span></span></div><span class="sn-end">${u?`<span class="badge static">${u}</span>`:CHAT_SVG}</span></a>`; }).join('');
  const chip=(k,l,n)=>`<button type="button" class="chip" data-snf="${k}" aria-pressed="${k===SN_F}">${l}${n?` <span class="cnt">${n}</span>`:''}</button>`;
  const more=`<a class="sn-row sn-more" id="sn-more" href="#/groupe"><span class="sn-av"><span class="sn-more-ico">${FIND_SVG}</span></span><div class="sn-mid"><b><span>Trouver un groupe</span></b><span class="sn-st"><span class="t">Rejoins un groupe public</span></span></div><span class="sn-end">${CHEV_SVG}</span></a>`;
  return `${notifBanHTML()}<div class="page-head sn-top"><div><h2>Messages</h2></div>${canCall()&&AUTH_LIVE?`<button class="btn sn-round" type="button" data-calls aria-label="Voir mes appels" title="Mes appels">${CALLS_SVG}</button>`:''}<button class="btn sn-round" type="button" id="sn-find" aria-label="Chercher une conversation" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button><a class="btn sn-round" href="#/matchs" aria-label="Trouver de nouveaux mates" title="Trouver de nouveaux mates"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9.5" cy="8" r="3.5"/><path d="M3 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M19 7v6M16 10h6"/></svg></a></div>
    <input class="sn-search" id="sn-q" type="search" placeholder="Chercher un mate ou un groupe" autocomplete="off" aria-label="Chercher un mate ou un groupe" hidden>
    <div class="sn-chips" role="group" aria-label="Filtrer les conversations">${chip('all','Tous')}${chip('unread','Non lus',nU)}${chip('group','Groupes')}${chip('online','En ligne')}${chip('flame','Flammes 🔥')}</div>
    ${inv.length?`<section class="sn-inv" id="sn-inv" aria-label="Invitations aux groupes"><h3 class="on-world g-h">${inv.length>1?'Invitations à des groupes':'Invitation à un groupe'}</h3><div class="chat-list">${inv.map(gInvRow).join('')}</div></section>`:''}
    ${items.length?`<div class="sn-list" id="sn-list">${rows}<p class="muted sn-none" id="sn-none" hidden>Aucune conversation ici.</p>${more}</div>${mates.length>=3&&!pins().length?`<p class="muted sn-tip">Astuce : garde le doigt sur un mate (ou clic droit) pour l'épingler en haut.</p>`:''}`
      :`<div class="empty"><h3>Pas encore de mates</h3><p class="muted">Envoie une demande à un joueur compatible. Dès qu'il accepte, vous pouvez discuter ici. Tu peux aussi rejoindre un groupe.</p><a class="btn btn-ac" href="#/matchs">Voir mes matchs</a><a class="btn btn-ghost" href="#/groupe">Trouver un groupe</a></div>`}
    <button class="btn btn-ac sn-fab" type="button" data-g-new aria-label="Créer un groupe" title="Créer un groupe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>`; }
function snWire(){ const list=document.getElementById('sn-list'), q=document.getElementById('sn-q'), find=document.getElementById('sn-find'), inv=document.getElementById('sn-inv'), more=document.getElementById('sn-more');
  const apply=()=>{ const f=SN_F, t=(q&&!q.hidden?q.value:'').trim().toLowerCase();
    if(inv) inv.hidden=!!t||!['all','unread','group'].includes(f);   // les invitations : avec Tous, Non lus et Groupes
    if(!list) return; let n=0;
    list.querySelectorAll('.sn-row:not(.sn-more)').forEach(r=>{ const ok=(f==='all'||(' '+r.dataset.f+' ').includes(' '+f+' '))&&(!t||r.dataset.n.includes(t)); r.hidden=!ok; if(ok) n++; });
    if(more) more.hidden=!!t||!['all','group'].includes(f);   // « Trouver un groupe » : avec Tous et Groupes
    const none=document.getElementById('sn-none'); if(none){ none.hidden=n>0; none.textContent=f==='group'&&!t?'Tu n\'es dans aucun groupe pour l\'instant. Crée le tien avec le bouton +, ou rejoins-en un juste en dessous.':'Aucune conversation ici.'; } };
  document.querySelectorAll('[data-snf]').forEach(c=>c.onclick=()=>{ SN_F=c.dataset.snf; document.querySelectorAll('[data-snf]').forEach(x=>x.setAttribute('aria-pressed',x===c)); apply(); });
  if(find&&q){ find.onclick=()=>{ q.hidden=!q.hidden; find.setAttribute('aria-expanded',!q.hidden); if(q.hidden){ q.value=''; apply(); } else q.focus(); }; q.oninput=apply; }
  apply(); }
// v20 — redessine la liste des messages quand les groupes ont changé (sauf pendant une recherche, un glissement ou une fenêtre ouverte)
function snRefresh(){ const q=document.getElementById('sn-q'); if(location.hash!=='#/messages'||(dlg&&dlg.open)||navBusy()||(q&&!q.hidden&&q.value)) return; const y=scrollY; viewMessages(); scrollTo(0,y); }
function viewMessages(id){
  if(dataPending()) return loadingView('Messages');
  if(!S.me) return needProfile('Messages');
  if(id) return viewChat(id);
  if(!MSG_AREA.test(NAVX.prev||'')) SN_F='all';   // v20 — on arrive d'une autre page : tous les messages
  const mates=matesList().sort((a,b)=>{ const la=lastMsg(a.id), lb=lastMsg(b.id); return (lb?lb.at:0)-(la?la.at:0); });
  app.innerHTML=`<div class="dm-shell">${dmSide('')}<div class="dm-empty"><div><h3>Choisis une conversation</h3><p class="muted">Tes mates sont dans la liste à gauche. Tes groupes sont les ronds tout à gauche, et le « + » sert à en créer un.</p></div></div><div class="wrap page dm-list-page" style="max-width:720px">${snList(mates)}</div></div>`;
  snWire();
  { const lp=app.querySelector('.dm-list-page');   // v20 — le + crée un groupe ; les invitations se règlent ici
    lp.querySelectorAll('[data-g-new]').forEach(b=>b.onclick=()=>groupForm());
    gInvWire(lp,()=>viewMessages()); }
  dmFit();
  // v20 — en arrivant sur la liste, mes groupes et mes invitations sont relus (quelques lectures, au plus toutes les 30 s) : la liste se redessine s'ils ont changé
  if(NAVX.prev!==location.hash){ const sig=gSig(); DB.loadMyGroups().then(ch=>{ if(!ch||gSig()===sig) return; renderNotifBadge(); railGroupsRefresh(); snRefresh(); }).catch(()=>{}); }
  // v15 — « Vu » dans la liste : pour les conversations où mon message est le dernier, on regarde si le mate l'a lu (12 au plus, une fois par minute)
  { const need=mates.filter(p=>{ const lm=lastMsg(p.id); return lm&&lm.from==='me'&&!(seenOf(p.id)>=lm.at); }).slice(0,12).map(p=>p.id);
    if(need.length) DB.peekSeen(need).then(ids=>{ if(location.hash!=='#/messages') return; (ids||[]).forEach(i=>{ const lm=lastMsg(i), st=document.querySelector(`.sn-row[href="#/messages/${CSS.escape(i)}"] .sn-st.sent`);
      if(st&&lm&&seenOf(i)>=lm.at){ st.classList.replace('sent','seen'); const t=st.querySelector('.t'); if(t) t.textContent='Vu'; } }); }); }
}
function viewChat(id){ EDIT=null; chatMotif();
  const p=visible().find(x=>x.id===id);
  if(!p||!isMate(id)){ app.innerHTML=`<div class="wrap page"><div class="empty"><h3>Vous n'êtes pas encore mates</h3><p class="muted">Les messages s'ouvrent une fois la demande de mate acceptée.</p><a class="btn" href="#/messages">Retour aux messages</a></div></div>`; return; }
  S.unread[id]=0; { const seen=S.notifs.filter(n=>!n.read&&n.type==='message'&&n.from===id); seen.forEach(n=>n.read=true); DB.markRead(seen.map(n=>n.id)); } save(); renderNotifBadge();
  app.innerHTML=`<div class="dm-shell">${dmSide('c:'+id)}<div class="wrap page chat-page"><div class="chat-head">${backLink('#/messages','Messages')}<a class="chat-who${plqOn(p,1)}" href="#/joueur/${p.id}">${plq(p)}${avatar(p,44)}<div><b>${esc(p.name)}${modBadge(p)}</b>${isOnline(p)?'<span class="online">En ligne</span>':'<span class="muted" style="font-size:12px">Hors ligne</span>'}</div></a>${callBtns(p)}</div>
    <p class="flame-hint" id="flame-hint"></p>
    ${crossAge(p)?`<p class="age-safe" role="note">${SHIELD_SVG}<span>Ne partage jamais ton adresse, ton école ni ton numéro. Quelque chose te gêne&nbsp;? <button class="linkbtn" type="button" data-age-report>Signaler</button></span></p>`:''}
    <div class="chat-box" id="chatbox"></div>${typingHTML()}${qrHTML()}
    ${composerHTML('Message…',!minorP(p))}${cpanelHTML()}</div></div>`;
  dmFit();
  app.querySelector('[data-age-report]')?.addEventListener('click',()=>reportDialog(p));   // v24 — bandeau de prudence : le même signalement que sur le profil
  // v11 — chaque envoi passe dans la file : un message par seconde au plus (règle Firebase), dans l'ordre, même avec plusieurs photos ou stickers d'affilée
  const here=()=>location.hash==='#/messages/'+id;
  const sendC=m=>{ const rp=takeReply('c',id); if(rp) m.reply=rp; return DB.queueSend(async()=>{ m.at=Date.now(); (S.chats[id]||(S.chats[id]=[])).push(m); save(); if(here()) renderChat(id);
    await DB.sendMessage(id,m); if(here()) renderChat(id); }); };
  // Stickers et emojis (stickers jamais avec un 13-17 ans)
  cpWire(st=>{ if(minorP(p)) return; sendC({from:'me',text:STICKER_TEXT,sticker:st}); },!minorP(p));
  renderChat(id);
  // Photos : réduites sur l'appareil, puis envoyées une par une comme des messages (jamais à un 13-17 ans)
  photoWire(ph=>{ if(minorP(p)) return; const pid=newId(); PHOTOS[pid]=ph.data; return sendC({from:'me',text:PHOTO_TEXT,photo:{id:pid,w:ph.w,h:ph.h}}); });
  document.querySelectorAll('[data-call]').forEach(b=>b.onclick=()=>startCall(id,b.dataset.call));
  // Message vocal : enregistré puis envoyé comme un message (2 minutes au plus)
  document.getElementById('micbtn')?.addEventListener('click',()=>recordVoice(v=>{ const vid=newId();
    VOICES[vid]=v.data; sendC({from:'me',text:VOICE_TEXT,voice:{id:vid,dur:v.dur,...(v.w?{w:v.w}:{})}}); }));
  // la zone de messages change de hauteur (contacts chargés, clavier, rotation) : on reste calé sur le dernier message
  try{ const cb=document.getElementById('chatbox'); if(cb&&'ResizeObserver' in window) new ResizeObserver(()=>{ cb.scrollTop=cb.scrollHeight; }).observe(cb); }catch(e){}
  document.getElementById('chatform').addEventListener('submit',e=>{ e.preventDefault(); const i=document.getElementById('chatin'), t=i.value.trim(); if(!t) return;
    if(S.me&&ageGroup(S.me)==='minor'&&hasPhone(t)){ toast('Pour ta sécurité, les numéros de téléphone ne peuvent pas être envoyés ici.'); return; }   // 13-17 ans : pas de numéro dans le chat
    if(minorP(p)&&hasPhone(t)){ toast('Pour la sécurité des 13-17 ans, les numéros de téléphone ne peuvent pas être envoyés ici.'); return; }   // ni de la part d'un adulte vers un 13-17 ans
    if(submitEdit(t)) return;   // c'était une modification
    i.value=''; DB._typ=null;
    sendC({from:'me',text:t});
    if(!AUTH_LIVE && Math.random()<.75) setTimeout(()=>{ const r={from:id,text:pick(CANNED),at:Date.now()}; (S.chats[id]||(S.chats[id]=[])).push(r);
      if(location.hash==='#/messages/'+id){ save(); renderChat(id); } else { S.unread[id]=(S.unread[id]||0)+1; notify({type:'message',from:id,text:`${p.name} : ${r.text}`}); } }, 2000+Math.random()*3000); });
  let lastId=null;
  DB.listenChat(id,()=>{ if(!here()) return; const lm=(S.chats[id]||[]).slice(-1)[0]; if(lm&&lm.from!=='me'&&lm.id!==lastId) typingClear(DB.toUid(id)); lastId=lm?lm.id:null; renderChat(id); });   // son message est arrivé : il n'écrit plus
  // v15 — « Vu » et « écrit… »
  document.getElementById('chatin').addEventListener('input',e=>{ if(e.target.value.trim()&&!EDIT) DB.typing('c',id,'w'); });
  DB.listenMeta('c',id,chg=>{ if(!here()) return; const s=META.seen[DB.toUid(id)]||0; if(s>seenOf(id)){ (S.seenBy=S.seenBy||{})[id]=s; save(); }
    if(chg) renderChat(id); else seenMark('c',id); typingRender(); });
}
/* ---- v15 — « Vu » et « écrit… » ----
   Dans chaque conversation (chats/{paire}/meta/{moi}) et chaque groupe (groups/{id}/meta/{moi}), chacun tient à jour un petit document :
     { seen: l'heure du dernier message des autres que j'ai lu, t: 'w' (j'écris) | 'v' (j'enregistre un vocal) | '', tAt: l'heure du signal }
   « écrit… » : un signal toutes les 5 secondes au plus pendant qu'on écrit ; il s'efface tout seul 7 secondes après le dernier signal. */
const TYPING_MS=7000, TYPING_EVERY=5000;
let META=null, TYP_T=0;   // la conversation écoutée : { key, kind, id, seen:{uid:heure}, typ:{uid:{t,tAt,until}}, mine, ready }
const seenOf = id => (S.seenBy&&+S.seenBy[id])||0;   // jusqu'où ce mate a lu mes messages (gardé sur l'appareil pour la liste)
const typingHTML = () => '<div class="typing-wrap"><div class="typing" id="typing" role="status" aria-live="polite" hidden></div></div>';
const chatHere = () => { const m=location.hash.match(/^#\/(messages|groupe)\/([^/?]+)/); return m?[m[1]==='groupe'?'g':'c',decodeURIComponent(m[2])]:null; };
const typingSend = t => { const h=chatHere(); if(h) DB.typing(h[0],h[1],t); };
function typingClear(uid){ if(META&&META.typ[uid]){ delete META.typ[uid]; typingRender(); } }
function typingRender(){ const el=document.getElementById('typing'); if(!el) return; clearTimeout(TYP_T); const now=Date.now(); let txt='';
  if(META){ const g=META.kind==='g'?gById(META.id):null;
    Object.keys(META.typ).forEach(u=>{ if(META.typ[u].until<=now) delete META.typ[u]; });
    const on=Object.keys(META.typ).filter(u=>!S.blocked.includes(u)&&(!g||g.members.includes(u)));
    if(on.length){ const nm=u=>{ const p=META.kind==='g'?gPlayer(u):PLAYERS.find(x=>x.id===u); return p&&p.name?p.name:'Un mate'; }, voice=on.every(u=>META.typ[u].t==='v');
      txt = on.length===1 ? `${nm(on[0])} ${voice?'enregistre un vocal':'écrit'}` : on.length===2 ? `${nm(on[0])} et ${nm(on[1])} ${voice?'enregistrent un vocal':'écrivent'}` : `${on.length} personnes ${voice?'enregistrent un vocal':'écrivent'}`;
      TYP_T=setTimeout(typingRender,Math.max(300,Math.min(...on.map(u=>META.typ[u].until))-now+60)); } }
  if(el.dataset.t!==txt){ el.dataset.t=txt; el.hidden=!txt; el.innerHTML=txt?`<span class="ty-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(txt)}…</span>`:''; } }
// J'ai lu : on note l'heure du dernier message des autres (une écriture seulement quand il y a du nouveau, et jamais quand la page est cachée)
function seenMark(kind,id){ const me=kind==='g'?myId():'me', msgs=kind==='g'?(GMSGS[id]||[]):(S.chats[id]||[]); let at=0; msgs.forEach(m=>{ if(m.from!==me&&m.at>at) at=m.at; }); if(at) DB.markSeen(kind,id,at); }
document.addEventListener('visibilitychange',()=>{ if(document.hidden) return; const h=chatHere(); if(h) seenMark(h[0],h[1]);
  if(CALL&&CALL.mix) sndCtx(); });   // appel à plusieurs : au retour sur Coopô, le mélange des voix reprend s'il s'était mis en veille
/* ---- v16 — Historique des appels ----
   1) Dans la conversation : à la fin d'un appel, celui qui a appelé laisse une ligne (un message avec call = { k: 'audio'|'video', s: résultat, d: durée en secondes }).
      Les deux mates la voient, sur tous leurs appareils : « Appel vocal · 3 min 12 s », « Appel manqué »…
   2) Dans Messages, le bouton téléphone ouvre la liste des derniers appels passés, reçus et manqués (gardée sur cet appareil, 60 au plus). */
const CALL_ST=['ok','missed','refused','busy','fail'], CALL_LOG_MAX=60;
const callDur = d => d>=3600 ? `${Math.floor(d/3600)} h ${Math.floor(d%3600/60)} min` : d>=60 ? `${Math.floor(d/60)} min ${String(d%60).padStart(2,'0')} s` : `${d} s`;
// ce que dit une ligne d'appel : mine = c'est moi qui ai appelé
const callWord = (c,mine) => c.s==='ok' ? callDur(c.d) : c.s==='refused' ? (mine?'Refusé':'Tu as refusé') : c.s==='busy' ? (mine?'Déjà en appel':'Manqué (tu étais en appel)') : c.s==='fail' ? 'Connexion impossible' : (mine?'Pas de réponse':'Manqué');
const callBad = (c,mine) => c.s==='fail' || (!mine && (c.s==='missed'||c.s==='busy'));
function callLineHTML(c,mine){ const vid=c.k==='video';
  return `<span class="call-line${callBad(c,mine)?' bad':''}"><i aria-hidden="true">${vid?CAM_SVG:PHONE_SVG}</i><span><b>${vid?'Appel vidéo':'Appel vocal'}</b><small>${callWord(c,mine)}</small></span></span>`; }
const callText = c => (c.k==='video'?'📹 Appel vidéo':'📞 Appel vocal')+(c.s==='ok'?'':c.s==='refused'?' refusé':c.s==='fail'?' (connexion impossible)':' manqué');
// Fin d'un lien d'appel : on le note sur l'appareil, et celui qui a appelé laisse la ligne dans la conversation
function callDone(c,L,why){ if(!L||L.logged||!L.id) return; L.logged=true; const out=!(L===c&&c.role==='in'), kind=L===c?c.kind:'audio';
  const d=L.tA?Math.max(1,Math.round((Date.now()-L.tA)/1000)):0;
  const st=L.tA?'ok':why==='refused'?'refused':why==='busy'?'busy':why==='fail'?'fail':'missed';
  if((out&&!L.sent)||why==='elsewhere') return;   // l'appel n'est jamais parti (micro refusé…), ou il a été pris sur un autre appareil
  (S.callLog=Array.isArray(S.callLog)?S.callLog:[]).unshift({id:L.id,k:kind,o:out?1:0,s:st,d,at:Date.now()}); S.callLog=S.callLog.slice(0,CALL_LOG_MAX); save();
  if(!out||!L.sent||!AUTH_LIVE||!isMate(L.id)) return;
  const id=L.id, m={from:'me',text:callText({k:kind,s:st}),call:{k:kind,s:st,d}}, here=()=>location.hash==='#/messages/'+id;
  DB.queueSend(async()=>{ m.at=Date.now(); (S.chats[id]||(S.chats[id]=[])).push(m); save(); if(here()) renderChat(id); await DB.sendMessage(id,m); if(here()) renderChat(id); else dmRefresh(); }); }
const CALLS_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/><path d="M15 3.5V8h4.5M15 8l5.5-5.5"/></svg>';
function callsModal(){ const log=(Array.isArray(S.callLog)?S.callLog:[]).filter(x=>x&&x.id&&!S.blocked.includes(x.id));
  modal(`<h3>Appels</h3><p class="muted">Tes derniers appels passés, reçus et manqués sur cet appareil.</p>
    ${log.length?`<div class="cl-list">${log.map(x=>{ const p=PLAYERS.find(y=>y.id===x.id)||S.profiles[x.id]||{id:x.id,name:'Un joueur'}, mine=!!x.o, c={k:x.k,s:x.s,d:+x.d||0}, bad=callBad(c,mine);
      return `<a class="cl-row${bad?' bad':''}" href="#/messages/${esc(x.id)}" data-close>${avatar(p,44)}<div><b>${esc(p.name||'Un joueur')}</b><span>${mine?'↗ Passé':'↙ Reçu'}${x.k==='video'?' · vidéo':''} · ${callWord(c,mine)}</span></div><time>${shortAgo(x.at)}</time></a>`; }).join('')}</div>`
      :'<p class="muted" style="margin-top:14px">Aucun appel pour le moment. Ouvre une conversation et appuie sur le téléphone pour appeler un mate.</p>'}
    <div class="dlg-actions">${log.length?'<button class="btn btn-ghost" type="button" id="cl-clear">Vider la liste</button>':''}<button class="btn" type="button" data-close>Fermer</button></div>`,
    d=>d.querySelector('#cl-clear')?.addEventListener('click',ev=>{ const b=ev.currentTarget; if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Confirmer : vider'; return; } S.callLog=[]; save(); d.close(); toast('Liste des appels vidée'); })); }
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('[data-calls]')) callsModal(); });
