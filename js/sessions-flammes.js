/* Coopô — js/sessions-flammes.js
   Sessions d'un soir, flammes des mates.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* ---- Sessions d'un soir (anciennes « escouades ») ---- */
const allSquads = () => [...DEMO_SQUADS,...S.squads].filter(s=>!S.hidden.includes(s.owner)&&!S.blocked.includes(s.owner)).sort((a,b)=>b.at-a.at);   // v7 — les sessions de tous les âges
const squadMembers = s => [...s.members,...(S.joined.includes(s.id)&&!s.members.includes('me')?['me']:[])];
function viewGroupsTab(){
  const sq=allSquads(), me=S.me;
  app.innerHTML=`<div class="wrap page">${boardHead('sessions','Monte une équipe pour un jour et un créneau précis.',me?'<button class="btn btn-ac" id="newsq">Créer une session</button>':'<a class="btn btn-ac" href="#/inscription">Créer mon compte</a>')}
    <div class="grid">${sq.length?sq.map(s=>{ const mem=squadMembers(s), full=mem.length>=s.slots, inn=mem.includes('me'), mine=s.owner==='me';
      return `<article class="mcard squad" style="--c:var(--pk)"><div class="sq-top"><span class="sq-game">${esc(s.game)}</span><span class="sq-slots ${full?'full':''}">${mem.length}/${+s.slots||0} ${full?'· Complet':'places'}</span></div>
        <h3>${esc(s.title)}</h3>${s.desc?`<p class="muted">${esc(s.desc)}</p>`:''}
        <dl class="facts"><div><dt>Quand</dt><dd>${L(DAYS,s.day)} · ${L(HOURS,s.hour)}</dd></div><div><dt>Vocal</dt><dd>${s.voice?'Oui':'Non'}</dd></div></dl>
        <div class="sq-mem">${mem.map(m=>m==='me'?avatar(S.me,30):(x=>x?`<a href="#/joueur/${x.id}" title="${esc(x.name)}">${avatar(x,30)}</a>`:'')(PLAYERS.find(x=>x.id===m))).join('')}</div>
        <div class="sq-act">${mine?`<button class="btn btn-sm btn-danger" data-del="${esc(s.id)}">Supprimer</button>`:inn?`<button class="btn btn-sm" data-leave="${esc(s.id)}">Quitter</button>`:full?'':`<button class="btn btn-sm btn-ac" data-join="${esc(s.id)}">Rejoindre</button>`}</div></article>`; }).join('')
      :'<div class="empty" style="grid-column:1/-1"><h3>Aucune session pour le moment</h3><p class="muted">Sois le premier à en proposer une.</p></div>'}</div></div>`;
  document.getElementById('newsq')?.addEventListener('click',newSquad);
  app.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>{ if(!S.me){ location.hash='#/inscription'; return; } S.joined.push(b.dataset.join); save(); DB.joinSquad(b.dataset.join,true); toast('Tu as rejoint la session'); viewGroupsTab(); });
  app.querySelectorAll('[data-leave]').forEach(b=>b.onclick=()=>{ S.joined=S.joined.filter(x=>x!==b.dataset.leave); save(); DB.joinSquad(b.dataset.leave,false); viewGroupsTab(); });
  app.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ S.squads=S.squads.filter(x=>x.id!==b.dataset.del); save(); DB.deleteSquad(b.dataset.del); toast('Session supprimée'); viewGroupsTab(); });
}
function newSquad(){
  const opt=(arr,sel)=>arr.map(([v,l])=>`<option value="${esc(v)}" ${sel===v?'selected':''}>${esc(l)}</option>`).join('');
  modal(`<h3>Créer une session</h3><div class="form" style="margin-top:12px">
    <div class="field"><label for="sq-g">Jeu</label><select id="sq-g">${opt([...new Set([...S.me.games,...GAMES])].map(g=>[g,g]),S.me.games[0])}</select></div>
    <div class="field"><label for="sq-t">Titre</label><input id="sq-t" type="text" maxlength="60" placeholder="ex. Squad ranked ce soir"></div>
    <div class="two"><div class="field"><label for="sq-d">Jour</label><select id="sq-d">${opt(DAYS,S.me.days[0]||'sam')}</select></div><div class="field"><label for="sq-h">Créneau</label><select id="sq-h">${opt(HOURS,S.me.hours[0])}</select></div></div>
    <div class="two"><div class="field"><label for="sq-s">Places (toi compris)</label><select id="sq-s">${opt([['2','2'],['3','3'],['4','4'],['5','5'],['6','6']],'4')}</select></div><div class="field"><label for="sq-v">Vocal</label><select id="sq-v"><option value="1">Oui</option><option value="0">Non</option></select></div></div>
    <div class="field"><label for="sq-x">Description (facultatif)</label><textarea id="sq-x" rows="2" maxlength="200" placeholder="Niveau attendu, objectif, règles…"></textarea></div>
    <p class="err" id="sq-e"></p></div>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" id="sq-ok">Créer la session</button></div>`,
    d=>d.querySelector('#sq-ok').onclick=()=>{ const t=d.querySelector('#sq-t').value.trim(); if(t.length<3){ d.querySelector('#sq-e').textContent='Donne un titre à ta session.'; return; }
      if(myGroupNow()==='minor'&&hasPhone(t+' '+d.querySelector('#sq-x').value)){ d.querySelector('#sq-e').textContent='Pour ta sécurité, pas de numéro de téléphone dans une session.'; return; }
      const s={id:'q'+Date.now(),owner:'me',game:d.querySelector('#sq-g').value,title:t,day:d.querySelector('#sq-d').value,hour:d.querySelector('#sq-h').value,slots:+d.querySelector('#sq-s').value,voice:d.querySelector('#sq-v').value==='1',desc:d.querySelector('#sq-x').value.trim(),members:['me'],ageGroup:ageGroup(S.me),at:Date.now()};
      S.squads.push(s); save(); DB.saveSquad(s); d.close(); toast('Session créée'); viewGroupsTab(); });
}

