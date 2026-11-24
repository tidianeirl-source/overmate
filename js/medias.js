/* Coopô — js/medias.js
   Photos, stickers, messages vocaux, modifier ou supprimer un message, appui long, réactions.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* ---- Photos dans les messages ----
   Réservé aux adultes, entre adultes (les 13-17 ans n'envoient ni ne reçoivent de photos). La photo est réduite sur l'appareil avant l'envoi,
   puis rangée à part du message, comme les vocaux : chats/{paire}/photos/{id} ou groups/{groupe}/photos/{id} = { from, data, w, h, at }.
   Le message garde { id, w, h } ; l'image n'est téléchargée que quand la bulle arrive à l'écran. */
const PHOTO_TEXT='📷 Photo', PHOTO_RE=/^data:image\/(jpeg|webp);base64,/, PHOTO_LIMIT=420000, PHOTO_MAX=1280;
const PHOTOS={};   // images déjà chargées ou tout juste envoyées (en mémoire seulement)
const canPhoto = () => !!(window.FileReader&&document.createElement('canvas').getContext) && myGroupNow()==='adult';
const IMG_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.500 4.500 4"/></svg>'.replace('2.500 4.500','2.5 4.5');
const photoBtn = (ok=true) => canPhoto()&&ok ? `<button class="btn mic-btn" type="button" id="photobtn" aria-label="Envoyer des photos de ta galerie" title="Galerie">${IMG_SVG}</button><input type="file" id="photoin" accept="image/jpeg,image/png,image/webp" multiple hidden>` : '';
// v11 — appareil photo à gauche de la zone d'écriture (téléphones et tablettes seulement : sur ordinateur, la galerie suffit)
const CAMERA_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.6A2.6 2.6 0 0 1 6.1 6h1.7l1.5-2.1h5.4L16.2 6h1.7a2.6 2.6 0 0 1 2.6 2.6v8.8a2.6 2.6 0 0 1-2.6 2.6H6.1a2.6 2.6 0 0 1-2.6-2.6z"/><circle cx="12" cy="12.9" r="3.7"/></svg>';
const PLUS_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const isCoarse = () => { try{ return matchMedia('(pointer:coarse)').matches; }catch(e){ return false; } };
const camBtn = (ok=true) => canPhoto()&&ok&&isCoarse() ? `<button class="btn cf-cam" type="button" id="cambtn" aria-label="Prendre une photo" title="Appareil photo">${CAMERA_SVG}</button><input type="file" id="camin" accept="image/*" capture="environment" hidden>` : '';
const photoBubble = (ph,kind,owner) => { const w=Math.max(1,+ph.w||4), h=Math.max(1,+ph.h||3), d=PHOTOS[ph.id];
  if(myGroupNow()==='minor') return `<span class="photo-msg" data-ok="1" style="aspect-ratio:${w}/${Math.min(h,w*1.6)}"><span class="ph-wait">Photo réservée aux adultes</span></span>`;   // v7 — un 13-17 ans ne voit pas les photos (les règles refusent aussi de les lui envoyer)
  return `<button type="button" class="photo-msg" data-photo="${esc(ph.id)}" data-pk="${kind}" data-po="${esc(owner)}" style="aspect-ratio:${w}/${Math.min(h,w*1.6)}" aria-label="Voir la photo en grand">${d&&PHOTO_RE.test(d)?`<img src="${d}" alt="Photo envoyée dans la conversation">`:'<span class="ph-wait">Photo…</span>'}</button>`; };
// Réduit une image choisie : 1280 px au plus, en JPEG, sous la taille autorisée
function shrinkPhoto(file){ return new Promise((ok,no)=>{ const url=URL.createObjectURL(file), img=new Image();
  img.onerror=()=>{ URL.revokeObjectURL(url); no(new Error('image')); };
  img.onload=()=>{ URL.revokeObjectURL(url); let max=PHOTO_MAX, data='', w=0, h=0;
    for(let t=0;t<6;t++){ const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)); w=Math.max(1,Math.round(img.naturalWidth*k)); h=Math.max(1,Math.round(img.naturalHeight*k));
      const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(img,0,0,w,h);
      data=c.toDataURL('image/jpeg',t<2?.78:.62); if(data.length<=PHOTO_LIMIT) break; max=Math.round(max*.75); }
    data.length<=PHOTO_LIMIT&&PHOTO_RE.test(data) ? ok({data,w,h}) : no(new Error('lourd')); };
  img.src=url; }); }
// v11 — façon TikTok : la galerie du téléphone s'ouvre (plusieurs photos d'un coup), puis une feuille montre les photos choisies,
// avec un rond numéroté sur chacune, « + » pour en ajouter, l'appareil photo, et « Envoyer (N) ». Un site ne peut pas afficher toute la galerie lui-même.
const PS_MAX=10, PS={files:[],urls:[],sel:[],tok:0,send:null};
function photoWire(onPhoto){ const gal=document.getElementById('photobtn'), gin=document.getElementById('photoin'), cam=document.getElementById('cambtn'), cin=document.getElementById('camin');
  PS.send=onPhoto;
  if(gal&&gin) gal.onclick=()=>gin.click();
  if(cam&&cin) cam.onclick=()=>cin.click();
  const take=inp=>{ const all=[...(inp.files||[])], fs=all.filter(f=>/^image\//.test(f.type)); inp.value='';
    if(all.length>fs.length) toast(fs.length?'Seules les photos partent (les vidéos ne sont pas encore possibles).':"Ce fichier n'est pas une photo.");
    if(fs.length) photoSheet(fs); };
  if(gin) gin.onchange=()=>take(gin);
  if(cin) cin.onchange=()=>take(cin); }
function psReset(){ PS.urls.forEach(u=>{ try{ URL.revokeObjectURL(u); }catch(e){} }); PS.files=[]; PS.urls=[]; PS.sel=[]; }
const psOpen = () => dlg.open&&dlg.classList.contains('ps');
function photoSheet(fs){ if(!psOpen()) psReset();
  const room=Math.max(0,PS_MAX-PS.files.length), add=fs.slice(0,room);
  if(fs.length>add.length) toast(`${PS_MAX} photos au plus à la fois.`);
  add.forEach(f=>{ PS.files.push(f); PS.urls.push(URL.createObjectURL(f)); PS.sel.push(PS.files.length-1); });
  if(psOpen()){ psRender(); return; }
  const tok=++PS.tok;
  modal(`<div class="ps-grab" aria-hidden="true"><i></i></div>
    <div class="ps-head"><button type="button" class="ps-x" data-close aria-label="Fermer">×</button><div class="ps-title"><h3 id="ps-t">Photos</h3><span class="ps-n" id="ps-n" aria-live="polite"></span></div><span aria-hidden="true"></span></div>
    <div class="ps-grid" id="ps-grid" role="group" aria-labelledby="ps-t"></div>
    <div class="ps-foot"><button class="btn btn-ac ps-send" type="button" id="ps-send">Envoyer</button></div>`, d=>{
    d.setAttribute('aria-labelledby','ps-t');
    d.addEventListener('close',()=>{ d.removeAttribute('aria-labelledby'); if(PS.tok===tok) psReset(); },{once:true});
    psRender();
    d.querySelector('#ps-grid').onclick=e=>{ const t=e.target.closest('button'); if(!t) return;
      if(t.hasAttribute('data-ps-add')){ document.getElementById('photoin')?.click(); return; }
      if(t.hasAttribute('data-ps-cam')){ document.getElementById('camin')?.click(); return; }
      const k=+t.dataset.psI; if(!(k>=0)) return; const at=PS.sel.indexOf(k); if(at>=0) PS.sel.splice(at,1); else PS.sel.push(k); psRender(); };
    d.querySelector('#ps-send').onclick=()=>psSend();
    sheetDrag(d.querySelector('.ps-grab'),d,()=>d.close());
    d.querySelector('#ps-send').focus(); }, 'sheet ps'); }
function psRender(){ const g=document.getElementById('ps-grid'); if(!g) return; const cam=isCoarse()&&!!document.getElementById('camin');
  g.innerHTML=`${cam?`<button type="button" class="ps-tile ps-cam" data-ps-cam aria-label="Prendre une photo">${CAMERA_SVG}</button>`:''}${PS.files.length<PS_MAX?`<button type="button" class="ps-tile ps-add" data-ps-add aria-label="Ajouter des photos">${PLUS_SVG}</button>`:''}`
    +PS.files.map((f,k)=>{ const n=PS.sel.indexOf(k)+1; return `<button type="button" class="ps-tile ps-ph${n?' on':''}" data-ps-i="${k}" aria-pressed="${n?'true':'false'}" aria-label="Photo ${k+1}${n?`, choisie en ${n}e`:''}"><img src="${PS.urls[k]}" alt=""><i class="ps-c" aria-hidden="true">${n||''}</i></button>`; }).join('');
  const n=PS.sel.length, b=document.getElementById('ps-send'), c=document.getElementById('ps-n');
  if(c) c.textContent=n?`${n} photo${n>1?'s':''} choisie${n>1?'s':''}`:'Aucune photo choisie';
  if(b){ b.disabled=!n; b.textContent=n>1?`Envoyer (${n})`:'Envoyer'; } }
// Les photos partent une par une, dans l'ordre des numéros (une par seconde au plus : c'est la règle des messages)
async function psSend(){ const files=PS.sel.map(k=>PS.files[k]), send=PS.send; if(!files.length||!send) return; dlg.close();
  let bad=0; for(const f of files){ try{ await send(await shrinkPhoto(f)); }catch(e){ bad++; } }
  if(bad) toast(bad>1?`${bad} photos n'ont pas pu partir (trop lourdes ou illisibles).`:"Une photo n'a pas pu partir (trop lourde ou illisible).",3500); }
addEventListener('hashchange',()=>{ if(psOpen()) dlg.close(); });
// Une feuille qui se ferme en la tirant vers le bas (elle suit le doigt ; un geste rapide suffit)
function sheetDrag(handle,el,close){ if(!handle||!el) return; let y0=0, dy=0, on=false, pts=[];
  handle.addEventListener('pointerdown',e=>{ if(e.button>0) return; on=true; y0=e.clientY; dy=0; pts=[[performance.now(),e.clientY]]; el.style.transition='none'; try{ handle.setPointerCapture(e.pointerId); }catch(er){} });
  handle.addEventListener('pointermove',e=>{ if(!on) return; dy=e.clientY-y0; pts.push([performance.now(),e.clientY]); if(pts.length>6) pts.shift(); el.style.transform=`translateY(${dy>0?dy:dy/5}px)`; });
  const end=()=>{ if(!on) return; on=false; const a=pts[0], b=pts[pts.length-1], v=(b[1]-a[1])/Math.max(1,b[0]-a[0]);
    el.style.transition='transform .22s cubic-bezier(.23,1,.32,1)';
    if(dy>Math.min(140,el.offsetHeight*.3)||(v>.5&&dy>16)){ el.style.transform='translateY(100%)'; setTimeout(()=>{ el.style.transition=''; el.style.transform=''; close(); },200); }
    else { el.style.transform=''; setTimeout(()=>{ el.style.transition=''; },240); } };
  handle.addEventListener('pointerup',end); handle.addEventListener('pointercancel',end); }
// Les photos se chargent quand leur bulle arrive à l'écran
let _photoIO=null;
function photoWatch(){ const els=document.querySelectorAll('.photo-msg:not([data-ok])'); if(!els.length) return;
  const load=async el=>{ if(el.dataset.ok) return; el.dataset.ok='1'; const data=await DB.loadPhoto(el.dataset.pk,el.dataset.po,el.dataset.photo);
    if(data&&PHOTO_RE.test(data)){ if(!el.querySelector('img')) el.innerHTML=`<img src="${data}" alt="Photo envoyée dans la conversation">`; } else { const w=el.querySelector('.ph-wait'); if(w) w.textContent='Photo indisponible'; } };
  if(!('IntersectionObserver' in window)){ els.forEach(load); return; }
  if(!_photoIO) _photoIO=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ _photoIO.unobserve(e.target); load(e.target); } }),{rootMargin:'200px'});
  els.forEach(el=>{ if(el.querySelector('img')) el.dataset.ok='1'; else _photoIO.observe(el); }); }
