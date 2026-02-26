// ===== グローバル変数 =====
let player = null;
let currentSong = null;
let currentLyricIndex = 0;
let startTime = null;
let updateInterval = null;
let activeColor = null; // colorStart/colorEnd で管理する現在の歌詞色

// サウンドエフェクト
let typingSound = null;
let missSound = null;
let bonusSound = null;

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
}

function setupEventListeners() {
    const inp = document.getElementById('input-field');
    if (inp) inp.addEventListener('input', handleInput);
}

// ===== 曲リスト（難易度バッジ付き） =====
function createSongList() {
    const songList = document.getElementById('song-list');
    if (!songList) return;
    songList.innerHTML = '';
    SONGS.forEach(song => {
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
        dnEl.textContent = `WORLD'S END ★${diff.weChar}`;
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

    // YT プレイヤーを生成（game-screen の #youtube-player へ）
    if (player) { try { player.destroy(); } catch(e){} player = null; }
    player = new YT.Player('youtube-player', {
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
    const duration = event.target.getDuration();
    gameState.totalDuration = duration;

    document.getElementById('cs-duration').textContent = formatDuration(duration);

    const diff = getDifficultyInfo(currentSong);
    if (!diff.isWorldsEnd && !diff.isInst && duration > 0 && diff.totalChars > 0) {
        document.getElementById('cs-speed').textContent     = (diff.totalChars / duration).toFixed(2);
        document.getElementById('cs-speed-unit').textContent = '打/秒';
    } else {
        document.getElementById('cs-speed').textContent = '---';
    }

    document.getElementById('btn-confirm-start').disabled = false;
    document.getElementById('cs-loading').style.display   = 'none';
}

// ===== 確認画面からゲーム開始 =====
function startGameFromConfirm() {
    switchScreen('game-screen');
    initGame();
    if (player) {
        player.seekTo(0);
        player.playVideo();
        startTracking();
    }
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
    if (jl) { jl.textContent = ''; jl.style.color = ''; }
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

function loadLyric(lyric) {
    // colorStart → activeColor 更新（このラインから色変更）
    if (lyric.colorStart) {
        activeColor = lyric.colorStart;
    }

    gameState.currentRomaji       = convertToRomaji(lyric.kana);
    gameState.currentCharIndex    = 0;
    gameState.currentCharPosition = 0;
    gameState.lineTypedChars      = 0;

    const jl = document.getElementById('japanese-line');
    if (jl) {
        jl.textContent  = lyric.text;
        jl.style.color  = activeColor || '';
    }

    const nl = document.getElementById('next-line');
    if (nl) {
        nl.textContent = (currentLyricIndex + 1 < currentSong.lyrics.length)
            ? `次は ${currentSong.lyrics[currentLyricIndex + 1].text}`
            : '';
    }

    displayRomaji();
    updateNormaGauge();

    const inp = document.getElementById('input-field');
    if (inp) { inp.disabled = false; inp.focus(); }

    // colorEnd: true → このライン表示後にリセット
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
function playTypingSound() { if (typingSound) { typingSound.currentTime = 0; typingSound.play().catch(()=>{}); } }
function playMissSound()   { if (missSound)   { missSound.currentTime   = 0; missSound.play().catch(()=>{});   } }
function playBonusSound()  { if (bonusSound)  { bonusSound.currentTime  = 0; bonusSound.play().catch(()=>{});  } }

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
