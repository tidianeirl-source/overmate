/* Coopô — js/base.js
   Configuration, données de démo, moteur de compatibilité, état local (S, save), composants d'affichage (avatar, toast, fenêtres).
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* =========================================================
   1. CONFIGURATION — tout ce qui se modifie facilement
   ========================================================= */
const CONFIG = {
  // Poids des critères (en points). Le score est normalisé sur 100,
  // donc la somme n'a pas besoin de faire exactement 100.
  // Mettre un poids à 0 désactive le critère.
  weights: { games:40, hours:25, style:15, days:10, platform:10, rank:6, language:5, country:4, voice:0, goal:0 },
  // Nombre de signalements ouverts avant masquage automatique d'un profil (en attendant la modération)
  autoHideReports: 3,
  // Score partiel quand l'un des deux joueurs a choisi « Les deux » / « Parfois »
  partialMatch: 0.6,
  // Sans aucun jeu en commun, la compatibilité ne dépasse pas ce score (sur 100)
  noCommonGameCap: 40,
  minUsername: 3, maxUsername: 20, minPassword: 8,
  // Âge minimum pour utiliser le site
  minAge: 13,
  // Protection des mineurs : tout le monde se voit (separateMinors: false). Entre un adulte et un 13-17 ans,
  // c'est le 13-17 ans qui envoie la demande de mate ; messages écrits, vocaux et appels vocaux oui, appels vidéo et photos non.
  // (separateMinors: true remettrait les deux groupes séparés dans le site, mais les règles Firestore v7 restent celles des âges réunis.)
  adultAge: 18, separateMinors: false,
};

const GAMES = ['Free Fire','eFootball','Call of Duty Mobile','EA FC Mobile','PUBG Mobile','Fortnite','Roblox','Minecraft',
  'Dream League Soccer','Blood Strike','8 Ball Pool','Clash of Clans','Clash Royale','Brawl Stars','Mobile Legends',
  'EA Sports FC','Call of Duty','GTA V','Valorant','Apex Legends','League of Legends','Rocket League','Among Us',
  'Counter-Strike 2','Fall Guys','Overwatch 2'];
// Plateformes déduites des jeux (pour ne pas les demander à l'inscription)
const GAME_PLATFORMS = {'Free Fire':['mobile'],'eFootball':['mobile','ps','pc','xbox'],'Call of Duty Mobile':['mobile'],'EA FC Mobile':['mobile'],'PUBG Mobile':['mobile'],
  'Dream League Soccer':['mobile'],'Blood Strike':['mobile','pc'],'8 Ball Pool':['mobile'],'Clash of Clans':['mobile'],'Clash Royale':['mobile'],'Brawl Stars':['mobile'],'Mobile Legends':['mobile'],
  'Fortnite':['mobile','ps','pc','xbox','switch'],'Roblox':['mobile','pc','xbox','ps'],'Minecraft':['mobile','pc','ps','xbox','switch'],'Among Us':['mobile','pc','switch'],
  'EA Sports FC':['ps','pc','xbox'],'Call of Duty':['ps','pc','xbox'],'GTA V':['ps','pc','xbox'],'Valorant':['pc'],'Apex Legends':['ps','pc','xbox'],'League of Legends':['pc'],
  'Rocket League':['ps','pc','xbox','switch'],'Counter-Strike 2':['pc'],'Fall Guys':['ps','pc','xbox','switch'],'Overwatch 2':['ps','pc','xbox','switch']};
