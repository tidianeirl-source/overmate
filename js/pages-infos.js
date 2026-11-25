/* Coopô — js/pages-infos.js
   Aide, CGU, confidentialité, profil express, page d'arrivée, cookies, remboursement, « Nous écrire », modération, onboarding.
   Les fichiers de js/ sont chargés l'un après l'autre par index.html, dans l'ordre de la liste qui s'y trouve.
   Ce sont des scripts classiques (pas des modules) : ce que chacun déclare est partagé avec tous les autres. */
/* ---- Aide, CGU, confidentialité ---- */
const BUG_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="13" rx="5"/><path d="M9 7a3 3 0 0 1 6 0M12 11v9M3 13h4M17 13h4M4 7l3 2M20 7l-3 2M4 19l3-2M20 19l-3-2"/></svg>';
const MAIL_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
function viewHelp(){
  const faq=[['Comment est calculé le pourcentage de compatibilité ?','Chaque critère vaut un nombre de points (jeux en commun, horaires, style, jours, plateforme, rang, langue, pays). Le total est ramené sur 100. Sur le profil d\'un joueur, tu vois le détail critère par critère.'],
    ['Pourquoi je ne vois pas certains joueurs ?','Tu ne vois pas les joueurs que tu as bloqués, ni ceux masqués par la modération.'],
    ['Comment contacter un joueur ?','Envoie-lui une demande de mate. S\'il accepte, vous pouvez vous écrire dans Messages et vous retrouver dans des groupes. Tout se passe dans Coopô : aucun numéro ni pseudo d\'un autre réseau n\'est demandé.'],
    ['Comment créer un groupe avec mes mates ?','Dans Messages, touche le bouton + (sur ordinateur : le « + » sous tes groupes, dans la colonne de gauche). Donne-lui un nom, puis coche les mates à ajouter : ils reçoivent une invitation et rejoignent le groupe en un clic. Plus tard, le bouton « Ajouter des mates » en haut du groupe permet d\'en inviter d\'autres.'],
    ['Comment épingler un mate ?','Dans Messages, garde le doigt sur un mate (ou fais un clic droit sur ordinateur), puis choisis « Épingler en haut ». Il reste en haut de ta liste. Tu peux épingler 5 mates au plus, et toi seul le vois.'],
    ['Que veulent dire « Vu » et « écrit… » ?','« Vu » s\'affiche sous ton dernier message quand ton mate l\'a lu (dans un groupe : « Vu par 3 »). « écrit… » ou « enregistre un vocal… » apparaît en bas de la conversation pendant que ton mate prépare un message.'],
    ['Où voir mes appels ?','Chaque appel laisse une ligne dans la conversation : sa durée, ou « Manqué ». Dans Messages, le bouton téléphone en haut ouvre la liste de tes derniers appels passés, reçus et manqués sur cet appareil. Pendant un appel, le bouton « Haut-parleur » apparaît quand ton téléphone permet à Coopô de choisir la sortie du son.'],
    ['Comment appeler à plusieurs ?','Pendant un appel vocal, appuie sur « Ajouter » et choisis un mate : il reçoit ton appel et rejoint la discussion. Vous pouvez être 4 au plus. Si la personne qui a ajouté un mate raccroche, ce mate quitte l\'appel avec elle. Un message vocal peut durer jusqu\'à 2 minutes.'],
    ['Adultes et 13-17 ans peuvent-ils jouer ensemble ?','Oui. Mais avec un joueur de moins de 18 ans, c\'est lui qui envoie la demande de mate : un adulte ne peut pas commencer une conversation avec lui. Entre un adulte et un 13-17 ans, les messages écrits, les vocaux et les appels vocaux sont possibles, mais pas les appels vidéo ni les photos. Les pseudos en jeu d\'un 13-17 ans ne sont montrés qu\'aux 13-17 ans et à ses mates.'],
    ['Mon e-mail ou ma date de naissance sont-ils visibles ?','Non, jamais. Les autres joueurs ne voient que ton pseudo, ton avatar, tes jeux et tes habitudes de jeu.'],
    ['À quoi servent les annonces ?','À trouver vite des joueurs pour une partie précise : « Je cherche 2 joueurs Free Fire ce soir ». Clique sur « Je suis partant » : l\'auteur est prévenu et reçoit une demande de mate (si l\'auteur a moins de 18 ans et toi plus, tu es seulement noté partant : c\'est lui qui choisit de t\'ajouter). Les annonces disparaissent toutes seules après la partie.'],
    ['Comment participer à un tournoi ?','Dans Communauté › Tournois, clique sur « S\'inscrire ». Ton pseudo en jeu est transmis à l\'organisateur pour qu\'il puisse t\'inviter.'],
    ['Que faire face à un comportement toxique ?','Utilise Signaler sur son profil : l\'équipe de modération examine chaque signalement. Tu peux aussi le bloquer immédiatement.'],
    ['Comment supprimer mon compte ?','Dans Profil, puis Réglages, tout en bas. Tes données sont effacées définitivement.']];
  app.innerHTML=`<div class="wrap page" style="max-width:800px">${backAuto()}<div class="page-head"><div><h2>Aide</h2><p>Comment ça marche, et les questions fréquentes.</p></div></div>
    <section class="panel"><h3>Comment ça marche</h3><ol class="steps">
      <li><b>Crée ton compte</b><span>Avec Google ou un e-mail. Il faut avoir au moins ${CONFIG.minAge} ans.</span></li>
      <li><b>Renseigne ton profil</b><span>Jeux, rang, horaires, jours, style, plateforme, langue.</span></li>
      <li><b>Découvre tes matchs</b><span>Les joueurs les plus compatibles s'affichent en premier, les joueurs en ligne sont mis en avant.</span></li>
      <li><b>Envoie une demande de mate</b><span>S'il accepte, vous pouvez discuter et jouer ensemble. Tu peux aussi rejoindre un groupe.</span></li></ol></section>
    <section class="panel" style="margin-top:16px"><h3>Questions fréquentes</h3><div class="faq">${faq.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>
    <section class="panel help-contact" style="margin-top:16px"><h3>Un souci ? Écris-nous</h3><p class="muted">Un bouton qui ne marche pas, une page qui s'affiche mal, une question sur ton compte : la modération lit chaque message.</p>
      <div class="help-acts"><a class="btn btn-ac" href="#/contact/bug">${BUG_SVG}Signaler un bug</a><a class="btn btn-ghost" href="#/contact">${MAIL_SVG}Nous écrire</a></div></section>
    <p class="hint" style="margin-top:16px">Un problème avec un joueur ? Utilise « Signaler » sur son profil : la modération s'en occupe.</p></div>`;
}
function viewLegal(kind){
  const cgu=kind==='cgu';
  app.innerHTML=`<div class="wrap page legal">${backAuto()}<div class="page-head"><div><h2>${cgu?"Conditions générales d'utilisation":'Politique de confidentialité'}</h2><p>Dernière mise à jour : novembre 2026</p></div></div>
    ${cgu?`
    <h3>1. Objet</h3><p>Coopô est un service de mise en relation entre joueurs de jeux vidéo, édité depuis la Côte d'Ivoire par Konate Tidiane. En créant un compte, tu acceptes les présentes conditions.</p>
    <h3>2. Âge minimum</h3><p>Le service est réservé aux personnes âgées d'au moins ${CONFIG.minAge} ans. Entre un adulte et un utilisateur de ${CONFIG.minAge} à ${CONFIG.adultAge-1} ans, seul ce dernier peut envoyer une demande de mate ; les appels vidéo et l'envoi de photos ne sont pas possibles entre eux, et les numéros de téléphone sont bloqués dans leurs conversations. Toute fausse déclaration d'âge entraîne la suppression du compte.</p>
    <h3>3. Compte</h3><p>Tu es responsable de la confidentialité de ton mot de passe et de l'usage de ton compte. Un seul compte par personne. Le pseudo ne doit pas usurper l'identité d'un tiers.</p>
    <h3>4. Comportement</h3><p>Sont interdits : le harcèlement, les propos haineux ou discriminatoires, les contenus sexuels, les arnaques, la collecte de données d'autres utilisateurs et toute sollicitation d'un mineur par un adulte. L'éditeur peut masquer, suspendre ou supprimer un compte sans préavis en cas de manquement.</p>
    <h3>5. Modération et signalements</h3><p>Chaque utilisateur peut signaler ou bloquer un autre utilisateur. Les signalements sont examinés par l'équipe de modération. Un profil que tu signales disparaît aussitôt de ton côté ; l'équipe de modération décide ensuite de le masquer ou de bannir le compte pour tout le monde.</p>
    <h3>6. Responsabilité</h3><p>Coopô facilite la mise en relation mais n'organise pas les parties et n'est pas partie aux échanges entre utilisateurs. Reste prudent : ne partage jamais d'informations personnelles sensibles (adresse, école, numéro de téléphone) avec un inconnu.</p>
    <h3>7. Suppression du compte</h3><p>Tu peux supprimer ton compte à tout moment depuis les paramètres. Ton profil, tes données privées, tes contacts, tes demandes de mate, tes blocages, tes notifications, tes groupes, tes annonces et tes inscriptions aux tournois sont alors effacés, sauf obligation légale de conservation. Les messages que tu as déjà envoyés restent visibles par les mates qui les ont reçus.</p>
    <h3>8. Boutique : thèmes et plaques</h3><p>Certains thèmes visuels et certaines plaques nominatives sont payants, à l'unité ou en pack. Le paiement passe par SasPay (Mobile Money ou carte bancaire) et chaque achat est vérifié par notre serveur avant d'être ajouté à ton compte. Tant que la mention « mode test » est affichée dans la boutique, aucun vrai paiement n'est possible. Un objet acheté reste lié à ton compte tant qu'il existe. Les thèmes et les plaques sont purement esthétiques et ne donnent aucun avantage pour la mise en relation. Les achats des utilisateurs de moins de 18 ans nécessitent l'accord d'un parent ou tuteur. Les conditions de remboursement sont détaillées dans la <a href="#/remboursement">politique de remboursement</a>.</p>
    <h3>9. Modifications</h3><p>Les présentes conditions peuvent évoluer ; tu seras informé des changements importants.</p>`
    :`
    <h3>1. Données collectées</h3><p>Pour créer ton compte : e-mail, pseudo, date de naissance, et, si tu utilises Google, ton nom et ta photo Google. Pour ton profil : jeux, pseudos et rangs en jeu, horaires, jours, style, plateformes, pays, langues. Coopô ne te demande aucun numéro de téléphone ni pseudo d'un autre réseau ; ceux qui avaient été enregistrés avant ont été effacés. Pour la communauté : tes annonces et tes inscriptions aux tournois. Pour le fonctionnement : demandes de mate, messages, signalements, blocages, notifications, ton statut « en ligne » et l'heure de ta dernière visite, ton avis « tu rejouerais avec lui ? » sur un joueur, et, si tu es venu par un lien de parrainage, le pseudo de ton parrain. Si tu nous écris par le formulaire de contact : ton message et l'e-mail que tu indiques.</p>
    <h3>2. Ce qui est visible</h3><p>Les autres utilisateurs voient uniquement ton pseudo, ton avatar, tes jeux et tes habitudes de jeu. Ton statut « en ligne » et le moment de ta dernière visite sont visibles si tu ne les as pas désactivés dans les paramètres. Tes avis sur les autres joueurs ne leur sont pas montrés. Ton e-mail, ta date de naissance et ton âge exact ne sont jamais affichés. Ton e-mail reste uniquement dans le service de connexion (Firebase Authentication) : il n'est pas recopié dans la base de données du site. Tes messages privés ne sont lisibles que par toi et ton mate ; si tu signales une conversation, les derniers messages sont joints au signalement et la modération peut consulter cette conversation, uniquement pour traiter le signalement.</p>
    <h3>3. Utilisation</h3><p>Les données servent à calculer les compatibilités, à faire fonctionner les demandes de mate, les messages et les groupes, à protéger les 13-17 ans et à assurer la modération. Aucune donnée n'est vendue. Aucune publicité ciblée. Messages privés, écrits, vocaux ou photos : seuls toi et ton mate les voyez. Les appels vocaux et vidéo passent directement entre vos deux appareils (parfois par un relais technique) et ne sont jamais enregistrés ; la modération n'y accède que si l'un de vous signale la conversation. Groupes : les messages sont lus par les membres du groupe, et la modération de Coopô peut les consulter et les supprimer pour protéger les joueurs. Flammes : Coopô enregistre seulement les jours où vous vous êtes écrit, pas le contenu. Message modifié ou supprimé : il reste marqué « modifié » ou « Message supprimé » ; son contenu d'avant (texte, photo ou vocal) reste enregistré avec lui, et la modération ne le lit que si la conversation est signalée (dans un groupe : pour protéger les joueurs). Stickers : ceux que tu crées à partir de tes photos ou vidéos sont enregistrés sur ton compte ; les adultes à qui tu les envoies peuvent les voir et les ajouter à leurs stickers. Si tu supprimes un sticker, il disparaît partout.</p>
    <h3>4. Hébergement</h3><p>Les données sont stockées sur Firebase, un service de Google Cloud. Elles sont protégées par des règles d'accès : ton e-mail et ta date de naissance ne sont lisibles que par toi et par la modération.</p>
    <h3>5. Conservation</h3><p>Les données sont conservées tant que le compte existe, puis supprimées. Les messages que tu as envoyés restent visibles par les mates qui les ont reçus. Les signalements peuvent être conservés anonymisés pour la sécurité du service.</p>
    <h3>6. Tes droits</h3><p>Tu peux consulter, modifier et supprimer tes données depuis ton compte, ou en nous écrivant via le formulaire <a href="#/contact">Nous écrire</a>. Les utilisateurs mineurs peuvent exercer ces droits avec un parent ou tuteur. En Côte d'Ivoire, tu peux aussi saisir l'ARTCI, l'autorité chargée de la protection des données personnelles.</p>
    <h3>7. Paiements</h3><p>Les paiements sont traités par SasPay (Mobile Money ou carte bancaire). Pour un achat, Coopô transmet à SasPay ton adresse e-mail (pour ton reçu), ton pseudo, ton pays, l'objet acheté et son prix ; rien d'autre. Coopô ne reçoit ni ton numéro de carte ni ton code Mobile Money ; nous conservons uniquement la référence de la transaction, l'article acheté, le montant et son statut.</p>
    <h3>8. Cookies</h3><p>Le site utilise uniquement le stockage nécessaire au fonctionnement (session, thème choisi). Pas de cookies publicitaires ni de mesure d'audience. Pour afficher le site plus vite, une copie des données que tu as déjà consultées (liste des joueurs, messages) est gardée dans ton navigateur ; elle est effacée quand tu te déconnectes ou quand tu vides les données du site. Le détail est dans la <a href="#/cookies">politique de cookies</a>.</p>
    <h3>9. Sécurité</h3><p>Les échanges avec le site sont chiffrés (HTTPS). Les mots de passe sont gérés par Firebase Authentication : nous ne les voyons jamais. L'accès aux données est limité par des règles côté serveur, et seule l'équipe de modération peut consulter les signalements. Aucun système n'est infaillible : choisis un mot de passe unique, vérifie ton adresse e-mail et ne partage jamais tes identifiants. Dans les messages, les numéros de téléphone sont bloqués pour les 13-17 ans et dans les conversations avec eux et un avertissement s'affiche sur les liens reçus.</p>
    <h3>10. Modifications</h3><p>Cette politique peut évoluer avec le site. La date de mise à jour est indiquée en haut de la page et tu seras informé des changements importants.</p>`}
    </div>`;
}