/* =========================================================
   FLAMMES : deux mates qui s'écrivent chaque jour gardent une flamme 🔥 (comme sur Snapchat ou TikTok)
   Firestore : streaks/{uidA_uidB} = { members:[a,b], last:{uid:jour}, both:jour, count:n }
   - « jour » = numéro du jour à l'heure d'Abidjan (UTC, pas de changement d'heure). C'est l'heure du SERVEUR qui compte :
     les règles Firestore refusent toute écriture qui ne correspond pas au jour réel, et n'acceptent une écriture
     que dans le même envoi qu'un vrai message. On ne peut donc pas tricher en changeant l'heure de son téléphone.
   - both = dernier jour où les DEUX ont écrit ; count = nombre de jours d'affilée à ce moment-là.
   ========================================================= */
const FLAME_STEPS=[10,30,100,365], FLAME_FROM=2, FLAME_WARN_HOUR=18;   // la flamme s'affiche à partir de 2 jours ; sablier à partir de 18 h si la journée n'est pas validée
let DAY_SHIFT=0;   // si l'horloge du téléphone est fausse, le serveur refuse la flamme : on se recale d'un jour (voir DB.sendMessage)
const dayNow = () => Math.floor(Date.now()/86400000)+DAY_SHIFT;
function flameState(id){ const s=(S.streaks||{})[id]; if(!s||!AUTH_LIVE) return null; const t=dayNow(), me=DB.uid();
  const alive=s.both>=t-1&&s.count>0, done=s.both===t, mine=(s.last||{})[me]===t, his=(s.last||{})[id]===t;
  return { count:alive?s.count:0, alive, done, mine, his, warn:alive&&!done&&new Date().getUTCHours()>=FLAME_WARN_HOUR }; }
function flameTag(id){ const f=flameState(id); if(!f||f.count<FLAME_FROM) return '';
  return `<span class="flame${f.warn?' warn':''}" title="${f.count} jours d'affilée${f.warn?' · elle va s\'éteindre à minuit':''}">${f.warn?'⏳':'🔥'}<b>${f.count}</b></span>`; }
// Phrase d'état sous une conversation
function flameHint(id,name){ const f=flameState(id); if(!f) return '';
  if(f.count>=FLAME_FROM&&!f.done) return `${f.warn?'⏳':'🔥'} ${f.mine?`${esc(name)} doit t'écrire`:f.his?'Réponds':'Écrivez-vous tous les deux'} avant minuit (heure d'Abidjan) pour garder votre flamme de ${f.count} jours.`;
  if(f.count>=FLAME_FROM) return `🔥 ${f.count} jours d'affilée. C'est validé pour aujourd'hui.`;
  if(f.count===1&&!f.done) return `Écrivez-vous encore aujourd'hui tous les deux pour allumer une flamme 🔥`;
  return ''; }
// Palier atteint (10, 30, 100, 365 jours) : petite fête, et la plaque du palier est offerte
function flameMilestone(id){ const s=(S.streaks||{})[id]; if(!s||s.both<dayNow()-1) return; const p=PLAYERS.find(x=>x.id===id);
  S.flameSeen=S.flameSeen||{}; const seen=S.flameSeen[id]||0, step=FLAME_STEPS.filter(n=>s.count>=n).pop(); if(!step) return;
  FLAME_STEPS.filter(n=>n<=step).forEach(n=>{ if(!ownsPlate('flamme'+n)||isAdmin()) DB.grantPlate('flamme'+n, DB.pairId(id)); });   // la plaque gagnée (les règles vérifient la flamme)
  if(seen>=step) return; S.flameSeen[id]=step; save();
  if(s.count!==step||!DB._streakReady) return;   // on ne fête que le jour même du palier
  setTimeout(()=>{ try{ burst(innerWidth/2,innerHeight*.4); }catch(e){}
    modal(`<div class="flame-party"><span class="flame-big" aria-hidden="true">🔥</span><h3>${step} jours d'affilée${p?` avec ${esc(p.name)}`:''} !</h3>
      <p class="muted">Vous vous êtes écrit chaque jour pendant ${step} jours. La plaque <b>${np({plate:'flamme'+step,name:PLATES['flamme'+step].label})}</b> est à vous deux.</p></div>
      <div class="dlg-actions"><button class="btn btn-ghost" data-close>Plus tard</button><a class="btn btn-ac" href="#/inventaire" data-close>Voir ma plaque</a></div>`); },600); }
// Rappel : une flamme va s'éteindre et c'est à moi d'écrire (une fois par jour et par mate, quand Coopô est ouvert)
function flameCheck(){ if(!AUTH_LIVE||!S.me||new Date().getUTCHours()<FLAME_WARN_HOUR) return; const t=dayNow(); S.flameNudged=S.flameNudged||{};
  Object.keys(S.streaks||{}).forEach(id=>{ const f=flameState(id), p=PLAYERS.find(x=>x.id===id); if(!f||!p||!isMate(id)||f.count<FLAME_FROM||f.done||f.mine||S.flameNudged[id]===t) return;
    S.flameNudged[id]=t; const n={type:'flame',from:id,text:`⏳ Ta flamme de ${f.count} jours avec ${p.name} s'éteint à minuit : écris-lui !`};
    notify({...n,toast:location.hash!=='#/messages/'+id}); deviceNotify(n); }); save(); }
setInterval(flameCheck,20*60e3);   // tourne aussi quand l'appli est en arrière-plan : c'est là que la notification du téléphone sert
