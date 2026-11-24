/* Coopô — js/connexion.js
   Connexion Google et e-mail (Firebase Authentication), écran d'ouverture, inscription, déconnexion.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* =========================================================
   CONNEXION GOOGLE (Firebase Authentication + bouton officiel Google)
   ---------------------------------------------------------
   Tant que ces champs sont vides, le site tourne en MODE DÉMO
   (connexion simulée, aucun vrai compte Google utilisé).
   La clé apiKey Firebase n'est pas un secret : elle peut être dans le code.
   ========================================================= */
const AUTH = {
  // Console Firebase > Paramètres du projet > Vos applications > Application Web > Configuration
  firebase: { apiKey:'AIzaSyBvybrzKLy2kyXcR66W-ubnlwMMpq6QxIU', authDomain:'overmate-1db74.firebaseapp.com', projectId:'overmate-1db74', appId:'1:632209817465:web:f67be5a1b762b18859f9a8' },
  // Console Firebase > Authentication > Sign-in method > Google > Configuration du SDK Web > « ID client Web »
  googleClientId: '632209817465-73gio4irjdf2qeap3t50p2fd2f93g4tb.apps.googleusercontent.com',
};
let AUTH_LIVE = !!(AUTH.firebase.apiKey && AUTH.googleClientId);
const FB_VERSION = '10.12.2';

function loadScript(src){
  return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.async=true;
    s.onload=res; s.onerror=()=>rej(new Error('Échec du chargement : '+src)); document.head.appendChild(s); });
}
/* Démarrage de Firebase.
   AUTH_READY : promesse tenue quand Firebase est chargé ET que la session est connue (connecté ou non).
   NET_FAIL   : Firebase n'a pas pu être chargé (pas de réseau) -> écran « Connexion impossible », nouvel essai automatique.
   Le site en ligne ne bascule jamais en mode démo : sinon un joueur recevrait de fausses réponses et ses actions ne seraient pas enregistrées. */
