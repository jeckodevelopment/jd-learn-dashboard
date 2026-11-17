"use strict";
const REMOTE = "https://raw.githubusercontent.com/jeckodevelopment/jd-learn-dashboard/main/data/";
const $ = id => document.getElementById(id);
const state = {snapshot:null, requirements:[], tab:"priorities"};
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const link = (url,label) => /^https:\/\/github\.com\/jeckodevelopment\//.test(url||"") ? '<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(label)+'</a>' : esc(label);
const badge = (value) => '<span class="pill '+(value==="P0"?"hot":value==="P1"?"warn":"")+'">'+esc(value)+'</span>';
const entry = (name,detail,url,tag,extra="") => '<article class="entry"><div><h3>'+link(url,name)+'</h3><p>'+esc(detail)+'</p></div><div class="right">'+badge(tag)+(extra?'<p>'+esc(extra)+'</p>':"")+'</div></article>';
const metric = (label,value,note) => '<div class="metric"><label>'+esc(label)+'</label><strong>'+esc(value)+'</strong><small>'+esc(note)+'</small></div>';
async function loadJSON(file){
  const url=REMOTE+file+"?t="+Date.now();
  try {let r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);return await r.json();}
  catch(e){let r=await fetch("./data/"+file+"?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw e;return await r.json();}
}
async function refresh(){
  $("health").textContent="Sincronizzazione…";
  try{
    const [snapshot,requirements]=await Promise.all([loadJSON("snapshot.json"),loadJSON("requirements.json")]);
    if(snapshot.schema!==2||!snapshot.generatedAt||!Array.isArray(requirements))throw Error("Formato dati non valido");
    state.snapshot=snapshot;state.requirements=requirements;
    const updated=new Date(snapshot.generatedAt), age=(Date.now()-updated.getTime())/60000;
    $("asof").textContent="Dati generati: "+updated.toLocaleString("it-IT",{dateStyle:"short",timeStyle:"short"})+" · UTC nella sorgente";
    $("health").textContent=age>90?"⚠ Dati non aggiornati":"● Dati sincronizzati";
    $("health").style.color=age>90?"#f8c37c":"#a4e5c0";
    $("metrics").innerHTML=[
      metric("Avanzamento",snapshot.progress===null?"—":snapshot.progress+"%","Stima documentata"),
      metric("PR aperte",snapshot.counts.prOpen,"Da GitHub"),
      metric("Issue P0",snapshot.counts.p0,"Priorità massima"),
      metric("Issue P1",snapshot.counts.p1,"Priorità alta"),
      metric("Requisiti",snapshot.counts.requirements,"Matrice 1.0.0")
    ].join("");
    const pkg=snapshot.package;
    if(pkg){
      const panel=document.createElement("div");
      panel.className="package";
      panel.innerHTML='<span>Pacchetto installabile più recente</span> <strong>'+link(pkg.url,pkg.name)+'</strong><small>Artefatto GitHub Actions: estrarre lo ZIP Joomla interno · '+esc(pkg.createdAt?.slice(0,10))+'</small>';
      let old=document.querySelector(".package"); if(old)old.remove();
      $("metrics").after(panel);
    }
    populate();render();
  }catch(e){$("health").textContent="⚠ Errore sincronizzazione";$("asof").textContent="Dati non disponibili: "+e.message;$("view").innerHTML='<div class="empty">Impossibile recuperare dati verificati dalla repository. Consultare GitHub o riprovare.</div>';}
}
function populate(){
  const options=state.tab==="priorities"?["Tutte","P0","P1","P2","Non assegnata"]:state.tab==="prs"?["Tutte","open","merged","closed"]:state.tab==="requirements"?["Tutte",...new Set(state.requirements.map(r=>r.area))]:["Tutte"];
  $("filter").innerHTML=options.map(x=>'<option>'+esc(x)+'</option>').join("");
}
function render(){
  if(!state.snapshot)return;
  const d=state.snapshot, q=$("search").value.toLowerCase(),f=$("filter").value;
  let html="";
  if(state.tab==="priorities"){
    const list=d.issues.filter(i=>(!f||f==="Tutte"||i.priority===f)&&((i.title+" "+i.number+" "+i.labels.join(" ")).toLowerCase().includes(q)));
    list.sort((a,b)=>(["P0","P1","P2"].indexOf(a.priority)+1||9)-(["P0","P1","P2"].indexOf(b.priority)+1||9));
    html=list.map(i=>entry("#"+i.number+" · "+i.title,"Issue · "+(i.milestone||"Milestone non assegnata"),i.url,i.priority,i.updated?.slice(0,10))).join("");
  }else if(state.tab==="prs"){
    const list=d.prs.filter(p=>(!f||f==="Tutte"||p.status===f)&&((p.title+" "+p.number).toLowerCase().includes(q)));
    html=list.map(p=>entry("#"+p.number+" · "+p.title,"CI: "+(p.ci.conclusion||p.ci.status||"non disponibile")+" · "+(p.milestone||"Nessuna milestone"),p.url,p.status,p.updated?.slice(0,10))).join("");
  }else if(state.tab==="requirements"){
    const list=state.requirements.filter(r=>(!f||f==="Tutte"||r.area===f)&&((r.id+" "+r.criteria+" "+r.state).toLowerCase().includes(q)));
    html=list.map(r=>entry(r.id+" · "+(r.criteria||"Requisito"),"Implementazione: "+r.state+" · Collaudo: "+r.manual,d.links.matrix,r.area,r.scope)).join("");
  }else{
    html='<div class="areas">'+Object.entries(d.macroareas||{}).map(([k,v])=>'<div class="area"><p>'+esc(k)+'</p><strong>'+esc(v)+'%</strong><div class="bar"><span style="width:'+Math.max(0,Math.min(100,Number(v)||0))+'%"></span></div></div>').join("")+'</div>';
  }
  $("view").innerHTML=html||'<div class="empty">Nessun elemento corrisponde ai filtri selezionati.</div>';
}
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll("[data-tab]").forEach(v=>v.classList.toggle("active",v===b));
  state.tab=b.dataset.tab;populate();render();
}));
$("search").addEventListener("input",render);
$("filter").addEventListener("change",render);
$("reload").addEventListener("click",refresh);
refresh();
