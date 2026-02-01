/* =========================
   ローマ字完全辞書
========================= */

const ROMAJI_MAP = {
  "あ":["a"],"い":["i"],"う":["u"],"え":["e"],"お":["o"],
  "か":["ka"],"き":["ki"],"く":["ku"],"け":["ke"],"こ":["ko"],
  "さ":["sa"],"し":["shi","si"],"す":["su"],"せ":["se"],"そ":["so"],
  "た":["ta"],"ち":["chi","ti"],"つ":["tsu","tu"],"て":["te"],"と":["to"],
  "な":["na"],"に":["ni"],"ぬ":["nu"],"ね":["ne"],"の":["no"],
  "は":["ha"],"ひ":["hi"],"ふ":["fu","hu"],"へ":["he"],"ほ":["ho"],
  "ま":["ma"],"み":["mi"],"む":["mu"],"め":["me"],"も":["mo"],
  "や":["ya"],"ゆ":["yu"],"よ":["yo"],
  "ら":["ra"],"り":["ri"],"る":["ru"],"れ":["re"],"ろ":["ro"],
  "わ":["wa"],"を":["wo","o"],
  "が":["ga"],"ぎ":["gi"],"ぐ":["gu"],"げ":["ge"],"ご":["go"],
  "ざ":["za"],"じ":["ji","zi"],"ず":["zu"],"ぜ":["ze"],"ぞ":["zo"],
  "だ":["da"],"ぢ":["ji","di"],"づ":["zu","du"],"で":["de"],"ど":["do"],
  "ば":["ba"],"び":["bi"],"ぶ":["bu"],"べ":["be"],"ぼ":["bo"],
  "ぱ":["pa"],"ぴ":["pi"],"ぷ":["pu"],"ぺ":["pe"],"ぽ":["po"]
};

/* 拗音 */
const YOON_MAP = {
  "きゃ":["kya"],"きゅ":["kyu"],"きょ":["kyo"],
  "しゃ":["sha","sya"],"しゅ":["shu","syu"],"しょ":["sho","syo"],
  "ちゃ":["cha","tya"],"ちゅ":["chu","tyu"],"ちょ":["cho","tyo"],
  "にゃ":["nya"],"にゅ":["nyu"],"にょ":["nyo"],
  "ひゃ":["hya"],"ひゅ":["hyu"],"ひょ":["hyo"],
  "みゃ":["mya"],"みゅ":["myu"],"みょ":["myo"],
  "りゃ":["rya"],"りゅ":["ryu"],"りょ":["ryo"],
  "ぎゃ":["gya"],"ぎゅ":["gyu"],"ぎょ":["gyo"],
  "じゃ":["ja","zya"],"じゅ":["ju","zyu"],"じょ":["jo","zyo"],
  "びゃ":["bya"],"びゅ":["byu"],"びょ":["byo"],
  "ぴゃ":["pya"],"ぴゅ":["pyu"],"ぴょ":["pyo"]
};

/* =========================
   ヘルパー
========================= */

function isVowelKana(k){
  return ["あ","い","う","え","お","や","ゆ","よ"].includes(k);
}

function getLastVowel(str){
  const m = str.match(/[aiueo](?!.*[aiueo])/);
  return m ? m[0] : "";
}

/* =========================
   かな配列 → ローマ字パターン
========================= */

function kanaToRomajiPatterns(kanaList){
  let patterns = [""];

  for(let i=0;i<kanaList.length;i++){
    let k = kanaList[i];

    /* 拗音 */
    if(i+1<kanaList.length && YOON_MAP[k+kanaList[i+1]]){
      let next = [];
      patterns.forEach(p=>{
        YOON_MAP[k+kanaList[i+1]].forEach(r=>{
          next.push(p+r);
        });
      });
      patterns = next;
      i++;
      continue;
    }

    /* 小さいっ */
    if(k==="っ"){
      let nextKana = kanaList[i+1];
      let nextRomaji = ROMAJI_MAP[nextKana] || [];
      let next = [];
      patterns.forEach(p=>{
        nextRomaji.forEach(r=>{
          next.push(p + r[0]);
          next.push(p + "xtu" + r);
          next.push(p + "ltu" + r);
        });
      });
      patterns = next;
      continue;
    }

    /* ん（関西問題対応） */
    if(k==="ん"){
      const next = kanaList[i+1];
      const nextIsVowel = next && isVowelKana(next);
      let nextPatterns = [];
      patterns.forEach(p=>{
        if(nextIsVowel){
          nextPatterns.push(p+"nn");
        }else{
          nextPatterns.push(p+"n");
          nextPatterns.push(p+"nn");
        }
      });
      patterns = nextPatterns;
      continue;
    }

    /* 長音 */
    if(k==="ー"){
      let next = [];
      patterns.forEach(p=>{
        const v = getLastVowel(p);
        if(v) next.push(p+v);
      });
      patterns = next;
      continue;
    }

    /* 通常かな */
    let roma = ROMAJI_MAP[k];
    if(!roma) continue;

    let next = [];
    patterns.forEach(p=>{
      roma.forEach(r=>{
        next.push(p+r);
      });
    });
    patterns = next;
  }

  return [...new Set(patterns)];
}

/* =========================
   入力判定用
========================= */

function isCorrectInput(input, patterns){
  return patterns.some(p=>p.startsWith(input));
}

function isCompleteInput(input, patterns){
  return patterns.includes(input);
}
