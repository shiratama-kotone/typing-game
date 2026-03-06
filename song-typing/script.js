// ===== グローバル変数 =====
let player = null;
let currentSong = null;
let currentLyricIndex = 0;
let startTime = null;
let updateInterval = null;
let activeColor = null;
let songSortOrder = 'default'; // 'default' | 'difficulty'

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
        #lyrics-scroll-panel {
            width: 100vw;
            margin-left: calc(-50vw + 50%);
            overflow: hidden;
            position: relative;
            height: clamp(160px, 28vh, 260px);
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
            color: rgba(255,255,255,0.28);
            -webkit-text-stroke: 1px rgba(255,255,255,0.4);
            paint-order: stroke fill;
        }
        .lyric-scroll-line.past {
            font-size: clamp(0.85rem, 1.9vw, 1.4rem);
            color: rgba(255,255,255,0.22);
        }
        .lyric-scroll-line.active {
            font-size: clamp(1.6rem, 4.2vw, 3.2rem);
            color: #fff;
            -webkit-text-stroke: 3px rgba(255,255,255,0.9);
            paint-order: stroke fill;
        }        .lyric-scroll-line.near {
            font-size: clamp(1rem, 2.3vw, 1.7rem);
            color: rgba(255,255,255,0.55);
        }

        #lyrics-prelude-label {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: clamp(1.2rem, 2.5vw, 2rem);
            font-weight: bold;
            color: rgba(255,255,255,0.45);
            -webkit-text-stroke: 1px rgba(255,255,255,0.5);
            paint-order: stroke fill;
            letter-spacing: 0.3em;
            pointer-events: none;
            transition: opacity 0.4s ease;
        }

        /* ===== レスポンシブ ===== */
        #game-screen {
            font-size: clamp(11px, 1.3vw, 16px);
        }
        #romaji-line {
            font-size: clamp(1rem, 2.4vw, 1.8rem) !important;
        }
        #input-field {
            font-size: clamp(0.9rem, 1.8vw, 1.3rem) !important;
            width: 100% !important;
        }
        #score, #correct-count, #miss-count {
            font-size: clamp(0.8rem, 1.4vw, 1rem) !important;
        }
        #norma-gauge-text {
            font-size: clamp(0.7rem, 1.1vw, 0.9rem) !important;
        }

        /* ===== スマホ：上半分に詰める ===== */
        @media (max-width: 768px) {
            .youtube-container {
                padding-bottom: 30% !important;
                max-width: 100% !important;
            }
            #lyrics-scroll-panel {
                height: clamp(100px, 18vh, 160px);
            }
            .lyric-scroll-line       { font-size: 0.78rem; }
            .lyric-scroll-line.near  { font-size: 0.95rem; }
            .lyric-scroll-line.active { font-size: clamp(1.2rem, 5vw, 2rem); }
            .score-display { padding: 8px 12px !important; font-size: 0.9rem !important; margin-bottom: 8px !important; }
            .combo-gauge-container { padding: 8px 10px !important; margin-bottom: 8px !important; }
            #romaji-line { font-size: 1rem !important; }
            .input-field { padding: 8px !important; font-size: 1rem !important; margin: 8px auto !important; }
            .lyrics-display { margin: 8px auto !important; }
        }

        /* 確認画面レスポンシブ */
        .confirm-box {
            padding: clamp(20px, 4vw, 44px) clamp(18px, 4vw, 48px) !important;
        }
        .confirm-diff-name {
            font-size: clamp(1.4rem, 3.5vw, 2.2rem) !important;
        }
        .confirm-stat-value {
            font-size: clamp(1.1rem, 2.5vw, 1.5rem) !important;
        }
        /* 曲選択レスポンシブ */
        .song-item {
            font-size: clamp(0.82rem, 1.3vw, 1rem) !important;
        }

        /* ===== ALL JUSTICE アニメーション ===== */
        #all-justice-overlay {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: 9999;
            opacity: 0;
        }
        #all-justice-text {
            font-style: italic;
            font-weight: 900;
            font-size: clamp(2rem, 6vw, 5rem);
            white-space: nowrap;
            letter-spacing: 0em;
        }
        @keyframes aj-appear {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @keyframes aj-fadeout {
            from { opacity: 1; }
            to   { opacity: 0; }
        }
        .sort-bar {
            display: flex;
            gap: 6px;
            align-items: center;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }
        .sort-label {
            font-size: 0.8em;
            color: #888;
            margin-right: 2px;
        }
        .sort-btn {
            font-size: 0.78em;
            padding: 4px 14px;
            border-radius: 20px;
            border: 1px solid #aaa;
            background: transparent;
            color: #aaa;
            cursor: pointer;
            transition: all 0.18s;
            font-weight: bold;
        }
        .sort-btn:hover { border-color: #ccc; color: #eee; }
        .sort-btn.active {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-color: transparent;
            color: #fff;
        }

        /* 曲選択バッジ */
        .song-item {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }
        .song-item-title {
            flex: 1;
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .diff-badge {
            font-size: 0.68em;
            font-weight: 800;
            padding: 3px 10px;
            border-radius: 6px;
            color: #fff;
            white-space: nowrap;
            letter-spacing: 0.04em;
            flex-shrink: 0;
        }
        .diff-badge-ultima {
            background: #1a1a1a !important;
            border: 1px solid #666;
        }
        .diff-badge-inst { background: #1e90ff; }
        .diff-badge-we {
            background: linear-gradient(90deg, #ff0000, #ff7700, #ffee00, #00cc00, #0099ff, #8800cc, #ff00aa);
        }

        /* 確認画面 */
        #confirm-screen {
            background: rgba(6, 6, 18, 0.97);
            display: none;
            align-items: center;
            justify-content: center;
        }
        #confirm-screen.active {
            display: flex !important;
        }
        .confirm-box {
            background: linear-gradient(150deg, #10102a 0%, #1c1c38 100%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 22px;
            padding: 44px 48px 40px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            color: #fff;
            box-shadow: 0 30px 80px rgba(0,0,0,0.8);
        }
        .confirm-song-title {
            font-size: 1.3rem;
            font-weight: bold;
            color: #dde;
            margin-bottom: 20px;
            line-height: 1.45;
        }
        .confirm-diff-name {
            display: block;
            font-size: 2.2rem;
            font-weight: 900;
            letter-spacing: 0.13em;
            margin-bottom: 4px;
        }
        .confirm-diff-we {
            background: linear-gradient(90deg, #ff0000, #ff7700, #ffee00, #00cc00, #0099ff, #8800cc, #ff00aa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .confirm-diff-level {
            font-size: 1rem;
            color: #888;
            margin-bottom: 24px;
        }
        .confirm-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 30px;
        }
        .confirm-stat {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 14px 10px;
        }
        .confirm-stat-label {
            font-size: 0.74rem;
            color: #777;
            margin-bottom: 7px;
        }
        .confirm-stat-value {
            font-size: 1.5rem;
            font-weight: bold;
        }
        .confirm-stat-unit {
            font-size: 0.8rem;
            color: #999;
            margin-left: 2px;
        }
        .confirm-btns {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        #btn-confirm-start {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
            border: none;
            padding: 13px 42px;
            border-radius: 50px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.25s;
            letter-spacing: 0.05em;
        }
        #btn-confirm-start:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 22px rgba(102,126,234,0.55);
        }
        #btn-confirm-start:disabled { opacity: 0.38; cursor: not-allowed; }
        #btn-confirm-back {
            background: rgba(255,255,255,0.07);
            color: #aaa;
            border: 1px solid rgba(255,255,255,0.15);
            padding: 13px 22px;
            border-radius: 50px;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.25s;
        }
        #btn-confirm-back:hover { background: rgba(255,255,255,0.13); color: #fff; }
        .confirm-loading {
            font-size: 0.78rem;
            color: #555;
            margin-top: 14px;
        }
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
    setupAudio();
    setupEventListeners();
    createSongList();
});

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
    // confirm用プレイヤーを破棄
    if (player) { try { player.destroy(); } catch(e){} player = null; }

    switchScreen('game-screen');
    initGame();

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
            onReady: (e) => { e.target.seekTo(0); e.target.playVideo(); startTracking(); },
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
                gameState.missedLines++;
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
        if (inp) { inp.disabled = false; inp.focus(); }
    }

    if (lyric.colorEnd) activeColor = null;
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
        playMissSound();
        e.target.value = '';
        updateScore();
    }
}

