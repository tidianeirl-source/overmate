/* Coopô — js/boutique.js
   Boutique, paiement, page Boutique, inventaire, retour de paiement.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* ---- Boutique (prix identiques à lib/catalogue.js du serveur de paiement) ---- */
// enabled : true -> les objets payants sont verrouillés (false -> tout est gratuit)
// api     : adresse du serveur de paiement (Vercel). C'est lui qui dit si le paiement est ouvert (voir payInit) et lui seul qui débloque un achat.
const SHOP = { enabled:true, api:'https://coopo-paiement.vercel.app/api', region:'europe-west1', currencies:['XOF'] };   // currencies : devises proposées tant que le serveur n'a pas répondu
// Prix par devise : theme/pack = thèmes · p1..p5 = plaques (couleur, dégradé ou motif, brillant, édition limitée, illustrée) · k1..k4 = packs de plaques
const CURRENCIES = {
  XOF:{ label:'F CFA (BCEAO)', unit:'F CFA', theme:1500,  premium:3000,  pack:7500,  p1:500, p2:800, p3:1000, p4:2000, p5:1500, k1:2000, k2:2500, k3:2400, k4:6000, countries:['CI','SN','ML','BF','BJ','TG','NE'] },
  XAF:{ label:'F CFA (BEAC)',  unit:'F CFA', theme:1500,  premium:3000,  pack:7500,  p1:500, p2:800, p3:1000, p4:2000, p5:1500, k1:2000, k2:2500, k3:2400, k4:6000, countries:['CM','GA','CG'] },
  GNF:{ label:'Franc guinéen', unit:'GNF',   theme:21000, premium:42000, pack:105000, p1:7000, p2:11000, p3:14000, p4:28000, p5:21000, k1:28000, k2:35000, k3:33500, k4:84000, countries:['GN'] },
  CDF:{ label:'Franc congolais', unit:'FC',  theme:7500, premium:15000,  pack:37500, p1:2500, p2:4000, p3:5000, p4:10000, p5:7500, k1:10000, k2:12500, k3:12000, k4:30000, countries:['CD'] },
};
const curOK = c => !SHOP.currencies || SHOP.currencies.includes(c);
function curCode(){
  if(S.currency && CURRENCIES[S.currency] && curOK(S.currency)) return S.currency;
  const c=S.me&&S.me.country; const hit=Object.entries(CURRENCIES).find(([k,v])=>v.countries.includes(c)&&curOK(k));
  return hit?hit[0]:(SHOP.currencies&&SHOP.currencies[0])||'XOF';
}
const price = (kind,cur=curCode()) => CURRENCIES[cur][kind];
const PAID_SKINS = ['samurai','soft','lofi','esth','ocean'];   // « ocean » = le thème Lotus (identifiant gardé pour les comptes et les achats)
const RETIRED_SKINS = ['awale','menthe','prunier'];   // thèmes retirés : le compte repasse au thème Coopô, avec un petit mot d'explication
const RETIRED_NAMES = { awale:'Awalé', menthe:'Menthe', prunier:'Prunier' };
const PREMIUM_SKINS = ['ocean'];   // thèmes premium (3 000 F) : Lotus
const skinPrice = (id,cur=curCode()) => price(PREMIUM_SKINS.includes(id)?'premium':'theme',cur);
const money = (n,cur=curCode()) => n.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g,' ')+' '+CURRENCIES[cur].unit;
function ownsAll(){ return !!(S.owned&&S.owned.pack); }
function canUseSkin(id){
  if(!PAID_SKINS.includes(id)) return true;
  if(!AUTH_LIVE || !SHOP.enabled) return true;
  if(S.auth && id===BOOT_SKIN && !(()=>{ try{ return DB._checked||DB._loaded; }catch(e){ return false; } })()) return true; // déjà validé : affiché tout de suite, revérifié après chargement      // mode démo ou boutique fermée : tout est libre
  if(S.auth && isAdmin()) return true;   // modérateurs
  const rw=S.rewards||{}; if((rw.referrals||0)>=REF_REWARD.all) return true; if(id===REF_REWARD.one&&(rw.referred||(rw.referrals||0)>=1)) return true;
  return ownsAll() || !!(S.owned&&(S.owned.themes||[]).includes(id));
}
const LOCK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
// Aperçu d'un thème payant avant achat : 20 secondes, avec une barre pour le débloquer ou quitter
let _preview=null, _prevTick=null;
function previewSkin(id){
  const back=_preview?_preview.back:(S.skinWanted||S.skin||'defaut'); endPreview(true);
  _preview={back,id}; applySkin(id,true,{preview:true,then:()=>route()});
  let bar=document.getElementById('pv-bar'); if(!bar){ bar=document.createElement('div'); bar.id='pv-bar'; bar.setAttribute('role','status'); document.body.appendChild(bar); }
  let left=20; bar.innerHTML=`<span><b>${esc(SKINS[id].label)}</b><small>aperçu · ${left} s</small></span><button class="btn btn-sm btn-ac" type="button" data-pv-buy="${id}">Débloquer</button><button class="btn btn-sm" type="button" data-pv-end>Quitter</button>`; bar.hidden=false;
  _prevTick=setInterval(()=>{ left--; if(left<=0){ endPreview(); toast('Fin de l\'aperçu'); } else { const s=bar.querySelector('small'); if(s) s.textContent=`aperçu · ${left} s`; } },1000);
}
function endPreview(silent){ if(!_preview) return; const back=_preview.back; _preview=null; clearInterval(_prevTick); const bar=document.getElementById('pv-bar'); if(bar) bar.hidden=true;
  if(!silent) applySkin(back,true,{then:()=>route()}); }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-pv-buy]'); if(b){ buy('theme:'+b.dataset.pvBuy); return; } if(e.target.closest('[data-pv-end]')) endPreview(); });
