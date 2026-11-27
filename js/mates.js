/* Coopô — js/mates.js
   Langues, rangs des jeux, mates (demandes), mates épinglés, notifications.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* =========================================================
   FONCTIONNALITÉS : mates, notifications, messages, groupes,
   modération, aide, partage, couche Firestore
   ========================================================= */
const ADMINS = []; // uid des modérateurs : ajoutés automatiquement depuis la collection admins de Firestore
const COUNTRIES=[['CI',"Côte d'Ivoire"],['SN','Sénégal'],['CM','Cameroun'],['ML','Mali'],['BF','Burkina Faso'],['BJ','Bénin'],['TG','Togo'],['NE','Niger'],['GN','Guinée'],['GA','Gabon'],['CG','Congo'],['CD','RD Congo'],['MG','Madagascar'],['MA','Maroc'],['DZ','Algérie'],['TN','Tunisie'],['FR','France'],['BE','Belgique'],['CH','Suisse'],['CA','Canada'],['XX','Autre']];
const LANGS=[['fr','Français'],['en','Anglais'],['ar','Arabe'],['es','Espagnol'],['pt','Portugais'],['sw','Swahili'],['af','Afrikaans'],['sq','Albanais'],['de','Allemand'],['am','Amharique'],['hy','Arménien'],['az','Azéri'],['eu','Basque'],['bn','Bengali'],['be','Biélorusse'],['my','Birman'],['bs','Bosnien'],['bg','Bulgare'],['ca','Catalan'],['zh','Chinois (mandarin)'],['yue','Chinois (cantonais)'],['si','Cingalais'],['ko','Coréen'],['ht','Créole haïtien'],['hr','Croate'],['da','Danois'],['et','Estonien'],['fi','Finnois'],['gl','Galicien'],['cy','Gallois'],['ka','Géorgien'],['el','Grec'],['gu','Gujarati'],['he','Hébreu'],['hi','Hindi'],['hu','Hongrois'],['id','Indonésien'],['ga','Irlandais'],['is','Islandais'],['it','Italien'],['ja','Japonais'],['kn','Kannada'],['kk','Kazakh'],['km','Khmer'],['ky','Kirghize'],['ku','Kurde'],['lo','Lao'],['lv','Letton'],['lt','Lituanien'],['lb','Luxembourgeois'],['mk','Macédonien'],['ms','Malais'],['ml','Malayalam'],['mg','Malgache'],['mt','Maltais'],['mr','Marathi'],['mn','Mongol'],['nl','Néerlandais'],['ne','Népalais'],['no','Norvégien'],['ur','Ourdou'],['uz','Ouzbek'],['ps','Pachto'],['pa','Pendjabi'],['fa','Persan'],['pl','Polonais'],['ro','Roumain'],['ru','Russe'],['sr','Serbe'],['sk','Slovaque'],['sl','Slovène'],['so','Somali'],['sv','Suédois'],['tg','Tadjik'],['tl','Tagalog (filipino)'],['ta','Tamoul'],['cs','Tchèque'],['te','Télougou'],['th','Thaï'],['tr','Turc'],['tk','Turkmène'],['uk','Ukrainien'],['vi','Vietnamien']];   // langues du monde, par ordre alphabétique après les plus courantes (pour en ajouter une : ['code','Nom'])
const LANG_OK=new Set(LANGS.map(x=>x[0])), LANG_TOP=['fr','en','ar','es','pt','sw'], LANG_MAX=6;
const noAcc = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Choix des langues dans le profil : les langues choisies d'abord, puis les plus courantes, ou le résultat de la recherche par nom
function langChips(q){ const sel=(draft&&draft.langs)||[], nq=noAcc(q).trim();
  const pool = nq ? LANGS.filter(([k,l])=>noAcc(l).includes(nq)) : LANGS.filter(([k])=>LANG_TOP.includes(k));
  const list=[...LANGS.filter(([k])=>sel.includes(k)), ...pool.filter(([k])=>!sel.includes(k))].slice(0,30);
  return list.length ? chips('langs',list,sel) : '<p class="hint">Aucune langue ne correspond. Essaie un autre nom.</p>'; }