const TOP_GAMES = ['Free Fire','eFootball','Call of Duty Mobile','EA FC Mobile','PUBG Mobile','Fortnite','Roblox','Minecraft'];
const HOURS = [['matin','Matin'],['aprem','Après-midi'],['soir','Soir'],['nuit','Nuit']];
const DAYS = [['lun','Lun'],['mar','Mar'],['mer','Mer'],['jeu','Jeu'],['ven','Ven'],['sam','Sam'],['dim','Dim']];
const STYLES = [['comp','Compétitif'],['casual','Détente'],['both','Les deux']];
const GOALS = [['serieux','Jouer sérieusement'],['fun',"S'amuser"],['both','Les deux']];
const VOICE = [['oui','Vocal activé'],['parfois','Vocal parfois'],['non','Sans vocal']];
const PLATFORMS = [['mobile','Mobile'],['ps','PlayStation'],['pc','PC'],['xbox','Xbox'],['switch','Switch']];
const CRITERIA = {
  games:{label:'Jeux en commun', color:'#D9478A'}, hours:{label:'Horaires', color:'#9A6BE0'},
  style:{label:'Style de jeu', color:'#22B58A'}, days:{label:'Jours', color:'#F0A21E'},
  platform:{label:'Plateforme', color:'#3EA6E0'}, rank:{label:'Niveau proche', color:'#E05A92'}, language:{label:'Langue', color:'#5BC8A0'}, country:{label:'Pays', color:'#B8A36A'}, voice:{label:'Vocal', color:'#FF8A3D'}, goal:{label:'Objectif', color:'#C7F25B'},
};
const L = (list,v) => { const f=list.find(x=>x[0]===v); return f ? f[1] : esc(v); };   // valeur inconnue : échappée (sécurité)

/* =========================================================
   2. DONNÉES DE DÉMO — à remplacer par l'API / la base de données
   ========================================================= */
const P = (id,name,hue,games,hours,days,style,goal,voice,platforms,discord,discordPublic,online,tags={}) =>
  ({id,name,avatar:{hue},games,hours,days,style,goal,voice,platforms,discord,discordPublic,online,tags});
let PLAYERS = [
  P('p1','KoffiNight',265,['Roblox','Minecraft','Free Fire'],['soir','nuit'],['ven','sam','dim'],'comp','serieux','oui',['pc','mobile'],'koffi.night',true,true,{Roblox:'KoffiNight_CI',Minecraft:'KoffiN'}),
  P('p2','ShadowPlayer',200,['Roblox','Fortnite'],['aprem','nuit'],['mer','sam','dim'],'casual','fun','parfois',['ps','pc'],'shadowplayer',true,false,{Fortnite:'Shad0w'}),
  P('p3','AwaBuild',150,['Minecraft','Roblox','Among Us'],['soir'],['lun','mar','mer','jeu'],'casual','fun','non',['pc','switch'],'awa.build',false,true),
  P('p4','DjeliSniper',10,['Valorant','Call of Duty','Counter-Strike 2'],['nuit'],['ven','sam'],'comp','serieux','oui',['pc'],'djeli',true,true,{Valorant:'Djeli#225'}),
  P('p5','MamadouFC',120,['EA Sports FC','eFootball'],['soir'],['mer','sam','dim'],'comp','serieux','oui',['ps'],'mamadou.fc',true,false),
  P('p6','YaoRush',30,['Fortnite','Apex Legends','Rocket League'],['aprem','soir'],['sam','dim'],'both','both','oui',['pc','xbox'],'yaorush',true,true),
  P('p7','FatouCraft',320,['Minecraft','Fall Guys'],['matin','aprem'],['mer','sam'],'casual','fun','parfois',['mobile','switch'],'fatoucraft',false,false),
  P('p8','Gbaka_225',45,['Free Fire','PUBG Mobile','Mobile Legends'],['soir','nuit'],['lun','ven','sam','dim'],'comp','serieux','oui',['mobile'],'gbaka225',true,true,{'Free Fire':'GBAKA225'}),
  P('p9','NdeyeGG',285,['League of Legends','Valorant'],['soir'],['mar','jeu','sam'],'both','serieux','oui',['pc'],'ndeyegg',true,false),
  P('p10','TchopKing',0,['GTA V','Call of Duty'],['nuit'],['ven','sam'],'casual','fun','oui',['ps','xbox'],'tchopking',true,true),
  P('p11','AmaraPlays',175,['Roblox','Brawl Stars','Clash Royale'],['aprem'],['mer','sam','dim'],'casual','fun','non',['mobile'],'amaraplays',false,false),
  P('p12','Ziggy_Abj',230,['Fortnite','Minecraft','Roblox'],['nuit'],['jeu','ven','sam'],'comp','both','oui',['pc','ps'],'ziggy.abj',true,true,{Roblox:'ZiggyAbj'}),
  P('p13','KouameV',190,['Valorant','Overwatch 2'],['soir','nuit'],['lun','mer','ven'],'comp','serieux','parfois',['pc'],'kouamev',true,false),
  P('p14','LenaBlitz',340,['Rocket League','EA Sports FC','Fortnite'],['matin','soir'],['sam','dim'],'both','fun','parfois',['xbox','pc'],'lenablitz',true,true),
  P('p15','Kassy_16',95,['Roblox','Minecraft','Brawl Stars'],['aprem','soir'],['mer','sam','dim'],'casual','fun','parfois',['mobile','pc'],'kassy16',false,true),
  P('p16','IbouGamer',60,['Fortnite','Free Fire','Roblox'],['soir','nuit'],['ven','sam'],'comp','both','oui',['mobile','ps'],'ibougamer',false,false),
];
// Âges des profils de démo (connus du serveur, jamais affichés publiquement)
const DEMO_AGES={p1:22,p2:19,p3:24,p4:27,p5:21,p6:20,p7:16,p8:23,p9:25,p10:29,p11:15,p12:17,p13:26,p14:22,p15:16,p16:17};
PLAYERS.forEach(p=>p.age=DEMO_AGES[p.id]);