/* ================= BOUTIQUE : thèmes, plaques nominatives, packs =================
   Les prix sont répétés dans lib/catalogue.js du serveur de paiement, et c'est LUI qui fait foi :
   le navigateur ne décide jamais d'un prix ni d'un achat. Un objet n'est débloqué que si le serveur l'a écrit dans purchases/{uid}. */
// Une plaque nominative = un bandeau décoré DERRIÈRE toute la ligne d'un joueur (photo, pseudo, statut) : une couleur, un dessin à droite, une animation au survol.
// Chaque plaque a son propre fond et sa propre couleur de texte : elle reste donc lisible sur tous les thèmes.
// Le dessin de chaque plaque est dans le style « coopo-plaques » (classe .pq-<id>). On peut aussi faire une plaque avec une image ou un GIF dont on a les droits :
//   monid:{label:'Mon nom',cat:'…',col:['#1B1030','#4A2A8C'],img:'plaques/monimage.webp',gif:'plaques/monanimation.gif'}
//   (col = les deux couleurs du fond, foncées car le pseudo est écrit en blanc · img = image fixe · gif = facultatif, joué au survol · fichiers légers, rangés dans le dépôt)
const PLATES = {
  base:{label:'Classique',cat:'base',desc:'Offerte à tous les joueurs'},
  rubis:{label:'Rubis',cat:'couleur'}, saphir:{label:'Saphir',cat:'couleur'}, emeraude:{label:'Émeraude',cat:'couleur'}, ambre:{label:'Ambre',cat:'couleur'}, onyx:{label:'Onyx',cat:'couleur'},
  aurore:{label:'Sunset',cat:'degrade',tag:'Populaire'}, lagune:{label:'Lagune',cat:'degrade'}, braise:{label:'Braise',cat:'degrade'}, neon:{label:'Néon',cat:'degrade',tag:'Nouveau'},
  pixel:{label:'Pixel',cat:'gaming',tag:'Populaire'}, manette:{label:'Manette',cat:'gaming'}, circuit:{label:'Circuit',cat:'gaming'}, damier:{label:'Damier',cat:'gaming',tag:'Nouveau'},
  or:{label:'Or',cat:'brillant',tag:'Populaire'}, chrome:{label:'Chrome',cat:'brillant'}, holo:{label:'Holo',cat:'brillant',tag:'Nouveau'},
  dragon:{label:'Dragon',cat:'rare'}, galaxie:{label:'Galaxie',cat:'rare'}, foudre:{label:'Foudre',cat:'rare'},
  flamme10:{label:'Étincelle',cat:'recompense',how:'10 jours de flamme avec un mate'}, flamme30:{label:'Brasier',cat:'recompense',how:'30 jours de flamme avec un mate'},
  flamme100:{label:'Fournaise',cat:'recompense',how:'100 jours de flamme avec un mate'}, flamme365:{label:'Flamme éternelle',cat:'recompense',how:'365 jours de flamme avec un mate'},
  souvenir:{label:'Souvenir Awalé',cat:'recompense',how:'Offerte aux joueurs qui avaient le thème Awalé'},
  coquelicots:{label:'Coquelicots',cat:'illustre',tag:'Nouveau'}, bouffon:{label:'Bouffon',cat:'illustre',tag:'Nouveau'},
  // 23 novembre 2026 — d'après trois motifs choisis par Aki (dessins originaux) : des carpes koï autour du yin et du yang, un soleil en spirale, des nuages porte-bonheur
  koi:{label:'Koï',cat:'illustre',tag:'Nouveau',soon:true}, soleil:{label:'Soleil rouge',cat:'illustre',tag:'Nouveau',soon:true}, nuages:{label:'Nuages',cat:'illustre',tag:'Nouveau',soon:true},
  // Une plaque en préparation s'écrit avec « soon:true » : on la voit dans la boutique sous « Bientôt », avec un aperçu, mais personne ne peut l'acheter ni la porter.
  // Pour la vendre : l'ajouter au catalogue du serveur de paiement (lib/catalogue.js), ranger sa famille dans PLATE_CATS avec un prix, puis retirer « soon:true ».
};
// [catégorie, titre, clé de prix, phrase]
const PLATE_CATS=[['couleur','Couleurs','p1','Une couleur franche, et des cristaux qui scintillent.'],['degrade','Dégradés animés','p2','Lever de soleil, lagune, néons : le décor bouge doucement.'],['gaming','Motifs gaming','p2','Pixels, manette, circuit, drapeau à damier.'],['brillant','Effets brillants','p3','Or, chrome, hologramme : un reflet passe sur la plaque.'],['illustre','Illustrées','p5','Un vrai petit décor qui s\'anime : des carpes koï, un soleil rouge, des nuages porte-bonheur, un pré de coquelicots…'],['rare','Édition limitée','p4','En vente pour un temps limité, puis plus jamais.']];
const RARE_UNTIL='2027-01-31';   // dernier jour de vente des plaques en édition limitée (le serveur applique la même date)
const rareOpen = () => Date.now() < Date.parse(RARE_UNTIL+'T23:59:59Z');
// Plaques retirées le 22 novembre 2026 : plus en vente, plus montrées dans la boutique, plus offertes (même aux modérateurs).
// Un joueur qui en aurait vraiment acheté ou gagné une la garde : elle reste dans son inventaire et s'affiche toujours sur son profil.
const RETIRED_PLATES=['or','chrome','holo','braise','souvenir'];
const platesIn = cat => Object.keys(PLATES).filter(k=>PLATES[k].cat===cat&&!RETIRED_PLATES.includes(k));
const platesSoon = () => Object.keys(PLATES).filter(k=>PLATES[k].soon);   // plaques en préparation : pas encore en vente
const PPACKS={ couleurs:{label:'Pack Couleurs',cat:'couleur',price:'k1'}, degrades:{label:'Pack Dégradés',cat:'degrade',price:'k1'}, gaming:{label:'Pack Gaming',cat:'gaming',price:'k2'},
  plaques:{label:'Toutes les plaques',price:'k4',tag:'Populaire'} };
