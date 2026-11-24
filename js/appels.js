/* Coopô — js/appels.js
   Appels vocaux et vidéo (à deux et à plusieurs), sonnerie, haut-parleur.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* ---- Appels vocaux et vidéo ----
   Deux mates s'appellent directement, de téléphone à téléphone (WebRTC). Le son et l'image ne passent pas par Coopô.
   Pour se trouver, les deux téléphones s'échangent leurs réglages dans calls/{paire} :
     { parts, from, to, kind:'audio'|'video', status:'ringing'|'active'|'ended', offer, answer, at, why, endedBy }
   Un relais (réglé sur le serveur, page /turn) aide quand les deux réseaux ne se voient pas directement.
   Limite : l'appel ne sonne que si le mate a Coopô ouvert. */
const CALL_RING_S=50;   // v14 — 50 s (avant 40) : le temps d'ouvrir Coopô depuis la notification
let CALL=null;   // l'appel en cours : { id, pair, role:'out'|'in', kind, at, status, pc, stream, remote, ... }
const canCall = () => !!(window.RTCPeerConnection&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
const PHONE_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>';
const CAM_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="13" height="12" rx="3"/><path d="M15.5 10.5l6-3.5v10l-6-3.5"/></svg>';
const HANG_SVG=PHONE_SVG.replace('<svg ','<svg style="transform:rotate(135deg)" ');
// v7 — entre un adulte et un 13-17 ans : appel vocal seulement (pas de bouton vidéo)
const callBtns = p => canCall()&&AUTH_LIVE ? `<div class="chat-calls"><button class="btn call-btn" type="button" data-call="audio" aria-label="Appel vocal" title="Appel vocal">${PHONE_SVG}</button>${p&&crossAge(p)?'':`<button class="btn call-btn" type="button" data-call="video" aria-label="Appel vidéo" title="Appel vidéo">${CAM_SVG}</button>`}</div>` : '';
// Adresses qui aident les deux téléphones à se trouver. Sans relais réglé, on garde l'aide de base (suffit en Wi-Fi, pas toujours en 4G).
async function iceServers(){ const base=[{urls:'stun:stun.l.google.com:19302'}];
  try{ if(!SHOP.api) return base; const u=firebase.auth().currentUser; if(!u) return base; const tk=await u.getIdToken();
    const r=await Promise.race([fetch(SHOP.api.replace(/\/$/,'')+'/turn',{headers:{Authorization:'Bearer '+tk}}),new Promise((_,no)=>setTimeout(()=>no(new Error('lent')),4000))]);
    const j=await r.json(); if(r.ok&&Array.isArray(j.iceServers)&&j.iceServers.length) return j.iceServers; }catch(e){}
  return base; }
const iceDone = (pc,ms=2500) => new Promise(res=>{ if(pc.iceGatheringState==='complete') return res(); const t=setTimeout(res,ms);
  pc.addEventListener('icegatheringstatechange',()=>{ if(pc.iceGatheringState==='complete'){ clearTimeout(t); res(); } }); });
const callMedia = kind => navigator.mediaDevices.getUserMedia(kind==='video'?{audio:true,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}}:{audio:true});
const callMediaErr = (e,kind) => toast(e&&e.name==='NotAllowedError'?`Autorise le micro${kind==='video'?' et la caméra':''} dans ton navigateur pour appeler.`:`Le micro${kind==='video'?' ou la caméra':''} n'est pas disponible sur cet appareil.`,4500);
/* v15 — Appel à plusieurs (vocal, 4 personnes au plus). Pendant un appel vocal, chacun peut ajouter un de ses mates.
   Celui qui ajoute appelle ce mate comme d'habitude (calls/{paire}), sans raccrocher : il a alors un lien avec chacun, et il relie les autres entre eux.
   Chaque mate reçoit sa voix mélangée à celles des autres (jamais la sienne). Rien ne change dans la base : chaque lien est un appel à deux entre mates.
   L'appel = c (le premier lien : c.id, c.pair, c.pc…) + c.extra (les liens ajoutés, de la même forme). Si celui qui relie raccroche, les autres sont séparés.
   Un petit canal (c.dc) permet à chacun de dire à ses voisins qui est dans l'appel : pour afficher les noms, et pour s'arrêter à 4. */