/* ---- Création du profil express (2 écrans) ---- */
let OB=null;
function viewOnboard(){
  if(!OB) OB={ step:1, name:suggestName((S.auth&&S.auth.name)||''), games:[], hours:[], weekend:false, style:'' };
  if(!OB.name && S.auth && S.auth.name) OB.name=suggestName(S.auth.name);
  draft = draft&&draft.dob!==undefined&&!draft.games ? draft : { dob:'' };
  if(!draft.dob) draft.dob=knownDob();
  const step=OB.step, kd=knownDob();
  const tile=(on,attr,label,sub='')=>`<button type="button" class="ob-tile${on?' on':''}" ${attr} aria-pressed="${on}"><b>${label}</b>${sub?`<small>${sub}</small>`:''}</button>`;
  const more=GAMES.filter(g=>!TOP_GAMES.includes(g));
  const body = step===1 ? `
      <div class="field"><label for="ob-name">Ton pseudo</label><input id="ob-name" type="text" maxlength="${CONFIG.maxUsername}" value="${esc(OB.name)}" autocomplete="username" placeholder="ex. KoffiNight"><span class="hint">3 à 20 caractères : lettres, chiffres, _ . -</span></div>
      ${kd?'':dobField()}
      <div class="field"><span class="lbl">À quoi tu joues ?</span>
        <div class="ob-grid">${TOP_GAMES.map(g=>tile(OB.games.includes(g),`data-ob-game="${esc(g)}"`,esc(g))).join('')}</div>
        <details class="ob-more"${OB.games.some(g=>!TOP_GAMES.includes(g))?' open':''}><summary>Autres jeux</summary>
          <div class="chips" style="margin-top:10px">${more.map(g=>`<button type="button" class="chip" data-ob-game="${esc(g)}" aria-pressed="${OB.games.includes(g)}">${esc(g)}</button>`).join('')}</div>
          <div class="row" style="gap:8px;margin-top:10px"><input id="ob-other" type="text" maxlength="30" placeholder="Un autre jeu ?" style="flex:1"><button type="button" class="btn btn-sm" id="ob-add">Ajouter</button></div>
        </details></div>`
    : `
      <div class="field"><span class="lbl">Tu joues plutôt quand ?</span>
        <div class="ob-grid ob-4">${HOURS.map(([v,l])=>tile(OB.hours.includes(v),`data-ob-hour="${v}"`,l)).join('')}</div>
        <label class="ob-check"><input type="checkbox" id="ob-we" ${OB.weekend?'checked':''}> Surtout le week-end</label></div>
      <div class="field"><span class="lbl">Ton style ?</span>
        <div class="ob-grid ob-3">${[['casual','Chill','pour le plaisir'],['comp','Compétitif','pour gagner'],['both','Les deux','selon le jour']].map(([v,l,sub])=>tile(OB.style===v,`data-ob-style="${v}"`,l,sub)).join('')}</div></div>`;
  app.innerHTML=`<div class="wrap page onboard">
    <div class="ob-head"><div class="ob-progress" aria-label="Étape ${step} sur 2"><i style="width:${step*50}%"></i></div>
      <h2>${step===1?'Bienvenue sur Coopô 👋':'Dernière question'}</h2>
      <p>${step===1?'Deux questions et tu vois tes matchs.':'On s\'en sert pour te proposer les bons joueurs.'}</p>
      ${S.auth?`<p class="muted" style="font-size:13px">Connecté : ${esc(S.auth.email||S.auth.name||'')} · <button class="linklike" type="button" data-signout>Se déconnecter</button></p>`:''}</div>
    <form class="panel ob-form" id="ob" novalidate>${body}
      <p class="ferr" id="ob-err" role="alert"></p>
      <div class="ob-actions">${step===2?'<button type="button" class="btn btn-ghost" id="ob-back">Retour</button>':''}<button type="submit" class="btn btn-ac btn-lg">${step===1?'Continuer':'Voir mes matchs'}</button></div>
    </form>
    <p class="muted ob-later">Tu pourras ajouter plus tard tes pseudos en jeu, tes jours et ton avatar.</p></div>`;
  initDob();
  const f=app.querySelector('#ob'), err=app.querySelector('#ob-err');
  const keepName=()=>{ const n=app.querySelector('#ob-name'); if(n) OB.name=n.value.trim(); };
  app.querySelectorAll('[data-ob-game]').forEach(b=>b.onclick=()=>{ keepName(); const g=b.dataset.obGame; OB.games=OB.games.includes(g)?OB.games.filter(x=>x!==g):[...OB.games,g]; const on=OB.games.includes(g); b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); });
  const add=app.querySelector('#ob-add'); if(add) add.onclick=()=>{ const i=app.querySelector('#ob-other'); const v=i.value.trim().slice(0,30); if(v&&!OB.games.includes(v)){ OB.games.push(v); keepName(); viewOnboard(); } };
  app.querySelectorAll('[data-ob-hour]').forEach(b=>b.onclick=()=>{ const v=b.dataset.obHour; OB.hours=OB.hours.includes(v)?OB.hours.filter(x=>x!==v):[...OB.hours,v]; const on=OB.hours.includes(v); b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); });
  app.querySelectorAll('[data-ob-style]').forEach(b=>b.onclick=()=>{ OB.style=b.dataset.obStyle; app.querySelectorAll('[data-ob-style]').forEach(x=>{ const on=x===b; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on); }); });
  const we=app.querySelector('#ob-we'); if(we) we.onchange=()=>{ OB.weekend=we.checked; };
  const back=app.querySelector('#ob-back'); if(back) back.onclick=()=>{ OB.step=1; viewOnboard(); };
  f.onsubmit=async e=>{ e.preventDefault(); const errs=[], btn=f.querySelector('button[type=submit]'); if(btn.disabled) return;
    if(OB.step===1){ keepName();
      if(!new RegExp(`^[A-Za-z0-9_.-]{${CONFIG.minUsername},${CONFIG.maxUsername}}$`).test(OB.name)) errs.push("Choisis un pseudo de 3 à 20 caractères (lettres, chiffres, _ . -).");
      else if(PLAYERS.some(p=>p.name.toLowerCase()===OB.name.toLowerCase())) errs.push("Ce pseudo est déjà pris.");
      const age=ageFrom(draft.dob); if(age===null) errs.push('Indique ta date de naissance.'); else if(age<CONFIG.minAge) errs.push(`Il faut avoir au moins ${CONFIG.minAge} ans pour utiliser Coopô.`); else if(age>100) errs.push('Vérifie ta date de naissance.');
      if(!OB.games.length) errs.push('Choisis au moins un jeu.');
      if(!errs.length){ btn.disabled=true; const taken=await DB.nameTaken(OB.name); btn.disabled=false; if(taken) errs.push("Ce pseudo est déjà pris."); }   // vérifié auprès de tous les comptes, pas seulement des joueurs affichés
      if(errs.length){ err.innerHTML=errs.map(esc).join('<br>'); return; }
      OB.step=2; viewOnboard(); window.scrollTo(0,0); return; }
    if(!OB.hours.length) errs.push('Choisis au moins un moment.');
    if(!OB.style) errs.push('Choisis ton style.');
    if(errs.length){ err.innerHTML=errs.map(esc).join('<br>'); return; }
    // tout le reste est déduit ou mis par défaut : modifiable ensuite dans « Mon profil »
    const plats=[...new Set(OB.games.flatMap(g=>GAME_PLATFORMS[g]||['mobile']))];
    const reg=((navigator.language||'').split('-')[1]||'').toUpperCase(); const country=COUNTRIES.some(c=>c[0]===reg)?reg:'';
    S.me={ id:'me', name:OB.name, dob:draft.dob, games:OB.games, hours:OB.hours, days:OB.weekend?['sam','dim']:[], style:OB.style, goal:'both', voice:'parfois',
      platforms:plats.length?plats:['mobile'], country, langs:['fr'], tags:{}, ranks:{}, avatar:{hue:[265,330,10,45,150,200][Math.floor(Math.random()*6)]} };
    if(S.auth) S.profiles[S.auth.uid]=S.me; S.onboard=true; save();
    btn.disabled=true; btn.textContent='Création du profil…';
    if(!(await DB.saveProfile(S.me))){   // rien n'est gardé en local si le profil n'existe pas en ligne
      S.me=null; if(S.auth) delete S.profiles[S.auth.uid]; S.onboard=false; save();
      if(DB._saveErr==='name'){ OB.step=1; viewOnboard(); const er=app.querySelector('#ob-err'); if(er) er.textContent="Ce pseudo vient d'être pris. Choisis-en un autre."; }
      else { btn.disabled=false; btn.textContent='Voir mes matchs'; err.textContent="Ton profil n'a pas pu être enregistré. Vérifie ta connexion et réessaie."; }
      return; }
    if(typeof demoScheduleIncoming==='function') demoScheduleIncoming();
    OB=null; toast(DB._refWait?'Profil créé ! Vérifie ton e-mail pour valider l\'invitation de ton ami.':'Profil créé, bienvenue !');
    let next='#/matchs'; try{ next=sessionStorage.getItem('coopo_after_profile')||sessionStorage.getItem('coopo_after_login')||'#/matchs'; sessionStorage.removeItem('coopo_after_profile'); sessionStorage.removeItem('coopo_after_login'); }catch(x){}
    location.hash=next; };
}

