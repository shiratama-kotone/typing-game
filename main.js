/* =========================
   グローバル状態
========================= */

let words = [];
let currentWord = null;
let romajiPatterns = [];
let inputBuffer = "";

let correctCount = 0;
let missCount = 0;
let startTime = 0;
let timerId = null;
let timeLimit = 60;

let mode = "normal"; // normal | rank
let currentRank = null;

/* =========================
   段位定義
========================= */

const RANKS = [
  { name:"五級", need:150, miss:Infinity },
  { name:"四級", need:300, miss:150 },
  { name:"三級", need:450, miss:140 },
  { name:"二級", need:600, miss:130 },
  { name:"一級", need:750, miss:120 },
  { name:"初段", need:900, miss:110 },
  { name:"一段", need:1050, miss:100 },
  { name:"二段", need:1200, miss:90 },
  { name:"三段", need:1350, miss:80 },
  { name:"四段", need:1500, miss:70 },
  { name:"五段", need:1650, miss:60 },
  { name:"六段", need:1800, miss:50 },
  { name:"七段", need:1950, miss:40 },
  { name:"八段", need:2100, miss:30 },
  { name:"九段", need:2250, miss:20 },
  { name:"十段", need:2400, miss:10 },
  { name:"玄人", need:2550, miss:5 },
  { name:"名人", need:2700, miss:4 },
  { name:"超人", need:2850, miss:3 },
  { name:"達人", need:3000, miss:3 }
];

/* =========================
   成績保存
========================= */

function loadSave(){
  return JSON.parse(localStorage.getItem("typingSave") || "{}");
}

function saveResult(rank, score){
  const save = loadSave();
  if(!save[rank] || save[rank] < score){
    save[rank] = score;
  }
  localStorage.setItem("typingSave", JSON.stringify(save));
}

/* =========================
   段位解放
========================= */

function loadUnlockedRank(){
  return parseInt(localStorage.getItem("unlockedRank") || "0");
}

function unlockNextRank(){
  let u = loadUnlockedRank();
  if(u < RANKS.length - 1){
    localStorage.setItem("unlockedRank", u + 1);
  }
}

function updateRankUI(){
  const unlocked = loadUnlockedRank();
  const rankElements = document.querySelectorAll(".rank");
  rankElements.forEach((el, i) => {
    if(i <= unlocked){
      el.style.filter = "brightness(100%)";
    } else {
      el.style.filter = "brightness(30%)";
    }
  });
}

/* =========================
   単語ロード
========================= */

async function loadWords(){
  const res = await fetch("./words.json");
  words = await res.json();
}

/* =========================
   単語取得
========================= */

function nextWord(){
  currentWord = words[Math.floor(Math.random()*words.length)];
  romajiPatterns = kanaToRomajiPatterns(currentWord.kana); // romaji.js関数
  inputBuffer = "";
  document.getElementById("word").textContent = currentWord.word;
  document.getElementById("input").textContent = "";
}

/* =========================
   ゲーム開始
========================= */

function startGame(selectedRank=null){
  mode = selectedRank ? "rank" : "normal";
  currentRank = selectedRank;

  correctCount = 0;
  missCount = 0;

  document.getElementById("rankSelect").classList.add("hidden");
  document.getElementById("result").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  startTime = Date.now();
  updateTimer();
  nextWord();

  timerId = setInterval(updateTimer, 100);
}

/* =========================
   タイマー
========================= */

function updateTimer(){
  const t = Math.max(0, timeLimit - (Date.now()-startTime)/1000);
  document.getElementById("timer").textContent = `残り ${t.toFixed(1)} 秒`;
  if(t<=0){
    endGame();
  }
  updateGauge();
}

/* =========================
   ゲージ更新
========================= */

function updateGauge(){
  if(mode==="rank"){
    const need = currentRank.need;
    const missMax = currentRank.miss;
    document.getElementById("gaugeCorrect").style.width =
      Math.min(100, correctCount/need*100) + "%";
    if(missMax!==Infinity){
      document.getElementById("gaugeMiss").style.width =
        Math.min(100, missCount/missMax*100) + "%";
    }
  }
}

/* =========================
   入力処理
========================= */

document.addEventListener("keydown", e=>{
  if(currentWord && e.key.length===1){
    inputBuffer += e.key.toLowerCase();
    if(isCorrectInput(inputBuffer, romajiPatterns)){
      document.getElementById("input").textContent = inputBuffer;
      correctCount++;
      if(isCompleteInput(inputBuffer, romajiPatterns)){
        nextWord();
      }
    }else{
      missCount++;
      inputBuffer = inputBuffer.slice(0,-1);
      if(mode==="rank" && missCount>=currentRank.miss){
        endGame(false);
      }
    }
  }
});

/* =========================
   終了処理
========================= */

function endGame(forceFail=true){
  clearInterval(timerId);
  currentWord = null;
  document.getElementById("game").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");

  const score = correctCount*5 - missCount*3;
  let pass = true;
  if(mode==="rank"){
    if(correctCount < currentRank.need) pass = false;
    if(missCount >= currentRank.miss) pass = false;
  }

  if(mode==="rank" && pass){
    unlockNextRank();
    saveResult(currentRank.name, score);
    document.getElementById("result").textContent = "合　格";
  }else{
    document.getElementById("result").textContent =
      mode==="rank" ? "不合格" : `SCORE ${score}`;
  }

  updateRankUI();
}

/* =========================
   段位選択キー操作
========================= */

let selectedRankIndex = 0;
const rankElements = document.querySelectorAll(".rank");

function updateRankHighlight() {
  rankElements.forEach((el, i) => {
    if (i === selectedRankIndex) {
      el.classList.add("selected");
    } else {
      el.classList.remove("selected");
    }
  });
}

document.addEventListener("keydown", e => {
  const rankSelectEl = document.getElementById("rankSelect");
  if (!rankSelectEl.classList.contains("hidden")) {
    if (e.key === "ArrowRight") {
      selectedRankIndex = Math.min(rankElements.length-1, selectedRankIndex+1);
      updateRankHighlight();
    } else if (e.key === "ArrowLeft") {
      selectedRankIndex = Math.max(0, selectedRankIndex-1);
      updateRankHighlight();
    } else if (e.key === "Enter") {
      startGame(RANKS[selectedRankIndex]);
      rankSelectEl.style.transition = "opacity 0.5s";
      rankSelectEl.style.opacity = 0;
      setTimeout(()=>rankSelectEl.classList.add("hidden"),500);
    }
  }
});

/* =========================
   初期化
========================= */

window.onload = async ()=>{
  await loadWords();
  updateRankUI();
  updateRankHighlight();
};
