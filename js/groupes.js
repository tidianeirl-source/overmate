/* Coopô — js/groupes.js
   Groupes : création, invitations, discussion, page des groupes.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* =========================================================
   GROUPES : des salons permanents avec discussion en temps réel
   Firestore : groups/{id} = { name, desc, game, image, private, owner, mods[], members[], invited[], kicked[], ageGroup, at, lastAt }
               groups/{id}/messages/{id} = { from, text, at }
   - Rôles : créateur (admin), modérateurs, membres. Seuls les membres lisent les messages (règles Firestore).
   - 50 membres maximum par groupe, pour rester dans la formule gratuite de Firebase.
   - v7 — les groupes sont ouverts à tous les âges. Un adulte n'invite un 13-17 ans que s'ils sont mates (une invitation à la fois),
     et dans un groupe où il y a un 13-17 ans : pas de photo, pas de numéro de téléphone.
   ========================================================= */
const GROUP_MAX=50, GROUP_OWN_MAX=3;
let GROUPS=[];   // groupes visibles : les miens, ceux où je suis invité, les groupes publics
// Un 13-17 ans (autre que moi) fait-il partie du groupe ? (profils chargés seulement)
const gHasMinor = g => !!g && (g.members||[]).some(u=>{ if(u===myId()) return false; const p=gPlayer(u); return !!p&&minorP(p); });
const normG = g => { ['mods','members','invited','kicked'].forEach(k=>{ if(!Array.isArray(g[k])) g[k]=[]; }); g.name=String(g.name||'Groupe'); g.private=!!g.private; return g; };
const tsMs = v => v&&typeof v.toMillis==='function' ? v.toMillis() : (+v||0);
// v10 — ce qu'un message peut porter en plus : anciennes versions, date de modification, suppression, sticker
function msgExtra(o,m){ if(Array.isArray(m.hist)&&m.hist.length) o.hist=m.hist.filter(x=>typeof x==='string').slice(-20);
  if(m.reply&&typeof m.reply.id==='string'&&/^[A-Za-z0-9]{8,40}$/.test(m.reply.id)&&typeof m.reply.from==='string'&&m.reply.from.length<=128) o.reply={id:m.reply.id,from:m.reply.from};   // v13 — réponse à un message
  if(m.edited) o.edited=tsMs(m.edited)||1; if(m.del===true) o.del=true;
  if(m.call&&typeof m.call==='object'&&CALL_ST.includes(m.call.s)) o.call={k:m.call.k==='video'?'video':'audio',s:m.call.s,d:Math.max(0,Math.min(86400,Math.round(+m.call.d||0)))};   // v16 — ligne d'appel
  if(m.sticker&&typeof m.sticker.id==='string'&&/^[A-Za-z0-9]{8,40}$/.test(m.sticker.id)) o.sticker={id:m.sticker.id,n:Math.max(1,Math.min(30,+m.sticker.n||1))};
  if(m.re&&typeof m.re==='object'&&!Array.isArray(m.re)){ const re={}; let n=0;   // v14 — réactions { identifiant : emoji }
    for(const [k,v] of Object.entries(m.re)){ if(n>=60) break; if(/^[A-Za-z0-9_-]{1,128}$/.test(k)&&typeof v==='string'&&RX_OK.test(v)){ re[k]=v; n++; } } if(n) o.re=re; }
  return o; }
const gById = id => GROUPS.find(g=>g.id===id);
const gIn = g => !!g && g.members.includes(myId());
const gRole = (g,uid) => g.owner===uid?'admin':(g.mods||[]).includes(uid)?'mod':'';
const gCanMod = g => gIn(g) && !!gRole(g,myId());
const gUnread = g => gIn(g) && tsMs(g.lastAt) > ((S.gseen||{})[g.id]||0);
const gLoud = g => gUnread(g) && !rowMuted('g',g.id);   // v25 — un groupe aux notifications coupées ne fait plus de pastille
const gPlayer = uid => uid===myId() ? publicMe() : PLAYERS.find(p=>p.id===uid);
function gAvatar(g,size=48){ if(g.image&&g.ageGroup!=='minor'&&/^data:image\/(png|jpeg|webp);base64,/.test(g.image)) return `<img class="av g-av" src="${esc(g.image)}" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px">`;
  let h=0; for(const c of String(g.id)) h=(h*31+c.charCodeAt(0))%360;
  return `<span class="av g-av" aria-hidden="true" style="width:${size}px;height:${size}px;--h:${h};font-size:${Math.round(size*.36)}px">${esc((g.name||'?').slice(0,2).toUpperCase())}</span>`; }
const ROLE_TAG={ admin:'<em class="g-role admin">Admin</em>', mod:'<em class="g-role">Modo</em>' };

/* ---- L'onglet Groupes (séparé des messages privés) ----
   #/groupe : invitations, mes groupes, groupes publics, et le bouton « Créer un groupe »
   #/groupe/nouveau : la même page, avec la création d'un groupe ouverte
   #/groupe/{id} : la discussion du groupe
   Ordinateur : la colonne de gauche liste mes groupes (comme les mates dans Messages), le groupe ouvert est à droite.
   v20 — Téléphone : pas d'onglet Groupes ; mes groupes sont dans la liste des messages, avec les mates ; #/groupe s'ouvre par « Trouver un groupe ». */
const gMine = () => GROUPS.filter(gIn).sort((a,b)=>tsMs(b.lastAt||b.at)-tsMs(a.lastAt||a.at));
const gInvites = () => GROUPS.filter(g=>!gIn(g)&&(g.invited||[]).includes(myId()));
const gSig = () => [...gMine(),...gInvites()].map(g=>[g.id,tsMs(g.lastAt||g.at),gIn(g)?1:0,g.name,g.members.length,g.private?1:0,(g.image||'').length].join(':')).sort().join('|');   // v20 — pour savoir si mes groupes ont changé
const gPublic = () => GROUPS.filter(g=>!gIn(g)&&!g.private&&!(g.invited||[]).includes(myId())&&!(g.kicked||[]).includes(myId())&&!S.blocked.includes(g.owner)).sort((a,b)=>b.members.length-a.members.length);
const ADDMATE_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9.5" cy="8" r="3.5"/><path d="M3 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M19 7v6M16 10h6"/></svg>';
const FIND_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
// Colonne de gauche (ordinateur) : créer, trouver, puis mes groupes
function gSideInner(key){ const mine=gPinSort(gMine()), inv=gInvites().length;
  return `<h3>Groupes</h3>
    <a class="dm-row g-act g-act-new" href="#/groupe/nouveau"><span class="g-act-ico" aria-hidden="true">+</span><div><b>Créer un groupe</b><span class="muted">et ajouter tes mates</span></div></a>
    <a class="dm-row g-act${key==='home'?' on':''}" href="#/groupe"${key==='home'?' aria-current="page"':''}><span class="g-act-ico" aria-hidden="true">${FIND_SVG}</span><div><b>Trouver un groupe</b><span class="muted">${inv?`${inv} invitation${inv>1?'s':''} · `:''}groupes publics</span></div>${inv?`<span class="badge static">${inv}</span>`:''}</a>
    <h3>Mes groupes</h3>
    ${mine.length?mine.map(g=>{ const u=gUnread(g), on=key==='g:'+g.id;
      return `<a class="dm-row g-row${on?' on':''}${u?' unread':''}" href="#/groupe/${esc(g.id)}"${on?' aria-current="page"':''}>${gAvatar(g,36)}<div><b><span>${esc(g.name)}</span>${g.private?'<span class="g-lock" title="Groupe privé">'+LOCK_SVG+'</span>':''}${rowMarks('g',g.id)}</b><span class="muted">${u?'Nouveaux messages':`${esc(g.game||'Tous les jeux')} · ${g.members.length} membre${g.members.length>1?'s':''}`}</span></div>${u?'<span class="badge static" aria-label="Nouveaux messages">•</span>':''}</a>`; }).join('')
      :'<p class="muted dm-none">Tu n\'es dans aucun groupe pour l\'instant.</p>'}`; }
