/* Coopô — js/communaute.js
   Communauté : annonces « Je cherche », tournois, aperçu sur l'accueil, « Tu rejouerais avec lui ? », partage de profil.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* =========================================================
   COMMUNAUTÉ : annonces « Je cherche » et tournois
   Firestore : boards/{adult|minor}/annonces/{id} et boards/{adult|minor}/tournois/{id}
   Chacun publie dans le tableau de son âge ; v7 — tout le monde lit les deux.
   Tournoi du tableau « adult » : ouvert à tous ; du tableau « minor » : réservé aux 13-17 ans.
   ========================================================= */
const myGroupNow = () => S.me&&S.me.dob ? ageGroup(S.me) : 'adult';
// v7 — âges réunis : tout le monde se voit. Entre un adulte et un 13-17 ans, c'est le 13-17 ans qui envoie la demande de mate ;
// messages écrits, vocaux et appels vocaux oui ; appels vidéo et photos non (les règles Firestore le vérifient aussi).
const minorP = p => !!p && ageGroup(p)==='minor';
const crossAge = p => !!p && ageGroup(p)!==myGroupNow();
const canAsk = p => !crossAge(p) || myGroupNow()==='minor';   // un adulte n'envoie pas de demande à un 13-17 ans
// Pseudos en jeu écrits sur le profil public : ceux d'un adulte (s'il les affiche) ; jamais ceux d'un 13-17 ans (rangés dans gametags)
const publicTags = me => S.privacy.tags && ageGroup(me)==='adult' ? (me.tags||{}) : {};
const myId = () => DB.live ? DB.uid() : 'me';
const fmtDay = ts => new Date(ts).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})+' · '+new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
function boardHead(tab,sub,action){
  const nA=annoncesAll().length, nT=tournoisAll().filter(t=>t.status==='open'&&t.date>Date.now()).length;
  const T=[['annonces','Annonces',nA],['sessions','Sessions',0],['tournois','Tournois',nT]];   // les groupes ont quitté la Communauté : ils ont leur propre onglet
  return `<div class="page-head"><div><h2>Communauté</h2><p>${sub}</p></div>${action||''}</div>
    <div class="chips board-tabs" role="tablist">${T.map(([k,l,n])=>`<a class="chip" role="tab" href="#/groupes/${k}" aria-selected="${tab===k}" aria-pressed="${tab===k}">${l}${n?` <span class="cnt">${n}</span>`:''}</a>`).join('')}</div>
    ${discordOK()?`<div class="discord-row"><span>Envie de parler en vocal ? Le serveur Discord COOPO est ouvert.</span>${discordBtn('btn btn-sm')}</div>`:''}`;
}
function viewSquads(tab){
  if(tab==='groupes'){ location.replace('#/groupe'); return; }   // ancienne adresse de la liste des groupes : ils ont maintenant leur propre onglet
  if(dataPending()) return loadingView('Communauté');
  DB.refreshBoards().then(ch=>{ if(ch&&location.hash.startsWith('#/groupes')) refreshAfterData(); });
  if(tab==='sessions') return viewGroupsTab();
  if(tab==='tournois') return viewTournois();
  return viewAnnonces();
}