/* ---- Page d'arrivée (visiteur jamais connecté) ---- */
function viewWelcome(){
  if(S.auth){ location.hash='#/accueil'; return; }
  const ex=[['KO','KoffiNight','Free Fire · Soir','91',330],['AW','AwaBuild','eFootball · Week-end','84',150],['DJ','DjeliSniper','COD Mobile · Nuit','77',45]];
  app.innerHTML=`<div class="wrap page welcome">
    <section class="wl-hero">
      <span class="wl-kicker">Gratuit · dès 13 ans · profils modérés</span>
      <h1>Trouve des joueurs avec qui <span class="hl">jouer ce soir</span>.</h1>
      <p>Coopô te met en relation avec des gamers d'Afrique francophone qui jouent aux mêmes jeux, aux mêmes heures et avec le même style que toi.</p>
      <div class="wl-cta"><a class="btn btn-ac btn-lg" href="#/inscription">Créer mon compte gratuit</a><a class="linkbtn" href="#/connexion">J'ai déjà un compte</a></div>
    </section>
    <section class="wl-demo" aria-label="Exemple de matchs">
      ${ex.map(([i,n,g,c,h])=>`<div class="wl-card">${avatar({name:i,avatar:{hue:h}},46)}<div><b>${n}</b><span>${g}</span></div>${ring(+c,'ring-sm')}</div>`).join('')}
      <p class="wl-cap">Exemple : tes meilleurs matchs, classés par compatibilité.</p>
    </section>
    <section class="wl-feats">
      <div><b>🎮 Mêmes jeux, mêmes heures</b><span>Free Fire, eFootball, COD Mobile, FC, Fortnite… et tes horaires.</span></div>
      <div><b>⚡ Dispo maintenant</b><span>Dis que tu es libre, lance un duo en un clic.</span></div>
      <div><b>🛡️ Les 13-17 ans protégés</b><span>Avec un adulte, c'est le jeune qui envoie la demande. Pas d'appel vidéo ni de photo entre eux.</span></div>
    </section>
    <p class="wl-legal">En t'inscrivant, tu acceptes les <a href="#/cgu">CGU</a> et la <a href="#/confidentialite">politique de confidentialité</a>.</p>
  </div>`;
}