// Vue en grand
document.addEventListener('click',e=>{ const v=document.getElementById('photo-view'); if(v&&(e.target===v||e.target.closest('#photo-view button'))){ v.remove(); return; }
  const b=e.target.closest('.photo-msg'); if(!b) return; const img=b.querySelector('img'); if(!img) return;
  const o=document.createElement('div'); o.id='photo-view'; o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); o.setAttribute('aria-label','Photo en grand');
  o.innerHTML=`<img src="${img.src}" alt="Photo envoyée dans la conversation"><button type="button" aria-label="Fermer la photo">×</button>`; document.body.appendChild(o); o.querySelector('button').focus(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ const v=document.getElementById('photo-view'); if(v) v.remove(); } });
window.addEventListener('hashchange',()=>{ const v=document.getElementById('photo-view'); if(v) v.remove(); });

/* ---- Stickers faits maison (v10) ----
   Chacun crée ses stickers à partir d'une photo ou d'une courte vidéo (comme sur WhatsApp ou TikTok) : on cadre, on choisit une forme, un contour, un texte.
   Une photo donne un sticker fixe ; une vidéo donne un sticker animé (jusqu'à 3 secondes, 8 images par seconde, rangées côte à côte sur une seule image).
   Rangement : stickers/{id} = { owner, data, n (nombre d'images), shape ('ci' rond, 'rd' arrondi, 'sq' carré), at }. Le message ne garde que { id, n }.
   Comme les photos : réservé aux adultes, et seulement dans les conversations sans 13-17 ans (les règles le vérifient aussi). 30 créations par jour au plus.
   Un sticker reçu peut être ajouté à « mes stickers » (favoris, gardés sur l'appareil). Si son auteur le supprime, il disparaît partout. */
const STICKER_TEXT='✨ Sticker', STK_RE=/^data:image\/(webp|png|jpeg);base64,/, STK_LIMIT=300000, STK_FPS=8, STK_MAX_FRAMES=24;
const STK={};   // stickers déjà chargés : id → { data, n, shape } (en mémoire seulement)
const canSticker = () => !!(window.FileReader&&document.createElement('canvas').getContext) && myGroupNow()==='adult';
const STK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 12.5V8a4.5 4.5 0 0 0-4.5-4.5H8A4.5 4.5 0 0 0 3.5 8v8A4.5 4.5 0 0 0 8 20.5h4.5z"/><path d="M12.5 20.5a8 8 0 0 0 8-8h-3.5a4.5 4.5 0 0 0-4.5 4.5z"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/><path d="M8.6 14.2c.9.8 2 1.2 3.2 1.1"/></svg>';
const stkFavKey = () => 'coopo_stkfav_'+(S.auth&&S.auth.uid||'local');
function stkFavs(){ try{ const a=JSON.parse(localStorage.getItem(stkFavKey())||'[]'); return Array.isArray(a)?a.filter(x=>typeof x==='string'&&/^[A-Za-z0-9]{8,40}$/.test(x)).slice(0,60):[]; }catch(e){ return []; } }
function stkFavSet(a){ try{ localStorage.setItem(stkFavKey(),JSON.stringify(a.slice(0,60))); }catch(e){} }
// Un sticker dans une bulle (bouton : on peut l'ouvrir en grand et l'ajouter à ses stickers). Chargé quand il arrive à l'écran.
function stickerBubble(st,mine){ const n=Math.max(1,Math.min(30,+st.n||1));
  if(myGroupNow()==='minor') return `<span class="stk-msg stk-off" data-ok="1"><span class="ph-wait">Sticker réservé aux adultes</span></span>`;
  return `<button type="button" class="stk-msg" data-stk="${esc(st.id)}" data-mine="${mine?1:''}" style="--n:${n}" aria-label="Sticker${mine?'':' : appuie pour l\'ajouter à tes stickers'}"></button>`; }
// Affiche un sticker chargé dans son élément (image fixe, ou images qui défilent pour un sticker animé)
function stkPaint(el,s){ if(!el) return; if(!s||!STK_RE.test(s.data)){ el.classList.add('stk-gone'); el.innerHTML='<span class="ph-wait">Sticker supprimé</span>'; el.dataset.ok='1'; return; }
  el.style.setProperty('--n',s.n); el.style.backgroundImage=`url("${s.data}")`; el.classList.toggle('anim',s.n>1); el.classList.add('stk-'+(s.data.startsWith('data:image/jpeg')?s.shape:'free')); el.dataset.ok='1'; }
let _stkIO=null;
function stickerWatch(root=document){ const els=root.querySelectorAll('.stk-msg[data-stk]:not([data-ok])'); if(!els.length) return;
  const load=async el=>{ if(el.dataset.ok) return; el.dataset.ok='1'; stkPaint(el,await DB.loadSticker(el.dataset.stk)); };
  if(!('IntersectionObserver' in window)){ els.forEach(load); return; }
  if(!_stkIO) _stkIO=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ _stkIO.unobserve(e.target); load(e.target); } }),{rootMargin:'200px'});
  els.forEach(el=>{ if(STK[el.dataset.stk]){ stkPaint(el,STK[el.dataset.stk]); } else _stkIO.observe(el); }); }

/* -- v11 — Panneau stickers et emojis, façon TikTok --
   Il monte du bas de l'écran, sous la zone d'écriture, à la place du clavier : onglet Stickers (« Récemment utilisés », puis
   « Enregistré » avec la case + pour créer un sticker à partir d'une photo ou d'une vidéo) et onglet Emojis (ajoutés dans le champ).
   Un appui sur un sticker l'envoie ; le panneau reste ouvert. Les 13-17 ans, et les conversations avec un 13-17 ans, n'ont que les emojis.
   Au-dessus de la zone d'écriture, quand l'autre vient d'écrire : « Appuie sur un sticker pour répondre » avec mes stickers. */
const STAR_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.6l2.6 5.2 5.8.9-4.2 4.1 1 5.7L12 16.8l-5.2 2.7 1-5.7-4.2-4.1 5.8-.9z"/></svg>';
const SMILE_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.6"/><path d="M8.4 14.1c.9 1.3 2.2 2 3.6 2s2.7-.7 3.6-2"/><path d="M9.1 9.7h.01M14.9 9.7h.01" stroke-width="2.7"/></svg>';
const KBD_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12.5" rx="2.6"/><path d="M6.6 10.1h.01M10.2 10.1h.01M13.8 10.1h.01M17.4 10.1h.01M6.6 14.3h.01M17.4 14.3h.01" stroke-width="2.5"/><path d="M9.8 14.4h4.4"/></svg>';
const BKSP_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.2 5.5h10.3a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9.2L3 12z"/><path d="M12.6 9.6l4.8 4.8M17.4 9.6l-4.8 4.8"/></svg>';
const EMOJIS='😂 🤣 😭 😍 🥰 😘 😊 😁 😅 😆 😉 😎 🤩 🥳 😏 😒 🙄 😤 😡 🤬 😱 😳 🥺 😢 😩 😴 🤔 🤫 🤭 🙃 😇 🤑 🤡 💀 👻 🤖 💩 🙈 🙊 😬 🥵 🥶 🤯 😮 😐 🤐 🤤 😋 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 ❤️‍🔥 💕 💖 💯 🔥 ✨ ⭐ 💥 💫 ✅ ❌ ⚠️ ❓ ❗ 💤 👍 👎 👏 🙌 🙏 🤝 💪 ✌️ 🤞 🤙 👋 👊 ✊ 🫡 🫶 👀 👌 🤌 ☝️ 👉 🎮 🕹️ 🏆 🥇 🎯 ⚽ 🏀 🎉 🎊 🎁 🎂 🎧 🎤 📱 💻 ⏰ 💰 💸 🍕 🍔 🍟 🍗 🍿 🥤 ☕ 🍫 🐐 🦁 🐍 🐶 🐱 🐸 🦊 🐼 🦅 🐒 🇨🇮 🇸🇳 🇨🇲 🇧🇫 🇲🇱 🇬🇳 🇹🇬 🇧🇯 🇬🇦 🇨🇩 🇲🇦 🇫🇷'.split(' ');
const CP={open:false,tab:'stk',pick:'stk',stk:false,manage:false};   // le panneau de la conversation ouverte (pick : le dernier onglet choisi)
let STK_SEND=null;   // envoi d'un sticker dans la conversation ouverte
const cpBtn = () => `<button class="btn mic-btn cp-btn" type="button" id="cpbtn" aria-label="Stickers et emojis" aria-expanded="false" aria-controls="cpanel" title="Stickers et emojis"><span class="cp-ico-a">${STK_SVG}</span><span class="cp-ico-k">${KBD_SVG}</span></button>`;
const cpanelHTML = () => `<div class="cpanel" id="cpanel" role="region" aria-label="Stickers et emojis" hidden>
  <div class="cp-grab" aria-hidden="true"><i></i></div>
  <div class="cp-tabs" role="group" aria-label="Stickers ou emojis"><button type="button" class="cp-tab" data-cpt="stk" aria-label="Stickers" aria-pressed="true">${STAR_SVG}</button><button type="button" class="cp-tab" data-cpt="emo" aria-label="Emojis" aria-pressed="false">${SMILE_SVG}</button><button type="button" class="cp-bk" data-cp-bk aria-label="Effacer le dernier caractère" title="Effacer">${BKSP_SVG}</button></div>
  <div class="cp-body" id="cp-body"></div>
  <input type="file" id="stk-file" accept="image/jpeg,image/png,image/webp,video/*" hidden></div>`;