const langField = () => `<div class="field lang-pick"><label class="lbl" for="lang-q">Langues parlées en jeu</label><input id="lang-q" type="search" autocomplete="off" placeholder="Chercher une langue (ex. anglais, arabe, swahili…)" aria-controls="lang-list"><div id="lang-list">${langChips('')}</div><span class="hint">${LANG_MAX} langues au maximum.</span></div>`;
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='lang-q'){ const b=document.getElementById('lang-list'); if(b) b.innerHTML=langChips(e.target.value); } });
const RANKS=[['1','Débutant'],['2','Intermédiaire'],['3','Avancé'],['4','Expert'],['5','Pro']];
/* ---- Rangs et rôles propres à chaque jeu (les autres jeux gardent les niveaux génériques ci-dessus) ---- */
const GAME_RANKS={
  'Free Fire':['Bronze','Argent','Or','Platine','Diamant','Héroïque','Grand Maître'],
  'Call of Duty Mobile':['Recrue','Vétéran','Élite','Pro','Maître','Grand Maître','Légendaire'],
  'PUBG Mobile':['Bronze','Argent','Or','Platine','Diamant','Couronne','As','Conquérant'],
  'Mobile Legends':['Guerrier','Élite','Maître','Grand Maître','Épique','Légende','Mythique'],
  'eFootball':['Division 10','Division 9','Division 8','Division 7','Division 6','Division 5','Division 4','Division 3','Division 2','Division 1'],
  'EA Sports FC':['Division 10','Division 9','Division 8','Division 7','Division 6','Division 5','Division 4','Division 3','Division 2','Division 1','Élite'],
  'Fortnite':['Bronze','Argent','Or','Platine','Diamant','Élite','Champion','Unreal'],
  'Brawl Stars':['Bronze','Argent','Or','Diamant','Mythique','Légendaire','Masters','Pro'],
  'Valorant':['Fer','Bronze','Argent','Or','Platine','Diamant','Ascendant','Immortel','Radiant'],
  'League of Legends':['Fer','Bronze','Argent','Or','Platine','Émeraude','Diamant','Maître','Grand Maître','Challenger'],
  'Apex Legends':['Recrue','Bronze','Argent','Or','Platine','Diamant','Maître','Prédateur'],
  'Rocket League':['Bronze','Argent','Or','Platine','Diamant','Champion','Grand Champion','Supersonic Legend'],
  'Overwatch 2':['Bronze','Argent','Or','Platine','Diamant','Maître','Grand Maître','Champion','Top 500'],
};
const GAME_ROLES={
  'Free Fire':['Rusher','Sniper','Support',"Chef d'équipe"],
  'Call of Duty Mobile':['Slayer','Objectif','Support','Sniper','Ancre'],
  'Call of Duty':['Slayer','Objectif','Support','Sniper'],
  'PUBG Mobile':['Fragger','Sniper','Support',"Chef d'équipe"],
  'Blood Strike':['Rusher','Sniper','Support'],
  'Mobile Legends':['Tank','Combattant','Assassin','Mage','Tireur','Support'],
  'eFootball':['Attaquant','Milieu','Défenseur','Gardien'],
  'EA Sports FC':['Attaquant','Milieu','Défenseur','Gardien'],
  'EA FC Mobile':['Attaquant','Milieu','Défenseur','Gardien'],
  'Fortnite':['Fragger','Constructeur','Support'],
  'Valorant':['Duelliste','Initiateur','Contrôleur','Sentinelle'],
  'League of Legends':['Top','Jungle','Mid','ADC','Support'],
  'Apex Legends':['Assaut','Escarmoucheur','Reconnaissance','Soutien','Contrôleur'],
  'Rocket League':['Attaquant','Défenseur','Polyvalent'],
  'Overwatch 2':['Tank','Dégâts','Soutien'],
  'Counter-Strike 2':['Entry','AWPer','Support','IGL','Lurker'],
};
const rankOptions = g => GAME_RANKS[g] ? GAME_RANKS[g].map(r=>[r,r]) : RANKS;
// Ancien niveau générique ('1' à '5') ou rang du jeu
const rankLabel = (g,v) => !v ? '' : /^[1-5]$/.test(v) ? L(RANKS,v) : String(v);
// Niveau ramené sur une échelle de 1 à 5, pour comparer deux joueurs sur un même jeu
const rankLevel = (g,v) => { if(!v) return null; if(/^[1-5]$/.test(v)) return +v; const l=GAME_RANKS[g], i=l?l.indexOf(v):-1; if(i<0) return null; return l.length>1 ? 1+i/(l.length-1)*4 : 3; };
const CANNED=['Yo ! Trop chaud pour une partie ce soir ?','Salut 👋 tu joues à quelle heure d\'habitude ?','On se fait une game ? Envoie ton créneau.','Hey ! J\'ai vu qu\'on a les mêmes jeux, on teste quand tu veux.','Ok ça marche, je suis dispo ce week-end.','Grave ! Ajoute-moi sur Discord quand tu veux.'];