/* ---- Politique de cookies ---- */
function viewCookies(){
  app.innerHTML=`<div class="wrap page legal">${backAuto()}<div class="page-head"><div><h2>Politique de cookies</h2><p>Dernière mise à jour : novembre 2026</p></div></div>
    <h3>En bref</h3><p>Coopô n'utilise <b>aucun cookie publicitaire ni outil de mesure d'audience</b>. Nous utilisons seulement ce qui est indispensable au fonctionnement du site. C'est pourquoi aucun bandeau de consentement ne s'affiche : ce type de stockage n'en nécessite pas.</p>
    <h3>Ce que le site enregistre dans ton navigateur</h3>
    <p><b>Stockage local du site</b> : ta session, le thème choisi, ta devise, tes préférences d'affichage et un brouillon de ton profil. Ces données restent sur ton appareil et servent uniquement au fonctionnement de Coopô.</p>
    <p><b>Firebase Authentication (Google)</b> : garde ta connexion ouverte entre deux visites.</p>
    <p><b>Copie locale des données</b> : pour un affichage plus rapide, les données déjà consultées (liste des joueurs, messages) sont gardées dans ton navigateur.</p>
    <p><b>Connexion avec Google</b> : si tu choisis ce mode de connexion, Google dépose ses propres cookies pendant l'identification, selon sa politique de confidentialité.</p>
    <p><b>Polices d'écriture</b> : les polices sont chargées depuis Google Fonts ; ton adresse IP est donc transmise à Google lors de ce chargement, sans cookie.</p>
    <p><b>Paiement</b> : lors d'un achat, la page du prestataire de paiement peut utiliser ses propres cookies, nécessaires à la transaction.</p>
    <h3>Comment les supprimer</h3><p>Te déconnecter efface ta session. Tu peux aussi effacer les données du site dans les réglages de ton navigateur (rubrique « Données des sites » ou « Cookies »). Tu devras alors te reconnecter et rechoisir ton thème.</p>
    <h3>Évolution</h3><p>Si un jour nous ajoutons un outil de mesure d'audience ou de publicité, nous te demanderons ton accord avant de l'activer.</p>
  </div>`;
}

