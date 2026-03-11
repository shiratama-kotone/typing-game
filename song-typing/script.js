// ===== グローバル変数 =====
let player = null;
let currentSong = null;
let currentLyricIndex = 0;
let startTime = null;
let updateInterval = null;
let activeColor = null;
let songSortOrder = 'default'; // 'default' | 'difficulty'
let autoMode = false;
let autoTypeTimers = [];
let playbackSpeed = 1.0;

// 録画
let mediaRecorder = null;
let recordedChunks = [];
let recordingActive = false;

// サウンドエフェクト
let typingSound = null;
let missSound = null;
let bonusSound = null;
let allJusticeSound = null;

// ゲーム状態
let gameState = {
    score: 0,
    correctCount: 0,
    missCount: 0,
    missedLines: 0,
    currentRomaji: [],
    currentCharIndex: 0,
    currentCharPosition: 0,
    totalKeystrokes: 0,
    lineTypedChars: 0,
    totalLyricChars: 0,
    totalNorma: 0,
    totalTypedChars: 0,
    completedCurrentLine: false,
    completedUnits: 0,
    totalUnits: 0,
    totalDuration: 0
};

// ===== ローマ字変換テーブル =====
const ROMAJI_TABLE = {
    'あ':['a'],'い':['i'],'う':['u'],'え':['e'],'お':['o'],
    'ぁ':['la','xa'],'ぃ':['li','xi'],'ぅ':['lu','xu'],'ぇ':['le','xe'],'ぉ':['lo','xo'],
    'か':['ka'],'き':['ki'],'く':['ku'],'け':['ke'],'こ':['ko'],
    'が':['ga'],'ぎ':['gi'],'ぐ':['gu'],'げ':['ge'],'ご':['go'],
    'さ':['sa'],'し':['si','shi'],'す':['su'],'せ':['se'],'そ':['so'],
    'ざ':['za'],'じ':['zi','ji'],'ず':['zu'],'ぜ':['ze'],'ぞ':['zo'],
    'た':['ta'],'ち':['ti','chi'],'つ':['tu','tsu'],'て':['te'],'と':['to'],
    'だ':['da'],'ぢ':['di'],'づ':['du'],'で':['de'],'ど':['do'],
    'な':['na'],'に':['ni'],'ぬ':['nu'],'ね':['ne'],'の':['no'],
    'は':['ha'],'ひ':['hi'],'ふ':['hu','fu'],'へ':['he'],'ほ':['ho'],
    'ば':['ba'],'び':['bi'],'ぶ':['bu'],'べ':['be'],'ぼ':['bo'],
    'ぱ':['pa'],'ぴ':['pi'],'ぷ':['pu'],'ぺ':['pe'],'ぽ':['po'],
    'ま':['ma'],'み':['mi'],'む':['mu'],'め':['me'],'も':['mo'],
    'や':['ya'],'ゆ':['yu'],'よ':['yo'],
    'ら':['ra'],'り':['ri'],'る':['ru'],'れ':['re'],'ろ':['ro'],
    'わ':['wa'],'を':['wo'],'ん':['nn','n'],'ー':['-'],
    'a':['a'],'b':['b'],'c':['c'],'d':['d'],'e':['e'],
    'f':['f'],'g':['g'],'h':['h'],'i':['i'],'j':['j'],
    'k':['k'],'l':['l'],'m':['m'],'n':['n'],'o':['o'],
    'p':['p'],'q':['q'],'r':['r'],'s':['s'],'t':['t'],
    'u':['u'],'v':['v'],'w':['w'],'x':['x'],'y':['y'],'z':['z'],
    '0':['0'],'1':['1'],'2':['2'],'3':['3'],'4':['4'],
    '5':['5'],'6':['6'],'7':['7'],'8':['8'],'9':['9'],' ':[' ']
};

const COMBO_ROMAJI = {
    'きゃ':['kya'],'きゅ':['kyu'],'きょ':['kyo'],
    'しゃ':['sya','sha'],'しゅ':['syu','shu'],'しょ':['syo','sho'],
    'ちゃ':['tya','cha'],'ちゅ':['tyu','chu'],'ちょ':['tyo','cho'],
    'にゃ':['nya'],'にゅ':['nyu'],'にょ':['nyo'],
    'ひゃ':['hya'],'ひゅ':['hyu'],'ひょ':['hyo'],
    'みゃ':['mya'],'みゅ':['myu'],'みょ':['myo'],
    'りゃ':['rya'],'りゅ':['ryu'],'りょ':['ryo'],
    'ぎゃ':['gya'],'ぎゅ':['gyu'],'ぎょ':['gyo'],
    'じゃ':['zya','ja','jya'],'じゅ':['zyu','ju','jyu'],'じょ':['zyo','jo','jyo'],
    'びゃ':['bya'],'びゅ':['byu'],'びょ':['byo'],
    'ぴゃ':['pya'],'ぴゅ':['pyu'],'ぴょ':['pyo'],
    'ふぁ':['fa'],'ふぃ':['fi'],'ふぇ':['fe'],'ふぉ':['fo'],
    'うぃ':['wi'],'うぇ':['we'],
    'てぃ':['thi'],'でぃ':['dhi']
};

// ===== 難易度計算 =====
function calcTotalChars(song) {
    if (!song.lyrics || song.lyrics.length === 0) return 0;
    let total = 0;
    song.lyrics.forEach(lyric => {
        const ra = convertToRomaji(lyric.kana);
        total += ra.reduce((s, c) => s + c.current.length, 0);
    });
    return total;
}

function getDifficultyInfo(song) {
    if (song.worldsEnd !== undefined && song.worldsEnd !== null && song.worldsEnd !== '') {
        return { isWorldsEnd: true, isInst: false, weChar: song.worldsEnd, name: "WORLD'S END", color: null, level: null, over15: false, totalChars: 0 };
    }
    const totalChars = calcTotalChars(song);
    if (totalChars === 0) {
        // 歌詞なし → Inst
        return { isWorldsEnd: false, isInst: true, name: 'Inst', color: '#1e90ff', level: null, over15: false, totalChars: 0 };
    }
    const rawLevel = Math.max(1, Math.ceil(totalChars / 100));
    const level    = Math.min(rawLevel, 15);
    const over15   = rawLevel > 15;
    let name, color;
    if      (level <= 3)  { name = 'BASIC';    color = '#00ac7e'; }
    else if (level <= 7)  { name = 'ADVANCED'; color = '#fc8207'; }
    else if (level <= 10) { name = 'EXPERT';   color = '#f22922'; }
    else if (level <= 12) { name = 'MASTER';   color = '#921cec'; }
    else                  { name = 'ULTIMA';   color = '#000000'; }
    return { isWorldsEnd: false, isInst: false, name, color, level, over15, totalChars };
}