const qrHTML = () => `<div class="qr-stk" id="qr-stk" hidden><div class="qr-pill"><span>Appuie sur un sticker pour répondre</span><button type="button" class="qr-x" data-qr-x aria-label="Masquer les stickers de réponse">×</button></div><div class="qr-row"></div></div>`;
// Mémoire de l'appareil : stickers et emojis récents, bandeaux de réponse masqués
const lsList = (k,max,ok) => { try{ const a=JSON.parse(localStorage.getItem(k)||'[]'); return Array.isArray(a)?a.filter(ok).slice(0,max):[]; }catch(e){ return []; } };
const lsSet = (k,v) => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const STK_ID = x => typeof x==='string'&&/^[A-Za-z0-9]{8,40}$/.test(x);
const stkRecKey = () => 'coopo_stkrec_'+(S.auth&&S.auth.uid||'local');
const stkRecent = () => lsList(stkRecKey(),8,STK_ID);
const stkRecPush = id => lsSet(stkRecKey(),[id,...stkRecent().filter(x=>x!==id)].slice(0,8));
const stkRecDrop = id => lsSet(stkRecKey(),stkRecent().filter(x=>x!==id));
const emoRecent = () => lsList('coopo_emorec',16,x=>typeof x==='string'&&x.length<=16);
const emoRecPush = em => lsSet('coopo_emorec',[em,...emoRecent().filter(x=>x!==em)].slice(0,16));
function stkMineCached(){ try{ const c=JSON.parse(localStorage.getItem(DB.stkIdxKey())||'null'); return c&&Array.isArray(c.list)?c.list.map(x=>x&&x.id).filter(STK_ID):[]; }catch(e){ return []; } }
// Le panneau de la conversation qui s'ouvre : stickers permis ou non ici, et ce qui envoie un sticker
function cpWire(send,stkOk){ STK_SEND=send; CP.open=false; CP.manage=false; CP.stk=!!stkOk&&canSticker(); CP.tab=CP.stk?CP.pick:'emo';
  const b=document.getElementById('cpbtn'), pn=document.getElementById('cpanel'), i=document.getElementById('chatin'), qr=document.getElementById('qr-stk'); if(!b||!pn) return;
  b.onclick=()=>CP.open?cpClose(true):cpOpen();
  pn.querySelectorAll('[data-cpt]').forEach(t=>t.onclick=()=>{ CP.tab=CP.pick=t.dataset.cpt; CP.manage=false; cpRender(); });
  pn.querySelector('[data-cp-bk]').onclick=()=>emoBack();
  pn.querySelector('#stk-file').onchange=e=>{ const inp=e.target, f=inp.files&&inp.files[0]; inp.value=''; if(!f) return;
    if(/^video\//.test(f.type)) stickerEditor(f,true); else if(/^image\//.test(f.type)) stickerEditor(f,false); else toast("Ce fichier n'est ni une photo ni une vidéo."); };
  pn.querySelector('#cp-body').addEventListener('click',cpClick);
  qr&&qr.addEventListener('click',e=>{ const t=e.target.closest('button'); if(!t) return;
    if(t.hasAttribute('data-qr-x')){ qrDismiss(); return; }
    if(t.dataset.stkSend){ qr.hidden=true; stkSendId(t.dataset.stkSend,t); } });
  i&&i.addEventListener('focus',()=>{ if(CP.open&&isCoarse()) cpClose(false); });   // le clavier remplace le panneau, comme sur TikTok
  sheetDrag(pn.querySelector('.cp-grab'),pn,()=>cpClose(false));
  cpSync(); }
function cpOpen(tab){ const pn=document.getElementById('cpanel'); if(!pn) return; if(tab) CP.tab=CP.pick=tab; if(!CP.stk) CP.tab='emo';
  CP.open=true; CP.manage=false; pn.hidden=false; pn.style.transform=''; if(isCoarse()) document.getElementById('chatin')?.blur();
  cpRender(); cpSync(); qrUpdate(); const cb=document.getElementById('chatbox'); if(cb) cb.scrollTop=cb.scrollHeight; }
function cpClose(focus){ const pn=document.getElementById('cpanel'); CP.open=false; CP.manage=false; if(pn){ pn.hidden=true; pn.style.transform=''; } cpSync(); qrUpdate(); if(focus) document.getElementById('chatin')?.focus(); }
function cpSync(){ const b=document.getElementById('cpbtn'); if(!b) return; b.classList.toggle('on',CP.open); b.setAttribute('aria-expanded',CP.open?'true':'false');
  const l=CP.open?'Revenir au clavier':CP.stk?'Stickers et emojis':'Emojis'; b.setAttribute('aria-label',l); b.title=l; }
async function cpRender(){ const pn=document.getElementById('cpanel'), body=document.getElementById('cp-body'); if(!pn||!body||!CP.open) return;
  if(!CP.stk) CP.tab='emo';
  pn.classList.toggle('emo',CP.tab==='emo'); pn.classList.toggle('solo',!CP.stk);
  pn.querySelectorAll('[data-cpt]').forEach(t=>{ t.setAttribute('aria-pressed',t.dataset.cpt===CP.tab?'true':'false'); t.hidden=!CP.stk; });
  const tok=cpRender.tok=(cpRender.tok||0)+1;
  if(CP.tab==='emo'){ const rec=emoRecent(), btn=em=>`<button type="button" class="cp-emo" data-emo="${esc(em)}">${esc(em)}</button>`;
    body.innerHTML=`${rec.length?`<p class="cp-cap">Récemment utilisés</p><div class="cp-emos">${rec.map(btn).join('')}</div>`:''}<p class="cp-cap">Emojis</p><div class="cp-emos">${EMOJIS.map(btn).join('')}</div>`; return; }
  if(!body.querySelector('.cp-grid')) body.innerHTML='<p class="cp-hint">Chargement…</p>';
  const mine=(await DB.myStickers()).map(x=>x.id).filter(STK_ID);
  if(tok!==cpRender.tok||!CP.open||CP.tab!=='stk') return;
  const favs=stkFavs(), saved=[...mine,...favs.filter(id=>!mine.includes(id))], m=CP.manage, rec=m?[]:stkRecent();
  const tile=(id,kind)=>`<div class="cp-tile"><button type="button" class="cp-pick" data-stk-send="${esc(id)}" aria-label="Envoyer ce sticker"><span class="stk-msg" data-stk="${esc(id)}"></span></button>${kind?`<button type="button" class="stk-x" data-stk-${kind}="${esc(id)}" aria-label="${kind==='del'?'Supprimer ce sticker':'Retirer de mes stickers'}">×</button>`:''}</div>`;
  body.innerHTML=`${rec.length?`<p class="cp-cap">Récemment utilisés</p><div class="cp-grid">${rec.map(id=>tile(id,'')).join('')}</div>`:''}
    <div class="cp-cap cp-cap-row"><span>Enregistré</span>${saved.length?`<button type="button" class="cp-manage" data-cp-manage aria-pressed="${m?'true':'false'}">${m?'Terminé':'Gérer'}</button>`:''}</div>
    <div class="cp-grid${m?' manage':''}">${m?'':`<button type="button" class="cp-pick cp-new" data-stk-new aria-label="Créer un sticker à partir d'une photo ou d'une vidéo">${PLUS_SVG}</button>`}${saved.map(id=>tile(id,m?(mine.includes(id)?'del':'unfav'):'')).join('')}</div>
    ${saved.length?'':`<p class="cp-hint">Appuie sur + pour créer ton sticker à partir d'une photo ou d'une courte vidéo.</p>`}`;
  stickerWatch(body); }
function cpClick(e){ const t=e.target.closest('button'); if(!t) return;
  if(t.dataset.emo){ emoInsert(t.dataset.emo); return; }
  if(t.hasAttribute('data-stk-new')){ document.getElementById('stk-file')?.click(); return; }
  if(t.hasAttribute('data-cp-manage')){ CP.manage=!CP.manage; cpRender(); return; }
  if(t.dataset.stkDel){ const id=t.dataset.stkDel;
    modal(`<h3>Supprimer ce sticker ?</h3><p class="muted">Il disparaîtra aussi des conversations où tu l'as envoyé, et des stickers de ceux qui l'avaient ajouté.</p>
      <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-danger" type="button" id="stk-del-ok">Supprimer</button></div>`,
      d2=>d2.querySelector('#stk-del-ok').onclick=async()=>{ d2.querySelector('#stk-del-ok').disabled=true; if(await DB.deleteSticker(id)){ stkRecDrop(id); toast('Sticker supprimé'); } d2.close(); cpRender(); qrUpdate(); }); return; }
  if(t.dataset.stkUnfav){ stkFavSet(stkFavs().filter(x=>x!==t.dataset.stkUnfav)); stkRecDrop(t.dataset.stkUnfav); cpRender(); qrUpdate(); return; }
  if(t.dataset.stkSend&&!CP.manage) stkSendId(t.dataset.stkSend,t); }
// Envoyer un sticker d'un appui (depuis le panneau ou le bandeau de réponse)
async function stkSendId(id,el){ if(!STK_SEND||!CP.stk) return;
  if(el){ el.classList.add('sent'); setTimeout(()=>el.classList.remove('sent'),180); }
  const s=STK[id]||await DB.loadSticker(id);
  if(!s){ toast("Ce sticker n'existe plus."); stkFavSet(stkFavs().filter(x=>x!==id)); stkRecDrop(id); cpRender(); qrUpdate(); return; }
  stkRecPush(id); STK_SEND({id,n:s.n}); }
// Emojis : ajoutés là où se trouve le curseur ; le bouton ⌫ efface le dernier
function emoInsert(em){ const i=document.getElementById('chatin'); if(!i||i.value.length+em.length>500) return;
  const a=i.selectionStart??i.value.length, z=i.selectionEnd??a; try{ i.setRangeText(em,a,z,'end'); }catch(e){ i.value+=em; }
  i.dispatchEvent(new Event('input',{bubbles:true})); emoRecPush(em); if(!isCoarse()) i.focus(); }
function emoBack(){ const i=document.getElementById('chatin'); if(!i||!i.value) return; const z=i.selectionEnd??i.value.length, a=i.selectionStart??z;
  if(a!==z) i.setRangeText('',a,z,'end');
  else if(z>0){ const before=i.value.slice(0,z); let cut=1;
    try{ const g=[...new Intl.Segmenter('fr',{granularity:'grapheme'}).segment(before)]; cut=g.length?g[g.length-1].segment.length:1; }catch(e){ cut=/[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(before)?2:1; }
    i.setRangeText('',z-cut,z,'end'); }
  i.dispatchEvent(new Event('input',{bubbles:true})); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&CP.open&&!dlg.open&&e.target&&e.target.closest&&e.target.closest('#cpanel,#chatform')){ e.preventDefault(); cpClose(true); } });
// « Appuie sur un sticker pour répondre » : quand le dernier message vient de l'autre (moins de 24 h), avec mes stickers récents et enregistrés
const QR={key:'',last:null};   // la conversation ouverte ('c:<mate>' ou 'g:<groupe>') et son dernier message
const qrKey = () => 'coopo_qrx_'+(S.auth&&S.auth.uid||'local');
const qrMark = m => m?String(m.id||m.at||''):'';
function qrDismiss(){ const el=document.getElementById('qr-stk'); if(el) el.hidden=true; try{ const o=JSON.parse(localStorage.getItem(qrKey())||'{}')||{}; delete o[QR.key]; o[QR.key]=qrMark(QR.last);
    const ks=Object.keys(o); ks.slice(0,Math.max(0,ks.length-60)).forEach(k=>delete o[k]); localStorage.setItem(qrKey(),JSON.stringify(o)); }catch(e){} }
function qrUpdate(){ const el=document.getElementById('qr-stk'); if(!el) return; const m=QR.last;
  let off=!CP.stk||CP.open||!!EDIT||!m||m.mine||m.del||Date.now()-tsMs(m.at)>864e5;
  if(!off){ try{ off=(JSON.parse(localStorage.getItem(qrKey())||'{}')||{})[QR.key]===qrMark(m); }catch(e){} }
  const ids=off?[]:[...new Set([...stkRecent(),...stkMineCached(),...stkFavs()])].slice(0,10);
  if(!ids.length&&!off&&!qrUpdate.tried){ let c=null; try{ c=localStorage.getItem(DB.stkIdxKey()); }catch(e){}   // mes stickers pas encore connus sur cet appareil : on les demande une fois
    if(!c){ qrUpdate.tried=true; DB.myStickers().then(()=>qrUpdate()).catch(()=>{}); } }
  if(!ids.length){ el.hidden=true; return; }
  const sig=ids.join(','); if(el.dataset.sig!==sig){ el.dataset.sig=sig; el.querySelector('.qr-row').innerHTML=ids.map(id=>`<button type="button" class="qr-pick" data-stk-send="${esc(id)}" aria-label="Répondre avec ce sticker"><span class="stk-msg" data-stk="${esc(id)}"></span></button>`).join(''); }
  el.hidden=false; stickerWatch(el); }
// Un sticker reçu, en grand : l'ajouter à mes stickers
document.addEventListener('click',e=>{ const el=e.target.closest('.stk-msg[data-stk][data-ok]'); if(!el||el.closest('.cpanel,.qr-stk')||el.classList.contains('stk-gone')) return; const id=el.dataset.stk, s=STK[id]; if(!s) return;
  const mine=!!el.dataset.mine, fav=stkFavs().includes(id);
  modal(`<div class="stk-view"><span class="stk-msg stk-big" data-stk="${esc(id)}"></span></div>
    <div class="dlg-actions">${mine?'':`<button class="btn ${fav?'btn-ghost':'btn-ac'}" type="button" id="stk-fav">${fav?'Retirer de mes stickers':'Ajouter à mes stickers'}</button>`}<button class="btn btn-ghost" type="button" data-close>Fermer</button></div>`, d=>{
    stkPaint(d.querySelector('.stk-big'),s);
    d.querySelector('#stk-fav')?.addEventListener('click',()=>{ const a=stkFavs(); stkFavSet(fav?a.filter(x=>x!==id):[id,...a.filter(x=>x!==id)]); toast(fav?'Retiré de tes stickers':'Ajouté à tes stickers'); d.close(); }); }); });

/* -- Créer un sticker : la photo ou la vidéo choisie (case + du panneau) est cadrée ici -- */
// Dessine une image du sticker : la photo (ou l'image de la vidéo) cadrée, découpée selon la forme, avec contour et texte
function stkDraw(ctx,src,S,o,flat){ const sw=src.videoWidth||src.naturalWidth||1, sh=src.videoHeight||src.naturalHeight||1;
  const shape=flat?'sq':o.shape, edge=!flat&&o.border&&shape!=='sq', bw=edge?Math.round(S*.045):0, pad=edge?bw/2+1:0, inner=S-2*pad;
  const path=()=>{ ctx.beginPath(); if(shape==='ci') ctx.arc(S/2,S/2,inner/2,0,Math.PI*2); else if(shape==='rd'){ const r=inner*.22; if(ctx.roundRect) ctx.roundRect(pad,pad,inner,inner,r); else ctx.rect(pad,pad,inner,inner); } else ctx.rect(0,0,S,S); };
  ctx.save(); path(); ctx.clip();
  const k=Math.max(S/sw,S/sh)*o.zoom, dw=sw*k, dh=sh*k; ctx.drawImage(src,(S-dw)/2+o.ox*S,(S-dh)/2+o.oy*S,dw,dh); ctx.restore();
  if(edge){ path(); ctx.lineWidth=bw; ctx.strokeStyle='#fff'; ctx.stroke(); }
  const t=(o.text||'').trim(); if(t){ let fs=S*.16; ctx.font=`900 ${fs}px "Arial Black","Segoe UI Black",Impact,system-ui,sans-serif`;
    while(fs>S*.08&&ctx.measureText(t).width>S*.86){ fs-=1; ctx.font=`900 ${fs}px "Arial Black","Segoe UI Black",Impact,system-ui,sans-serif`; }
    ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.lineJoin='round'; ctx.lineWidth=Math.max(2,fs*.22); ctx.strokeStyle='#111'; const y=S-pad-S*.08;
    ctx.strokeText(t,S/2,y); ctx.fillStyle='#fff'; ctx.fillText(t,S/2,y); } }
const stkWebp = () => { try{ const c=document.createElement('canvas'); c.width=c.height=2; return c.toDataURL('image/webp').startsWith('data:image/webp'); }catch(e){ return false; } };
function stkSeek(v,t){ return new Promise(ok=>{ let done=false; const fin=()=>{ if(done) return; done=true; v.removeEventListener('seeked',fin); ok(); }; v.addEventListener('seeked',fin); setTimeout(fin,1500); try{ v.currentTime=Math.max(0,t); }catch(e){ fin(); } }); }
async function stickerEditor(file,isVid){
  const url=URL.createObjectURL(file); let src, dur=0, alive=true, raf=0;
  try{ if(isVid){ src=document.createElement('video'); src.muted=true; src.playsInline=true; src.setAttribute('playsinline',''); src.preload='auto'; src.src=url;
      await new Promise((ok,no)=>{ src.onloadeddata=ok; src.onerror=()=>no(new Error('video')); setTimeout(()=>no(new Error('video')),12000); });
      dur=src.duration; if(!isFinite(dur)||dur<=0) throw new Error('video'); try{ await src.play(); src.pause(); }catch(e){} }
    else { src=new Image(); src.src=url; await new Promise((ok,no)=>{ src.onload=ok; src.onerror=()=>no(new Error('image')); }); } }
  catch(e){ URL.revokeObjectURL(url); toast(isVid?"Cette vidéo n'a pas pu être lue. Essaie une vidéo MP4 courte.":"Cette image n'a pas pu être lue."); return; }
  const lens=[1,2,3].filter(l=>l<=dur+.01), o={zoom:1,ox:0,oy:0,shape:'ci',border:true,text:'',start:0,len:isVid?(lens.length?lens[lens.length-1]:dur):0};
  modal(`<h3>Nouveau sticker</h3>
    <div class="stk-ed"><canvas id="stk-cv" width="480" height="480" aria-label="Aperçu du sticker : fais glisser pour placer l'image"></canvas><p class="hint">Fais glisser l'image pour la placer.</p></div>
    <div class="stk-opts">
      <div class="field"><label for="stk-zoom">Zoom</label><input type="range" id="stk-zoom" min="1" max="3" step="0.01" value="1"></div>
      ${isVid?`<div class="field"><label for="stk-start">Début de l'extrait</label><input type="range" id="stk-start" min="0" max="${Math.max(0,dur-o.len).toFixed(2)}" step="0.05" value="0"></div>
      ${lens.length>1?`<div class="field"><span class="lbl">Durée</span><div class="chips" role="group" aria-label="Durée">${lens.map(l=>`<button type="button" class="chip" data-len="${l}" aria-pressed="${l===o.len}">${l} s</button>`).join('')}</div></div>`:''}`:''}
      <div class="field"><span class="lbl">Forme</span><div class="chips" role="group" aria-label="Forme">${[['ci','Rond'],['rd','Arrondi'],['sq','Carré']].map(([k,l])=>`<button type="button" class="chip" data-shape="${k}" aria-pressed="${k===o.shape}">${l}</button>`).join('')}</div></div>
      <label class="stk-check"><input type="checkbox" id="stk-border" checked> Contour blanc</label>
      <div class="field"><label for="stk-txt">Texte (facultatif)</label><input type="text" id="stk-txt" maxlength="24" placeholder="GG, Let's go…" autocomplete="off"></div>
    </div>
    <p class="err" id="stk-err" role="alert"></p>
    <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-stk-back>Retour</button><button class="btn btn-ac" type="button" id="stk-make">Créer le sticker</button></div>`, d=>{
    const cv=d.querySelector('#stk-cv'), ctx=cv.getContext('2d'), S=cv.width;
    const draw=()=>{ ctx.clearRect(0,0,S,S); stkDraw(ctx,src,S,o,false); };
    const stop=()=>{ alive=false; cancelAnimationFrame(raf); try{ if(isVid) src.pause(); }catch(e){} URL.revokeObjectURL(url); };
    d.addEventListener('close',stop,{once:true});
    if(isVid){ const loop=()=>{ if(!alive) return; if(src.currentTime<o.start||src.currentTime>o.start+o.len) try{ src.currentTime=o.start; }catch(e){}
        draw(); raf=requestAnimationFrame(loop); };
      src.loop=false; src.currentTime=o.start; src.play().catch(()=>{}); loop(); }
    else draw();
    const re=()=>{ if(!isVid) draw(); };
    d.querySelector('#stk-zoom').oninput=e=>{ o.zoom=+e.target.value; re(); };
    d.querySelector('#stk-border').onchange=e=>{ o.border=e.target.checked; re(); };
    d.querySelector('#stk-txt').oninput=e=>{ o.text=e.target.value; re(); };
    d.querySelectorAll('[data-shape]').forEach(b=>b.onclick=()=>{ o.shape=b.dataset.shape; d.querySelectorAll('[data-shape]').forEach(x=>x.setAttribute('aria-pressed',x===b)); re(); });
    if(isVid){ const st=d.querySelector('#stk-start');
      st.oninput=()=>{ o.start=+st.value; try{ src.currentTime=o.start; }catch(e){} };
      d.querySelectorAll('[data-len]').forEach(b=>b.onclick=()=>{ o.len=Math.min(+b.dataset.len,dur); st.max=Math.max(0,dur-o.len).toFixed(2); if(o.start>+st.max){ o.start=+st.max; st.value=st.max; } d.querySelectorAll('[data-len]').forEach(x=>x.setAttribute('aria-pressed',x===b)); }); }
    // glisser pour placer l'image (doigt ou souris)
    let drag=null; cv.addEventListener('pointerdown',e=>{ drag={x:e.clientX,y:e.clientY,ox:o.ox,oy:o.oy}; try{ cv.setPointerCapture(e.pointerId); }catch(er){} });
    cv.addEventListener('pointermove',e=>{ if(!drag) return; const r=cv.getBoundingClientRect(); o.ox=Math.max(-1,Math.min(1,drag.ox+(e.clientX-drag.x)/r.width)); o.oy=Math.max(-1,Math.min(1,drag.oy+(e.clientY-drag.y)/r.height)); re(); });
    const up=()=>{ drag=null; }; cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
    d.querySelector('[data-stk-back]').onclick=()=>d.close();
    d.querySelector('#stk-make').onclick=async()=>{ const b=d.querySelector('#stk-make'), err=d.querySelector('#stk-err'); b.disabled=true; err.textContent=''; alive=false; cancelAnimationFrame(raf);
      try{ const out=await stickerBuild(src,o,isVid,n=>{ b.textContent=`Création… ${n}`; }); b.textContent='Envoi…';
        const id=await DB.createSticker(out); if(!id) throw new Error('envoi');
        STK[id]=out; d.close(); toast('Sticker créé'); if(CP.open) cpRender(); else cpOpen('stk'); qrUpdate(); }
      catch(e){ console.error(e); err.textContent=e&&e.message==='lourd'?'Ce sticker est trop lourd. Essaie une durée plus courte.':e&&e.message==='limite'?'Tu as déjà créé 30 stickers aujourd\'hui. Reviens demain !':"Le sticker n'a pas pu être créé. Réessaie.";
        b.disabled=false; b.textContent='Créer le sticker'; if(isVid){ alive=true; src.play().catch(()=>{}); const loop=()=>{ if(!alive) return; if(src.currentTime<o.start||src.currentTime>o.start+o.len) try{ src.currentTime=o.start; }catch(er){} draw(); raf=requestAnimationFrame(loop); }; loop(); } } }; }); }
// Fabrique l'image finale : 256 px pour une photo ; pour une vidéo, une bande d'images de 160 px côte à côte
async function stickerBuild(src,o,isVid,progress){ const webp=stkWebp();
  if(!isVid){ for(const [S,q] of [[256,.86],[256,.7],[200,.62]]){ const c=document.createElement('canvas'); c.width=c.height=S; stkDraw(c.getContext('2d'),src,S,o,false);
      const data=webp?c.toDataURL('image/webp',q):c.toDataURL('image/png'); if(data.length<=STK_LIMIT&&STK_RE.test(data)) return {data,n:1,shape:o.shape}; }
    throw new Error('lourd'); }
  const n=Math.max(2,Math.min(STK_MAX_FRAMES,Math.round(o.len*STK_FPS))); src.pause();
  for(const [S,q] of [[160,.72],[128,.62],[112,.5]]){ const strip=document.createElement('canvas'); strip.width=S*n; strip.height=S; const sx=strip.getContext('2d'), f=document.createElement('canvas'); f.width=f.height=S; const fx=f.getContext('2d');
    if(!webp){ sx.fillStyle='#fff'; sx.fillRect(0,0,strip.width,S); }   // sans WebP (anciens iPhone) : JPEG sans transparence, la forme est appliquée à l'affichage
    for(let i=0;i<n;i++){ await stkSeek(src,o.start+i/STK_FPS); fx.clearRect(0,0,S,S); stkDraw(fx,src,S,o,!webp); sx.drawImage(f,i*S,0); progress&&progress(`${i+1}/${n}`); }
    const data=webp?strip.toDataURL('image/webp',q):strip.toDataURL('image/jpeg',q); if(data.length<=STK_LIMIT&&STK_RE.test(data)) return {data,n,shape:o.shape}; }
  throw new Error('lourd'); }

/* ---- Messages vocaux ----
   Le son est enregistré par le téléphone (2 minutes au plus), puis rangé à part du message :
   chats/{paire}/voices/{id} ou groups/{groupe}/voices/{id} = { from, data, dur, at }.
   Le message lui-même ne garde que { id, dur } : le son n'est téléchargé que si on appuie sur lecture (ça économise la connexion). */
const VOICE_MAX=120, VOICE_FIRST=60, VOICE_TEXT='🎤 Message vocal', VOICE_RE=/^data:audio\/(webm|ogg|mp4|mpeg|aac|x-m4a)[;,]/, VOICE_LIMIT=1000000;
// v15 — jusqu'à 2 minutes (avant : 30 secondes). Le son doit tenir dans la place autorisée par la base (1 Mo) : on retient le poids d'une seconde de son
// sur cet appareil, et si ses sons sont lourds, sa durée maximale est réduite d'autant. Tant qu'on ne le connaît pas (iPhone), le premier vocal va jusqu'à 1 minute.
const vRate = () => { try{ return +localStorage.getItem('coopo_vrate')||0; }catch(e){ return 0; } };
const voiceMax = type => { const r=vRate(); return r>0 ? Math.max(20,Math.min(VOICE_MAX,Math.floor(VOICE_LIMIT*.92/r))) : /webm|ogg/.test(type||'') ? VOICE_MAX : VOICE_FIRST; };
const VOICES={};   // sons déjà chargés ou tout juste enregistrés (gardés en mémoire seulement)
const newId = () => { let s=''; const a='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; for(let i=0;i<20;i++) s+=a[Math.random()*a.length|0]; return s; };
const canVoice = () => !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder);
const MIC_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const micBtn = () => canVoice() ? `<button class="btn mic-btn" type="button" id="micbtn" aria-label="Enregistrer un message vocal" title="Message vocal">${MIC_SVG}</button>` : '';
// v11 — zone d'écriture façon TikTok : l'appareil photo à gauche ; dans la barre, le champ puis le micro, la galerie et le bouton stickers/emojis.
// Quand on écrit, le micro et la galerie laissent la place au bouton d'envoi.
const composerHTML = (ph,ok) => `<form class="chat-form tk" id="chatform">${camBtn(ok)}<div class="cf-pill"><input type="text" id="chatin" placeholder="${ph}" maxlength="500" autocomplete="off" enterkeyhint="send" aria-label="${ph}">${micBtn()}${photoBtn(ok)}${cpBtn()}<button class="btn btn-ac send-btn" type="submit" aria-label="Envoyer"><span class="send-txt">Envoyer</span>${SEND_SVG}</button></div></form>`;
const vTime = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
/* Ondes des vocaux (comme sur Snapchat)
   À l'enregistrement, le son est découpé en VW_N tranches ; la force de chaque tranche (0 à 31) tient en un caractère (0 à 9, puis a à v).
   Ces caractères partent avec le message (voice.w) : les barres s'affichent sans télécharger le son.
   Anciens vocaux (sans w) : des barres d'attente, remplacées par les vraies dès la première écoute (gardées sur l'appareil). */
const VW_N=36, VW_RE=/^[0-9a-v]{1,64}$/;
const VWAVE=(()=>{ try{ return JSON.parse(localStorage.getItem('coopo_vw')||'{}')||{}; }catch(e){ return {}; } })();
function vwKeep(id,w){ VWAVE[id]=w; try{ const k=Object.keys(VWAVE); k.slice(0,Math.max(0,k.length-400)).forEach(x=>delete VWAVE[x]); localStorage.setItem('coopo_vw',JSON.stringify(VWAVE)); }catch(e){} }
// Les ondes d'un son (adresse data:audio…) : '' si ce téléphone ne sait pas le décoder
async function vwFromData(data){ try{ const AC=window.OfflineAudioContext||window.webkitOfflineAudioContext; if(!AC||!VOICE_RE.test(data)) return '';
    const bin=atob(data.slice(data.indexOf(',')+1)), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
    const ctx=new AC(1,2,44100);
    const ab=await Promise.race([new Promise((ok,ko)=>{ const p=ctx.decodeAudioData(u.buffer,ok,ko); if(p&&p.then) p.then(ok,ko); }),new Promise((ok,ko)=>setTimeout(()=>ko(new Error('trop long')),2500))]);
    const n=VW_N, len=ab.length, chs=[]; if(!len) return ''; for(let c=0;c<ab.numberOfChannels;c++) chs.push(ab.getChannelData(c));
    const step=len/n, rms=[]; let max=0;
    for(let i=0;i<n;i++){ const a=Math.floor(i*step), b=Math.max(a+1,Math.floor((i+1)*step)); let s=0,k=0;
      for(let j=a;j<b;j+=4){ let v=0; for(const d of chs) v+=d[j]; v/=chs.length; s+=v*v; k++; }   // un échantillon sur 4 suffit
      const r=Math.sqrt(s/Math.max(1,k)); rms.push(r); if(r>max) max=r; }
    if(max<0.003) return '0'.repeat(n);   // silence
    return rms.map(r=>Math.round(31*Math.pow(r/max,0.7)).toString(32)).join(''); }
  catch(e){ return ''; } }
// Barres d'attente des anciens vocaux : toujours les mêmes pour un même vocal
function vwSeed(id){ let h=2166136261; for(const c of String(id)) h=Math.imul(h^c.charCodeAt(0),16777619);
  const r=[]; for(let i=0;i<VW_N;i++){ h=Math.imul(h^(h>>>15),2246822519)>>>0; r.push(h%17); }
  return r.map((x,i)=>Math.min(31,Math.round(4+((r[i-1]??x)+x*2+(r[i+1]??x))/4)).toString(32)).join(''); }
const vwBars = w => [...w].map(c=>`<i style="height:${Math.round(10+(parseInt(c,32)||0)/31*90)}%"></i>`).join('');
const vwOf = v => VW_RE.test(v.w||'')?v.w:(VW_RE.test(VWAVE[v.id]||'')?VWAVE[v.id]:'');
const vPct = p => { const a=p&&p.audio; if(!a) return 0; const d=isFinite(a.duration)&&a.duration>0?a.duration:(+p.dur||0); return d?Math.min(100,a.currentTime/d*100):0; };
const vSetP = (x,pct) => { const w=x&&x.querySelector('.v-wave'); if(w) w.style.setProperty('--vp',(+pct||0).toFixed(1)+'%'); };
const voiceBubble = (v,kind,owner) => { const real=vwOf(v), bars=vwBars(real||vwSeed(v.id)), cur=VPLAY&&VPLAY.id===v.id;
  return `<button type="button" class="voice-play${cur&&!VPLAY.audio.paused?' on':''}" data-voice="${esc(v.id)}" data-vk="${kind}" data-vo="${esc(owner)}" data-dur="${+v.dur||0}"${real?' data-wr="1"':''} aria-label="Écouter le message vocal (${vTime(+v.dur||0)})"><span class="v-ico"><svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg><svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg></span><span class="v-wave" aria-hidden="true" style="--vp:${cur?vPct(VPLAY).toFixed(1):0}%"><span class="vw">${bars}</span><span class="vw vw-on">${bars}</span></span><span class="v-time">${vTime(+v.dur||0)}</span></button>`; };
let REC=null;   // enregistrement en cours
function stopRec(send){ const r=REC; if(!r) return; REC=null; clearInterval(r.tick); r.send=send; try{ if(r.mr.state!=='inactive') r.mr.stop(); else r.finish(); }catch(e){ r.finish(); } }
async function recordVoice(onDone){
  if(REC) return; const form=document.getElementById('chatform'); if(!form) return; if(CP.open) cpClose(false);
  let stream; try{ stream=await navigator.mediaDevices.getUserMedia({audio:true}); }
  catch(e){ toast(e&&e.name==='NotAllowedError'?'Autorise le micro dans ton navigateur pour envoyer un message vocal.':"Le micro n'est pas disponible sur cet appareil.",4000); return; }
  if(!document.body.contains(form)){ stream.getTracks().forEach(t=>t.stop()); return; }   // le joueur a quitté la conversation entre-temps
  const type=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(t=>{ try{ return MediaRecorder.isTypeSupported(t); }catch(e){ return false; } });
  let mr; try{ mr=new MediaRecorder(stream,type?{mimeType:type,audioBitsPerSecond:24000}:{audioBitsPerSecond:24000}); }catch(e){ try{ mr=new MediaRecorder(stream); }catch(x){ stream.getTracks().forEach(t=>t.stop()); toast("L'enregistrement n'est pas possible sur cet appareil."); return; } }
  const chunks=[], t0=Date.now(), bar=document.createElement('div'), vmax=voiceMax(mr.mimeType||type); bar.className='rec-bar';
  bar.innerHTML=`<i class="rec-dot" aria-hidden="true"></i><b aria-live="off">0:00 / ${vTime(vmax)}</b><button class="btn btn-sm btn-ghost" type="button" data-rec="0">Annuler</button><button class="btn btn-sm btn-ac" type="button" data-rec="1">Envoyer</button>`;
  form.classList.add('rec'); form.appendChild(bar);
  const r=REC={mr,send:false,tick:0};
  r.finish=()=>{ stream.getTracks().forEach(t=>t.stop()); bar.remove(); form.classList.remove('rec');
    if(!r.send){ typingSend(''); return; } DB._typ=null; const dur=Math.min(vmax,Math.max(1,Math.round((r.t1-t0)/1000)));
    if(r.t1-t0<700||!chunks.length){ toast('Message trop court.'); return; }
    const fr=new FileReader(); fr.onerror=()=>toast("Le message vocal n'a pas pu être préparé.");
    fr.onload=async()=>{ const data=String(fr.result||''); if(!VOICE_RE.test(data)){ toast("Ce format de son n'est pas pris en charge."); return; }
      if(r.t1-t0>=4000){ try{ localStorage.setItem('coopo_vrate',String(Math.round(data.length/((r.t1-t0)/1000)))); }catch(e){} }   // le poids d'une seconde de son sur cet appareil
      if(data.length>VOICE_LIMIT){ toast(`Message vocal trop lourd pour ce téléphone : il ne peut pas dépasser ${vTime(voiceMax(mr.mimeType||type))}. Réessaie en plus court.`,5000); return; }
      const w=await vwFromData(data); onDone({data,dur,w}); };   // les ondes partent avec le message ('' si le téléphone ne sait pas les calculer)
    fr.readAsDataURL(new Blob(chunks,{type:(mr.mimeType||type||'audio/webm').split(';')[0]})); };
  mr.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
  mr.onstop=()=>{ r.t1=r.t1||Date.now(); r.finish(); }; mr.onerror=()=>{ r.send=false; r.t1=Date.now(); if(REC===r){ REC=null; clearInterval(r.tick); } r.finish(); };
  bar.querySelector('[data-rec="0"]').onclick=()=>{ r.t1=Date.now(); stopRec(false); };
  bar.querySelector('[data-rec="1"]').onclick=()=>{ r.t1=Date.now(); stopRec(true); };
  typingSend('v');   // v15 — le mate voit « enregistre un vocal… »
  r.tick=setInterval(()=>{ const s=(Date.now()-t0)/1000; const b=bar.querySelector('b'); if(b) b.textContent=`${vTime(s)} / ${vTime(vmax)}`; typingSend('v');
    if(s>=vmax){ r.t1=Date.now(); stopRec(true); } else if(!document.body.contains(form)){ r.t1=Date.now(); stopRec(false); } },250);
  try{ mr.start(); }catch(e){ r.t1=Date.now(); stopRec(false); toast("L'enregistrement n'a pas pu démarrer."); }
}
window.addEventListener('hashchange',()=>{ if(REC){ REC.t1=Date.now(); stopRec(false); } if(VPLAY){ try{ VPLAY.audio.pause(); }catch(e){} VPLAY=null; } });
// Lecture : le son est téléchargé au premier appui, puis gardé en mémoire
let VPLAY=null;
const vBtn = id => document.querySelector(`.voice-play[data-voice="${CSS.escape(id)}"]`);
document.addEventListener('click',async e=>{ const b=e.target.closest('.voice-play'); if(!b) return; const id=b.dataset.voice;
  if(VPLAY&&VPLAY.id===id){ if(VPLAY.audio.paused){ VPLAY.audio.play().catch(()=>{}); } else VPLAY.audio.pause(); return; }
  if(VPLAY){ try{ VPLAY.audio.pause(); }catch(x){} const o=vBtn(VPLAY.id); if(o){ o.classList.remove('on'); vSetP(o,0); } VPLAY=null; }
  if(b.dataset.busy) return; b.dataset.busy='1'; const data=await DB.loadVoice(b.dataset.vk,b.dataset.vo,id); delete b.dataset.busy; { const nb=vBtn(id); if(nb) delete nb.dataset.busy; }
  if(!data||!VOICE_RE.test(data)){ toast("Ce message vocal n'est plus disponible."); return; }
  // ancien vocal sans ondes : on les calcule maintenant que le son est là, et on les garde sur l'appareil
  if(!(vBtn(id)||b).dataset.wr) vwFromData(data).then(w=>{ if(!w) return; vwKeep(id,w);
    document.querySelectorAll(`.voice-play[data-voice="${CSS.escape(id)}"]`).forEach(x=>{ x.dataset.wr='1'; x.querySelectorAll('.vw').forEach(s=>s.innerHTML=vwBars(w)); }); });
  const dur=+b.dataset.dur||0, audio=new Audio(data), me={id,audio,dur}; VPLAY=me;
  const sync=()=>{ const x=vBtn(id); if(!x) return; x.classList.toggle('on',VPLAY===me&&!audio.paused); vSetP(x,vPct(me)); };
  audio.ontimeupdate=audio.onplay=audio.onpause=sync;
  audio.onended=()=>{ if(VPLAY===me) VPLAY=null; const x=vBtn(id); if(x){ x.classList.remove('on'); vSetP(x,0); } };
  audio.onerror=()=>{ if(VPLAY===me) VPLAY=null; sync(); toast('Ce téléphone ne peut pas lire ce message vocal.'); };
  audio.play().catch(()=>{}); });
// Premiers messages proposés dans une conversation vide : un appui remplit le champ, le joueur peut le modifier avant d'envoyer
const QUICK_MSGS=['Salut ! On joue ce soir ?','Tu joues à quelle heure d\'habitude ?','Une partie ce week-end ?'];
document.addEventListener('click',e=>{ const q=e.target.closest('[data-quick]'); if(!q) return; const i=document.getElementById('chatin'); if(i){ i.value=q.dataset.quick; i.focus(); } });
/* Sécurité du chat : repère les numéros de téléphone et les liens dans un message */
const hasPhone = t => /(?:\+|\b00)[\s.\-]?\d(?:[\s.\-]?\d){7,14}\b/.test(t) || /\b0\d(?:[\s.\-]?\d{2}){4}\b/.test(t);
const hasLink = t => /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|gg|me|ly|xyz|app|link|ci|fr|tk)\b/i.test(t);
const msgWarn = m => m.from==='me' ? '' : hasPhone(m.text) ? '<em class="bubble-warn">Prudence : ne partage ton numéro qu\'avec quelqu\'un que tu connais vraiment.</em>'
  : hasLink(m.text) ? '<em class="bubble-warn">Prudence avec les liens : ne saisis jamais ton mot de passe sur un site inconnu.</em>' : '';