/* ---- Âge ---- */
function ageFrom(dob){
  const d=new Date(dob+'T00:00:00'); if(!dob||isNaN(d)) return null;
  const n=new Date(); let a=n.getFullYear()-d.getFullYear();
  if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate())) a--;
  return a;
}
const ageOf = p => p.dob ? ageFrom(p.dob) : p.age;
const ageGroup = p => { const a=ageOf(p); if(a==null && p && p.ageGroup) return p.ageGroup; return (a ?? 0) >= CONFIG.adultAge ? 'adult' : 'minor'; };
// En ligne = statut actif ET activité récente : un onglet fermé sans prévenir ne reste pas « en ligne » pour toujours
const ONLINE_MS = 5*60*1000;
const isOnline = p => !!p && !!p.online && (!p.lastSeen || Date.now()-p.lastSeen < ONLINE_MS);
// Joueur hors ligne : « Vu il y a 2 h » s'il affiche son statut et qu'il est passé depuis moins de 30 jours, sinon « Hors ligne »
// v21 — ce que les pages montrent des joueurs, pour savoir si une nouvelle liste change quelque chose : tout le profil, sauf l'heure de
// dernière activité (elle bouge sans cesse) remplacée par « en ligne » ; l'ordre des joueurs et des champs ne compte pas
const playersSig = () => PLAYERS.map(p=>JSON.stringify(Object.keys(p).sort().filter(k=>p[k]!==undefined&&k!=='lastSeen'&&k!=='updatedAt'&&k[0]!=='_').map(k=>[k,p[k]]).concat([['$on',isOnline(p)]]))).sort().join('\n');
const seenTxt = p => { const t=+p.lastSeen||0, d=Date.now()-t; return t>0&&d>=0&&d<30*864e5 ? 'Vu '+ago(t) : 'Hors ligne'; };
// Sans profil avec âge, on ne montre que des profils adultes.
const sameGroup = p => !CONFIG.separateMinors || (S.me && S.me.dob ? ageGroup(p)===ageGroup(S.me) : ageGroup(p)==='adult');

/* =========================================================
   3. MOTEUR DE COMPATIBILITÉ
   ========================================================= */
