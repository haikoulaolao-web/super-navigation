let resources=[];

const normalize=s=>(s||"").toLowerCase().replace(/\s+/g,"");

function card(r){
  const isKing=r.status==="KING";
  const badge=isKing?"👑 KING":r.status==="CHALLENGER"?"⚔️ CHALLENGER":"⭐ PRIME";
  return `<article class="card ${isKing?'king':''}">
    <div class="rank">${badge}</div>
    <h3>${r.title}</h3>
    <div class="name">${r.name}</div>
    <div class="score">KING SCORE <b>${r.score}</b> / 100</div>
    <div class="meta"><span class="pill">${r.category}</span><span class="pill">${r.maintenance}</span><span class="pill">${r.source}</span><span class="pill">${r.language}</span></div>
    <p>${r.summary}</p>
    <p class="why"><strong>为什么推荐：</strong>${r.why}</p>
    <a href="${r.url}" target="_blank" rel="noopener noreferrer">进入资源世界 →</a>
  </article>`;
}

function render(){
  const kings=resources.filter(x=>x.status==="KING");
  const others=resources.filter(x=>x.status!=="KING");
  document.getElementById("kingList").innerHTML=kings.map(card).join("");
  document.getElementById("candidateList").innerHTML=others.map(card).join("");
  document.getElementById("kingCount").textContent=kings.length;
  document.getElementById("challengerCount").textContent=resources.filter(x=>x.status==="CHALLENGER").length;
  document.getElementById("activeCount").textContent=resources.filter(x=>x.maintenance==="ACTIVE").length;
}

function decide(query){
  const q=normalize(query);
  if(!q) return;
  let best=null, bestScore=-1;
  for(const r of resources){
    let hit=0;
    for(const k of r.intents||[]){
      const nk=normalize(k);
      if(q.includes(nk)||nk.includes(q)) hit+=3;
      else{
        const parts=nk.split(/[，,、\/\-]/).filter(Boolean);
        for(const p of parts) if(p && q.includes(p)) hit+=1;
      }
    }
    if(r.status==="KING") hit+=0.5;
    if(hit>bestScore){bestScore=hit;best=r;}
  }
  if(bestScore<=0){
    const generic=resources.find(x=>x.status==="KING")||resources[0];
    showDecision(generic,`暂时没有精确命中“${query}”。先给你一个高质量入口，也可以换关键词继续找。`);
  }else{
    showDecision(best,`根据“${query}”匹配到：${best.category} → ${best.title}`);
  }
}

function showDecision(r,prefix){
  const box=document.getElementById("decisionBox");
  box.classList.remove("hidden");
  box.innerHTML=`<div class="label">NAV KING DECISION</div><h3>${r.status==="KING"?"👑 建议第一站":"⚔️ 建议先看"}：${r.name}</h3><p>${prefix}</p><p>${r.summary}</p><a href="${r.url}" target="_blank" rel="noopener noreferrer">进入资源世界 →</a>`;
  box.scrollIntoView({behavior:"smooth",block:"nearest"});
}

document.getElementById("searchBtn").addEventListener("click",()=>decide(document.getElementById("searchInput").value));
document.getElementById("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter") decide(e.target.value)});
document.querySelectorAll("#quickIntents [data-q]").forEach(b=>b.addEventListener("click",()=>{document.getElementById("searchInput").value=b.dataset.q;decide(b.dataset.q)}));
document.getElementById("randomBtn").addEventListener("click",()=>showDecision(resources[Math.floor(Math.random()*resources.length)],"随机为你打开一扇互联网入口。"));

fetch("resources.json")
  .then(r=>r.json())
  .then(d=>{resources=d;render()})
  .catch(()=>{document.getElementById("kingList").innerHTML="<p>资源数据加载失败，请检查 resources.json。</p>"});