const CALL_MAX=4, LINK_KEYS=['id','pair','at','pc','remote','sent','answered','status','lost','ringT','src','srcOf','srcTo','out','behind','dc','tA','logged'];
const callLinks = c => [c,...(c.extra||[])];
const linkOf = (c,pc) => callLinks(c).find(x=>x.pc===pc);
const callAge = id => { const p=PLAYERS.find(x=>x.id===id); return p?ageGroup(p):''; };
// Les autres personnes de l'appel, telles que je les connais : [{ id, n (nom), g (âge), ring (ça sonne encore) }]
function callOthers(c){ const out=[]; callLinks(c).forEach(L=>{ const ring=L!==c&&L.status!=='active';
    (L.behind&&L.behind.length&&!ring?L.behind:[{id:L.id}]).forEach(x=>{ if(!out.some(y=>y.id===x.id)) out.push({...x,ring}); }); }); return out; }
function rosterSend(c,except){ if(CALL!==c) return; const me={id:DB.uid(),n:String((S.me&&S.me.name)||'').slice(0,40),g:myGroupNow()};
  callLinks(c).forEach(L=>{ if(L===except||!L.dc||L.dc.readyState!=='open') return; const r=[me];
    callLinks(c).forEach(X=>{ if(X===L||(X!==c&&X.status!=='active')) return; (X.behind&&X.behind.length?X.behind:[{id:X.id,n:callName(X),g:callAge(X.id)}]).forEach(x=>{ if(!r.some(y=>y.id===x.id)) r.push(x); }); });
    try{ L.dc.send(JSON.stringify({r})); }catch(e){} }); }
function rosterWire(c,pc,dc){ dc.onopen=()=>rosterSend(c);
  dc.onmessage=e=>{ const L=linkOf(c,pc); if(CALL!==c||!L) return;
    try{ const j=JSON.parse(String(e.data).slice(0,4000)); if(!j||!Array.isArray(j.r)) return; const me=DB.uid();
      const list=j.r.slice(0,8).filter(x=>x&&typeof x.id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x.id)&&x.id!==me).map(x=>({id:x.id,n:String(x.n||'').slice(0,40),g:x.g==='minor'||x.g==='adult'?x.g:''}));
      if(!list.some(x=>x.id===L.id)) list.unshift({id:L.id,n:callName(L),g:callAge(L.id)});
      L.behind=list; rosterSend(c,L); renderCall(); }catch(er){} };
  return dc; }
// Le mélange des voix : ce que j'envoie à chacun = mon micro + les voix des autres
function mixOut(c,L){ const cx=sndCtx(); if(!c.mix) c.mix={mic:cx.createMediaStreamSource(new MediaStream(c.stream.getAudioTracks()))};
  if(!L.out){ L.out=cx.createMediaStreamDestination(); c.mix.mic.connect(L.out); }
  return L.out.stream.getAudioTracks()[0]; }
function mixSync(c){ if(!c.mix) return; const cx=sndCtx(); if(!cx) return; const ls=callLinks(c);
  ls.forEach(L=>{ if(L.remote&&L.srcOf!==L.remote){ try{ L.src&&L.src.disconnect(); }catch(e){} try{ L.src=cx.createMediaStreamSource(L.remote); L.srcOf=L.remote; L.srcTo=[]; }catch(e){ L.src=null; } } });
  ls.forEach(A=>{ if(!A.src) return; ls.forEach(B=>{ if(B===A||!B.out||A.srcTo.includes(B.out)) return; try{ A.src.connect(B.out); A.srcTo.push(B.out); }catch(e){} }); }); }
// Un lien s'arrête (pas de réponse, connexion impossible) : s'il était le seul, l'appel se termine ; sinon l'appel continue avec les autres
function linkEnd(c,pc,why){ const L=linkOf(c,pc); if(CALL!==c||!L) return; if(L===c&&!(c.extra||[]).length) endCall(why); else dropLink(c,L,why,true); }
function dropLink(c,L,why,tell,quiet){ if(CALL!==c||!callLinks(c).includes(L)) return; const name=callName(L), wasLive=L.status==='active';
  const upd=tell&&(L.sent||(L===c&&c.role==='in')) ? DB.db.collection('calls').doc(L.pair).update({status:'ended',why:why||'hangup',endedBy:DB.uid()}).catch(e=>console.error(e)) : null;
  if(L.sent&&!wasLive&&!L.answered&&!(L===c&&c.role==='in')){ const x={id:L.id,at:L.at}; (upd||Promise.resolve()).then(()=>pushCall(x,'end')); }   // il n'a pas décroché : sa notification devient « Appel manqué »
  callDone(c,L,why||'hangup');   // v16 — historique
  clearTimeout(L.ringT); try{ L.src&&L.src.disconnect(); }catch(e){} try{ L.out&&c.mix&&c.mix.mic.disconnect(L.out); }catch(e){} try{ L.pc&&L.pc.close(); }catch(e){}
  if(L===c){ const N=c.extra.find(x=>x.status==='active')||c.extra[0]; c.extra=c.extra.filter(x=>x!==N); LINK_KEYS.forEach(k=>{ c[k]=N[k]; }); c.role='out'; }   // le premier lien est parti : un autre prend sa place
  else c.extra=c.extra.filter(x=>x!==L);
  if(!quiet) toast(wasLive?`${name} a quitté l'appel.`:why==='noanswer'?`${name} n'a pas répondu.`:why==='busy'?`${name} est déjà en appel.`:why==='refused'?`${name} a refusé l'appel.`:`${name} n'a pas pu rejoindre l'appel.`,3000);
  rosterSend(c); renderCall(); callAttach(); }
