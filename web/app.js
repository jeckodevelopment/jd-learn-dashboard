"use strict";
/* Public read-only release dashboard. No GitHub credentials or writes. */
const DATA_ROOT="https://raw.githubusercontent.com/jeckodevelopment/jd-learn-dashboard/main/data/";
const SOURCE="https://github.com/jeckodevelopment/jd_learn";
const model={page:"home",snapshot:null,history:null,requirements:[],query:"",filter:"all",area:"all",theme:localStorage.getItem("jdlearn-prototype-theme")||"light",loading:false,origin:""};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const short=s=>String(s||"").trim().replace(/\s+/g," ").slice(0,180);
const idLink=r=>SOURCE+"/blob/main/docs/REQUIREMENTS_STATUS.csv";
const areaInfo={
 CAT:["Catalogo formativo","Ricerca, filtri e schede di corsi e percorsi.","Esperienza dello studente"],
 AUT:["Creazione e pubblicazione corsi","Editor, programmi, versioni e pubblicazione.","Gestione didattica"],
 LES:["Gestione lezioni","Contenuti, disponibilità e regole di completamento.","Gestione didattica"],
 VID:["Riproduzione video","Player, controlli e tracciamento della visione.","Esperienza dello studente"],
 ISC:["Iscrizioni","Ammissione, sospensione e gestione degli iscritti.","Esperienza dello studente"],
 STU:["Area dello studente","Aula, area personale e ripresa dei corsi.","Esperienza dello studente"],
 PRO:["Progressi e completamenti","Avanzamento, frequenza e completamento delle attività.","Esperienza dello studente"],
 QUI:["Quiz e valutazioni","Banca domande e verifiche del percorso formativo.","Gestione didattica"],
 ATT:["Attestazioni avanzate","Funzioni di attestazione oltre il perimetro essenziale.","Comunicazioni e attestati"],
 REP:["Report e riepiloghi","Elenchi degli iscritti e dati di consultazione.","Gestione didattica"],
 NOT:["Notifiche didattiche","Avvisi legati agli eventi e alle scadenze dei corsi.","Comunicazioni e attestati"],
 SIC:["Sicurezza di base","Protezione degli accessi, dei contenuti e degli allegati.","Qualità e sicurezza"],
 PRI:["Protezione della privacy","Consenso, conservazione dei dati e diritti degli utenti.","Qualità e sicurezza"],
 ACC:["Accessibilità","Tastiera, leggibilità, contrasto e compatibilità assistiva.","Qualità e sicurezza"],
 JOO:["Integrazione con Joomla","Installazione, aggiornamenti e funzionalità native.","Integrazioni e architettura"],
 CORE:["Funzioni native di Joomla","Categorie, utenti, ACL, lingua e servizi di piattaforma.","Integrazioni e architettura"],
 UI:["Personalizzazione dell'interfaccia","CSS, override, componenti riutilizzabili e identificativi.","Esperienza dello studente"],
 PERF:["Prestazioni e scalabilità","Tempi di risposta, carico e capacità del sistema.","Qualità e sicurezza"],
 ACL:["Permessi e autorizzazioni","Controlli di accesso e privilegi per ruolo e oggetto.","Qualità e sicurezza"],
 STA:["Scadenze e finestre temporali","Date, fusi orari, disponibilità e condizioni temporali.","Gestione didattica"],
 SCR:["Interfacce e navigazione","Schermate, percorsi utente e comportamento del frontend.","Esperienza dello studente"],
 LIFE:["Regole di conservazione","Dipendenze, archiviazione e protezione dei dati storici.","Gestione didattica"],
 CFG:["Configurazione del sistema","Opzioni, precedenze e regole di configurazione.","Integrazioni e architettura"],
 EDGE:["Regole e casi particolari","Accessi, prerequisiti, disponibilità e situazioni eccezionali.","Gestione didattica"],
 DAT:["Validazione dei dati","Controlli sui contenuti e coerenza delle informazioni.","Integrazioni e architettura"],
 REL:["Preparazione al rilascio","Criteri di accettazione e verifiche per la versione stabile.","Preparazione al rilascio"],
 PVD:["Provider video","Plugin di riproduzione e integrazione dei servizi video.","Integrazioni e architettura"],
 MAT:["Materiali didattici","Allegati dei corsi e delle lezioni e accesso controllato.","Gestione didattica"],
 HTTP:["Comunicazione frontend-server","Endpoint, richieste, risposte e controlli di accesso.","Integrazioni e architettura"],
 SECDEV:["Sviluppo sicuro","Architettura del codice e difese contro le vulnerabilità.","Qualità e sicurezza"],
 PBASE:["Plugin video inclusi","Distribuzione e configurazione dei provider supportati.","Integrazioni e architettura"],
 CERT:["Attestati PDF","Emissione, generazione, download e conservazione.","Comunicazioni e attestati"],
 MAIL:["Email e comunicazioni","Modelli, messaggi e gestione della coda di invio.","Comunicazioni e attestati"],
 DOC:["Documentazione e manuali","Guide di installazione, amministrazione e utilizzo.","Preparazione al rilascio"],
 SEC:["Verifiche di sicurezza","Audit delle vulnerabilità, protezione dei dati e hardening.","Qualità e sicurezza"],
 LCM:["Gestione del ciclo di vita","Archiviazione, cestinazione, ripristino e storico.","Gestione didattica"]
};
const areaNames=Object.fromEntries(Object.entries(areaInfo).map(([k,v])=>[k,v[0]]));
const areaGroups=["Gestione didattica","Esperienza dello studente","Comunicazioni e attestati","Integrazioni e architettura","Qualità e sicurezza","Preparazione al rilascio"];
const macroNames={courses:"Corsi e lezioni",catalogue:"Catalogo e frontend",learning_progress:"Progressi",video_materials:"Video e materiali",enrollment:"Iscrizioni",joomla_integrations:"Joomla e integrazioni",release_preparation:"Preparazione release",email_notifications:"Email e notifiche",certificates:"Attestati"};
const labels={home:"Control Center",features:"Funzionalità",development:"Sviluppo",testing:"Collaudi Joomla",release:"Release readiness"};
const stateValue=r=>(r.state||"").toLowerCase();
const completed=r=>stateValue(r)==="completata";
const accepted=r=>/^(accettata|superata|completata|verificata)$/i.test(r.manual||"");
const inScope=r=>r.scope==="1.0.0"||r.scope==="Misto";
const manualPending=r=>inScope(r)&&!accepted(r);
const qaCasesFor=id=>(model.snapshot?.manualQa?.cases||[]).filter(c=>(c.requirement_ids||[]).includes(id));
const qaResultLabels={passed:"Superato",failed:"Non superato",blocked:"Bloccato",not_run:"Non eseguito"};
const qaCaseHtml=c=>'<div class="qa-case"><div class="qa-case-head"><strong>'+esc(c.title||c.id)+'</strong>'+chip(qaResultLabels[c.result]||c.result,c.result==="passed"?"ok":"")+'</div><p class="desc">'+esc(c.scope==="partial"?"Verifica parziale":"Verifica completa")+' · '+esc(c.tested_at)+' · Build '+esc(c.build?.version||"non identificata")+'</p><p class="desc">'+esc(c.evidence_note||"")+'</p><div class="qa-case-links">'+(c.build?.artifact_url?href(c.build.artifact_url,"Artefatto ↗"):"")+(c.evidence_url?href(c.evidence_url,"Evidenza ↗"):"")+'</div></div>';

