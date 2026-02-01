/* =========================
   単語データ読み込み
========================= */
let words = [];
fetch("./words.json")
  .then(r => r.json())
  .then(json => { words = json; });

/* =========================
   ローマ字変換
========================= */
function kanaToRomajiPatterns(kanaArray){
  const map = {
    "あ":"a","い":"i","う":"u","え":"e","お":"o",
    "か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
    "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
    "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
    "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
    "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
    "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
    "や":"ya","ゆ":"yu","よ":"yo",
    "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro",
    "わ":"wa","を":"wo","ん":"n",
    "が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go",
    "ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
    "だ":"da","ぢ":"ji","づ":"zu","で":"de","ど":"do",
    "ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
    "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po",
    "きゃ":"kya","きゅ":"kyu","きょ":"kyo",
    "しゃ":"sha","しゅ":"shu","しょ":"sho",
    "ちゃ":"cha","ちゅ":"chu","ちょ":"cho",
    "にゃ":"nya","にゅ":"nyu","にょ":"nyo",
    "ひゃ":"hya","ひゅ":"hyu","ひょ":"hyo",
    "みゃ":"mya","みゅ":"myu","みょ":"myo",
    "りゃ":"rya","りゅ":"ryu","りょ":"ryo",
    "ぎゃ":"gya","ぎゅ":"gyu","ぎょ":"gyo",
    "じゃ":"ja","じゅ":"ju","じょ":"jo",
    "びゃ":"bya","びゅ":"byu","びょ":"byo",
    "ぴゃ":"pya","ぴゅ":"pyu","ぴょ":"pyo"
  };
  return kanaArray.map(k=>map[k]||k);
}

/* =========================
   段位設定
========================= */
const RANKS = [
  { name:"五級", need:150, miss:Infinity },
  { name:"四級", need:300, miss:Infinity },
  { name:"三級", need:450, miss:Infinity },
  { name:"二級", need:600, miss:Infinity },
  { name:"一級", need:750, miss:Infinity },
  { name:"初段", need:900, miss:Infinity },
  { name:"一段", need:1050, miss:20 },
  { name:"二段", need:1200, miss:20 },
  { name:"三段", need:1350, miss:20 },
  { name:"四段", need:1500, miss:20 },
  { name:"五段", need:1650, miss:20 },
  { name:"六段", need:1800, miss:20 },
  { name:"七段", need:1950, miss:20 },
  { name:"八段", need:2100, miss:30 },
  { name:"九段", need:2250, miss:20 },
  { name:"十段", need:2400, miss:10 },
  { name:"玄人", need:2550, miss:6 },
  { name:"名人", need:2700, miss:5 },
  { name:"超人", need:2850, miss:4 },
  { name:"達人", need:3000, miss:3 }
];

/* =========================
   ゲーム状態
========================= */
let currentWord=null;
let romajiPatterns=[];
let inputBuffer="";
let correctCount=0;
let missCount=0;
let startTime=0;
let timerId=null;
let timeLimit=60;
let mode="normal";
let currentRank=null;

/* =========================
   成績保存
========================= */
function loadSave(){ return JSON.parse(localStorage.getItem("typingSave")||"{}"); }
function saveResult(rank, score){ const save=loadSave(); if(!save[rank]||save[rank]<score) save[rank]=score; localStorage.setItem("typingSave",JSON.stringify(save)); }

/* =========================
   段位解放
========================= */
function loadUnlockedRank(){ return parseInt(localStorage.getItem("unlockedRank")||"0"); }
function unlockNextRank(){ let u=loadUnlockedRank(); if(u<RANKS.length-1) localStorage.setItem("unlockedRank",u+1); }
function updateRankUI(){ const unlocked=loadUnlockedRank(); document.querySelectorAll(".rank").forEach((el,i)=>{ el.style.filter=i<=unlocked?"brightness(100%)":"brightness(30%)"; }); }

/* =========================
   単語処理
========================= */
function nextWord(){
  if(words.length===0) return;
  currentWord = words[Math.floor(Math.random()*words.length)];
  romajiPatterns = kanaToRomajiPatterns(currentWord.kana);
  inputBuffer="";
  document.getElementById("word").textContent=currentWord.word;
  document.getElementById("input").textContent="";
}