// Entre un adulte et un 13-17 ans qui ne sont pas forcément mates : pas dans le même appel
const callAgeClash = (c,p) => callOthers(c).some(x=>{ const g=x.g||callAge(x.id); return g&&g!==ageGroup(p); });
const callCanAdd = c => !!c&&c.kind==='audio'&&c.status==='active'&&1+callOthers(c).length<CALL_MAX&&!!(window.AudioContext||window.webkitAudioContext);
async function addToCall(id){ const c=CALL; if(!c||c.kind!=='audio'||c.status!=='active') return;
  if(1+callOthers(c).length>=CALL_MAX){ toast(`${CALL_MAX} personnes au plus dans un appel.`); return; }
  if(callOthers(c).some(x=>x.id===id)) return;
  const p=PLAYERS.find(x=>x.id===id); if(!p||!isMate(id)){ toast("Vous n'êtes pas encore mates."); return; }
  if(callAgeClash(c,p)){ toast("Pour la sécurité des 13-17 ans, un adulte et un 13-17 ans ne peuvent pas être réunis dans cet appel.",4500); return; }
  if(!sndCtx()){ toast("Ce navigateur ne permet pas les appels à plusieurs."); return; }
  const L={id,pair:DB.pairId(id),at:Date.now(),status:'calling'}; (c.extra=c.extra||[]).push(L); renderCall();
  const on=()=>CALL===c&&(c.extra||[]).includes(L);
  try{ const servers=await iceServers(); if(!on()) return;
    if(!c.mix){ const sd=c.pc.getSenders().find(x=>x.track&&x.track.kind==='audio'); if(sd) await sd.replaceTrack(mixOut(c,c)); mixSync(c); }   // ma voix part désormais mélangée à celles des autres
    if(!on()) return;
    const pc=callPc(c,servers,L); const offer=await pc.createOffer(); await pc.setLocalDescription(offer); await iceDone(pc); if(!on()) return;
    const me=DB.uid(); await DB.db.collection('calls').doc(L.pair).set({parts:[me,id].sort(),from:me,to:id,kind:'audio',status:'ringing',offer:{type:'offer',sdp:pc.localDescription.sdp},at:L.at});
    if(!on()) return; L.sent=true; L.status='ringing'; renderCall(); pushCall({id:L.id,at:L.at},'ring');
    L.ringT=setTimeout(()=>{ const X=linkOf(c,pc); if(X&&X.status!=='active') linkEnd(c,pc,'noanswer'); },CALL_RING_S*1000); }
  catch(e){ console.error(e); if(on()){ dropLink(c,L,'fail',false,true); toast("Ce mate n'a pas pu être appelé. Réessaie dans un instant.",3500); } } }
// L = le lien à créer (par défaut le premier : c lui-même)
function callPc(c,servers,L=c){ const pc=L.pc=new RTCPeerConnection({iceServers:servers});
  if(L===c) c.stream.getTracks().forEach(t=>pc.addTrack(t,c.stream)); else pc.addTrack(mixOut(c,L),c.stream);
  try{ L.dc=rosterWire(c,pc,pc.createDataChannel('coopo',{negotiated:true,id:0})); }catch(e){}   // v15 — le petit canal « qui est dans l'appel »
  pc.ontrack=e=>{ const X=linkOf(c,pc); if(!X) return; X.remote=e.streams[0]||new MediaStream([e.track]); callAttach(); mixSync(c); };
  pc.onconnectionstatechange=()=>{ const X=linkOf(c,pc); if(CALL!==c||!X) return; const st=pc.connectionState;
    if(st==='connected'){ if(X.status!=='active'){ X.status='active'; X.tA=X.tA||Date.now(); c.t0=c.t0||Date.now(); clearTimeout(X.ringT); if(X===c) callRing(false); mixSync(c); rosterSend(c); } X.lost=false; renderCall(); }
    else if(st==='disconnected'){ X.lost=true; renderCall(); }
    else if(st==='failed'){ linkEnd(c,pc,'fail'); } };
  return pc; }