const gSide = key => `<nav class="dm-side g-side" id="g-side" aria-label="Groupes" data-key="${esc(key||'')}">${gSideInner(key||'')}</nav>`;
function gSideRefresh(){ const s=document.getElementById('g-side'); if(s&&s.offsetParent!==null){ const y=s.scrollTop; s.innerHTML=gSideInner(s.dataset.key||''); s.scrollTop=y; } }
const gInvRow = g => `<div class="chat-row g-inv">${gAvatar(g,52)}<div><b>${esc(g.name)}</b><span class="muted">${esc(g.game||'Tous les jeux')} · ${g.members.length} membre${g.members.length>1?'s':''}</span></div><span class="nact"><button class="btn btn-sm btn-ac" data-gjoin="${esc(g.id)}">Rejoindre</button><button class="btn btn-sm btn-ghost" data-gdecline="${esc(g.id)}">Refuser</button></span></div>`;
// Rejoindre (une invitation ou un groupe public) et refuser une invitation : sur la page des groupes, et dans la liste des messages (téléphone)
function gInvWire(root,after){ if(!root) return;
  root.querySelectorAll('[data-gjoin]').forEach(b=>b.onclick=async()=>{ b.disabled=true; if(await DB.joinGroup(b.dataset.gjoin)){ toast('Tu as rejoint le groupe'); location.hash='#/groupe/'+b.dataset.gjoin; } else b.disabled=false; });
  root.querySelectorAll('[data-gdecline]').forEach(b=>b.onclick=async()=>{ b.disabled=true; await DB.declineGroup(b.dataset.gdecline); renderNotifBadge(); after(); }); }
// La page des groupes (ordinateur : l'onglet Groupes ; téléphone : « Trouver un groupe », en bas de Messages)
function viewGroupsHome(openNew){
  if(dataPending()) return loadingView('Groupes');
  if(!S.me) return needProfile('Groupes');
  DB.stopGroup();
  if(openNew){ try{ history.replaceState(null,'','#/groupe'); }catch(e){} }   // l'adresse redevient #/groupe : le « + » rouvre la création à chaque clic
  const mine=gMine(), inv=gInvites(), pub=gPublic();
  app.innerHTML=`<div class="dm-shell g-shell">${gSide('home')}<div class="wrap page g-home">
    <div class="g-back">${backLink('#/messages','Messages')}</div>
    <div class="page-head g-top"><div><h2>Groupes</h2><p>Des salons pour discuter à plusieurs, par jeu ou entre amis.</p></div><button class="btn btn-ac" type="button" data-g-new>Créer un groupe</button></div>
    ${inv.length?`<h3 class="on-world g-h">Invitations</h3><div class="chat-list">${inv.map(gInvRow).join('')}</div>`:''}
    <section class="g-mine-sec"><h3 class="on-world g-h">Mes groupes</h3>
      ${mine.length?`<div class="sn-list">${gPinSort(mine).map(gRowSn).join('')}</div>`:`<div class="empty"><h3>Tu n'es dans aucun groupe</h3><p class="muted">Crée ton groupe et ajoutes-y tes mates, ou rejoins un groupe public.</p><button class="btn btn-ac" type="button" data-g-new>Créer un groupe</button></div>`}</section>
    <h3 class="on-world g-h">Groupes publics</h3>
    ${pub.length?`<div class="grid">${pub.slice(0,40).map((g,i)=>`<article class="mcard g-card" style="--i:${i};--c:var(--pk)"><div class="g-card-head">${gAvatar(g,56)}<div><h3>${esc(g.name)}</h3><span class="muted">${esc(g.game||'Tous les jeux')} · ${g.members.length}/${GROUP_MAX}</span></div></div>
      ${g.desc?`<p class="muted g-desc">${esc(g.desc)}</p>`:''}<div class="sq-act">${g.members.length>=GROUP_MAX?'<span class="muted">Complet</span>':`<button class="btn btn-sm btn-ac" data-gjoin="${esc(g.id)}">Rejoindre</button>`}</div></article>`).join('')}</div>`
      :'<p class="on-world g-pub-none">Aucun autre groupe public pour le moment.</p>'}
    <button class="btn btn-ac sn-fab" type="button" data-g-new aria-label="Créer un groupe" title="Créer un groupe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div></div>`;
  app.querySelectorAll('[data-g-new]').forEach(b=>b.onclick=()=>groupForm());
  gInvWire(app,()=>viewGroupsHome());
  dmFit();
  if(openNew) groupForm();
  else DB.loadGroups().then(ch=>{ if(ch&&location.hash==='#/groupe'&&!(dlg&&dlg.open)) viewGroupsHome(); });   // les groupes ont peut-être changé depuis le dernier passage
}
// Choisir des mates (création d'un groupe, ou « Ajouter des mates ») : des cases à cocher, et une recherche quand il y en a beaucoup
function matePickHtml(list,invited,checked){ invited=invited||[]; checked=checked||[];
  return `${list.length>6?'<input class="sn-search g-pick-q" id="g-pick-q" type="search" placeholder="Chercher un mate" autocomplete="off" aria-label="Chercher un mate">':''}
    <div class="g-members g-pick-list">${list.map(p=>{ const inv=invited.includes(p.id);
      return `<label class="nrow g-pick${plqOn(p)}" data-n="${esc(String(p.name||'').toLowerCase())}">${plq(p)}<input type="checkbox" value="${esc(p.id)}"${inv?' disabled':''}${checked.includes(p.id)&&!inv?' checked':''}>${avatar(p,40)}<div><b>${esc(p.name)}${modBadge(p)}</b>${inv?'<span class="muted">Déjà invité</span>':''}</div></label>`; }).join('')}
      <p class="muted g-pick-none" id="g-pick-none" hidden>Aucun mate à ce nom.</p></div>`; }