/* ---- Annonces « Je cherche » ---- */
const WHEN=[['now','Maintenant',3],['soir','Ce soir',8],['demain','Demain',36]];
const MAX_ANNONCES=2;   // annonces actives par joueur
let ANNONCES=[];        // annonces des deux tableaux (Firestore)
const DEMO_ANNONCES=[
  {id:'a1',by:'p8',byName:'Gbaka_225',game:'Free Fire',need:2,rank:'Héroïque',when:'soir',text:'Ranked ce soir, vocal obligatoire. On vise Grand Maître.',at:Date.now()-40*60e3,until:Date.now()+6*3600e3,replies:[],ageGroup:'adult'},
  {id:'a2',by:'p5',byName:'MamadouFC',game:'eFootball',need:1,rank:'Division 3',when:'now',text:'Coop 2v2 tout de suite, je suis en ligne.',at:Date.now()-10*60e3,until:Date.now()+2*3600e3,replies:['p1'],ageGroup:'adult'},
  {id:'a3',by:'p4',byName:'DjeliSniper',game:'Valorant',need:3,rank:'Platine',when:'demain',text:'Il manque 3 joueurs pour un 5 stack demain soir.',at:Date.now()-3*3600e3,until:Date.now()+30*3600e3,replies:[],ageGroup:'adult'},
  {id:'a4',by:'p15',byName:'Kassy_16',game:'Roblox',need:2,rank:'',when:'now',text:'Blox Fruits, on farme ensemble ?',at:Date.now()-20*60e3,until:Date.now()+2*3600e3,replies:[],ageGroup:'minor'},
];
const isMine = a => a.by==='me' || (DB.live && a.by===DB.uid());
function annoncesAll(){
  const src = DB.live ? ANNONCES : [...DEMO_ANNONCES, ...(S.annonces||[])];
  const my=S.me?S.me.games:[];   // v7 — les annonces de tous les âges
  return src.filter(a=>a.until>Date.now() && !S.blocked.includes(a.by) && !S.hidden.includes(a.by) && !S.banned.includes(a.by))
    .sort((x,y)=>(isMine(y)-isMine(x)) || ((my.includes(y.game))-(my.includes(x.game))) || (y.at-x.at));
}
function annonceCard(a){
  const mine=isMine(a), who=mine?S.me:PLAYERS.find(p=>p.id===a.by), me=myId();
  const replies=a.replies||[], inn=replies.includes(me), w=WHEN.find(x=>x[0]===a.when);
  const repliers=replies.map(r=>r===me?S.me:PLAYERS.find(p=>p.id===r)).filter(Boolean);
  const same=S.me&&S.me.games.includes(a.game);
  return `<article class="mcard annonce${same?' same':''}" style="--c:var(--pk)">
    <div class="sq-top"><span class="sq-game">${esc(a.game)}</span><span class="an-when">${w?w[1]:''} · ${ago(a.at)}</span></div>
    <h3>Cherche ${+a.need||1} joueur${(+a.need||1)>1?'s':''}${a.rank?` <small class="rank">${esc(a.rank)}</small>`:''}</h3>
    ${a.text?`<p class="an-text">${esc(a.text)}</p>`:''}
    <div class="an-foot">${mine?`<span class="an-who">${avatar(S.me,30)}<span>Ton annonce</span></span>`
      : `<a class="an-who" href="#/joueur/${esc(a.by)}">${who?avatar(who,30):''}<span>${esc(who?who.name:(a.byName||'Joueur'))}${who?modBadge(who):''}</span></a>`}
      <div class="an-act">${mine?`<span class="muted">${repliers.length?`${repliers.length} partant${repliers.length>1?'s':''}`:'Pas encore de réponse'}</span><button class="btn btn-sm btn-ghost" data-an-del="${esc(a.id)}">Retirer</button>`
        : inn?`<span class="mates-ok">✓ Partant</span><button class="btn btn-sm btn-ghost" data-an-leave="${esc(a.id)}">Annuler</button>`
        : `<button class="btn btn-sm btn-ac" data-an-join="${esc(a.id)}">Je suis partant</button>`}</div></div>
    ${mine&&repliers.length?`<div class="an-replies">${repliers.map(x=>`<a class="mate-pill" href="#/joueur/${x.id}">${avatar(x,24)}${esc(x.name)}${isMate(x.id)?'':reqWith(x.id)?' · demande reçue':''}</a>`).join('')}</div>`:''}
  </article>`;
}
function viewAnnonces(){
  const list=annoncesAll(), me=S.me;
  app.innerHTML=`<div class="wrap page">${boardHead('annonces','Dis ce que tu cherches pour une partie, ou réponds aux annonces des autres.',me?'<button class="btn btn-ac" id="newan">Publier une annonce</button>':'<a class="btn btn-ac" href="#/inscription">Créer mon compte</a>')}
    <div class="grid">${list.length?list.map(annonceCard).join('')
      :`<div class="empty" style="grid-column:1/-1"><h3>Aucune annonce en ce moment</h3><p class="muted">Lance la première : « Je cherche 2 joueurs ${esc((me&&me.games[0])||'Free Fire')} ce soir ». Les annonces disparaissent toutes seules après la partie.</p>${me?'<button class="btn btn-ac" id="newan2">Publier une annonce</button>':''}</div>`}</div></div>`;
  document.getElementById('newan')?.addEventListener('click',newAnnonce);
  document.getElementById('newan2')?.addEventListener('click',newAnnonce);
}
function newAnnonce(){
  if(!S.me){ location.hash='#/inscription'; return; }
  if(annoncesAll().filter(isMine).length>=MAX_ANNONCES){ toast(`Tu as déjà ${MAX_ANNONCES} annonces en cours. Retires-en une pour en publier une nouvelle.`); return; }
  const games=S.me.games.length?S.me.games:GAMES.slice(0,8);
  modal(`<h3>Publier une annonce</h3><p class="muted">Les joueurs la verront dans Annonces. Elle disparaît toute seule après la partie.</p>
    <div class="form" style="margin-top:12px">
    <div class="two"><div class="field"><label for="an-g">Jeu</label><select id="an-g">${games.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('')}</select></div>
      <div class="field"><label for="an-n">Je cherche</label><select id="an-n">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===2?'selected':''}>${n} joueur${n>1?'s':''}</option>`).join('')}</select></div></div>
    <div class="two"><div class="field"><label for="an-r">Niveau souhaité</label><select id="an-r"></select></div>
      <div class="field"><label for="an-w">Quand</label><select id="an-w">${WHEN.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div></div>
    <div class="field"><label for="an-t">Message (facultatif)</label><input id="an-t" type="text" maxlength="140" placeholder="ex. Ranked, vocal obligatoire, on vise Héroïque"></div>
    <p class="err" id="an-e" role="alert"></p></div>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" id="an-ok">Publier</button></div>`, d=>{
    const fill=()=>{ const g=d.querySelector('#an-g').value; d.querySelector('#an-r').innerHTML='<option value="">Peu importe</option>'+rankOptions(g).map(([,l])=>`<option value="${esc(l)}">${esc(l)}</option>`).join(''); };
    d.querySelector('#an-g').onchange=fill; fill();
    d.querySelector('#an-ok').onclick=async()=>{ const btn=d.querySelector('#an-ok');
      if(myGroupNow()==='minor'&&hasPhone(d.querySelector('#an-t').value)){ d.querySelector('#an-e').textContent='Pour ta sécurité, pas de numéro de téléphone dans une annonce.'; return; }
      btn.disabled=true;
      const w=WHEN.find(x=>x[0]===d.querySelector('#an-w').value)||WHEN[0], now=Date.now();
      const a={id:'a'+now,by:myId(),byName:S.me.name,game:d.querySelector('#an-g').value,need:+d.querySelector('#an-n').value,rank:d.querySelector('#an-r').value,when:w[0],
        text:d.querySelector('#an-t').value.trim().slice(0,140),at:now,until:now+w[2]*3600e3,replies:[],ageGroup:myGroupNow()};
      if(DB.live){ if(!(await DB.saveAnnonce(a))){ d.querySelector('#an-e').textContent="L'annonce n'a pas pu être publiée. Réessaie dans un instant."; btn.disabled=false; return; } ANNONCES.unshift(a); }
      else { S.annonces=[...(S.annonces||[]).filter(x=>x.until>now),a]; save(); }
      d.close(); toast('Annonce publiée'); location.hash='#/groupes/annonces'; route(); };
  });
}
async function joinAnnonce(id,on){
  const a=annoncesAll().find(x=>x.id===id); if(!a||!S.me) return;
  const me=myId(); a.replies = on ? [...new Set([...(a.replies||[]),me])] : (a.replies||[]).filter(x=>x!==me);
  if(!DB.live) save();
  route();
  if(!on){ await DB.replyAnnonce(a,false); return; }
  await DB.replyAnnonce(a,true);
  const author=PLAYERS.find(p=>p.id===a.by); if(!author) return;
  let q=reqWith(author.id);
  // v7 — un adulte ne fait pas de demande à un 13-17 ans : il est seulement noté partant, c'est le jeune qui décide de l'ajouter
  if(!q&&!canAsk(author)){ toast(`Tu es noté partant. ${author.name} peut t'envoyer une demande de mate s'il le souhaite.`,4000); return; }
  if(!q){ const r={id:'r'+Date.now(),from:'me',to:author.id,status:'pending',at:Date.now()}; S.requests.push(r); save(); await DB.saveRequest(r); q=r; }
  await DB.saveNotif(author.id,{type:'annonce',from:'me',text:`${S.me.name} est partant pour ton annonce ${a.game}`});
  toast(q.status==='accepted'?`${author.name} est prévenu : écris-lui pour vous organiser`:`${author.name} est prévenu, et une demande de mate lui est envoyée`);
}
async function deleteAnnonce(id){
  const a=annoncesAll().find(x=>x.id===id); if(!a) return;
  if(DB.live){ ANNONCES=ANNONCES.filter(x=>x!==a); await DB.deleteAnnonce(a); } else { S.annonces=(S.annonces||[]).filter(x=>x.id!==id); save(); }
  toast('Annonce retirée'); route();
}
document.addEventListener('click',e=>{
  const j=e.target.closest('[data-an-join]'); if(j){ j.disabled=true; joinAnnonce(j.dataset.anJoin,true); return; }
  const l=e.target.closest('[data-an-leave]'); if(l){ joinAnnonce(l.dataset.anLeave,false); return; }
  const x=e.target.closest('[data-an-del]'); if(x){ deleteAnnonce(x.dataset.anDel); return; }
});