const MATCHERS = {
  // Chevauchement de listes : moyenne de (communs/plus petite liste) et (communs/plus grande liste)
  overlap(a=[],b=[]){ if(!a.length||!b.length) return 0; const s=a.filter(x=>b.includes(x)).length;
    return (s/Math.min(a.length,b.length) + s/Math.max(a.length,b.length))/2; },
  // Choix simple avec option « mixte » (les deux / parfois)
  choice(a,b,mixed){ if(a===b) return 1; if(a===mixed||b===mixed) return CONFIG.partialMatch; return 0; },
};
const CRITERION_SCORE = {
  games:(a,b)=>MATCHERS.overlap(a.games,b.games),
  hours:(a,b)=>MATCHERS.overlap(a.hours,b.hours),
  days:(a,b)=>MATCHERS.overlap(a.days,b.days),
  style:(a,b)=>MATCHERS.choice(a.style,b.style,'both'),
  goal:(a,b)=>MATCHERS.choice(a.goal,b.goal,'both'),
  voice:(a,b)=>MATCHERS.choice(a.voice,b.voice,'parfois'),
  platform:(a,b)=>a.platforms.some(x=>b.platforms.includes(x)) ? 1 : 0,
  // Rang proche sur les jeux en commun (écart de niveau sur une échelle de 1 à 5)
  rank:(a,b)=>{ const sh=a.games.filter(g=>b.games.includes(g)); if(!sh.length) return 0; const ra=a.ranks||{}, rb=b.ranks||{};
    return sh.reduce((t,g)=>{ const x=rankLevel(g,ra[g]), y=rankLevel(g,rb[g]); return t+(x!=null&&y!=null ? 1-Math.abs(x-y)/4 : .5); },0)/sh.length; },
  language:(a,b)=>(a.langs||['fr']).some(x=>(b.langs||['fr']).includes(x)) ? 1 : 0,
  country:(a,b)=>a.country&&a.country===b.country ? 1 : 0,
};
function compat(a,b){
  const w = S.weights || CONFIG.weights;
  let total=0, sum=0; const detail=[];
  for(const k in w){ if(!w[k] || !CRITERION_SCORE[k]) continue;
    const s = CRITERION_SCORE[k](a,b); total+=w[k]; sum+=w[k]*s; detail.push({k,w:w[k],s}); }
  let pct = total ? Math.round(sum/total*100) : 0;
  const commonGames = a.games.filter(g=>b.games.includes(g));
  if(w.games && !commonGames.length) pct=Math.min(pct, CONFIG.noCommonGameCap);
  // Avis après une partie : « je rejouerais avec lui » remonte le profil, l'inverse le descend
  const rv=a.id==='me'&&S.ratings?S.ratings[b.id]:0; if(rv===1) pct=Math.min(100,pct+5); if(rv===-1) pct=Math.max(0,pct-20);
  return { pct, detail,
    common:{ games:commonGames, hours:a.hours.filter(h=>b.hours.includes(h)) } };
}
const tier = p => p>=80?'var(--hi)':p>=60?'var(--mid)':p>=40?'var(--warm)':'var(--lo)';
const tierTx = p => p>=80?'var(--hi-tx)':p>=60?'var(--mid-tx)':p>=40?'var(--warm-tx)':'var(--lo-tx)';   // même teinte, assombrie ou éclaircie pour rester lisible en petit

/* =========================================================
   4. ÉTAT LOCAL (prototype) — en production : API + base de données
   ========================================================= */
const KEY='matematch.v1';
const fresh = () => ({ skin:'defaut', auth:null, profiles:{}, accounts:{}, dobs:{}, requests:[], notifs:[], chats:{}, squads:[], joined:[], ratings:{}, unread:{}, hidden:[], banned:[], sort:'compat', me:null, mates:[], blocked:[], reports:[], weights:null,
  privacy:{ tags:true, online:true } });
let S = (()=>{ try{ const r=localStorage.getItem(KEY); return r ? {...fresh(),...JSON.parse(r)} : fresh(); }catch(e){ return fresh(); } })();
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
const BOOT_SKIN = S.skinOk || S.skin; // dernier thème choisi et affiché (pas un simple aperçu)
const suspendedP = p => !!p && +p.suspendedUntil>Date.now();   // compte suspendu par la modération (jusqu'à cette date)
// un compte suspendu disparaît des matchs et des recherches, mais reste visible pour ses mates (leur conversation ne disparaît pas)
const visible = () => PLAYERS.filter(p=>!S.blocked.includes(p.id) && !S.hidden.includes(p.id) && !S.banned.includes(p.id) && sameGroup(p) && (!suspendedP(p) || isMate(p.id)));
const ranked = () => visible().map(p=>({p,c:compat(S.me,p)})).sort((x,y)=>y.c.pct-x.c.pct);