let AUTH_READY_OK; const AUTH_READY=new Promise(r=>{ AUTH_READY_OK=r; });
const authReady = (ms=15000) => !AUTH_LIVE ? Promise.resolve(false) : Promise.race([AUTH_READY, new Promise(r=>setTimeout(()=>r(false),ms))]);
let NET_FAIL=false, _authTries=0, _authBusy=false, _authBound=false, _authRetry=null;
async function initAuth(){
  if(!AUTH_LIVE||_authBusy) return; _authBusy=true; clearTimeout(_authRetry);
  try{
    if(!window.firebase) await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app-compat.js`);
    if(!firebase.auth) await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-auth-compat.js`);
    if(!firebase.apps||!firebase.apps.length) firebase.initializeApp(AUTH.firebase);
    if(!(await DB.init())) throw new Error('Firestore indisponible');
    const wasDown=NET_FAIL; NET_FAIL=false; _authTries=0;
    if(!_authBound){ _authBound=true; firebase.auth().onAuthStateChanged(u=>{
      if(u) onSignedIn({ uid:u.uid, name:u.displayName||'', email:u.email||'', photo:u.photoURL||'', provider:(u.providerData[0]&&u.providerData[0].providerId==='password')?'password':'google' });
      else if(S.auth) onSignedOut();
      AUTH_SETTLED=true; AUTH_READY_OK(true); splashSync();
    }); }
    if(wasDown) route(); else renderGoogleButtons();
  }catch(e){ console.error(e); NET_FAIL=true; _authTries++; route(); splashSync(); _authRetry=setTimeout(initAuth,Math.min(60000,4000*_authTries)); }
  finally{ _authBusy=false; }
}
addEventListener('online',()=>{ if(NET_FAIL) initAuth(); });
function netFailView(){
  document.body.classList.remove('is-home');
  app.innerHTML=`<div class="wrap page"><div class="empty"><h3>Connexion impossible</h3><p class="muted">Coopô n'arrive pas à joindre ses serveurs. Vérifie ta connexion internet : la page réessaie toute seule.</p><button class="btn btn-ac" type="button" id="net-retry">Réessayer maintenant</button></div></div>`;
}
document.addEventListener('click',e=>{ const b=e.target.closest('#net-retry'); if(b){ b.disabled=true; b.textContent='Nouvel essai…'; initAuth(); } });
// Bouton Google : le script de Google n'est chargé que sur les pages qui l'affichent (connexion, inscription), pas à chaque visite
let _gsiReady=false, _gsiLoad=null;
function ensureGSI(){
  if(_gsiReady) return Promise.resolve(true);
  if(!_gsiLoad) _gsiLoad=loadScript('https://accounts.google.com/gsi/client').then(()=>{ google.accounts.id.initialize({ client_id:AUTH.googleClientId, callback:onGoogleCredential, ux_mode:'popup', auto_select:false }); _gsiReady=true; return true; })
    .catch(e=>{ console.error(e); _gsiLoad=null; return false; });
  return _gsiLoad;
}
// Google renvoie un jeton signé ; Firebase le vérifie et crée/retrouve le compte.
async function onGoogleCredential({ credential }){
  try{ if(!(await authReady())) throw new Error('hors ligne'); await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(credential)); }
  catch(e){ console.error(e); toast('La connexion Google a échoué. Vérifie ta connexion et réessaie.',4000); }
}
// Affiche le bouton officiel Google (en production) ou le bouton de démo
function renderGoogleButtons(root=document){
  const inApp = typeof envInfo==='function' && envInfo().inApp;
  root.querySelectorAll('.gbtn').forEach(el=>{
    if(inApp){ el.innerHTML=`<div class="inapp-note"><b>Connexion Google indisponible ici</b><span>Tu es dans le navigateur d'une appli (TikTok, WhatsApp…). Inscris-toi avec ton e-mail juste en dessous, ou <button class="linklike" type="button" data-install-go>ouvre Coopô dans Chrome ou Safari</button>.</span></div>`; el.classList.add('is-inapp'); return; }
    if(AUTH_LIVE){
      if(_gsiReady){ el.innerHTML=''; const w=Math.max(200,Math.min(360,Math.floor((el.parentElement||el).clientWidth||300))); google.accounts.id.renderButton(el,{ theme:'outline', size:'large', shape:'pill', text:'continue_with', locale:'fr', width:w }); }
      else if(!el.firstChild) el.innerHTML=`<button type="button" class="btn btn-ghost" disabled>Connexion Google…</button>`;   // en attendant le bouton officiel (jamais le bouton de démo sur le site en ligne)
    } else if(!el.firstChild){
      el.innerHTML=`<button type="button" class="btn btn-ghost demo-g">Continuer avec Google <small>(démo)</small></button>`;
    }
  });
  if(AUTH_LIVE && !inApp && !_gsiReady && root.querySelector('.gbtn')) ensureGSI().then(ok=>{
    if(ok) renderGoogleButtons();
    else document.querySelectorAll('.gbtn').forEach(el=>{ el.innerHTML=`<p class="hint" style="text-align:center">Connexion Google indisponible pour le moment. Utilise ton e-mail juste en dessous.</p>`; }); });
}
// Nom d'utilisateur proposé à partir du nom Google
const suggestName = n => (n||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_.-]/g,'').slice(0,CONFIG.maxUsername);

/* ---- Écran d'ouverture ----
   Il reste affiché tant que Coopô ne sait pas si tu es connecté, puis tant que les données de ton compte ne sont pas arrivées.
   La planète se pose d'abord (fin de sa trajectoire), puis il file et la page s'ouvre.
   Il se retire tout seul : au minimum après un court instant (pas de clignotement), au maximum après 9 secondes (connexion très lente : le site s'affiche et continue de charger). */