function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ===== スタイル注入 =====
(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rainbow {
            0%   { color: #ff0000; }
            15%  { color: #ff7700; }
            30%  { color: #ffff00; }
            45%  { color: #00cc00; }
            60%  { color: #0099ff; }
            75%  { color: #8800cc; }
            90%  { color: #ff00aa; }
            100% { color: #ff0000; }
        }
        .rainbow-text { animation: rainbow 1.5s linear infinite; font-weight: bold; }
        #final-score, #final-rank { font-style: italic; }

        /* ===== 次ライン非表示 ===== */
        #next-line { display: none !important; }
        #japanese-line { display: none !important; }

        /* game-screen は display:none だと YT が読み込めないので visibility で隠す */
        #game-screen:not(.active) {
            display: block !important;
            visibility: hidden;
            pointer-events: none;
            position: fixed;
            top: -9999px; left: -9999px;
        }

        /* ===== Spotifyスタイル 歌詞スクロールパネル ===== */
        /* 動画上に重なるため常にダーク背景を維持 */
        #lyrics-scroll-panel {
            width: 100vw;
            margin-left: calc(-50vw + 50%);
            overflow: hidden;
            position: relative;
            height: clamp(160px, 28vh, 260px);
            background: rgba(0,0,0,0.55);
            mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%);
        }
        #lyrics-scroll-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: clamp(6px, 1.2vh, 14px);
            transition: transform 0.55s cubic-bezier(0.3, 0.8, 0.3, 1);
            will-change: transform;
        }
        .lyric-scroll-line {
            font-weight: bold;
            letter-spacing: 0.05em;
            text-align: center;
            white-space: nowrap;
            transition: font-size 0.45s ease, color 0.45s ease;
            line-height: 1.3;
            cursor: default;
            font-size: clamp(0.85rem, 1.9vw, 1.4rem);
            color: rgba(255,255,255,0.35);
            -webkit-text-stroke: 1px rgba(255,255,255,0.2);
            paint-order: stroke fill;
        }
        .lyric-scroll-line.past {
            font-size: clamp(0.85rem, 1.9vw, 1.4rem);
            color: rgba(255,255,255,0.25);
        }
        .lyric-scroll-line.active {
            font-size: clamp(1.6rem, 4.2vw, 3.2rem);
            color: #fff;
            -webkit-text-stroke: 2px rgba(255,255,255,0.6);
            paint-order: stroke fill;
            text-shadow: 0 0 20px rgba(255,255,255,0.3);
        }
        .lyric-scroll-line.near {
            font-size: clamp(1rem, 2.3vw, 1.7rem);
            color: rgba(255,255,255,0.6);
        }
        #lyrics-prelude-label {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: clamp(1.2rem, 2.5vw, 2rem);
            font-weight: bold;
            color: rgba(255,255,255,0.5);
            -webkit-text-stroke: 1px rgba(255,255,255,0.3);
            paint-order: stroke fill;
            letter-spacing: 0.3em;
            pointer-events: none;
            transition: opacity 0.4s ease;
        }

        /* ===== レスポンシブ ===== */
        #game-screen { font-size: clamp(11px, 1.3vw, 16px); }
        #romaji-line { font-size: clamp(1rem, 2.4vw, 1.8rem) !important; }
        #input-field { font-size: clamp(0.9rem, 1.8vw, 1.3rem) !important; width: 100% !important; }
        #score, #correct-count, #miss-count { font-size: clamp(0.8rem, 1.4vw, 1rem) !important; }
        #norma-gauge-text { font-size: clamp(0.7rem, 1.1vw, 0.9rem) !important; }

        /* ===== ノルマゲージ ===== */
        #norma-gauge-wrapper { position: relative; margin: 0 auto 10px; }
        #norma-top-bar {
            position: relative;
            height: 90px !important;
            background: var(--gauge-bg, rgba(0,0,0,0.5));
            overflow: hidden;
            margin-bottom: 3px;
        }
        #norma-top-fill {
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 0%;
            background: linear-gradient(to right, #164dac 0%, #164dac 55%, #1efdc6 85%, #ffffff 100%);
            transition: width 0.12s ease-out, background 0.3s ease;
            z-index: 1;
        }
        #norma-top-staff {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 2;
        }
        #norma-segs-row { display: flex; gap: 2px; align-items: flex-end; }
        .nseg {
            flex: 1;
            background: #474911;
            transform: skewX(-12deg);
            transition: background 0.25s ease;
        }
        .nseg.pre-norma { height: 40px !important; }
        .nseg.at-norma  { height: 63px !important; }
        #norma-segs-row .nseg:first-child { margin-left: 4px; }
        #norma-segs-row .nseg:last-child  { margin-right: 4px; }

        /* ===== スマホ ===== */
        @media (max-width: 768px) {
            .youtube-container { padding-bottom: 30% !important; max-width: 100% !important; }
            #lyrics-scroll-panel { height: clamp(100px, 18vh, 160px); }
            .lyric-scroll-line       { font-size: 0.78rem; }
            .lyric-scroll-line.near  { font-size: 0.95rem; }
            .lyric-scroll-line.active { font-size: clamp(1.2rem, 5vw, 2rem); }
            .score-display { padding: 8px 12px !important; font-size: 0.9rem !important; margin-bottom: 8px !important; }
            .combo-gauge-container { padding: 8px 10px !important; margin-bottom: 8px !important; }
            #romaji-line { font-size: 1rem !important; }
            .input-field { padding: 8px !important; font-size: 1rem !important; margin: 8px auto !important; }
            .lyrics-display { margin: 8px auto !important; }
        }

        /* ===== 確認画面レスポンシブ ===== */
        .confirm-box { padding: clamp(20px, 4vw, 44px) clamp(18px, 4vw, 48px) !important; }
        .confirm-diff-name { font-size: clamp(1.4rem, 3.5vw, 2.2rem) !important; }
        .confirm-stat-value { font-size: clamp(1.1rem, 2.5vw, 1.5rem) !important; }
        .song-item { font-size: clamp(0.82rem, 1.3vw, 1rem) !important; }

        /* ===== ALL JUSTICE ===== */
        #all-justice-overlay {
            position: fixed; inset: 0;
            display: flex; align-items: center; justify-content: center;
            pointer-events: none; z-index: 9999; opacity: 0;
        }
        #all-justice-text {
            font-style: italic; font-weight: 900;
            font-size: clamp(2rem, 6vw, 5rem);
            white-space: nowrap; letter-spacing: 0em;
        }
        @keyframes aj-appear  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes aj-fadeout { from { opacity: 1; } to { opacity: 0; } }

        /* ===== ソートUI ===== */
        .sort-bar {
            display: flex; gap: 6px; align-items: center;
            margin-bottom: 10px; flex-wrap: wrap;
        }
        .sort-label { font-size: 0.8em; color: var(--text3); margin-right: 2px; }
        .sort-btn {
            font-size: 0.78em; padding: 4px 14px;
            border-radius: 20px;
            border: 1px solid var(--border);
            background: transparent;
            color: var(--text3);
            cursor: pointer; transition: all 0.18s; font-weight: bold;
            font-family: inherit;
        }
        .sort-btn:hover { border-color: var(--text2); color: var(--text); }
        .sort-btn.active {
            background: var(--text);
            border-color: transparent;
            color: var(--bg);
        }

        /* ===== 曲選択バッジ ===== */
        .song-item {
            display: flex !important;
            align-items: center; justify-content: space-between; gap: 8px;
        }
        .song-item-title {
            flex: 1; min-width: 0;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .diff-badge {
            font-size: 0.68em; font-weight: 800;
            padding: 3px 10px; border-radius: 6px;
            color: #fff; white-space: nowrap;
            letter-spacing: 0.04em; flex-shrink: 0;
        }
        .diff-badge-ultima { background: #222 !important; border: 1px solid #555; color: #ccc; }
        .diff-badge-inst   { background: #1e90ff; }
        .diff-badge-we     { background: linear-gradient(90deg, #ff0000, #ff7700, #ffee00, #00cc00, #0099ff, #8800cc, #ff00aa); }

        /* ===== 確認画面 ===== */
        #confirm-screen {
            background: var(--confirm-overlay, rgba(0,0,0,0.82));
            display: none; align-items: center; justify-content: center;
        }
        #confirm-screen.active { display: flex !important; }
        .confirm-box {
            background: var(--surface, rgba(255,255,255,0.7));
            border: 1px solid var(--border);
            border-radius: 22px;
            padding: 44px 48px 40px;
            max-width: 500px; width: 90%;
            text-align: center;
            color: var(--text);
            box-shadow: 0 30px 80px var(--shadow, rgba(0,0,0,0.5));
            backdrop-filter: blur(16px);
        }
        .confirm-song-title {
            font-size: 1.3rem; font-weight: bold;
            color: var(--text); margin-bottom: 20px; line-height: 1.45;
        }
        .confirm-diff-name {
            display: block; font-size: 2.2rem; font-weight: 900;
            letter-spacing: 0.13em; margin-bottom: 4px;
        }
        .confirm-diff-we {
            background: linear-gradient(90deg, #ff0000, #ff7700, #ffee00, #00cc00, #0099ff, #8800cc, #ff00aa);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .confirm-diff-level { font-size: 1rem; color: var(--text3); margin-bottom: 24px; }
        .confirm-stats {
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 12px; margin-bottom: 30px;
        }
        .confirm-stat {
            background: var(--surface2, rgba(0,0,0,0.04));
            border: 1px solid var(--border2);
            border-radius: 12px; padding: 14px 10px;
        }
        .confirm-stat-label { font-size: 0.74rem; color: var(--text3); margin-bottom: 7px; }
        .confirm-stat-value { font-size: 1.5rem; font-weight: bold; color: var(--text); }
        .confirm-stat-unit  { font-size: 0.8rem; color: var(--text3); margin-left: 2px; }
        .confirm-btns { display: flex; gap: 10px; justify-content: center; }
        #btn-confirm-start {
            background: var(--text);
            color: var(--bg);
            border: none; padding: 13px 42px;
            border-radius: 50px; font-size: 1.1rem;
            font-weight: bold; cursor: pointer;
            transition: all 0.25s; letter-spacing: 0.05em;
            font-family: inherit;
        }
        #btn-confirm-start:hover:not(:disabled) {
            transform: translateY(-2px);
            opacity: 0.85;
        }
        #btn-confirm-start:disabled { opacity: 0.3; cursor: not-allowed; }
        #btn-confirm-back {
            background: transparent;
            color: var(--text3);
            border: 1px solid var(--border);
            padding: 13px 22px; border-radius: 50px;
            font-size: 0.95rem; cursor: pointer;
            transition: all 0.25s; font-family: inherit;
        }
        #btn-confirm-back:hover { background: var(--surface2); color: var(--text); }
        .confirm-loading { font-size: 0.78rem; color: var(--text3); margin-top: 14px; }

        /* ===== オートモード ===== */
        .confirm-automode {
            display: flex; align-items: center; justify-content: center;
            gap: 8px; margin-bottom: 18px; font-size: 0.9rem;
            color: var(--text3); cursor: pointer; user-select: none;
        }
        .confirm-automode input[type=checkbox] {
            width: 16px; height: 16px;
            accent-color: var(--text); cursor: pointer;
        }
        .confirm-automode:hover { color: var(--text); }

        /* ===== CLEARラベル ===== */
        #norma-clear-label {
            position: absolute; right: 8px; top: 50%;
            transform: translateY(-50%);
            font-size: 1.4rem; font-weight: 900;
            color: #ffe600;
            text-shadow: 0 0 12px #ffaa00, 0 0 24px #ff8800;
            letter-spacing: 0.12em; pointer-events: none;
            opacity: 0; transition: opacity 0.4s ease; z-index: 5;
        }

        /* ===== リザルト画像 ===== */
        #result-badges {
            display: flex; align-items: center; justify-content: center;
            gap: 16px; margin: 12px 0; width: 100%;
        }
        #result-badges img {
            height: auto; max-height: 120px; max-width: 200px;
            width: auto; object-fit: contain;
        }

        /* ===== 右上ゲーム情報オーバーレイ ===== */
        #game-info-overlay {
            position: fixed;
            top: 14px;
            right: 16px;
            z-index: 500;
            display: none;
            align-items: stretch;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.65);
            font-family: 'M PLUS 1p', sans-serif;
            min-width: 300px;
            max-width: 440px;
            height: 80px;
        }
        #game-info-overlay.visible { display: flex; }

        /* 難易度ブロック */
        #gio-diff {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 6px 22px;
            min-width: 130px;
            color: #fff;
            position: relative;
            overflow: hidden;
            flex-shrink: 0;
        }
        /* WORLD'S END: 斜めストライプ虹 */
        #gio-diff.we-bg {
            background:
                repeating-linear-gradient(
                    105deg,
                    #ff0000 0px,   #ff0000 18px,
                    #ff7700 18px,  #ff7700 36px,
                    #ffee00 36px,  #ffee00 54px,
                    #00cc00 54px,  #00cc00 72px,
                    #0099ff 72px,  #0099ff 90px,
                    #8800cc 90px,  #8800cc 108px,
                    #ff00aa 108px, #ff00aa 126px
                );
        }
        #gio-diff-label {
            font-size: 0.62rem;
            font-weight: 800;
            letter-spacing: 0.14em;
            opacity: 0.9;
            text-transform: uppercase;
            line-height: 1;
            margin-bottom: 2px;
            text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }
        #gio-diff-name {
            font-size: 1.3rem;
            font-weight: 900;
            letter-spacing: 0.05em;
            line-height: 1.1;
            text-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }
        #gio-diff-name.we-text {
            font-size: 1.05rem;
            letter-spacing: 0.02em;
        }
        #gio-speed-badge {
            font-size: 0.7rem;
            font-weight: 900;
            opacity: 0.92;
            letter-spacing: 0.05em;
            margin-top: 2px;
            line-height: 1;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }

        /* 曲名ブロック */
        #gio-title {
            flex: 1;
            background: rgba(0,0,0,0.82);
            color: #fff;
            padding: 0 14px;
            font-size: 0.9rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
        }

        /* レベルブロック（通常） */
        #gio-level {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #111;
            color: #fff;
            padding: 4px 16px;
            min-width: 64px;
            border-left: 1px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
        }
        #gio-level-label {
            font-size: 0.52rem;
            letter-spacing: 0.1em;
            opacity: 0.65;
            text-transform: uppercase;
            line-height: 1;
            margin-bottom: 2px;
        }
        #gio-level-num {
            font-size: 1.7rem;
            font-weight: 900;
            line-height: 1;
        }
        /* WE専用レベル */
        #gio-level.we-level {
            background: #1a1209;
            border-left-color: rgba(255,200,0,0.2);
            min-width: 72px;
        }
        #gio-level-we-stars {
            font-size: 1rem;
            letter-spacing: -3px;
            line-height: 1;
            margin-bottom: 2px;
        }
        #gio-level-we-char {
            font-size: 1.8rem;
            font-weight: 900;
            line-height: 1;
            color: #c8860a;
            text-shadow: 0 0 8px rgba(200,134,10,0.5);
        }

        /* ===== 録画・RECインジケーター ===== */
        #record-btn { display: none !important; }
        @keyframes rec-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(224,48,48,0.5); }
            50%       { box-shadow: 0 0 0 10px rgba(224,48,48,0); }
        }
        #record-indicator {
            position: fixed;
            top: 14px;
            right: 14px;
            z-index: 1000;
            display: none;
            align-items: center;
            gap: 6px;
            background: rgba(0,0,0,0.6);
            color: #fff;
            font-size: 0.78rem;
            font-weight: 700;
            padding: 5px 12px;
            border-radius: 20px;
            backdrop-filter: blur(6px);
            letter-spacing: 0.06em;
        }
        #record-indicator.on { display: flex; }
        #rec-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: #ff4444;
            animation: rec-pulse 1.2s ease-in-out infinite;
        }
        #result-download-wrap { margin-top: 16px; }
        #result-download-btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 10px 28px; border-radius: 50px;
            border: 1px solid var(--border);
            background: var(--surface); color: var(--text);
            font-size: 0.95rem; font-weight: 700; cursor: pointer;
            text-decoration: none; transition: all 0.2s; font-family: inherit;
        }
        #result-download-btn:hover { background: var(--surface2); transform: translateY(-2px); }
        .btn-edit {
            background: var(--surface2); color: var(--text2);
            border: 1px solid var(--border); border-radius: 6px;
            padding: 2px 10px; font-size: 0.78em; cursor: pointer;
            font-family: inherit;
        }
        .btn-edit:hover { background: var(--surface); color: var(--text); }
    `;
    document.head.appendChild(style);
})();

// ===== 確認画面 DOM 注入 =====
function injectConfirmScreen() {
    const div = document.createElement('div');
    div.id = 'confirm-screen';
    div.className = 'screen';
    div.innerHTML = `
        <div id="confirm-yt-player" style="position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;overflow:hidden;"></div>
        <div class="confirm-box">
            <div class="confirm-song-title" id="cs-title"></div>
            <div id="cs-diff-area">
                <span class="confirm-diff-name" id="cs-diff-name"></span>
                <div class="confirm-diff-level" id="cs-diff-level"></div>
            </div>
            <div class="confirm-stats">
                <div class="confirm-stat">
                    <div class="confirm-stat-label">総打数</div>
                    <div class="confirm-stat-value">
                        <span id="cs-total">---</span>
                        <span class="confirm-stat-unit">打</span>
                    </div>
                </div>
                <div class="confirm-stat">
                    <div class="confirm-stat-label">曲の長さ</div>
                    <div class="confirm-stat-value" id="cs-duration">---</div>
                </div>
                <div class="confirm-stat">
                    <div class="confirm-stat-label">必要平均タイプ速度</div>
                    <div class="confirm-stat-value">
                        <span id="cs-speed">---</span>
                        <span class="confirm-stat-unit" id="cs-speed-unit"></span>
                    </div>
                </div>
                <div class="confirm-stat">
                    <div class="confirm-stat-label">ライン数</div>
                    <div class="confirm-stat-value">
                        <span id="cs-lines">---</span>
                        <span class="confirm-stat-unit">行</span>
                    </div>
                </div>
            </div>
            <label class="confirm-automode">
                <input type="checkbox" id="cb-automode">
                オートモード（自動入力）
            </label>
            <label class="confirm-automode">
                <input type="checkbox" id="cb-record" onchange="onRecordCheckChange(this)">
                画面録画
            </label>
            <label class="confirm-automode" id="speed-row" style="flex-direction:column;gap:6px;">
                <span style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="cb-speed" onchange="onSpeedCheckChange(this)">
                    倍速モード
                </span>
                <select id="speed-select" style="display:none;padding:4px 10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-size:0.9rem;cursor:pointer;">
                    ${Array.from({length:36},(_,i)=>{ const v=(0.25+i*0.05).toFixed(2); return `<option value="${v}"${v==='1.00'?' selected':''}>${v}x</option>`; }).join('')}
                </select>
            </label>
            <div class="confirm-btns">
                <button id="btn-confirm-start" disabled onclick="startGameFromConfirm()">▶ スタート</button>
                <button id="btn-confirm-back" onclick="showSongSelect()">戻る</button>
            </div>
            <div class="confirm-loading" id="cs-loading">YouTube 読み込み中…</div>
        </div>
    `;
    document.body.appendChild(div);
}

// ===== 初期化 =====
window.addEventListener('DOMContentLoaded', () => {
    injectConfirmScreen();
    injectSortUI();
    injectAllJusticeOverlay();
    injectRecordUI();
    setupAudio();
    setupEventListeners();
    createSongList();

    window.addEventListener('resize', () => {
        const ytContainer = document.querySelector('.youtube-container');
        const wrapper = document.getElementById('norma-gauge-wrapper');
        if (ytContainer && wrapper) {
            wrapper.style.width = ytContainer.offsetWidth + 'px';
        }
        drawNormaStaff();
    });
});

// ===== 録画UI注入 =====
function injectRecordUI() {
    // 録画ボタン（確認画面チェックボックスに移行したため非表示）
    const btn = document.createElement('button');
    btn.id = 'record-btn';
    btn.title = '画面録画';
    btn.innerHTML = '⏺';
    btn.onclick = toggleRecording;
    document.body.appendChild(btn);

    // REC インジケーター
    const ind = document.createElement('div');
    ind.id = 'record-indicator';
    ind.innerHTML = '<div id="rec-dot"></div>REC';
    document.body.appendChild(ind);

    // 右上ゲーム情報オーバーレイ
    const gio = document.createElement('div');
    gio.id = 'game-info-overlay';
    gio.innerHTML = `
        <div id="gio-diff">
            <div id="gio-diff-label">DIFFICULTY</div>
            <div id="gio-diff-name">MASTER</div>
        </div>
        <div id="gio-title">曲名</div>
        <div id="gio-level">
            <div id="gio-level-label">LEVEL</div>
            <div id="gio-level-num">15<sup style="font-size:0.6em">+</sup></div>
        </div>
    `;
    document.body.appendChild(gio);
}

// 録画チェックボックス
async function onRecordCheckChange(cb) {
    if (cb.checked) {
        await startRecording();
        if (!recordingActive) cb.checked = false; // キャンセルされたら戻す
    } else {
        stopRecording();
    }
}

// 倍速チェックボックス
function onSpeedCheckChange(cb) {
    const sel = document.getElementById('speed-select');
    if (sel) sel.style.display = cb.checked ? 'block' : 'none';
}

// ゲーム情報オーバーレイ更新
function updateGameInfoOverlay(show) {
    const gio = document.getElementById('game-info-overlay');
    if (!gio) return;
    if (!show || !currentSong) {
        gio.classList.remove('visible');
        return;
    }
    const diff = getDifficultyInfo(currentSong);
    const gioDiv   = document.getElementById('gio-diff');
    const gioName  = document.getElementById('gio-diff-name');
    const gioSpeed = document.getElementById('gio-speed-badge');
    const gioLevel = document.getElementById('gio-level');

    if (diff.isWorldsEnd) {
        // --- WORLD'S END ---
        gioDiv.className = 'we-bg';
        gioDiv.style.background = '';
        gioName.className = 'we-text';
        gioName.textContent = "WORLD'S END";

        // レベル欄: 星 + WEキャラ
        const weStars = '★'.repeat(diff.weStars || 0) + '☆'.repeat(Math.max(0, 3 - (diff.weStars || 0)));
        gioLevel.className = 'we-level';
        gioLevel.innerHTML = `
            <div id="gio-level-we-stars">${weStars}</div>
            <div id="gio-level-we-char">${diff.weChar || '？'}</div>
        `;
    } else if (diff.isInst) {
        // --- Inst ---
        gioDiv.className = '';
        gioDiv.style.background = '#1e90ff';
        gioName.className = '';
        gioName.textContent = 'Inst';
        gioLevel.className = '';
        gioLevel.innerHTML = `
            <div id="gio-level-label">LEVEL</div>
            <div id="gio-level-num">—</div>
        `;
    } else {
        // --- 通常難易度 ---
        gioDiv.className = '';
        gioDiv.style.background = diff.color || '#555';
        gioName.className = '';
        gioName.textContent = diff.name;
        const lvHtml = diff.over15
            ? '15<sup style="font-size:0.55em;vertical-align:top">+</sup>'
            : String(diff.level ?? '—');
        gioLevel.className = '';
        gioLevel.innerHTML = `
            <div id="gio-level-label">LEVEL</div>
            <div id="gio-level-num">${lvHtml}</div>
        `;
    }

    // 倍速バッジ
    if (gioSpeed) {
        if (playbackSpeed && playbackSpeed !== 1.0) {
            gioSpeed.textContent = `×${playbackSpeed.toFixed(2).replace(/\.?0+$/, '')}`;
            gioSpeed.style.display = '';
        } else {
            gioSpeed.style.display = 'none';
        }
    }

    document.getElementById('gio-title').textContent = currentSong.title || '';
    gio.classList.add('visible');
}

async function toggleRecording() {
    if (recordingActive) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                frameRate: { ideal: 60, max: 60 },
                width:     { ideal: 1920 },
                height:    { ideal: 1080 },
            },
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                sampleRate: 48000,
                sampleSize: 16,
            },
            preferCurrentTab: true,
            selfBrowserSurface: 'include',
            surfaceSwitching: 'exclude',
            monitorTypeSurfaces: 'exclude',
        });

        recordedChunks = [];

        // 最高画質のコーデックを選ぶ
        const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4',
        ];
        const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';

        mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 12_000_000,  // 12 Mbps
            audioBitsPerSecond:    320_000,  // 320 kbps
        });
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = onRecordingStop;
        stream.getVideoTracks()[0].onended = stopRecording;

        mediaRecorder.start(100);
        recordingActive = true;

        document.getElementById('record-btn').classList.add('recording');
        document.getElementById('record-btn').innerHTML = '⏹';
        document.getElementById('record-indicator').classList.add('on');
    } catch (e) {
        console.warn('録画開始失敗:', e);
    }
}

function stopRecording() {
    if (!mediaRecorder || !recordingActive) return;
    recordingActive = false;
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());

    document.getElementById('record-btn').classList.remove('recording');
    document.getElementById('record-btn').innerHTML = '⏺';
    document.getElementById('record-indicator').classList.remove('on');
}

function onRecordingStop() {
    if (recordedChunks.length === 0) return;
    const mimeType = mediaRecorder.mimeType || 'video/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const songName = currentSong?.title || 'recording';
    const filename = `${songName}.${ext}`;

    // リザルト画面にダウンロードボタンを出す（または即ダウンロード）
    let wrap = document.getElementById('result-download-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'result-download-wrap';
        const rc = document.querySelector('.result-buttons');
        if (rc) rc.parentNode.insertBefore(wrap, rc);
        else document.querySelector('.result-content')?.appendChild(wrap);
    }
    wrap.innerHTML = `<a id="result-download-btn" href="${url}" download="${filename}">⬇ 録画をダウンロード（${ext.toUpperCase()}）</a>`;
    recordedChunks = [];
}

function onYouTubeIframeAPIReady() {
    console.log('YouTube API 準備完了');
}

function setupAudio() {
    typingSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%82%BF%E3%82%A4%E3%83%94%E3%83%B3%E3%82%B0-%E3%83%91%E3%83%B3%E3%82%BF%E3%82%B0%E3%83%A9%E3%83%95%E5%8D%982.mp3');
    typingSound.volume = 0.2;
    missSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%83%9F%E3%82%B9.mp3');
    missSound.volume = 0.3;
    bonusSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/mario-1up_eSTTTOB.mp3');
    bonusSound.volume = 0.4;
    allJusticeSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/ALL%20JUSTICE.m4a');
    allJusticeSound.volume = 1.0;
}

function setupEventListeners() {
    const inp = document.getElementById('input-field');
    if (inp) inp.addEventListener('input', handleInput);
}

function injectAllJusticeOverlay() {
    const div = document.createElement('div');
    div.id = 'all-justice-overlay';
    const txt = document.createElement('div');
    txt.id = 'all-justice-text';

    // 1文字ずつ span に分けてグラデーション
    const chars = 'ALL JUSTICE'.split('');
    const nonSpaceChars = chars.filter(c => c !== ' ').length;
    let colorIdx = 0;
    chars.forEach((ch) => {
        const span = document.createElement('span');
        if (ch === ' ') {
            span.textContent = '\u2002'; // en-space
            span.style.letterSpacing = '0';
        } else {
            span.textContent = ch;
            const t = nonSpaceChars > 1 ? colorIdx / (nonSpaceChars - 1) : 0;
            const r = Math.round(0x66 + (0xD5 - 0x66) * t);
            const g = Math.round(0xFF + (0x40 - 0xFF) * t);
            const b = Math.round(0xDF + (0xBB - 0xDF) * t);
            span.style.color = `rgb(${r},${g},${b})`;
            span.style.textShadow = `0 0 20px rgba(${r},${g},${b},0.7)`;
            colorIdx++;
        }
        txt.appendChild(span);
    });

    div.appendChild(txt);
    document.body.appendChild(div);
}

function showAllJustice() {
    const overlay = document.getElementById('all-justice-overlay');
    const txt = document.getElementById('all-justice-text');
    if (!overlay || !txt) return;

    // リセット
    overlay.style.animation = 'none';
    txt.style.letterSpacing = '0em';
    overlay.style.opacity = '0';
    void overlay.offsetWidth;

    // 出現（0.1秒）
    overlay.style.animation = 'aj-appear 0.1s ease forwards';

    // 4秒かけて字間隔を広げる（75px相当）
    const startTime = performance.now();
    const duration = 4000;
    let rafId;
    const expand = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        txt.style.letterSpacing = `${t * 0.35}em`;
        if (t < 1) {
            rafId = requestAnimationFrame(expand);
        } else {
            // 4秒後に0.1秒でフェードアウト
            overlay.style.animation = 'aj-fadeout 0.1s ease forwards';
        }
    };
    rafId = requestAnimationFrame(expand);
}

// ===== ソートUI注入 =====
function injectSortUI() {
    const songList = document.getElementById('song-list');
    if (!songList || document.getElementById('sort-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'sort-bar';
    bar.className = 'sort-bar';
    bar.innerHTML = `
        <span class="sort-label">並び替え:</span>
        <button class="sort-btn active" id="sort-btn-default" onclick="setSortOrder('default')">追加順</button>
        <button class="sort-btn"        id="sort-btn-diff"    onclick="setSortOrder('difficulty')">難易度順</button>
    `;
    songList.parentNode.insertBefore(bar, songList);
}

function setSortOrder(order) {
    songSortOrder = order;
    document.getElementById('sort-btn-default').classList.toggle('active', order === 'default');
    document.getElementById('sort-btn-diff').classList.toggle('active',    order === 'difficulty');
    createSongList();
}

// ===== 曲リスト（難易度バッジ付き） =====
function createSongList() {
    const songList = document.getElementById('song-list');
    if (!songList) return;
    songList.innerHTML = '';

    // ソート
    let songs = [...SONGS];
    if (songSortOrder === 'difficulty') {
        songs.sort((a, b) => {
            const da = getDifficultyInfo(a);
            const db = getDifficultyInfo(b);
            // WE → 末尾、Inst → その前
            const rank = d => d.isWorldsEnd ? 9999 : d.isInst ? 9998 : (d.over15 ? 9997 : (d.level ?? 0));
            return rank(da) - rank(db);
        });
    }

    songs.forEach(song => {
        const diff = getDifficultyInfo(song);
        const item = document.createElement('div');
        item.className = 'song-item';
        item.onclick = () => selectSong(song);

        const titleSpan = document.createElement('span');
        titleSpan.className = 'song-item-title';
        titleSpan.textContent = song.title;

        const badge = document.createElement('span');
        badge.className = 'diff-badge';
        if (diff.isWorldsEnd) {
            badge.classList.add('diff-badge-we');
            badge.textContent = `WORLD'S END 「${diff.weChar}」`;
        } else if (diff.isInst) {
            badge.classList.add('diff-badge-inst');
            badge.textContent = 'Inst';
        } else {
            badge.style.background = diff.color;
            if (diff.name === 'ULTIMA') badge.classList.add('diff-badge-ultima');
            const lvLabel = diff.over15 ? '15+' : diff.level;
            badge.innerHTML = `${diff.name} Lv.${lvLabel}`;
        }

        item.appendChild(titleSpan);
        item.appendChild(badge);
        songList.appendChild(item);
    });
}

