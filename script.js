var words=[];
fetch("words.json").then(r=>r.json()).then(d=>words=d);

var mode="normal";
var ranks=[
  {name:"五級",need:150,miss:1e9},
  {name:"四級",need:300,miss:1e9},
  {name:"三級",need:450,miss:1e9},
  {name:"二級",need:600,miss:1e9},
  {name:"一級",need:750,miss:1e9},
  {name:"初段",need:900,miss:30},
  {name:"十段",need:2400,miss:10},
  {name:"玄人",need:2550,miss:6},
  {name:"名人",need:2700,miss:5},
  {name:"超人",need:2850,miss:4},
  {name:"達人",need:3000,miss:3}
];

var unlocked=0, selected=0;
var curRank=null;

var curText="", romaSeq=[], romaPos=0, inputBuf="";
var correct=0, miss=0;
var time=60, timer=null;

/* ===== UI ===== */
document.getElementById("normalBtn").onclick=()=>{
  mode="normal";
  curRank={need:0,miss:1e9};
  startGame();
};
document.getElementById("rankBtn").onclick=()=>{
  mode="rank";
  document.getElementById("mode").hidden=true;
  document.getElementById("rank-select").hidden=false;
  renderRanks();
};

function renderRanks(){
  var list=document.querySelector(".rank-list");
  list.innerHTML="";
  ranks.forEach((r,i)=>{
    var d=document.createElement("div");
    d.className="rank"+(i>unlocked?" locked":"");
    if(i===selected) d.classList.add("selected");
    d.textContent=r.name;
    d.onclick=()=>{ if(i<=unlocked){ selected=i; startRank(); }};
    list.appendChild(d);
  });
}

function startRank(){
  curRank=ranks[selected];
  startGame();
}

/* ===== ゲーム開始 ===== */
function startGame(){
  document.getElementById("rank-select").hidden=true;
  document.getElementById("mode").hidden=true;
  document.getElementById("game").hidden=false;

  correct=0; miss=0; time=60;
  nextWord();

  timer=setInterval(()=>{
    time--;
    document.getElementById("timer").textContent=time;
    if(time<=0) finish();
  },1000);
}

/* ===== 単語選択 ===== */
function maxLen(){
  if(mode==="normal") return 999;
  var p=correct/(curRank.need||3000);
  if(p<0.3) return 3;
  if(p<0.6) return 6;
  return 999;
}

function nextWord(){
  var pool=words.filter(w=>w.length<=maxLen());
  curText=pool[Math.floor(Math.random()*pool.length)];
  romaSeq=buildRomaSeq(curText);
  romaPos=0; inputBuf="";
  document.getElementById("word").textContent=curText;
  updateRomaView();
}

/* ===== ローマ字変換 ===== */
function buildRomaSeq(text){
  var seq=[];
  for(let i=0;i<text.length;i++){
    let two=text.slice(i,i+2);
    if(romaTable[two]){
      seq.push(romaTable[two]); i++;
    }else{
      seq.push(romaTable[text[i]]||[text[i]]);
    }
  }
  return seq;
}

/* ===== 入力処理 ===== */
document.addEventListener("keydown",e=>{
  if(!timer||e.key.length!==1) return;
  inputBuf+=e.key;

  if(!romaSeq[romaPos].some(r=>r.startsWith(inputBuf))){
    inputBuf=""; miss++;
    if(miss>=curRank.miss) fail();
    return;
  }

  if(romaSeq[romaPos].includes(inputBuf)){
    correct+=inputBuf.length;
    romaPos++; inputBuf="";
    if(romaPos>=romaSeq.length) nextWord();
  }
  updateRomaView();
  updateGauge();
});

/* ===== 表示 ===== */
function updateRomaView(){
  var done=romaSeq.slice(0,romaPos).map(r=>r[0]).join("");
  var rest=romaSeq.slice(romaPos).map(r=>r[0]).join("");
  document.getElementById("roma").innerHTML=
    `<span style="color:#4eaec4">${done}${inputBuf}</span>${rest.slice(inputBuf.length)}`;
}

function updateGauge(){
  if(curRank.need)
    document.getElementById("type-gauge").style.width=
      Math.min(correct/curRank.need*100,100)+"%";
  document.getElementById("miss-gauge").style.width=
    Math.max((curRank.miss-miss)/curRank.miss*100,0)+"%";
}

/* ===== 終了 ===== */
function finish(){
  clearInterval(timer); timer=null;
  setTimeout(()=>{
    if(correct>=curRank.need && miss<curRank.miss) pass();
    else fail();
  },2000);
}

function pass(){
  document.getElementById("pass").hidden=false;
  if(mode==="rank" && selected===unlocked){
    setTimeout(()=>{
      unlocked++;
      showUnlock(ranks[unlocked]?.name);
    },2000);
  }
}

function fail(){
  clearInterval(timer); timer=null;
  var f=document.getElementById("fail");
  var t=document.getElementById("fail-text");
  f.style.display="block";
  requestAnimationFrame(()=>t.style.top="45%");
  setTimeout(()=>t.style.transform="translateX(-50%) rotate(7deg)",500);
}

function showUnlock(name){
  if(!name) return;
  document.getElementById("unlock-text").textContent=name+" 解禁 !!";
  document.getElementById("unlock").hidden=false;
}