function matePickWire(d,onChange){ const q=d.querySelector('#g-pick-q'), picked=()=>[...d.querySelectorAll('.g-pick input:checked')].map(x=>x.value);
  if(q) q.oninput=()=>{ const t=q.value.trim().toLowerCase(); let n=0; d.querySelectorAll('.g-pick').forEach(l=>{ const ok=!t||l.dataset.n.includes(t); l.hidden=!ok; if(ok) n++; }); const none=d.querySelector('#g-pick-none'); if(none) none.hidden=n>0; };
  d.querySelectorAll('.g-pick input').forEach(i=>i.onchange=()=>onChange&&onChange(picked()));
  return picked; }
// Créer un groupe en 2 étapes (1 : le groupe, 2 : les mates à ajouter), ou modifier un groupe (g). v = ce qui a déjà été rempli.
function groupForm(g,v){
  const isNew=!g, minor=myGroupNow()==='minor';
  if(isNew && GROUPS.filter(x=>x.owner===myId()).length>=GROUP_OWN_MAX){ toast(`Tu peux créer ${GROUP_OWN_MAX} groupes au maximum.`); return; }
  v=v||{ name:g?g.name:'', desc:g?g.desc||'':'', game:g?g.game||'':'', image:g?g.image||'':'', private:g?!!g.private:false, picks:[] };
  let image=v.image||'';
  const games=[...new Set([...(S.me.games||[]),...GAMES])];
  modal(`${isNew?'<p class="g-step">Étape 1 sur 2 · Le groupe</p>':''}<h3>${isNew?'Créer un groupe':'Modifier le groupe'}</h3><div class="form" style="margin-top:12px">
    <div class="field"><label for="g-n">Nom du groupe</label><input id="g-n" type="text" maxlength="40" value="${esc(v.name)}" placeholder="ex. Les lions de Free Fire"></div>
    ${minor?'':`<div class="field"><span class="lbl">Image (facultatif)</span><div class="g-img-row"><span id="g-prev">${gAvatar({id:g?g.id:'nouveau',name:v.name||'?',image},56)}</span><label class="btn btn-sm" for="g-img">Choisir une image</label><input id="g-img" type="file" accept="image/*" hidden>${image?'<button class="btn btn-sm btn-ghost" type="button" id="g-noimg">Retirer</button>':''}</div></div>`}
    <div class="field"><label for="g-g">Jeu associé</label><select id="g-g"><option value="">Tous les jeux</option>${games.map(x=>`<option value="${esc(x)}" ${v.game===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
    <div class="field"><label for="g-d">Description (facultatif)</label><textarea id="g-d" rows="3" maxlength="300" placeholder="De quoi parle-t-on ici ? Les règles du groupe…">${esc(v.desc)}</textarea></div>
    <div class="field"><span class="lbl">Qui peut entrer ?</span><div class="radio-list"><label><input type="radio" name="g-p" value="0" ${v.private?'':'checked'}> Public : tout le monde peut le trouver et le rejoindre</label><label><input type="radio" name="g-p" value="1" ${v.private?'checked':''}> Privé : seulement les mates que tu ajoutes</label></div></div>
    <p class="ferr" id="g-e" role="alert"></p></div>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" id="g-ok">${isNew?'Suivant : ajouter des mates':'Enregistrer'}</button></div>`, d=>{
    const fi=d.querySelector('#g-img'); if(fi) fi.onchange=()=>{ const f=fi.files&&fi.files[0]; if(!f||!f.type.startsWith('image/')) return; const img=new Image(), url=URL.createObjectURL(f);
      img.onload=()=>{ const c=document.createElement('canvas'); c.width=c.height=160; const x=c.getContext('2d'), m=Math.min(img.width,img.height); x.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,160,160);
        image=c.toDataURL('image/jpeg',.7); URL.revokeObjectURL(url); d.querySelector('#g-prev').innerHTML=gAvatar({id:'x',name:'?',image},56); }; img.src=url; };
    const ni=d.querySelector('#g-noimg'); if(ni) ni.onclick=()=>{ image=''; d.querySelector('#g-prev').innerHTML=gAvatar({id:g?g.id:'nouveau',name:v.name||'?',image:''},56); ni.remove(); };
    d.querySelector('#g-ok').onclick=async ev=>{ const b=ev.currentTarget, err=d.querySelector('#g-e'), name=d.querySelector('#g-n').value.trim().replace(/\s+/g,' ');
      if(name.length<3){ err.textContent='Donne un nom d\'au moins 3 caractères à ton groupe.'; return; }
      if(hasPhone(name)||hasLink(name)){ err.textContent='Pas de numéro ni de lien dans le nom du groupe.'; return; }
      if(minor&&hasPhone(d.querySelector('#g-d').value)){ err.textContent='Pour ta sécurité, pas de numéro de téléphone dans la description.'; return; }
      const data={ name, desc:d.querySelector('#g-d').value.trim().slice(0,300), game:d.querySelector('#g-g').value, image:minor?'':image, private:d.querySelector('[name=g-p]:checked').value==='1' };
      if(isNew){ groupFormMates({...data,picks:v.picks||[]}); return; }   // étape 2 : les mates
      b.disabled=true;
      if(await DB.updateGroup(g.id,data)){ d.close(); toast('Groupe modifié'); route(); } else { b.disabled=false; err.textContent='Les changements n\'ont pas pu être enregistrés.'; } }; }); }
// Étape 2 de la création : cocher les mates. Ils reçoivent une invitation et entrent dans le groupe en un clic.
function groupFormMates(v){
  const mates=matesList().slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr'));
  modal(`<p class="g-step">Étape 2 sur 2 · Les mates</p><h3>Ajoute tes mates</h3>
    <p class="muted">${mates.length?`Coche les mates à mettre dans « ${esc(v.name)} ». Ils reçoivent une invitation et rejoignent le groupe en un clic.`:'Tu n\'as pas encore de mates. Crée le groupe maintenant : tu pourras en ajouter plus tard avec le bouton « Ajouter des mates » du groupe.'}</p>
    ${mates.length?matePickHtml(mates,[],v.picks):`<p><a class="btn btn-sm btn-ghost" href="#/matchs" data-close>Trouver des mates</a></p>`}
    <p class="ferr" id="g-e" role="alert"></p>
    <div class="dlg-actions"><button class="btn btn-ghost" type="button" id="g-back">Retour</button><button class="btn btn-ac" type="button" id="g-ok">Créer le groupe</button></div>`, d=>{
    const ok=d.querySelector('#g-ok'), lbl=ids=>{ v.picks=ids; ok.textContent=ids.length?`Créer le groupe et ajouter ${ids.length} mate${ids.length>1?'s':''}`:'Créer le groupe'; };
    matePickWire(d,lbl); lbl((v.picks||[]).filter(id=>mates.some(p=>p.id===id)));
    d.querySelector('#g-back').onclick=()=>groupForm(null,v);
    ok.onclick=async()=>{ ok.disabled=true; ok.textContent='Création du groupe…';
      const {picks,...data}=v, id=await DB.createGroup(data);
      if(!id){ ok.disabled=false; lbl(v.picks); d.querySelector('#g-e').textContent='Le groupe n\'a pas pu être créé. Vérifie ta connexion et réessaie.'; return; }
      let n=0; if(picks.length){ ok.textContent='Envoi des invitations…'; n=await DB.inviteToGroup(id,picks.slice(0,GROUP_MAX-1)); }
      d.close(); toast(!picks.length?'Groupe créé':n===picks.length?`Groupe créé · ${n} mate${n>1?'s':''} invité${n>1?'s':''}`:`Groupe créé · ${n} invitation${n>1?'s':''} sur ${picks.length} envoyée${n>1?'s':''}`,3500);
      location.hash='#/groupe/'+id; }; }); }
