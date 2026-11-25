/* Coopô — js/appareil.js
   Notifications du téléphone et « push », rappels de l'accueil, parrainage, appli installable, service worker.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* ---- Notifications de l'appareil (quand Coopô est ouverte en arrière-plan) ---- */
async function deviceNotify(n){
  try{ if(!('Notification' in window)||Notification.permission!=='granted'||!S.notifyOn) return; if(!document.hidden) return;
    const title=n.type==='request'?'Nouvelle demande de mate':n.type==='message'?'Nouveau message':n.type==='annonce'?'Réponse à ton annonce':n.type==='flame'?'Ta flamme va s\'éteindre':n.type==='group'?'Invitation dans un groupe':'Coopô';
    const opt={ body:String(n.text||'').slice(0,120), icon:'icons/v3/icon-192.png', badge:'icons/v3/badge-96.png', tag:'coopo-'+(n.type||'n'), data:{url:location.origin+location.pathname+(n.type==='message'||n.type==='flame'?'#/messages':n.type==='group'?(n.gid?'#/groupe/'+n.gid:'#/groupe'):'#/matchs')} };
    const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration(); if(reg) reg.showNotification(title,opt); else new Notification(title,opt);
  }catch(e){} }
function notifySettingHTML(){
  if(!('Notification' in window)) return isIOS()&&!isStandalone()
    ? `<p class="hint">Sur iPhone, ajoute d'abord Coopô à ton écran d'accueil (bouton Partager, puis « Sur l'écran d'accueil »). Ouvre Coopô depuis l'écran d'accueil, puis reviens ici pour activer les notifications.</p>`
    : `<p class="hint">Ton navigateur ne gère pas les notifications. Installe l'application pour une meilleure expérience.</p>`;
  const st=Notification.permission;
  if(st==='denied') return `<p class="hint">Les notifications sont bloquées pour Coopô dans les réglages de ton navigateur.</p>`;
  const on=S.notifyOn&&st==='granted';
  return `<div class="toggle"><span><b>Notifications sur cet appareil</b><small class="muted" style="display:block">${pushCan()?'Appels, demandes de mate et messages. Les appels sonnent même quand Coopô est fermée.':'Appels, demandes de mate et messages, quand Coopô est ouverte en arrière-plan.'}</small></span><button class="btn btn-sm ${on?'':'btn-ac'}" type="button" id="notif-toggle">${on?'Désactiver':'Activer'}</button></div>`;
}
// Activer les notifications (réglages ou bandeau des Messages) : l'autorisation du navigateur, puis l'adresse « push » de cet appareil
async function notifyEnable(){ try{ const r=await Notification.requestPermission(); S.notifyOn=r==='granted'; save();
    if(r!=='granted'){ toast('Notifications refusées'); return false; }
    const p=await pushOn(); toast(p?'Notifications activées : tes appels sonneront même quand Coopô est fermée.':'Notifications activées',3500); return true; }catch(x){ return false; } }
document.addEventListener('click',async e=>{ if(!e.target.closest('#notif-toggle')) return;
  if(S.notifyOn&&Notification.permission==='granted'){ S.notifyOn=false; save(); pushOff(); route(); return; }
  await notifyEnable(); route(); });
/* ---- v14 — Notifications « push » : un appel arrive même quand Coopô est fermée ----
   Quand le joueur active les notifications, son appareil reçoit une adresse de notification (Firebase Cloud Messaging),
   rangée dans private/{uid}.push (5 appareils au plus). Quand il appelle un mate, Coopô demande au serveur de paiement
   (/api/notifyCall) de faire sonner les appareils du mate ; c'est le service worker (sw.js) qui affiche la notification. */