const SPLASH={ el:document.getElementById('splash'), t0:performance.now(), min:600, max:9000, on:true, armed:false, gaveUp:false, fonts:false, t1:0, t2:0, t3:0 };
let AUTH_SETTLED=false;   // Firebase a dit si une session existe ou non
const SPLASH_TIPS=['Astuce : active « Je suis dispo maintenant » pour apparaître en tête de liste.','Astuce : plus ton profil est complet, plus tes matchs sont précis.','Astuce : invite un ami, vous gagnez tous les deux un thème.','Astuce : publie une annonce pour trouver des joueurs ce soir.','Bon à savoir : tes contacts ne sont visibles que par tes mates.','Astuce : installe Coopô sur ton écran d\'accueil, elle s\'ouvre comme une appli.'];
const splashPending = () => AUTH_LIVE && !NET_FAIL && !!S.auth && (!AUTH_SETTLED || (DB.live && !DB._loaded));
function splashMsg(t){ const m=document.getElementById('sp-msg'); if(m&&m.textContent!==t) m.textContent=t; }
function splashShow(msg){
  const el=SPLASH.el; if(!el) return;
  const again = !SPLASH.on || el.classList.contains('out');   // l'écran était parti (connexion pendant la visite) : la planète refait son entrée
  SPLASH.t0=performance.now(); SPLASH.on=true; SPLASH.armed=true; SPLASH.gaveUp=false; SPLASH.min=S.auth?900:600;
  const tip=document.getElementById('sp-tip'); if(tip) tip.textContent = S.auth ? SPLASH_TIPS[Math.random()*SPLASH_TIPS.length|0] : 'Trouve des joueurs avec qui jouer ce soir.';
  splashMsg(msg||(S.auth?'Connexion à ton compte…':'Chargement…'));
  if(again){ clearTimeout(SPLASH.t3); el.classList.add('gone'); void el.offsetWidth; el.classList.remove('gone','out'); try{ window.splashArm&&window.splashArm(); }catch(e){} }
  el.removeAttribute('aria-hidden'); document.documentElement.classList.add('splash-on');
  clearTimeout(SPLASH.t1); SPLASH.t1=setTimeout(()=>{ SPLASH.gaveUp=true; splashSync(); },SPLASH.max);
  splashSync();
}
function splashHide(){
  if(!SPLASH.on) return; SPLASH.on=false; clearTimeout(SPLASH.t1); clearTimeout(SPLASH.t2);
  const el=SPLASH.el, r=document.documentElement;
  if(el){ el.classList.add('out'); el.setAttribute('aria-hidden','true'); clearTimeout(SPLASH.t3); SPLASH.t3=setTimeout(()=>{ if(!SPLASH.on) el.classList.add('gone'); },900); }   // une fois la planète parti, plus rien ne tourne
  try{ sessionStorage.setItem('coopo_splash','1'); }catch(e){}   // page rechargée dans la même visite : entrée courte
  r.classList.remove('splash-on');   // l'appli apparaît par-dessus le décor
  if(!reduced()){ try{ // petite mise en scène d'arrivée : le dessin se pose, la page rejoue son animation d'entrée
    r.classList.add('world-in'); setTimeout(()=>r.classList.remove('world-in'),1300);
    const pg=app.firstElementChild; if(pg&&window.scrollY<4){ pg.classList.remove('page-in'); void pg.offsetWidth; pg.classList.add('page-in'); } }catch(e){} }
}
function splashSync(){
  if(!SPLASH.on||!SPLASH.armed) return;   // v22 — rien avant le démarrage (splashShow) : les fichiers du site arrivent l'un après l'autre
  const waited=performance.now()-SPLASH.t0;
  if(SPLASH.gaveUp || (!splashPending() && (SPLASH.fonts || waited>1800))){
    const landed = SPLASH.gaveUp || window.SPLASH_LANDED!==false;   // la planète doit être posée (le petit script de l'écran rappelle splashSync à ce moment-là)
    if(waited>=SPLASH.min && landed) splashHide(); else { clearTimeout(SPLASH.t2); SPLASH.t2=setTimeout(splashSync,Math.max(120,SPLASH.min-waited+20)); }
  } else if(splashPending()){ splashMsg(waited>5000?'La connexion est lente, encore un instant…':AUTH_SETTLED?'On prépare tes matchs…':'Connexion à ton compte…'); if(waited<=5000){ clearTimeout(SPLASH.t2); SPLASH.t2=setTimeout(splashSync,5050-waited); } }
  else { clearTimeout(SPLASH.t2); SPLASH.t2=setTimeout(splashSync,200); }   // on attend les polices (au plus 1,8 s)
}
try{ document.fonts.ready.then(()=>{ SPLASH.fonts=true; splashSync(); }); }catch(e){ SPLASH.fonts=true; }