// La page d'un groupe : discussion en temps réel (sans id : la page de l'onglet Groupes)
function viewGroup(id){ EDIT=null; chatMotif();
  if(!id||id==='nouveau') return viewGroupsHome(id==='nouveau');
  if(dataPending()) return loadingView('Groupe');
  if(!S.me) return needProfile('Groupes');
  const g=gById(id);
  if(!g){ app.innerHTML=`<div class="wrap page"><div class="empty"><h3>Ce groupe n'est pas disponible</h3><p class="muted">Il a peut-être été supprimé, ou il est privé.</p><a class="btn" href="#/groupe">Voir les groupes</a></div></div>`;
    if(!viewGroup._tried){ viewGroup._tried=true; DB.loadGroups(true).then(()=>{ if(location.hash==='#/groupe/'+id) route(); }); } return; }
  viewGroup._tried=false;
  if(!gIn(g)){ const invited=(g.invited||[]).includes(myId());
    app.innerHTML=`<div class="dm-shell g-shell">${gSide('')}<div class="wrap page g-home g-join-page">${backLink('#/groupe','Groupes')}<section class="panel g-join">${gAvatar(g,88)}<h2>${esc(g.name)}</h2><p class="muted">${esc(g.game||'Tous les jeux')} · ${g.members.length} membre${g.members.length>1?'s':''} · ${g.private?'privé':'public'}</p>${g.desc?`<p>${esc(g.desc)}</p>`:''}
      ${(g.kicked||[]).includes(myId())?'<p class="muted">Tu ne peux plus rejoindre ce groupe.</p>':g.members.length>=GROUP_MAX?'<p class="muted">Ce groupe est complet.</p>':(!g.private||invited)?'<button class="btn btn-ac" id="gjoin">Rejoindre le groupe</button>':'<p class="muted">Ce groupe est privé : il faut une invitation.</p>'}</section></div></div>`;
    dmFit();
    document.getElementById('gjoin')?.addEventListener('click',async ev=>{ ev.currentTarget.disabled=true; if(await DB.joinGroup(id)){ toast('Tu as rejoint le groupe'); route(); } else ev.currentTarget.disabled=false; }); return; }
  (S.gseen=S.gseen||{})[id]=Date.now(); save(); renderNotifBadge();
  app.innerHTML=`<div class="dm-shell g-shell">${gSide('g:'+id)}<div class="wrap page chat-page"><div class="chat-head">${backLink('#/messages','Messages')}<button class="chat-who g-who" type="button" id="ginfo">${gAvatar(g,44)}<div><b>${esc(g.name)}</b><span class="muted" style="font-size:12px">${g.members.length} membre${g.members.length>1?'s':''} · infos</span></div></button>
      ${g.members.length<GROUP_MAX?`<div class="chat-calls"><button class="btn btn-ac g-add-btn" type="button" id="g-add" aria-label="Ajouter des mates" title="Ajouter des mates">${ADDMATE_SVG}<span>Ajouter des mates</span></button></div>`:''}</div>
    <div class="g-chans" id="g-chans">${gChansHTML(g)}</div>
    <div class="chat-box" id="chatbox"><p class="muted" style="margin:auto">Chargement des messages…</p></div>${typingHTML()}${qrHTML()}
    ${composerHTML('Message au groupe…',!gHasMinor(g))}${cpanelHTML()}</div></div>`;
  gChansWire(id);
  dmFit(); document.getElementById('ginfo').onclick=()=>groupInfo(id);
  document.getElementById('g-add')?.addEventListener('click',()=>groupInvite(id));
  const sendG=(text,voice,photo,sticker)=>{ const rp=takeReply('g',id); return DB.queueSend(()=>DB.sendGroupMessage(id,text,voice,photo,sticker,rp,gChan(gById(id)))); };   // v11 — un message par seconde au plus, dans l'ordre ; v13 — avec la réponse en cours
  const noMedia=()=>{ document.getElementById('photobtn')?.remove(); document.getElementById('cambtn')?.remove(); CP.stk=false; if(CP.open) cpRender(); cpSync(); qrUpdate(); };   // il y a un 13-17 ans dans le groupe
  photoWire(ph=>{ if(gHasMinor(gById(id))){ toast('Pas de photo dans un groupe où il y a des 13-17 ans.',3500); noMedia(); return; }
    const pid=newId(); PHOTOS[pid]=ph.data; return sendG(PHOTO_TEXT,null,{id:pid,w:ph.w,h:ph.h}); });
  document.getElementById('micbtn')?.addEventListener('click',()=>recordVoice(v=>{ const vid=newId(); VOICES[vid]=v.data; sendG(VOICE_TEXT,{id:vid,dur:v.dur,...(v.w?{w:v.w}:{})}); }));
  cpWire(st=>{ if(gHasMinor(gById(id))){ toast('Pas de sticker dans un groupe où il y a des 13-17 ans.',3500); noMedia(); return; } sendG(STICKER_TEXT,null,null,st); },!gHasMinor(g));
  try{ const cb=document.getElementById('chatbox'); if(cb&&'ResizeObserver' in window) new ResizeObserver(()=>{ cb.scrollTop=cb.scrollHeight; }).observe(cb); }catch(e){}
  document.getElementById('chatform').addEventListener('submit',e=>{ e.preventDefault(); const i=document.getElementById('chatin'), t=i.value.trim(); if(!t) return;
    if(myGroupNow()==='minor'&&hasPhone(t)){ toast('Pour ta sécurité, les numéros de téléphone ne peuvent pas être envoyés ici.'); return; }
    if(gHasMinor(gById(id))&&hasPhone(t)){ toast('Il y a des 13-17 ans dans ce groupe : les numéros de téléphone ne peuvent pas être envoyés ici.',3500); return; }
    if(submitEdit(t)) return;   // c'était une modification
    i.value=''; DB._typ=null; sendG(t); });
  DB.fetchPlayers(g.members).then(ch=>{ if(location.hash!=='#/groupe/'+id) return; if(gHasMinor(gById(id))) noMedia(); if(ch) renderGroupChat(id); }).catch(()=>{});
  let lastId=null;
  DB.listenGroup(id,()=>{ if(location.hash==='#/groupe/'+id){ (S.gseen=S.gseen||{})[id]=Date.now(); const lm=(GMSGS[id]||[]).slice(-1)[0]; if(lm&&lm.from!==myId()&&lm.id!==lastId) typingClear(lm.from); lastId=lm?lm.id:null; renderGroupChat(id); } });
  // v15 — « Vu par… » et « écrit… »
  document.getElementById('chatin').addEventListener('input',e=>{ if(EDIT) return; DB.typing('g',id,e.target.value.trim()?'w':''); });
  DB.listenMeta('g',id,chg=>{ if(location.hash!=='#/groupe/'+id) return; if(chg) renderGroupChat(id); else seenMark('g',id); typingRender(); });
}
let GMSGS={};   // messages du groupe ouvert
/* ---- v28 — Salons dans un groupe, façon Discord (#général, #ranked…) ----
   Le groupe garde ses salons dans channels = { c1:'ranked', c2:'tournois', … } : 8 salons au plus, créés par le créateur du groupe.
   Un message porte ch = l'identifiant de son salon ; sans ch (tous les anciens messages), il est dans #général.
   Si un salon est supprimé, ses messages ne sont pas effacés : ils reviennent dans #général (sa case reste, vide : channels.c1 = '').
   Règles Firebase : v15 (le champ ch d'un message doit être un salon du groupe). */
