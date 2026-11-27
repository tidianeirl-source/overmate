/* Coopô — js/firebase.js
   Couche Firestore : DB, toutes les lectures et écritures de la base de données.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* =========================================================
   COUCHE FIRESTORE — active uniquement quand AUTH est configuré.
   En mode démo, tout reste dans le navigateur.
   Schéma : profiles/{uid} (public, sans date de naissance) · private/{uid} (dob, email)
   usernames/{nameLower} · requests/{from_to} · blocks/{uid}/list/{other}
   reports/{id} · chats/{pairId}/messages/{id} · squads/{id}
   notifications/{uid}/items/{id} · ratings/{uid_target} · admins/{uid}
   ========================================================= */
const DB = {
  live:false, db:null, _unsub:[],
  uid(){ return S.auth && S.auth.uid; },
  toUid(id){ return id==='me' ? this.uid() : id; },
  fromUid(u){ return u===this.uid() ? 'me' : u; },
  pairId(id){ return [this.uid(),id].sort().join('_'); },
  // Firestore prêt ? Pendant les premières secondes d'une visite (ou sur une connexion lente), une action attend la base au lieu d'être perdue.
  async ready(){ if(this.live) return true; if(!AUTH_LIVE) return false; const ok=await authReady(20000); if(!ok&&!this._slowToast){ this._slowToast=true; setTimeout(()=>{ this._slowToast=false; },8000); toast("Connexion trop lente : l'action n'a pas été enregistrée. Réessaie.",4000); } return ok&&this.live; },
  async init(){ if(!AUTH_LIVE) return false; if(this.live) return true;
    try{ if(!firebase.firestore) await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore-compat.js`); this.db=firebase.firestore(); await this.db.enablePersistence({synchronizeTabs:true}).catch(()=>{}); this.live=true;   // cache Firestore sur l'appareil
    if(SHOP.api){ const api=SHOP.api.replace(/\/$/,''); this.fns={ httpsCallable: name => async (data) => {
        const u=firebase.auth().currentUser; if(!u) throw new Error('Connecte-toi pour continuer.');
        const token=await u.getIdToken(); const r=await fetch(`${api}/${name}`,{ method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body:JSON.stringify(data||{}) });
        let j={}; try{ j=await r.json(); }catch(e){} if(!r.ok) throw new Error(j.error||'Le serveur de paiement ne répond pas.'); return { data:j }; } }; }
    else { try{ await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-functions-compat.js`); this.fns=firebase.app().functions(SHOP.region); }catch(e){ console.error(e); } }
    return true; }catch(e){ console.error(e); this.live=false; return false; } },
  async loadAll(){
    if(!this.live||!this.uid()) return; const uid=this.uid(), db=this.db; this._loading=true; this._err=null; this._noProfile=false;
    try{
      const [prof,priv]=await Promise.all([db.collection('profiles').doc(uid).get(),db.collection('private').doc(uid).get()]);
      const prevMe=S.me||{};
      if(prof.exists){ const pd=prof.data(), pv=priv.exists?priv.data():{};
        S.me=normP({...pd,id:'me',dob:pv.dob||''}); if(S.me._langLost){ delete S.me._langLost; S.langAsk=true; }   // une de ses langues a été retirée de la liste : on lui proposera d'en choisir une autre
        if(Array.isArray(pv.pins)) S.pins=pv.pins.filter(x=>typeof x==='string').slice(0,PIN_MAX);   // v15 — mates épinglés
        if(pv.tags&&typeof pv.tags==='object') S.me.tags=pv.tags;   // pseudos en jeu : la copie privée fait foi (la copie publique est vide quand ils sont masqués)
        if(pd.privacy&&typeof pd.privacy==='object') ['tags','online'].forEach(k=>{ if(typeof pd.privacy[k]==='boolean') S.privacy[k]=pd.privacy[k]; });   // confidentialité : les réglages du compte, sur tous les appareils
        { const sk=pd.skin; if(sk&&SKINS[sk]) S.skinWanted=sk; else if(sk) S.skinWanted='defaut'; if(RETIRED_SKINS.includes(sk)) this._retired=sk; } S.profiles[uid]=S.me; }
      if(priv.exists&&priv.data().dob) S.dobs[uid]=priv.data().dob;
      if(prof.exists&&prof.data().banned){ await signOut(); toast('Ce compte a été suspendu par la modération.',7000); return; }
      if(prof.exists&&+prof.data().suspendedUntil>Date.now()){ const su=+prof.data().suspendedUntil; await signOut(); toast(`Ton compte est suspendu par la modération jusqu'au ${fmtDay(su)}.`,9000); return; }   // v9 — suspension
      if(!prof.exists){ this._loaded=true; this._loading=false; this._noProfile=true; save(); refreshAfterData(); return; }
      { // Coopô ne garde plus aucun pseudo d'autres réseaux : on efface ce que ce compte avait enregistré (une seule fois par appareil)
        if(S.me){ delete S.me.discord; delete S.me.whatsapp; delete S.me.socials; delete S.privacy.discord; }
        let done=false; try{ done=localStorage.getItem('coopo_purge1')===uid; }catch(e){}
        const pd=prof.data();
        if(!done || 'discord' in pd || 'discordPublic' in pd){ const FD=firebase.firestore.FieldValue.delete();
          Promise.all([ db.collection('contacts').doc(uid).delete(), ('discord' in pd || 'discordPublic' in pd) ? db.collection('profiles').doc(uid).update({discord:FD,discordPublic:FD,privacy:{tags:!!S.privacy.tags,online:!!S.privacy.online}}) : null ])
            .then(()=>{ try{ localStorage.setItem('coopo_purge1',uid); }catch(e){} }).catch(e=>console.error(e)); }
      }
      let g=S.me&&S.me.dob?ageGroup(S.me):'adult';
      // Anniversaire des 18 ans : le groupe d'âge enregistré doit suivre l'âge réel, sinon les règles refusent toutes les lectures
      if(S.me&&S.me.dob&&prof.data().ageGroup!==g){ try{ await db.collection('profiles').doc(uid).update({ageGroup:g}); }catch(e){ console.error(e); if(prof.data().ageGroup) g=prof.data().ageGroup; } }
      // v7 — âges réunis : les profils et les sessions de tous les âges
      const [ps,rq,bl,rt,sq,ad]=await Promise.all([db.collection('profiles').where('hidden','==',false).limit(300).get(), db.collection('requests').where('participants','array-contains',uid).get(), db.collection('blocks').doc(uid).collection('list').get(), db.collection('ratings').where('by','==',uid).get(), db.collection('squads').get(), db.collection('admins').doc(uid).get(), this.loadPurchases()]);
      // v7 — les pseudos en jeu d'un 13-17 ans quittent son profil public (copie privée et gametags d'abord, pour ne rien perdre)
      { const pt=prof.data().tags; if(g==='minor'&&pt&&typeof pt==='object'&&Object.keys(pt).length){ const tg={...pt,...(S.me.tags||{})};
        Promise.resolve().then(async()=>{ await db.collection('private').doc(uid).set({tags:tg},{mergeFields:['tags']}); await this.syncGameTags(tg); await db.collection('profiles').doc(uid).update({tags:{}}); }).catch(e=>console.error(e)); } }
      this._checked=true;
      // Thème Awalé retiré : le compte repasse au thème par défaut, avec un petit mot d'explication (une seule fois)
      if(this._retired){ db.collection('profiles').doc(uid).update({skin:'defaut'}).catch(e=>console.error(e)); S.retiredMsg=RETIRED_NAMES[this._retired]||true; this._retired=null; }
      PLAYERS.length=0; ps.forEach(d=>{ if(d.id!==uid) PLAYERS.push(normP({...d.data(),id:d.id,age:undefined})); }); this._lastPlayers=Date.now();
      S.requests=[]; rq.forEach(d=>{ const r=d.data(); S.requests.push({id:d.id,from:this.fromUid(r.from),to:this.fromUid(r.to),status:r.status,at:r.at}); });
      S.blocked=[]; bl.forEach(d=>S.blocked.push(d.id));
      S.ratings={}; S.rated={}; rt.forEach(d=>{ const x=d.data(); S.ratings[x.target]=x.value; if(x.counted||x.value===1) S.rated[x.target]=true; });
      DEMO_SQUADS.length=0; S.squads=[]; S.joined=[];
      sq.forEach(d=>{ const s={...d.data(),id:d.id}; s.members=(Array.isArray(s.members)?s.members:[]).map(m=>this.fromUid(m)); s.owner=this.fromUid(s.owner); if(s.members.includes('me')&&s.owner!=='me') S.joined.push(s.id); (s.owner==='me'?S.squads:DEMO_SQUADS).push(s); });
      if(ad.exists&&!ADMINS.includes(uid)) ADMINS.push(uid); else if(!ad.exists){ const k=ADMINS.indexOf(uid); if(k>=0) ADMINS.splice(k,1); }
      await this.fetchPlayers(S.requests.map(r=>r.from==='me'?r.to:r.from));   // mates et demandes dont le profil n'est pas dans les 300 chargés
      const isModNow=ad.exists, wasMod=!!(prof.data()||{}).moderator;
      if(isModNow!==wasMod){ try{ await db.collection('profiles').doc(uid).update({moderator:isModNow}); if(S.me) S.me.moderator=isModNow; }catch(e){ console.error(e); } }
      await Promise.all([ad.exists?this.loadReports():null, this.loadBoards(), this.loadGroups(true)]);
      { const before=S.skin; applySkin(S.skinWanted||S.skin); if(S.skin!==before) route(); }
      this._loaded=true; this._loading=false; refreshAfterData(); retiredNotice();
      try{ localStorage.setItem('coopo_cache', JSON.stringify({ uid, players:PLAYERS, admin:ADMINS.includes(uid) })); }catch(e){}
      this._unsub.forEach(u=>u()); this._unsub=[];
      const lerr=e=>console.error(e);   // une écoute refusée ou coupée ne doit jamais bloquer la page
      this._unsub.push(db.collection('notifications').doc(uid).collection('items').orderBy('at','desc').limit(40).onSnapshot(snap=>{ let gNew=false;
        snap.docChanges().forEach(ch=>{ const n=ch.doc.data(); if(!n) return; const ex=S.notifs.find(x=>x.id===ch.doc.id);
          if(ch.type==='added'&&!ex){ const from=this.fromUid(n.from), open=n.type==='message'&&location.hash==='#/messages/'+from;
            S.notifs.push({...n,id:ch.doc.id,from,read:!!n.read||open}); if(open&&!n.read) this.markRead([ch.doc.id]);   // conversation ouverte : lu tout de suite
            if(!n.read&&n.type==='message'&&!open) S.unread[from]=(S.unread[from]||0)+1;   // message non lu : pastille sur la conversation
            if(this._notifReady&&!n.read){ if(!(n.type==='message'&&rowMuted('c',from))) deviceNotify(n); if(n.type==='group') gNew=true; } }   // v25 — pas de notification du téléphone pour une conversation en sourdine
          else if(ch.type==='modified'&&ex&&n.read) ex.read=true; });   // lu sur un autre appareil
        // nouvelle invitation dans un groupe : on recharge les groupes pour la pastille (le « + » de la colonne sur ordinateur, Messages sur téléphone)
        if(gNew) this.loadGroups(true).then(ch=>{ if(!ch) return; renderNotifBadge(); railGroupsRefresh(); if(location.hash==='#/groupe'&&!(dlg&&dlg.open)) viewGroupsHome(); else snRefresh(); }).catch(()=>{});
        this._notifReady=true;
        S.notifs.sort((a,b)=>(b.at||0)-(a.at||0)); S.notifs=S.notifs.slice(0,60); save(); renderNotifBadge(); },lerr));
      // Demandes de mate, dans les deux sens : une demande acceptée par l'autre joueur apparaît tout de suite chez celui qui l'a envoyée
      this._unsub.push(db.collection('requests').where('participants','array-contains',uid).onSnapshot(snap=>{ let chg=false; const fresh=[];
        snap.docChanges().forEach(ch=>{ const r=ch.doc.data(); if(!r) return; const from=this.fromUid(r.from), to=this.fromUid(r.to);
          const i=S.requests.findIndex(x=>x.id===ch.doc.id||(x.from===from&&x.to===to));
          if(ch.type==='removed'){ if(i>=0){ S.requests.splice(i,1); chg=true; } return; }
          const row={id:ch.doc.id,from,to,status:r.status,at:r.at};
          if(i<0){ S.requests.push(row); chg=true; fresh.push(from==='me'?to:from); }
          else if(S.requests[i].status!==row.status||S.requests[i].id!==row.id){ if(S.requests[i].status!==row.status) chg=true; S.requests[i]=row; } });
        if(!chg) return; save(); renderNotifBadge();
        this.fetchPlayers(fresh).catch(()=>{}).then(()=>refreshAfterData()); },lerr));
      // Flammes : une écoute sur toutes mes séries (un petit document par mate avec qui j'ai une série)
      // Appels : on écoute les appels de mes mates (ça sonne, décroché, raccroché)
      if(canCall()) this._unsub.push(db.collection('calls').where('parts','array-contains',uid).onSnapshot(snap=>{ snap.docChanges().forEach(ch=>{ if(ch.type!=='removed') onCallDoc(ch.doc.id,ch.doc.data()); }); },e=>console.error(e)));
      this._unsub.push(db.collection('streaks').where('members','array-contains',uid).onSnapshot(snap=>{ S.streaks=S.streaks||{};
        snap.docChanges().forEach(ch=>{ const s=ch.doc.data()||{}, other=(s.members||[]).find(x=>x!==uid); if(!other) return;
          if(ch.type==='removed'){ delete S.streaks[other]; return; } S.streaks[other]={last:s.last||{},both:+s.both||0,count:+s.count||0}; flameMilestone(other); });
        this._streakReady=true; save(); flameCheck();
        if(location.hash==='#/messages') refreshAfterData(); else { const m=/^#\/messages\/(.+)$/.exec(location.hash); if(m) renderChat(m[1]); } },lerr));
      save(); this.setPresence(true); clearInterval(this._hb); this._hb=setInterval(()=>{ if(!document.hidden) this.setPresence(true); },120000);   // toutes les 2 min, seulement si la page est affichée
      this.applyReferral();   // parrainage en attente (e-mail vérifié depuis la dernière visite)
      setTimeout(pushRefresh,4000);   // v14 — adresse « push » de cet appareil tenue à jour
    }catch(e){ console.error(e); this._loaded=true; this._loading=false; this._err=(e&&e.code)||String(e); toast('Chargement impossible. Vérifie ta connexion, puis recharge la page.'); refreshAfterData(); }
  },
  // Charge les profils qui manquent (mates ou demandes hors des 300 premiers profils). Renvoie true si au moins un a été ajouté.
  async fetchPlayers(ids){ if(!this.live||!this.uid()) return false; this._miss=this._miss||{};
    const need=[...new Set(ids)].filter(id=>id&&id!=='me'&&id!==this.uid()&&!this._miss[id]&&!PLAYERS.some(p=>p.id===id)).slice(0,60); if(!need.length) return false;
    const docs=await Promise.all(need.map(id=>this.db.collection('profiles').doc(id).get().catch(()=>null))); let n=0;
    docs.forEach((d,i)=>{ if(d&&d.exists&&!d.data().hidden&&!PLAYERS.some(p=>p.id===d.id)){ PLAYERS.push(normP({...d.data(),id:d.id,age:undefined,_extra:true})); n++; } else this._miss[need[i]]=1; });
    return n>0; },
  // Le pseudo est-il déjà réservé par un autre compte ?
  async nameTaken(name){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live||!this.uid()) return false; try{ const x=await this.db.collection('usernames').doc(String(name).toLowerCase()).get(); return x.exists&&x.data().uid!==this.uid(); }catch(e){ console.error(e); return false; } },
  // Enregistre le profil en ligne. Renvoie true si c'est fait ; sinon false, et _saveErr dit pourquoi ('name' = pseudo déjà pris).
  async saveProfile(me){ if(!this.live){ if(!AUTH_LIVE) return true; if(!(await this.ready())){ this._saveErr='offline'; return false; } } const uid=this.uid(), db=this.db; const {dob,id,age,...pub}=me; const lower=me.name.toLowerCase(); this._saveErr='';
    try{ const ref=db.collection('profiles').doc(uid); const cur=await ref.get().catch(()=>null); const isNew=!(cur&&cur.exists), oldLower=cur&&cur.exists?String(cur.data().nameLower||cur.data().name||'').toLowerCase():'';
      // Pseudo : un seul changement tous les 14 jours (les comptes qui n'ont jamais changé de pseudo peuvent le faire tout de suite)
      const renamed=!isNew&&!!oldLower&&oldLower!==lower, lastName=!isNew?(+cur.data().nameAt||0):0;
      if(renamed&&lastName&&Date.now()-lastName<NAME_WAIT_DAYS*864e5){ this._saveErr='nameWait'; this._nameAt=lastName; return false; }
      try{ await db.collection('usernames').doc(lower).set({uid}); }   // en premier : si le pseudo appartient à un autre compte, rien d'autre n'est écrit
      catch(e){ if(String(e&&e.code).includes('permission')){ this._saveErr='name'; return false; } throw e; }
      await db.collection('private').doc(uid).set({dob,tags:me.tags||{},updatedAt:Date.now()},{mergeFields:['dob','tags','updatedAt']});
      const {banned,hidden,rejoue,moderator,dispo,skin,discord,discordPublic,whatsapp,socials,suspendedUntil,...safe}=pub;   // champs de la modération : jamais renvoyés par le joueur
      const data={...safe,tags:publicTags(me),nameLower:lower,ageGroup:ageGroup(me),privacy:{tags:!!S.privacy.tags,online:!!S.privacy.online},online:!!S.privacy.online,lastSeen:S.privacy.online?Date.now():0,updatedAt:Date.now()};
      if(ageGroup(me)==='minor') await this.syncGameTags(me.tags||{});   // v7 — les pseudos en jeu d'un 13-17 ans sont rangés à part
      if(renamed) data.nameAt=Date.now(); else if(lastName) data.nameAt=lastName; else delete data.nameAt;
      if(isNew){ Object.assign(data,{banned:false,hidden:false,rejoue:0}); await ref.set(data); await this.applyReferral(); await this.loadAll(); }
      else { const FD=firebase.firestore.FieldValue.delete();
        await ref.update({...data,discord:FD,discordPublic:FD});   // update remplace chaque champ en entier : un rang, un pseudo en jeu ou une photo retirés disparaissent vraiment
        if(oldLower&&oldLower!==lower) db.collection('usernames').doc(oldLower).delete().catch(e=>console.error(e)); }   // l'ancien pseudo redevient libre
      return true; }
    catch(e){ console.error(e); this._saveErr=(e&&e.code)||'error'; return false; } },
  // Réglages de confidentialité : appliqués tout de suite en ligne (pseudos en jeu masqués = retirés du profil public)
  async savePrivacy(){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live||!this.uid()||!S.me) return; const uid=this.uid();
    try{ if(!S.privacy.tags) await this.db.collection('private').doc(uid).set({tags:S.me.tags||{}},{mergeFields:['tags']});   // copie privée d'abord
      if(ageGroup(S.me)==='minor') await this.syncGameTags(S.me.tags||{});
      await this.db.collection('profiles').doc(uid).update({privacy:{tags:!!S.privacy.tags,online:!!S.privacy.online},tags:publicTags(S.me),online:!!S.privacy.online,lastSeen:S.privacy.online?Date.now():0}); }
    catch(e){ console.error(e); toast("Réglage non enregistré en ligne. Vérifie ta connexion et réessaie."); } },
  // v7 — pseudos en jeu d'un 13-17 ans : gametags/{uid}, lu seulement par les 13-17 ans, ses mates et la modération (vide = effacé).
  // Une erreur ici (règles pas encore publiées, réseau) ne bloque jamais l'enregistrement du profil.
  async syncGameTags(tags){ if(!this.live||!this.uid()) return; const ref=this.db.collection('gametags').doc(this.uid()), t={};
    Object.entries(tags||{}).forEach(([k,v])=>{ if(k&&v&&Object.keys(t).length<40) t[String(k).slice(0,40)]=String(v).slice(0,40); });
    try{ if(S.privacy.tags&&Object.keys(t).length) await ref.set({tags:t,at:Date.now()}); else await ref.delete(); }catch(e){ console.error(e); } },
  async loadGameTags(id){ if(!this.live||!this.uid()) return null; try{ const d=await this.db.collection('gametags').doc(this.toUid(id)).get(); const t=d.exists?d.data().tags:null; return t&&typeof t==='object'?t:null; }catch(e){ return null; } },
  // Annonces et tournois : boards/{adult|minor}/annonces et boards/{adult|minor}/tournois (v7 — on lit les deux tableaux)
  async loadBoards(){ if(!this.live||!this.uid()||!S.me||!S.me.dob) return; const db=this.db, BOARDS=['adult','minor'];
    try{ const qs=await Promise.all(BOARDS.map(gg=>db.collection('boards').doc(gg).collection('annonces').where('until','>',Date.now()).orderBy('until').limit(60).get().catch(e=>{ console.error(e); return null; })));
      if(qs.some(Boolean)){ ANNONCES=[]; qs.forEach((q,i)=>q&&q.forEach(d=>ANNONCES.push({...d.data(),id:d.id,ageGroup:BOARDS[i]}))); } }catch(e){ console.error(e); }
    try{ const qs=await Promise.all(BOARDS.map(gg=>db.collection('boards').doc(gg).collection('tournois').orderBy('date','desc').limit(30).get().catch(e=>{ console.error(e); return null; })));
      if(qs.some(Boolean)){ const out=[]; qs.forEach((q,i)=>q&&q.forEach(d=>out.push({...d.data(),id:d.id,ageGroup:BOARDS[i]}))); TOURNOIS=out; } }catch(e){ console.error(e); }
    this._lastBoards=Date.now(); },
  async refreshBoards(){ if(!this.live||!this.uid()||this._boardsBusy||(this._lastBoards&&Date.now()-this._lastBoards<30000)) return false; this._boardsBusy=true; try{ await this.loadBoards(); return true; }finally{ this._boardsBusy=false; } },
  async saveAnnonce(a){ if(!this.live){ if(!AUTH_LIVE) return true; if(!(await this.ready())) return false; } try{ const {by,byName,game,need,rank,when,text,at,until}=a;
      const ref=await this.db.collection('boards').doc(a.ageGroup).collection('annonces').add({by,byName,game,need,rank,when,text,at,until,replies:[]}); a.id=ref.id; return true; }catch(e){ console.error(e); return false; } },
  async deleteAnnonce(a){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ await this.db.collection('boards').doc(a.ageGroup).collection('annonces').doc(a.id).delete(); }catch(e){ console.error(e); toast("L'annonce n'a pas pu être retirée"); } },
  async replyAnnonce(a,on){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ const F=firebase.firestore.FieldValue; await this.db.collection('boards').doc(a.ageGroup).collection('annonces').doc(a.id).update({replies:on?F.arrayUnion(this.uid()):F.arrayRemove(this.uid())}); }catch(e){ console.error(e); toast("Ta réponse n'a pas pu être enregistrée"); } },
  async saveTournoi(t){ if(!this.live){ if(!AUTH_LIVE) return true; if(!(await this.ready())) return false; } try{ const {id,ageGroup:g,...data}=t; const col=this.db.collection('boards').doc(g).collection('tournois');
      if(id){ const {players,entries,...rest}=data; await col.doc(id).set(rest,{merge:true}); } else { const r=await col.add(data); t.id=r.id; } return true; }catch(e){ console.error(e); return false; } },
  async deleteTournoi(t){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ await this.db.collection('boards').doc(t.ageGroup).collection('tournois').doc(t.id).delete(); }catch(e){ console.error(e); toast("Le tournoi n'a pas pu être supprimé"); } },
  async joinTournoi(t,on){ if(!this.live){ if(!AUTH_LIVE) return true; if(!(await this.ready())) return false; } try{ const F=firebase.firestore.FieldValue, uid=this.uid();
      const upd={players:on?F.arrayUnion(uid):F.arrayRemove(uid)}; upd['entries.'+uid]=on?{name:S.me.name,ig:myGroupNow()==='minor'?'':String((S.me.tags||{})[t.game]||'').slice(0,40)}:F.delete();   // v7 — pas le pseudo en jeu d'un 13-17 ans
      await this.db.collection('boards').doc(t.ageGroup).collection('tournois').doc(t.id).update(upd); return true; }catch(e){ console.error(e); toast(on?"L'inscription n'a pas pu être enregistrée":"La désinscription n'a pas pu être enregistrée"); return false; } },
  async saveRequest(r){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; const from=this.toUid(r.from), to=this.toUid(r.to); const db=this.db;
    try{ const ref=db.collection('requests').doc(`${from}_${to}`), data={from,to,participants:[from,to],status:r.status,at:r.at};
      if(r.status==='pending'){ // nouvelle demande : compteur journalier (20 max), vérifié par les règles Firestore
        const L=db.collection('limits').doc(this.uid()), cur=(await L.get()).data()||{}, today=Math.floor(Date.now()/86400000);
        const n=(cur.day===today?(cur.reqCount||0):0)+1;
        if(n>20){ toast('Tu as atteint la limite de 20 demandes pour aujourd\'hui. Réessaie demain.'); return; }
        const b=db.batch(); b.set(ref,data); b.set(L,{day:today,reqCount:n},{merge:true}); await b.commit();
        await this.saveNotif(r.to,{type:'request',from:'me',text:`${S.me.name} veut devenir ton mate`});
      } else await ref.set(data);
    }catch(e){ console.error(e); if(String(e&&e.code).includes('permission')) toast("Demande refusée : limite atteinte ou joueur indisponible."); } },
  async deleteRequest(r){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ await this.db.collection('requests').doc(`${this.toUid(r.from)}_${this.toUid(r.to)}`).delete(); }catch(e){ console.error(e); } },
  async saveBlock(id,on){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ const ref=this.db.collection('blocks').doc(this.uid()).collection('list').doc(id); on?await ref.set({at:Date.now()}):await ref.delete(); }catch(e){ console.error(e); } },
  async saveReport(rep){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; const db=this.db;
    try{ const msgs=(rep.group?[]:(S.chats[rep.id]||[])).slice(-10).map(m=>({mine:m.from==='me',text:((m.del?'[supprimé] ':'')+(m.hist&&m.hist.length?`[modifié, avant : « ${m.hist.join(' » puis « ')} »] `:'')+String(m.text||'')).slice(0,300),at:m.at||0}));
      const data={target:rep.id,by:this.uid(),reason:rep.reason,details:rep.details||'',at:rep.at,status:'open'}; if(msgs.length) data.messages=msgs;
      await db.collection('reports').add(data);
      if(msgs.length) await db.collection('reportedChats').doc(this.pairId(rep.id)).set({by:this.uid(),target:rep.id,at:Date.now()});   // autorise la modération à lire cette conversation
    }catch(e){ console.error(e); } },
  async loadReportedChat(by,target){ if(!this.live) return []; try{ const id=[by,target].sort().join('_'); const q=await this.db.collection('chats').doc(id).collection('messages').orderBy('at','desc').limit(30).get();
      const out=[]; q.forEach(d=>{ const m=d.data(); out.push({fromTarget:m.from===target,text:m.text,at:m.at,del:m.del===true,hist:Array.isArray(m.hist)?m.hist.filter(x=>typeof x==='string'):[]}); }); return out.reverse(); }catch(e){ console.error(e); return null; } },
  // Flamme : ce que mon message d'aujourd'hui change dans streaks/{paire} (rien si j'ai déjà écrit aujourd'hui)
  streakData(id,shift){ const t=dayNow()+(shift||0), me=this.uid(), cur=(S.streaks||{})[id]||{}, last={...(cur.last||{})}; if(last[me]===t) return null;
    last[me]=t; let both=cur.both||0, count=cur.count||0;
    if(last[id]===t && both!==t){ count = both===t-1 ? count+1 : 1; both=t; }   // l'autre a déjà écrit aujourd'hui : la journée est validée
    return { members:[me,id].sort(), last, both, count }; },
  // v11 — file d'envoi : les messages partent l'un après l'autre, à plus d'une seconde d'écart (les règles refusent 2 messages dans la même seconde).
  // Un envoi qui traîne (réseau coupé) ne bloque pas la file plus de 4 secondes : il continue tout seul.
  _sq:Promise.resolve(), _sqLast:0,
  queueSend(job){ let give; const out=new Promise(r=>give=r);
    const run=async()=>{ const w=this._sqLast+1150-Date.now(); if(w>0) await new Promise(r=>setTimeout(r,w));
      const p=Promise.resolve().then(job); give(p); try{ await Promise.race([p,new Promise(r=>setTimeout(r,4000))]); }catch(e){} this._sqLast=Date.now(); };
    this._sq=this._sq.then(run,run); return out.then(p=>p); },
  async sendMessage(id,m){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; const db=this.db;
    try{ const F=firebase.firestore.FieldValue, pair=this.pairId(id);
      const mk=st=>{ const b=db.batch(), mref=db.collection('chats').doc(pair).collection('messages').doc(); b.set(mref,{from:this.uid(),text:m.text,at:m.at,...(m.voice?{voice:m.voice}:{}),...(m.photo?{photo:m.photo}:{}),...(m.sticker?{sticker:m.sticker}:{}),...(m.reply?{reply:m.reply}:{}),...(m.call?{call:m.call}:{})});
        if(m.photo) b.set(db.collection('chats').doc(pair).collection('photos').doc(m.photo.id),{from:this.uid(),data:PHOTOS[m.photo.id]||'',w:m.photo.w,h:m.photo.h,at:m.at});   // la photo part dans le même envoi que le message
        if(m.voice) b.set(db.collection('chats').doc(pair).collection('voices').doc(m.voice.id),{from:this.uid(),data:VOICES[m.voice.id]||'',dur:m.voice.dur,at:m.at});   // le son part dans le même envoi que le message
        if(st) st.msg=mref.id;   // la flamme cite le message envoyé dans le même lot : sans vrai message, les règles la refusent
        b.set(db.collection('limits').doc(this.uid()),{lastMsg:F.serverTimestamp()},{merge:true});   // 1 message par seconde maximum
        if(st) b.set(db.collection('streaks').doc(pair),st); return b; };
      let st=m.call?null:this.streakData(id), sent=false;   // v16 — une ligne d'appel ne compte pas pour les flammes
      // Le jour est celui du serveur (heure d'Abidjan). Si l'horloge du téléphone est décalée, on réessaie avec le jour d'après puis d'avant.
      for(const sh of (st?[0,1,-1]:[])){ if(sh) st=this.streakData(id,sh); if(!st) break;
        try{ await mk(st).commit(); sent=true; if(sh) DAY_SHIFT+=sh; break; }
        catch(e){ if(!String(e&&e.code).includes('permission')) throw e; } }
      if(!sent){ st=null;   // flamme refusée (minuit vient de passer, règles pas encore publiées…) : le message part quand même
        try{ await mk(null).commit(); }
        catch(e){ if(!(m.voice&&m.voice.w&&String(e&&e.code).includes('permission'))) throw e; delete m.voice.w; await mk(null).commit(); } }   // ondes refusées (anciennes règles) : le vocal part sans elles
      if(st){ (S.streaks=S.streaks||{})[id]={last:st.last,both:st.both,count:st.count}; save(); flameMilestone(id); }
      if(!(m.call&&m.call.s==='ok')&&(!this._lastNotifTo||this._lastNotifTo[id]==null||Date.now()-this._lastNotifTo[id]>60000)){ (this._lastNotifTo=this._lastNotifTo||{})[id]=Date.now(); await this.saveNotif(id,{type:'message',from:'me',text:`${S.me.name} : ${m.text.slice(0,80)}`}); }   // v16 — un appel réussi n'envoie pas de notification
    }catch(e){ console.error(e); toast(String(e&&e.code).includes('permission')?'Doucement : attends une seconde entre deux messages.':"Le message n'est pas parti, réessaie."); } },
  listenChat(id,cb){ if(!this.live) return; this.stopChat();   // les 200 derniers messages (et plus les 200 premiers)
    this._chatUnsub=this.db.collection('chats').doc(this.pairId(id)).collection('messages').orderBy('at').limitToLast(200).onSnapshot(snap=>{ S.chats[id]=[]; const ca=clearedAt(id); snap.forEach(d=>{ const m=d.data(); if(ca&&(+m.at||0)<=ca) return;   // v25 — conversation supprimée de mon côté : ses anciens messages restent dans la base, mais ne s'affichent plus ici
      const o={id:d.id,from:this.fromUid(m.from),text:m.text,at:m.at}; msgExtra(o,m); if(m.voice&&m.voice.id){ o.voice={id:String(m.voice.id),dur:+m.voice.dur||0}; if(VW_RE.test(String(m.voice.w||''))) o.voice.w=m.voice.w; } if(m.photo&&m.photo.id) o.photo={id:String(m.photo.id),w:+m.photo.w||4,h:+m.photo.h||3}; S.chats[id].push(o); }); save(); cb(); },e=>console.error(e)); },
  // Image d'un message photo : en mémoire si elle a déjà été vue, sinon téléchargée
  async loadPhoto(kind,owner,pid){ if(PHOTOS[pid]) return PHOTOS[pid]; if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return null;
    try{ const base=kind==='g'?this.db.collection('groups').doc(owner):this.db.collection('chats').doc(this.pairId(owner)); const d=await base.collection('photos').doc(pid).get();
      if(!d.exists) return null; const data=String(d.data().data||''); const ks=Object.keys(PHOTOS); if(ks.length>30) ks.slice(0,15).forEach(k=>delete PHOTOS[k]); PHOTOS[pid]=data; return data; }
    catch(e){ console.error(e); return null; } },
  // Son d'un message vocal : en mémoire s'il a déjà été écouté, sinon téléchargé (kind : 'c' conversation privée, 'g' groupe)
  async loadVoice(kind,owner,vid){ if(VOICES[vid]) return VOICES[vid]; if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return null;
    try{ const base=kind==='g'?this.db.collection('groups').doc(owner):this.db.collection('chats').doc(this.pairId(owner)); const d=await base.collection('voices').doc(vid).get();
      if(!d.exists) return null; const data=String(d.data().data||''); if(Object.keys(VOICES).length>40) Object.keys(VOICES).slice(0,20).forEach(k=>{ if(!VPLAY||VPLAY.id!==k) delete VOICES[k]; }); VOICES[vid]=data; return data; }
    catch(e){ console.error(e); return null; } },
  stopChat(){ if(this._chatUnsub){ try{ this._chatUnsub(); }catch(e){} this._chatUnsub=null; } if(META&&META.kind==='c') this.stopMeta(); },
  // Notifications lues : enregistré sur le compte, pour ne pas les revoir « non lues » sur un autre appareil
  markRead(ids){ if(!this.live&&AUTH_LIVE){ if(ids.length) this.ready().then(ok=>{ if(ok) this.markRead(ids); }); return; } if(!this.live||!this.uid()) return; const col=this.db.collection('notifications').doc(this.uid()).collection('items'); [...new Set(ids)].slice(0,40).forEach(id=>col.doc(id).update({read:true}).catch(()=>{})); },
  async saveSquad(s){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ await this.db.collection('squads').doc(s.id).set({...s,owner:this.uid(),members:[this.uid()]}); }catch(e){ console.error(e); } },
  async deleteSquad(id){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ await this.db.collection('squads').doc(id).delete(); }catch(e){ console.error(e); } },
  async joinSquad(id,on){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ const F=firebase.firestore.FieldValue; await this.db.collection('squads').doc(id).update({members:on?F.arrayUnion(this.uid()):F.arrayRemove(this.uid())}); }catch(e){ console.error(e); } },
  // ---------- Groupes (groups/{id} et groups/{id}/messages) ----------
  // Trois lectures : mes groupes, mes invitations, les groupes publics (v7 — de tous les âges ; les règles refusent tout le reste)
  async loadGroups(force){ if(!this.live||!this.uid()||!S.me||!S.me.dob) return false; if(!force&&this._lastGroups&&Date.now()-this._lastGroups<30000) return false; this._lastGroups=Date.now();
    const uid=this.uid(), col=this.db.collection('groups'), out={};
    const qs=await Promise.all([col.where('members','array-contains',uid).get(), col.where('invited','array-contains',uid).get(), col.where('private','==',false).limit(60).get()].map(p=>p.catch(e=>{ console.error(e); return null; })));
    if(qs.every(q=>!q)) return false;
    qs.forEach(q=>q&&q.forEach(x=>{ out[x.id]=normG({...x.data(),id:x.id}); })); GROUPS=Object.values(out); return true; },
  // v20 — seulement mes groupes et mes invitations (liste des messages) : quelques lectures, au plus toutes les 30 s. Les groupes publics déjà chargés restent.
  async loadMyGroups(){ if(!this.live||!this.uid()||!S.me||!S.me.dob) return false; if(this._lastMine&&Date.now()-this._lastMine<30000) return false; this._lastMine=Date.now();
    const uid=this.uid(), me=myId(), col=this.db.collection('groups'), out={};
    const qs=await Promise.all([col.where('members','array-contains',uid).get(), col.where('invited','array-contains',uid).get()].map(p=>p.catch(e=>{ console.error(e); return null; })));
    if(qs.some(q=>!q)) return false;
    qs.forEach(q=>q.forEach(x=>{ out[x.id]=normG({...x.data(),id:x.id}); }));
    // un groupe dont je ne suis plus membre ni invité : retiré s'il est privé, sinon il reste dans les groupes publics, sans moi
    GROUPS=GROUPS.map(g=>out[g.id]||(!(gIn(g)||(g.invited||[]).includes(me))?g:g.private?null:{...g,members:g.members.filter(x=>x!==me),invited:(g.invited||[]).filter(x=>x!==me)})).filter(Boolean);
    Object.values(out).forEach(g=>{ if(!GROUPS.some(x=>x.id===g.id)) GROUPS.push(g); }); return true; },
  async createGroup(data){ const id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,8), me=myId();
    const doc={...data,owner:me,mods:[],members:[me],invited:[],kicked:[],ageGroup:myGroupNow(),at:Date.now()};
    if(AUTH_LIVE){ if(!this.live&&!(await this.ready())) return null; try{ await this.db.collection('groups').doc(id).set(doc); }catch(e){ console.error(e); return null; } }
    GROUPS.push(normG({...doc,id})); return id; },
  // Modifie un groupe en ligne (patch = fonction qui fabrique la mise à jour Firestore), puis dans la liste affichée
  async _gUpdate(id,patch,local){ if(AUTH_LIVE){ if(!this.live&&!(await this.ready())) return false;
      try{ await this.db.collection('groups').doc(id).update(patch(firebase.firestore.FieldValue)); }
      catch(e){ console.error(e); toast(String(e&&e.code).includes('permission')?"Action refusée : tu n'as pas (ou plus) ce droit dans le groupe.":"Ça n'a pas marché. Vérifie ta connexion et réessaie."); return false; } }
    const g=gById(id); if(g&&local) local(g); return true; },
  updateGroup(id,data){ return this._gUpdate(id,()=>data,g=>Object.assign(g,data)); },
  joinGroup(id){ const me=myId(); return this._gUpdate(id,F=>({members:F.arrayUnion(me),invited:F.arrayRemove(me)}),g=>{ if(!g.members.includes(me)) g.members.push(me); g.invited=g.invited.filter(x=>x!==me); }); },
  async leaveGroup(id){ const me=myId(); this.stopGroup(); const ok=await this._gUpdate(id,F=>({members:F.arrayRemove(me),mods:F.arrayRemove(me)}),g=>{ g.members=g.members.filter(x=>x!==me); g.mods=g.mods.filter(x=>x!==me); }); if(ok){ const g=gById(id); if(g&&g.private) GROUPS=GROUPS.filter(x=>x.id!==id); } return ok; },
  async declineGroup(id){ const me=myId(); const ok=await this._gUpdate(id,F=>({invited:F.arrayRemove(me)}),g=>{ g.invited=g.invited.filter(x=>x!==me); }); if(ok){ const g=gById(id); if(g&&g.private) GROUPS=GROUPS.filter(x=>x.id!==id); } return ok; },
  kickFromGroup(id,uid){ const g=gById(id), owner=g&&g.owner===myId();   // un modérateur ne touche qu'à members et kicked (règles) ; le créateur retire aussi le rôle
    return this._gUpdate(id,F=>owner?{members:F.arrayRemove(uid),mods:F.arrayRemove(uid),kicked:F.arrayUnion(uid)}:{members:F.arrayRemove(uid),kicked:F.arrayUnion(uid)},x=>{ x.members=x.members.filter(u=>u!==uid); x.mods=x.mods.filter(u=>u!==uid); if(!x.kicked.includes(uid)) x.kicked.push(uid); }); },
  setGroupMod(id,uid,on){ return this._gUpdate(id,F=>({mods:on?F.arrayUnion(uid):F.arrayRemove(uid)}),g=>{ g.mods=on?[...new Set([...g.mods,uid])]:g.mods.filter(u=>u!==uid); }); },
  // v7 — une invitation à la fois (les règles vérifient chaque personne invitée : un adulte n'invite un 13-17 ans que s'ils sont mates)
  async inviteToGroup(id,ids){ const g=gById(id); if(!g||!ids.length) return 0; let n=0;
    for(const u of ids){ const ok=await this._gUpdate(id,F=>({invited:F.arrayUnion(u)}),x=>{ if(!x.invited.includes(u)) x.invited.push(u); }); if(!ok) break; n++;
      if(this.live) await this.saveNotif(u,{type:'group',gid:id,from:'me',text:`${S.me.name} t'invite dans le groupe « ${g.name} »`.slice(0,190)}); }
    return n; },
  async deleteGroup(id){ this.stopGroup(); if(AUTH_LIVE){ if(!this.live&&!(await this.ready())) return false; const ref=this.db.collection('groups').doc(id);
      try{ for(let k=0;k<6;k++){ const q=await ref.collection('messages').limit(300).get(); if(q.empty) break; const b=this.db.batch(); q.forEach(x=>b.delete(x.ref)); await b.commit(); }   // les messages d'abord, puis le groupe
        try{ for(let k=0;k<30;k++){ const q=await ref.collection('voices').limit(8).get(); if(q.empty) break; const b=this.db.batch(); q.forEach(x=>b.delete(x.ref)); await b.commit(); } }catch(e){ console.error(e); }   // les sons des messages vocaux
        try{ for(let k=0;k<40;k++){ const q=await ref.collection('photos').limit(4).get(); if(q.empty) break; const b=this.db.batch(); q.forEach(x=>b.delete(x.ref)); await b.commit(); } }catch(e){ console.error(e); }   // les photos
        try{ const q=await ref.collection('meta').limit(60).get(); if(!q.empty){ const b=this.db.batch(); q.forEach(x=>b.delete(x.ref)); await b.commit(); } }catch(e){ console.error(e); }   // v15 — les « Vu » et « écrit… »
        await ref.delete(); }catch(e){ console.error(e); toast("Le groupe n'a pas pu être supprimé."); return false; } }
    GROUPS=GROUPS.filter(g=>g.id!==id); delete GMSGS[id]; return true; },
  async sendGroupMessage(id,text,voice,photo,sticker,reply){ const m={from:myId(),text,at:Date.now()}; if(voice) m.voice=voice; if(photo) m.photo=photo; if(sticker) m.sticker=sticker; if(reply) m.reply=reply;
    if(!AUTH_LIVE){ (GMSGS[id]=GMSGS[id]||[]).push({...m,id:'l'+m.at}); renderGroupChat(id); return; }
    if(!this.live&&!(await this.ready())) return; const db=this.db, F=firebase.firestore.FieldValue, ref=db.collection('groups').doc(id);
    try{ const mk=()=>{ const b=db.batch(); b.set(ref.collection('messages').doc(),m); if(voice) b.set(ref.collection('voices').doc(voice.id),{from:m.from,data:VOICES[voice.id]||'',dur:voice.dur,at:m.at});
        if(photo) b.set(ref.collection('photos').doc(photo.id),{from:m.from,data:PHOTOS[photo.id]||'',w:photo.w,h:photo.h,at:m.at});
        b.set(db.collection('limits').doc(this.uid()),{lastMsg:F.serverTimestamp()},{merge:true}); return b; };
      try{ await mk().commit(); }
      catch(e){ if(!(m.voice&&m.voice.w&&String(e&&e.code).includes('permission'))) throw e; m.voice={id:m.voice.id,dur:m.voice.dur}; await mk().commit(); }   // ondes refusées (anciennes règles) : le vocal part sans elles
      const g=gById(id); if(g&&Date.now()-tsMs(g.lastAt)>5*60e3){ g.lastAt=Date.now(); ref.update({lastAt:F.serverTimestamp()}).catch(e=>console.error(e)); }   // « nouveaux messages » pour les autres membres, au plus une écriture toutes les 5 minutes
    }catch(e){ console.error(e); toast(String(e&&e.code).includes('permission')?"Message refusé : attends une seconde, ou tu n'es plus membre de ce groupe.":"Le message n'est pas parti, réessaie."); } },
  // v10 — stickers : mes stickers (liste gardée sur l'appareil, rafraîchie chaque semaine), un sticker par son identifiant, créer, supprimer
  stkIdxKey(){ return 'coopo_stkmine_'+this.uid(); },
  async myStickers(force){ if(!AUTH_LIVE) return Object.keys(STK).filter(k=>STK[k].mine).map(id=>({id,n:STK[id].n}));
    if(!this.live&&!(await this.ready())) return [];
    try{ const c=JSON.parse(localStorage.getItem(this.stkIdxKey())||'null'); if(!force&&c&&Array.isArray(c.list)&&Date.now()-c.at<7*864e5) return c.list; }catch(e){}
    try{ const q=await this.db.collection('stickers').where('owner','==',this.uid()).limit(60).get(); const list=[];
      q.forEach(d=>{ const x=d.data(); if(STK_RE.test(String(x.data||''))) STK[d.id]={data:x.data,n:Math.max(1,Math.min(30,+x.n||1)),shape:['ci','rd','sq'].includes(x.shape)?x.shape:'sq'}; list.push({id:d.id,n:+x.n||1,at:tsMs(x.at)}); });
      list.sort((a,b)=>b.at-a.at); try{ localStorage.setItem(this.stkIdxKey(),JSON.stringify({at:Date.now(),list})); }catch(e){} return list; }
    catch(e){ console.error(e); return []; } },
  stkIdxEdit(fn){ try{ const c=JSON.parse(localStorage.getItem(this.stkIdxKey())||'null'); if(c&&Array.isArray(c.list)){ c.list=fn(c.list); localStorage.setItem(this.stkIdxKey(),JSON.stringify(c)); } }catch(e){} },
  async loadSticker(id){ if(STK[id]) return STK[id]; if(!AUTH_LIVE) return null; if(!this.live&&!(await this.ready())) return null;
    try{ const d=await this.db.collection('stickers').doc(id).get(); if(!d.exists) return null; const x=d.data(); if(!STK_RE.test(String(x.data||''))) return null;
      const ks=Object.keys(STK); if(ks.length>80) ks.slice(0,40).forEach(k=>delete STK[k]);
      return STK[id]={data:x.data,n:Math.max(1,Math.min(30,+x.n||1)),shape:['ci','rd','sq'].includes(x.shape)?x.shape:'sq'}; }
    catch(e){ console.error(e); return null; } },
  async createSticker(st){ const id=newId();
    if(!AUTH_LIVE){ STK[id]={...st,mine:true}; return id; }
    if(!this.live&&!(await this.ready())) return null;
    const db=this.db, lim=db.collection('limits').doc(this.uid()), F=firebase.firestore.FieldValue;
    let before={}; try{ const l=await lim.get(); before=l.exists?l.data():{}; }catch(e){}
    for(const sh of [0,1,-1]){ const day=Math.floor(Date.now()/864e5)+sh, count=(before.stkDay===day?(+before.stkCount||0):0)+1;
      if(count>30) throw new Error('limite');
      const b=db.batch(); b.set(db.collection('stickers').doc(id),{owner:this.uid(),data:st.data,n:st.n,shape:st.shape,at:F.serverTimestamp()}); b.set(lim,{stkDay:day,stkCount:count},{merge:true});
      try{ await b.commit(); this.stkIdxEdit(l=>[{id,n:st.n,at:Date.now()},...l]); return id; }
      catch(e){ if(!String(e&&e.code).includes('permission')) throw e; } }   // jour du serveur différent de celui du téléphone (minuit) : on réessaie avec le jour voisin
    throw new Error('refus'); },
  async deleteSticker(id){ if(!AUTH_LIVE){ delete STK[id]; return true; } if(!this.live&&!(await this.ready())) return false;
    try{ await this.db.collection('stickers').doc(id).delete(); delete STK[id]; this.stkIdxEdit(l=>l.filter(x=>x.id!==id)); return true; }
    catch(e){ console.error(e); toast("Le sticker n'a pas pu être supprimé."); return false; } },
  // v10 — modifier ou supprimer son message (privé : kind 'c', owner = le mate ; groupe : kind 'g', owner = le groupe)
  msgRef(kind,owner,mid){ return kind==='g' ? this.db.collection('groups').doc(owner).collection('messages').doc(mid) : this.db.collection('chats').doc(this.pairId(owner)).collection('messages').doc(mid); },
  msgLocal(kind,owner,fn){ const m=fn(); if(!m) return; if(kind==='g'){ if(location.hash==='#/groupe/'+owner) renderGroupChat(owner); } else { save(); if(location.hash==='#/messages/'+owner) renderChat(owner); } },
  async editMessage(kind,owner,mid,text){ const m=msgFind(kind,owner,mid); if(!msgEditable(m)) return;
    const hist=[...(m.hist||[]),m.text]; if(hist.length>20){ toast('Ce message a déjà été modifié trop de fois.'); return; }
    const apply=()=>this.msgLocal(kind,owner,()=>{ const x=msgFind(kind,owner,mid); if(x){ x.hist=hist; x.text=text; x.edited=Date.now(); } return x; });
    if(!AUTH_LIVE){ apply(); return; }
    if(!this.live&&!(await this.ready())) return;
    try{ await this.msgRef(kind,owner,mid).update({text,hist,edited:firebase.firestore.FieldValue.serverTimestamp()}); apply(); }
    catch(e){ console.error(e); toast(String(e&&e.code).includes('permission')?"Ce message ne peut pas être modifié.":"La modification n'est pas partie, réessaie."); } },
  async deleteMessage(kind,owner,mid){ const m=msgFind(kind,owner,mid); if(!m||m.del) return;
    const apply=()=>this.msgLocal(kind,owner,()=>{ const x=msgFind(kind,owner,mid); if(x){ x.del=true; x.edited=Date.now(); } return x; });
    if(!AUTH_LIVE){ apply(); return; }
    if(!this.live&&!(await this.ready())) return;
    try{ await this.msgRef(kind,owner,mid).update({del:true,edited:firebase.firestore.FieldValue.serverTimestamp()}); apply(); }
    catch(e){ console.error(e); toast("Le message n'a pas pu être supprimé."); } },
  // v14 — réagir à un message avec un emoji (emo = null : retirer sa réaction). Chacun ne touche que SA réaction : re.{son identifiant}
  async react(kind,owner,mid,emo){ const m=msgFind(kind,owner,mid); if(!m||m.del||(emo&&!RX_OK.test(emo))) return; const k=rxKey(kind), before=m.re?{...m.re}:null;
    const apply=re=>this.msgLocal(kind,owner,()=>{ const x=msgFind(kind,owner,mid); if(x){ if(re&&Object.keys(re).length) x.re=re; else delete x.re; } return x; });
    const next={...(m.re||{})}; if(emo) next[k]=emo; else delete next[k]; apply(next);
    if(!AUTH_LIVE) return; if(!this.live&&!(await this.ready())){ apply(before); return; }
    try{ await this.msgRef(kind,owner,mid).update({['re.'+k]:emo||firebase.firestore.FieldValue.delete()}); }
    catch(e){ console.error(e); apply(before); toast("La réaction n'est pas partie, réessaie."); } },
  // v15 — mates épinglés : dans la partie privée du compte
  async savePins(){ if(!this.live||!this.uid()) return; try{ await this.db.collection('private').doc(this.uid()).update({pins:pins().slice(0,PIN_MAX)}); }catch(e){ console.error(e); } },
  // v15 — « Vu » et « écrit… » (voir plus haut). kind : 'c' conversation privée, 'g' groupe. cb(chg) : chg = un « Vu » a bougé.
  metaCol(kind,id){ return (kind==='g'?this.db.collection('groups').doc(id):this.db.collection('chats').doc(this.pairId(id))).collection('meta'); },
  listenMeta(kind,id,cb){ this.stopMeta(); if(!this.live) return; const key=kind+':'+id, me=this.uid(); let first=true, synced=false;
    const M=META={key,kind,id,seen:{},typ:{},mine:0,ready:false};
    this._metaUnsub=this.metaCol(kind,id).onSnapshot(snap=>{ if(META!==M) return; const now=Date.now(); let chg=false;
      // v26 — « écrit… » affiché à tort en entrant : la première réponse vient de la mémoire de l'appareil, la suivante du serveur. Tant que le serveur n'a pas répondu,
      // un ancien « écrit… » resté dans la base (le mate a quitté sans envoyer) n'est pas une nouveauté. Et un signal de plus d'une minute n'est jamais affiché.
      const init=first||!synced;
      snap.forEach(d=>{ const x=d.data()||{}, u=d.id, seen=+x.seen||0;
        if(u===me){ M.mine=Math.max(M.mine,seen); return; }
        if((M.seen[u]||0)!==seen){ M.seen[u]=seen; chg=true; }
        const t=x.t==='w'||x.t==='v'?x.t:'', tAt=+x.tAt||0, old=M.typ[u];
        if(!t){ if(old) delete M.typ[u]; M['_'+u]=tAt; }
        else if(M['_'+u]!==tAt){ M['_'+u]=tAt; if(init?Math.abs(now-tAt)<TYPING_MS:Math.abs(now-tAt)<60000) M.typ[u]={t,tAt,until:now+TYPING_MS}; } });
      first=false; if(!(snap.metadata&&snap.metadata.fromCache)) synced=true; M.ready=true; cb(chg); },e=>console.error(e)); },
  stopMeta(){ if(META&&this._typ&&this._typ.key===META.key&&this._typ.t) this.typing(META.kind,META.id,'');   // v26 — je quitte la conversation : mon « écrit… » est effacé
    if(this._metaUnsub){ try{ this._metaUnsub(); }catch(e){} this._metaUnsub=null; } META=null; clearTimeout(TYP_T); },
  markSeen(kind,id,at){ if(!this.live||!META||META.key!==kind+':'+id||!META.ready||!(at>META.mine)||document.hidden) return; META.mine=at;
    this.metaCol(kind,id).doc(this.uid()).set({seen:at},{merge:true}).catch(e=>console.error(e)); },
  typing(kind,id,t){ if(!this.live||!META||META.key!==kind+':'+id) return; const now=Date.now(), last=this._typ||{}, same=last.key===META.key;
    if(t ? (same&&last.t===t&&now-last.at<TYPING_EVERY) : !(same&&last.t)) return;   // un signal toutes les 5 secondes au plus ; rien à effacer si rien n'a été signalé
    this._typ={key:META.key,t,at:now}; this.metaCol(kind,id).doc(this.uid()).set({t,tAt:now},{merge:true}).catch(e=>console.error(e)); },
  // « Vu » dans la liste : jusqu'où ces mates ont lu (une lecture par mate, une fois par minute au plus). Rend les mates dont le « Vu » a avancé.
  async peekSeen(ids){ if(!this.live) return []; const pk=this._peek=this._peek||{}, now=Date.now(), out=[];
    await Promise.all(ids.filter(id=>!(now-(pk[id]||0)<60000)).map(async id=>{ pk[id]=now;
      try{ const d=await this.db.collection('chats').doc(this.pairId(id)).collection('meta').doc(this.toUid(id)).get(); const s=d.exists?+d.data().seen||0:0;
        if(s>seenOf(id)){ (S.seenBy=S.seenBy||{})[id]=s; out.push(id); } }catch(e){} }));
    if(out.length) save(); return out; },
  // v14 — adresse de notification de cet appareil, dans private/{uid}.push (5 appareils au plus)
  async savePush(tok){ if(!this.live) return; const ref=this.db.collection('private').doc(this.uid()), d=(await ref.get()).data()||{};
    const list=(Array.isArray(d.push)?d.push:[]).filter(x=>typeof x==='string'&&x!==tok); list.push(tok);
    if(JSON.stringify(list.slice(-5))!==JSON.stringify(d.push||[])) await ref.update({push:list.slice(-5)}); },
  async dropPush(tok){ if(!this.live) return; await this.db.collection('private').doc(this.uid()).update({push:firebase.firestore.FieldValue.arrayRemove(tok)}); },
  deleteGroupMessage(id,mid){ if(!this.live) { GMSGS[id]=(GMSGS[id]||[]).filter(m=>m.id!==mid); renderGroupChat(id); return; } const gm=(GMSGS[id]||[]).find(m=>m.id===mid); if(gm&&gm.voice) this.db.collection('groups').doc(id).collection('voices').doc(gm.voice.id).delete().catch(e=>console.error(e));   // le son part avec le message
    if(gm&&gm.photo) this.db.collection('groups').doc(id).collection('photos').doc(gm.photo.id).delete().catch(e=>console.error(e));   // la photo aussi
    this.db.collection('groups').doc(id).collection('messages').doc(mid).delete().catch(e=>{ console.error(e); toast("Le message n'a pas pu être supprimé."); }); },
  listenGroup(id,cb){ this.stopGroup(); if(!this.live){ cb(); return; }   // les 100 derniers messages, en temps réel
    this._groupUnsub=this.db.collection('groups').doc(id).collection('messages').orderBy('at').limitToLast(100).onSnapshot(snap=>{ GMSGS[id]=[]; snap.forEach(x=>{ const m=x.data(); const o={id:x.id,from:m.from,text:m.text,at:m.at}; msgExtra(o,m); if(m.voice&&m.voice.id){ o.voice={id:String(m.voice.id),dur:+m.voice.dur||0}; if(VW_RE.test(String(m.voice.w||''))) o.voice.w=m.voice.w; } if(m.photo&&m.photo.id) o.photo={id:String(m.photo.id),w:+m.photo.w||4,h:+m.photo.h||3}; GMSGS[id].push(o); }); cb(); },
      e=>{ console.error(e); this.stopGroup(); this.loadGroups(true).then(()=>{ if(location.hash==='#/groupe/'+id) route(); }); }); },   // plus le droit de lire (retiré du groupe, groupe supprimé) : on recharge la liste
  stopGroup(){ if(this._groupUnsub){ try{ this._groupUnsub(); }catch(e){} this._groupUnsub=null; } if(META&&META.kind==='g') this.stopMeta(); },
  async saveNotif(toId,n){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ await this.db.collection('notifications').doc(this.toUid(toId)).collection('items').add({...n,from:this.toUid(n.from),at:Date.now(),read:false}); }catch(e){ console.error(e); } },
  // « Rejouerait avec lui » : le +1 n'est compté qu'une fois par joueur (champ counted, vérifié aussi par les règles Firestore)
  async rate(id,v){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; const db=this.db, uid=this.uid(), ref=db.collection('ratings').doc(`${uid}_${id}`), counted=!!(S.rated&&S.rated[id]);
    const data={by:uid,target:id,value:v,at:Date.now(),counted:counted||v>0};
    try{ const b=db.batch(); b.set(ref,data); if(v>0&&!counted) b.update(db.collection('profiles').doc(id),{rejoue:firebase.firestore.FieldValue.increment(1)}); await b.commit();
      if(v>0){ (S.rated=S.rated||{})[id]=true; save(); } }
    catch(e){ console.error(e); try{ await ref.set({...data,counted}); }catch(e2){ console.error(e2); } } },   // le compteur n'a pas pu bouger : on garde au moins la note privée
  async setPresence(on){ if(!this.live||!this.uid()||!S.me) return; this._lastPres=Date.now();
    try{ await this.db.collection('profiles').doc(this.uid()).update({online:!!(on&&S.privacy.online),lastSeen:S.privacy.online?Date.now():0}); }catch(e){} },   // statut masqué : aucune heure d'activité n'est publiée
  saveSkin(id){ try{ if(S.auth){ S.skinByUser=S.skinByUser||{}; S.skinByUser[S.auth.uid]=id; save(); } }catch(e){}
    if(!this.live&&AUTH_LIVE){ this.ready().then(ok=>{ if(ok) this.saveSkin(id); }); return; }
    if(!this.live||!this.uid()||!S.me) return; clearTimeout(this._skinT);
    this._skinT=setTimeout(()=>{ this.db.collection('profiles').doc(this.uid()).update({skin:id}).catch(e=>console.error(e)); },600); },
  // Plaque équipée : visible par les autres joueurs (les règles Firestore vérifient qu'elle est bien à ce joueur)
  savePlate(id){ if(!this.live&&AUTH_LIVE){ this.ready().then(ok=>{ if(ok) this.savePlate(id); }); return; } if(!this.live||!this.uid()||!S.me) return;
    this.db.collection('profiles').doc(this.uid()).update({plate:id||''}).catch(e=>{ console.error(e); toast("La plaque n'a pas pu être enregistrée en ligne."); }); },
  // Plaque gagnée (flammes, souvenir) : ajoutée à rewards/{uid}.plates ; les règles vérifient que la récompense est méritée (proof = conversation qui a la flamme)
  async grantPlate(id,proof){ if(!this.live||!this.uid()) return false; if((((S.rewards||{}).plates)||[]).includes(id)) return true;
    try{ const data={plates:firebase.firestore.FieldValue.arrayUnion(id)}; if(proof) data.proof=proof; await this.db.collection('rewards').doc(this.uid()).set(data,{merge:true});
      S.rewards={...(S.rewards||{}),plates:[...(((S.rewards||{}).plates)||[]),id]}; save(); return true; }catch(e){ console.error(e); return false; } },
  async setDispo(d){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live||!this.uid()) return; try{ await this.db.collection('profiles').doc(this.uid()).update({dispo:d||null}); }catch(e){ console.error(e); toast('Statut non enregistré en ligne'); } },
  async refreshPlayers(){ if(!this.live||!this.uid()||!S.me||!S.me.dob) return false; if(this._refreshing||(this._lastPlayers&&Date.now()-this._lastPlayers<180000)) return false; this._lastPlayers=Date.now(); this._refreshing=true;
    try{ const uid=this.uid(); const ps=await this.db.collection('profiles').where('hidden','==',false).limit(300).get();   // v7 — tous les âges
      const before=playersSig();   // v21 — « changé » seulement si ce que les pages montrent a changé : sinon la page ne se redessine pas pour rien
      const fresh=[]; ps.forEach(d=>{ if(d.id!==uid) fresh.push(normP({...d.data(),id:d.id,age:undefined})); }); const keep=PLAYERS.filter(p=>(p._reported||p._extra)&&!fresh.some(f=>f.id===p.id)); PLAYERS.length=0; fresh.concat(keep).forEach(p=>PLAYERS.push(p)); return playersSig()!==before; }catch(e){ console.error(e); return false; } finally{ this._refreshing=false; } },
  // Parrainage : validé une seule fois, quand le filleul a un profil ET une adresse e-mail vérifiée (les comptes Google le sont d'office).
  // Tant que l'e-mail n'est pas vérifié, le code est gardé et retesté au prochain chargement.
  async applyReferral(){ if(!this.live||!this.uid()||!S.me) return; let code=''; try{ code=(localStorage.getItem('coopo_ref')||'').toLowerCase(); }catch(e){} if(!code) return;
    const drop=()=>{ this._refWait=false; try{ localStorage.removeItem('coopo_ref'); }catch(e){} };
    if(code===S.me.name.toLowerCase()||(S.rewards&&S.rewards.referred)){ drop(); return; }
    try{ const done=await this.db.collection('referrals').doc(this.uid()).get(); if(done.exists){ drop(); return; } }catch(e){}   // déjà parrainé : une seule fois
    try{ const u=firebase.auth().currentUser;
      if(u&&!u.emailVerified){ await u.reload().catch(()=>{}); if(!u.emailVerified){ this._refWait=true; return; } await u.getIdToken(true).catch(()=>{}); }
      const un=await this.db.collection('usernames').doc(code).get(); if(!un.exists||un.data().uid===this.uid()){ drop(); return; }
      const by=un.data().uid, db=this.db, b=db.batch();
      b.set(db.collection('referrals').doc(this.uid()),{by,byName:code,at:Date.now()});
      b.set(db.collection('rewards').doc(by),{referrals:firebase.firestore.FieldValue.increment(1)},{merge:true});
      await b.commit(); drop(); }   // seul celui qui invite reçoit le thème (les filleuls d'avant gardent le leur)
    catch(e){ console.error(e); drop(); } },
  async loadPurchases(){ if(!this.live||!this.uid()) return; try{ const d=await this.db.collection('purchases').doc(this.uid()).get(); const x=d.exists?d.data():{}; S.owned={pack:!!x.pack,themes:Array.isArray(x.themes)?x.themes:[],plates:Array.isArray(x.plates)?x.plates:[]}; const r=await this.db.collection('rewards').doc(this.uid()).get(); S.rewards=r.exists?r.data():{}; save(); }catch(e){ console.error(e); } },
  async loadReports(){ if(!this.live) return; const db=this.db;
    try{ const rs=await db.collection('reports').orderBy('at','desc').limit(300).get();
      S.reports=[]; rs.forEach(d=>{ const r=d.data(); S.reports.push({rid:d.id,id:r.target,by:r.by,reason:r.reason,details:r.details,at:r.at,status:r.status,messages:r.messages||null}); });
      const ids=[...new Set(S.reports.map(r=>r.id))].filter(id=>!PLAYERS.some(p=>p.id===id));
      const docs=await Promise.all(ids.map(id=>db.collection('profiles').doc(id).get().catch(()=>null)));
      docs.forEach(d=>{ if(d&&d.exists) PLAYERS.push(normP({...d.data(),id:d.id,age:undefined,_reported:true})); });
      S.hidden=PLAYERS.filter(p=>p.hidden).map(p=>p.id); S.banned=PLAYERS.filter(p=>p.banned).map(p=>p.id); save();
    }catch(e){ console.error(e); toast('Signalements indisponibles'); } },
  async closeReports(target){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return; try{ const b=this.db.batch(); S.reports.filter(r=>r.id===target&&r.rid&&r.status!=='done').forEach(r=>b.update(this.db.collection('reports').doc(r.rid),{status:'done'})); await b.commit(); }catch(e){ console.error(e); } },
  async sendContact(c){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) throw new Error('offline');
    const topic=this.uid()?(CONTACT_TOPICS.some(t=>t[0]===c.topic)?c.topic:'question'):'connexion';   // sans compte : seulement les soucis de connexion (règles)
    await this.db.collection('contact').add({message:c.message,email:c.email||'',uid:this.uid()||'',topic,at:Date.now(),status:'open',...(c.tech&&this.uid()?{tech:c.tech}:{})}); },
  // Efface les données du compte. Renvoie false si l'effacement a échoué (le compte n'est alors pas supprimé, pour ne pas laisser de profil orphelin).
  async deleteAccountData(){ if(!this.live&&AUTH_LIVE&&!(await this.ready())) return false; if(!this.live||!this.uid()) return true; const uid=this.uid(), db=this.db, F=firebase.firestore.FieldValue, quiet=p=>p.catch(e=>console.error(e));
    try{ // d'abord ce qui peut manquer sans gravité : mes groupes, les groupes rejoints, mes annonces
      await Promise.all([ ...(S.squads||[]).map(s=>quiet(db.collection('squads').doc(s.id).delete())),
        ...(S.joined||[]).map(id=>quiet(db.collection('squads').doc(id).update({members:F.arrayRemove(uid)}))),
        ...GROUPS.filter(g=>g.owner===uid).map(g=>quiet(this.deleteGroup(g.id))),
        ...GROUPS.filter(g=>g.owner!==uid&&g.members.includes(uid)).map(g=>quiet(db.collection('groups').doc(g.id).update({members:F.arrayRemove(uid),mods:F.arrayRemove(uid)}))),
        quiet(db.collection('streaks').where('members','array-contains',uid).get().then(q=>Promise.all(q.docs.map(x=>x.ref.delete())))),
        quiet(db.collection('gametags').doc(uid).delete()),   // v7 — pseudos en jeu rangés à part (13-17 ans)
        ...ANNONCES.filter(a=>a.by===uid).map(a=>quiet(db.collection('boards').doc(a.ageGroup).collection('annonces').doc(a.id).delete())),
        ...ANNONCES.filter(a=>a.by!==uid&&(a.replies||[]).includes(uid)).map(a=>quiet(db.collection('boards').doc(a.ageGroup).collection('annonces').doc(a.id).update({replies:F.arrayRemove(uid)}))),
        ...TOURNOIS.filter(t=>(t.players||[]).includes(uid)).map(t=>{ const u={players:F.arrayRemove(uid)}; u['entries.'+uid]=F.delete(); return quiet(db.collection('boards').doc(t.ageGroup).collection('tournois').doc(t.id).update(u)); }) ]);
      const bl=await db.collection('blocks').doc(uid).collection('list').get(); const nt=await db.collection('notifications').doc(uid).collection('items').get();
      const rq=await db.collection('requests').where('participants','array-contains',uid).get();
      const b=db.batch(); bl.forEach(x=>b.delete(x.ref)); nt.forEach(x=>b.delete(x.ref)); rq.forEach(x=>b.delete(x.ref));
      if(S.me&&S.me.name) b.delete(db.collection('usernames').doc(S.me.name.toLowerCase()));
      b.delete(db.collection('profiles').doc(uid)); b.delete(db.collection('private').doc(uid)); b.delete(db.collection('contacts').doc(uid)); await b.commit(); return true;
    }catch(e){ console.error(e); return false; } },
  async adminHide(id,hidden){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return !AUTH_LIVE; try{ await this.db.collection('profiles').doc(id).update({hidden}); return true; }catch(e){ console.error(e); return false; } },
  async adminBan(id,banned){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return !AUTH_LIVE; try{ await this.db.collection('profiles').doc(id).update({banned,hidden:banned}); return true; }catch(e){ console.error(e); return false; } },
  // v9 — suspension : date de fin en millisecondes (0 = levée)
  async adminSuspend(id,until){ if(!this.live&&AUTH_LIVE) await this.ready(); if(!this.live) return !AUTH_LIVE; try{ await this.db.collection('profiles').doc(id).update({suspendedUntil:Math.max(0,Math.round(+until||0))}); return true; }catch(e){ console.error(e); return false; } },
  // Modération : les comptes bannis, masqués ou suspendus (les bannis et masqués ne sont pas dans la liste des 300 profils visibles)
  async loadSanctions(){ if(!this.live) return false; const db=this.db;
    try{ const qs=await Promise.all([db.collection('profiles').where('banned','==',true).limit(100).get(), db.collection('profiles').where('hidden','==',true).limit(100).get(), db.collection('profiles').where('suspendedUntil','>',Date.now()).limit(100).get()]);
      const add=d=>{ const x=normP({...d.data(),id:d.id,age:undefined}), i=PLAYERS.findIndex(p=>p.id===d.id); if(i>=0) Object.assign(PLAYERS[i],x); else PLAYERS.push({...x,_reported:true}); };
      qs.forEach(q=>q.forEach(add));
      S.hidden=PLAYERS.filter(p=>p.hidden).map(p=>p.id); S.banned=PLAYERS.filter(p=>p.banned).map(p=>p.id); save(); return true; }
    catch(e){ console.error(e); return false; } },
  // Modération : les messages du formulaire « Nous écrire » (bugs, questions…)
  async loadContactMsgs(){ if(!this.live) return []; try{ const q=await this.db.collection('contact').orderBy('at','desc').limit(80).get(); return q.docs.map(d=>({...d.data(),id:d.id})); }catch(e){ console.error(e); return null; } },
  async setContactDone(id,done){ if(!this.live) return !AUTH_LIVE; try{ await this.db.collection('contact').doc(id).update({status:done?'done':'open'}); return true; }catch(e){ console.error(e); return false; } },
};