// ===== 画面切り替え =====
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const t = document.getElementById(id);
    if (t) t.classList.add('active');
}

function showTitleScreen() { switchScreen('title-screen'); }

function showSongSelect() {
    if (player) { try { player.pauseVideo(); } catch(e){} }
    updateGameInfoOverlay(false);
    // 録画チェックを外して停止
    const cbRec = document.getElementById('cb-record');
    if (cbRec) cbRec.checked = false;
    if (recordingActive) stopRecording();
    switchScreen('song-select-screen');
}

// ===== 曲選択 → 確認画面 =====
function selectSong(song) {
    currentSong = song;
    showConfirmScreen(song);
}

function showConfirmScreen(song) {
    const diff = getDifficultyInfo(song);

    document.getElementById('cs-title').textContent = song.title;

    // 難易度名・色
    const dnEl = document.getElementById('cs-diff-name');
    if (diff.isWorldsEnd) {
        dnEl.className = 'confirm-diff-name confirm-diff-we';
        dnEl.style.color = '';
        dnEl.textContent = `WORLD'S END 「${diff.weChar}」`;
    } else if (diff.isInst) {
        dnEl.className = 'confirm-diff-name';
        dnEl.style.color = '#1e90ff';
        dnEl.textContent = 'Inst';
    } else {
        dnEl.className = 'confirm-diff-name';
        dnEl.style.color = diff.color;
        dnEl.textContent = diff.name;
    }

    const lvLabel = diff.over15 ? '15<sup>+</sup>' : diff.level;
    const dlEl = document.getElementById('cs-diff-level');
    if (diff.isWorldsEnd || diff.isInst) {
        dlEl.innerHTML = '';
    } else {
        dlEl.innerHTML = `Lv. ${lvLabel}`;
    }

    // 総打数・ライン数
    document.getElementById('cs-total').textContent =
        (diff.isWorldsEnd || diff.isInst) ? '---' : diff.totalChars;
    document.getElementById('cs-lines').textContent =
        (song.lyrics && !diff.isWorldsEnd && !diff.isInst) ? song.lyrics.length : '---';

    // 長さ・速度はロード後
    document.getElementById('cs-duration').textContent  = '---';
    document.getElementById('cs-speed').textContent     = '---';
    document.getElementById('cs-speed-unit').textContent = '';
    document.getElementById('cs-loading').style.display = '';
    document.getElementById('btn-confirm-start').disabled = true;

    switchScreen('confirm-screen');
    updateGameInfoOverlay(true);

    // YT プレイヤーを confirm-yt-player（画面外）に生成して duration を取得
    if (player) { try { player.destroy(); } catch(e){} player = null; }
    player = new YT.Player('confirm-yt-player', {
        height: '100%', width: '100%',
        videoId: song.youtubeId,
        host: 'https://www.youtube.com',
        playerVars: {
            autoplay: 0, controls: 0, disablekb: 1, fs: 0,
            modestbranding: 1, rel: 0, iv_load_policy: 3,
            cc_load_policy: 0, playsinline: 1, enablejsapi: 1,
            origin: window.location.origin
        },
        events: {
            onReady: onConfirmPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

function onConfirmPlayerReady(event) {
    let attempts = 0;
    const tryGetDuration = () => {
        const duration = event.target.getDuration();
        if (duration > 0 || attempts++ >= 20) {
            gameState.totalDuration = duration;
            // 曲長さは全タイプで表示
            document.getElementById('cs-duration').textContent = duration > 0 ? formatDuration(duration) : '---';
            const diff = getDifficultyInfo(currentSong);
            // 平均速度は通常曲のみ
            if (!diff.isWorldsEnd && !diff.isInst && duration > 0 && diff.totalChars > 0) {
                document.getElementById('cs-speed').textContent      = (diff.totalChars / duration).toFixed(2);
                document.getElementById('cs-speed-unit').textContent = '打/秒';
            }
            document.getElementById('btn-confirm-start').disabled = false;
            document.getElementById('cs-loading').style.display   = 'none';
        } else {
            setTimeout(tryGetDuration, 300);
        }
    };
    tryGetDuration();
}

// ===== 確認画面からゲーム開始 =====
function startGameFromConfirm() {
    autoMode = document.getElementById('cb-automode')?.checked || false;

    // 倍速
    const cbSpeed = document.getElementById('cb-speed');
    const selSpeed = document.getElementById('speed-select');
    playbackSpeed = (cbSpeed?.checked && selSpeed) ? parseFloat(selSpeed.value) : 1.0;

    // confirm用プレイヤーを破棄
    if (player) { try { player.destroy(); } catch(e){} player = null; }

    switchScreen('game-screen');
    initGame();

    // オートモードは入力欄を非表示
    const inp = document.getElementById('input-field');
    if (inp) inp.style.display = autoMode ? 'none' : '';

    // game-screen が visible になったので youtube-player に新規作成
    player = new YT.Player('youtube-player', {
        height: '100%', width: '100%',
        videoId: currentSong.youtubeId,
        host: 'https://www.youtube.com',
        playerVars: {
            autoplay: 1, controls: 0, disablekb: 1, fs: 0,
            modestbranding: 1, rel: 0, iv_load_policy: 3,
            cc_load_policy: 0, playsinline: 1, enablejsapi: 1,
            origin: window.location.origin
        },
        events: {
            onReady: (e) => {
                e.target.seekTo(0);
                e.target.setPlaybackRate(playbackSpeed);
                e.target.playVideo();
                startTracking();
            },
            onStateChange: onPlayerStateChange
        }
    });
}

// ===== ゲーム初期化 =====
function initGame() {
    const savedDuration = gameState.totalDuration;
    gameState = {
        score: 0, correctCount: 0, missCount: 0, missedLines: 0,
        currentRomaji: [], currentCharIndex: 0, currentCharPosition: 0,
        totalKeystrokes: 0, lineTypedChars: 0,
        totalLyricChars: 0, totalNorma: 0, totalTypedChars: 0,
        completedCurrentLine: false, completedUnits: 0, totalUnits: 0,
        totalDuration: savedDuration
    };
    activeColor = null;
    currentLyricIndex = 0;
    startTime = Date.now();

    if (currentSong && currentSong.lyrics && currentSong.lyrics.length > 0) {
        let totalChars = 0, totalUnits = 0;
        currentSong.lyrics.forEach(lyric => {
            const ra = convertToRomaji(lyric.kana);
            totalUnits += ra.length;
            totalChars += ra.reduce((s, c) => s + c.current.length, 0);
        });
        gameState.totalLyricChars = totalChars;
        gameState.totalNorma = Math.ceil(totalChars * 0.4);
        gameState.totalUnits = totalUnits;
    }

    const jl = document.getElementById('japanese-line');
    if (jl) { jl.textContent = ''; jl.style.color = ''; jl.className = ''; }
    buildNormaGauge();
    buildLyricScrollPanel();
    const nl = document.getElementById('next-line');
    if (nl) nl.textContent = '';
    const rl = document.getElementById('romaji-line');
    if (rl) rl.innerHTML = '';

    updateScore();
    updateNormaGauge();

    const inp = document.getElementById('input-field');
    if (inp) { inp.value = ''; inp.disabled = true; }
}

// ===== 歌詞追跡 =====
function startTracking() {
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => {
        if (!player || typeof player.getCurrentTime !== 'function') return;
        const t = player.getCurrentTime();

        if (!currentSong.lyrics || currentSong.lyrics.length === 0) {
            if (gameState.totalDuration > 0) {
                gameState.score = Math.floor((t / gameState.totalDuration) * 1010000);
                updateScore();
                const jl = document.getElementById('japanese-line');
                if (jl) jl.textContent = '歌詞無し';
            }
            return;
        }
        checkLyricTiming(t);
    }, 10);
}

function checkLyricTiming(t) {
    if (!currentSong || !currentSong.lyrics) return;
    if (currentLyricIndex < currentSong.lyrics.length) {
        const lyric = currentSong.lyrics[currentLyricIndex];
        if (t >= lyric.time) {
            if (currentLyricIndex > 0 && !gameState.completedCurrentLine) {
                if (autoMode) {
                    // オートモード：未打鍵分を全部強制完了
                    autoTypeTimers.forEach(t => clearTimeout(t));
                    autoTypeTimers = [];
                    while (gameState.currentCharIndex < gameState.currentRomaji.length) {
                        const cur = gameState.currentRomaji[gameState.currentCharIndex];
                        const remaining = cur.current.length - gameState.currentCharPosition;
                        gameState.correctCount        += remaining;
                        gameState.totalKeystrokes     += remaining;
                        gameState.totalTypedChars     += remaining;
                        gameState.lineTypedChars      += remaining;
                        gameState.completedUnits++;
                        gameState.score = gameState.totalUnits > 0
                            ? Math.floor(gameState.completedUnits * 1010000 / gameState.totalUnits) : 0;
                        gameState.currentCharIndex++;
                        gameState.currentCharPosition = 0;
                    }
                    gameState.completedCurrentLine = true;
                } else {
                    gameState.missedLines++;
                }
            }
            loadLyric(lyric);
            currentLyricIndex++;
            gameState.completedCurrentLine = false;
        }
    }
}

// ===== 歌詞スクロールパネル構築 =====
function buildLyricScrollPanel() {
    // 既存パネルを削除してリセット
    const old = document.getElementById('lyrics-scroll-panel');
    if (old) old.remove();

    const jl = document.getElementById('japanese-line');
    if (!jl) return;

    // パネルを japanese-line の親に挿入
    const panel = document.createElement('div');
    panel.id = 'lyrics-scroll-panel';
    const inner = document.createElement('div');
    inner.id = 'lyrics-scroll-inner';
    panel.appendChild(inner);
    jl.parentNode.insertBefore(panel, jl);

    // 前奏ラベル
    const prelude = document.createElement('div');
    prelude.id = 'lyrics-prelude-label';
    prelude.textContent = '前奏';
    panel.appendChild(prelude);

    if (!currentSong || !currentSong.lyrics || currentSong.lyrics.length === 0) return;

    currentSong.lyrics.forEach((lyric, i) => {
        const el = document.createElement('div');
        el.className = 'lyric-scroll-line';
        el.id = `lsl-${i}`;
        el.textContent = lyric.text;
        inner.appendChild(el);
    });

    // 各ラインの色を事前計算して適用
    let preColor = null;
    currentSong.lyrics.forEach((lyric, i) => {
        if (lyric.colorStart) preColor = lyric.colorStart;
        const el = document.getElementById(`lsl-${i}`);
        if (el && preColor) el.dataset.color = preColor;
        if (lyric.colorEnd) preColor = null;
    });

    // 初期状態: 歌詞をパネルの直下に隠す
    // offsetHeightが0になる場合に備えて大きめの値でフォールバック
    const panelH = panel.offsetHeight || 260;
    inner.style.transition = 'none';
    inner.style.transform = `translateY(${panelH + 40}px)`;
    void inner.offsetWidth;
    inner.style.transition = '';
}

function updateLyricScroll(idx) {
    const inner = document.getElementById('lyrics-scroll-inner');
    const panel = document.getElementById('lyrics-scroll-panel');
    if (!inner || !panel || !currentSong.lyrics) return;

    const lines = inner.querySelectorAll('.lyric-scroll-line');
    lines.forEach((el, i) => {
        el.className = 'lyric-scroll-line';
        if (i < idx)            el.classList.add('past');
        else if (i === idx)     el.classList.add('active');
        else if (i === idx + 1 || i === idx - 1) el.classList.add('near');
        el.style.color = el.dataset.color || '';
    });

    // 歌詞が始まったら前奏ラベルを消す
    const prelude = document.getElementById('lyrics-prelude-label');
    if (prelude) prelude.style.opacity = '0';

    const activeEl = document.getElementById(`lsl-${idx}`);
    if (!activeEl) return;
    const panelH = panel.offsetHeight;
    const offset = activeEl.offsetTop + activeEl.offsetHeight / 2 - panelH / 2;
    inner.style.transform = `translateY(${-offset}px)`;
}

function loadLyric(lyric) {
    // 前の自動タイプタイマーをキャンセル
    autoTypeTimers.forEach(t => clearTimeout(t));
    autoTypeTimers = [];

    if (lyric.colorStart) activeColor = lyric.colorStart;

    gameState.currentRomaji       = convertToRomaji(lyric.kana);
    gameState.currentCharIndex    = 0;
    gameState.currentCharPosition = 0;
    gameState.lineTypedChars      = 0;

    // スクロールパネル更新（currentLyricIndex はこの時点でまだ+1前）
    updateLyricScroll(currentLyricIndex);

    const inp = document.getElementById('input-field');
    const hasKana = lyric.kana && lyric.kana.length > 0;

    if (!hasKana) {
        const rl = document.getElementById('romaji-line');
        if (rl) rl.innerHTML = '';
        if (inp) { inp.value = ''; inp.disabled = true; }
        gameState.completedCurrentLine = true;
    } else {
        displayRomaji();
        updateNormaGauge();
        if (!autoMode && inp) { inp.disabled = false; inp.focus(); }

        if (autoMode) {
            // 次の歌詞の開始時間を取得してウィンドウを計算
            const nextLyric = currentSong.lyrics[currentLyricIndex + 1];
            const windowEnd = nextLyric
                ? nextLyric.time
                : (gameState.totalDuration || lyric.time + 3);
            const windowMs = Math.min(5000, Math.max(200, (windowEnd - lyric.time) * 0.75 * 1000 / playbackSpeed));

            // 総キーストローク数を計算
            const totalKeys = gameState.currentRomaji.reduce((s, c) => s + c.current.length, 0);
            if (totalKeys > 0) {
                const interval = windowMs / totalKeys;
                scheduleAutoType(0, interval);
            }
        }
    }

    if (lyric.colorEnd) activeColor = null;
}

function scheduleAutoType(keyIndex, interval) {
    const t = setTimeout(() => {
        if (gameState.completedCurrentLine) return;
        const cur = gameState.currentRomaji[gameState.currentCharIndex];
        if (!cur) return;

        // 1文字進める
        gameState.currentCharPosition++;
        gameState.correctCount++;
        gameState.totalKeystrokes++;
        gameState.totalTypedChars++;
        gameState.lineTypedChars++;
        playTypingSound();

        if (gameState.currentCharPosition >= cur.current.length) {
            gameState.completedUnits++;
            gameState.score = gameState.totalUnits > 0
                ? Math.floor(gameState.completedUnits * 1010000 / gameState.totalUnits) : 0;
            gameState.currentCharIndex++;
            gameState.currentCharPosition = 0;
        }

        updateScore();
        updateNormaGauge();

        if (gameState.currentCharIndex >= gameState.currentRomaji.length) {
            gameState.completedCurrentLine = true;
            displayRomaji();
            if (gameState.missCount === 0 && gameState.completedUnits >= gameState.totalUnits) {
                playAllJusticeSound();
                showAllJustice();
            }
        } else {
            displayRomaji();
            scheduleAutoType(keyIndex + 1, interval);
        }
    }, interval);
    autoTypeTimers.push(t);
}

// ===== ローマ字変換 =====
function convertToRomaji(kana) {
    const result = [];
    let i = 0;
    while (i < kana.length) {
        if (kana[i] === 'っ' && i + 1 < kana.length) {
            const nxt = ROMAJI_TABLE[kana[i + 1]];
            if (nxt && nxt[0]) {
                result.push({ options: [nxt[0][0], 'xtu', 'ltu'], current: nxt[0][0] });
                i++; continue;
            }
        }
        if (i + 1 < kana.length) {
            const combo = kana[i] + kana[i + 1];
            if (COMBO_ROMAJI[combo]) {
                result.push({ options: COMBO_ROMAJI[combo], current: COMBO_ROMAJI[combo][0] });
                i += 2; continue;
            }
        }
        if (kana[i] === 'ん') {
            result.push(i === kana.length - 1
                ? { options: ['nn'], current: 'nn' }
                : { options: ['n', 'nn'], current: 'n' });
            i++; continue;
        }
        const ch = kana[i];
        if (ROMAJI_TABLE[ch]) {
            result.push({ options: ROMAJI_TABLE[ch], current: ROMAJI_TABLE[ch][0] });
        }
        i++;
    }
    return result;
}

// ===== ローマ字表示 =====
function displayRomaji() {
    const el = document.getElementById('romaji-line');
    if (!el) return;
    let html = '';
    for (let i = 0; i < gameState.currentRomaji.length; i++) {
        const r = gameState.currentRomaji[i].current;
        for (let j = 0; j < r.length; j++) {
            if (i < gameState.currentCharIndex)
                html += `<span class="correct">${r[j]}</span>`;
            else if (i === gameState.currentCharIndex) {
                if (j < gameState.currentCharPosition)
                    html += `<span class="correct">${r[j]}</span>`;
                else if (j === gameState.currentCharPosition)
                    html += `<span class="current">${r[j]}</span>`;
                else
                    html += `<span class="remaining">${r[j]}</span>`;
            } else {
                html += `<span class="remaining">${r[j]}</span>`;
            }
        }
    }
    el.innerHTML = html;
}

// ===== 入力処理 =====
function handleInput(e) {
    const input = e.target.value.toLowerCase();
    if (input.length === 0 || gameState.currentCharIndex >= gameState.currentRomaji.length) return;

    const cur = gameState.currentRomaji[gameState.currentCharIndex];
    const exp = cur.current.substring(gameState.currentCharPosition);
    let matched = false;

    const applyMatch = (len, option) => {
        if (option) cur.current = option;
        gameState.currentCharPosition += len;
        gameState.correctCount        += len;
        gameState.totalKeystrokes     += len;
        gameState.totalTypedChars     += len;
        gameState.lineTypedChars      += len;
        playTypingSound();
        if (gameState.currentCharPosition >= cur.current.length) {
            gameState.completedUnits++;
            gameState.score = gameState.totalUnits > 0
                ? Math.floor(gameState.completedUnits * 1010000 / gameState.totalUnits) : 0;
            gameState.currentCharIndex++;
            gameState.currentCharPosition = 0;
        }
    };

    if (exp.startsWith(input)) {
        matched = true;
        applyMatch(input.length, null);
    } else {
        for (const opt of cur.options) {
            const oe = opt.substring(gameState.currentCharPosition);
            if (oe.startsWith(input)) {
                matched = true;
                applyMatch(input.length, opt);
                break;
            }
        }
    }

    if (matched) {
        e.target.value = '';
        updateScore();
        updateNormaGauge();
        if (gameState.currentCharIndex >= gameState.currentRomaji.length) {
            gameState.completedCurrentLine = true;
            e.target.disabled = true;
            // 最後のユニットを打ち終えた瞬間、ミス0なら ALL JUSTICE
            if (gameState.missCount === 0 && gameState.completedUnits >= gameState.totalUnits) {
                playAllJusticeSound();
                showAllJustice();
            }
        } else {
            displayRomaji();
        }
    } else {
        gameState.missCount++;
        gameState.totalKeystrokes++;
        gameState.totalTypedChars = Math.max(0, gameState.totalTypedChars - 1);
        playMissSound();
        e.target.value = '';
        updateScore();
        updateNormaGauge();
    }
}

// ===== スコア更新 =====
function updateScore() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('score', gameState.score);
    set('correct-count', gameState.correctCount);
    set('miss-count', gameState.missCount);
}

// ===== ノルマゲージ構築 =====
function buildNormaGauge() {
    const container = document.querySelector('.combo-gauge-container');
    if (!container) return;

    const totalChars = gameState.totalLyricChars;
    const charsPerSeg = totalChars > 0 ? totalChars / 10 : 100;
    const normaSegs = Math.max(1, Math.min(10, Math.round(gameState.totalNorma / charsPerSeg)));

    const segsHtml = Array.from({length: 10}, (_, i) => {
        const cls = i < normaSegs - 1 ? 'pre-norma' : 'at-norma';
        return `<div class="nseg ${cls}" id="nseg-${i}"></div>`;
    }).join('');

    container.innerHTML = `
        <div id="norma-gauge-wrapper">
            <div id="norma-top-bar">
                <div id="norma-top-fill"></div>
                <svg id="norma-top-staff" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"></svg>
                <div id="norma-clear-label">CLEAR</div>
            </div>
            <div id="norma-segs-row">${segsHtml}</div>
        </div>
    `;
    requestAnimationFrame(() => {
        const ytContainer = document.querySelector('.youtube-container');
        const wrapper = document.getElementById('norma-gauge-wrapper');
        if (ytContainer && wrapper) {
            wrapper.style.width = ytContainer.offsetWidth + 'px';
        }
        drawNormaStaff();
    });
}

function drawNormaStaff() {
    const svg = document.getElementById('norma-top-staff');
    if (!svg) return;
    const w = svg.offsetWidth || 800;
    const h = 90;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let lines = '';
    // 五線（水平5本、黒）
    for (let i = 1; i <= 5; i++) {
        const y = (h * i / 6).toFixed(1);
        lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(0,0,0,0.55)" stroke-width="1.2"/>`;
    }
    // 4拍子の縦線（3本）
    for (let i = 1; i <= 3; i++) {
        const x = (w * i / 4).toFixed(1);
        lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>`;
    }
    svg.innerHTML = lines;
}

// ===== ノルマゲージ更新 =====
function updateNormaGauge() {
    const topFill = document.getElementById('norma-top-fill');
    const segsRow = document.getElementById('norma-segs-row');
    if (!topFill || !segsRow) return;

    const totalChars = gameState.totalLyricChars;
    if (totalChars <= 0) return;

    const charsPerSeg   = totalChars / 10;
    const normaSegs     = Math.max(1, Math.min(10, Math.round(gameState.totalNorma / charsPerSeg)));
    const typed         = gameState.totalTypedChars;
    const cleared       = typed >= gameState.totalNorma;
    const completedSegs = Math.min(10, Math.floor(typed / charsPerSeg));

    // トップバーの進捗：現在のセグメント内の進み具合（クリア後も継続）
    const segProgress = (typed % charsPerSeg) / charsPerSeg;
    topFill.style.width = (segProgress * 100).toFixed(1) + '%';

    if (cleared) {
        topFill.style.background = 'linear-gradient(to right, #ffff75 0%, #ffd040 40%, #f07802 100%)';
    } else {
        topFill.style.background = 'linear-gradient(to right, #164dac 0%, #164dac 55%, #1efdc6 85%, #ffffff 100%)';
    }

    // CLEARラベル
    const clearLabel = document.getElementById('norma-clear-label');
    if (clearLabel) clearLabel.style.opacity = cleared ? '1' : '0';

    // セグメント色
    for (let i = 0; i < 10; i++) {
        const seg = document.getElementById('nseg-' + i);
        if (!seg) continue;
        if (i < completedSegs) {
            if (i < normaSegs - 1) {
                seg.style.background = 'linear-gradient(to bottom, #4bffff 0%, #3df5ea 50%, #3decde 100%)';
            } else {
                seg.style.background = 'linear-gradient(to bottom, #e67606 0%, #f0a020 50%, #ebba30 100%)';
            }
        } else {
            seg.style.background = '#474911';
        }
    }
}

// ===== ランク =====
function getRank(score) {
    if (score >= 1009000) return { label: 'SSS', sup: '+', rainbow: true  };
    if (score >= 1007500) return { label: 'SSS', sup: '',  rainbow: true  };
    if (score >= 1005000) return { label: 'SS',  sup: '+', rainbow: false };
    if (score >= 1000000) return { label: 'SS',  sup: '',  rainbow: false };
    if (score >=  990000) return { label: 'S',   sup: '+', rainbow: false };
    if (score >=  975000) return { label: 'S',   sup: '',  rainbow: false };
    if (score >=  950000) return { label: 'AAA', sup: '',  rainbow: false };
    if (score >=  925000) return { label: 'AA',  sup: '',  rainbow: false };
    if (score >=  900000) return { label: 'A',   sup: '',  rainbow: false };
    if (score >=  800000) return { label: 'BBB', sup: '',  rainbow: false };
    if (score >=  700000) return { label: 'BB',  sup: '',  rainbow: false };
    if (score >=  600000) return { label: 'B',   sup: '',  rainbow: false };
    if (score >=  500000) return { label: 'C',   sup: '',  rainbow: false };
    return                       { label: 'D',   sup: '',  rainbow: false };
}

// ===== サウンド =====
function playTypingSound()    { if (typingSound)    { typingSound.currentTime    = 0; typingSound.play().catch(()=>{}); } }
function playMissSound()      { if (missSound)      { missSound.currentTime      = 0; missSound.play().catch(()=>{});   } }
function playBonusSound()     { if (bonusSound)     { bonusSound.currentTime     = 0; bonusSound.play().catch(()=>{});  } }
function playAllJusticeSound(){ if (allJusticeSound){ allJusticeSound.currentTime= 0; allJusticeSound.play().catch(()=>{}); } }

// ===== 動画状態変化 =====
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) endGame();
}

// ===== ゲーム終了 =====
function endGame() {
    if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
    autoTypeTimers.forEach(t => clearTimeout(t));
    autoTypeTimers = [];
    // 録画中なら自動停止
    if (recordingActive) stopRecording();

    if (!currentSong.lyrics || currentSong.lyrics.length === 0) {
        gameState.score = 1010000;
    } else {
        gameState.score = Math.min(gameState.score, 1010000);
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const kps = elapsed > 0 ? (gameState.totalKeystrokes / elapsed).toFixed(2) : 0;
    const rank = getRank(gameState.score);

    // オートモードは必ずALL JUSTICE
    if (autoMode) {
        gameState.missCount   = 0;
        gameState.missedLines = 0;
    }

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('final-score', gameState.score);
    set('final-correct', gameState.correctCount);
    set('final-miss', gameState.missCount);
    set('final-missed-lines', gameState.missedLines);
    set('final-kps', kps);

    // 曲名をリザルト画面に表示
    let resultTitle = document.getElementById('result-song-title');
    if (!resultTitle) {
        const rc = document.querySelector('.result-content');
        if (rc) {
            resultTitle = document.createElement('div');
            resultTitle.id = 'result-song-title';
            resultTitle.style.cssText = 'font-size:clamp(1rem,2vw,1.4rem);font-weight:700;color:var(--text2,#aaa);margin-bottom:12px;letter-spacing:0.03em;';
            rc.insertBefore(resultTitle, rc.firstChild);
        }
    }
    if (resultTitle && currentSong) resultTitle.textContent = currentSong.title || '';

    // ランク・CLEAR・コンボ画像
    const BASE = '../assets/';
    const rankLabel = rank.label + rank.sup; // e.g. "SSS+", "S+", "D"
    const rankImgUrl = `${BASE}${encodeURIComponent(rankLabel)}.png`;

    const normaCleared = gameState.totalTypedChars >= gameState.totalNorma && gameState.totalNorma > 0;
    const allTyped = gameState.completedUnits >= gameState.totalUnits && gameState.totalUnits > 0;
    const allJustice = allTyped && gameState.missCount === 0 && gameState.missedLines === 0;
    const fullCombo  = allTyped && !allJustice && gameState.missedLines === 0;

    const fr = document.getElementById('final-rank');
    if (fr) {
        let badges = document.getElementById('result-badges');
        if (!badges) {
            badges = document.createElement('div');
            badges.id = 'result-badges';
            fr.parentNode.insertBefore(badges, fr);
        }

        let badgesHtml = '';
        if (normaCleared) {
            badgesHtml += `<img src="${BASE}clear.png" alt="CLEAR">`;
        }
        badgesHtml += `<img src="${rankImgUrl}" alt="${rankLabel}">`;
        if (allJustice) {
            badgesHtml += `<img src="${BASE}ALL JUSTICE.png" alt="ALL JUSTICE">`;
        } else if (fullCombo) {
            badgesHtml += `<img src="${BASE}FULL COMBO.png" alt="FULL COMBO">`;
        }
        badges.innerHTML = badgesHtml;
        fr.innerHTML = '';
    }

    switchScreen('result-screen');
    updateGameInfoOverlay(true);
}

// ===== もう一度（確認画面から再スタート） =====
function replaySong() {
    if (!currentSong) return;
    showConfirmScreen(currentSong);
}
