let careers=[], rankings=[];

const normalize=s=>(s||"").toLowerCase().replace(/\s+/g,"");

function rankRow(r,i){
  return `<div class="rank-row">
    <div class="rank-no">${String(i+1).padStart(2,"0")}</div>
    <div class="rank-main">
      <div class="rank-title">${r.title}</div>
      <div class="rank-name">${r.name} · ${r.maintenance}</div>
    </div>
    <div class="rank-side">
      <div class="rank-score">${r.score}</div>
      <button data-rank="${r.id}">查看详情 →</button>
    </div>
  </div>`;
}

function careerRow(c){
  return `<div class="career-row">
    <div class="career-icon">${c.icon}</div>
    <div class="career-main">
      <strong>${c.label}</strong>
      <span>${c.skills.join(" · ")}</span>
    </div>
    <button data-career="${c.id}">找入口 →</button>
  </div>`;
}

function render(){
  document.getElementById("careerTabs").innerHTML=careers.map(c=>`<button data-career="${c.id}">${c.icon} ${c.label}</button>`).join("");
  document.getElementById("careerList").innerHTML=careers.map(careerRow).join("");

  const kings=rankings.filter(x=>x.status==="KING").sort((a,b)=>b.score-a.score);
  const others=rankings.filter(x=>x.status!=="KING").sort((a,b)=>b.score-a.score);
  document.getElementById("kingList").innerHTML=kings.map(rankRow).join("");
  document.getElementById("candidateList").innerHTML=others.map(rankRow).join("");
  document.getElementById("kingCount").textContent=kings.length;
  document.getElementById("challengerCount").textContent=rankings.filter(x=>x.status==="CHALLENGER").length;
  document.getElementById("activeCount").textContent=rankings.filter(x=>x.maintenance==="ACTIVE").length;

  document.querySelectorAll("[data-career]").forEach(b=>b.addEventListener("click",()=>recommendCareer(b.dataset.career)));
  document.querySelectorAll("[data-rank]").forEach(b=>b.addEventListener("click",()=>openRankDetail(b.dataset.rank)));
}

function scoreCareer(c,q){
  let score=0, hits=[];
  for(const kw of c.keywords){
    const n=normalize(kw);
    if(q.includes(n)){
      score+= n.length>=4 ? 5 : 3;
      hits.push(kw);
    }
  }
  // Goal-word boost makes phrases like "想做UI设计师 / 想学Excel" more robust.
  if(/想做|想当|成为|转行|职业/.test(q)) score+=1;
  if(/想学|学习|教程|入门|零基础|自学/.test(q)) score+=1;
  return {score,hits};
}

function decide(query){
  const q=normalize(query);
  if(!q) return;
  const scored=careers.map(c=>({c,...scoreCareer(c,q)})).sort((a,b)=>b.score-a.score);
  const best=scored[0];
  if(!best || best.score<=0){
    showUnknown(query);
    return;
  }
  showCareerDecision(best.c,best.hits,query);
}

function showCareerDecision(c,hits,query){
  const box=document.getElementById("decisionBox");
  const hitText=hits.length?`识别到：${hits.slice(0,4).join("、")}`:"根据职业/技能目标匹配";
  box.classList.remove("hidden");
  box.innerHTML=`<div class="label">KING GRAPH DECISION</div>
    <h3>${c.icon} ${c.label}</h3>
    <p>${hitText}</p>
    <div class="skillline">${c.skills.map(s=>`<span>${s}</span>`).join("")}</div>
    <p><strong>👑 建议第一站：${c.entry.name}</strong><br>${c.entry.reason}</p>
    <button data-entry="${c.id}">查看入口说明 →</button>`;
  box.querySelector("[data-entry]").addEventListener("click",()=>openCareerDetail(c.id));
  box.scrollIntoView({behavior:"smooth",block:"nearest"});
}

function showUnknown(query){
  const box=document.getElementById("decisionBox");
  box.classList.remove("hidden");
  box.innerHTML=`<div class="label">KING GRAPH</div>
    <h3>暂时没有精确入口</h3>
    <p>没有为“${query}”强行推荐不相关资源。可以换一个职业、技能或任务描述。</p>
    <p><strong>👑 没有你想要的学习资源？</strong><br>海量精选资源，可加博主微信获取：<strong>ziyouluoti8</strong><br>添加备注：导航王中王</p>`;
}

function recommendCareer(id){
  const c=careers.find(x=>x.id===id);
  if(c) showCareerDecision(c,[c.label],"");
}

function openCareerDetail(id){
  const c=careers.find(x=>x.id===id);
  if(!c)return;
  openOverlay(`
    <div class="detail-kicker">${c.entry.status} · KING SCORE ${c.entry.score}/100</div>
    <h2 class="detail-title">${c.icon} ${c.label}</h2>
    <div class="detail-name">${c.entry.name}</div>
    <div class="detail-block"><h4>建议学习技能</h4><p>${c.skills.join(" → ")}</p></div>
    <div class="detail-block"><h4>为什么给这个入口</h4><p>${c.entry.reason}</p></div>
    <div class="detail-block"><h4>怎么使用</h4><p>先进入对应资源世界，优先找到与你当前技能缺口最接近的分类，不必一次把所有内容看完。</p></div>
    <div class="actions"><a href="${c.entry.url}" target="_blank" rel="noopener noreferrer">进入资源世界 →</a></div>
    <section class="ad-card"><div class="ad-crown">👑</div><div><h3>没有你想要的学习资源？</h3><p><strong>海量精选资源，可加博主微信获取：ziyouluoti8</strong></p><span>添加备注：导航王中王</span></div></section>`);
}

function openRankDetail(id){
  const r=rankings.find(x=>x.id===id);
  if(!r)return;
  openOverlay(`
    <div class="detail-kicker">${r.status} · KING SCORE ${r.score}/100</div>
    <h2 class="detail-title">${r.title}</h2>
    <div class="detail-name">${r.name}</div>
    <div class="detail-block"><h4>这是什么</h4><p>${r.summary}</p></div>
    <div class="detail-block"><h4>为什么推荐</h4><p>${r.why}</p></div>
    <div class="actions"><a href="${r.url}" target="_blank" rel="noopener noreferrer">进入资源世界 →</a></div>`);
}

function openOverlay(html){
  document.getElementById("detailContent").innerHTML=html;
  const o=document.getElementById("detailOverlay");
  o.classList.remove("hidden");
  o.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}
function closeOverlay(){
  const o=document.getElementById("detailOverlay");
  o.classList.add("hidden");
  o.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
}

document.getElementById("searchBtn").addEventListener("click",()=>decide(document.getElementById("searchInput").value));
document.getElementById("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")decide(e.target.value)});
document.getElementById("closeDetail").addEventListener("click",closeOverlay);
document.getElementById("detailOverlay").addEventListener("click",e=>{if(e.target.id==="detailOverlay")closeOverlay()});

fetch("resources.json")
  .then(r=>r.json())
  .then(d=>{careers=d.careers||[];rankings=d.rankings||[];render()})
  .catch(()=>{document.getElementById("careerList").innerHTML="<p>资源数据加载失败，请检查 resources.json。</p>"});