/* ---- Politique de remboursement ---- */
function viewRefund(){
  app.innerHTML=`<div class="wrap page legal">${backAuto()}<div class="page-head"><div><h2>Politique de remboursement</h2><p>Dernière mise à jour : octobre 2026</p></div></div>
    <h3>Ce qui est vendu</h3><p>Coopô vend des thèmes visuels, à l'unité ou en pack. Ce sont des contenus numériques, débloqués sur ton compte dès que le paiement est confirmé. Ils changent seulement l'apparence du site et ne donnent aucun avantage pour trouver des mates.</p>
    <h3>Satisfait ou remboursé pendant 14 jours</h3><p>Tu peux demander le remboursement d'un achat dans les <b>14 jours</b> qui suivent le paiement, même si tu as simplement changé d'avis. Le thème remboursé est alors retiré de ton compte.</p>
    <h3>Remboursement intégral à tout moment</h3>
    <p><b>Paiement débité sans déblocage</b> : si le thème n'apparaît pas sur ton compte, nous le débloquons ou nous te remboursons, au choix.</p>
    <p><b>Double paiement ou mauvais montant</b> : la somme payée en trop t'est rendue.</p>
    <p><b>Achat d'un mineur sans accord parental</b> : un parent ou tuteur peut demander l'annulation de l'achat.</p>
    <h3>Comment faire la demande</h3><p>Écris-nous via <a href="#/contact">Nous écrire</a> en indiquant la référence de la transaction (elle commence par <b>OM</b> et s'affiche sur la page « Paiement » après ton achat), ton pseudo et le motif. Nous répondons sous 7 jours. Le remboursement est versé sur le moyen de paiement utilisé lors de l'achat (numéro Mobile Money ou carte bancaire).</p>
    <h3>Compte supprimé ou banni</h3><p>Les thèmes sont liés à ton compte. Si tu supprimes ton compte, ils sont perdus et ne sont pas remboursés au-delà des 14 jours. En cas de bannissement pour non-respect des règles, les achats ne sont pas remboursés.</p>
  </div>`;
}

/* ---- Nous écrire (formulaire enregistré dans Firebase, aucun contact affiché) ---- */
// Sujets du formulaire « Nous écrire » ([valeur, libellé]) ; #/contact/bug ouvre directement « Un bug »
const CONTACT_TOPICS=[['bug','Un bug'],['question','Une question'],['compte','Mon compte'],['autre','Autre chose']];
const CONTACT_LBL={bug:'Bug',question:'Question',compte:'Compte',autre:'Autre',general:'Message',connexion:'Connexion'};
// Ce qui part avec un signalement de bug, pour aider à le corriger (jamais l'e-mail ni le mot de passe)
async function bugTech(){ let v=''; try{ v=((await caches.keys()).find(k=>/^coopo-v\d+$/.test(k))||''); }catch(e){}
  return { app:v, ecran:`${innerWidth}×${innerHeight}`, theme:S.skin||'', appareil:String(navigator.userAgent||'').slice(0,220) }; }