// Lancer un appel
async function startCall(id,kind){
  if(CALL){ toast('Tu es déjà en appel.'); return; }
  if(!canCall()){ toast("Les appels ne sont pas possibles sur ce navigateur."); return; }
  if(!DB.live&&!(await DB.ready())) return;
  if(!isMate(id)){ toast("Vous n'êtes pas encore mates."); return; }
  if(kind==='video'&&crossAge(PLAYERS.find(x=>x.id===id))){ toast('Entre un adulte et un 13-17 ans, seuls les appels vocaux sont possibles.',3500); return; }   // v7
  const c=CALL={id,pair:DB.pairId(id),role:'out',kind,at:Date.now(),status:'calling',muted:false,camOff:false}; renderCall();
  try{ c.stream=await callMedia(kind); }catch(e){ if(CALL===c){ closeCall(); callMediaErr(e,kind); } return; }
  if(CALL!==c){ c.stream.getTracks().forEach(t=>t.stop()); return; }
  callAttach();
  try{ const pc=callPc(c,await iceServers()); const offer=await pc.createOffer(); await pc.setLocalDescription(offer); await iceDone(pc); if(CALL!==c) return;
    const me=DB.uid(); await DB.db.collection('calls').doc(c.pair).set({parts:[me,id].sort(),from:me,to:id,kind,status:'ringing',offer:{type:'offer',sdp:pc.localDescription.sdp},at:c.at});
    if(CALL!==c) return; c.sent=true; c.status='ringing'; renderCall(); callRing(true,true); pushCall(c,'ring');   // v14 — fait sonner les appareils du mate, même Coopô fermée
    c.ringT=setTimeout(()=>{ if(CALL===c&&c.status!=='active') endCall('noanswer'); },CALL_RING_S*1000); }
  catch(e){ console.error(e); if(CALL===c){ closeCall(); toast("L'appel n'a pas pu démarrer. Réessaie dans un instant.",3500); } } }
// Répondre
async function acceptCall(){ const c=CALL; if(!c||c.role!=='in'||c.status!=='ringing') return; c.status='connecting'; callRing(false); callNotify(c,'end'); renderCall();
  try{ c.stream=await callMedia(c.kind); }catch(e){ if(CALL===c){ endCall('refused'); callMediaErr(e,c.kind); } return; }
  if(CALL!==c){ c.stream.getTracks().forEach(t=>t.stop()); return; }
  callAttach();
  try{ const pc=callPc(c,await iceServers()); await pc.setRemoteDescription(c.offer); const ans=await pc.createAnswer(); await pc.setLocalDescription(ans); await iceDone(pc); if(CALL!==c) return;
    await DB.db.collection('calls').doc(c.pair).update({status:'active',answer:{type:'answer',sdp:pc.localDescription.sdp}});
    c.ringT=setTimeout(()=>{ if(CALL===c&&c.status!=='active') endCall('fail'); },20000); }
  catch(e){ console.error(e); if(CALL===c) endCall('fail'); } }
// Raccrocher, refuser, ou fin automatique. On prévient l'autre téléphone, puis on ferme tout.
const CALL_WHY={ hangup:'Appel terminé.', refused:'Appel refusé.', noanswer:'Pas de réponse.', busy:'Ton mate est déjà en appel.', fail:"La connexion n'a pas pu s'établir. Réessaie, si possible en Wi-Fi." };
function endCall(why){ const c=CALL; if(!c) return;
  const upd=(c.role==='in'||c.sent) ? DB.db.collection('calls').doc(c.pair).update({status:'ended',why,endedBy:DB.uid()}).catch(e=>console.error(e)) : null;
  (c.extra||[]).forEach(L=>{ if(!L.sent) return; const u=DB.db.collection('calls').doc(L.pair).update({status:'ended',why:'hangup',endedBy:DB.uid()}).catch(e=>console.error(e));   // v15 — les mates ajoutés sont prévenus aussi
    if(L.status!=='active'&&!L.answered){ const x={id:L.id,at:L.at}; u.then(()=>pushCall(x,'end')); } });
  closeCall(c.role==='in'&&why==='refused'?'':c.role==='out'&&why==='hangup'&&c.status!=='active'?'Appel annulé.':CALL_WHY[why]||CALL_WHY.hangup, why, upd); }