const CHAN_MAX=8, CHAN_IDS=['c1','c2','c3','c4','c5','c6','c7','c8'], GCH={};   // GCH[groupe] = le salon ouvert ('' = #général)
const chanName = v => String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,20);
const gChans = g => { const c=g&&g.channels&&typeof g.channels==='object'&&!Array.isArray(g.channels)?g.channels:{}; return CHAN_IDS.filter(k=>typeof c[k]==='string'&&chanName(c[k])).map(k=>[k,chanName(c[k])]); };
const gChan = g => { const cur=g?GCH[g.id]||'':''; return cur&&gChans(g).some(c=>c[0]===cur)?cur:''; };   // le salon ouvert, s'il existe toujours
const gMsgChan = (g,m) => m.ch&&gChans(g).some(c=>c[0]===m.ch)?m.ch:'';   // un message d'un salon supprimé revient dans #général
function gChansHTML(g){ const cs=gChans(g), cur=gChan(g), admin=g.owner===myId(); if(!cs.length&&!admin) return '';
  const chip=(k,l)=>`<button type="button" class="chip g-chan" data-chan="${k}" aria-pressed="${cur===k}"><span aria-hidden="true">#</span>${esc(l)}</button>`;
  return `<div class="g-chans-in" role="group" aria-label="Salons du groupe">${cs.length?chip('','général')+cs.map(c=>chip(c[0],c[1])).join(''):''}${admin?`<button type="button" class="chip g-chan-edit" id="g-chan-edit" aria-label="${cs.length?'Gérer les salons':'Créer des salons'}">${cs.length?'Gérer':'+ Créer des salons'}</button>`:''}</div>`; }
function gChansWire(id){ const bar=document.getElementById('g-chans'); if(!bar) return;
  bar.onclick=e=>{ const g=gById(id); if(!g) return; if(e.target.closest('#g-chan-edit')){ gChansDialog(id); return; }
    const b=e.target.closest('[data-chan]'); if(!b) return; GCH[id]=b.dataset.chan; bar.innerHTML=gChansHTML(g); endReply&&endReply(); renderGroupChat(id); const box=document.getElementById('chatbox'); if(box) box.scrollTop=box.scrollHeight;
    const i=document.getElementById('chatin'); if(i) i.placeholder=gChan(g)?`Message dans #${gChans(g).find(c=>c[0]===gChan(g))[1]}…`:'Message au groupe…'; }; }
