let careers=[];

const normalize=s=>(s||"").toLowerCase().replace(/\s+/g,"");

function tier(i){
  if(i===0)return "tier-1";
  if(i<=2)return "tier-2";
  if(i<=5)return "tier-3";
  return "tier-4";
}

function renderCareerUI(){
  document.getElementById("careerTabs").innerHTML=careers.map(c=>`<button data-id="${c.id}">${c.icon} ${c.label}</button>`).join("");
  document.getElementById("careerList").innerHTML=careers.map(c=>`
    <div class="career-row">
      <div class="icon">${c.icon}</div>
      <div class="text"><strong>${c.label}</strong><span>${c.skills.join(" · ")}</span></div>
      <button data-id="${c.id}">看 TOP 10 →</button>
    </div>`).join("");
  document.querySelectorAll("[data-id]").forEach(b=>b.addEventListener("click",()=>showCareer(b.dataset.id)));
}

function scoreCareer(c,q){
  let score=0;
  for(const kw of c.keywords){
    const k=normalize(kw);
    if(q.includes(k)) score += k.length>=4 ? 5 : 3;
  }
  if(/想做|想当|成为|转行|职业/.test(q))score+=1;
  if(/想学|学习|教程|入门|零基础|自学/.test(q))score+=1;
  return score;
}

function decide(query){
  const q=normalize(query);
  if(!q)return;
  const scored=careers.map(c=>({c,score:scoreCareer(c,q)})).sort((a,b)=>b.score-a.score);
  if(!scored[0] || scored[0].score<=0){
    const rs=document.getElementById("resultSection");
    rs.classList.remove("hidden");
    document.getElementById("resultHeader").innerHTML=`<h2>暂时没有精确入口</h2><p>没有为了凑结果而乱推荐。可以换一个职业、技能或任务描述。</p>`;
    document.getElementById("top10List").innerHTML="";
    rs.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  showCareer(scored[0].c.id);
}

function showCareer(id){
  const c=careers.find(x=>x.id===id);
  if(!c)return;
  const rs=document.getElementById("resultSection");
  rs.classList.remove("hidden");
  document.getElementById("resultHeader").innerHTML=`<h2>${c.icon} ${c.label}</h2><p>${c.skills.join(" · ")} · 固定精选 TOP 10</p>`;
  document.getElementById("top10List").innerHTML=c.top10.map((r,i)=>`
    <a class="top-item ${tier(i)}" href="${r.url}" target="_blank" rel="noopener noreferrer">
      <div class="rank">${i===0?"👑":String(i+1).padStart(2,"0")}</div>
      <div class="top-main"><div class="top-name">${r.name}</div><div class="top-tag">${r.tag}</div></div>
      <div class="top-score">${r.score}</div>
    </a>`).join("");
  rs.scrollIntoView({behavior:"smooth",block:"start"});
}

document.getElementById("searchBtn").addEventListener("click",()=>decide(document.getElementById("searchInput").value));
document.getElementById("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")decide(e.target.value)});

fetch("resources.json")
  .then(r=>r.json())
  .then(d=>{careers=d.careers||[];renderCareerUI()})
  .catch(()=>{document.getElementById("careerList").innerHTML="<p>资源数据加载失败。</p>"});