const FCM_VAPID='BPxo2lfyQraUCGxMm-JUZSKFVOJhxeN-XLoy_yS_uS-iOmMhEfA-IwIjRtTcelg-SzWLUFQKev6QHR47ZID9PEo';   // clé publique « Web Push » du projet Firebase (pas un secret)
const PUSH_KEY='coopo_push';   // l'adresse de cet appareil (pour la retirer quand on désactive)
const pushTok = () => { try{ return localStorage.getItem(PUSH_KEY)||''; }catch(e){ return ''; } };
const pushTokSet = v => { try{ v?localStorage.setItem(PUSH_KEY,v):localStorage.removeItem(PUSH_KEY); }catch(e){} };
const pushCan = () => AUTH_LIVE&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
async function pushMessaging(){ if(!pushCan()) return null; if(!DB.live&&!(await DB.ready())) return null;
  if(!firebase.messaging) await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-messaging-compat.js`);
  if(!firebase.messaging||!(await firebase.messaging.isSupported())) return null; return firebase.messaging(); }
async function pushOn(){ try{ if(!('Notification' in window)||Notification.permission!=='granted') return false;
    const m=await pushMessaging(); if(!m) return false; const reg=await navigator.serviceWorker.ready;
    const tok=await m.getToken({vapidKey:FCM_VAPID,serviceWorkerRegistration:reg}); if(!tok) return false;
    const old=pushTok(); if(old&&old!==tok) await DB.dropPush(old).catch(()=>{});
    await DB.savePush(tok); pushTokSet(tok); return true; }catch(e){ console.warn('push',e); return false; } }
async function pushOff(){ const tok=pushTok(); pushTokSet(null); try{ if(tok) await DB.dropPush(tok); if(window.firebase&&firebase.messaging){ const m=await pushMessaging(); if(m) await m.deleteToken(); } }catch(e){ console.warn('push',e); } }
let _pushChecked=false;   // une fois par visite : on garde l'adresse à jour (elle peut changer), ou on la retire si les notifications sont coupées
function pushRefresh(){ if(_pushChecked||!pushCan()) return; _pushChecked=true;
  if(S.notifyOn&&Notification.permission==='granted') pushOn(); else if(pushTok()) pushOff(); }
// Fait sonner les appareils du mate (même Coopô fermée) : step « ring » quand l'appel part, « end » s'il s'arrête sans réponse
async function pushCall(c,step){ try{ if(!SHOP.api||!AUTH_LIVE||!c||!c.id||!c.at) return; const u=firebase.auth().currentUser; if(!u) return; const tk=await u.getIdToken();
    await fetch(SHOP.api.replace(/\/$/,'')+'/notifyCall',{method:'POST',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify({to:c.id,at:c.at,step}),keepalive:true}); }catch(e){} }
// Sur la page Messages : proposer une fois d'activer les notifications, pour que les appels arrivent même Coopô fermée
const NB_KEY='coopo_nb_x';
function notifBanHTML(){ try{ if(!pushCan()||Notification.permission!=='default'||localStorage.getItem(NB_KEY)) return ''; }catch(e){ return ''; }
  return `<div class="nt-ban" id="nt-ban" role="region" aria-label="Notifications"><i aria-hidden="true">${BELL}</i><span><b>Ne rate plus aucun appel</b><small>Active les notifications : tes mates pourront t'appeler même quand Coopô est fermée.</small></span><button class="btn btn-sm btn-ac" type="button" data-nb-on>Activer</button><button class="btn btn-sm btn-ghost nb-x" type="button" data-nb-x aria-label="Plus tard">×</button></div>`; }
document.addEventListener('click',async e=>{ const on=e.target.closest('[data-nb-on]'), x=e.target.closest('[data-nb-x]'); if(!on&&!x) return;
  try{ localStorage.setItem(NB_KEY,'1'); }catch(er){} document.getElementById('nt-ban')?.remove(); if(on) await notifyEnable(); });

/* ---- Accueil : rappel pour compléter le profil, et jeux les plus joués ---- */
function profileNudge(){
  if(!S.me) return '';
  if(S.langAsk) return `<a class="nudge" href="#/profil/modifier"><div><b>Choisis tes langues</b><span>La liste des langues a changé : une de tes langues n'y est plus. Choisis celles que tu parles en jeu.</span></div><span class="nudge-go" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a>`;
  const miss=[]; if(!(S.me.days||[]).length) miss.push('tes jours'); if(!Object.keys(S.me.tags||{}).length) miss.push('tes pseudos en jeu');
  if(!miss.length) return '';
  return `<a class="nudge" href="#/profil/modifier"><div><b>Complète ton profil</b><span>Ajoute ${miss.join(', ')} : tes matchs seront plus précis.</span></div><span class="nudge-go" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a>`;
}
function gamesPulse(){
  if(!S.me) return '';
  const all=[...visible(), S.me]; if(all.length<5) return '';
  const cnt={}; all.forEach(p=>(p.games||[]).forEach(g=>cnt[g]=(cnt[g]||0)+1));
  const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,6);
  return `<div class="pulse"><b>Jeux du moment</b><div class="pulse-list">${top.map(([g,n])=>`<button type="button" class="pulse-chip${F.game===g?' on':''}" data-pulse-game="${esc(g)}" aria-pressed="${F.game===g}">${esc(g)} <i>${n}</i></button>`).join('')}</div></div>`;
}
// Un jeu du moment = un filtre : un appui l'applique, un second l'enlève
document.addEventListener('click',e=>{ const g=e.target.closest('[data-pulse-game]'); if(!g) return; F.game = F.game===g.dataset.pulseGame ? '' : g.dataset.pulseGame; F.shown=24; viewSearch(); });