// why : pourquoi l'appel s'arrête ; upd : l'enregistrement « terminé » en cours (on attend qu'il soit fait avant de prévenir le serveur)
function closeCall(msg,why,upd){ const c=CALL; if(!c) return; CALL=null; clearTimeout(c.ringT); clearInterval(c.tick); callRing(false);
  callDone(c,c,why); (c.extra||[]).forEach(L=>callDone(c,L,'hangup'));   // v16 — historique
  // v14 — notifications : on enlève la sonnerie affichée ; un appel reçu qui n'a pas été décroché (ni refusé) devient « Appel manqué »
  callNotify(c,c.role==='in'&&c.status==='ringing'&&why!=='refused'&&why!=='elsewhere'?'missed':'end');
  if(c.role==='out'&&c.sent&&c.status!=='active'&&!c.answered) (upd||Promise.resolve()).then(()=>pushCall(c,'end'));
  try{ c.stream&&c.stream.getTracks().forEach(t=>t.stop()); }catch(e){} try{ c.pc&&c.pc.close(); }catch(e){}
  (c.extra||[]).forEach(L=>{ clearTimeout(L.ringT); try{ L.pc&&L.pc.close(); }catch(e){} }); c.extra=[];   // v15
  if(c.mix){ callLinks(c).forEach(L=>{ try{ L.src&&L.src.disconnect(); }catch(e){} }); try{ c.mix.mic.disconnect(); }catch(e){} c.mix=null; sndRest(); }
  const ov=document.getElementById('call-ov'); if(ov) ov.remove(); if(msg) toast(msg,3000); }
// Ce que dit le document d'appel (reçu en direct de la base)
function onCallDoc(pair,d){ if(!d) return; const me=DB.uid(), c=CALL;
  const L=c&&callLinks(c).find(x=>x.pair===pair&&x.at===d.at);   // v15 — le lien concerné : le premier, ou un mate ajouté
  if(L){ const why=d.why==='refused'||d.why==='busy'||d.why==='fail'?d.why:'';
    if(L===c&&c.role==='in'&&c.status==='ringing'&&d.status==='active'){ closeCall('Appel pris sur un autre appareil.','elsewhere'); return; }   // v16
    if(d.status==='ended'&&d.endedBy!==me){
      if(L===c&&!(c.extra||[]).length) closeCall(c.role==='in'&&c.status==='ringing'?'':CALL_WHY[why||'hangup'],why||'remote');
      else dropLink(c,L,why,false);   // un mate quitte l'appel : il continue avec les autres
      return; }
    if((L!==c||c.role==='out')&&d.status==='active'&&d.answer&&!L.answered&&L.pc){ const pc=L.pc; L.answered=true; if(L===c) callRing(false); L.status='connecting'; renderCall();
      pc.setRemoteDescription(d.answer).catch(e=>{ console.error(e); linkEnd(c,pc,'fail'); });
      clearTimeout(L.ringT); L.ringT=setTimeout(()=>{ const X=linkOf(c,pc); if(X&&X.status!=='active') linkEnd(c,pc,'fail'); },20000); }
    return; }
  if(d.to!==me||d.status!=='ringing'||Math.abs(Date.now()-d.at)>CALL_RING_S*1000) return;   // pas pour moi, ou trop vieux
  if(c){ if(c.pair!==pair||c.at!==d.at) DB.db.collection('calls').doc(pair).update({status:'ended',why:'busy',endedBy:me}).catch(()=>{}); return; }
  if(!isMate(d.from)||!d.offer) return;
  if(d.kind==='video'&&crossAge(PLAYERS.find(x=>x.id===d.from))){ DB.db.collection('calls').doc(pair).update({status:'ended',why:'refused',endedBy:me}).catch(()=>{}); return; }   // v7 — pas de vidéo entre âges différents
  const n=CALL={id:d.from,pair,role:'in',kind:d.kind==='video'?'video':'audio',at:d.at,status:'ringing',offer:d.offer,muted:false,camOff:false};
  n.ringT=setTimeout(()=>{ if(CALL===n&&n.status==='ringing') closeCall('Appel manqué.','noanswer'); },Math.max(3000,CALL_RING_S*1000-(Date.now()-d.at)));
  renderCall(); callRing(true); callNotify(n,'ring'); }
