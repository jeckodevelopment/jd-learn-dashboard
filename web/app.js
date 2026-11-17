"use strict";
/* Public read-only release dashboard. No GitHub credentials or writes. */
const DATA_ROOT="https://raw.githubusercontent.com/jeckodevelopment/jd-learn-dashboard/main/data/";
const SOURCE="https://github.com/jeckodevelopment/jd_learn";
const model={page:"home",snapshot:null,requirements:[],query:"",filter:"all",area:"all",theme:localStorage.getItem("jdlearn-prototype-theme")||"light",loading:false,origin:""};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const short=s=>String(s||"").trim().replace(/\s+/g," ").slice(0,180);
const idLink=r=>SOURCE+"/blob/main/docs/REQUIREMENTS_STATUS.csv";
const areaNames={CAT:"Catalogo",FE:"Frontend",VID:"Video",MAT:"Materiali",COURSE:"Corsi",CRS:"Corsi",LCM:"Ciclo di vita",MAIL:"Email",CERT:"Attestati",ENR:"Iscrizioni",PRG:"Progressi",SEC:"Sicurezza",REL:"Rilascio",DOC:"Documentazione",JML:"Joomla",INT:"Integrazioni"};
const macroNames={courses:"Corsi e lezioni",catalogue:"Catalogo e frontend",learning_progress:"Progressi",video_materials:"Video e materiali",enrollment:"Iscrizioni",joomla_integrations:"Joomla e integrazioni",release_preparation:"Preparazione release",email_notifications:"Email e notifiche",certificates:"Attestati"};
const labels={home:"Control Center",features:"Funzionalità",development:"Sviluppo",testing:"Collaudi Joomla",release:"Release readiness"};
const stateValue=r=>(r.state||"").toLowerCase();
const completed=r=>stateValue(r)==="completata";
const accepted=r=>/^(accettata|superata|completata|verificata)$/i.test(r.manual||"");
const inScope=r=>r.scope==="1.0.0"||r.scope==="Misto";
const manualPending=r=>inScope(r)&&!accepted(r);
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
    const [s,rows]=await Promise.all([fetchJson("snapshot.json"),fetchJson("requirements.json")]);
    if(s.schema!==2||!s.generatedAt||!Array.isArray(rows)||!Array.isArray(s.prs)||!Array.isArray(s.issues)||rows.length!==s.counts.requirements)throw Error("Dataset incoerente");
    if(new Date(s.generatedAt).getTime()<=0||!Number.isFinite(new Date(s.generatedAt).getTime()))throw Error("Timestamp non valido");
    model.snapshot=s;model.requirements=rows;model.origin="GitHub";
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
 const issues=(model.snapshot.issues||[]).filter(i=>i.priority==="P0"||i.priority==="P1").sort((a,b)=>a.priority.localeCompare(b.priority));
 const missing=model.requirements.filter(incomplete);
 const pending=model.requirements.filter(r=>completed(r)&&manualPending(r));
 const out=[];
 for(const i of issues.slice(0,4))out.push({title:"Issue #"+i.number+" · "+i.title,desc:"Problema prioritario rilevato su GitHub",tag:i.priority,kind:i.priority.toLowerCase(),url:i.url});
 for(const r of missing.slice(0,8))out.push({title:r.id+" · "+(r.criteria||"Requisito da completare"),desc:r.todo||"Implementazione non ancora completa secondo la matrice",tag:"Sviluppo",kind:"current",id:r.id});
 for(const r of pending.slice(0,8))out.push({title:r.id+" · Collaudo Joomla",desc:r.tests||"Accettazione manuale ancora da completare",tag:"Collaudo",kind:"",id:r.id});
 return {out,missing,pending,issues};
}
function home(){
const s=model.snapshot,action=requirementsByAction();
const progress=Number(s.progress);
const bar=Number.isFinite(progress)?Math.max(0,Math.min(100,progress)):0;
const recent=[...s.prs].filter(p=>p.status==="merged").sort((a,b)=>(b.mergedAt||"").localeCompare(a.mergedAt||"")).slice(0,4);
const next=action.out.slice(0,5);
return pageHeader("Control Center","La situazione del rilascio, le attività residue e i prossimi interventi. Nessun indicatore superfluo.")+
'<div class="card progress-card"><div><h2>Avanzamento funzionale documentato</h2><p>Fonte: matrice e stima ufficiale di implementazione</p></div><div class="value">'+esc(pct(s.progress))+'</div><div class="meter"><span style="width:'+bar+'%"></span></div><p class="secondary">Non rappresenta la percentuale di collaudi conclusi.</p></div>'+
'<div class="stats">'+stat(nFormat(action.missing.length),"Requisiti incompleti · perimetro 1.0.0/misto")+stat(nFormat(action.pending.length),"Collaudi pendenti · implementati")+stat(nFormat(s.counts.prOpen),"Pull request aperte")+stat(nFormat(s.counts.p0+s.counts.p1),"Issue P0 e P1 aperte")+'</div>'+
section("Prossime azioni","Priorità: criticità → sviluppo → collaudi")+
'<div class="tasks">'+(next.length?next.map((a,i)=>a.url?'<article class="task"><div class="rank">'+String(i+1).padStart(2,"0")+'</div><div><h3>'+href(a.url,a.title)+'</h3><p>'+esc(a.desc)+'</p></div><div class="meta">'+chip(a.tag,a.kind)+'</div></article>':task(a.title,a.desc,a.tag,a.kind,a.id,i+1)).join(""):'<div class="card empty">Nessuna attività prioritaria deducibile dai dati correnti.</div>')+'</div>'+
section("Ultimi sviluppi","Cronologia sintetica delle PR integrate")+
'<div class="twocol"><div class="card package-card">'+(recent.length?recent.map(p=>'<div class="timeline-item"><div><strong>'+href(p.url,"#"+p.number+" · "+p.title)+'</strong></div><span>'+esc(p.mergedAt?.slice(0,10)||"")+'</span></div>').join(""):'<p class="note">Nessuna PR integrata recente.</p>')+'</div>'+
'<aside class="card package-card"><div class="eyebrow">PACCHETTO INSTALLABILE</div><strong>'+esc(s.package?.name||"Non disponibile")+'</strong><p>Artefatto generato da GitHub Actions. Scaricare l’archivio e utilizzare lo ZIP Joomla interno.</p><p style="margin:12px 0">'+esc(formatDate(s.package?.createdAt))+'</p>'+(s.package?.url?href(s.package.url,"Apri artefatto ↗","outline-link"):"")+
'<div style="margin-top:27px" class="eyebrow">DOCUMENTI DI RIFERIMENTO</div><p style="margin:10px 0">'+href(s.links.plan,"Piano operativo 1.0.0 ↗")+'</p>'+href(s.links.matrix,"Matrice requisiti ↗")+'</aside></div>';
}
function toolbar({placeholder="Cerca codice o descrizione…",filters=[],count=null}={}){
return '<div class="toolbar"><input id="search" type="search" placeholder="'+esc(placeholder)+'" value="'+esc(model.query)+'" aria-label="Ricerca elementi"><select id="filter" aria-label="Filtra stato">'+filters.map(o=>'<option value="'+esc(o[0])+'" '+(model.filter===o[0]?"selected":"")+'>'+esc(o[1])+'</option>').join("")+'</select>'+(count===null?"":'<span class="counter">'+nFormat(count)+' elementi</span>')+'</div>';
}
function rowRequirement(r){
 return '<article class="data-row"><div><div class="id">'+esc(r.id)+' · '+esc(areaNames[r.area]||r.area)+'</div><strong>'+excerpt(r.criteria||"Descrizione non disponibile",170)+'</strong><p class="desc">Implementazione: '+esc(r.state)+' · Accettazione Joomla: '+esc(r.manual)+'</p></div><div class="row-meta">'+chip(r.scope)+chip(r.state,completed(r)?"ok":"")+ '<button data-detail="'+esc(r.id)+'">Apri →</button></div></article>';
}
function featureAreas(){
 const groups={};
 model.requirements.forEach(r=>{let k=r.area||"Altro";(groups[k]??=[]).push(r)});
 return Object.entries(groups).sort((a,b)=>b[1].length-a[1].length);
}
function features(){
 const options=[["all","Tutti gli stati"],["incomplete","Da completare"],["manual","Da collaudare"],["completed","Implementati"],["phase2","Fase 2"]];
 let rows=model.requirements.filter(r=>{
  if(model.area!=="all"&&r.area!==model.area)return false;
  if(model.filter==="incomplete"&&!incomplete(r))return false;
  if(model.filter==="manual"&&!manualPending(r))return false;
  if(model.filter==="completed"&&!completed(r))return false;
  if(model.filter==="phase2"&&r.scope!=="Fase 2")return false;
  return (r.id+" "+r.criteria+" "+r.todo+" "+r.state).toLowerCase().includes(model.query.toLowerCase())
 });
 const areas=featureAreas();
 const areaCards='<div class="areas">'+areas.map(([key,group])=>{
  const done=group.filter(completed).length,percent=100*done/group.length;
  return '<button class="card area-card" data-area="'+esc(key)+'"><h3>'+esc(areaNames[key]||key)+'</h3><div class="percent">'+pct(percent)+'</div><div class="meter"><span style="width:'+percent+'%"></span></div><p class="meta">'+done+' implementati su '+group.length+' requisiti · '+group.filter(incomplete).length+' incompleti nel perimetro</p></button>'
 }).join("")+'</div>';
 const areaOptions='<div class="toolbar"><select id="area" aria-label="Seleziona macroarea"><option value="all">Tutte le aree</option>'+areas.map(([k])=>'<option value="'+esc(k)+'" '+(model.area===k?"selected":"")+'>'+esc(areaNames[k]||k)+'</option>').join("")+'</select></div>';
 return pageHeader("Funzionalità","Dalla macroarea al singolo requisito. Percentuali delle schede basate sul conteggio dei requisiti implementati, non sulla stima ponderata.")+
 section("Aree funzionali","Seleziona un’area per filtrare i requisiti")+areaCards+
 section("Matrice requisiti","Stato implementativo e collaudo distinti")+areaOptions+toolbar({filters:options,count:rows.length})+
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
 return pageHeader("Sviluppo","PR e issue sono strumenti di lavoro, non unità di misura del completamento funzionale.")+
 '<div class="stats">'+stat(s.counts.prOpen,"PR aperte")+stat(nFormat(prs.filter(p=>p.status==="merged").length),"PR integrate · finestra recente")+stat(issues.length,"Issue aperte")+stat(s.counts.p0+s.counts.p1,"Criticità P0 / P1")+'</div>'+
 '<div class="notice">I test automatici sono un requisito obbligatorio per l’integrazione delle PR, perciò non vengono usati come indicatore di avanzamento o come scheda di collaudo.</div>'+
 toolbar({placeholder:"Cerca una PR o issue…",filters:opts,count:entries.length})+
 '<div class="card data-list">'+(entries.length?entries.slice(0,100).map(e=>'<article class="data-row">'+e.html+'</article>').join(""):'<div class="empty">Nessuna attività corrispondente ai filtri.</div>')+'</div>';
}
function testing(){
 const inRelease=model.requirements.filter(inScope),pending=inRelease.filter(manualPending),approved=inRelease.filter(accepted),unperformed=pending.filter(r=>(r.manual||"").toLowerCase()==="non eseguita");
 const options=[["all","Da collaudare"],["notrun","Non eseguiti"],["partial","Parziali"],["accepted","Accettati"]];
 let rows=model.filter==="accepted"?approved:model.filter==="notrun"?unperformed:model.filter==="partial"?pending.filter(r=>(r.manual||"").toLowerCase()==="parziale"):pending;
 rows=rows.filter(r=>(r.id+" "+r.criteria+" "+r.tests+" "+r.manual).toLowerCase().includes(model.query.toLowerCase()));
 return pageHeader("Collaudi Joomla","Qui compaiono esclusivamente le verifiche manuali sul sito di prova. Una PR integrata non equivale a un requisito accettato.")+
 '<div class="stats">'+stat(pending.length,"Accettazioni pendenti")+stat(unperformed.length,"Non eseguite")+stat(pending.length-unperformed.length,"Parziali o altri stati")+stat(approved.length,"Accettazioni completate")+'</div>'+
 '<div class="notice">Gli esiti sono letti dalla colonna «Accettazione Joomla» della matrice ufficiale. Non è possibile modificare i collaudi dalla dashboard pubblica.</div>'+
 toolbar({placeholder:"Cerca verifiche Joomla…",filters:options,count:rows.length})+
 '<div class="card data-list">'+(rows.length?rows.slice(0,120).map(r=>'<article class="data-row"><div><div class="id">'+esc(r.id)+'</div><strong>'+excerpt(r.tests||r.criteria,220)+'</strong><p class="desc">Implementazione: '+esc(r.state)+' · Accettazione: '+esc(r.manual)+'</p></div><div class="row-meta">'+chip(r.manual,accepted(r)?"ok":"")+'<button data-detail="'+esc(r.id)+'">Apri →</button></div></article>').join(""):'<div class="empty">Nessuna verifica corrispondente.</div>')+'</div>';
}
function release(){
 const s=model.snapshot,scope=model.requirements.filter(inScope),pending=scope.filter(incomplete),manual=scope.filter(manualPending);
 const gates=[
  ["Completezza funzionale",pending.length===0?"Soddisfatto":"Non soddisfatto",pending.length+" requisiti nel perimetro non risultano implementati completamente."],
  ["Accettazione Joomla",manual.length===0?"Soddisfatto":"Non soddisfatto",manual.length+" requisiti nel perimetro non risultano accettati."],
  ["Regressioni P0",s.counts.p0===0?"Nessuna P0 aperta":"Criticità rilevate","Stato delle issue etichettate P0; l’assenza di issue non prova l’assenza di regressioni."],
  ["Installazione e upgrade","Da verificare","Serve evidenza documentale di installazione e aggiornamento sulla versione candidata."],
  ["Sicurezza e privacy","Da verificare","Verificare il gate ufficiale di sicurezza e privacy prima del rilascio."],
  ["Documentazione","Da verificare","Verificare completezza, coerenza e aggiornamento dei documenti richiesti."],
  ["Pacchetto finale","Da verificare","Ultimo artefatto disponibile: "+(s.package?.name||"non disponibile")+". Non equivale ad artefatto di release stabile."]
 ];
 return pageHeader("Release readiness","Una checklist verificabile per la versione stabile. Nessuna percentuale inventata e nessun gate promosso automaticamente senza evidenze.")+
 '<div class="notice">Il controllo automatico delle PR è una condizione obbligatoria del processo di merge, non un indicatore della readiness. I gate non documentati restano «Da verificare».</div>'+
 '<div class="release-grid">'+gates.map(([t,status,desc])=>'<article class="card gate"><h3>'+esc(t)+'</h3><p>'+esc(desc)+'</p><div class="tag">'+esc(status)+'</div></article>').join("")+'</div>'+
 section("Documenti per il rilascio")+
 '<div class="card package-card"><p>'+href(s.links.plan,"Piano operativo delle PR 1.0.0 ↗")+'</p><p style="margin-top:9px">'+href(s.links.matrix,"Matrice ufficiale dei requisiti ↗")+'</p><p style="margin-top:9px">'+href(SOURCE+"/blob/main/docs/SECURITY_PRIVACY_RELEASE_GATE_1.0.0.md","Gate sicurezza e privacy ↗")+'</p></div>';
}
function showDetail(id){
 const r=model.requirements.find(x=>x.id===id);if(!r)return;
 const block=(t,v)=>'<div class="detail-section"><h3>'+esc(t)+'</h3><p>'+esc(v||"Non documentato")+'</p></div>';
 $("detail-body").innerHTML='<div class="eyebrow">REQUISITO · '+esc(r.area)+'</div><h2>'+esc(r.id)+'</h2>'+chip(r.state,completed(r)?"ok":"")+ " "+chip(r.manual,accepted(r)?"ok":"")+
 block("Criteri funzionali",r.criteria)+block("Residui implementativi",r.todo)+block("Comportamenti da collaudare",r.tests)+
 block("Perimetro",r.scope)+block("PR collegate",r.prs)+
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