function viewContact(kind){
  const bug=kind==='bug'&&!!S.auth, topic=bug?'bug':'question';
  app.innerHTML=`<div class="wrap page legal">${backAuto()}<div class="page-head"><div><h2>${bug?'Signaler un bug':'Nous écrire'}</h2><p>${!S.auth?'Tu n\'arrives pas à te connecter ? Explique-nous le problème (600 caractères max). Pour toute autre demande, connecte-toi d\'abord.':bug?'Quelque chose ne marche pas comme prévu ? Dis-nous ce qui se passe, on le corrige.':'Une question, un problème de compte, une demande sur tes données ? Écris-nous ici, la modération te répondra.'}</p></div></div>
    <form class="panel" id="ct-form" novalidate style="display:grid;gap:14px;max-width:620px">
      ${S.auth?`<div class="field"><label for="ct-topic">C'est à propos de…</label><select id="ct-topic">${CONTACT_TOPICS.map(([v,l])=>`<option value="${v}"${v===topic?' selected':''}>${l}</option>`).join('')}</select></div>`:''}
      <div class="field"><label for="ct-msg">Ton message</label><textarea id="ct-msg" rows="6" maxlength="${S.auth?2000:600}" required placeholder="${bug?'Ex. : dans Messages, quand j\'appuie sur le micro, rien ne se passe.':''}"></textarea>
        <small class="hint ct-bughint" id="ct-bughint"${bug?'':' hidden'}>Dis ce que tu faisais, ce qui s'est passé et sur quelle page. Pour nous aider, la version de Coopô, la taille de ton écran et le modèle de ton appareil sont joints au message.</small>
        <small class="ferr" id="ct-err"></small></div>
      <div class="field"><label for="ct-mail">Ton e-mail pour la réponse (facultatif)</label><input id="ct-mail" type="email" maxlength="120" autocomplete="email" value="${esc(S.auth?.email||'')}"></div>
      <div><button class="btn btn-ac" type="submit" id="ct-send">Envoyer le message</button></div>
    </form></div>`;
  const sel=document.getElementById('ct-topic'); if(sel) sel.onchange=()=>{ const b=sel.value==='bug'; document.getElementById('ct-bughint').hidden=!b; document.querySelector('.page-head h2').textContent=b?'Signaler un bug':'Nous écrire'; };
  document.getElementById('ct-form').addEventListener('submit',async e=>{ e.preventDefault();
    const msg=document.getElementById('ct-msg').value.trim(), mail=document.getElementById('ct-mail').value.trim(), err=document.getElementById('ct-err'), btn=document.getElementById('ct-send'), tp=sel?sel.value:'connexion';
    if(!msg){ err.textContent='Écris ton message avant d\'envoyer.'; return; }
    if(mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){ err.textContent='Cet e-mail ne semble pas valide.'; return; }
    err.textContent=''; btn.disabled=true; btn.textContent='Envoi…';
    try{ await DB.sendContact({message:msg,email:mail,topic:tp,tech:tp==='bug'?await bugTech():null});
      app.querySelector('#ct-form').innerHTML=`<h3>${tp==='bug'?'Merci pour ton signalement':'Message envoyé'}</h3><p class="muted">${tp==='bug'?'La modération le regarde et on corrige au plus vite.':'Merci.'} ${mail?'On te répondra par e-mail si besoin.':'Tu n\'as pas laissé d\'e-mail : on ne pourra pas te répondre directement.'}</p><div><a class="btn" href="#/accueil">Retour à l\'accueil</a></div>`; }
    catch(x){ btn.disabled=false; btn.textContent='Envoyer le message'; err.textContent='Envoi impossible pour le moment. Vérifie ta connexion et réessaie.'; } });
}

/* ---- Modération (administrateurs) ---- */
const isAdmin = () => !!S.auth && (ADMINS.includes(S.auth.email)||ADMINS.includes(S.auth.uid));
const ADM={ msgs:null, at:0, loading:false, err:false };   // page Modération : messages « Nous écrire » chargés
// Un message « Nous écrire » : sujet, auteur, texte, e-mail pour répondre, et pour un bug l'appareil et la version
function admMsgRow(m){ const p=m.uid?PLAYERS.find(x=>x.id===m.uid):null, done=m.status==='done', tp=CONTACT_LBL[m.topic]||'Message', t=m.tech&&typeof m.tech==='object'?m.tech:null;
  return `<section class="panel admin-row adm-msg${done?' done':''}"><div class="adm-msg-top"><span class="adm-topic${m.topic==='bug'?' bug':''}">${esc(tp)}</span><span class="muted">${p?`<a href="#/joueur/${esc(p.id)}">${esc(p.name)}</a>`:m.uid?'Un joueur':'Visiteur non connecté'} · ${ago(+m.at||0)}${done?' · traité':''}</span></div>
    <p class="adm-text">${esc(String(m.message||''))}</p>
    ${m.email?`<p class="muted adm-mail">Répondre à : <span class="adm-sel">${esc(String(m.email))}</span></p>`:''}
    ${t?`<p class="muted adm-tech">${esc([t.app,t.ecran,t.theme&&('thème '+t.theme)].filter(Boolean).join(' · '))}${t.appareil?`<br><small>${esc(String(t.appareil))}</small>`:''}</p>`:''}
    <div class="nact"><button class="btn btn-sm${done?' btn-ghost':' btn-ac'}" type="button" data-cdone="${esc(m.id)}" data-v="${done?0:1}">${done?'Rouvrir':'Marquer traité'}</button></div></section>`; }
