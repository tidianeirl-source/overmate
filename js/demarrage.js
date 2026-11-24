/* Coopô — js/demarrage.js
   Démarrage : nettoyage du mode démo, présence, cache des joueurs, puis le premier affichage (route) et la connexion.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
// Site en ligne (Firebase configuré) : on retire tous les profils et groupes de démonstration
if(AUTH_LIVE){
  PLAYERS.length=0; DEMO_SQUADS.length=0; DEMO_ANNONCES.length=0; DEMO_TOURNOIS.length=0;
  const isDemo=id=>/^p\d+$/.test(String(id));
  S.requests=(S.requests||[]).filter(r=>!isDemo(r.from)&&!isDemo(r.to));
  S.notifs=(S.notifs||[]).filter(n=>!isDemo(n.from));
  Object.keys(S.chats||{}).forEach(k=>{ if(isDemo(k)) delete S.chats[k]; });
  Object.keys(S.unread||{}).forEach(k=>{ if(isDemo(k)) delete S.unread[k]; });
  Object.keys(S.ratings||{}).forEach(k=>{ if(isDemo(k)) delete S.ratings[k]; });
  ['blocked','hidden','banned'].forEach(k=>{ if(Array.isArray(S[k])) S[k]=S[k].filter(x=>!isDemo(x)); });
  S.reports=(S.reports||[]).filter(r=>!isDemo(r.id));
  S.joined=[]; save();
}
addEventListener('pagehide',()=>{ try{ DB.setPresence(false); }catch(e){} });   // fermeture ou changement de page (plus fiable sur téléphone que beforeunload)
document.addEventListener('visibilitychange',()=>{ if(!document.hidden && DB.live && S.me && Date.now()-(DB._lastPres||0)>60000) DB.setPresence(true); });   // retour sur l'onglet
// compte déjà connecté : on affiche tout de suite les joueurs et le statut de la dernière visite, puis on rafraîchit
try{ const c=JSON.parse(localStorage.getItem('coopo_cache')||'null'); if(AUTH_LIVE && c && S.auth && c.uid===S.auth.uid){ if(Array.isArray(c.players)){ PLAYERS.length=0; c.players.forEach(p=>PLAYERS.push(p)); } if(c.admin && !ADMINS.includes(c.uid)) ADMINS.push(c.uid); } }catch(e){}
applySkin(S.skinWanted||S.skin||'defaut');
route();
initAuth();
splashShow();
demoScheduleIncoming();