// Enrichissement des profils de démo (pays, langues, rang par jeu, « rejouerait avec »)
(function(){
  const C=['CI','SN','CM','FR','CI','BJ','ML','CI','TG','CI','GA','CI','BF','CD','CI','CI'], RJ=[3,1,5,8,2,4,0,6,3,1,0,7,4,2,1,0];
  PLAYERS.forEach((p,i)=>{ p.country=C[i%C.length]; p.langs=i%3?['fr']:['fr','en']; p.ranks={}; p.games.forEach((g,j)=>p.ranks[g]=String(1+((i+j)%5))); p.rejoue=RJ[i%RJ.length]; });
})();
const DEMO_SQUADS=[
  {id:'s1',owner:'p1',game:'Free Fire',title:'Squad ranked ce soir',hour:'soir',day:'ven',slots:4,members:['p1','p8'],voice:true,desc:'On monte en Héroïque, vocal obligatoire.',ageGroup:'adult',at:Date.now()-3600e3},
  {id:'s2',owner:'p3',game:'Minecraft',title:'Serveur survie chill',hour:'soir',day:'sam',slots:5,members:['p3','p2'],voice:false,desc:'Build et exploration, zéro prise de tête.',ageGroup:'adult',at:Date.now()-7200e3},
  {id:'s3',owner:'p4',game:'Valorant',title:'5 stack compétitif',hour:'nuit',day:'sam',slots:5,members:['p4','p13','p9'],voice:true,desc:'Platine minimum, on grind.',ageGroup:'adult',at:Date.now()-9000e3},
  {id:'s4',owner:'p5',game:'EA Sports FC',title:'Clubs Pro',hour:'soir',day:'dim',slots:3,members:['p5'],voice:true,desc:'Il me manque deux joueurs sérieux.',ageGroup:'adult',at:Date.now()-20000e3},
  {id:'s5',owner:'p15',game:'Roblox',title:'Jeux Roblox entre potes',hour:'aprem',day:'mer',slots:4,members:['p15','p11'],voice:false,desc:'Brookhaven, Blox Fruits, ce que vous voulez.',ageGroup:'minor',at:Date.now()-5000e3},
  {id:'s6',owner:'p16',game:'Fortnite',title:'Duo / trio ranked',hour:'soir',day:'sam',slots:3,members:['p16'],voice:true,desc:'Objectif Champion.',ageGroup:'minor',at:Date.now()-8000e3},
];

/* ---- Migrations d'état ---- */
['requests','notifs','squads','joined','hidden','banned'].forEach(k=>{ if(!Array.isArray(S[k])) S[k]=[]; });
['chats','ratings','unread','rated'].forEach(k=>{ if(!S[k]||typeof S[k]!=='object') S[k]={}; });
if(S.mates && S.mates.length){ S.mates.forEach(id=>{ if(!S.requests.some(r=>r.to===id||r.from===id)) S.requests.push({id:'r'+id,from:'me',to:id,status:'accepted',at:Date.now()}); }); S.mates=[]; save(); }
S.reports.forEach(r=>{ if(!r.status) r.status='open'; });

/* ---- Mates (demandes avec acceptation) ---- */
const reqWith = id => S.requests.find(r=>(r.from==='me'&&r.to===id)||(r.from===id&&r.to==='me'));
const isMate = id => !!reqWith(id) && reqWith(id).status==='accepted';
const matesList = () => visible().filter(p=>isMate(p.id));
/* ---- v15 — Mates épinglés : ils restent en haut de la liste des messages (5 au plus).
   Rangé dans la partie privée du compte (private/{moi}.pins) : visible par soi seulement, sur tous ses appareils. ---- */
const PIN_MAX=5, PIN_SVG='<svg class="pin-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.2 2.6l6.2 6.2-1.9.8-3.4 3.4.5 4.9-1.5 1.5-4.2-4.2-5.6 5.6-1.3.2.2-1.3 5.6-5.6-4.2-4.2 1.5-1.5 4.9.5 3.4-3.4z"/></svg>';
const pins = () => Array.isArray(S.pins)?S.pins:[];
const isPinned = id => pins().includes(id);
const pinSort = (list,idOf=p=>p.id) => { const pn=pins(); return list.filter(x=>pn.includes(idOf(x))).concat(list.filter(x=>!pn.includes(idOf(x)))); };   // les épinglés d'abord ; dans chaque partie, l'ordre est gardé
function togglePin(id){ const pn=pins().filter(x=>isMate(x)), on=pn.includes(id);   // un mate retiré perd son épingle
  if(!on&&pn.length>=PIN_MAX){ toast(`${PIN_MAX} mates épinglés au plus. Retire d'abord une épingle.`,3500); return false; }
  S.pins=on?pn.filter(x=>x!==id):[...pn,id]; save(); DB.savePins(); toast(on?'Épingle retirée':'Mate épinglé en haut de tes messages'); return true; }
/* ---- v25 — Menu d'une conversation ou d'un groupe dans la liste (appui long sur téléphone, clic droit sur ordinateur), comme dans la vidéo d'Aki.
   Message privé : Épingler · Marquer comme lu · Mettre en sourdine · Voir le profil · Bloquer · Signaler · Supprimer.
   Groupe : Épingler · Marquer comme lu · Notifications · Signaler · Quitter (ou Supprimer, pour son créateur).
   Sourdine, épingles de groupes et conversations supprimées sont gardées sur l'appareil, par compte (S.rowp[moi]) : aucune règle Firebase ne change,
   et « Supprimer » une conversation ne touche à aucun message dans la base (ils sont seulement cachés de mon côté). ---- */