const ppackItems = k => PPACKS[k].cat ? platesIn(PPACKS[k].cat) : ['couleur','degrade','gaming','brillant'].flatMap(platesIn);
const platePrice = (id,cur=curCode()) => { const c=PLATE_CATS.find(x=>x[0]===PLATES[id].cat); return c?price(c[2],cur):0; };
const plateOf = p => { const id=p&&p.plate; return id&&PLATES[id]?id:''; };
// plq(p)    le bandeau de la plaque d'un joueur : à glisser EN PREMIER dans sa ligne (rien si le joueur n'a pas de plaque)
// plqOn(p)  les classes à ajouter à cette ligne ; live = la plaque s'anime sans attendre le survol (profil, en-tête d'une conversation, aperçu)
// np(p)     le pseudo seul dans un petit bandeau, là où il n'y a pas de ligne (message d'un groupe, phrase)
const plq = p => { const id=plateOf(p); if(!id) return ''; const pl=PLATES[id], net=u=>String(u).replace(/[^\w./#-]/g,''), st=[];
  if(pl.col) st.push('--pa:'+net(pl.col[0]),'--pb:'+net(pl.col[1]||pl.col[0]));                                             // plaque faite d'une image : ses deux couleurs de fond
  if(pl.img){ st.push(`--art:url('${net(pl.img)}')`); if(pl.gif) st.push(`--art-live:url('${net(pl.gif)}')`); }   // … son image fixe, et son GIF joué au survol
  return `<i class="plq${pl.img?' plq-img':''}" aria-hidden="true"${st.length?` style="${st.join(';')}"`:''}><i></i></i>`; };
const plqOn = (p,live) => { const id=plateOf(p); return id?` plq-on pq-${id}${live?' plq-live':''}`:''; };
function np(p,name){ const id=plateOf(p), n=esc(name??(p&&p.name)??''); return id?`<span class="plq-chip${plqOn(p)}">${plq(p)}<span class="plq-t">${n}</span></span>`:n; }
// Une plaque montrée « en situation » dans la boutique : la ligne d'un joueur, avec sa photo, son pseudo et son statut
const plqDemo = id => { const me={...publicMe(),plate:id}; return `<div class="plq-demo${plqOn(me)}">${plq(me)}${avatar(me,34)}<div><b>${esc(me.name)}</b><span class="muted">En ligne</span></div></div>`; };
// Dans la boutique, une plaque s'anime dès qu'elle est à l'écran (ailleurs : quand on passe la souris sur la ligne)
let _plqIO=null;
function plqWatch(){ if(_plqIO) _plqIO.disconnect(); if(!('IntersectionObserver' in window)) return;
  _plqIO=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('plq-live',e.isIntersecting)),{threshold:.6});
  document.querySelectorAll('.shop .plq-demo').forEach(x=>_plqIO.observe(x)); }
function ownsPlate(id){ const pl=PLATES[id]; if(!pl||pl.soon) return false; if(pl.cat==='base') return true;
  if(RETIRED_PLATES.includes(id)) return pl.cat==='recompense' ? (((S.rewards||{}).plates)||[]).includes(id) : ((S.owned&&S.owned.plates)||[]).includes(id);   // plaque retirée : seulement si on l'a vraiment
  if(!AUTH_LIVE||!SHOP.enabled) return true;   // démonstration : tout est libre
  if(S.auth&&isAdmin()) return true;           // modérateurs
  if(pl.cat==='recompense') return (((S.rewards||{}).plates)||[]).includes(id);
  return ((S.owned&&S.owned.plates)||[]).includes(id); }
function setPlate(id){ if(!S.me) return; id=id&&PLATES[id]&&ownsPlate(id)?id:''; S.me.plate=id; if(S.auth) S.profiles[S.auth.uid]=S.me; save(); DB.savePlate(id);
  toast(id?`Plaque ${PLATES[id].label} équipée`:'Plaque retirée'); }