// ===== スコア更新 =====
function updateScore() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('score', gameState.score);
    set('correct-count', gameState.correctCount);
    set('miss-count', gameState.missCount);
}

// ===== ノルマゲージ =====
function updateNormaGauge() {
    const g = document.getElementById('norma-gauge');
    const t = document.getElementById('norma-gauge-text');
    if (gameState.totalNorma <= 0) {
        if (g) g.style.width = '0%';
        if (t) t.textContent = '-';
        return;
    }
    const cleared = gameState.totalTypedChars >= gameState.totalNorma;
    const pct = Math.min(Math.floor((gameState.totalTypedChars / gameState.totalNorma) * 100), 100);
    if (g) { g.style.width = pct + '%'; g.style.background = cleared ? '#4caf50' : ''; }
    if (t) t.textContent = cleared ? 'クリア!' : `${gameState.totalTypedChars} / ${gameState.totalNorma}`;
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

    if (!currentSong.lyrics || currentSong.lyrics.length === 0) {
        gameState.score = 1010000;
    } else {
        gameState.score = Math.min(gameState.score, 1010000);
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const kps = elapsed > 0 ? (gameState.totalKeystrokes / elapsed).toFixed(2) : 0;
    const rank = getRank(gameState.score);

    let rankInner = '';
    const cls = rank.rainbow ? ' class="rainbow-text"' : '';
    rankInner += `<span${cls}>${rank.label}</span>`;
    if (rank.sup) rankInner += `<sup${cls}>${rank.sup}</sup>`;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('final-score', gameState.score);
    set('final-correct', gameState.correctCount);
    set('final-miss', gameState.missCount);
    set('final-missed-lines', gameState.missedLines);
    set('final-kps', kps);
    const fr = document.getElementById('final-rank');
    if (fr) fr.innerHTML = rankInner;

    switchScreen('result-screen');
}

// ===== もう一度（確認画面から再スタート） =====
function replaySong() {
    if (!currentSong) return;
    showConfirmScreen(currentSong);
}