/* ================= Parrainage ================= */
(function captureRef(){ try{ const u=new URL(location.href); const r=u.searchParams.get('ref'); if(r){ localStorage.setItem('coopo_ref',r.toLowerCase().slice(0,20)); u.searchParams.delete('ref'); history.replaceState(null,'',u.pathname+(u.search||'')+u.hash); } }catch(e){} })();
const NAME_WAIT_DAYS=14;   // un pseudo ne peut être changé qu'une fois tous les 14 jours
const nameWaitMsg = until => `Tu as changé de pseudo il y a moins de ${NAME_WAIT_DAYS} jours. Tu pourras le changer à nouveau le ${new Date(until).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}.`;
const REF_REWARD={ one:'soft', all:3 };   // 1 filleul : thème Soft pour celui qui invite · 3 filleuls : tous les thèmes (les anciens filleuls gardent le thème déjà reçu)
const refLink = () => S.me ? `${location.origin}${location.pathname}?ref=${encodeURIComponent(S.me.name.toLowerCase())}` : '';
async function shareRef(){ const url=refLink(); const data={title:'Coopô',text:`Rejoins-moi sur Coopô pour trouver des mates de jeu : inscris-toi avec mon lien.`,url};
  shareOrCopy(data,'Lien de parrainage copié'); }
// Partage du téléphone si disponible, sinon copie ; en dernier recours, une fenêtre montre le lien à copier
async function shareOrCopy(data,okMsg){
  if(navigator.share){ try{ await navigator.share(data); return; }catch(e){ if(e&&e.name==='AbortError') return; } }   // partage annulé par le joueur : on n'insiste pas
  try{ await navigator.clipboard.writeText(data.url); toast(okMsg); }
  catch(e){ modal(`<h3>Ton lien</h3><p class="muted">Appuie longuement sur le lien pour le copier.</p><input type="text" readonly value="${esc(data.url)}" onfocus="this.select()"><div class="dlg-actions"><button class="btn" data-close>Fermer</button></div>`); } }
function refSection(){
  if(!S.me) return '';
  const rw=S.rewards||{}, n=rw.referrals||0;
  return `<section class="panel ref-panel"><h3>Parraine tes amis</h3><p class="hint">Partage ton lien. Quand un ami crée son compte avec, tu reçois <b>le thème ${esc(SKINS[REF_REWARD.one].label)}</b>. À ${REF_REWARD.all} amis parrainés, tu débloques <b>tous les thèmes</b>.</p>
    <div class="ref-row"><input class="ref-link" readonly value="${esc(refLink())}" aria-label="Ton lien de parrainage"><button class="btn btn-ac" type="button" id="ref-share">Partager</button></div>
    <div class="ref-stats"><b>${n}</b> ami${n>1?'s':''} parrainé${n>1?'s':''}${n>=REF_REWARD.all?' · tous les thèmes débloqués 🎉':n>0?' · thème '+esc(SKINS[REF_REWARD.one].label)+' débloqué':''}${rw.referred?' · tu as été parrainé : thème '+esc(SKINS[REF_REWARD.one].label)+' offert':''}</div></section>`;
}
document.addEventListener('click',e=>{ if(e.target.closest('#ref-share,[data-ref-share]')) shareRef(); const i=e.target.closest('.ref-link'); if(i){ i.select(); } });