/* ---- Tournois (créés par la modération) ---- */
let TOURNOIS=[];
const DEMO_TOURNOIS=[
  {id:'t1',title:'Coupe Coopô Free Fire',game:'Free Fire',date:Date.now()+5*864e5,format:'Escouades de 4 · élimination directe',max:16,prize:'Un thème au choix pour l\'équipe gagnante',desc:'Inscris-toi seul, on complète les escouades. Lobby envoyé sur WhatsApp ou Discord 30 min avant.',players:['p8','p1'],entries:{},status:'open',ageGroup:'adult',at:Date.now()},
  {id:'t2',title:'Défi Brawl Stars 13-17',game:'Brawl Stars',date:Date.now()+3*864e5,format:'Solo · 3 manches',max:12,prize:'Thème au choix',desc:'Tournoi réservé aux 13-17 ans.',players:['p15'],entries:{},status:'open',ageGroup:'minor',at:Date.now()},
];
function tournoisAll(){   // v7 — tous les tournois sont visibles par tout le monde
  const src = DB.live ? TOURNOIS : [...DEMO_TOURNOIS, ...(S.tournois||[])];
  return src.slice().sort((a,b)=>((a.status==='done')-(b.status==='done')) || (a.date-b.date));
}
// Tournoi du tableau « adult » : ouvert à tous ; du tableau « minor » : réservé aux 13-17 ans
const tournoiOpenTo = t => t.ageGroup!=='minor' || myGroupNow()==='minor';
function tournoiCard(t){
  const me=myId(), players=t.players||[], inn=players.includes(me), full=players.length>=t.max, open=t.status==='open'&&t.date>Date.now()-3*3600e3;
  const status = t.status==='done'?'Terminé':!open?'Inscriptions closes':full?'Complet':'Inscriptions ouvertes';
  const canJoin = tournoiOpenTo(t);
  const mem=players.map(id=>id===me?S.me:PLAYERS.find(p=>p.id===id)).filter(Boolean);
  return `<article class="mcard tournoi${t.status==='done'?' done':''}" style="--c:var(--pk)">
    <div class="sq-top"><span class="sq-game">${esc(t.game)}</span><span class="sq-slots ${full||!open?'full':''}">${players.length}/${+t.max||0} · ${status}</span></div>
    <h3>${esc(t.title)}</h3>
    <dl class="facts"><div><dt>Quand</dt><dd>${esc(fmtDay(t.date))}</dd></div>${t.format?`<div><dt>Format</dt><dd>${esc(t.format)}</dd></div>`:''}${t.prize?`<div><dt>À gagner</dt><dd>${esc(t.prize)}</dd></div>`:''}${t.ageGroup==='minor'||isAdmin()?`<div><dt>Pour</dt><dd>${t.ageGroup==='minor'?'13-17 ans seulement':'Tout le monde'}</dd></div>`:''}</dl>
    ${t.desc?`<p class="muted">${esc(t.desc)}</p>`:''}
    ${mem.length?`<div class="sq-mem">${mem.slice(0,14).map(x=>x===S.me?avatar(S.me,30):`<a href="#/joueur/${x.id}" title="${esc(x.name)}">${avatar(x,30)}</a>`).join('')}</div>`:''}
    <div class="sq-act">${isAdmin()?`<button class="btn btn-sm btn-ghost" data-to-list="${esc(t.id)}">Inscrits</button><button class="btn btn-sm btn-ghost" data-to-edit="${esc(t.id)}">Modifier</button>`:''}
      ${t.status==='done'?'':!canJoin?'<span class="muted">Réservé aux 13-17 ans</span>':inn?`<span class="mates-ok">✓ Inscrit</span>${open?`<button class="btn btn-sm" data-to-leave="${esc(t.id)}">Se désinscrire</button>`:''}`:open&&!full?`<button class="btn btn-sm btn-ac" data-to-join="${esc(t.id)}">S'inscrire</button>`:''}</div>
  </article>`;
}
function viewTournois(){
  const list=tournoisAll();
  app.innerHTML=`<div class="wrap page">${boardHead('tournois','Des tournois et défis organisés par l\'équipe Coopô. Inscris-toi, on te prévient avant le début.',isAdmin()?'<button class="btn btn-ac" id="newto">Créer un tournoi</button>':'')}
    <div class="grid">${list.length?list.map(tournoiCard).join('')
      :`<div class="empty" style="grid-column:1/-1"><h3>Pas de tournoi pour le moment</h3><p class="muted">Les prochains tournois s'afficheront ici. Active les notifications pour ne rien rater.</p></div>`}</div></div>`;
  document.getElementById('newto')?.addEventListener('click',()=>editTournoi(null));
}
function joinTournoi(id,on){
  const t=tournoisAll().find(x=>x.id===id); if(!t||!S.me) return;
  const go=async()=>{ const me=myId();
    if(DB.live && !(await DB.joinTournoi(t,on))) return;
    t.players = on ? [...new Set([...(t.players||[]),me])] : (t.players||[]).filter(x=>x!==me);
    t.entries = {...(t.entries||{})}; if(on) t.entries[me]={name:S.me.name,ig:myGroupNow()==='minor'?'':(S.me.tags||{})[t.game]||''}; else delete t.entries[me];   // le pseudo en jeu d'un 13-17 ans n'est pas écrit dans le tournoi
    if(!DB.live) save();
    toast(on?`Inscrit à « ${t.title} » 🎮`:'Désinscription enregistrée'); route(); };
  if(on && !((S.me.tags||{})[t.game])){   // l'organisateur a besoin de ton pseudo ou ID en jeu
    modal(`<h3>Ton pseudo ${esc(t.game)}</h3><p class="muted">L'organisateur en a besoin pour t'inviter dans la partie. Il sera aussi ajouté à ton profil.</p>
      <div class="field"><label for="to-ig">Pseudo ou ID sur ${esc(t.game)}</label><input id="to-ig" type="text" maxlength="40"></div><p class="err" id="to-e"></p>
      <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" id="to-ok">M'inscrire</button></div>`, d=>{
      d.querySelector('#to-ok').onclick=async()=>{ const v=d.querySelector('#to-ig').value.trim(); if(v.length<2){ d.querySelector('#to-e').textContent='Indique ton pseudo ou ton ID.'; return; }
        S.me.tags={...(S.me.tags||{}),[t.game]:v}; if(!S.me.games.includes(t.game)) S.me.games=[...S.me.games,t.game]; save(); DB.saveProfile(S.me); d.close(); go(); };
    });
    return;
  }
  go();
}
function editTournoi(id){
  if(!isAdmin()) return;
  const t=id?tournoisAll().find(x=>x.id===id):null, isNew=!t;
  const pad=n=>String(n).padStart(2,'0'), dt=new Date(t?t.date:Date.now()+7*864e5); if(!t) dt.setHours(19,0,0,0);
  const local=`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  modal(`<h3>${isNew?'Créer un tournoi':'Modifier le tournoi'}</h3><div class="form" style="margin-top:12px">
    <div class="field"><label for="tt">Titre</label><input id="tt" type="text" maxlength="60" value="${esc(t?t.title:'')}" placeholder="ex. Coupe Coopô Free Fire"></div>
    <div class="two"><div class="field"><label for="tg">Jeu</label><select id="tg">${GAMES.map(g=>`<option value="${esc(g)}" ${t&&t.game===g?'selected':''}>${esc(g)}</option>`).join('')}</select></div>
      <div class="field"><label for="td">Date et heure</label><input id="td" type="datetime-local" value="${local}"></div></div>
    <div class="two"><div class="field"><label for="tm">Places</label><input id="tm" type="text" inputmode="numeric" value="${t?t.max:16}"></div>
      <div class="field"><label for="ta">Pour</label><select id="ta" ${isNew?'':'disabled'}><option value="adult" ${t&&t.ageGroup==='minor'?'':'selected'}>Tout le monde</option><option value="minor" ${t&&t.ageGroup==='minor'?'selected':''}>13-17 ans seulement</option></select></div></div>
    <div class="field"><label for="tf">Format</label><input id="tf" type="text" maxlength="80" value="${esc(t?t.format:'')}" placeholder="ex. Escouades de 4 · élimination directe"></div>
    <div class="field"><label for="tp">À gagner (facultatif)</label><input id="tp" type="text" maxlength="80" value="${esc(t?t.prize:'')}" placeholder="ex. Un thème au choix pour les gagnants"></div>
    <div class="field"><label for="tx">Règles et infos</label><textarea id="tx" rows="3" maxlength="500">${esc(t?t.desc:'')}</textarea></div>
    ${isNew?'':`<div class="field"><label for="ts">Statut</label><select id="ts">${[['open','Inscriptions ouvertes'],['closed','Inscriptions closes'],['done','Terminé']].map(([v,l])=>`<option value="${v}" ${t.status===v?'selected':''}>${l}</option>`).join('')}</select></div>`}
    <p class="err" id="te" role="alert"></p></div>
    <div class="dlg-actions">${isNew?'':'<button class="btn btn-danger" id="tdel">Supprimer</button>'}<button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" id="tok">${isNew?'Créer':'Enregistrer'}</button></div>`, d=>{
    d.querySelector('#tok').onclick=async()=>{ const v=k=>d.querySelector(k).value.trim();
      const title=v('#tt'), date=new Date(v('#td')).getTime(), max=parseInt(v('#tm'),10);
      const err=title.length<3?'Donne un titre au tournoi.':isNaN(date)?'Choisis la date et l\'heure.':!(max>=2&&max<=256)?'Le nombre de places doit être entre 2 et 256.':'';
      if(err){ d.querySelector('#te').textContent=err; return; }
      const data={title,game:v('#tg'),date,max,format:v('#tf'),prize:v('#tp'),desc:v('#tx'),status:isNew?'open':v('#ts'),ageGroup:isNew?v('#ta'):t.ageGroup,
        players:t?t.players||[]:[],entries:t?t.entries||{}:{},at:t?t.at:Date.now(),id:t?t.id:''};
      if(DB.live){ if(!(await DB.saveTournoi(data))){ d.querySelector('#te').textContent="Le tournoi n'a pas pu être enregistré."; return; } TOURNOIS=TOURNOIS.filter(x=>x.id!==data.id); TOURNOIS.push(data); }
      else { if(isNew) data.id='t'+Date.now(); S.tournois=[...(S.tournois||[]).filter(x=>x.id!==data.id),data]; const i=DEMO_TOURNOIS.findIndex(x=>x.id===data.id); if(i>=0) DEMO_TOURNOIS.splice(i,1); save(); }
      d.close(); toast(isNew?'Tournoi créé':'Tournoi mis à jour'); route(); };
    d.querySelector('#tdel')?.addEventListener('click',async()=>{ if(!confirmDel(d)) return;
      if(DB.live){ await DB.deleteTournoi(t); TOURNOIS=TOURNOIS.filter(x=>x!==t); } else { S.tournois=(S.tournois||[]).filter(x=>x.id!==t.id); const i=DEMO_TOURNOIS.indexOf(t); if(i>=0) DEMO_TOURNOIS.splice(i,1); save(); }
      d.close(); toast('Tournoi supprimé'); route(); });
  });
}
function confirmDel(d){ const b=d.querySelector('#tdel'); if(b.dataset.sure) return true; b.dataset.sure='1'; b.textContent='Confirmer la suppression'; return false; }
function tournoiList(id){
  const t=tournoisAll().find(x=>x.id===id); if(!t) return;
  const e=t.entries||{}, rows=(t.players||[]).map(u=>{ const p=u===myId()?S.me:PLAYERS.find(x=>x.id===u); return {u,name:(e[u]&&e[u].name)||(p&&p.name)||'',ig:(e[u]&&e[u].ig)||(p&&p.tags&&p.tags[t.game])||''}; });
  const txt=()=>rows.map((r,i)=>`${i+1}. ${r.name||'Joueur'}${r.ig?` · ${t.game} : ${r.ig}`:''}`).join('\n');
  const igTxt=r=>r.ig?`${esc(t.game)} : ${esc(r.ig)}`:'pseudo en jeu non renseigné';
  modal(`<h3>Inscrits · ${esc(t.title)}</h3><p class="muted">${rows.length} / ${+t.max||0} joueurs</p>
    ${rows.length?`<ol class="to-list">${rows.map((r,i)=>`<li><b>${esc(r.name||'Joueur')}</b><span class="muted" data-to-ig="${i}">${igTxt(r)}</span></li>`).join('')}</ol>`:'<p class="muted">Personne pour l\'instant.</p>'}
    <div class="dlg-actions">${rows.length?'<button class="btn btn-ghost" id="tcopy">Copier la liste</button>':''}<button class="btn" data-close>Fermer</button></div>`, d=>{
    d.querySelector('#tcopy')?.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(txt()); toast('Liste copiée'); }catch(err){} });
    // v7 — les pseudos en jeu des 13-17 ans ne sont pas dans le tournoi : la modération les lit à part (gametags)
    if(DB.live&&isAdmin()) rows.forEach((r,i)=>{ if(r.ig) return; DB.loadGameTags(r.u).then(tg=>{ const v=tg&&tg[t.game]; if(!v) return; r.ig=String(v).slice(0,40); const el=d.querySelector(`[data-to-ig="${i}"]`); if(el) el.innerHTML=igTxt(r); }); });
  });
}
document.addEventListener('click',e=>{
  const j=e.target.closest('[data-to-join]'); if(j){ joinTournoi(j.dataset.toJoin,true); return; }
  const l=e.target.closest('[data-to-leave]'); if(l){ joinTournoi(l.dataset.toLeave,false); return; }
  const ed=e.target.closest('[data-to-edit]'); if(ed){ editTournoi(ed.dataset.toEdit); return; }
  const li=e.target.closest('[data-to-list]'); if(li){ tournoiList(li.dataset.toList); return; }
});