/* ---- Modifier ou supprimer ses messages (v10) ----
   Seul l'auteur modifie un message écrit, ou supprime n'importe lequel de ses messages. Un message supprimé reste à sa place : « Message supprimé ».
   Les anciennes versions restent rangées dans le message (hist) : la modération peut les lire si la conversation est signalée (voir les règles v10).
   Dans un groupe, le créateur et les modérateurs peuvent toujours effacer le message d'un autre (« Supprimer », comme avant). */
let EDIT=null;   // le message en cours de modification : { kind:'c' (privé) | 'g' (groupe), owner: le mate ou le groupe, id, text }
const MSG_DEL_TEXT='Message supprimé';
const msgList = (kind,owner) => kind==='g' ? (GMSGS[owner]||[]) : (S.chats[owner]||[]);
const msgFind = (kind,owner,mid) => msgList(kind,owner).find(m=>m.id===mid);
const msgEditable = m => !!m && !m.del && !m.voice && !m.photo && !m.sticker && !m.call;
const MORE_SVG='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/></svg>';
// le contenu d'une bulle
// v11 — un message fait seulement d'1 à 3 emojis s'affiche en grand, sans bulle (comme sur TikTok)
const EMO_ONLY=/^(?:[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}\u200D\uFE0F\u20E3]|\s)+$/u, EMO_ANY=/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u;
function jumboN(t){ t=String(t||'').trim(); if(!t||t.length>40||!EMO_ONLY.test(t)||!EMO_ANY.test(t)) return 0; const x=t.replace(/\s+/g,''); let n=0;
  try{ n=[...new Intl.Segmenter('fr',{granularity:'grapheme'}).segment(x)].length; }catch(e){ n=(x.match(/\p{Extended_Pictographic}/gu)||[]).length; }
  return n>=1&&n<=3?n:0; }