/* ---- Application installable (PWA) ---- */
let _installEvt=null;
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); _installEvt=e; refreshInstallUI(); });
addEventListener('appinstalled',()=>{ _installEvt=null; toast('Coopô est installée sur ton appareil'); refreshInstallUI(); });
function envInfo(){
  const ua=navigator.userAgent||'';
  const inApp=/FBAN|FBAV|FB_IAB|Instagram|musical_ly|Bytedance|TikTok|Snapchat|Line\/|WhatsApp|wv\)|; wv/i.test(ua);
  const ios=isIOS(), android=/android/i.test(ua);
  const iosSafari=ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) && !inApp;
  const iosChrome=ios && /CriOS/i.test(ua);
  const samsung=/SamsungBrowser/i.test(ua), firefox=/Firefox|FxiOS/i.test(ua);
  return {ua,inApp,ios,android,iosSafari,iosChrome,samsung,firefox};
}
const SHARE_ICO='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
function installSteps(){
  const e=envInfo(); const url=location.origin+location.pathname;
  if(e.inApp) return {title:"Ouvre Coopô dans ton navigateur", steps:[
      "Tu es dans le navigateur d'une appli (TikTok, WhatsApp, Instagram…) : l'installation y est impossible.",
      e.ios?"Touche les <b>⋯</b> en haut à droite, puis <b>Ouvrir dans Safari</b>.":"Touche les <b>⋮</b> en haut à droite, puis <b>Ouvrir dans Chrome</b> (ou « Ouvrir dans le navigateur »).",
      "Dans Safari ou Chrome, reviens sur cette page et touche à nouveau « Installer l'application »."], copy:url};
  if(e.ios && !e.iosSafari && !e.iosChrome) return {title:"Ouvre Coopô dans Safari", steps:[
      "Sur iPhone, l'installation se fait depuis <b>Safari</b> (ou Chrome à partir d'iOS 16.4).",
      "Copie le lien ci-dessous, ouvre <b>Safari</b> et colle-le dans la barre d'adresse.",
      "Puis suis les étapes « Partager » › « Sur l'écran d'accueil »."], copy:url};
  if(e.ios) return {title:"Installer sur iPhone", steps:[
      `Touche le bouton <b>Partager</b> ${SHARE_ICO} ${e.iosChrome?'en haut à droite (dans la barre d\'adresse)':'en bas de l\'écran (au centre)'}.`,
      "Fais défiler et choisis <b>Sur l'écran d'accueil</b>. S'il n'apparaît pas, touche <b>Modifier les actions</b> en bas de la liste pour l'ajouter.",
      "Touche <b>Ajouter</b> en haut à droite : l'icône Coopô apparaît sur ton écran d'accueil."]};
  if(e.firefox) return {title:"Installer sur Android", steps:[
      "Firefox installe mal les applications web : ouvre plutôt cette page dans <b>Chrome</b>.",
      "Dans Chrome, touche <b>⋮</b> en haut à droite, puis <b>Installer l'application</b> ou <b>Ajouter à l'écran d'accueil</b>."], copy:url};
  if(e.samsung) return {title:"Installer avec Samsung Internet", steps:[
      "Touche le menu <b>≡</b> en bas à droite.", "Choisis <b>Ajouter la page à</b>, puis <b>Écran d'accueil</b>."]};
  if(e.android) return {title:"Installer sur Android", steps:[
      "Touche les <b>⋮</b> en haut à droite de Chrome.",
      "Choisis <b>Installer l'application</b>. Si tu ne le vois pas, choisis <b>Ajouter à l'écran d'accueil</b>, puis <b>Installer</b>.",
      "L'icône Coopô apparaît sur ton écran d'accueil et dans tes applications."]};
  return {title:"Installer sur ordinateur", steps:[
      "Dans Chrome ou Edge, clique sur l'icône d'installation <b>⊕</b> à droite de la barre d'adresse.",
      "Ou ouvre le menu <b>⋮</b>, puis <b>Caster, enregistrer et partager</b> › <b>Installer la page en tant qu'application</b>.",
      "Sur téléphone, ouvre Coopô dans Chrome (Android) ou Safari (iPhone)."]};
}
async function installDiag(){
  const out=[]; try{ const r=await fetch('manifest.webmanifest',{cache:'no-store'}); out.push(r.ok?'✅ manifest.webmanifest trouvé':'❌ manifest.webmanifest introuvable (fichier non déposé sur GitHub ?)'); if(r.ok){ const m=await r.json(); for(const ic of (m.icons||[])){ const ri=await fetch(ic.src,{cache:'no-store'}); out.push((ri.ok?'✅ ':'❌ ')+ic.src+(ri.ok?'':' introuvable')); } } }catch(e){ out.push('❌ manifest illisible'); }
  try{ const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration(); out.push(reg?'✅ service worker (sw.js) actif':'❌ service worker inactif (sw.js manquant ?)'); }catch(e){ out.push('❌ service worker indisponible'); }
  out.push(location.protocol==='https:'?'✅ connexion sécurisée (https)':'❌ le site doit être en https');
  return out;
}
function installModal(){
  if(isStandalone()){ toast('Coopô est déjà installée sur cet appareil'); return; }
  const st=installSteps();
  modal(`<h3>${st.title}</h3><ol class="inst-steps">${st.steps.map(x=>`<li>${x}</li>`).join('')}</ol>
    ${st.copy?`<div class="ref-row"><input class="ref-link" readonly value="${esc(st.copy)}" aria-label="Lien du site"><button class="btn btn-ac" type="button" id="inst-copy">Copier</button></div>`:''}
    ${(S.auth&&isAdmin())?`<details class="inst-diag"><summary>Diagnostic (modération)</summary><div id="inst-diag" class="muted">Vérification…</div></details>`:''}
    <div class="dlg-actions"><button class="btn" data-close>Fermer</button></div>`, d=>{
    const c=d.querySelector('#inst-copy'); if(c) c.onclick=async()=>{ try{ await navigator.clipboard.writeText(st.copy); toast('Lien copié'); }catch(e){ d.querySelector('.ref-link').select(); } };
    const dg=d.querySelector('#inst-diag'); if(dg) installDiag().then(l=>dg.innerHTML=l.map(esc).join('<br>'));
  });
}
function installHTML(){
  if(isStandalone()) return `<p class="hint">Coopô est déjà installée sur cet appareil. Merci !</p>`;
  if(_installEvt) return `<p class="hint">Ajoute Coopô à ton écran d'accueil : elle s'ouvre comme une vraie application, en plein écran.</p><button class="btn btn-ac" type="button" id="install-app">Installer l'application</button>`;
  return `<p class="hint">Ajoute Coopô à ton écran d'accueil : elle s'ouvre comme une vraie application, en plein écran.</p><button class="btn btn-ac" type="button" data-install-go>Installer l'application</button>`;
}
function viewApp(){
  app.innerHTML=`<div class="wrap page legal">${backAuto()}<div class="page-head"><div><h2>L'application Coopô</h2><p>Installe Coopô sur ton téléphone : une icône sur ton écran d'accueil, l'ouverture en plein écran, sans passer par le navigateur.</p></div></div>
    <section class="panel" data-install-box>${installHTML()}</section></div>`;
}
function refreshInstallUI(){ document.querySelectorAll('[data-install-box]').forEach(b=>b.innerHTML=installHTML()); document.querySelectorAll('[data-install-foot]').forEach(b=>b.hidden=isStandalone()); }
setTimeout(refreshInstallUI,0);
document.addEventListener('click',e=>{ if(!e.target.closest('[data-install-go]')) return; if(_installEvt){ try{ _installEvt.prompt(); _installEvt.userChoice.finally(()=>{ _installEvt=null; refreshInstallUI(); }); }catch(x){ installModal(); } } else installModal(); });
document.addEventListener('click',async e=>{ if(!e.target.closest('#install-app')||!_installEvt) return;
  _installEvt.prompt(); try{ await _installEvt.userChoice; }catch(x){} _installEvt=null; refreshInstallUI(); });
try{ if('serviceWorker' in navigator && location.protocol==='https:' && !/claude|claudeusercontent/.test(location.hostname)) addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }catch(e){}