/* ---- v14 — Sons de Coopô : la sonnerie d'un appel qui arrive, et « ça sonne » chez celui qui appelle ----
   Le navigateur ne laisse jouer un son qu'après un premier appui sur l'écran : on prépare le son dès ce premier appui,
   sinon la sonnerie d'un appel qui arrive plus tard resterait muette (surtout sur iPhone). Le son se met en veille quand il ne sert pas. */
let ACX=null, ACX_T=0;
function sndCtx(){ try{ if(!ACX){ const A=window.AudioContext||window.webkitAudioContext; if(!A) return null; ACX=new A(); } if(ACX.state!=='running'&&ACX.state!=='closed') ACX.resume().catch(()=>{}); return ACX; }catch(e){ return null; } }
function sndRest(){ clearTimeout(ACX_T); ACX_T=setTimeout(()=>{ if(!RING&&!(CALL&&CALL.mix)&&ACX&&ACX.state==='running') ACX.suspend().catch(()=>{}); },8000); }   // v15 — pas de veille pendant un appel à plusieurs (le son sert au mélange des voix)
{ let ready=false; const prep=()=>{ if(ready&&(!RING||!ACX||ACX.state==='running')) return; const c=sndCtx(); if(!c) return; ready=true;
    try{ const b=c.createBuffer(1,1,22050), src=c.createBufferSource(); src.buffer=b; src.connect(c.destination); src.start(0); }catch(e){} sndRest(); };
  addEventListener('pointerdown',prep,{capture:true,passive:true}); addEventListener('keydown',prep,true); }
// Sonnerie : une petite mélodie façon marimba toutes les 2,6 secondes, et des vibrations (Android)
const RING_TUNE=[[0,659.3],[.15,784],[.3,1046.5],[.45,784],[.62,880],[.82,1046.5]];
function ringTune(c,out,t){ RING_TUNE.forEach(([d,f])=>[[1,.32,.5],[3.98,.06,.16],[10.2,.015,.05]].forEach(([k,a,len])=>{ const o=c.createOscillator(), g=c.createGain(), t0=t+d;
    o.frequency.value=f*k; g.gain.setValueAtTime(.0001,t0); g.gain.exponentialRampToValueAtTime(a,t0+.006); g.gain.exponentialRampToValueAtTime(.0001,t0+len);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0+len+.03); })); }
// « Ça sonne » : un « tuut » doux d'une seconde toutes les 4 secondes
function ringBack(c,out,t){ const o=c.createOscillator(), g=c.createGain(); o.frequency.value=425;
  g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.09,t+.05); g.gain.setValueAtTime(.09,t+1.15); g.gain.exponentialRampToValueAtTime(.0001,t+1.25);
  o.connect(g); g.connect(out); o.start(t); o.stop(t+1.3); }
let RING=null;
function callRing(on,soft){
  if(RING){ clearInterval(RING.t); try{ RING.out&&RING.out.disconnect(); }catch(e){} RING=null; try{ navigator.vibrate&&navigator.vibrate(0); }catch(e){} sndRest(); }
  if(!on) return;
  const r=RING={t:0,out:null,soft:!!soft}, c=sndCtx();
  const play=()=>{ if(RING!==r) return; const cx=sndCtx();
    if(cx&&cx.state==='running'){ try{ if(!r.out){ r.out=cx.createGain(); r.out.gain.value=.55; r.out.connect(cx.destination); } (soft?ringBack:ringTune)(cx,r.out,cx.currentTime+.04); r.played=(r.played||0)+1; }catch(e){} }
    if(!soft){ try{ navigator.vibrate&&navigator.vibrate([400,200,400]); }catch(e){} } };
  r.t=setInterval(play,soft?4000:2600);
  if(c&&c.state!=='running') c.resume().then(play,play); else play(); }
/* ---- v14 — Notification de l'appareil pour un appel, quand Coopô est ouverte mais cachée (autre onglet, écran verrouillé…) ----
   Quand Coopô est fermée, c'est le serveur qui fait sonner le téléphone (notification « push », voir pushCall). */
