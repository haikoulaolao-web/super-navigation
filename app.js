let resources=[];

const normalize=s=>(s||"").toLowerCase().replace(/\s+/g,"");

function statusLabel(r){
  if(r.status==="KING") return "👑 KING";
  if(r.status==="CHALLENGER") return "⚔️ CHALLENGER";
  return "⭐ PRIME";
}

function rankRow(r,i){
  return `<div class="rank-row">
    <div class="rank-no">${String(i+1).padStart(2,"0")}</div>
    <div class="rank-main">
      <div class="rank-title">${r.title}</div>
      <div class="rank-name">${r.name} · ${r.maintenance}</div>
    </div>
    <div class="rank-side">
      <div class="rank-score">${r.score}</div>
      <button data-detail="${r.id}">查看详情 →</button>
    </div>
  </div>`;
}

function render(){
  const kings=resources.filter(x=>x.status==="KING").sort((a,b)=>b.score-a.score);
  const others=resources.filter(x=>x.status!=="KING").sort((a,b)=>b.score-a.score);
  document.getElementById("kingList").innerHTML=kings.map(rankRow).join("");
  document.getElementById("candidateList").innerHTML=others.map(rankRow).join("");
  document.getElementById("kingCount").textContent=kings.length;
  document.getElementById("challengerCount").textContent=resources.filter(x=>x.status==="CHALLENGER").length;
  document.getElementById("activeCount").textContent=resources.filter(x=>x.maintenance==="ACTIVE").length;
  document.querySelectorAll("[data-detail]").forEach(btn=>btn.addEventListener("click",()=>openDetail(btn.dataset.detail)));
}

function decide(query){
  const q=normalize(query);
  if(!q) return;
  let best=null,bestScore=-1;
  for(const r of resources){
    let hit=0;
    for(const k of r.intents||[]){
      const nk=normalize(k);
      if(q.includes(nk)||nk.includes(q)) hit+=3;
    }
    if(r.status==="KING") hit+=0.5;
    if(hit>bestScore){bestScore=hit;best=r;}
  }
  if(bestScore<=0){
    best=resources.find(x=>x.status==="KING")||resources[0];
    showDecision(best,"暂时没有精确命中。先给你一个高质量入口，也可以换关键词继续找。",false);
  }else{
    showDecision(best,`根据“${query}”匹配到：${best.category} → ${best.title}`,false);
  }
}

function showDecision(r,text,isRandom){
  const box=document.getElementById("decisionBox");
  box.classList.remove("hidden");
  box.innerHTML=`<div class="label">${isRandom?"RANDOM DISCOVERY":"NAV KING DECISION"}</div>
    <h3>${isRandom?"🎲 偶然发现":"👑 建议第一站"}：${r.name}</h3>
    <p>${text}</p>
    <p>${r.summary}</p>
    <button data-open="${r.id}">查看中文说明 →</button>`;
  box.querySelector("[data-open]").addEventListener("click",()=>openDetail(r.id));
}

function openDetail(id){
  const r=resources.find(x=>x.id===id);
  if(!r) return;
  const overlay=document.getElementById("detailOverlay");
  document.getElementById("detailContent").innerHTML=`
    <div class="detail-kicker">${statusLabel(r)} · KING SCORE ${r.score}/100</div>
    <h2 class="detail-title">${r.title}</h2>
    <div class="detail-name">${r.name}</div>
    <div class="detail-meta">
      <span class="pill">${r.category}</span>
      <span class="pill">${r.maintenance}</span>
      <span class="pill">${r.source}</span>
      <span class="pill">${r.language}</span>
    </div>

    <div class="detail-block">
      <h4>这是什么</h4>
      <p>${r.summary}</p>
    </div>

    <div class="detail-block">
      <h4>为什么推荐</h4>
      <p>${r.why}</p>
    </div>

    <div class="detail-block">
      <h4>建议怎么用</h4>
      <p>先把它当成一个“资源入口”，不要试图一次看完。进入后优先找到与你当前目标最接近的分类，再继续向下探索。</p>
    </div>

    <div class="actions">
      <a class="primary" href="${r.url}" target="_blank" rel="noopener noreferrer">🌐 打开原始资源网页</a>
      <a class="secondary" href="${r.url}" target="_blank" rel="noopener noreferrer">🐙 查看 GitHub 源仓库</a>
    </div>
    <div class="tip">提示：如果你的手机安装了 GitHub App，系统可能仍会把 github.com 链接交给 App 打开。这属于 iOS 的链接处理方式。NAV KING 已先提供中文说明，是否打开原始仓库由你决定。</div>`;
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}

function closeDetail(){
  const overlay=document.getElementById("detailOverlay");
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
}

document.getElementById("searchBtn").addEventListener("click",()=>decide(document.getElementById("searchInput").value));
document.getElementById("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")decide(e.target.value)});
document.querySelectorAll("#quickIntents [data-q]").forEach(b=>b.addEventListener("click",()=>{
  document.getElementById("searchInput").value=b.dataset.q;
  decide(b.dataset.q);
}));
document.getElementById("randomBtn").addEventListener("click",()=>{
  const r=resources[Math.floor(Math.random()*resources.length)];
  showDecision(r,"NAV KING 随机为你打开一扇互联网入口。这不是刚才搜索结果。",true);
});
document.getElementById("closeDetail").addEventListener("click",closeDetail);
document.getElementById("detailOverlay").addEventListener("click",e=>{if(e.target.id==="detailOverlay")closeDetail()});

fetch("resources.json")
  .then(r=>r.json())
  .then(d=>{resources=d;render()})
  .catch(()=>{document.getElementById("kingList").innerHTML="<p>资源数据加载失败，请检查 resources.json。</p>"});