let SIGNUP=null;   // inscription en cours : le pseudo et la date de naissance déjà saisis ne sont pas redemandés
function onSignedIn(u){
  try{ localStorage.setItem('coopo_known','1'); }catch(e){}
  if(SIGNUP){ if(!u.name) u={...u,name:SIGNUP.name}; S.dobs[u.uid]=SIGNUP.dob; }
  else if(!u.name && S.auth && S.auth.uid===u.uid && S.auth.name) u={...u,name:S.auth.name};   // ne jamais remplacer un nom connu par un nom vide
  const isNewSession = !S.auth || S.auth.uid!==u.uid;
  S.auth = { provider:'google', ...u };
  if(isNewSession){ const sk=S.skinByUser&&S.skinByUser[u.uid]; S.skinWanted=(sk&&SKINS[sk])?sk:'defaut'; applySkin(S.skinWanted); }   // le thème de CE compte (jamais celui d'un autre compte utilisé sur l'appareil)
  S.me = S.profiles[u.uid] || null;
  save();
  if(isNewSession) DB._loaded=false;   // nouveau compte sur cet appareil : rien n'est chargé tant que ses données ne sont pas arrivées
  if(DB.live && (isNewSession || (!DB._loaded && !DB._loading))) DB.loadAll();
  if(isNewSession){
    if(DB.live) splashShow('On prépare tes matchs…');
    toast(`Connecté en tant que ${u.name || u.email}`);
    let back=''; try{ back=sessionStorage.getItem('coopo_after_login')||''; sessionStorage.removeItem('coopo_after_login'); }catch(e){}
    // En ligne, on ne sait pas encore si le profil existe : on va à l'accueil (écran de chargement), et route() envoie vers la création du profil s'il n'y en a pas
    const target = (S.me || DB.live) ? (back||'#/accueil') : '#/profil';
    if(location.hash===target) route(); else location.hash=target;
  } else route();
}
// Fin de session : rien de l'ancien compte ne reste sur l'appareil (messages, notifications, demandes, profil, date de naissance)
function clearSession(){
  if(CALL) endCall('hangup');
  DB.stopChat(); DB.stopGroup(); DB._unsub.forEach(u=>u()); DB._unsub=[]; clearInterval(DB._hb); GROUPS=[]; GMSGS={}; DB._streakReady=false; DB._lastGroups=0;
  DB._loaded=false; DB._checked=false; DB._notifReady=false; DB._refWait=false; DB._miss={};
  S.auth=null; S.me=null; S.rewards=null; S.owned=null;
  if(AUTH_LIVE){ try{ localStorage.removeItem('coopo_cache'); }catch(e){} PLAYERS.length=0; ADMINS.length=0; ANNONCES=[]; TOURNOIS=[];
    S.requests=[]; S.notifs=[]; S.chats={}; S.unread={}; S.ratings={}; S.rated={}; S.blocked=[]; S.hidden=[]; S.banned=[]; S.reports=[]; S.squads=[]; S.joined=[]; S.profiles={}; S.dobs={}; S.streaks={}; S.gseen={}; S.flameSeen={}; S.flameNudged={}; S.pins=[]; S.seenBy={}; S.callLog=[]; }
  save(); splashSync();   // plus de compte à attendre : l'écran d'ouverture se retire
}
function onSignedOut(){ clearSession(); applySkin('defaut'); splashSync(); if(location.hash!=='#/connexion') location.hash='#/connexion'; else route(); }
async function signOut(){
  await DB.setPresence(false);
  if(AUTH_LIVE){ try{ google.accounts.id.disableAutoSelect(); }catch(e){} try{ await firebase.auth().signOut(); }catch(e){} }
  clearSession(); applySkin(S.skinWanted||'defaut'); toast('Tu es déconnecté');
  if(location.hash==='#/accueil') route(); else location.hash='#/accueil';
}
async function deleteGoogleAccount(){
  if(AUTH_LIVE && firebase.auth().currentUser){
    // Firebase n'accepte la suppression qu'après une connexion récente : on vérifie AVANT d'effacer les données
    try{ const tk=await firebase.auth().currentUser.getIdTokenResult(); if(Date.now()-Date.parse(tk.authTime)>4*60*1000){ toast('Par sécurité, déconnecte-toi puis reconnecte-toi, et recommence la suppression'); return false; } }
    catch(e){ toast('Suppression impossible pour le moment, réessaie'); return false; }
    if(!(await DB.deleteAccountData())){ toast('Suppression impossible pour le moment. Vérifie ta connexion et réessaie.'); return false; }
    try{ await firebase.auth().currentUser.delete(); }
    catch(e){ toast(e.code==='auth/requires-recent-login'?'Reconnecte-toi avec Google puis recommence':'Suppression impossible pour le moment, réessaie'); return false; }
  }
  return true;
}