function msgBody(m,kind,owner,mine){
  if(m.del) return `<span class="msg-del">${MSG_DEL_TEXT}</span>`;
  if(m.call) return callLineHTML(m.call,mine);
  if(m.voice) return voiceBubble(m.voice,kind,owner);
  if(m.photo) return photoBubble(m.photo,kind,owner);
  if(m.sticker) return stickerBubble(m.sticker,mine);
  const jn=jumboN(m.text); if(jn) return `<span class="jumbo j${jn}">${esc(String(m.text).trim())}</span>`;
  return `<span>${esc(m.text)}</span>${mine?'':msgWarn({from:m.from,text:m.text})}`; }
// le bas d'une bulle : l'heure, « modifié », et le bouton d'options (tous les messages : répondre, copier ; les miens : modifier, supprimer)
const msgMeta = (m,mine,kind,owner,tag='') => `${ago(m.at)}${m.edited&&!m.del?' · modifié':''}${tag}${m.id&&!m.del?`<button type="button" class="msg-more" data-mm="${esc(m.id)}" data-mk="${kind}" data-mo="${esc(owner)}" aria-label="Actions sur ce message" aria-haspopup="menu" title="Options du message">${MORE_SVG}</button>`:''}`;
/* ---- v13 — Appui long sur un message, façon TikTok ----
   On garde le doigt sur un message (ou clic droit, ou le bouton ⋯) : le reste de l'écran s'assombrit, le message reste en avant
   et un menu s'ouvre juste à côté : Répondre et Copier sur tous les messages, Modifier et Supprimer sur les miens.
   Dans un groupe, le créateur et les modérateurs ont aussi « Supprimer pour tous » sur les messages des autres. */