/* =========================================================
   5. COMPOSANTS D'AFFICHAGE
   ========================================================= */
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ring = (p,size='') => `<div class="ring ${size}${p>=80?' glow':''}" data-count="${p}" style="--p:${p};--c:${tier(p)}" role="img" aria-label="${p} % compatible"><span>${p}<small>%</small></span></div>`;
function avatar(u,size=48){
  const a=u.avatar||{hue:260};
  // v16 — les 13-17 ans peuvent aussi mettre une photo de profil, vue par tous (décision d'Aki). Elle se signale comme un profil.
  if(a.src && /^data:image\/(png|jpeg|webp);base64,/.test(a.src)) return `<img class="av" src="${esc(a.src)}" alt="" loading="lazy" decoding="async" width="${size}" height="${size}" style="width:${size}px;height:${size}px">`;
  return `<span class="av" aria-hidden="true" style="width:${size}px;height:${size}px;--h:${(Number(a.hue)||0)%360};font-size:${Math.round(size*.36)}px">${esc((u.name||'?').slice(0,2).toUpperCase())}</span>`;
}
const list = (arr,map) => arr.length ? arr.map(map).join(' • ') : '—';

function matchCard({p,c}, top=false, i=0){
  return `<a class="mcard${top?' top-match':''}" href="#/joueur/${p.id}" style="--i:${i};--c:${c?tier(c.pct):'var(--line)'}">
    <div class="mc-head${plateOf(p)?' mc-plq':''}">${plateOf(p)?`<div class="mc-id${plqOn(p)}">${plq(p)}`:''}${avatar(p,top?64:52)}<div><span class="mc-name">${esc(p.name)}${modBadge(p)}${dispoActive(p)?`<span class="tag-live">Dispo · ${esc(p.dispo.game)}</span>`:''}</span>${isOnline(p)?'<span class="online">En ligne</span>':''}</div>${plateOf(p)?'</div>':''}${c?ring(c.pct, top?'ring-lg':''):''}</div>
    <dl class="facts">
      <div><dt>${c&&c.common.games.length?'Jeux en commun':'Joue à'}</dt><dd>${esc(list(c&&c.common.games.length?c.common.games:p.games.slice(0,4),g=>g))}</dd></div>
      <div><dt>Horaires</dt><dd>${list(p.hours,h=>L(HOURS,h))}</dd></div>
      <div><dt>Style</dt><dd>${L(STYLES,p.style)}</dd></div>
    </dl></a>`;
}
function chips(group,options,selected,single=false){
  return `<div class="chips" role="group">${options.map(([v,l])=>
    `<button type="button" class="chip" data-chip="${group}" data-val="${esc(v)}" ${single?'data-single="1"':''} aria-pressed="${[].concat(selected).includes(v)}">${esc(l)}</button>`).join('')}</div>`;
}
const toastEl=document.getElementById('toast'); let tt;
function toast(msg,ms=2400){ toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(tt); tt=setTimeout(()=>toastEl.classList.remove('show'),ms); }
const dlg=document.getElementById('dlg');
function modal(html, onOpen, cls){ try{ if(dlg.open) dlg.close(); }catch(e){}   // une fenêtre déjà ouverte est remplacée proprement (anciens navigateurs : sinon erreur)
  dlg.className=cls||''; dlg.style.transform=''; dlg.innerHTML=html; try{ dlg.showModal(); }catch(e){ dlg.setAttribute('open',''); } dlg.scrollTop=0; onOpen&&onOpen(dlg); }
dlg.addEventListener('click',e=>{ if(e.target===dlg || e.target.closest('[data-close]')) dlg.close(); });