// Mode démo : fenêtre qui simule le choix d'un compte Google
function demoGoogle(){
  modal(`<h3>Connexion Google</h3>
    <p class="muted">Mode démo : aucun vrai compte Google n'est utilisé. Une fois Firebase configuré, la vraie fenêtre Google s'ouvrira ici.</p>
    <div class="field" style="margin-top:16px"><label for="dg-name">Nom affiché sur le compte</label><input id="dg-name" type="text" value="Joueur Démo" maxlength="40"></div>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" id="dg-ok">Se connecter</button></div>`,
    d=>{ const go=()=>{ const n=d.querySelector('#dg-name').value.trim()||'Joueur Démo';
        const slug=suggestName(n).toLowerCase()||'joueur';
        d.close(); onSignedIn({ uid:'demo-'+slug, name:n, email:slug+'@exemple.com', photo:'' }); };
      d.querySelector('#dg-ok').onclick=go;
      d.querySelector('#dg-name').addEventListener('keydown',e=>{ if(e.key==='Enter') go(); }); });
}
document.addEventListener('click',e=>{ if(e.target.closest('.demo-g')) demoGoogle(); if(e.target.closest('[data-signout]')) signOut(); });

/* ----- Pages Inscription / Connexion ----- */
const EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const STEPS=['Crée ton compte','Ajoute tes jeux et horaires','Trouve ton mate'];