const incomplete=r=>inScope(r)&&!completed(r);
const nFormat=n=>Number(n||0).toLocaleString("it-IT");
const href=(u,title,cls="")=>'<a class="'+cls+'" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(title)+'</a>';
const chip=(v,cls="")=>'<span class="chip '+cls+'">'+esc(v)+'</span>';
const pct=x=>Number.isFinite(Number(x))?Number(x).toLocaleString("it-IT",{maximumFractionDigits:2})+"%":"—";
const formatDate=x=>x?new Date(x).toLocaleString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"Non disponibile";
const excerpt=(s,len=150)=>{s=short(s);return esc(s.length>len?s.slice(0,len-1)+"…":s)};
function saveTheme(){document.documentElement.dataset.theme=model.theme;localStorage.setItem("jdlearn-prototype-theme",model.theme)}
saveTheme();
async function fetchJson(name){
  const u=DATA_ROOT+name+"?nocache="+Date.now();
  let r=await fetch(u,{cache:"no-store"});
  if(!r.ok)throw new Error("GitHub HTTP "+r.status);
  return r.json();
}
async function load(){
  model.loading=true;$("sync-indicator").textContent="Sincronizzazione…";
  try{
    const [s,rows,history]=await Promise.all([fetchJson("snapshot.json"),fetchJson("requirements.json"),fetchJson("history.json").catch(()=>null)]);
    if(s.schema!==2||!s.generatedAt||!Array.isArray(rows)||!Array.isArray(s.prs)||!Array.isArray(s.issues)||rows.length!==s.counts.requirements)throw Error("Dataset incoerente");
    if(new Date(s.generatedAt).getTime()<=0||!Number.isFinite(new Date(s.generatedAt).getTime()))throw Error("Timestamp non valido");
    model.snapshot=s;model.requirements=rows;model.history=history&&history.schema===1&&Array.isArray(history.events)?history:null;model.origin="GitHub";
    const age=(Date.now()-new Date(s.generatedAt).getTime())/60000;
    const stale=age>90;
    $("sync-indicator").textContent=(stale?"⚠ Dati non aggiornati · ":"● Sincronizzato · ")+formatDate(s.generatedAt);
    $("side-sync").textContent=stale?"Dati non aggiornati":"Dati sincronizzati";
    render();
  }catch(error){
    if(!model.snapshot){
      $("main").innerHTML='<div class="notice">Impossibile caricare i dati verificati: '+esc(error.message)+'. Nessuna informazione viene simulata. '+href(DATA_ROOT+"snapshot.json","Apri sorgente")+'</div>';
    }
    $("sync-indicator").textContent="⚠ Errore sincronizzazione";
    $("side-sync").textContent="Aggiornamento non riuscito";
  }finally{model.loading=false}
}
function pageHeader(title,subtitle,aside=""){
return '<div class="page-head"><div><div class="eyebrow">JD LEARN · VERSIONE 1.0.0</div><h1>'+esc(title)+'</h1><p class="subtitle">'+esc(subtitle)+'</p></div>'+aside+'</div>';
}
function stat(value,label){return '<div class="card stat"><div class="number">'+esc(value)+'</div><div class="name">'+esc(label)+'</div></div>'}
function section(title,aside=""){return '<div class="section-title"><h2>'+esc(title)+'</h2><span class="aside">'+esc(aside)+'</span></div>'}
function task(title,description,tag,kind,actionId=null,n=1){
return '<article class="task"><div class="rank">'+esc(String(n).padStart(2,"0"))+'</div><div><h3>'+esc(title)+'</h3><p>'+excerpt(description,210)+'</p></div><div class="meta">'+chip(tag,kind)+(actionId?'<button data-detail="'+esc(actionId)+'">Dettaglio →</button>':'')+'</div></article>';
}
function requirementsByAction(){
 const issues=[...(model.snapshot.issues||[])].filter(i=>i.priority==="P0"||i.priority==="P1").sort((a,b)=>a.priority.localeCompare(b.priority)||(b.updated||"").localeCompare(a.updated||""));
 const open=[...(model.snapshot.prs||[])].filter(p=>p.status==="open"&&p.milestone==="1.0.0");
 const missing=model.requirements.filter(incomplete);
 const pending=model.requirements.filter(r=>completed(r)&&manualPending(r));
 const noRuntime=/^(nessuna lacuna runtime|nessun residuo implementativo|nessuna attivit[aà] implementativa|solo collaudo|resta solo.*collaud)/i;
 const development=missing.filter(r=>r.todo&&r.todo.trim()&&!noRuntime.test(r.todo.trim()));
 // "Misto" includes phase-2: keep behind requirements explicitly marked for 1.0.0.
 development.sort((a,b)=>(a.scope==="1.0.0"?0:1)-(b.scope==="1.0.0"?0:1)||
   (stateValue(a)==="non iniziata"?0:1)-(stateValue(b)==="non iniziata"?0:1)||a.id.localeCompare(b.id));
 const out=[];
 for(const i of issues)out.push({title:"Issue #"+i.number+" · "+i.title,desc:"Intervento prioritario "+i.priority+" segnalato nel repository JD Learn.",tag:i.priority,kind:i.priority.toLowerCase(),url:i.url,reason:"Problema aperto"});
 for(const p of open.slice(0,4))out.push({title:"PR #"+p.number+" · "+p.title,desc:"Attività di sviluppo già in corso, da seguire fino all’integrazione.",tag:"In corso",kind:"current",url:p.url,reason:"Pull request aperta"});
 for(const r of development)out.push({title:(areaNames[r.area]||r.area)+" · "+r.id,desc:short(r.todo),tag:r.scope==="1.0.0"?"1.0.0":"Misto",kind:"current",id:r.id,reason:r.scope==="1.0.0"?"Requisito obbligatorio incompleto":"Verificare quota 1.0.0"});
 return {out,issues,open,missing,pending,development};
}
function evolutionRows(limit=8){
 const h=model.history;
 if(!h)return '<div class="empty">Cronologia non ancora disponibile. La dashboard mostrerà i cambiamenti dopo l’avvio del registro.</div>';
 const rows=(h.events||[]).slice(0,limit);
 if(!rows.length)return '<div class="empty">Nessun cambiamento osservato dalla prima rilevazione del '+esc(formatDate(h.baselineAt))+'.</div>';
 return rows.map(e=>{
  let title="",detail="",link="";
  if(e.type==="requirement_changed"){
   title=(areaNames[(e.id||"").split("-")[0]]||"Requisito")+" · "+e.id;
   detail="Implementazione: "+e.from+" → "+e.to;
  }else if(e.type==="requirement_added"){
   title="Nuovo requisito · "+e.id;detail="Stato iniziale: "+e.to;
  }else if(e.type==="estimate_changed"){
   title="Stima di implementazione aggiornata";
   detail=pct(e.from)+" → "+pct(e.to)+(e.asOf?" · valutazione al "+e.asOf:"");
  }else if(e.type==="pr_merged"){
   title="PR #"+e.number+" integrata";detail=e.title;link=e.url;
  }else return "";
  return '<article class="evolution-row"><div class="evolution-main"><strong>'+esc(title)+'</strong><p>'+esc(detail)+'</p></div><div class="evolution-side">'+esc(formatDate(e.at))+(link?href(link,"PR ↗"):'')+'</div></article>';
 }).join("");
}
function home(){
const s=model.snapshot,action=requirementsByAction(),progress=Number(s.developmentProgress??s.progress);
const developmentBar=Number.isFinite(progress)?Math.max(0,Math.min(100,progress)):0;
const manualProgress=Number(s.manualAcceptanceProgress);
const manualBar=Number.isFinite(manualProgress)?Math.max(0,Math.min(100,manualProgress)):0;
const manualSummary=s.manualAcceptance||{};
const recent=[...s.prs].filter(p=>p.status==="merged").sort((a,b)=>(b.mergedAt||"").localeCompare(a.mergedAt||"")).slice(0,4);
const next=action.out.slice(0,5);
const completedReq=model.requirements.filter(r=>inScope(r)&&completed(r)).length;
const partialReq=model.requirements.filter(r=>inScope(r)&&stateValue(r)==="parziale").length;
const notStarted=model.requirements.filter(r=>inScope(r)&&stateValue(r)==="non iniziata").length;

return pageHeader("Control Center","Prossime decisioni, avanzamento documentato e verifiche residue per il rilascio stabile.")+
'<div class="release-grid progress-pair"><div class="card progress-card"><div><h2>Avanzamento dello sviluppo</h2><p>Minimo confermato dalle evidenze funzionali documentate.</p></div><div class="value">'+esc(pct(progress))+'</div><div class="meter"><span style="width:'+developmentBar+'%"></span></div><p class="secondary">Criteri non verificabili o non valutati non aumentano questa percentuale. '+href(s.links.evidence||s.links.matrix,"Apri evidenze ↗")+'</p></div><div class="card progress-card"><div><h2>Copertura dei collaudi manuali</h2><p>Requisiti con almeno un esito registrato · Joomla</p></div><div class="value">'+esc(pct(manualProgress))+'</div><div class="meter"><span style="width:'+manualBar+'%"></span></div><p class="secondary">'+nFormat(manualSummary.requirements_with_recorded_result||0)+' con esito · '+nFormat(manualSummary.requirements_not_run||0)+' non eseguiti · '+nFormat(manualSummary.requirements_passed||0)+' accettati. La CI non contribuisce.</p></div></div>'+
'<div class="stats">'+stat(completedReq,"Requisiti completati · 1.0.0/misto")+stat(partialReq,"Requisiti parziali")+stat(notStarted,"Non iniziati")+stat(action.development.length,"Residui implementativi identificati")+'</div>'+
section("Prossime azioni di sviluppo","P0/P1 → PR aperte → requisiti 1.0.0 → requisiti misti")+
'<div class="tasks">'+(next.length?next.map((a,i)=>a.url?'<article class="task"><div class="rank">'+String(i+1).padStart(2,"0")+'</div><div><h3>'+href(a.url,a.title)+'</h3><p>'+esc(a.desc)+'</p></div><div class="meta">'+chip(a.tag,a.kind)+'</div></article>':task(a.title,a.desc,a.tag,a.kind,a.id,i+1)).join(""):'<div class="card empty">Nessuna azione ricavabile dalle evidenze disponibili.</div>')+'</div>'+
'<p class="note" style="margin-top:9px">Le attività sono selezionate dalle fonti GitHub e dai residui dichiarati nella matrice. Le verifiche Joomla sono intenzionalmente escluse dalle prossime azioni di sviluppo.</p>'+
'<div class="notice">Le percentuali sono calcolate separatamente dalle evidenze ufficiali: sviluppo funzionale e collaudo manuale, che può essere completato anche in seguito. '+href(s.links.qaGuide||s.links.qaRegistry,"Come registrare i collaudi ↗")+'</div>'+
section("Cosa è cambiato","Differenze osservate fra sincronizzazioni")+
'<div class="card evolution-list">'+evolutionRows(5)+'</div>'+
section("Ultime PR integrate","Storico delle modifiche al codice")+

'<div class="twocol"><div class="card package-card">'+(recent.length?recent.map(p=>'<div class="timeline-item"><div><strong>'+href(p.url,"#"+p.number+" · "+p.title)+'</strong></div><span>'+esc(p.mergedAt?.slice(0,10)||"")+'</span></div>').join(""):'<p class="note">Nessuna PR integrata recente.</p>')+'</div>'+
'<aside class="card package-card"><div class="eyebrow">PACCHETTO INSTALLABILE</div><strong>'+esc(s.package?.name||"Non disponibile")+'</strong><p>Artefatto GitHub Actions: estrarre lo ZIP Joomla interno.</p><p style="margin:12px 0">'+esc(formatDate(s.package?.createdAt))+'</p>'+(s.package?.url?href(s.package.url,"Apri artefatto ↗","outline-link"):"")+
'<div style="margin-top:25px" class="eyebrow">DOCUMENTI</div><p style="margin:10px 0">'+href(s.links.plan,"Piano operativo 1.0.0 ↗")+'</p>'+href(s.links.matrix,"Matrice requisiti ↗")+'</aside></div>';
}
function toolbar({placeholder="Cerca codice o descrizione…",filters=[],count=null}={}){
return '<div class="toolbar"><input id="search" type="search" placeholder="'+esc(placeholder)+'" value="'+esc(model.query)+'" aria-label="Ricerca elementi"><select id="filter" aria-label="Filtra stato">'+filters.map(o=>'<option value="'+esc(o[0])+'" '+(model.filter===o[0]?"selected":"")+'>'+esc(o[1])+'</option>').join("")+'</select>'+(count===null?"":'<span class="counter">'+nFormat(count)+' elementi</span>')+'</div>';
}
function rowRequirement(r){
 return '<article class="data-row"><div><div class="id">'+esc(r.id)+' · '+esc(areaNames[r.area]||r.area)+'</div><strong>'+excerpt(r.criteria||"Descrizione non disponibile",170)+'</strong><p class="desc">Implementazione: '+esc(r.state)+' · Accettazione Joomla: '+esc(r.manual)+'</p></div><div class="row-meta">'+chip(r.scope)+chip(r.state,completed(r)?"ok":"")+ '<button data-detail="'+esc(r.id)+'">Apri →</button></div></article>';
}
function featureAreas(){
 const groups={};
 model.requirements.filter(r=>model.filter==="phase2"?r.scope==="Fase 2":inScope(r)).forEach(r=>{
  const key=r.area||"Altro";(groups[key]??=[]).push(r);
 });
 return Object.entries(groups).sort((a,b)=>(areaGroups.indexOf((areaInfo[a[0]]||[])[2])-areaGroups.indexOf((areaInfo[b[0]]||[])[2])) || a[0].localeCompare(b[0]));
}
function features(){
 const options=[["all","Perimetro 1.0.0"],["incomplete","Da completare"],["manual","Da collaudare"],["completed","Implementati"],["phase2","Solo fase 2"]];
 const rows=model.requirements.filter(r=>{
  if(model.filter==="phase2" ? r.scope!=="Fase 2" : !inScope(r))return false;
  if(model.area!=="all"&&r.area!==model.area)return false;
  if(model.filter==="incomplete"&&!incomplete(r))return false;
  if(model.filter==="manual"&&!manualPending(r))return false;
  if(model.filter==="completed"&&!completed(r))return false;
  return (r.id+" "+(areaNames[r.area]||"")+" "+r.criteria+" "+r.todo+" "+r.state).toLowerCase().includes(model.query.toLowerCase());
 });
 const areas=featureAreas();
 const cardsByGroup=areaGroups.map(groupName=>{
  const included=areas.filter(([key])=>(areaInfo[key]||[])[2]===groupName);
  if(!included.length)return "";
  const cards=included.map(([key,group])=>{
   const done=group.filter(completed).length;
   const percent=group.length?100*done/group.length:0;
   const info=areaInfo[key]||[key,"Requisiti del progetto.",groupName];
   return '<button class="card area-card" data-area="'+esc(key)+'"><div class="area-card-head"><h3>'+esc(info[0])+'</h3><span class="area-code">'+esc(key)+'</span></div>'+
    '<p class="area-description">'+esc(info[1])+'</p><div class="area-progress"><strong>'+pct(percent)+'</strong><span>'+done+' / '+group.length+' requisiti</span></div>'+
    '<div class="meter"><span style="width:'+percent+'%"></span></div>'+
    '<div class="area-statuses"><span>'+done+' completi</span><span>'+group.filter(r=>stateValue(r)==="parziale").length+' parziali</span><span>'+group.filter(r=>stateValue(r)==="non iniziata").length+' da iniziare</span></div></button>';
  }).join("");
  return '<section class="area-section"><div class="section-title"><h2>'+esc(groupName)+'</h2><span class="aside">'+included.length+' aree</span></div><div class="areas">'+cards+'</div></section>';
 }).join("");
 const unknown=areas.filter(([key])=>!areaInfo[key]);
 const fallback=unknown.length?'<div class="section-title"><h2>Altre aree</h2></div><div class="areas">'+unknown.map(([key,group])=>'<button class="card area-card" data-area="'+esc(key)+'"><h3>'+esc(key)+'</h3><p class="area-description">Area da classificare</p><strong>'+pct(100*group.filter(completed).length/group.length)+'</strong></button>').join("")+'</div>':"";
 const areaOptions='<div class="toolbar"><select id="area" aria-label="Seleziona area funzionale"><option value="all">Tutte le aree</option>'+areas.map(([k])=>'<option value="'+esc(k)+'" '+(model.area===k?"selected":"")+'>'+esc(areaNames[k]||k)+'</option>').join("")+'</select></div>';
 return pageHeader("Funzionalità","Aree descritte in linguaggio chiaro, con avanzamento e requisiti di dettaglio. Le sigle sono solo riferimenti tecnici.")+
 '<div class="notice">Le percentuali nelle schede indicano la quota di requisiti interamente implementati nell’area. Non equivalgono alla stima ponderata di avanzamento del progetto. I requisiti misti possono includere anche lavorazioni di fase 2.</div>'+
 cardsByGroup+fallback+
 section("Matrice requisiti","Implementazione e collaudo Joomla distinti")+areaOptions+toolbar({filters:options,count:rows.length})+
 '<div class="card data-list">'+(rows.length?rows.slice(0,120).map(rowRequirement).join(""):'<div class="empty">Nessun requisito trovato.</div>')+'</div>'+
 (rows.length>120?'<p class="note" style="margin-top:12px">Mostrati i primi 120 risultati: restringi la ricerca.</p>':"");
}
function development(){
 const s=model.snapshot,prs=s.prs||[],issues=s.issues||[];
 const opts=[["all","Tutte le attività"],["pr-open","PR aperte"],["pr-merged","PR integrate"],["issues","Issue aperte"]];
 const q=model.query.toLowerCase();
 const entries=[];
 if(["all","pr-open","pr-merged"].includes(model.filter))for(const p of prs){
   if(model.filter==="pr-open"&&p.status!=="open"||model.filter==="pr-merged"&&p.status!=="merged")continue;
   if(!("#"+p.number+" "+p.title).toLowerCase().includes(q))continue;
   entries.push({date:p.updated,html:'<div><div class="id">PR #'+p.number+'</div><strong>'+href(p.url,p.title)+'</strong><p class="desc">Milestone: '+esc(p.milestone||"Non assegnata")+'</p></div><div class="row-meta">'+chip(p.status==="merged"?"Integrata":p.status==="open"?"Aperta":"Chiusa",p.status==="merged"?"ok":"")+'</div>'});
 }
 if(["all","issues"].includes(model.filter))for(const i of issues){
   if(!("#"+i.number+" "+i.title).toLowerCase().includes(q))continue;
   entries.push({date:i.updated,html:'<div><div class="id">ISSUE #'+i.number+'</div><strong>'+href(i.url,i.title)+'</strong><p class="desc">Milestone: '+esc(i.milestone||"Non assegnata")+'</p></div><div class="row-meta">'+chip(i.priority,i.priority.toLowerCase())+'</div>'});
 }
 entries.sort((a,b)=>(b.date||"").localeCompare(a.date||""));
 return pageHeader("Sviluppo","PR, issue e cronologia dei cambiamenti osservati nelle sincronizzazioni.")+
 '<div class="stats">'+stat(s.counts.prOpen,"PR aperte")+stat(nFormat(prs.filter(p=>p.status==="merged").length),"PR integrate · finestra recente")+stat(issues.length,"Issue aperte")+stat(s.counts.p0+s.counts.p1,"Criticità P0 / P1")+'</div>'+
 '<div class="notice">I test automatici sono un requisito obbligatorio per l’integrazione delle PR, perciò non vengono usati come indicatore di avanzamento o come scheda di collaudo.</div>'+
 section("Evoluzione osservata","Stati dei requisiti, nuove PR integrate e variazioni della stima")+
 '<div class="card evolution-list">'+evolutionRows(30)+'</div>'+
 section("Attività GitHub","PR e issue recenti")+
 toolbar({placeholder:"Cerca una PR o issue…",filters:opts,count:entries.length})+
 '<div class="card data-list">'+(entries.length?entries.slice(0,100).map(e=>'<article class="data-row">'+e.html+'</article>').join(""):'<div class="empty">Nessuna attività corrispondente ai filtri.</div>')+'</div>';
}
function testing(){
 const scope=model.requirements.filter(inScope);
 const tracked=new Set((model.snapshot.manualQa?.cases||[]).flatMap(c=>c.requirement_ids||[]));
 const statusCount=k=>scope.filter(r=>(r.manual||"").trim().toLowerCase()===k).length;
 const approved=scope.filter(accepted),pending=scope.filter(manualPending);
 const notRun=statusCount("non eseguita"),partial=statusCount("parziale");
 const failed=scope.filter(r=>/non superat|fallit|respint|bloccato/i.test(r.manual||""));
 const options=[["all","Da collaudare"],["notrun","Non eseguiti"],["partial","Parziali"],["failed","Non superati"],["accepted","Accettati"],["evidence","Con evidenza versionata"],["noevidence","Senza evidenza versionata"]];
 let rows=model.filter==="accepted"?approved:model.filter==="notrun"?pending.filter(r=>(r.manual||"").trim().toLowerCase()==="non eseguita"):model.filter==="partial"?pending.filter(r=>(r.manual||"").trim().toLowerCase()==="parziale"):model.filter==="failed"?failed:model.filter==="evidence"?scope.filter(r=>tracked.has(r.id)):model.filter==="noevidence"?scope.filter(r=>!tracked.has(r.id)):pending;
 rows=rows.filter(r=>(r.id+" "+r.criteria+" "+r.tests+" "+r.manual).toLowerCase().includes(model.query.toLowerCase()));
 const source=model.snapshot.links.testbook||SOURCE+"/blob/main/docs/QA_TESTBOOK.md";
 return pageHeader("Collaudi Joomla","Accettazione funzionale manuale, distinta dal merge della PR e dall’esito della CI.")+
 '<div class="release-grid progress-pair"><div class="card progress-card"><div><h2>Copertura collaudo manuale</h2><p>Requisiti con un esito almeno parziale</p></div><div class="value">'+esc(pct(model.snapshot.manualAcceptanceProgress))+'</div><div class="meter"><span style="width:'+Math.max(0,Math.min(100,Number(model.snapshot.manualAcceptanceProgress)||0))+'%"></span></div><p class="secondary">Esiti completi e parziali registrati nella matrice; nessun esito CI viene contato.</p></div><div class="card progress-card"><div><h2>Sviluppo funzionale</h2><p>Misura separata dai collaudi</p></div><div class="value">'+esc(pct(model.snapshot.developmentProgress??model.snapshot.progress))+'</div><div class="meter"><span style="width:'+Math.max(0,Math.min(100,Number(model.snapshot.developmentProgress??model.snapshot.progress)||0))+'%"></span></div><p class="secondary">Minimo confermato dalle evidenze funzionali.</p></div></div>'+'<div class="stats">'+stat(pending.length,"Accettazioni pendenti")+stat(notRun,"Non eseguite")+stat(partial,"Parziali")+stat(approved.length,"Accettate")+'</div>'+
 '<div class="notice">Fonte: matrice requisiti · '+href(model.snapshot.links.matrix,"Stati di accettazione ↗")+' · '+href(source,"Piano e prove di collaudo ↗")+'. Le build sono visualizzate solo per gli scenari con evidenza strutturata; per gli altri non attribuiamo versioni. Registro versionato: '+href(model.snapshot.links.qaRegistry||source,"Evidenze con build ↗")+'. Un caso parziale superato non certifica il requisito. Nessuna modifica ai collaudi dalla dashboard.</div>'+
 toolbar({placeholder:"Cerca verifiche Joomla…",filters:options,count:rows.length})+
 '<div class="card data-list">'+(rows.length?rows.slice(0,120).map(r=>'<article class="data-row"><div><div class="id">'+esc(r.id)+' · '+esc(areaNames[r.area]||r.area)+'</div><strong>'+excerpt(r.tests||r.criteria,220)+'</strong><p class="desc">Implementazione: '+esc(r.state)+' · Accettazione: '+esc(r.manual)+'</p><p class="desc">'+(qaCasesFor(r.id).length?qaCasesFor(r.id).map(c=>'Verifica '+esc(c.scope==='partial'?'parziale':'completa')+' · '+esc(c.build?.version||'build non nota')+' · '+esc(c.tested_at)).join(' | '):'Nessuna evidenza versionata registrata')+'</p></div><div class="row-meta">'+chip(r.manual,accepted(r)?"ok":"")+'<button data-detail="'+esc(r.id)+'">Apri →</button></div></article>').join(""):'<div class="empty">Nessuna verifica corrispondente.</div>')+'</div>';
}
function release(){
 const s=model.snapshot;
 const core=model.requirements.filter(r=>r.scope==="1.0.0"),mixed=model.requirements.filter(r=>r.scope==="Misto");
 const missing=core.filter(incomplete),mixedMissing=mixed.filter(incomplete);
 const pending=core.filter(manualPending),mixedPending=mixed.filter(manualPending);
 const issues=(s.issues||[]).filter(i=>i.priority==="P0");
 const development=[
  {title:"Funzionalità della versione 1.0.0",status:missing.length?"Sviluppo incompleto":"Verifica del perimetro",detail:missing.length+" requisiti esclusivamente 1.0.0 non completamente implementati. "+mixedMissing.length+" requisiti misti richiedono verifica della parte effettivamente obbligatoria.",link:s.links.matrix,label:"Apri matrice"},
  {title:"Criticità bloccanti",status:issues.length?"Intervento richiesto":"Nessuna P0 aperta",detail:issues.length?issues.length+" issue con priorità P0 ancora aperte.":"Nessuna P0 aperta nel repository, senza presumere che tutti i problemi possibili siano stati rilevati.",link:SOURCE+"/issues?q=is%3Aissue+is%3Aopen+label%3AP0",label:"Apri issue"},
  {title:"Coerenza del piano e documentazione",status:"Da verificare",detail:"Confrontare piano, matrice e stato del codice; gli aggiornamenti documentali seguono le integrazioni e non sostituiscono le funzionalità.",link:s.links.plan,label:"Apri piano"},
 ];
 const later=[
  {title:"Accettazione manuale Joomla",status:"Fase successiva",detail:pending.length+" requisiti esclusivamente 1.0.0 senza accettazione completa, più "+mixedPending.length+" misti da valutare. Nessun collaudo viene richiesto ora.",link:s.links.testbook,label:"Testbook"},
  {title:"Installazione, upgrade e ripristino",status:"Fase successiva",detail:"Prove finali sulla build candidata, preservando i dati. L'esito non viene dedotto dai controlli delle PR.",link:s.links.testbook,label:"Piano prove"},
  {title:"Sicurezza, privacy e accessibilità",status:"Fase successiva",detail:"Accettare i gate di rilascio quando saranno disponibili le evidenze richieste.",link:s.links.securityGate,label:"Gate sicurezza"},
  {title:"Pacchetto stabile",status:"Fase successiva",detail:"Ultimo artefatto di sviluppo: "+(s.package?.name||"non disponibile")+". Non è una release 1.0.0 accettata.",link:s.package?.url,label:"Artefatto disponibile"},
 ];
 const renderGates=items=>'<div class="release-grid">'+items.map(g=>'<article class="card gate"><div class="gate-top"><h3>'+esc(g.title)+'</h3>'+chip(g.status,g.status==="Intervento richiesto"||g.status==="Sviluppo incompleto"?"p1":"")+'</div><p>'+esc(g.detail)+'</p>'+(g.link?href(g.link,g.label+" ↗"):"")+'</article>').join("")+'</div>';
 return pageHeader("Release readiness","Separazione esplicita fra ciò che dobbiamo ancora sviluppare e le verifiche della fase conclusiva.")+
 '<div class="notice"><strong>Adesso: completamento funzionale e correzioni bloccanti.</strong> I collaudi e i gate di accettazione sono visibili per pianificazione, non come attività da eseguire ora.</div>'+
 section("Sviluppo ancora necessario","Interventi da considerare nel percorso 1.0.0")+renderGates(development)+
 section("Verifiche prima del rilascio","Fase successiva · nessun test richiesto adesso")+renderGates(later)+
 '<p class="note" style="margin-top:13px">Gli stati riflettono dati documentati. Nessun gate è dichiarato superato in assenza di conferma; i requisiti misti non sono considerati automaticamente blocchi della release.</p>';
}
function showDetail(id){
 const r=model.requirements.find(x=>x.id===id);if(!r)return;
 const block=(t,v)=>'<div class="detail-section"><h3>'+esc(t)+'</h3><p>'+esc(v||"Non documentato")+'</p></div>';
 $("detail-body").innerHTML='<div class="eyebrow">REQUISITO · '+esc(r.area)+'</div><h2>'+esc(r.id)+'</h2>'+chip(r.state,completed(r)?"ok":"")+ " "+chip(r.manual,accepted(r)?"ok":"")+
 block("Criteri funzionali",r.criteria)+block("Residui implementativi",r.todo)+block("Comportamenti da collaudare",r.tests)+
 block("Perimetro",r.scope)+block("Accettazione Joomla (matrice)",r.manual)+
 '<div class="detail-section"><h3>Evidenze con build identificata</h3>'+(qaCasesFor(r.id).length?qaCasesFor(r.id).map(qaCaseHtml).join(""):'<p>Nessuna verifica versionata registrata; consultare il testbook per lo storico.</p>')+'</div>'+
 block("PR collegate",r.prs)+
 '<div class="detail-section">'+href(idLink(r),"Apri matrice originale ↗","outline-link")+'</div>';
 $("detail-mask").hidden=false;
 $("detail-close").focus();
}
function closeDetail(){$("detail-mask").hidden=true}
function render(){
 if(!model.snapshot)return;
 $("breadcrumb").textContent=labels[model.page];
 document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===model.page));
 const renderers={home,features,development,testing,release};
 $("main").innerHTML=renderers[model.page]();
}
function changePage(page){model.page=page;model.filter="all";model.area="all";model.query="";render();window.scrollTo({top:0,behavior:"instant"})}
document.addEventListener("click",event=>{
 const b=event.target.closest("[data-page]");if(b){changePage(b.dataset.page);return}
 const a=event.target.closest("[data-area]");if(a){model.area=a.dataset.area;model.filter="all";model.query="";render();document.querySelector("#area")?.scrollIntoView({block:"center",behavior:"smooth"});return}
 const d=event.target.closest("[data-detail]");if(d){showDetail(d.dataset.detail);return}
 if(event.target.closest("#detail-close,#mask-close")){closeDetail();return}
});
document.addEventListener("input",event=>{if(event.target.id==="search"){const start=event.target.selectionStart;model.query=event.target.value;render();const f=$("search");f?.focus();f?.setSelectionRange(start,start)}});
document.addEventListener("change",event=>{if(event.target.id==="filter"){model.filter=event.target.value;render()}if(event.target.id==="area"){model.area=event.target.value;render()}});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeDetail()});
$("refresh").addEventListener("click",load);
$("theme").addEventListener("click",()=>{model.theme=model.theme==="light"?"dark":"light";saveTheme()});
load();