const REPLY_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6.5 4.5 11.5l5 5"/><path d="M5 11.5h9a5.5 5.5 0 0 1 5.5 5.5v1"/></svg>';
const COPY_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.2a1.7 1.7 0 0 0-1.7-1.7H6.2a1.7 1.7 0 0 0-1.7 1.7v7.6a1.7 1.7 0 0 0 1.7 1.7h2.3"/></svg>';
const PEN_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 19.5h4l10.3-10.3a2.1 2.1 0 0 0-3-3L5.5 16.5z"/><path d="M13.8 8.2l3 3"/></svg>';
const TRASH_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 7h15M9.5 7V5.2c0-.9.7-1.7 1.7-1.7h1.6c1 0 1.7.8 1.7 1.7V7M6.6 7l.9 11.8c.1 1 .9 1.7 1.8 1.7h5.4c1 0 1.7-.7 1.8-1.7L17.4 7"/><path d="M10 11v5.5M14 11v5.5"/></svg>';
/* ---- v14 — Réactions avec des emojis ----
   Dans le menu de l'appui long, une rangée d'emojis (❤️ 😂 😮 😢 😡 👍, et + pour les autres). La réaction s'affiche sous le message,
   avec le nombre ; un appui dessus montre qui a réagi (et « Retirer » pour la sienne). Une réaction par personne et par message :
   re = { identifiant du compte : emoji } dans le message ; chacun ne peut toucher que la sienne (règles Firestore v12). */