function viewAuth(mode){
  if(S.auth){ location.hash = S.me ? '#/matchs' : '#/profil'; return; }
  const su = mode==='signup';
  draft = { dob:'' };
  app.innerHTML=`<div class="wrap page"><div class="auth">
    <aside class="auth-side">
      <div class="auth-glow" aria-hidden="true"></div>
      <div class="auth-intro">
        <h1>${su?'Lance-toi avec nous':'Content de te revoir'}</h1>
        <p>${su?'Trois étapes rapides pour trouver ton prochain mate.':'Tes matchs et tes mates t\'attendent.'}</p>
      </div>
      <ol class="auth-steps">${STEPS.map((t,i)=>`<li style="--i:${i}" ${su&&i===0?'class="on" aria-current="step"':''}><span>${i+1}</span>${t}</li>`).join('')}</ol>
    </aside>
    <section class="auth-form">
      ${(()=>{ let r=''; try{ r=localStorage.getItem('coopo_ref')||''; }catch(e){} return su&&r?`<div class="invite-banner"><span class="ib-gift" aria-hidden="true">🎁</span><div><b>${esc(r)} t'invite sur Coopô</b><span>Crée ton compte pour jouer avec ${esc(r)} et trouver d'autres mates.</span></div></div>`:''; })()}
      <div class="auth-head"><h2>${su?'Créer un compte':'Connexion'}</h2>
        <p>${su?'Entre tes infos pour créer ton compte.':'Connecte-toi pour retrouver ton profil.'}</p></div>
      <div class="gbtn"></div>
      <div class="or"><span>ou</span></div>
      <form id="af" class="auth-fields" novalidate>
        ${su?`<div class="field"><label for="a-name">Nom d'utilisateur</label><input id="a-name" type="text" autocomplete="username" maxlength="${CONFIG.maxUsername}" placeholder="ex. KoffiNight"><small class="ferr" data-for="name"></small></div>`:''}
        <div class="field"><label for="a-mail">E-mail</label><input id="a-mail" type="email" autocomplete="email" placeholder="ton adresse e-mail"><small class="ferr" data-for="mail"></small></div>
        <div class="field"><label for="a-pw">Mot de passe</label>
          <div class="pw-wrap"><input id="a-pw" type="password" autocomplete="${su?'new-password':'current-password'}" placeholder="${su?'Choisis un mot de passe':'Ton mot de passe'}">
            <button type="button" class="pw-eye" aria-label="Afficher le mot de passe" aria-pressed="false">${EYE}</button></div>
          ${su?`<small class="hint">Au moins ${CONFIG.minPassword} caractères, avec une lettre et un chiffre.</small>`:`<button type="button" class="linkbtn forgot">Mot de passe oublié ?</button>`}
          <small class="ferr" data-for="pw"></small></div>
        ${su?`${dobField()}<small class="ferr" data-for="dob"></small>`:''}
        <button class="btn btn-ac btn-lg auth-submit" type="submit">${su?'Créer mon compte':'Se connecter'}</button>
        ${AUTH_LIVE?'':`<p class="hint demo-note">Mode démo : les comptes restent dans ce navigateur${su?'':' et le mot de passe n\'est pas vérifié'}.</p>`}
      </form>
      <p class="auth-switch">${su?'Déjà un compte ? <a href="#/connexion">Se connecter</a>':'Pas encore de compte ? <a href="#/inscription">Créer un compte</a>'}</p>
    </section></div></div>`;
  const pw=document.getElementById('a-pw'), eye=app.querySelector('.pw-eye');
  eye.onclick=()=>{ const show=pw.type==='password'; pw.type=show?'text':'password';
    eye.setAttribute('aria-pressed',show); eye.setAttribute('aria-label',show?'Masquer le mot de passe':'Afficher le mot de passe'); eye.innerHTML=show?EYE_OFF:EYE; pw.focus(); };
  if(su) initDob();
  app.querySelector('.forgot')?.addEventListener('click',forgotPw);
  app.querySelectorAll('#af input').forEach(i=>i.addEventListener('input',()=>{ i.classList.remove('invalid'); const k={ 'a-name':'name','a-mail':'mail','a-pw':'pw' }[i.id]; const e=app.querySelector(`.ferr[data-for="${k}"]`); if(e) e.textContent=''; }));
  document.getElementById('af').addEventListener('submit',e=>{ e.preventDefault(); su?doSignup():doLogin(); });
}
const aval = id => (document.getElementById(id)?.value||'').trim();
function showErrs(errs){
  app.querySelectorAll('.ferr').forEach(e=>e.textContent='');
  app.querySelectorAll('#af .invalid').forEach(e=>e.classList.remove('invalid'));
  const ids={name:'a-name',mail:'a-mail',pw:'a-pw'};
  Object.entries(errs).forEach(([k,msg])=>{ const e=app.querySelector(`.ferr[data-for="${k}"]`); if(e) e.textContent=msg; document.getElementById(ids[k])?.classList.add('invalid'); });
  const first=Object.keys(errs)[0]; if(first) (document.getElementById(ids[first])||app.querySelector('#dob-d'))?.focus();
  return Object.keys(errs).length>0;
}
function busy(on){ const b=app.querySelector('.auth-submit'); if(!b) return; b.disabled=on; b.dataset.label=b.dataset.label||b.textContent; b.textContent=on?'Un instant…':b.dataset.label; }
function authErr(err){
  const c=err&&err.code||'';
  if(c==='auth/email-already-in-use') return {mail:'Un compte existe déjà avec cet e-mail.'};
  if(c==='auth/invalid-email') return {mail:'Adresse e-mail invalide.'};
  if(c==='auth/weak-password') return {pw:'Mot de passe trop faible.'};
  if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-login-credentials'].includes(c)) return {pw:'E-mail ou mot de passe incorrect.'};
  if(c==='auth/too-many-requests') return {pw:'Trop de tentatives. La connexion est bloquée un moment : réessaie plus tard ou utilise « Mot de passe oublié ».'};
  if(c==='auth/network-request-failed') return {mail:OFFLINE_MSG};
  if(c==='auth/user-disabled') return {mail:'Ce compte a été désactivé.'};
  return {pw:'Une erreur est survenue. Réessaie.'};
}
const MAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OFFLINE_MSG="Coopô n'arrive pas à joindre ses serveurs. Vérifie ta connexion internet, puis réessaie.";
async function doSignup(){
  const name=aval('a-name'), mail=aval('a-mail').toLowerCase(), pw=document.getElementById('a-pw').value, dob=draft.dob, age=ageFrom(dob), e={};
  if(!new RegExp(`^[A-Za-z0-9_.-]{${CONFIG.minUsername},${CONFIG.maxUsername}}$`).test(name)) e.name=`${CONFIG.minUsername} à ${CONFIG.maxUsername} caractères : lettres, chiffres, _ . -`;
  else if(PLAYERS.some(p=>p.name.toLowerCase()===name.toLowerCase())) e.name="Ce nom d'utilisateur est déjà pris.";
  if(!MAIL_RE.test(mail)) e.mail='Entre une adresse e-mail valide.';
  if(pw.length<CONFIG.minPassword||!/[a-zA-Z]/.test(pw)||!/\d/.test(pw)) e.pw=`Au moins ${CONFIG.minPassword} caractères, avec une lettre et un chiffre.`;
  if(age===null) e.dob='Indique ta date de naissance.';
  else if(age<CONFIG.minAge) e.dob=`Tu dois avoir au moins ${CONFIG.minAge} ans pour utiliser Coopô.`;
  if(showErrs(e)) return;
  busy(true); SIGNUP={name,dob};
  try{
    if(AUTH_LIVE){
      if(!(await authReady())){ showErrs({mail:OFFLINE_MSG}); return; }
      const cred=await firebase.auth().createUserWithEmailAndPassword(mail,pw);
      await cred.user.updateProfile({ displayName:name });
      cred.user.sendEmailVerification().catch(e=>console.error(e));   // e-mail de vérification : confirme que l'adresse existe vraiment
      S.dobs[cred.user.uid]=dob; save();
      onSignedIn({ uid:cred.user.uid, name, email:mail, photo:'', provider:'password' });
    } else {
      if(S.accounts[mail]){ showErrs({mail:'Un compte existe déjà avec cet e-mail.'}); return; }
      const uid='local-'+mail; S.accounts[mail]={uid,name}; S.dobs[uid]=dob; save();
      onSignedIn({ uid, name, email:mail, photo:'', provider:'password' });
    }
  }catch(err){ if(!/^auth\//.test(String(err&&err.code))) console.error(err); showErrs(authErr(err)); }
  finally{ SIGNUP=null; busy(false); }
}
/* Trop d'essais de connexion ratés : on bloque la connexion à ce compte sur cet appareil pendant quelques heures.
   (Firebase bloque aussi de son côté les essais répétés, quel que soit l'appareil.) */
const LOGIN_MAX=5, LOGIN_LOCK_H=3, LOGIN_WINDOW_MIN=30;
const loginTries = () => { try{ return JSON.parse(localStorage.getItem('coopo_login_tries')||'{}')||{}; }catch(e){ return {}; } };
const loginTriesSave = t => { try{ localStorage.setItem('coopo_login_tries',JSON.stringify(t)); }catch(e){} };
function loginLockedUntil(mail){ const r=loginTries()[mail]; return r&&r.until>Date.now()?r.until:0; }
function loginLockMsg(until){ const min=Math.max(1,Math.ceil((until-Date.now())/60e3)); const h=Math.floor(min/60), m=min%60;
  return `Trop d'essais ratés. La connexion à ce compte est bloquée pendant encore ${[h?h+' h':'',m?m+' min':''].filter(Boolean).join(' ')}. Tu peux aussi utiliser « Mot de passe oublié ».`; }
function loginFailed(mail){ const t=loginTries(), now=Date.now(); let r=t[mail];
  if(!r||now-r.first>LOGIN_WINDOW_MIN*60e3) r={n:0,first:now,until:0};
  r.n++; if(r.n>=LOGIN_MAX){ r.until=now+LOGIN_LOCK_H*3600e3; r.n=0; r.first=now; }
  Object.keys(t).forEach(k=>{ if(k!==mail&&!(t[k].until>now)&&now-t[k].first>LOGIN_WINDOW_MIN*60e3) delete t[k]; });   // ménage des vieux compteurs
  t[mail]=r; loginTriesSave(t); return r; }
function loginOk(mail){ const t=loginTries(); if(t[mail]){ delete t[mail]; loginTriesSave(t); } }
async function doLogin(){
  const mail=aval('a-mail').toLowerCase(), pw=document.getElementById('a-pw').value, e={};
  if(!MAIL_RE.test(mail)) e.mail='Entre une adresse e-mail valide.';
  if(!pw) e.pw='Entre ton mot de passe.';
  if(showErrs(e)) return;
  const locked=loginLockedUntil(mail); if(locked){ showErrs({pw:loginLockMsg(locked)}); return; }
  busy(true);
  try{
    if(AUTH_LIVE){ if(!(await authReady())){ showErrs({mail:OFFLINE_MSG}); return; } await firebase.auth().signInWithEmailAndPassword(mail,pw); loginOk(mail); }
    else { const acc=S.accounts[mail]; if(!acc){ showErrs({mail:'Aucun compte avec cet e-mail.'}); return; }
      onSignedIn({ uid:acc.uid, name:acc.name, email:mail, photo:'', provider:'password' }); }
  }catch(err){ if(!/^auth\//.test(String(err&&err.code))) console.error(err);
    const c=String(err&&err.code||'');
    if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-login-credentials'].includes(c)){
      const r=loginFailed(mail);
      if(r.until>Date.now()){ showErrs({pw:loginLockMsg(r.until)}); return; }
      const left=LOGIN_MAX-r.n; showErrs({pw:`E-mail ou mot de passe incorrect.${left<=2?` Encore ${left} essai${left>1?'s':''} avant un blocage de ${LOGIN_LOCK_H} heures.`:''}`}); return; }
    showErrs(authErr(err)); }
  finally{ busy(false); }
}
async function forgotPw(){
  const mail=aval('a-mail').toLowerCase();
  if(!MAIL_RE.test(mail)){ showErrs({mail:'Entre ton e-mail pour recevoir un lien de réinitialisation.'}); return; }
  if(AUTH_LIVE){ if(!(await authReady())){ showErrs({mail:OFFLINE_MSG}); return; } try{ await firebase.auth().sendPasswordResetEmail(mail); }catch(e){} }
  toast(AUTH_LIVE?'Si un compte existe, un e-mail vient d\'être envoyé. Regarde aussi dans tes spams.':'Mode démo : aucun e-mail n\'est envoyé.',4000);
}