function viewAdmin(){
  if(!isAdmin()){
    const uid=S.auth&&S.auth.uid, waiting=DB.live&&uid&&!DB._loaded;
    const why=!S.auth?'Connecte-toi avec ton compte modérateur.'
      :DB._noProfile?"Ton profil n'est pas encore enregistré : termine la création de ton profil, puis reviens ici."
      :DB._err?`Erreur de chargement (${esc(DB._err)}).`
      :"Aucun document admins/{ton UID} n'a été trouvé dans Firestore.";
    if(waiting && !DB._loading) DB.loadAll();
    app.innerHTML=waiting?`<div class="wrap page"><div class="empty"><h3>Vérification de tes droits…</h3></div></div>`
      :`<div class="wrap page"><div class="empty"><h3>Accès réservé à la modération</h3><p class="muted">${why}</p>${uid?`<p class="muted">Ton UID : <code style="user-select:all;word-break:break-all">${esc(uid)}</code></p>`:''}<a class="btn" href="#/accueil">Retour</a></div></div>`;
    return; }
  const groups={}; S.reports.forEach(r=>{ (groups[r.id]||(groups[r.id]=[])).push(r); });
  const rows=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length);
  // messages « Nous écrire » et comptes sanctionnés : chargés à l'ouverture de la page (au plus toutes les 20 secondes)
  if(!ADM.loading && Date.now()-ADM.at>20000){ ADM.loading=true;
    Promise.all([DB.loadContactMsgs(), DB.loadSanctions()]).then(([msgs])=>{ ADM.loading=false; ADM.at=Date.now(); if(msgs) ADM.msgs=msgs; ADM.err=!msgs;
      if(location.hash==='#/moderation'&&!(dlg&&dlg.open)){ const y=scrollY; viewAdmin(); scrollTo(0,y); } }); }
  const msgs=ADM.msgs||[], mOpen=msgs.filter(m=>m.status!=='done'), mDone=msgs.filter(m=>m.status==='done');
  const sanc=PLAYERS.filter(p=>S.banned.includes(p.id)||p.banned||p.hidden||suspendedP(p)), nSusp=sanc.filter(p=>suspendedP(p)&&!modState(p).ban).length, nHid=sanc.filter(p=>p.hidden&&!modState(p).ban).length;
  app.innerHTML=`<div class="wrap page"><div class="page-head"><div><h2>Modération</h2><p>${S.reports.filter(r=>r.status==='open').length} signalement(s) à traiter · ${mOpen.length} message(s) à lire · ${nSusp} suspendu(s) · ${S.banned.length} banni(s) · ${nHid} masqué(s)</p></div></div>
    <div class="admin-stats"><div><b>${PLAYERS.length}</b><span>profils</span></div><div><b>${PLAYERS.filter(p=>isOnline(p)).length}</b><span>en ligne</span></div><div><b>${S.requests.filter(r=>r.status==='accepted').length}</b><span>paires de mates</span></div><div><b>${allSquads().length}</b><span>sessions</span></div></div>
    <section class="panel adm-find"><h3>Suspendre, masquer ou bannir un joueur</h3><p class="muted">Cherche son pseudo, puis ouvre son profil : les boutons de modération sont en bas, sous « Signaler » et « Bloquer ».</p>
      <input class="sn-search" id="adm-q" type="search" placeholder="Pseudo du joueur" autocomplete="off" aria-label="Chercher un joueur"><div class="adm-res" id="adm-res"></div></section>
    <h3 class="on-world adm-h">Messages reçus${mOpen.length?` <span class="badge static">${mOpen.length}</span>`:''}</h3>
    ${!ADM.msgs&&ADM.loading?'<p class="muted on-world">Chargement des messages…</p>':ADM.err&&!ADM.msgs?'<p class="muted on-world">Messages indisponibles pour le moment.</p>'
      :mOpen.length?mOpen.map(admMsgRow).join(''):'<p class="muted on-world">Aucun message à lire.</p>'}
    ${mDone.length?`<details class="adm-done"><summary class="on-world">Messages déjà traités (${mDone.length})</summary>${mDone.map(admMsgRow).join('')}</details>`:''}
    <h3 class="on-world adm-h">Suspendus, bannis et masqués</h3>
    ${sanc.length?sanc.map(p=>{ const s=modState(p); return `<section class="panel admin-row adm-sanc"><div class="admin-head">${avatar(p,44)}<div><b><a href="#/joueur/${esc(p.id)}">${esc(p.name)}</a></b><span class="muted">${s.txt}</span></div>
        <div class="nact">${s.ban?`<button class="btn btn-sm" type="button" data-sanc="unban" data-id="${esc(p.id)}">Lever le ban</button>`:s.su?`<button class="btn btn-sm" type="button" data-sanc="unsusp" data-id="${esc(p.id)}">Lever la suspension</button>`:`<button class="btn btn-sm" type="button" data-sanc="hide" data-id="${esc(p.id)}">Rétablir le profil</button>`}</div></div></section>`; }).join('')
      :'<p class="muted on-world">Aucun compte suspendu, banni ou masqué.</p>'}
    <h3 class="on-world adm-h">Signalements</h3>
    ${AUTH_LIVE&&SHOP.api?`<section class="panel admin-row"><div class="admin-head"><div><b>Anciens pseudos d'autres réseaux</b><span class="muted">Efface de la base les pseudos Discord, WhatsApp, Snapchat… de tous les joueurs, même ceux qui ne se sont pas reconnectés. Les comptes, les profils et les achats ne sont pas touchés.</span></div>
      <div class="nact"><button class="btn btn-sm" id="purge-go">Tout effacer</button></div></div><p class="muted" id="purge-out" role="status"></p></section>`:''}
    ${rows.length?rows.map(([id,rs])=>{ const p=PLAYERS.find(x=>x.id===id); const hid=S.hidden.includes(id), ban=S.banned.includes(id), open=rs.filter(r=>r.status==='open').length;
      return `<section class="panel admin-row"><div class="admin-head">${p?avatar(p,44):''}<div><b>${p?esc(p.name)+modBadge(p):esc(id)}</b><span class="muted">${rs.length} signalement(s) · ${open} ouvert(s)${hid?' · <strong>masqué</strong>':''}${ban?' · <strong>banni</strong>':''}</span></div>
        <div class="nact">${ban?`<button class="btn btn-sm" data-unban="${esc(id)}">Lever le ban</button>`:`<button class="btn btn-sm ${hid?'':'btn-ghost'}" data-hide="${esc(id)}">${hid?'Rétablir':'Masquer'}</button><button class="btn btn-sm btn-danger" data-ban="${esc(id)}">Bannir</button>`}${open?`<button class="btn btn-sm" data-done="${esc(id)}">Marquer traité</button>`:''}</div></div>
        <ul class="admin-list">${rs.map(r=>`<li class="${r.status==='open'?'open':'done'}"><b>${esc(r.reason)}</b> ${r.details?'— '+esc(r.details):''} <small class="muted">${ago(r.at)} · ${r.status==='open'?'ouvert':'traité'}</small>
          ${r.messages&&r.messages.length?`<details class="rep-msgs"><summary>Derniers messages joints (${r.messages.length})</summary><div>${r.messages.map(m=>`<p class="${m.mine?'by-rep':'by-target'}"><b>${m.mine?'Signaleur':'Joueur signalé'} :</b> ${esc(m.text)}</p>`).join('')}</div>${r.by?`<button class="btn btn-sm btn-ghost" type="button" data-chat-by="${esc(r.by)}" data-chat-target="${esc(id)}">Voir la conversation complète</button><div class="rep-full"></div>`:''}</details>`:''}</li>`).join('')}</ul></section>`; }).join('')
      :'<div class="empty"><h3>Aucun signalement</h3><p class="muted">Tout est calme.</p></div>'}</div>`;
  const pg=document.getElementById('purge-go'); if(pg) pg.onclick=async()=>{ const out=document.getElementById('purge-out'); pg.disabled=true; out.textContent='Effacement en cours…'; let c=0,p=0;
    try{ if(!(DB.live&&DB.fns)) await DB.ready(); for(let k=0;k<25;k++){ const r=(await DB.fns.httpsCallable('purgeContacts')({})).data; c+=r.contacts||0; p+=r.profils||0; if(!r.encore) break; }
      out.textContent=`Terminé : ${c} fiche(s) de pseudos supprimée(s), ${p} profil(s) nettoyé(s).`; }
    catch(e){ out.textContent='Pas terminé : '+((e&&e.message)||'erreur')+' Réessaie plus tard.'; } pg.disabled=false; };
  const pOf=id=>PLAYERS.find(x=>x.id===id)||{};   // garde la fiche du joueur à jour (liste « Suspendus et bannis »)
  app.querySelectorAll('[data-hide]').forEach(b=>b.onclick=()=>{ const id=b.dataset.hide; S.hidden=S.hidden.includes(id)?S.hidden.filter(x=>x!==id):[...S.hidden,id]; pOf(id).hidden=S.hidden.includes(id); save(); DB.adminHide(id,S.hidden.includes(id)); viewAdmin(); });
  app.querySelectorAll('[data-ban]').forEach(b=>b.onclick=()=>modal(`<h3>Bannir ce compte ?</h3><p class="muted">Le profil disparaît pour tout le monde et le compte ne peut plus se connecter.</p><div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-danger" id="bk">Bannir</button></div>`,
    d=>d.querySelector('#bk').onclick=()=>{ const id=b.dataset.ban; S.banned.push(id); if(!S.hidden.includes(id)) S.hidden.push(id); Object.assign(pOf(id),{banned:true,hidden:true}); DB.closeReports(id); S.reports.forEach(r=>{ if(r.id===id) r.status='done'; }); save(); DB.adminBan(id,true); d.close(); viewAdmin(); }));
  app.querySelectorAll('[data-unban]').forEach(b=>b.onclick=()=>{ const id=b.dataset.unban; S.banned=S.banned.filter(x=>x!==id); S.hidden=S.hidden.filter(x=>x!==id); Object.assign(pOf(id),{banned:false,hidden:false}); save(); DB.adminBan(id,false); viewAdmin(); });
  app.querySelectorAll('[data-chat-by]').forEach(b=>b.onclick=async()=>{ const box=b.nextElementSibling; box.textContent='Chargement…'; const l=await DB.loadReportedChat(b.dataset.chatBy,b.dataset.chatTarget);
    box.innerHTML = l===null ? '<p class="muted">Conversation non accessible.</p>' : l.length ? l.map(m=>`<p class="${m.fromTarget?'by-target':'by-rep'}"><b>${m.fromTarget?'Joueur signalé':'Signaleur'} :</b> ${m.del?'<i>(supprimé par son auteur)</i> ':''}${esc(m.text)}${m.hist.length?`<br><small class="muted">Modifié. Avant : ${m.hist.map(h=>'« '+esc(h)+' »').join(', puis ')}</small>`:''}</p>`).join('') : '<p class="muted">Aucun message.</p>'; });
  app.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>{ DB.closeReports(b.dataset.done); S.reports.forEach(r=>{ if(r.id===b.dataset.done) r.status='done'; }); save(); viewAdmin(); });
  // chercher un joueur parmi ceux chargés (profils visibles, signalés, sanctionnés)
  const q=document.getElementById('adm-q'), res=document.getElementById('adm-res');
  if(q) q.oninput=()=>{ const t=q.value.trim().toLowerCase(); const hits=t.length<2?[]:PLAYERS.filter(p=>String(p.name||'').toLowerCase().includes(t)).slice(0,8);
    res.innerHTML=hits.map(p=>`<a class="adm-hit" href="#/joueur/${esc(p.id)}">${avatar(p,36)}<span><b>${esc(p.name)}${modBadge(p)}</b><small class="muted">${isMod(p)?'Modérateur':modState(p).txt}</small></span></a>`).join('')
      || (t.length<2?'':'<p class="muted">Aucun joueur à ce nom.</p>'); };
  app.querySelectorAll('[data-sanc]').forEach(b=>b.onclick=()=>{ const p=PLAYERS.find(x=>x.id===b.dataset.id); if(p) modAction(p,b.dataset.sanc,0,()=>{ if(location.hash==='#/moderation') viewAdmin(); }); });
  app.querySelectorAll('[data-cdone]').forEach(b=>b.onclick=async()=>{ b.disabled=true; const v=b.dataset.v==='1';
    if(await DB.setContactDone(b.dataset.cdone,v)){ const m=(ADM.msgs||[]).find(x=>x.id===b.dataset.cdone); if(m) m.status=v?'done':'open'; const y=scrollY; viewAdmin(); scrollTo(0,y); }
    else { b.disabled=false; toast("Ça n'a pas marché. Réessaie."); } });
}
function submitReport(id,reason,details){
  const rep={id,reason,details,at:Date.now(),status:'open',by:'me'}; S.reports.push(rep); DB.saveReport(rep);
  const n=S.reports.filter(r=>r.id===id&&r.status==='open').length;
  if(!S.hidden.includes(id)) S.hidden.push(id); // le profil signalé disparaît pour toi ; la modération décide pour les autres
  if(isAdmin() && n>=CONFIG.autoHideReports) DB.adminHide(id,true);
  save();
}

/* ---- Onboarding après la création du profil ---- */
function onboarding(){
  if(!S.onboard||!S.me) return; S.onboard=false; save();
  const top=ranked().slice(0,3);
  modal(`<h3>Bienvenue, ${esc(S.me.name)} 🎮</h3><p class="muted">${top.length?`Voici tes ${top.length} meilleurs matchs. Envoie-leur une demande de mate, ou rejoins un groupe.`:'Ton profil est prêt. Coopô vient d\'ouvrir : dès qu\'un joueur compatible s\'inscrit, il apparaîtra dans « Mes matchs ».'}</p>
    <div class="rows" style="margin-top:8px">${top.map(({p,c})=>`<a class="row" href="#/joueur/${p.id}" data-close>${avatar(p,56)}<div><b>${esc(p.name)}${modBadge(p)}</b><p>${esc(p.games.slice(0,3).join(', '))}</p></div>${ring(c.pct,'ring-sm')}</a>`).join('')}</div>
    <div class="dlg-actions"><a class="btn btn-ghost" href="#/groupes" data-close>Voir les groupes</a><button class="btn btn-ac" data-close>C'est parti</button></div>`);
}
