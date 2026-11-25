/* Faux Firebase (auth + firestore, API « compat ») pour tester le site sans réseau.
   Données gardées dans localStorage (__mockdb, __mockauth) : elles survivent aux rechargements. */
(function(){
  const LS_DB='__mockdb', LS_AUTH='__mockauth', LS_USERS='__mockusers';
  const load=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k))||d; }catch(e){ return d; } };
  const store=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  let DBD=load(LS_DB,{});            // { 'profiles/uid': {...}, 'chats/a_b/messages/id': {...} }
  const persist=()=>store(LS_DB,DBD);
  const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
  const listeners=new Set();
  let idn=Date.now();
  const autoId=()=>'m'+(idn++).toString(36)+Math.random().toString(36).slice(2,8);
  window.__mock={ get db(){ return DBD; }, set(path,data){ DBD[path]=data; persist(); notifyAll(); }, reset(){ DBD={}; persist(); localStorage.removeItem(LS_AUTH); localStorage.removeItem(LS_USERS); }, writes:[], denyNext:null, log:[] };

  /* ---------- FieldValue ---------- */
  const FV={ delete:()=>({__fv:'delete'}), increment:n=>({__fv:'inc',n}), arrayUnion:(...a)=>({__fv:'union',a}), arrayRemove:(...a)=>({__fv:'remove',a}), serverTimestamp:()=>({__fv:'ts'}) };
  function checkUndef(o,path){ if(o===undefined) throw Object.assign(new Error('Unsupported field value: undefined (found in '+path+')'),{code:'invalid-argument'});
    if(o&&typeof o==='object'&&!o.__fv){ for(const k in o) checkUndef(o[k],path+'.'+k); } }
  function applyField(cur,v){ if(v&&v.__fv){ if(v.__fv==='delete') return undefined; if(v.__fv==='inc') return (typeof cur==='number'?cur:0)+v.n;
      if(v.__fv==='union'){ const a=Array.isArray(cur)?cur.slice():[]; v.a.forEach(x=>{ if(!a.includes(x)) a.push(x); }); return a; }
      if(v.__fv==='remove') return (Array.isArray(cur)?cur:[]).filter(x=>!v.a.includes(x));
      if(v.__fv==='ts') return Date.now(); }
    if(v&&typeof v==='object'&&!Array.isArray(v)){ const o={}; for(const k in v){ const r=applyField(undefined,v[k]); if(r!==undefined) o[k]=r; } return o; }
    return v; }
  function setPath(obj,dotted,val){ const ks=dotted.split('.'); let o=obj; for(let i=0;i<ks.length-1;i++){ if(!o[ks[i]]||typeof o[ks[i]]!=='object') o[ks[i]]={}; o=o[ks[i]]; }
    const k=ks[ks.length-1]; const r=applyField(o[k],val); if(r===undefined) delete o[k]; else o[k]=r; }

  /* ---------- écritures ---------- */
  function doWrite(op){ // {type:set|update|delete, path, data, opts}
    if(op.type!=='delete') checkUndef(op.data,op.path);
    window.__mock.writes.push({type:op.type,path:op.path,data:clone(op.data)});
    if(window.__mock.denyNext && window.__mock.denyNext(op)) throw Object.assign(new Error('Missing or insufficient permissions.'),{code:'permission-denied'});
    const cur=DBD[op.path];
    if(op.type==='delete'){ delete DBD[op.path]; return; }
    if(op.type==='update'){ if(!cur) throw Object.assign(new Error('No document to update: '+op.path),{code:'not-found'}); const n=clone(cur); for(const k in op.data) setPath(n,k,op.data[k]); DBD[op.path]=n; return; }
    // set
    const o=op.opts||{};
    if(o.merge||o.mergeFields){ const n=clone(cur)||{}; const keys=o.mergeFields||Object.keys(op.data); keys.forEach(k=>{ if(k in op.data){ const r=applyField(n[k],op.data[k]); if(r===undefined) delete n[k]; else n[k]=r; } }); DBD[op.path]=n; }
    else { const n={}; for(const k in op.data){ const r=applyField(undefined,op.data[k]); if(r!==undefined) n[k]=r; } DBD[op.path]=n; }
  }
  function commit(ops){ const before=JSON.stringify(DBD); try{ ops.forEach(doWrite); }catch(e){ DBD=JSON.parse(before); throw e; } persist(); notifyAll(); }
  const later=fn=>new Promise((res,rej)=>setTimeout(()=>{ try{ res(fn()); }catch(e){ rej(e); } },window.__mock.netDelay||25));   // délai réseau simulé

  /* ---------- lectures ---------- */
  const docSnap=path=>{ const d=DBD[path]; return { id:path.split('/').pop(), exists:!!d, data:()=>clone(d), ref:docRef(path) }; };
  function runQuery(q){ const pre=q.col+'/', depth=q.col.split('/').length+1;
    let rows=Object.keys(DBD).filter(p=>p.startsWith(pre)&&p.split('/').length===depth).map(p=>({path:p,d:DBD[p]}));
    q.wheres.forEach(([f,op,v])=>{ rows=rows.filter(({d})=>{ const x=d[f]; return op==='=='?x===v:op==='>'?x>v:op==='<'?x<v:op==='>='?x>=v:op==='array-contains'?Array.isArray(x)&&x.includes(v):false; }); });
    if(q.order){ const [f,dir]=q.order; rows=rows.filter(r=>r.d[f]!==undefined).sort((a,b)=>(a.d[f]>b.d[f]?1:a.d[f]<b.d[f]?-1:0)*(dir==='desc'?-1:1)); }
    if(q.lim) rows=rows.slice(0,q.lim); if(q.limLast) rows=rows.slice(-q.limLast);
    return rows.map(r=>r.path); }
  function querySnap(paths,changes){ const docs=paths.map(docSnap); return { docs, size:docs.length, empty:!docs.length, forEach:cb=>docs.forEach(cb), docChanges:()=>changes||docs.map(doc=>({type:'added',doc})) }; }
  function notifyAll(){ listeners.forEach(l=>{ try{ l.check(); }catch(e){ console.error('mock listener',e); } }); }
  function listenQuery(q,cb){ let last=null;
    const l={ check(){ const paths=runQuery(q), now={}; paths.forEach(p=>now[p]=JSON.stringify(DBD[p]));
        if(last===null){ last=now; setTimeout(()=>{ if(listeners.has(l)) cb(querySnap(paths)); },5); return; }
        const ch=[]; paths.forEach(p=>{ if(!(p in last)) ch.push({type:'added',doc:docSnap(p)}); else if(last[p]!==now[p]) ch.push({type:'modified',doc:docSnap(p)}); });
        Object.keys(last).forEach(p=>{ if(!(p in now)){ const old=last[p]; ch.push({type:'removed',doc:{id:p.split('/').pop(),exists:false,data:()=>JSON.parse(old)}}); } });
        last=now; if(ch.length) setTimeout(()=>{ if(listeners.has(l)) cb(querySnap(paths,ch)); },5); } };
    listeners.add(l); l.check(); return ()=>listeners.delete(l); }
  function query(col,st){ st=st||{wheres:[]}; const q={col,...st};
    return { where:(f,op,v)=>query(col,{...st,wheres:[...st.wheres,[f,op,v]]}), orderBy:(f,dir)=>query(col,{...st,order:[f,dir||'asc']}), limit:n=>query(col,{...st,lim:n}), limitToLast:n=>{ if(!st.order) throw new Error('limitToLast() requires orderBy()'); return query(col,{...st,limLast:n}); },
      get:()=>later(()=>querySnap(runQuery(q))), onSnapshot:(cb,err)=>listenQuery(q,cb),
      doc:id=>docRef(col+'/'+(id||autoId())), add:data=>later(()=>{ const p=col+'/'+autoId(); commit([{type:'set',path:p,data}]); return docRef(p); }) }; }
  function docRef(path){ return { id:path.split('/').pop(), path,
      get:()=>later(()=>docSnap(path)), set:(data,opts)=>later(()=>commit([{type:'set',path,data,opts}])), update:data=>later(()=>commit([{type:'update',path,data}])), delete:()=>later(()=>commit([{type:'delete',path}])),
      collection:name=>query(path+'/'+name) }; }
  const dbi={ collection:name=>query(name), enablePersistence:()=>Promise.resolve(),
    batch(){ const ops=[]; const b={ set:(ref,data,opts)=>{ ops.push({type:'set',path:ref.path,data,opts}); return b; }, update:(ref,data)=>{ ops.push({type:'update',path:ref.path,data}); return b; }, delete:ref=>{ ops.push({type:'delete',path:ref.path}); return b; }, commit:()=>later(()=>commit(ops)) }; return b; } };

  /* ---------- auth ---------- */
  let USERS=load(LS_USERS,{}), authCbs=[], cur=null;
  const err=(code)=>Object.assign(new Error(code),{code});
  function mkUser(u){ return { uid:u.uid, email:u.email, get displayName(){ return (USERS[u.email]||{}).displayName||''; }, photoURL:'', get emailVerified(){ return !!USERS[u.email].emailVerified; }, providerData:[{providerId:u.provider}],
      updateProfile:p=>new Promise(r=>setTimeout(()=>{ USERS[u.email].displayName=p.displayName; store(LS_USERS,USERS); r(); },window.__mock.netDelay||60)), sendEmailVerification:async()=>{ window.__mock.log.push('verif:'+u.email); }, reload:async()=>{ USERS=load(LS_USERS,USERS); },
      getIdToken:async()=>'tok-'+u.uid, getIdTokenResult:async()=>({authTime:new Date(window.__mock.authTime||Date.now()).toISOString()}),
      delete:async()=>{ delete USERS[u.email]; store(LS_USERS,USERS); setCur(null); } }; }
  function setCur(u){ cur=u?mkUser(u):null; if(u) store(LS_AUTH,u.email); else localStorage.removeItem(LS_AUTH); const c=cur; Promise.resolve().then(()=>authCbs.forEach(cb=>cb(c))); }   // comme le vrai SDK : les écouteurs passent avant la suite de l'appelant
  const authi={ get currentUser(){ return cur; },
    onAuthStateChanged(cb){ authCbs.push(cb); setTimeout(()=>cb(cur),5); },
    async createUserWithEmailAndPassword(mail,pw){ if(USERS[mail]) throw err('auth/email-already-in-use'); USERS[mail]={uid:'u'+autoId(),email:mail,pw,provider:'password',emailVerified:false}; store(LS_USERS,USERS); window.__mock.authTime=Date.now(); setCur(USERS[mail]); return {user:cur}; },
    async signInWithEmailAndPassword(mail,pw){ const u=USERS[mail]; if(!u||u.pw!==pw) throw err('auth/invalid-credential'); window.__mock.authTime=Date.now(); setCur(u); return {user:cur}; },
    async signInWithCredential(c){ const mail=c.email; if(!USERS[mail]) USERS[mail]={uid:c.uid||('g'+autoId()),email:mail,displayName:c.name||'',provider:'google.com',emailVerified:true}; store(LS_USERS,USERS); window.__mock.authTime=Date.now(); setCur(USERS[mail]); return {user:cur}; },
    async sendPasswordResetEmail(){ }, async signOut(){ setCur(null); } };
  { const m=load(LS_AUTH,null); if(m&&USERS[m]) cur=mkUser(USERS[m]); }
  window.__mock.users=()=>USERS; window.__mock.verify=mail=>{ USERS[mail].emailVerified=true; store(LS_USERS,USERS); };
  window.__mock.addUser=(u)=>{ USERS[u.email]={provider:'password',emailVerified:true,pw:'azerty12',...u}; store(LS_USERS,USERS); };
  window.__mock.signIn=(mail)=>authi.signInWithEmailAndPassword(mail,USERS[mail].pw);

  const fb={ apps:[], initializeApp(c){ if(fb.apps.length) throw new Error("Firebase App named '[DEFAULT]' already exists"); fb.apps.push(c); }, app:()=>({ functions:()=>({ httpsCallable:()=>async()=>({data:{}}) }) }) };
  fb.auth=()=>authi; fb.auth.GoogleAuthProvider={ credential:tok=>JSON.parse(tok) };
  fb.firestore=()=>dbi; fb.firestore.FieldValue=FV;
  window.firebase=fb;
})();