function gChansRefresh(id){ const bar=document.getElementById('g-chans'), g=gById(id); if(bar&&g&&location.hash==='#/groupe/'+id){ bar.innerHTML=gChansHTML(g); renderGroupChat(id); } }
// Créer, renommer, supprimer des salons (créateur du groupe)
function gChansDialog(id){ const g=gById(id); if(!g||g.owner!==myId()) return; const cs=gChans(g);
  modal(`<h3>Salons du groupe</h3><p class="muted">Des salons pour ranger les discussions, comme sur Discord. #général existe toujours. ${CHAN_MAX} salons au plus.</p>
    <div class="g-chan-list"><div class="g-chan-row"><span class="g-chan-hash">#</span><b>général</b><span class="muted">par défaut</span></div>
      ${cs.map(c=>`<div class="g-chan-row"><span class="g-chan-hash">#</span><input type="text" data-chan-name="${c[0]}" value="${esc(c[1])}" maxlength="20" autocomplete="off" aria-label="Nom du salon ${esc(c[1])}"><button type="button" class="linkbtn" data-chan-del="${c[0]}">Supprimer</button></div>`).join('')}</div>
    ${cs.length<CHAN_MAX?`<div class="g-chan-new"><span class="g-chan-hash">#</span><input type="text" id="g-chan-new" maxlength="20" placeholder="nouveau-salon (ex. ranked)" autocomplete="off" aria-label="Nom du nouveau salon"></div>`:''}
    <p class="muted g-chan-note">Lettres, chiffres et tirets. Si tu supprimes un salon, ses messages ne sont pas effacés : ils reviennent dans #général.</p>
    <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-ac" type="button" id="g-chan-ok">Enregistrer</button></div>`, d=>{
    const gone=new Set();
    d.querySelectorAll('[data-chan-del]').forEach(b=>b.onclick=()=>{ if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Confirmer ?'; return; } gone.add(b.dataset.chanDel); b.closest('.g-chan-row').remove(); });
    d.querySelector('#g-chan-ok').onclick=async ev=>{ const out={}, seen=new Set(['general']), old=g.channels&&typeof g.channels==='object'?g.channels:{};
      // un salon supprimé garde sa case, vide : elle n'est pas redonnée à un nouveau salon tant qu'il en reste de libres (sinon ses anciens messages y réapparaîtraient)
      CHAN_IDS.forEach(k=>{ if(old[k]===''||gone.has(k)) out[k]=''; });
      for(const i of d.querySelectorAll('[data-chan-name]')){ const k=i.dataset.chanName, n=chanName(i.value); if(gone.has(k)) continue; if(!n||seen.has(n)){ toast(n?`Deux salons ne peuvent pas s'appeler #${n}.`:'Un salon doit avoir un nom.',3000); i.focus(); return; } seen.add(n); out[k]=n; }
      const nw=d.querySelector('#g-chan-new'), nn=nw?chanName(nw.value):'';
      if(nw&&nw.value.trim()&&!nn){ toast('Utilise des lettres ou des chiffres pour le nom du salon.',3000); nw.focus(); return; }
      if(nn){ if(seen.has(nn)){ toast(`Le salon #${nn} existe déjà.`,3000); nw.focus(); return; } const free=CHAN_IDS.find(k=>!(k in out))||CHAN_IDS.find(k=>out[k]===''&&!gone.has(k))||CHAN_IDS.find(k=>out[k]===''); if(!free){ toast(`${CHAN_MAX} salons au plus.`); return; } out[free]=nn; }
      ev.currentTarget.disabled=true;
      if(await DB.setGroupChannels(id,out)){ d.close(); toast('Salons enregistrés'); gChansRefresh(id); } else ev.currentTarget.disabled=false; }; }); }
function renderGroupChat(id){ const box=document.getElementById('chatbox'), g=gById(id); if(!box||!g) return; setTimeout(photoWatch,0); setTimeout(stickerWatch,0); const me=myId(), cur=gChan(g), msgs=(GMSGS[id]||[]).filter(m=>!S.blocked.includes(m.from)&&gMsgChan(g,m)===cur), was=bubbleSeen(box);
  const keep=chatKeep(box,msgs);   // v14 — voir renderChat
  // v15 — « Vu par… » : sous mon dernier message, le nombre de membres qui l'ont lu
  let seenK=-1, seenTag=''; if(META&&META.key==='g:'+id){ for(let k=msgs.length-1;k>=0;k--){ if(msgs[k].from===me){ if(!msgs[k].del) seenK=k; break; } }
    if(seenK>=0){ const others=g.members.filter(u=>u!==me), n=others.filter(u=>(META.seen[u]||0)>=msgs[seenK].at).length;
      seenTag=n?` · <span class="seen-tag">${others.length===1?'Vu':n>=others.length?'Vu par tous':'Vu par '+n}</span>`:''; } }
  box.innerHTML = msgs.length ? msgs.map((m,k)=>{ const mine=m.from===me, p=gPlayer(m.from), same=k>0&&msgs[k-1].from===m.from&&m.at-msgs[k-1].at<5*60e3, role=gRole(g,m.from);
      return `<div class="gmsg${mine?' me':''}${same?' same':''}">${mine?'':(same?'<i class="g-gap"></i>':(p?`<a href="#/joueur/${esc(m.from)}">${avatar(p,32)}</a>`:'<span class="av" style="width:32px;height:32px;--h:220">?</span>'))}<div>${same||mine?'':`<small class="g-from${role?' r-'+role:''}">${p?np(p):'Ancien membre'}${ROLE_TAG[role]||''}</small>`}
        <div class="bubble${mine?' me':''}${m.del?' del':''}${bubTxt(m)}"${m.id?` data-mid="${esc(m.id)}"`:''}${m.id&&!m.del?` data-msg="g|${esc(id)}|${esc(m.id)}"`:''}${mine&&m.id&&!m.del?` data-own="g|${esc(id)}|${esc(m.id)}"`:''}>${replyQuote(m,'g',id)}${msgBody(m,'g',id,mine)}<small>${msgMeta(m,mine,'g',id,k===seenK?seenTag:'')}</small>${reactsHTML(m,'g',id)}</div></div></div>`; }).join('')
    : `<div class="chat-empty"><p class="muted">Le groupe est tout neuf. ${g.members.length<2?'Ajoute tes mates, puis lance la discussion 👋':'Lance la discussion 👋'}</p>${g.members.length<2&&g.members.length<GROUP_MAX?`<button class="btn btn-ac" type="button" data-g-add>${ADDMATE_SVG} Ajouter des mates</button>`:''}${(g.invited||[]).length?`<p class="muted">${g.invited.length} invitation${g.invited.length>1?'s':''} en attente.</p>`:''}</div>`;
  bubbleNew(box,was);
  box.scrollTop=keep==null?box.scrollHeight:keep;
  { const lm=msgs[msgs.length-1]; QR.key='g:'+id; QR.last=lm?{id:lm.id,at:lm.at,mine:lm.from===me,del:!!lm.del}:null; qrUpdate(); }
  box.querySelector('[data-g-add]')?.addEventListener('click',()=>groupInvite(id));
  seenMark('g',id);
}
// Infos du groupe : membres, rôles, invitations, réglages
function groupInfo(id){ const g=gById(id); if(!g) return; const me=myId(), role=gRole(g,me), admin=role==='admin';
  const order=u=>u===g.owner?0:(g.mods||[]).includes(u)?1:2, mem=[...g.members].sort((a,b)=>order(a)-order(b));
  modal(`<div class="g-info-head">${gAvatar(g,64)}<div><h3>${esc(g.name)}</h3><span class="muted">${esc(g.game||'Tous les jeux')} · ${g.private?'privé':'public'} · ${g.members.length}/${GROUP_MAX} membres</span></div></div>
    ${g.desc?`<p class="g-desc">${esc(g.desc)}</p>`:''}
    <div class="g-acts">${g.members.length<GROUP_MAX?'<button class="btn btn-sm btn-ac" id="g-invite">Ajouter des mates</button>':''}${admin?'<button class="btn btn-sm" id="g-edit">Modifier</button>':''}</div>
    ${(g.invited||[]).length?`<p class="muted g-wait">${g.invited.length} invitation${g.invited.length>1?'s':''} en attente : ${g.invited.slice(0,6).map(u=>{ const p=gPlayer(u); return esc(p?p.name:'un joueur'); }).join(', ')}${g.invited.length>6?'…':''}</p>`:''}
    <b class="g-sub">Membres</b><div class="g-members">${mem.map(u=>{ const p=gPlayer(u), r=gRole(g,u), isMe=u===me;
      const acts = isMe||u===g.owner ? '' : admin ? `<button class="linkbtn" data-gmod="${esc(u)}">${r==='mod'?'Retirer modo':'Nommer modo'}</button><button class="linkbtn" data-gkick="${esc(u)}">Retirer</button>` : (role==='mod'&&!r) ? `<button class="linkbtn" data-gkick="${esc(u)}">Retirer</button>` : '';
      return `<div class="nrow${p?plqOn(p):''}">${p?plq(p)+avatar(p,40):'<span class="av" style="width:40px;height:40px;--h:220">?</span>'}<div><b${r?` class="r-${r}"`:''}><span class="r-name">${p?esc(p.name):'Joueur'}</span>${ROLE_TAG[r]||''}${isMe?' <span class="muted">(toi)</span>':''}</b>${p&&!isMe?playLine(p):''}${p&&!isMe?`<a class="muted" href="#/joueur/${esc(u)}" data-close>Voir le profil</a>`:''}</div><div class="nact">${acts}</div></div>`; }).join('')}</div>
    <div class="dlg-actions">${admin?'<button class="btn btn-danger" id="g-del">Supprimer le groupe</button>':'<button class="btn btn-ghost" id="g-leave">Quitter le groupe</button>'}<button class="btn" data-close>Fermer</button></div>`, d=>{
    const re=()=>{ if(location.hash==='#/groupe/'+id){ route(); groupInfo(id); } };
    d.querySelector('#g-invite')?.addEventListener('click',()=>groupInvite(id,true));
    d.querySelector('#g-edit')?.addEventListener('click',()=>groupForm(g));
    d.querySelectorAll('[data-gkick]').forEach(b=>b.onclick=async()=>{ if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Confirmer ?'; return; } b.disabled=true; if(await DB.kickFromGroup(id,b.dataset.gkick)){ toast('Membre retiré du groupe'); re(); } else b.disabled=false; });
    d.querySelectorAll('[data-gmod]').forEach(b=>b.onclick=async()=>{ b.disabled=true; const on=!(g.mods||[]).includes(b.dataset.gmod); if(await DB.setGroupMod(id,b.dataset.gmod,on)){ toast(on?'Modérateur nommé':'Modérateur retiré'); re(); } else b.disabled=false; });
    d.querySelector('#g-leave')?.addEventListener('click',async ev=>{ const b=ev.currentTarget; if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Confirmer : quitter'; return; } b.disabled=true; if(await DB.leaveGroup(id)){ d.close(); toast('Tu as quitté le groupe'); location.hash=navPhone()?'#/messages':'#/groupe'; } else b.disabled=false; });
    d.querySelector('#g-del')?.addEventListener('click',async ev=>{ const b=ev.currentTarget; if(!b.dataset.sure){ b.dataset.sure=1; b.textContent='Confirmer : tout supprimer'; return; } b.disabled=true; b.textContent='Suppression…'; if(await DB.deleteGroup(id)){ d.close(); toast('Groupe supprimé'); location.hash=navPhone()?'#/messages':'#/groupe'; } else { b.disabled=false; b.textContent='Supprimer le groupe'; } }); }); }
// « Ajouter des mates » : les mates cochés reçoivent une invitation et entrent dans le groupe en un clic (fromInfo : ouvert depuis les infos du groupe)
function groupInvite(id,fromInfo){ const g=gById(id); if(!g) return; const can=matesList().filter(p=>!g.members.includes(p.id)&&!(g.kicked||[]).includes(p.id)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr')), left=GROUP_MAX-g.members.length;
  const free=can.filter(p=>!(g.invited||[]).includes(p.id));
  modal(`<h3>Ajouter des mates</h3><p class="muted">${free.length?`Coche les mates à ajouter à « ${esc(g.name)} ». Ils reçoivent une invitation et rejoignent le groupe en un clic.`:can.length?'Tes autres mates ont déjà reçu une invitation : ils entrent dans le groupe dès qu\'ils l\'acceptent.':'Tous tes mates sont déjà dans ce groupe, ou tu n\'as pas encore de mates.'}</p>
    ${can.length?matePickHtml(can,g.invited||[],[]):`<p><a class="btn btn-sm btn-ghost" href="#/matchs" data-close>Trouver des mates</a></p>`}
    <div class="dlg-actions"><button class="btn btn-ghost" type="button" id="g-back">${fromInfo?'Retour':'Fermer'}</button>${free.length?'<button class="btn btn-ac" type="button" id="g-send" disabled>Ajouter</button>':''}</div>`, d=>{
    const send=d.querySelector('#g-send'), picked=matePickWire(d,ids=>{ if(!send) return; send.disabled=!ids.length; send.textContent=ids.length?`Ajouter ${ids.length} mate${ids.length>1?'s':''}`:'Ajouter'; });
    d.querySelector('#g-back').onclick=()=>fromInfo?groupInfo(id):d.close();
    send?.addEventListener('click',async()=>{ const ids=picked().slice(0,Math.max(0,left)); if(!ids.length){ toast('Coche au moins un mate'); return; }
      send.disabled=true; send.textContent='Envoi…'; const n=await DB.inviteToGroup(id,ids);
      toast(n?`${n} mate${n>1?'s':''} invité${n>1?'s':''} : ${n>1?'ils rejoignent':'il rejoint'} le groupe dès qu'${n>1?'ils acceptent':'il accepte'}`:'Les invitations n\'ont pas pu partir',3500);
      if(fromInfo) groupInfo(id); else { d.close(); if(location.hash==='#/groupe/'+id) renderGroupChat(id); } }); }); }

/* ---- v27 — Onglet « Communautés » (Communauté › Communautés) : découvrir les groupes publics, disposé comme la page Découverte de Root ----
   En haut : des catégories (les jeux des groupes) et une recherche. Puis un grand titre, les plus grandes communautés, un tri, et une grille de cartes :
   une bannière, la photo du groupe à cheval dessus, le nom, « jeu · membres », la description.
   Une communauté = un groupe public qui existe déjà : rien de nouveau n'est enregistré, et les groupes listés sont exactement ceux de gPublic().
   La bannière est dessinée à partir du nom du groupe (les groupes n'ont pas d'image de bannière).
   PLUS TARD (boosts) : une décoration animée de bannière pourra se poser dans <i class="cm-deco" data-deco="…"> — voir .cm-deco dans le bloc de styles « coopo-commu ». */
const CM={ cat:'', q:'', sort:'members' };
const cmHue = g => { let h=0; for(const c of String(g.name||g.id)) h=(h*33+c.charCodeAt(0))%360; return h; };
const cmGame = g => String(g.game||'').trim();
const cmMeta = g => `${esc(cmGame(g)||'Tous les jeux')} · ${g.members.length} membre${g.members.length>1?'s':''}`;
function cmList(){ const q=CM.q.trim().toLowerCase(); let l=gPublic();
  if(CM.cat==='*') { const top=cmCats().map(c=>c[0]); l=l.filter(g=>!top.includes(cmGame(g))); } else if(CM.cat) l=l.filter(g=>cmGame(g)===CM.cat);
  if(q) l=l.filter(g=>[g.name,g.game,g.desc].some(x=>String(x||'').toLowerCase().includes(q)));
  return CM.sort==='active' ? l.sort((a,b)=>tsMs(b.lastAt||b.at)-tsMs(a.lastAt||a.at)) : l.sort((a,b)=>b.members.length-a.members.length||tsMs(b.lastAt||b.at)-tsMs(a.lastAt||a.at)); }
// les catégories : les jeux les plus présents parmi les groupes publics (6 au plus)
function cmCats(){ const n={}; gPublic().forEach(g=>{ const k=cmGame(g); if(k) n[k]=(n[k]||0)+1; }); return Object.entries(n).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,6); }
const cmCard = (g,mine) => `<article class="cm-card" data-cm="${esc(g.id)}" tabindex="0" role="button" aria-label="${esc(g.name)}, ${cmMeta(g)}">
    <div class="cm-banner" style="--h:${cmHue(g)}"><i class="cm-deco" data-deco="" aria-hidden="true"></i></div>
    <div class="cm-body"><span class="cm-av">${gAvatar(g,52)}</span>${mine?'<em class="cm-in">Membre</em>':''}
      <h3>${esc(g.name)}</h3><span class="cm-meta">${cmMeta(g)}</span>${g.desc?`<p class="cm-desc">${esc(g.desc)}</p>`:''}</div></article>`;
function cmGridHTML(){ const l=cmList();
  return l.length ? l.slice(0,60).map(g=>cmCard(g)).join('')
    : `<div class="empty cm-none"><h3>${gPublic().length?'Aucune communauté ne correspond':'Pas encore de communauté publique'}</h3><p class="muted">${gPublic().length?'Essaie une autre catégorie ou un autre mot.':'Crée la première : un groupe public apparaît ici, et tout le monde peut le rejoindre.'}</p>${S.me?'<button class="btn btn-ac" type="button" data-g-new>Créer une communauté</button>':''}</div>`; }
function viewCommus(){
  const me=S.me, cats=cmCats(), pub=gPublic(), mine=me?gMine():[], top=[...pub].sort((a,b)=>b.members.length-a.members.length).slice(0,3);
  if(CM.cat&&CM.cat!=='*'&&!cats.some(c=>c[0]===CM.cat)) CM.cat='';
  const others=pub.some(g=>!cats.some(c=>c[0]===cmGame(g)));
  const chip=(k,l)=>`<button type="button" class="chip" data-cm-cat="${esc(k)}" aria-pressed="${CM.cat===k}">${esc(l)}</button>`;
  app.innerHTML=`<div class="wrap page cm-page">${boardHead('communautes','Des groupes publics à rejoindre, par jeu ou par envie.',me?'<button class="btn btn-ac" type="button" data-g-new>Créer une communauté</button>':'<a class="btn btn-ac" href="#/inscription">Créer mon compte</a>')}
    <div class="cm-bar"><div class="cm-cats" role="group" aria-label="Catégories">${chip('','Toutes')}${cats.map(c=>chip(c[0],c[0])).join('')}${others&&cats.length?chip('*','Autres'):''}</div>
      <label class="cm-search"><span class="sr-only">Rechercher des communautés</span><input type="search" id="cm-q" placeholder="Rechercher des communautés" autocomplete="off" value="${esc(CM.q)}" maxlength="40"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></label></div>
    <section class="cm-hero"><div class="cm-hero-txt"><span class="cm-kicker">Découverte de communautés</span><h3 class="cm-title">Trouve ta communauté, <b>rejoins la conversation.</b></h3>
        <p>Des groupes publics autour de tes jeux. Chaque communauté ici a choisi d'être visible.</p></div>
      ${top.length?`<aside class="cm-top" aria-label="Les plus grandes communautés"><span class="cm-top-h">Les plus grandes</span>${top.map(g=>`<button type="button" class="cm-top-row" data-cm="${esc(g.id)}">${gAvatar(g,40)}<span><b>${esc(g.name)}</b><small>${g.members.length} membre${g.members.length>1?'s':''}</small></span></button>`).join('')}</aside>`:''}</section>
    ${mine.length?`<section class="cm-mine" aria-label="Tes communautés"><h3 class="cm-h on-world">Tes communautés</h3><div class="cm-mine-row">${gPinSort(mine).map(g=>`<a class="cm-mine-it" href="#/groupe/${esc(g.id)}">${gAvatar(g,40)}<span><b>${esc(g.name)}</b><small>${g.members.length} membre${g.members.length>1?'s':''}${gUnread(g)?' · nouveau':''}</small></span></a>`).join('')}</div></section>`:''}
    <div class="cm-sort" role="group" aria-label="Trier">${[['members','Plus de membres'],['active','Plus actives']].map(([k,l])=>`<button type="button" class="chip" data-cm-sort="${k}" aria-pressed="${CM.sort===k}">${l}</button>`).join('')}</div>
    <div class="cm-grid" id="cm-grid">${cmGridHTML()}</div></div>`;
  const grid=document.getElementById('cm-grid'), redraw=()=>{ grid.innerHTML=cmGridHTML(); grid.querySelectorAll('[data-g-new]').forEach(b=>b.onclick=()=>groupForm()); };
  app.querySelectorAll('[data-g-new]').forEach(b=>b.onclick=()=>groupForm());
  app.querySelectorAll('[data-cm-cat]').forEach(b=>b.onclick=()=>{ CM.cat=b.dataset.cmCat; app.querySelectorAll('[data-cm-cat]').forEach(x=>x.setAttribute('aria-pressed',x===b)); redraw(); });
  app.querySelectorAll('[data-cm-sort]').forEach(b=>b.onclick=()=>{ CM.sort=b.dataset.cmSort; app.querySelectorAll('[data-cm-sort]').forEach(x=>x.setAttribute('aria-pressed',x===b)); redraw(); });
  document.getElementById('cm-q').oninput=e=>{ CM.q=e.target.value; redraw(); };
  const openCm=e=>{ const c=e.target.closest('[data-cm]'); if(c) cmPreview(c.dataset.cm); };
  app.querySelector('.cm-page').addEventListener('click',openCm);
  app.querySelector('.cm-page').addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.matches('.cm-card')){ e.preventDefault(); openCm(e); } });
  if(me) DB.loadGroups().then(ch=>{ if(ch&&/^#\/groupes(\/communautes)?$/.test(location.hash)&&!(dlg&&dlg.open)) viewCommus(); }).catch(()=>{});   // les groupes ont peut-être changé depuis le dernier passage
}
// Aperçu d'une communauté : sa bannière, sa description, quelques membres, et « Rejoindre » (le même geste que sur la page des groupes)
function cmPreview(id){ const g=gById(id); if(!g) return; const inn=gIn(g), full=g.members.length>=GROUP_MAX, kicked=(g.kicked||[]).includes(myId());
  const mem=g.members.slice(0,6).map(u=>gPlayer(u)).filter(Boolean);
  modal(`<div class="cm-pv"><div class="cm-banner" style="--h:${cmHue(g)}"><i class="cm-deco" data-deco="" aria-hidden="true"></i></div><span class="cm-av">${gAvatar(g,64)}</span>
      <h3>${esc(g.name)}</h3><span class="cm-meta">${cmMeta(g)}${full?' · complet':''}</span>${g.desc?`<p class="cm-pv-desc">${esc(g.desc)}</p>`:''}
      ${mem.length?`<div class="cm-pv-mem" aria-label="Quelques membres">${mem.map(p=>avatar(p,30)).join('')}${g.members.length>mem.length?`<span class="muted">+${g.members.length-mem.length}</span>`:''}</div>`:''}</div>
    <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Fermer</button>${inn?`<a class="btn btn-ac" href="#/groupe/${esc(g.id)}" data-close>Ouvrir</a>`:kicked?'<span class="muted">Tu ne peux plus rejoindre ce groupe.</span>':full?'<span class="muted">Complet</span>':!S.me?'<a class="btn btn-ac" href="#/inscription" data-close>Créer mon compte</a>':'<button class="btn btn-ac" type="button" id="cm-join">Rejoindre</button>'}</div>`,
    d=>d.querySelector('#cm-join')?.addEventListener('click',async ev=>{ const b=ev.currentTarget; b.disabled=true; if(await DB.joinGroup(g.id)){ d.close(); toast('Tu as rejoint le groupe'); location.hash='#/groupe/'+g.id; } else b.disabled=false; }), 'cm-dlg'); }