/* ---- Aperçu sur l'accueil ---- */
function boardsTeaser(){
  if(!S.me) return '';
  const t=tournoisAll().find(x=>x.status==='open'&&x.date>Date.now()&&tournoiOpenTo(x)), an=annoncesAll().filter(a=>!isMine(a)).slice(0,t?2:3);
  const head=`<div class="dispo-head"><h3>Communauté</h3><a class="linkbtn" href="#/groupes">Tout voir</a></div>`;
  const go='<svg class="menu-go" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  if(!an.length&&!t) return `<section class="home-sec reveal board-teaser">${head}<div class="list-card pad"><p class="muted">Tu cherches des joueurs pour une partie précise ? Publie une annonce, par exemple « Je cherche 2 joueurs ${esc(S.me.games[0]||'Free Fire')} ce soir ».</p><div><a class="btn btn-sm btn-ac" href="#/groupes/annonces">Publier une annonce</a></div></div></section>`;
  return `<section class="home-sec reveal board-teaser">${head}<div class="list-card">
    ${t?`<a class="lc-row" href="#/groupes/tournois"><i class="menu-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8.5 20h7"/></svg></i><span class="lc-txt"><b>${esc(t.title)}</b><small><em>Tournoi</em> · ${esc(fmtDay(t.date))} · ${(t.players||[]).length}/${+t.max||0} inscrits</small></span>${go}</a>`:''}
    ${an.map(a=>{ const who=PLAYERS.find(p=>p.id===a.by), n=+a.need||1, when=(WHEN.find(w=>w[0]===a.when)||[,''])[1]; return `<a class="lc-row" href="#/groupes/annonces">${who?avatar(who,40):`<i class="menu-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS.profil}</svg></i>`}<span class="lc-txt"><b>${esc(who?who.name:(a.byName||'Joueur'))}</b><small>${when?`<em>${when}</em> · `:''}${esc(a.game)} · cherche ${n} joueur${n>1?'s':''}${a.rank?` · ${esc(a.rank)}`:''}</small></span>${go}</a>`; }).join('')}
  </div></section>`;
}

/* ---- « Tu rejouerais avec lui ? » ---- */
function rate(id,v){ if(S.ratings[id]===v) return; S.ratings[id]=v; save(); DB.rate(id,v); toast(v>0?'Merci ! Ça affine tes prochains matchs.':'Noté. Ce profil descendra dans tes matchs.'); }

/* ---- Partage de profil ---- */
function shareLink(name){ return location.href.split('#')[0]+'#/@'+encodeURIComponent(name); }
async function shareProfile(){
  const url=shareLink(S.me.name);
  shareOrCopy({title:'Mon profil Coopô',text:`Deviens mon mate sur Coopô : ${S.me.name}`,url},'Lien de ton profil copié');
}