const RX_QUICK=['❤️','😂','😮','😢','😡','👍'];
const RX_OK=/^[^A-Za-z0-9<>&"'\\]{1,16}$/u;   // un emoji : ni lettres, ni chiffres, 16 caractères au plus
const RX_PLUS_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const rxKey = kind => msgUid(kind, kind==='g'?myId():'me');   // ma place dans re : l'identifiant de mon compte
const rxMine = (m,kind) => (m&&m.re&&m.re[rxKey(kind)])||'';
function rxGroups(m){ const g=new Map(); Object.entries(m.re||{}).forEach(([u,e])=>{ if(!g.has(e)) g.set(e,[]); g.get(e).push(u); }); return [...g.entries()].sort((a,b)=>b[1].length-a[1].length); }
function reactsHTML(m,kind,owner){ if(!m||m.del||!m.id||!m.re) return ''; const gs=rxGroups(m); if(!gs.length) return ''; const me=rxKey(kind), d=`${kind}|${esc(owner)}|${esc(m.id)}`;
  return `<div class="msg-rx">${gs.slice(0,4).map(([e,us])=>{ const mine=us.includes(me), n=us.length;
      return `<button type="button" class="rx${mine?' on':''}" data-rx="${d}" aria-label="${esc(e)} : ${n} réaction${n>1?'s':''}${mine?', dont la tienne':''}. Voir qui a réagi"><span class="e" aria-hidden="true">${esc(e)}</span>${n>1?`<b aria-hidden="true">${n}</b>`:''}</button>`; }).join('')}${gs.length>4?`<button type="button" class="rx" data-rx="${d}" aria-label="Voir toutes les réactions"><b>+${gs.length-4}</b></button>`:''}</div>`; }
// qui a réagi (et « Retirer » pour sa propre réaction)
function rxList(kind,owner,mid){ const m=msgFind(kind,owner,mid); if(!m||!m.re) return; const me=rxKey(kind);
  const rows=Object.entries(m.re).sort((a,b)=>(b[0]===me)-(a[0]===me)).map(([u,e])=>`<li><span class="e" aria-hidden="true">${esc(e)}</span><span class="who">${esc(replyWho(kind,owner,u))}<span class="sr-only"> : ${esc(e)}</span></span>${u===me?'<button type="button" class="btn btn-sm btn-ghost" data-rx-off>Retirer</button>':''}</li>`).join('');
  modal(`<h3>Réactions</h3><ul class="rx-list">${rows}</ul><div class="dlg-actions"><button class="btn" type="button" data-close>Fermer</button></div>`,
    d=>{ const b=d.querySelector('[data-rx-off]'); if(b) b.addEventListener('click',()=>{ d.close(); DB.react(kind,owner,mid,null); }); }); }
// « + » : tous les emojis
function rxPick(kind,owner,m){ const cur=rxMine(m,kind);
  modal(`<h3>Réagir avec un emoji</h3><div class="rx-pick" role="group" aria-label="Emojis">${EMOJIS.map(e=>`<button type="button" class="rx-pk" data-pk="${e}" aria-label="${e}" aria-pressed="${cur===e}">${e}</button>`).join('')}</div><div class="dlg-actions"><button class="btn" type="button" data-close>Annuler</button></div>`,
    d=>d.querySelector('.rx-pick').addEventListener('click',ev=>{ const b=ev.target.closest('[data-pk]'); if(!b) return; d.close(); DB.react(kind,owner,m.id,cur===b.dataset.pk?null:b.dataset.pk); })); }
// Redessiner une conversation sans perdre sa place : si le dernier message n'a pas changé (une réaction, une modification…), on reste au même endroit
function chatKeep(box,msgs){ const lm=msgs[msgs.length-1], last=lm?String(lm.id||lm.at):'', same=box.dataset.last===last&&box.childElementCount>0, y=box.scrollTop;
  box.dataset.last=last; return same&&box.scrollHeight-y-box.clientHeight>60?y:null; }
let MM=null;   // le menu ouvert : { ov, back } (back : ce qui reprend le focus quand il se ferme)
const msgMine = (kind,m) => kind==='g' ? m.from===myId() : m.from==='me';
function mmClose(){ if(!MM) return; const {ov,back}=MM; MM=null; ov.remove(); try{ if(back&&document.body.contains(back)) back.focus({preventScroll:true}); }catch(e){} }
function msgMenu(kind,owner,mid,src){ mmClose(); const m=msgFind(kind,owner,mid); if(!m||m.del||!m.id) return;
  const mine=msgMine(kind,m), g=kind==='g'?gById(owner):null, modDel=kind==='g'&&!mine&&!!g&&gCanMod(g);
  const bub=(src&&src.closest&&src.closest('.bubble'))||document.querySelector(`#chatbox .bubble[data-mid="${CSS.escape(mid)}"]`);
  const items=[['reply','Répondre',REPLY_SVG],msgEditable(m)&&['copy','Copier',COPY_SVG],mine&&msgEditable(m)&&['edit','Modifier',PEN_SVG],mine&&['del','Supprimer',TRASH_SVG],modDel&&['gdel','Supprimer pour tous',TRASH_SVG]].filter(Boolean);
  const ov=document.createElement('div'); ov.className='mm-ov'; ov.id='mm-ov';
  const cur=rxMine(m,kind), other=cur&&!RX_QUICK.includes(cur);   // v14 — ma réaction actuelle (surlignée ; la toucher à nouveau la retire)
  ov.innerHTML=`<div class="mm-dim" data-mm-close></div><div class="mm-rxbar" role="group" aria-label="Réagir à ce message">${RX_QUICK.map(e=>`<button type="button" class="mm-rx" data-mm-rx="${e}" aria-label="Réagir avec ${e}" aria-pressed="${cur===e}">${e}</button>`).join('')}<button type="button" class="mm-rx more" data-mm-rxmore aria-label="${other?`Ta réaction : ${esc(cur)}. Autres emojis`:'Autres emojis'}"${other?' aria-pressed="true"':''}>${other?esc(cur):RX_PLUS_SVG}</button></div><div class="mm-menu" role="menu" aria-label="Actions sur le message">${items.map(([k,l,ic])=>`<button type="button" role="menuitem" class="mm-it${k==='del'||k==='gdel'?' danger':''}" ${k==='gdel'?`data-gdel="${esc(m.id)}"`:`data-mm-${k}`}>${ic}<span>${l}</span></button>`).join('')}</div>`;
  // le message reste en avant : une copie posée exactement à sa place, au-dessus du voile
  let r=null, lift=null;
  if(bub){ const b0=bub.getBoundingClientRect(), w=bub.offsetWidth, h=bub.offsetHeight; r={left:b0.left+b0.width/2-w/2, top:b0.top+b0.height/2-h/2, width:w, height:h};
    lift=bub.cloneNode(true); lift.classList.remove('pressing','flash'); lift.classList.add('mm-lift'); ['data-msg','data-own','data-mid'].forEach(x=>lift.removeAttribute(x)); lift.setAttribute('aria-hidden','true');
    lift.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
    const cs=getComputedStyle(bub); ['paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderStyle','borderColor','backgroundColor','color','fontSize','lineHeight','gap'].forEach(k=>{ lift.style[k]=cs[k]; });
    Object.assign(lift.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',margin:'0',maxWidth:'none',boxSizing:'border-box'});
    ov.insertBefore(lift,ov.querySelector('.mm-menu')); }
  document.body.appendChild(ov);
  // le menu : sous le message, sinon au-dessus, sinon en bas de l'écran (le message remonte alors juste au-dessus)
  const menu=ov.querySelector('.mm-menu'), vw=innerWidth, vh=(window.visualViewport&&visualViewport.height)||innerHeight, pad=12, mw=menu.offsetWidth, mh=menu.offsetHeight;
  let top, left, oy='top';
  if(r){ left=mine?r.left+r.width-mw:r.left; menu.style.setProperty('--mm-ox',mine?'right':'left');
    if(r.top+r.height+8+mh<=vh-pad) top=r.top+r.height+8;
    else if(r.top-8-mh>=pad){ top=r.top-8-mh; oy='bottom'; }
    else { top=vh-pad-mh; if(lift) lift.style.top=Math.max(pad,top-8-r.height)+'px'; } }
  else { left=(vw-mw)/2; top=(vh-mh)/2; }
  left=Math.max(pad,Math.min(vw-pad-mw,left)); top=Math.max(pad,top);
  menu.style.left=left+'px'; menu.style.top=top+'px'; menu.style.setProperty('--mm-oy',oy);
  // v14 — la rangée de réactions : au-dessus du message, sinon sous le message, sinon au-dessus ou sous le menu (là où il y a la place)
  { const rb=ov.querySelector('.mm-rxbar'), bw=rb.offsetWidth, bh=rb.offsetHeight, lt=lift?parseFloat(lift.style.top):r?r.top:top, lh=r?r.height:0;
    const boxes=[[top,top+mh]].concat(r?[[lt,lt+lh]]:[]), free=y=>y>=pad&&y+bh<=vh-pad&&boxes.every(([a,b])=>y+bh<=a-4||y>=b+4);
    const tries=r?[lt-8-bh,lt+lh+8,top-8-bh,top+mh+8]:[top-8-bh,top+mh+8];
    const by=tries.find(free); const bx=Math.max(pad,Math.min(vw-pad-bw,r?(mine?r.left+r.width-bw:r.left):(vw-bw)/2));
    rb.style.left=bx+'px'; rb.style.top=(by==null?pad:by)+'px'; rb.style.setProperty('--mm-ox',mine?'right':'left'); }
  MM={ov,back:src&&src.classList&&src.classList.contains('msg-more')?src:(bub&&bub.querySelector('.msg-more'))||null};
  ov.addEventListener('click',e=>{ if(e.target.closest('[data-mm-close]')){ mmClose(); return; }
    const rx=e.target.closest('[data-mm-rx]'); if(rx){ mmClose(); DB.react(kind,owner,m.id,cur===rx.dataset.mmRx?null:rx.dataset.mmRx); return; }   // v14
    if(e.target.closest('[data-mm-rxmore]')){ mmClose(); rxPick(kind,owner,m); return; }
    const t=e.target.closest('.mm-it'); if(!t) return; mmClose();
    if(t.hasAttribute('data-mm-reply')) startReply(kind,owner,m);
    else if(t.hasAttribute('data-mm-copy')) (async()=>{ try{ await navigator.clipboard.writeText(m.text); toast('Message copié'); }catch(er){ toast("Impossible de copier ici."); } })();
    else if(t.hasAttribute('data-mm-edit')) startEdit(kind,owner,m);
    else if(t.hasAttribute('data-mm-del')) modal(`<h3>Supprimer ce message ?</h3><p class="muted">Il sera remplacé par « ${MSG_DEL_TEXT} » pour tout le monde. On ne peut pas revenir en arrière.</p>
      <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-danger" type="button" id="mm-del-ok">Supprimer</button></div>`,
      d2=>d2.querySelector('#mm-del-ok').addEventListener('click',()=>{ d2.close(); if(EDIT&&EDIT.id===m.id) endEdit(true); if(REPLY&&REPLY.id===m.id) endReply(); DB.deleteMessage(kind,owner,m.id); }));
    else if(t.hasAttribute('data-gdel')) modal(`<h3>Supprimer ce message pour tout le monde ?</h3><p class="muted">Il sera effacé du groupe pour de bon, avec sa photo ou son vocal.</p>
      <div class="dlg-actions"><button class="btn btn-ghost" type="button" data-close>Annuler</button><button class="btn btn-danger" type="button" id="gdel-ok">Supprimer</button></div>`,
      d2=>d2.querySelector('#gdel-ok').addEventListener('click',()=>{ d2.close(); DB.deleteGroupMessage(owner,m.id); })); });
  ov.addEventListener('keydown',e=>{ const inRx=!!document.activeElement.closest('.mm-rxbar'), its=[...ov.querySelectorAll(inRx?'.mm-rx':'.mm-it')], all=[...ov.querySelectorAll('.mm-rx,.mm-it')], k=its.indexOf(document.activeElement);
    if(e.key==='Escape'){ e.preventDefault(); mmClose(); }
    else if(e.key==='Tab'){ e.preventDefault(); const j=all.indexOf(document.activeElement), d=e.shiftKey?-1:1; all[(j+d+all.length)%all.length]?.focus(); }   // Tab : réactions puis menu
    else if((!inRx&&(e.key==='ArrowDown'||e.key==='ArrowUp'))||(inRx&&(e.key==='ArrowRight'||e.key==='ArrowLeft'))){ e.preventDefault(); const d=e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:1; its[(k+d+its.length)%its.length]?.focus(); }
    else if(inRx&&(e.key==='ArrowDown'||e.key==='ArrowUp')){ e.preventDefault(); ov.querySelector('.mm-it')?.focus(); }
    else if(!inRx&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){ e.preventDefault(); ov.querySelector('.mm-rx')?.focus(); }
    else if(e.key==='Home'||e.key==='End'){ e.preventDefault(); its[e.key==='Home'?0:its.length-1]?.focus(); } });
  ov.querySelector('.mm-it')?.focus({preventScroll:true}); }
addEventListener('hashchange',()=>mmClose());
// Répondre à un message : un bandeau « Réponse à … » au-dessus de la zone d'écriture ; le prochain message envoyé (texte, sticker, photo ou vocal) le cite.
// Le message ne garde que { id, from } : la citation montre le message d'origine tel qu'il est aujourd'hui (modifié, ou « Message supprimé »).
let REPLY=null;   // { kind, owner, id, from } — from : l'identifiant du compte de l'auteur
const msgUid = (kind,from) => kind==='g'||!DB.live ? from : DB.toUid(from);     // auteur tel qu'affiché ici ('me' pour moi) → identifiant du compte
const uidLocal = (kind,uid) => kind==='g'||!DB.live ? uid : DB.fromUid(uid);    // et l'inverse
function replyWho(kind,owner,uid){ const f=uidLocal(kind,uid);
  if(kind==='g'){ if(f===myId()) return 'Toi'; const p=gPlayer(f); return p&&p.name?p.name:'Un ancien membre'; }
  if(f==='me') return 'Toi'; const p=PLAYERS.find(x=>x.id===f)||PLAYERS.find(x=>x.id===owner); return p&&p.name?p.name:'Ton mate'; }
const replyText = m => m.del ? MSG_DEL_TEXT : m.call ? callText(m.call) : m.photo ? PHOTO_TEXT : m.voice ? VOICE_TEXT : m.sticker ? STICKER_TEXT : String(m.text||'').replace(/\s+/g,' ').trim();
const cut = (t,n) => t.length>n ? t.slice(0,n)+'…' : t;
function startReply(kind,owner,m){ const f=document.getElementById('chatform'), i=document.getElementById('chatin'); if(!f||!i||!m||!m.id) return;
  if(EDIT) endEdit(true);
  REPLY={kind,owner,id:m.id,from:msgUid(kind,m.from)};
  let bar=document.getElementById('reply-bar'); if(!bar){ bar=document.createElement('div'); bar.id='reply-bar'; bar.className='edit-bar reply-bar'; bar.setAttribute('role','status'); f.before(bar); }
  bar.innerHTML=`<span><b>Réponse à ${esc(replyWho(kind,owner,REPLY.from))}</b><small>${esc(cut(replyText(m),90))}</small></span><button type="button" class="btn btn-ghost btn-sm reply-x" data-reply-cancel aria-label="Ne plus répondre à ce message">×</button>`;
  i.focus(); }
function endReply(){ REPLY=null; document.getElementById('reply-bar')?.remove(); }
function takeReply(kind,owner){ if(!REPLY||REPLY.kind!==kind||REPLY.owner!==owner) return null; const r={id:REPLY.id,from:REPLY.from}; endReply(); return r; }
// la citation en haut de la bulle (un appui : on remonte jusqu'au message d'origine)
function replyQuote(m,kind,owner){ const r=m.reply; if(!r||m.del) return ''; const o=msgFind(kind,owner,r.id);
  return `<button type="button" class="msg-reply" data-goto="${esc(r.id)}" aria-label="Voir le message d'origine"><b>${esc(replyWho(kind,owner,r.from))}</b><span>${esc(cut(o?replyText(o):'Message plus ancien',80))}</span></button>`; }
// Modifier : le texte revient dans la zone d'écriture, avec un bandeau « Modifier le message · Annuler »
function startEdit(kind,owner,m){ const i=document.getElementById('chatin'), f=document.getElementById('chatform'); if(!i||!f||!msgEditable(m)) return;
  EDIT={kind,owner,id:m.id,text:m.text}; endReply(); if(CP.open) cpClose(false); qrUpdate();
  let bar=document.getElementById('edit-bar'); if(!bar){ bar=document.createElement('div'); bar.id='edit-bar'; bar.className='edit-bar'; bar.setAttribute('role','status'); f.before(bar); }
  bar.innerHTML=`<span><b>Modifier le message</b><small>${esc(m.text.length>90?m.text.slice(0,90)+'…':m.text)}</small></span><button type="button" class="btn btn-ghost btn-sm" data-edit-cancel>Annuler</button>`;
  f.classList.add('editing'); const sb=f.querySelector('button[type="submit"]'); if(sb){ const t=sb.querySelector('.send-txt'); if(t) t.textContent='Enregistrer'; else sb.textContent='Enregistrer'; sb.setAttribute('aria-label','Enregistrer'); }
  i.value=m.text; i.focus(); try{ i.setSelectionRange(i.value.length,i.value.length); }catch(e){} }
function endEdit(clear){ EDIT=null; document.getElementById('edit-bar')?.remove(); const f=document.getElementById('chatform');
  if(f){ f.classList.remove('editing'); const sb=f.querySelector('button[type="submit"]'); if(sb){ const t=sb.querySelector('.send-txt'); if(t) t.textContent='Envoyer'; else sb.textContent='Envoyer'; sb.setAttribute('aria-label','Envoyer'); } }
  if(clear){ const i=document.getElementById('chatin'); if(i) i.value=''; } qrUpdate(); }
// Le message en cours de modification est enregistré (appelé par l'envoi, après les contrôles habituels) : true si c'était une modification
function submitEdit(t){ if(!EDIT) return false; const e=EDIT; endEdit(true); if(t!==e.text) DB.editMessage(e.kind,e.owner,e.id,t); return true; }
{ let lpT=0, prT=0, lpX=0, lpY=0, lpAt=0, lpB=null, lpEat=false;   // appui long sur un message (téléphone, ou souris maintenue) ou clic droit (ordinateur) : le menu du message
  const open=b=>{ const [k,o,id]=b.dataset.msg.split('|'); lpAt=Date.now(); lpEat=true; b.classList.remove('pressing'); try{ navigator.vibrate&&navigator.vibrate(12); }catch(e){} msgMenu(k,o,id,b); };
  const stop=()=>{ clearTimeout(lpT); clearTimeout(prT); if(lpB){ lpB.classList.remove('pressing'); lpB=null; } };
  document.addEventListener('pointerdown',e=>{ stop(); lpEat=false; const b=e.target.closest('.bubble[data-msg]'); if(!b||e.button>0||e.target.closest('a,input,.msg-more,.msg-rx')) return;
    lpX=e.clientX; lpY=e.clientY; lpB=b; prT=setTimeout(()=>b.classList.add('pressing'),140); lpT=setTimeout(()=>{ lpB=null; open(b); },480); });
  document.addEventListener('pointerup',stop); document.addEventListener('pointercancel',stop);
  document.addEventListener('pointermove',e=>{ if(lpB&&Math.abs(e.clientX-lpX)+Math.abs(e.clientY-lpY)>12) stop(); },{passive:true});
  document.addEventListener('scroll',()=>{ if(lpB) stop(); },true);
  // le clic qui termine un appui long n'ouvre ni la photo, ni le sticker, ni le vocal (le prochain appui, lui, marche normalement)
  document.addEventListener('click',e=>{ if(!lpEat) return; lpEat=false; if(e.target.closest&&e.target.closest('.bubble[data-msg]')){ e.preventDefault(); e.stopPropagation(); } },true);
  document.addEventListener('contextmenu',e=>{ const b=e.target.closest('.bubble[data-msg]'); if(!b) return; e.preventDefault(); stop(); if(Date.now()-lpAt>900) open(b); });
  document.addEventListener('click',e=>{ const mm=e.target.closest('.msg-more[data-mm]'); if(mm){ msgMenu(mm.dataset.mk,mm.dataset.mo,mm.dataset.mm,mm); return; }
    const rx=e.target.closest('.rx[data-rx]'); if(rx){ const [k,o,id]=rx.dataset.rx.split('|'); rxList(k,o,id); return; }   // v14 — qui a réagi
    const go=e.target.closest('.msg-reply[data-goto]');
    if(go){ const el=document.querySelector(`#chatbox .bubble[data-mid="${CSS.escape(go.dataset.goto)}"]`);
      if(el){ el.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1500); }
      else toast('Ce message est trop ancien pour être affiché ici.'); return; }
    if(e.target.closest('[data-edit-cancel]')){ endEdit(true); document.getElementById('chatin')?.focus(); return; }
    if(e.target.closest('[data-reply-cancel]')){ endReply(); document.getElementById('chatin')?.focus(); } });
  document.addEventListener('keydown',e=>{ if(e.key!=='Escape'||!e.target||e.target.id!=='chatin') return;
    if(EDIT){ e.preventDefault(); endEdit(true); } else if(REPLY){ e.preventDefault(); endReply(); } });
  addEventListener('hashchange',()=>{ EDIT=null; REPLY=null; stop(); }); }
// v19 — une bulle ne « saute » que si son message vient d'arriver : ouvrir une conversation, en changer ou la redessiner n'anime rien (ordinateur ; sur téléphone, rien ne saute)
const bubbleSeen = box => ({ n:box.querySelectorAll('.bubble').length, ids:new Set([...box.querySelectorAll('.bubble[data-mid]')].map(b=>b.dataset.mid)), drawn:!!box.dataset.drawn });
function bubbleNew(box,was){ box.dataset.drawn='1'; if(!was.drawn) return;
  const bs=[...box.querySelectorAll('.bubble')], add=bs.length-was.n; if(add>0&&add<=3) bs.slice(-add).forEach(b=>{ if(!b.dataset.mid||!was.ids.has(b.dataset.mid)) b.classList.add('pop-in'); }); }   // beaucoup d'un coup : la conversation qui finit de se charger, pas des messages qui arrivent
function renderChat(id){
  const box=document.getElementById('chatbox'); if(!box) return; const msgs=S.chats[id]||[]; dmRefresh(); setTimeout(photoWatch,0); setTimeout(stickerWatch,0); const was=bubbleSeen(box);
  const keep=chatKeep(box,msgs);   // v14 — un message modifié (réaction…) : on reste au même endroit ; un nouveau message : on descend
  // v15 — « Vu » : sous mon dernier message que le mate a lu
  let seenK=-1; { const os=seenOf(id); if(os) for(let k=msgs.length-1;k>=0;k--){ if(msgs[k].from==='me'&&msgs[k].at<=os){ seenK=k; break; } } }
  box.innerHTML = msgs.length ? msgs.map((m,k)=>{ const mine=m.from==='me';
      return `<div class="bubble${mine?' me':''}${m.del?' del':''}"${m.id?` data-mid="${esc(m.id)}"`:''}${m.id&&!m.del?` data-msg="c|${esc(id)}|${esc(m.id)}"`:''}${mine&&m.id&&!m.del?` data-own="c|${esc(id)}|${esc(m.id)}"`:''}>${replyQuote(m,'c',id)}${msgBody(m,'c',id,mine)}<small>${msgMeta(m,mine,'c',id,k===seenK?' · <span class="seen-tag">Vu</span>':'')}</small>${reactsHTML(m,'c',id)}</div>`; }).join('')
    : `<div class="chat-empty"><p class="muted">Première partie ensemble ? Propose un créneau 🎮</p><div class="chips">${QUICK_MSGS.map(t=>`<button type="button" class="chip" data-quick="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>`;
  bubbleNew(box,was);
  box.scrollTop=keep==null?box.scrollHeight:keep;
  { const lm=msgs[msgs.length-1]; QR.key='c:'+id; QR.last=lm&&!lm.call?{id:lm.id,at:lm.at,mine:lm.from==='me',del:!!lm.del}:null; qrUpdate(); }   // v16 — pas de « réponds avec un sticker » après une ligne d'appel
  { const p=PLAYERS.find(x=>x.id===id), fh=document.getElementById('flame-hint'); if(fh) fh.innerHTML=flameHint(id,p?p.name:'Ton mate'); }
  seenMark('c',id);
}