const RM_IC = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const RM_SVG = { read:RM_IC('<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16 9.6"/>'), mute:RM_IC('<path d="M6 16V11a6 6 0 0 1 9.3-5M18 11v5l2 2H8M10 20a2 2 0 0 0 4 0M4 4l16 16"/>'), bell:RM_IC('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  who:RM_IC('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.6-3.6 3.2-5.6 7-5.6s6.4 2 7 5.6"/>'), block:RM_IC('<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>'), flag:RM_IC('<path d="M5 21V4M5 4h11l-1.6 4L16 12H5"/>'),
  leave:RM_IC('<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'), del:RM_IC('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>') };
const MUTE_IC = RM_SVG.mute.replace('<svg ','<svg class="mute-ic" ');
function rowPrefs(){ const u=(S.auth&&S.auth.uid)||'me'; S.rowp=S.rowp&&typeof S.rowp==='object'?S.rowp:{}; const r=S.rowp[u]=S.rowp[u]&&typeof S.rowp[u]==='object'?S.rowp[u]:{};
  if(!Array.isArray(r.mute)) r.mute=[]; if(!Array.isArray(r.gpins)) r.gpins=[]; if(!r.cleared||typeof r.cleared!=='object') r.cleared={}; return r; }
const rowMuted = (kind,id) => { try{ return rowPrefs().mute.includes(kind+':'+id); }catch(e){ return false; } };
const gPinned = id => { try{ return rowPrefs().gpins.includes(id); }catch(e){ return false; } };
const clearedAt = id => { try{ return +rowPrefs().cleared[id]||0; }catch(e){ return 0; } };   // conversation « supprimée » de mon côté : les messages d'avant cette heure sont cachés ici
const gPinSort = list => list.filter(g=>gPinned(g.id)).concat(list.filter(g=>!gPinned(g.id)));
function rowRefresh(){ renderNotifBadge(); if(location.hash==='#/messages'||location.hash==='#/groupe'){ const y=scrollY; route(); scrollTo(0,y); } else dmRefresh(); }
function toggleMute(kind,id){ const r=rowPrefs(), k=kind+':'+id, on=r.mute.includes(k); r.mute=on?r.mute.filter(x=>x!==k):[...r.mute,k].slice(-200); save();
  toast(kind==='g'?(on?'Notifications du groupe réactivées':'Notifications du groupe coupées'):(on?'Son réactivé pour cette conversation':'Conversation en sourdine')); }
function toggleGPin(id){ const r=rowPrefs(), mine=r.gpins.filter(x=>{ const g=gById(x); return g&&gIn(g); }), on=mine.includes(id);   // un groupe quitté perd son épingle
  if(!on&&mine.length>=PIN_MAX){ toast(`${PIN_MAX} groupes épinglés au plus. Retire d'abord une épingle.`,3500); return false; }
  r.gpins=on?mine.filter(x=>x!==id):[...mine,id]; save(); toast(on?'Épingle retirée':'Groupe épinglé en haut de tes messages'); return true; }
function markRowRead(kind,id){ if(kind==='g') (S.gseen=S.gseen||{})[id]=Date.now();
  else { S.unread[id]=0; const seen=S.notifs.filter(n=>!n.read&&n.type==='message'&&n.from===id); seen.forEach(n=>n.read=true); DB.markRead(seen.map(n=>n.id)); }
  save(); }
// « Supprimer » une conversation privée : elle est vidée de mon côté, sur cet appareil. Rien n'est effacé dans la base, le mate garde tout, et on reste mates.
function clearChatDialog(p){ modal(`<h3>Supprimer la conversation avec ${esc(p.name)} ?</h3><p class="muted">Les messages disparaissent de ton côté, sur cet appareil. ${esc(p.name)} les garde, et vous restez mates.</p>
    <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-danger" type="button" id="cc-ok">Supprimer</button></div>`,
    d=>d.querySelector('#cc-ok').onclick=()=>{ rowPrefs().cleared[p.id]=Date.now(); S.chats[p.id]=[]; markRowRead('c',p.id); d.close(); toast('Conversation supprimée de ton côté'); rowRefresh(); }); }
// Signaler un groupe : le signalement part à la modération contre le créateur du groupe, avec le nom du groupe dans les détails (même forme qu'un signalement de joueur)
function groupReportDialog(g){ modal(`<h3>Signaler le groupe ${esc(g.name)}</h3><p class="muted">La modération examine chaque signalement. Le groupe n'est pas prévenu.</p>
    <div class="radio-list">${['Comportement toxique ou harcèlement','Contenu inapproprié','Arnaque','Adulte qui contacte un mineur','Autre'].map((r,i)=>`<label><input type="radio" name="rr" value="${r}" ${i?'':'checked'}> ${r}</label>`).join('')}</div>
    <textarea id="rtxt" rows="3" placeholder="Détails (facultatif)" maxlength="380"></textarea>
    <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-ac" type="button" id="rsend">Envoyer le signalement</button></div>`,
    d=>d.querySelector('#rsend').onclick=()=>{ const det=(`[Groupe « ${g.name} » · ${g.id}] `+d.querySelector('#rtxt').value).slice(0,500);
      DB.saveReport({id:g.owner,reason:d.querySelector('[name=rr]:checked').value,details:det,at:Date.now(),status:'open',by:'me',group:g.id}); d.close(); toast('Signalement envoyé'); }); }
function groupOutDialog(g){ const admin=g.owner===myId();
  modal(admin?`<h3>Supprimer le groupe ${esc(g.name)} ?</h3><p class="muted">Tu es son créateur : le groupe et tous ses messages seront effacés pour tous les membres. On ne peut pas revenir en arrière.</p>
      <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-danger" type="button" id="go-ok">Supprimer le groupe</button></div>`
    :`<h3>Quitter le groupe ${esc(g.name)} ?</h3><p class="muted">Il disparaît de tes messages. Les autres membres restent dans le groupe et gardent ses messages.</p>
      <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-danger" type="button" id="go-ok">Quitter le groupe</button></div>`,
    d=>d.querySelector('#go-ok').onclick=async ev=>{ const b=ev.currentTarget, here=location.hash==='#/groupe/'+g.id; b.disabled=true;
      if(await (admin?DB.deleteGroup(g.id):DB.leaveGroup(g.id))){ d.close(); toast(admin?'Groupe supprimé':'Tu as quitté le groupe'); if(here) location.hash=navPhone()?'#/messages':'#/groupe'; else rowRefresh(); } else b.disabled=false; }); }
let RM=null;
function rmClose(){ if(!RM) return; const {ov,back,key}=RM; RM=null; document.removeEventListener('keydown',key,true); ov.remove(); try{ if(back&&document.body.contains(back)) back.focus({preventScroll:true}); }catch(e){} }
function rowMenu(kind,id,src){ rmClose(); try{ mmClose(); }catch(e){}
  const p=kind==='c'?visible().find(x=>x.id===id):null, g=kind==='g'?gById(id):null;
  if(kind==='c'?(!p||!isMate(id)):(!g||!gIn(g))) return;
  const pin=kind==='c'?isPinned(id):gPinned(id), mu=rowMuted(kind,id), unread=kind==='c'?!!(S.unread[id]||0):gUnread(g), mineG=!!g&&g.owner===myId();
  const items=[['pin',pin?'Retirer l\'épingle':'Épingler',PIN_SVG], unread&&['read','Marquer comme lu',RM_SVG.read],
    kind==='c'?['mute',mu?'Réactiver le son':'Mettre en sourdine',mu?RM_SVG.bell:RM_SVG.mute]:['mute',mu?'Réactiver les notifications':'Couper les notifications',mu?RM_SVG.bell:RM_SVG.mute],
    kind==='c'&&['who','Voir le profil',RM_SVG.who], kind==='c'&&['block','Bloquer',RM_SVG.block], (kind==='c'||!mineG)&&['report','Signaler',RM_SVG.flag],
    kind==='c'?['del','Supprimer',RM_SVG.del,1]:mineG?['out','Supprimer le groupe',RM_SVG.del,1]:['out','Quitter le groupe',RM_SVG.leave,1]].filter(Boolean);
  const ov=document.createElement('div'); ov.className='mm-ov rm-ov'; ov.id='rm-ov';
  ov.innerHTML=`<div class="rm-catch" data-rm-close></div><div class="rm-hole" aria-hidden="true"></div><div class="mm-menu" role="menu" tabindex="-1" aria-label="Actions sur ${kind==='c'?'la conversation avec '+esc(p.name):'le groupe '+esc(g.name)}">${items.map(([k,l,ic,dg])=>`<button type="button" role="menuitem" class="mm-it${dg?' danger':''}" data-rm="${k}">${ic}<span>${l}</span></button>`).join('')}</div>`;
  document.body.appendChild(ov);
  const menu=ov.querySelector('.mm-menu'), hole=ov.querySelector('.rm-hole'), vw=innerWidth, vh=(window.visualViewport&&visualViewport.height)||innerHeight, pad=12, mw=menu.offsetWidth, mh=menu.offsetHeight;
  const r=src&&document.body.contains(src)?src.getBoundingClientRect():null; let top, left, oy='top';
  if(r&&r.width){ const round=src.classList.contains('dm-ico'); Object.assign(hole.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',borderRadius:round?'18px':'14px'});
    left=r.left+(round?0:8);
    if(r.bottom+8+mh<=vh-pad) top=r.bottom+8; else if(r.top-8-mh>=pad){ top=r.top-8-mh; oy='bottom'; } else top=vh-pad-mh; }
  else { hole.style.cssText='left:50%;top:50%;width:0;height:0'; left=(vw-mw)/2; top=(vh-mh)/2; }
  left=Math.max(pad,Math.min(vw-pad-mw,left)); top=Math.max(pad,top);
  menu.style.left=left+'px'; menu.style.top=top+'px'; menu.style.setProperty('--mm-ox','left'); menu.style.setProperty('--mm-oy',oy);
  ov.addEventListener('click',e=>{ if(e.target.closest('[data-rm-close]')){ rmClose(); return; } const t=e.target.closest('[data-rm]'); if(!t) return; const k=t.dataset.rm; rmClose();
    if(k==='pin'){ if(kind==='c'?togglePin(id):toggleGPin(id)) rowRefresh(); }
    else if(k==='read'){ markRowRead(kind,id); rowRefresh(); }
    else if(k==='mute'){ toggleMute(kind,id); rowRefresh(); }
    else if(k==='who') location.hash='#/joueur/'+id;
    else if(k==='block') blockDialog(p,rowRefresh);
    else if(k==='report'){ if(kind==='c') reportDialog(p,rowRefresh); else groupReportDialog(g); }
    else if(k==='del') clearChatDialog(p);
    else if(k==='out') groupOutDialog(g); });
  const openedAt=Date.now();   // sur Android, l'appui long envoie aussi un « clic droit » juste après l'ouverture : il ne doit pas refermer le menu
  ov.addEventListener('contextmenu',e=>{ e.preventDefault(); if(Date.now()-openedAt>900) rmClose(); });
  // le clavier est écouté sur toute la page : après un appui long, le focus peut être resté sur la ligne
  const key=e=>{ const its=[...ov.querySelectorAll('.mm-it')], k=its.indexOf(document.activeElement);
    if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); rmClose(); }
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Tab'){ e.preventDefault(); const dd=e.key==='ArrowUp'||(e.key==='Tab'&&e.shiftKey)?-1:1; its[k<0?(dd>0?0:its.length-1):(k+dd+its.length)%its.length]?.focus(); } };
  document.addEventListener('keydown',key,true); RM={ov,back:src||null,key};
  try{ menu.focus({preventScroll:true}); }catch(e){} }   // le focus va au menu (pas de cadre sur le premier bouton) : les flèches et Tab parcourent ensuite les boutons
window.addEventListener('hashchange',rmClose); window.addEventListener('resize',rmClose);
{ let t=0, x=0, y=0, row=null, eat=false, at=0;
  const sel='a.sn-row[href^="#/messages/"],a.sn-row.grp[href^="#/groupe/"],a.dm-row[href^="#/messages/"],a.dm-row.g-row[href^="#/groupe/"],a.dm-ico[href^="#/groupe/"]:not(.plus)';
  const refOf=r=>{ const h=r.getAttribute('href'), g=h.startsWith('#/groupe/'); return [g?'g':'c',decodeURIComponent(h.slice((g?'#/groupe/':'#/messages/').length))]; };
  const openRow=r=>{ const [k,i]=refOf(r); rowMenu(k,i,r); };
  const stop=()=>{ clearTimeout(t); if(row){ row.classList.remove('pressing'); row=null; } };
  document.addEventListener('pointerdown',e=>{ stop(); eat=false; const r=e.target.closest&&e.target.closest(sel); if(!r||e.button>0||e.pointerType==='mouse') return;
    x=e.clientX; y=e.clientY; row=r; r.classList.add('pressing');
    t=setTimeout(()=>{ const r2=row; stop(); if(!r2) return; eat=true; at=Date.now(); try{ navigator.vibrate&&navigator.vibrate(12); }catch(er){} openRow(r2); },500); });
  document.addEventListener('pointerup',stop); document.addEventListener('pointercancel',stop);
  document.addEventListener('pointermove',e=>{ if(row&&Math.abs(e.clientX-x)+Math.abs(e.clientY-y)>12) stop(); },{passive:true});
  document.addEventListener('scroll',()=>{ if(row) stop(); },true);
  document.addEventListener('click',e=>{ if(!eat) return; eat=false; e.preventDefault(); e.stopPropagation(); },true);   // le clic qui termine l'appui long n'ouvre pas la conversation et ne ferme pas le menu
  document.addEventListener('contextmenu',e=>{ const r=e.target.closest&&e.target.closest(sel); if(!r) return; e.preventDefault(); stop(); if(Date.now()-at>900) openRow(r); }); }
const pendingReceived = () => S.requests.filter(r=>r.to==='me'&&r.status==='pending'&&visible().some(p=>p.id===r.from));
function sendRequest(p){
  if(!canAsk(p)){ toast("C'est au joueur de moins de 18 ans de t'envoyer la demande."); return; }   // v7 — aussi vérifié par les règles Firestore
  const r={id:'r'+Date.now(),from:'me',to:p.id,status:'pending',at:Date.now()}; S.requests.push(r); save(); DB.saveRequest(r);
  toast(`Demande envoyée à ${p.name}`);
  if(!AUTH_LIVE) setTimeout(()=>{ const q=reqWith(p.id); if(!q||q.status!=='pending') return;
    if(Math.random()<.85){ q.status='accepted'; save(); notify({type:'accepted',from:p.id,text:`${p.name} a accepté ta demande de mate 🎉`}); if(location.hash==='#/joueur/'+p.id||location.hash==='#/matchs') route(); } }, 5000+Math.random()*8000);
}
function answerRequest(id,accept){
  const q=reqWith(id); if(!q) return; const p=PLAYERS.find(x=>x.id===id);
  if(accept){ q.status='accepted'; DB.saveRequest(q); toast(`${p?p.name:'Ce joueur'} est maintenant ton mate`); if(p) DB.saveNotif(id,{type:'accepted',from:'me',text:`${S.me.name} a accepté ta demande de mate`}); }
  else { S.requests=S.requests.filter(r=>r!==q); DB.deleteRequest(q); toast('Demande refusée'); }
  { const seen=S.notifs.filter(n=>!n.read&&n.type==='request'&&n.from===id); seen.forEach(n=>n.read=true); DB.markRead(seen.map(n=>n.id)); }   // la notification de cette demande est réglée
  save();
}
function removeRequest(id){ const q=reqWith(id); if(!q) return; S.requests=S.requests.filter(r=>r!==q); save(); DB.deleteRequest(q); }
function demoScheduleIncoming(){
  if(AUTH_LIVE||!S.me||S.demoDone) return; S.demoDone=true; save();
  setTimeout(()=>{ if(!S.me) return; const c=ranked().filter(({p})=>!reqWith(p.id)&&(!crossAge(p)||minorP(p)))[0]; if(!c) return;   // jamais une demande d'un adulte vers un 13-17 ans
    S.requests.push({id:'r'+Date.now(),from:c.p.id,to:'me',status:'pending',at:Date.now()}); save();
    notify({type:'request',from:c.p.id,text:`${c.p.name} veut devenir ton mate`});
    if(location.hash==='#/joueur/'+c.p.id||location.hash==='#/matchs') route(); }, 20000);
}

/* ---- Notifications ---- */
function notify(n){
  S.notifs.unshift({id:'n'+Date.now()+Math.random().toString(36).slice(2,6),at:Date.now(),read:false,...n}); S.notifs=S.notifs.slice(0,60); save();
  renderNotifBadge(); if(n.toast!==false) toast(n.text);
}
const pendFrom = () => new Set(pendingReceived().map(r=>r.from));
const dupReq = (n,pf) => n.type==='request' && pf.has(n.from);   // notification qui répète une demande encore en attente
const unreadCount = () => { const pf=pendFrom(); return S.notifs.filter(n=>!n.read&&!dupReq(n,pf)&&!(n.type==='message'&&rowMuted('c',n.from))).length + pf.size; };   // v25 — une conversation en sourdine ne compte pas sur la cloche
const BELL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
function renderNotifBadge(){ const n=unreadCount(); try{ if('setAppBadge' in navigator){ n?navigator.setAppBadge(n):navigator.clearAppBadge(); } }catch(e){} document.querySelectorAll('.notif-btn').forEach(b=>{ b.innerHTML=BELL+(n?`<span class="badge">${n>9?'9+':n}</span>`:''); b.classList.toggle('has',n>0); });
  const um=Object.entries(S.unread||{}).reduce((a,[k,b])=>a+(rowMuted('c',k)?0:(+b||0)),0);   // messages non lus : pastille sur l'onglet Messages
  let gk=0; try{ gk=GROUPS.filter(gLoud).length+gInvites().length; }catch(e){}   // groupes avec du nouveau + invitations : pastille sur l'onglet Groupes (menu du haut, petite tablette) ; v23 — ordinateur : les invitations sont sur le « + » de la colonne
  const badge=(a,k,label)=>{ let b=a.querySelector('.tb-badge'); if(!k){ if(b) b.remove(); return; } if(!b){ b=document.createElement('span'); b.className='tb-badge'; a.appendChild(b); } b.textContent=k>9?'9+':k; b.setAttribute('aria-label',label); };
  // v20 — sur téléphone, les groupes sont dans Messages : la pastille de l'onglet Messages compte aussi les groupes avec du nouveau et les invitations
  document.querySelectorAll('[data-nav="messages"]').forEach(a=>{ const k=a.closest('#tabbar')?um+gk:um; badge(a,k,k===um?um+(um>1?' messages non lus':' message non lu'):k+(k>1?' nouveautés':' nouveauté')); });
  document.querySelectorAll('[data-nav="groupe"]').forEach(a=>badge(a,gk,gk+(gk>1?' groupes avec du nouveau':' groupe avec du nouveau')));
  try{ railPlusSync(); }catch(e){} }   // v23 — ordinateur : les invitations aux groupes sur le « + » de la colonne de gauche
const ago = t => { const m=Math.round((Date.now()-t)/60000); return m<1?'à l\'instant':m<60?`il y a ${m} min`:m<1440?`il y a ${Math.round(m/60)} h`:`il y a ${Math.round(m/1440)} j`; };
function notifLink(n){ return n.type==='message'?'#/messages/'+n.from : n.type==='squad'?'#/groupes/sessions' : n.type==='group'&&n.gid?'#/groupe/'+n.gid : n.type==='flame'?'#/messages/'+n.from : n.type==='annonce'?'#/groupes/annonces' : n.from?'#/joueur/'+n.from : '#/matchs'; }
function notifCenter(){
  const pend=pendingReceived(), pf=pendFrom(), rows=S.notifs.filter(n=>!dupReq(n,pf));
  const sent=S.requests.filter(r=>r.from==='me'&&r.status==='pending').map(r=>visible().find(p=>p.id===r.to)).filter(Boolean);
  modal(`<h3>Notifications</h3>
    ${pend.length?`<div class="notif-group"><b>Demandes de mate</b>${pend.map(r=>{ const p=PLAYERS.find(x=>x.id===r.from); if(!p) return ''; return `<div class="nrow">${avatar(p,40)}<div><b>${esc(p.name)}${modBadge(p)}</b><span class="muted">veut devenir ton mate · ${ago(r.at)}</span></div><div class="nact"><button class="btn btn-sm btn-ac" data-acc="${p.id}">Accepter</button><button class="btn btn-sm btn-ghost" data-dec="${p.id}">Refuser</button></div></div>`; }).join('')}</div>`:''}
    <div class="notif-list">${rows.length?rows.slice(0,25).map(n=>{ const p=n.from&&n.from!=='me'?PLAYERS.find(x=>x.id===n.from):null;
      return `<a class="nrow${n.read?'':' unread'}" href="${esc(notifLink(n))}" data-nid="${esc(n.id)}">${p?avatar(p,40):'<span class="av" style="width:40px;height:40px;--h:265">✦</span>'}<div><span>${esc(n.text)}</span><span class="muted">${ago(n.at)}</span></div></a>`; }).join('')
      :pend.length?'':'<p class="muted" style="padding:14px 0">Rien de nouveau pour le moment.</p>'}</div>
    ${sent.length?`<details class="more-fold sent-reqs"><summary>Mes demandes en attente (${sent.length})</summary>${sent.map(p=>`<div class="nrow">${avatar(p,40)}<div><b>${esc(p.name)}${modBadge(p)}</b><span class="muted">n'a pas encore répondu</span></div><div class="nact"><button class="btn btn-sm btn-ghost" data-cancel-req="${p.id}">Annuler</button></div></div>`).join('')}</details>`:''}
    <div class="dlg-actions"><button class="linkbtn" id="nread">Tout marquer comme lu</button><button class="btn" data-close>Fermer</button></div>`,
    d=>{ d.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{ answerRequest(b.dataset.acc,true); d.close(); route(); });
      d.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{ answerRequest(b.dataset.dec,false); d.close(); renderNotifBadge(); });
      d.querySelectorAll('[data-cancel-req]').forEach(b=>b.onclick=()=>{ removeRequest(b.dataset.cancelReq); toast('Demande annulée'); const row=b.closest('.nrow'), box=row.parentElement; row.remove(); const n=box.querySelectorAll('.nrow').length; if(n) box.querySelector('summary').textContent=`Mes demandes en attente (${n})`; else box.remove(); if(/^#\/(joueur|accueil|matchs)/.test(location.hash||'#/accueil')) route(); });
      d.querySelectorAll('[data-nid]').forEach(a=>a.addEventListener('click',()=>{ const n=S.notifs.find(x=>x.id===a.dataset.nid); if(n&&!n.read){ n.read=true; DB.markRead([n.id]); } save(); d.close(); renderNotifBadge(); }));
      d.querySelector('#nread').onclick=()=>{ DB.markRead(S.notifs.filter(n=>!n.read).map(n=>n.id)); S.notifs.forEach(n=>n.read=true); save(); renderNotifBadge(); d.close(); }; });
}
document.addEventListener('click',e=>{ if(e.target.closest('.notif-btn,[data-notif-open]')) notifCenter(); });