const callName = c => { const p=visible().find(x=>x.id===c.id)||S.profiles[c.id]; return (p&&p.name)||'Ton mate'; };
async function callNotify(c,step){ try{
  if(!('Notification' in window)||Notification.permission!=='granted'||!S.notifyOn) return;
  const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration(); if(!reg||!reg.showNotification) return;
  const tag='call-'+c.pair, url=location.origin+location.pathname+'#/messages/'+c.id, icon='icons/v2/icon-192.png', badge='icons/v2/badge-96.png';   // badge : la petite silhouette blanche de la barre d'état d'Android
  if(step==='ring'){ if(!document.hidden||(await reg.getNotifications({tag})).length) return;
    await reg.showNotification(`${c.kind==='video'?'Appel vidéo':'Appel vocal'} de ${callName(c)}`,{body:'Touche pour répondre',tag,renotify:true,requireInteraction:true,vibrate:[400,200,400,200,400],icon,badge,timestamp:c.at,data:{url}}); return; }
  (await reg.getNotifications({tag})).forEach(n=>n.close());
  if(step==='missed'&&document.hidden) await reg.showNotification('Appel manqué',{body:`${callName(c)} a essayé de t'appeler.`,tag:'missed-'+c.pair,icon,badge,timestamp:c.at,data:{url}});
}catch(e){} }
/* ---- v16 — Haut-parleur ----
   Un site ne peut choisir où sort le son que si le navigateur lui montre les sorties du téléphone (haut-parleur, écouteur du haut).
   Quand c'est le cas, un bouton « Haut-parleur » apparaît pendant l'appel. Sinon, pas de bouton : le téléphone choisit seul. */
const SPK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/></svg>';
async function callOuts(c){ try{ if(c.outs!==undefined||!('setSinkId' in HTMLMediaElement.prototype)||!navigator.mediaDevices.enumerateDevices){ c.outs=c.outs||null; return; } c.outs=null;
    const ds=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audiooutput'&&d.deviceId&&d.deviceId!=='default'&&d.deviceId!=='communications');
    const spk=ds.find(d=>/speaker|haut[- ]?parleur/i.test(d.label)), ear=ds.find(d=>/earpiece|receiver|handset|[ée]couteur|iphone/i.test(d.label));
    if(spk&&ear&&CALL===c){ c.outs={spk:spk.deviceId,ear:ear.deviceId}; renderCall(); } }catch(e){ c.outs=null; } }
function callSink(c){ if(!c.outs||c.spk===undefined) return; const id=c.spk?c.outs.spk:c.outs.ear;
  document.querySelectorAll('#call-ov audio, #call-ov #call-remote').forEach(el=>{ if(el.sinkId!==id&&el.setSinkId) el.setSinkId(id).catch(()=>{}); }); }
// L'écran d'appel (posé par-dessus tout le site : il reste si on change de page)
function callAttach(){ const c=CALL; if(!c) return; const r=document.getElementById(c.kind==='video'?'call-remote':'call-audio'), l=document.getElementById('call-local');
  if(r&&c.remote&&r.srcObject!==c.remote){ r.srcObject=c.remote; r.play&&r.play().catch(()=>{}); } if(l&&c.stream&&l.srcObject!==c.stream){ l.srcObject=c.stream; l.play&&l.play().catch(()=>{}); }
  document.querySelectorAll('#call-ov audio[data-ca]').forEach(a=>{ const L=(c.extra||[])[+a.dataset.ca]; if(L&&L.remote&&a.srcObject!==L.remote){ a.srcObject=L.remote; a.play&&a.play().catch(()=>{}); } });
  callSink(c); if(c.status==='active'&&c.outs===undefined) callOuts(c); }   // v15 — les mates ajoutés ; v16 — haut-parleur