// Aperçu d'une plaque sur son propre profil, avant de l'acheter : en-tête de profil, message, ligne de la liste des mates
function platePreview(id){ const pl=PLATES[id]; if(!pl) return; const me={...publicMe(),plate:id}, own=ownsPlate(id), on=plateOf(S.me)===id;
  const act = pl.soon ? '' : own ? (on?`<button class="btn" data-use-plate="" data-close>Retirer</button>`:`<button class="btn btn-ac" data-use-plate="${id}" data-close>Équiper</button>`)
    : pl.cat==='recompense' ? '' : (pl.cat==='rare'&&!rareOpen()) ? '' : `<button class="btn btn-ac" data-shop-buy="plate:${id}">${money(platePrice(id))}</button>`;
  modal(`<h3>Plaque ${esc(pl.label)}</h3><p class="muted">Voilà ce que les autres joueurs verront.</p>
    <div class="np-prev"><div class="np-prev-head${plqOn(me,1)}">${plq(me)}${avatar(me,64)}<div><b class="np-prev-name">${esc(me.name)}</b><span class="muted">Sur ton profil</span></div></div>
      <div class="np-prev-row${plqOn(me,1)}">${plq(me)}${avatar(me,40)}<div><b>${esc(me.name)}</b><span class="muted">Dans les messages et la liste des mates</span></div></div>
      <div class="np-prev-msg"><small>${np(me)}</small><div class="bubble"><span>On lance une partie ce soir ?</span></div><span class="muted">Dans un groupe</span></div></div>
    <p class="muted" style="margin-top:10px;font-size:13px">Le décor s'anime quand on passe sur ta ligne, et en continu sur ton profil.</p>
    ${pl.soon?'<p class="hint">Cette plaque est en préparation : elle n\'est pas encore en vente.</p>':''}${pl.how&&!own?`<p class="hint">Cette plaque ne s'achète pas : ${esc(pl.how)}.</p>`:''}
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Fermer</button>${act}</div>`); }

/* ---- Paiement : le serveur dit s'il est ouvert (mode « test » = faux paiements, réservés aux modérateurs) ---- */
const PAY={ mode:'off', label:'', loaded:false };
async function payInit(){ if(PAY.loaded||PAY._busy||!SHOP.api||!AUTH_LIVE) return; PAY._busy=true;
  try{ const r=await fetch(SHOP.api.replace(/\/$/,'')+'/config'); if(r.ok){ const j=await r.json();
      if(j&&(j.mode==='test'||j.mode==='live')){ PAY.mode=j.mode; PAY.label=String(j.label||'').slice(0,60);
        if(Array.isArray(j.currencies)){ const cs=j.currencies.filter(c=>CURRENCIES[c]); if(cs.length) SHOP.currencies=cs; } } } }catch(e){}
  PAY.loaded=true; PAY._busy=false;
  if(/^#\/(boutique|inventaire)/.test(location.hash)){ const y=scrollY; route(); scrollTo(0,y); } }
const canPay = () => PAY.mode==='live' || (PAY.mode==='test' && isAdmin());
const TEST_NOTE='<div class="test-note" role="note"><b>Mode test</b><span>Faux paiement : aucun argent n\'est débité. Réservé à la modération, pour vérifier que tout marche.</span></div>';
// Description d'un article : 'theme:<id>', 'pack' (tous les thèmes), 'plate:<id>', 'ppack:<id>'
function itemInfo(item,cur=curCode()){ const [k,id]=String(item).split(':');
  if(k==='theme'&&SKINS[id]&&PAID_SKINS.includes(id)) return {title:'Thème '+SKINS[id].label,desc:SKINS[id].desc,price:skinPrice(id,cur)};
  if(k==='pack') return {title:'Tous les thèmes',desc:`Les ${PAID_SKINS.length} thèmes payants d'un coup.`,price:price('pack',cur)};
  if(k==='plate'&&PLATES[id]&&platePrice(id,cur)) return {title:'Plaque '+PLATES[id].label,desc:'Un bandeau animé derrière ton pseudo, visible par tous les joueurs.',price:platePrice(id,cur)};
  if(k==='ppack'&&PPACKS[id]) return {title:PPACKS[id].label,desc:`${ppackItems(id).length} plaques : ${ppackItems(id).map(x=>PLATES[x].label).join(', ')}.`,price:price(PPACKS[id].price,cur)};
  return null; }
function buy(item){ const inf=itemInfo(item); if(!inf) return;
  const head=`<h3>${esc(inf.title)}</h3><p class="muted">${esc(inf.desc)}</p>`, close='<div class="dlg-actions"><button class="btn" data-close>Fermer</button></div>';
  if(!AUTH_LIVE){ modal(head+'<p class="muted">En démonstration, tout est déjà débloqué.</p>'+close); return; }
  if(!canPay()){ modal(head+`<div class="buy-line"><span>Prix</span><strong>${money(inf.price)}</strong></div><div class="soon-note"><b>Bientôt disponible</b><span>Le paiement par Mobile Money arrive bientôt. En attendant, tu peux utiliser l'aperçu.</span></div>`+close); return; }
  if(!S.auth||!(S.me&&S.me.dob)){ modal(head+'<p class="muted">Termine ton profil avant de faire un achat.</p><div class="dlg-actions"><a class="btn btn-ac" href="#/profil" data-close>Compléter mon profil</a></div>'); return; }
  const minor=ageGroup(S.me)==='minor'; let cur=curCode(); const many=(SHOP.currencies||Object.keys(CURRENCIES)).length>1;
  modal(`${head}${PAY.mode==='test'?TEST_NOTE:''}
    ${many?`<div class="field buy-cur"><label for="buy-cur">Devise</label><select id="buy-cur">${Object.entries(CURRENCIES).filter(([k])=>curOK(k)).map(([k,v])=>`<option value="${k}" ${k===cur?'selected':''}>${v.label} (${k})</option>`).join('')}</select></div>`:''}
    <div class="buy-line"><span>À payer</span><strong id="buy-price">${money(inf.price,cur)}</strong></div>
    ${minor?`<label class="buy-consent"><input type="checkbox" id="buy-parent"> Un parent ou tuteur est d'accord avec cet achat.</label>`:''}
    <p class="muted buy-note">${PAY.mode==='test'?'Tu vas arriver sur une page de faux paiement.':`Paiement sécurisé${PAY.label?' par '+esc(PAY.label):''}.`} L'achat est lié à ton compte. <a href="#/remboursement" data-close>Politique de remboursement</a>.</p>
    <p class="ferr" id="buy-err" role="alert"></p>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" id="buy-go">Payer</button></div>`, d=>{
    const sel=d.querySelector('#buy-cur'); if(sel) sel.onchange=()=>{ cur=sel.value; S.currency=cur; save(); d.querySelector('#buy-price').textContent=money(itemInfo(item,cur).price,cur); };
    d.querySelector('#buy-go').onclick=async ev=>{ const b=ev.currentTarget, err=d.querySelector('#buy-err'), pc=d.querySelector('#buy-parent');
      if(minor && !(pc&&pc.checked)){ err.textContent='Coche la case pour confirmer l\'accord de ton parent ou tuteur.'; return; }
      if(!(DB.live&&DB.fns)){ err.textContent='Le serveur de paiement n\'est pas prêt. Réessaie dans un instant.'; return; }
      b.disabled=true; b.textContent='Redirection…'; err.textContent='';
      try{ const r=await DB.fns.httpsCallable('createPayment')({item,currency:cur,parentConsent:!!(pc&&pc.checked)}); const u=String((r.data&&r.data.url)||'');
        if(u.startsWith('#/')){ d.close(); location.hash=u; } else if(/^https:\/\//.test(u)) location.href=u; else throw new Error('Le paiement n\'a pas pu démarrer.'); }
      catch(e){ err.textContent=(e&&e.message)||'Le paiement n\'a pas pu démarrer.'; b.disabled=false; b.textContent='Payer'; } }; }); }

/* ---- La page Boutique ---- */
const SHOP_TABS=[['themes','Thèmes'],['plaques','Plaques'],['packs','Packs']];
const shopTag = t => t?`<span class="shop-tag${t==='Édition limitée'?' rare':''}">${t}</span>`:'';
const SKIN_TAGS={ ocean:'Nouveau', samurai:'Populaire' };
function themeCard(id){ const t=SKINS[id], paid=PAID_SKINS.includes(id), own=canUseSkin(id), on=(S.skinWanted||S.skin)===id&&!_preview;
  const prev=`<div class="shop-prev shop-prev-th" style="--a:${t.sw[0]};--b:${t.sw[1]};--c2:${t.sw[2]}"><div class="th-mock"><i></i><i></i><i></i><b></b></div></div>`;
  const act = own ? (on?'<button class="btn btn-sm" disabled>Actif</button>':`<button class="btn btn-sm btn-ac" data-use-skin="${id}">Utiliser</button>`)
    : `<button class="btn btn-sm btn-ghost" data-shop-prev="theme:${id}">Aperçu</button><button class="btn btn-sm btn-ac" data-shop-buy="theme:${id}">${money(skinPrice(id))}</button>`;
  return `<article class="shop-card${own?' owned':''}">${prev}${shopTag(own?'':SKIN_TAGS[id])}<div class="shop-info"><b>${esc(t.label)}</b><span class="muted">${esc(t.desc)}</span>${own?`<small class="shop-own">${paid?'À toi':'Gratuit'}</small>`:''}</div><div class="shop-foot">${act}</div></article>`; }
function plateCard(id){ const pl=PLATES[id], own=ownsPlate(id), on=plateOf(S.me)===id, rare=pl.cat==='rare', sold=rare&&!rareOpen();
  const act = pl.soon ? `<button class="btn btn-sm btn-ghost" data-shop-prev="plate:${id}">Aperçu</button>` : own ? (on?`<button class="btn btn-sm" data-use-plate="">Retirer</button>`:`<button class="btn btn-sm btn-ac" data-use-plate="${id}">Équiper</button>`)
    : pl.cat==='recompense' ? `<button class="btn btn-sm btn-ghost" data-shop-prev="plate:${id}">Aperçu</button>`
    : `<button class="btn btn-sm btn-ghost" data-shop-prev="plate:${id}">Aperçu</button>${sold?'':`<button class="btn btn-sm btn-ac" data-shop-buy="plate:${id}">${money(platePrice(id))}</button>`}`;
  const sub = pl.soon ? 'Bientôt en vente' : own ? (on?'Équipée':'À toi') : pl.cat==='recompense' ? pl.how : rare ? (sold?'Plus en vente':`Jusqu'au ${new Date(RARE_UNTIL).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}`) : pl.cat==='base' ? pl.desc : '';
  return `<article class="shop-card${own?' owned':''}${rare?' is-rare':''}"><div class="shop-prev shop-prev-np">${plqDemo(id)}</div><div class="shop-info"><b>${esc(pl.label)}${shopTag(pl.soon?'Bientôt':own?'':rare?'Édition limitée':pl.tag).replace('shop-tag','shop-tag in')}</b>${sub?`<span class="muted">${esc(sub)}</span>`:''}</div><div class="shop-foot">${act}</div></article>`; }
function packCard(item){ const inf=itemInfo(item), [k,id]=item.split(':'); let prev, own, full, tag='';
  if(k==='pack'){ own=ownsAll()||PAID_SKINS.every(canUseSkin); full=PAID_SKINS.reduce((a,x)=>a+skinPrice(x),0); tag='Populaire';
    prev=`<div class="shop-prev shop-prev-pk">${PAID_SKINS.map(x=>`<i style="background:${SKINS[x].sw[0]}"></i>`).join('')}</div>`; }
  else { const its=ppackItems(id); own=its.every(ownsPlate); full=its.reduce((a,x)=>a+platePrice(x),0); tag=PPACKS[id].tag||'';
    prev=`<div class="shop-prev shop-prev-pk np-stack">${its.slice(0,5).map(x=>np({plate:x,name:PLATES[x].label})).join('')}${its.length>5?`<small>+${its.length-5}</small>`:''}</div>`; }
  const eco=full-inf.price;
  return `<article class="shop-card shop-pack${own?' owned':''}">${prev}${shopTag(own?'':tag)}<div class="shop-info"><b>${esc(inf.title)}</b><span class="muted">${esc(inf.desc)}</span>${!own&&eco>0?`<small class="shop-eco">${money(eco)} d'économie</small>`:''}</div>
    <div class="shop-foot">${own?'<button class="btn btn-sm" disabled>Déjà à toi</button>':`<button class="btn btn-sm btn-ac" data-shop-buy="${item}">${money(inf.price)}</button>`}</div></article>`; }
function viewShop(tab){
  if(dataPending()) return loadingView('Boutique');
  if(!S.me) return needProfile('Boutique');
  payInit();
  if(tab==='objets'){ location.replace('#/inventaire'); return; }   // ancien onglet « Mes objets » : c'est maintenant l'inventaire
  tab=SHOP_TABS.some(x=>x[0]===tab)?tab:'themes';
  const many=AUTH_LIVE&&(SHOP.currencies||Object.keys(CURRENCIES)).length>1;
  let body='';
  if(tab==='themes') body=`<div class="shop-grid">${Object.keys(SKINS).map(themeCard).join('')}</div>`;
  else if(tab==='plaques') body=`<section class="shop-sec"><h3>Offerte</h3><p class="muted">Une plaque, c'est un bandeau décoré derrière ton pseudo : dans les messages, les groupes et sur ton profil.</p><div class="shop-grid shop-grid-np">${plateCard('base')}</div></section>`
    + PLATE_CATS.filter(([c])=>platesIn(c).some(x=>!PLATES[x].soon)).map(([c,l,,sub])=>`<section class="shop-sec${c==='rare'?' shop-sec-rare':''}"><h3>${l}</h3><p class="muted">${sub}</p><div class="shop-grid shop-grid-np">${platesIn(c).filter(x=>!PLATES[x].soon).map(plateCard).join('')}</div></section>`).join('')
    + `<section class="shop-sec"><h3>À gagner</h3><p class="muted">Ces plaques ne s'achètent pas : elles se méritent.</p><div class="shop-grid shop-grid-np">${platesIn('recompense').map(plateCard).join('')}</div></section>`
    + (platesSoon().length?`<section class="shop-sec"><h3>Bientôt</h3><p class="muted">Des plaques en préparation. Tu peux déjà regarder l'aperçu.</p><div class="shop-grid shop-grid-np">${platesSoon().map(plateCard).join('')}</div></section>`:'');
  else if(tab==='packs') body=`<div class="shop-grid shop-grid-wide">${['pack',...Object.keys(PPACKS).map(k=>'ppack:'+k)].map(packCard).join('')}</div>`;
  app.innerHTML=`<div class="wrap page shop"><div class="page-head"><div><h2>Boutique</h2><p>Thèmes et plaques nominatives pour personnaliser ton Coopô.</p></div>
      ${many?`<div class="field shop-cur"><label for="shop-cur">Devise</label><select id="shop-cur">${Object.entries(CURRENCIES).filter(([k])=>curOK(k)).map(([k,v])=>`<option value="${k}" ${k===curCode()?'selected':''}>${v.label}</option>`).join('')}</select></div>`:''}</div>
    <div class="chips board-tabs" role="tablist">${SHOP_TABS.map(([k,l])=>`<a class="chip" role="tab" href="#/boutique/${k}" aria-selected="${tab===k}" aria-pressed="${tab===k}">${l}</a>`).join('')}<a class="chip" href="#/inventaire">Inventaire</a></div>
    ${PAY.mode==='test'&&isAdmin()?TEST_NOTE.replace('</div>','<button class="btn btn-sm" data-shop-buy="plate:rubis">Essayer un faux achat</button></div>'):''}${body}</div>`;
  plqWatch();
}
/* ---- Inventaire : tout ce que le joueur possède, à équiper en un clic (idée de Neko) ---- */
function viewInventory(){
  if(dataPending()) return loadingView('Inventaire');
  if(!S.me) return needProfile('Inventaire');
  const th=Object.keys(SKINS).filter(canUseSkin), pls=Object.keys(PLATES).filter(ownsPlate), cur=(SKINS[S.skinWanted||S.skin]||SKINS.defaut).label, pl=plateOf(S.me);
  app.innerHTML=`<div class="wrap page shop inv"><div class="page-head"><div><h2>Inventaire</h2><p>Tes thèmes et tes plaques. Touche « Utiliser » ou « Équiper » : c'est appliqué tout de suite.</p></div></div>
    <section class="panel inv-now"><div class="me-id inv-look${plqOn(publicMe(),1)}">${plq(publicMe())}${avatar(publicMe(),56)}<div class="me-who"><b class="me-name">${esc(S.me.name)}</b><span class="muted">Ton look actuel</span></div></div><p class="muted">Thème : <b>${esc(cur)}</b> · Plaque : <b>${pl?esc(PLATES[pl].label):'aucune'}</b></p>
      <div class="inv-acts">${pl?'<button class="btn btn-ghost btn-sm" data-use-plate="">Retirer la plaque</button>':''}<a class="btn btn-sm" href="#/boutique">Aller à la boutique</a></div></section>
    <section class="shop-sec"><h3>Mes thèmes <small>${th.length}</small></h3><div class="shop-grid">${th.map(themeCard).join('')}</div></section>
    <section class="shop-sec"><h3>Mes plaques <small>${pls.length}</small></h3><div class="shop-grid shop-grid-np">${pls.map(plateCard).join('')}</div></section></div>`;
  plqWatch();
}
document.addEventListener('change',e=>{ if(e.target&&(e.target.id==='shop-cur'||e.target.id==='set-cur')){ S.currency=e.target.value; save(); const y=scrollY; route(); scrollTo(0,y); } });
document.addEventListener('click',e=>{ const t=e.target;
  const bb=t.closest('[data-shop-buy]'); if(bb){ buy(bb.dataset.shopBuy); return; }
  const pv=t.closest('[data-shop-prev]'); if(pv){ const [k,id]=pv.dataset.shopPrev.split(':'); if(k==='theme'){ try{ if(dlg.open) dlg.close(); }catch(err){} previewSkin(id); } else platePreview(id); return; }
  const up=t.closest('[data-use-plate]'); if(up){ setPlate(up.dataset.usePlate); if(/^#\/(boutique|inventaire)/.test(location.hash)){ const y=scrollY; route(); scrollTo(0,y); } return; }
  const us=t.closest('[data-use-skin]'); if(us){ const id=us.dataset.useSkin; if(!SKINS[id]||!canUseSkin(id)) return; const y=scrollY;
    applySkin(id,true,{then:()=>{ route(); scrollTo(0,y); }}); DB.saveSkin(id); toast(`Thème ${SKINS[id].label} activé`); return; }
  if(t.closest('[data-inv-go]')){ location.hash='#/inventaire'; return; }
  if(t.closest('.skin-btn')){ location.hash='#/boutique'; } });

/* ---- Retour de paiement ---- */
function viewPayment(tx){
  const box=(h,p,act='')=>`<div class="wrap page"><div class="empty"><h3>${h}</h3><p class="muted">${p}</p>${act}</div></div>`;
  if(!tx){ app.innerHTML=box('Paiement interrompu','Aucun montant n\'a été débité. Tu peux réessayer depuis la boutique.','<a class="btn" href="#/boutique">Retour à la boutique</a>'); return; }
  if(!S.auth){ app.innerHTML=box('Connecte-toi','Connecte-toi avec le compte qui a fait l\'achat pour le récupérer.','<a class="btn btn-ac" href="#/connexion">Se connecter</a>'); return; }
  app.innerHTML=box('Vérification du paiement…','Ça prend quelques secondes.');
  let tries=0;
  const check=async()=>{
    if(!location.hash.startsWith('#/paiement')) return;
    if(!(DB.live&&DB.fns)){ if(tries++<10) return setTimeout(check,800); app.innerHTML=box('Vérification impossible','Recharge la page dans un instant.'); return; }
    try{ const r=(await DB.fns.httpsCallable('checkPayment')({tx})).data;
      if(r.status==='paid'){ await DB.loadPurchases(); const item=String(r.item||''), [k,id]=item.split(':'), inf=itemInfo(item);
        if(k==='theme'&&SKINS[id]){ applySkin(id,true); DB.saveSkin(id); } else if(k==='plate'&&PLATES[id]&&ownsPlate(id)) setPlate(id);
        app.innerHTML=box('Merci, c\'est débloqué !', k==='theme'?`Le thème ${esc(SKINS[id]?.label||id)} est à toi et vient d'être activé.`:k==='plate'?`La plaque ${esc(PLATES[id]?.label||id)} est à toi et vient d'être équipée.`:`${esc(inf?inf.title:'Ton achat')} : tout est à toi. Retrouve-le dans ton inventaire.`,'<a class="btn btn-ac" href="#/inventaire">Voir mon inventaire</a>'); return; }
      if(r.status==='failed'){ app.innerHTML=box('Paiement non abouti','Le paiement a été refusé ou annulé. Rien n\'a été débloqué et rien n\'a été débité.','<a class="btn" href="#/boutique">Retour à la boutique</a>'); return; }
      if(r.status==='review'){ app.innerHTML=box('Paiement en vérification','Le montant reçu ne correspond pas au prix. La modération va vérifier : écris-nous via « Nous écrire » avec la référence '+esc(tx)+'.'); return; }
      if(tries++<8) return setTimeout(check,5000);
      app.innerHTML=box('Paiement en attente',`Si tu as validé le paiement sur ton téléphone, il sera pris en compte automatiquement dans quelques minutes. Référence : ${esc(tx)}`,'<button class="btn" type="button" onclick="route()">Vérifier à nouveau</button>');
    }catch(e){ app.innerHTML=box('Vérification impossible',esc((e&&e.message)||'Réessaie dans un instant.'),'<button class="btn" type="button" onclick="route()">Réessayer</button>'); }
  };
  check();
}
// Mode test : la « page de paiement » est un faux écran, clairement indiqué. Le serveur n'accepte ces faux paiements que d'un modérateur.
function viewFakePay(tx){
  if(!tx||!S.auth){ location.hash='#/boutique'; return; }
  app.innerHTML=`<div class="wrap page" style="max-width:560px"><div class="fakepay"><span class="fakepay-flag">Faux paiement · mode test</span><h2>Aucun argent n'est débité</h2>
    <p>Cette page remplace le prestataire de paiement tant qu'aucun n'est branché. Choisis ce que tu veux simuler.</p><p class="muted">Référence : ${esc(tx)}</p>
    <div class="fakepay-act"><button class="btn btn-ac" data-fake="paid">Simuler un paiement réussi</button><button class="btn" data-fake="failed">Simuler un paiement refusé</button><a class="btn btn-ghost" href="#/boutique">Abandonner</a></div>
    <p class="ferr" id="fake-err" role="alert"></p></div></div>`;
  app.querySelectorAll('[data-fake]').forEach(b=>b.onclick=async()=>{ const err=document.getElementById('fake-err'); app.querySelectorAll('[data-fake]').forEach(x=>x.disabled=true);
    try{ await DB.fns.httpsCallable('testPay')({tx,outcome:b.dataset.fake}); location.hash='#/paiement/'+encodeURIComponent(tx); }
    catch(e){ err.textContent=(e&&e.message)||'Le faux paiement n\'a pas pu être enregistré.'; app.querySelectorAll('[data-fake]').forEach(x=>x.disabled=false); } });
}
const INV_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9z"/><path d="M9.5 5V4a2.5 2.5 0 0 1 5 0v1"/><path d="M9 13h6v3H9z"/></svg>';   // sac à dos : l'inventaire
const SEND_SVG='<svg class="send-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.2 20 4.5l-4.3 15-3.6-6.1z"/><path d="M12.1 13.4 20 4.5"/></svg><svg class="save-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const PALETTE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';
/* ================= Dispo maintenant ================= */
const DISPO_DUR=[['1',"1 heure"],['2',"2 heures"],['3',"3 heures"],['5',"Toute la soirée"]];
const dispoActive = p => !!(p && p.dispo && p.dispo.until > Date.now());
// v27 — statut « Joue à… », façon Discord : il suit « Je suis dispo » (le jeu choisi, tant que la dispo dure). Rien de nouveau n'est enregistré.
const PLAY_SVG='<svg class="play-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 8h10a4 4 0 0 1 4 4v1.5a3.5 3.5 0 0 1-6.3 2.1L14 15h-4l-.7.6A3.5 3.5 0 0 1 3 13.5V12a4 4 0 0 1 4-4z"/><path d="M7.5 11v3M6 12.5h3M16 12h.01M18 13.5h.01"/></svg>';
const playGame = p => dispoActive(p) ? String(p.dispo.game||'') : '';
const playLine = p => { const g=playGame(p); return g?`<span class="play-st" title="Dispo pour ${esc(g)} jusqu'à ${fmtUntil(p.dispo.until)}">${PLAY_SVG}<span>Joue à ${esc(g)}</span></span>`:''; };
const playMark = p => { const g=playGame(p); return g?`<span class="play-mk" title="Joue à ${esc(g)}">${PLAY_SVG}<span class="sr-only">joue à ${esc(g)}</span></span>`:''; };
const dispoList = () => visible().filter(dispoActive).sort((a,b)=>{ const sa=S.me&&S.me.games.includes(a.dispo.game)?1:0, sb=S.me&&S.me.games.includes(b.dispo.game)?1:0; if(sa!==sb) return sb-sa; return (S.me?compat(S.me,b).pct-compat(S.me,a).pct:0); });
const fmtUntil = ts => new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
function dispoModal(){
  if(!S.me) { location.hash='#/inscription'; return; }
  const games=S.me.games.length?S.me.games:GAMES.slice(0,8);
  modal(`<h3>Je suis dispo maintenant</h3><p class="muted">Dis à quel jeu tu joues et pendant combien de temps : les joueurs compatibles te verront en tête de liste.</p>
    <div class="field"><label for="dp-game">Jeu</label><select id="dp-game">${games.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('')}</select></div>
    <div class="field"><label>Pendant</label><div class="dp-durs">${DISPO_DUR.map(([v,l],i)=>`<button type="button" class="chip-btn${i===1?' on':''}" data-dur="${v}">${l}</button>`).join('')}</div></div>
    <div class="field"><label for="dp-note">Un mot (facultatif)</label><input id="dp-note" type="text" maxlength="60" placeholder="Ranked, vocal ok, chill…"></div>
    <div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" id="dp-go">Je suis dispo</button></div>`, d=>{
    let dur=2; d.querySelectorAll('[data-dur]').forEach(b=>b.onclick=()=>{ d.querySelectorAll('[data-dur]').forEach(x=>x.classList.remove('on')); b.classList.add('on'); dur=+b.dataset.dur; });
    d.querySelector('#dp-go').onclick=async()=>{ const dispo={game:d.querySelector('#dp-game').value,note:d.querySelector('#dp-note').value.trim().slice(0,60),since:Date.now(),until:Date.now()+dur*3600*1000};
      S.me.dispo=dispo; save(); d.close(); toast(`Tu es dispo pour ${dispo.game} jusqu'à ${fmtUntil(dispo.until)}`); await DB.setDispo(dispo); route(); };
  });
}
async function dispoStop(){ if(!S.me) return; S.me.dispo=null; save(); toast("Tu n'es plus affiché comme dispo"); await DB.setDispo(null); route(); }
function dispoCard(p){
  const q=reqWith(p.id), mate=!!q&&q.status==='accepted', same=S.me&&S.me.games.includes(p.dispo.game);
  const act = mate?`<a class="btn btn-sm" href="#/messages/${p.id}">Écrire</a>` : q?`<span class="muted dc-sent">Demande envoyée</span>` : !canAsk(p) ? '' : `<button class="btn btn-sm btn-ac" data-dispo-mate="${p.id}">Duo ?</button>`;   // un adulte ne propose pas de duo à un 13-17 ans
  return `<div class="dz${same?' same':''}"><a href="#/joueur/${p.id}" class="dz-who">${avatar(p,52)}<b>${esc(p.name)}${modBadge(p)}</b><span>${esc(p.dispo.game)}</span><small>jusqu'à ${fmtUntil(p.dispo.until)}</small></a>${act}</div>`;
}
// Accueil : qui est dispo tout de suite. Une seule ligne de petites cartes qui défile sur le côté (le détail est sur la fiche du joueur).
function dispoSection(){
  const list=dispoList(), mine=dispoActive(S.me);
  const head = mine ? `<div class="dispo-me"><span class="dot-live"></span><b>Tu es dispo pour ${esc(S.me.dispo.game)}</b><span class="muted">jusqu'à ${fmtUntil(S.me.dispo.until)}</span><button class="btn btn-sm btn-ghost" id="dispo-stop">Je ne suis plus dispo</button></div>`
    : S.me ? `<button class="btn btn-ac dispo-cta" id="dispo-go"><span class="dot-live"></span>Je suis dispo maintenant</button>`
    : `<p class="muted">Connecte-toi pour dire que tu es dispo et voir qui joue en ce moment.</p>`;
  const body = !S.me ? '' : list.length ? `<div class="dz-row">${list.slice(0,15).map(dispoCard).join('')}</div>`
    : `<p class="muted dispo-empty">Personne n'est dispo pour l'instant. ${mine?'Tu es en tête de liste : les prochains joueurs te verront en premier.':'Sois le premier : les joueurs compatibles te verront tout de suite.'}</p>`;
  return `<section class="home-sec dispo-sec reveal" id="dispo"><div class="dispo-head"><h3>Dispo maintenant</h3>${S.me&&list.length?`<span class="pill-live">${list.length} joueur${list.length>1?'s':''}</span>`:''}</div>${head}${body}</section>`;
}
document.addEventListener('click',e=>{
  if(e.target.closest('#dispo-go,[data-dispo-go]')) dispoModal();
  if(e.target.closest('#dispo-stop')) dispoStop();
  const m=e.target.closest('[data-dispo-mate]'); if(m){ const p=PLAYERS.find(x=>x.id===m.dataset.dispoMate); if(p&&canAsk(p)){ sendRequest(p); route(); } }
});