/* =========================
   ゲーム開始
========================= */
function startGame(selectedRank=null){
  mode = selectedRank?"rank":"normal";
  currentRank=selectedRank;
  correctCount=0;
  missCount=0;

  document.getElementById("rankSelect").classList.add("hidden");
  document.getElementById("result").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  startTime=Date.now();
  updateTimer();
  nextWord();
  timerId=setInterval(updateTimer,100);
}

/* =========================
   タイマー＆ゲージ
========================= */
function updateTimer(){
  const t=Math.max(0,timeLimit-(Date.now()-startTime)/1000);
  document.getElementById("timer").textContent=`残り ${t.toFixed(1)} 秒`;
  if(t<=0) endGame();
  if(mode==="rank"){
    const gaugeCorrectEl = document.getElementById("gaugeCorrect");
    const gaugeMissEl = document.getElementById("gaugeMiss");
    if(gaugeCorrectEl){
      gaugeCorrectEl.style.width=Math.min(100,correctCount/currentRank.need*100)+"%";
    }
    if(gaugeMissEl && currentRank.miss!==Infinity){
      gaugeMissEl.style.width=Math.min(100,missCount/currentRank.miss*100)+"%";
    }
  }
}

/* =========================
   入力処理
========================= */
let isGameActive = false;

document.addEventListener("keydown", e=>{
  // ゲーム中のみ入力を受け付ける
  if(!document.getElementById("game").classList.contains("hidden")){
    isGameActive = true;
  } else {
    isGameActive = false;
  }

  if(isGameActive && currentWord && e.key.length===1 && /^[a-z]$/i.test(e.key)){
    inputBuffer += e.key.toLowerCase();
    
    // 正しい入力かチェック
    const isValid = romajiPatterns.some(p=>p.startsWith(inputBuffer));
    
    if(isValid){
      document.getElementById("input").textContent=inputBuffer;
      // 完全一致したら次の単語へ
      if(romajiPatterns.includes(inputBuffer)){
        correctCount++;
        nextWord();
      }
    } else {
      // ミス
      missCount++;
      inputBuffer=inputBuffer.slice(0,-1);
      // 段位モードでミス制限を超えたら終了
      if(mode==="rank" && currentRank.miss!==Infinity && missCount>=currentRank.miss){
        endGame();
      }
    }
  }
});

/* =========================
   終了処理
========================= */
function endGame(){
  clearInterval(timerId);
  currentWord=null;
  isGameActive = false;
  
  document.getElementById("game").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");

  const score = correctCount*5 - missCount*3;
  let pass = true;
  
  if(mode==="rank"){
    // 正打数が基準に達していない場合は不合格
    if(correctCount < currentRank.need) pass = false;
    // ミス数が制限を超えている場合は不合格
    if(currentRank.miss !== Infinity && missCount >= currentRank.miss) pass = false;
  }

  if(mode==="rank" && pass){
    unlockNextRank();
    saveResult(currentRank.name, score);
    document.getElementById("result").textContent="合　格";
  } else {
    document.getElementById("result").textContent = mode==="rank" ? "不合格" : `SCORE ${score}`;
  }

  updateRankUI();
}

/* =========================
   段位選択操作
========================= */
let selectedRankIndex=0;
const rankElements=document.querySelectorAll(".rank");

function updateRankHighlight(){
  rankElements.forEach((el,i)=>el.classList[i===selectedRankIndex?"add":"remove"]("selected"));
}

document.addEventListener("keydown", e=>{
  const rankSelectEl=document.getElementById("rankSelect");
  if(!rankSelectEl.classList.contains("hidden")){
    if(e.key==="ArrowRight"){
      const unlocked = loadUnlockedRank();
      selectedRankIndex = Math.min(unlocked, selectedRankIndex+1);
      updateRankHighlight();
    }
    else if(e.key==="ArrowLeft"){
      selectedRankIndex = Math.max(0, selectedRankIndex-1);
      updateRankHighlight();
    }
    else if(e.key==="Enter"){
      const unlocked = loadUnlockedRank();
      if(selectedRankIndex <= unlocked){
        startGame(RANKS[selectedRankIndex]);
        rankSelectEl.style.transition="opacity 0.5s";
        rankSelectEl.style.opacity=0;
        setTimeout(()=>{
          rankSelectEl.classList.add("hidden");
          rankSelectEl.style.opacity=1;
        }, 500);
      }
    }
  }
});

/* =========================
   初期化
========================= */
window.onload=()=>{
  updateRankUI();
  updateRankHighlight();
};
