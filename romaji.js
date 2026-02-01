const ROMAJI = {
  あ:["a"], い:["i"], う:["u"], え:["e"], お:["o"],
  か:["ka"], き:["ki"], く:["ku"], け:["ke"], こ:["ko"],
  さ:["sa"], し:["shi","si"], す:["su"], せ:["se"], そ:["so"],
  た:["ta"], ち:["chi","ti"], つ:["tsu","tu"],
  な:["na"], に:["ni"], ぬ:["nu"], ね:["ne"], の:["no"],
  は:["ha"], ひ:["hi"], ふ:["fu","hu"], へ:["he"], ほ:["ho"],
  ま:["ma"], み:["mi"], む:["mu"], め:["me"], も:["mo"],
  や:["ya"], ゆ:["yu"], よ:["yo"],
  ら:["ra"], り:["ri"], る:["ru"], れ:["re"], ろ:["ro"],
  わ:["wa"], を:["wo","o"],
  が:["ga"], ぎ:["gi"], ぐ:["gu"], げ:["ge"], ご:["go"],
  ざ:["za"], じ:["ji","zi"], ず:["zu"], ぜ:["ze"], ぞ:["zo"],
  だ:["da"], で:["de"], ど:["do"],
  ば:["ba"], び:["bi"], ぶ:["bu"], べ:["be"], ぼ:["bo"],
  ぱ:["pa"], ぴ:["pi"], ぷ:["pu"], ぺ:["pe"], ぽ:["po"],
  ー:["-"]
};

const YOON = {
  きゃ:["kya"], きゅ:["kyu"], きょ:["kyo"],
  しゃ:["sha","sya"], しゅ:["shu","syu"], しょ:["sho","syo"],
  ちゃ:["cha","tya"], ちゅ:["chu","tyu"], ちょ:["cho","tyo"],
  にゃ:["nya"], にゅ:["nyu"], にょ:["nyo"],
  ひゃ:["hya"], ひゅ:["hyu"], ひょ:["hyo"],
  みゃ:["mya"], みゅ:["myu"], みょ:["myo"],
  りゃ:["rya"], りゅ:["ryu"], りょ:["ryo"],
  ぎゃ:["gya"], ぎゅ:["gyu"], ぎょ:["gyo"],
  じゃ:["ja","jya"], じゅ:["ju","jyu"], じょ:["jo","jyo"],
  びゃ:["bya"], びゅ:["byu"], びょ:["byo"],
  ぴゃ:["pya"], ぴゅ:["pyu"], ぴょ:["pyo"]
};

function isVowel(ch){
  return ["a","i","u","e","o","y"].includes(ch);
}

function buildRomaji(kana){
  let result=[""];

  for(let i=0;i<kana.length;i++){
    // 拗音
    let pair = kana.slice(i,i+2);
    if(YOON[pair]){
      let tmp=[];
      result.forEach(r=>{
        YOON[pair].forEach(a=>tmp.push(r+a));
      });
      result=tmp;
      i++;
      continue;
    }

    let ch = kana[i];
    let next = kana[i+1];

    // 小さいっ
    if(ch==="っ"){
      let tmp=[];
      ["xtu","ltu"].forEach(a=>{
        result.forEach(r=>tmp.push(r+a));
      });
      result=tmp;
      continue;
    }

    // ん
    if(ch==="ん"){
      let tmp=[];
      result.forEach(r=>{
        if(!next){
          tmp.push(r+"nn");
        }else{
          let nextR = ROMAJI[next]?.[0] || "";
          if(isVowel(nextR[0])){
            tmp.push(r+"nn");
          }else{
            tmp.push(r+"n");
            tmp.push(r+"nn");
          }
        }
      });
      result=tmp;
      continue;
    }

    // 通常
    let list = ROMAJI[ch] || [ch];
    let tmp=[];
    result.forEach(r=>{
      list.forEach(a=>tmp.push(r+a));
    });
    result=tmp;
  }
  return result;
}