function renderCall(){ const c=CALL; if(!c) return; let ov=document.getElementById('call-ov'); if(!ov){ ov=document.createElement('div'); ov.id='call-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); document.body.appendChild(ov); }
  const p=visible().find(x=>x.id===c.id)||S.profiles[c.id]||{id:c.id,name:'Ton mate'}, live=c.status==='active', video=c.kind==='video';
  const state=()=>c.lost?'Reconnexion…':live?vTime((Date.now()-c.t0)/1000):c.status==='calling'?'Préparation de l\'appel…':c.status==='connecting'?'Connexion…':c.role==='in'?(video?'Appel vidéo entrant':'Appel vocal entrant'):'Ça sonne…';
  const b=(act,cls,label,svg)=>`<button class="co-b ${cls}" type="button" data-co="${act}"><i>${svg}</i><span>${label}</span></button>`;
  // v15 — appel à plusieurs : un rond par personne ; « Ajouter » ouvre la liste de mes mates
  const others=callOthers(c), multi=!video&&others.length>1, who=x=>visible().find(y=>y.id===x.id)||PLAYERS.find(y=>y.id===x.id)||S.profiles[x.id]||{id:x.id,name:x.n||'Un joueur'};
  const pick=c.picking&&callCanAdd(c) ? matesList().filter(m=>!others.some(x=>x.id===m.id)&&!callAgeClash(c,m)).sort((a,b)=>(isOnline(b)-isOnline(a))||String(a.name).localeCompare(String(b.name),'fr')) : null;
  if(!pick) c.picking=false;
  const hadPick=!!ov.querySelector('.co-pick'), py=hadPick?ov.querySelector('.co-pick-list').scrollTop:0;
  ov.className=(video?'video':'audio')+(live?' live':''); ov.setAttribute('aria-label',multi?`Appel à ${others.length+1}`:`Appel avec ${p.name||'ton mate'}`);
  ov.innerHTML=`${video?`<video id="call-remote" autoplay playsinline></video><video id="call-local" autoplay playsinline muted${c.stream?'':' hidden'}></video>`:'<audio id="call-audio" autoplay></audio>'+(c.extra||[]).map((L,i)=>`<audio data-ca="${i}" autoplay></audio>`).join('')}
    ${multi?`<div class="co-who multi"><div class="co-grid">${others.map(x=>{ const q=who(x); return `<div class="co-p${x.ring?' ring':''}">${avatar(q,72)}<span>${esc(q.name||'Un joueur')}</span>${x.ring?'<small>Ça sonne…</small>':''}</div>`; }).join('')}</div><div><b>Appel à ${others.length+1}</b><div class="co-state" id="co-state" aria-live="polite">${state()}</div></div></div>`
      :`<div class="co-who">${avatar(p,96)}<div><b>${esc(p.name||'Ton mate')}</b><div class="co-state" id="co-state" aria-live="polite">${state()}</div></div></div>`}
    <div class="co-btns">${c.role==='in'&&c.status==='ringing' ? b('no','end','Refuser',HANG_SVG)+b('yes','yes','Répondre',video?CAM_SVG:PHONE_SVG)
      : b('mute',c.muted?'off':'',c.muted?'Micro coupé':'Micro',MIC_SVG)+(video?b('cam',c.camOff?'off':'',c.camOff?'Caméra coupée':'Caméra',CAM_SVG):'')+(c.outs?b('spk',c.spk?'off':'',c.spk?'Haut-parleur activé':'Haut-parleur',SPK_SVG):'')+(callCanAdd(c)?b('add',c.picking?'off':'','Ajouter',ADDMATE_SVG):'')+b('end','end','Raccrocher',HANG_SVG)}</div>
    ${pick?`<div class="co-pick" role="dialog" aria-label="Ajouter un mate à l'appel"><div class="co-pick-head"><h3>Ajouter un mate</h3><button type="button" class="co-pick-x" data-co="pickx" aria-label="Fermer la liste">×</button></div>
      <p>${pick.length?`Il reçoit ton appel et rejoint la discussion. ${CALL_MAX} personnes au plus.`:'Aucun autre mate à ajouter pour le moment.'}</p>
      <div class="co-pick-list">${pick.map(m=>`<button type="button" class="co-pick-row" data-co-add="${esc(m.id)}">${avatar(m,40)}<b>${esc(m.name)}</b>${isOnline(m)?'<small>En ligne</small>':''}</button>`).join('')}</div></div>`:''}`;
  if(pick){ const pl=ov.querySelector('.co-pick-list'); pl.scrollTop=py; if(!hadPick) (pl.querySelector('button')||ov.querySelector('.co-pick-x')).focus(); }
  ov.querySelectorAll('[data-co-add]').forEach(x=>x.onclick=()=>{ c.picking=false; addToCall(x.dataset.coAdd); if(CALL===c) renderCall(); });
  ov.querySelectorAll('[data-co]').forEach(x=>x.onclick=()=>{ const a=x.dataset.co;
    if(a==='spk'){ c.spk=!c.spk; renderCall(); return; }
    if(a==='add'){ c.picking=!c.picking; renderCall(); return; } if(a==='pickx'){ c.picking=false; renderCall(); ov.querySelector('[data-co="add"]')?.focus(); return; }
    if(a==='yes') acceptCall(); else if(a==='no') endCall('refused'); else if(a==='end') endCall('hangup');
    else if(a==='mute'){ c.muted=!c.muted; c.stream&&c.stream.getAudioTracks().forEach(t=>t.enabled=!c.muted); renderCall(); }
    else if(a==='cam'){ c.camOff=!c.camOff; c.stream&&c.stream.getVideoTracks().forEach(t=>t.enabled=!c.camOff); renderCall(); } });
  callAttach(); clearInterval(c.tick); c.tick=setInterval(()=>{ const e=document.getElementById('co-state'); if(e&&CALL===c) e.textContent=state(); },1000); }
window.addEventListener('pagehide',()=>{ if(CALL) endCall('hangup'); });
