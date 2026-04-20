// ===== グローバル変数 =====
let player = null;
let currentSong = null;
let currentLyricIndex = 0;
let startTime = null;
let updateInterval = null;
let activeColor = null;
let songSortOrder = 'difficulty'; // 'default' | 'difficulty'
let autoMode = false;
let autoTypeTimers = [];
let playbackSpeed = 1.0;
let comboPopTimer = null;
let allJusticeActive = false;
let pendingEndGame = false;
let recordMode = false;
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];

// ===== 録画モード =====
async function enterRecordMode() {
    // 16:9フレームを先に作成してゲーム画面を移植
    let overlay = document.getElementById('rec-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'rec-overlay';
        overlay.innerHTML = '<div id="rec-frame"></div>';
        document.body.appendChild(overlay);
    }
    const frame = document.getElementById('rec-frame');
    const gameScreen = document.getElementById('game-screen');
    frame.appendChild(gameScreen);
    overlay.classList.add('active');

    // ALL JUSTICEオーバーレイも rec-overlay 内に移動して表示を維持
    const ajOverlay = document.getElementById('all-justice-overlay');
    if (ajOverlay) frame.appendChild(ajOverlay);

    try {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 60, width: { ideal: 3840 }, height: { ideal: 2160 }, displaySurface: 'browser' },
            audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 48000, autoGainControl: false },
            preferCurrentTab: true
        });
    } catch(e) {
        // キャンセル時は元に戻す
        document.body.appendChild(gameScreen);
        if (ajOverlay) document.body.appendChild(ajOverlay);
        overlay.classList.remove('active');
        alert('画面共有がキャンセルされました');
        return false;
    }

    // MediaRecorder 開始
    recordedChunks = [];
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType, videoBitsPerSecond: 20_000_000 });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = onRecordingStop;
    mediaRecorder.start(1000);

    // ストリーム停止時（タブ共有停止）
    mediaStream.getVideoTracks()[0].addEventListener('ended', () => stopRecording());
    return true;
}

function stopRecording() {
    // DOMを先に戻す（再生防止）
    const overlay    = document.getElementById('rec-overlay');
    const frame      = document.getElementById('rec-frame');
    const gameScreen = document.getElementById('game-screen');
    const ajOverlay  = document.getElementById('all-justice-overlay');
    if (gameScreen && frame && gameScreen.parentElement === frame) document.body.appendChild(gameScreen);
    if (ajOverlay  && frame && ajOverlay.parentElement  === frame) document.body.appendChild(ajOverlay);
    if (overlay) overlay.classList.remove('active');

    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
    recordMode = false;
}

function onRecordingStop() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);

    // ダウンロードボタンをリザルト画面に表示
    let dlBtn = document.getElementById('rec-download-btn');
    if (!dlBtn) {
        dlBtn = document.createElement('a');
        dlBtn.id = 'rec-download-btn';
        dlBtn.style.cssText = 'display:inline-block;margin-top:12px;padding:10px 24px;background:var(--text);color:var(--bg);border-radius:8px;font-weight:700;font-size:0.9rem;text-decoration:none;cursor:pointer;';
        dlBtn.textContent = '⬇ 録画をダウンロード';
        const rc = document.querySelector('.result-content') || document.querySelector('.result-details');
        if (rc) rc.appendChild(dlBtn);
    }
    dlBtn.href     = url;
    dlBtn.download = `typing-game-${Date.now()}.webm`;
    dlBtn.style.display = 'inline-block';
}

function exitRecordMode() {
    stopRecording();
}

// ===== API設定 =====
const API_BASE = 'https://typing-game-api.onrender.com'; // ← RenderのURLに変更
let authToken    = localStorage.getItem('tg_token')    || null;
let authUsername = localStorage.getItem('tg_username') || null;

async function apiRequest(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
    const res = await fetch(API_BASE + path, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'エラー');
    return data;
}

async function doRegister(username, password) {
    const data = await apiRequest('POST', '/auth/register', { username, password });
    authToken    = data.token;
    authUsername = data.username;
    localStorage.setItem('tg_token', authToken);
    localStorage.setItem('tg_username', authUsername);
    return data;
}

async function doLogin(username, password) {
    const data = await apiRequest('POST', '/auth/login', { username, password });
    authToken    = data.token;
    authUsername = data.username;
    localStorage.setItem('tg_token', authToken);
    localStorage.setItem('tg_username', authUsername);
    return data;
}

function doLogout() {
    authToken = null; authUsername = null;
    localStorage.removeItem('tg_token');
    localStorage.removeItem('tg_username');
    renderAuthBar();
}

async function submitScore(song, score, missCount, maxCombo) {
    if (!authToken) return;
    try {
        await apiRequest('POST', '/scores', {
            song_id: song.id, song_title: song.title,
            score, miss_count: missCount, max_combo: maxCombo
        });
    } catch(e) { console.warn('スコア送信失敗:', e.message); }
}

async function fetchRanking(songId) {
    return await apiRequest('GET', `/ranking/${encodeURIComponent(songId)}?_=${Date.now()}`);
}

// ===== 直リンク動画ヘルパー =====
function isDirectVideoUrl(str) {
    if (!str) return false;
    return /^https?:\/\/.+\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(str) ||
           (str.startsWith('http') && !str.includes('youtube.com') && !str.includes('youtu.be'));
}

// HTML5 <video> を YT.Player 互換APIでラップ
function makeHtmlVideoPlayer(container, url, { onReady, onEnded } = {}) {
    const vid = document.createElement('video');
    vid.src = url;
    vid.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;';
    vid.playsInline = true;
    vid.preload = 'metadata';
    container.innerHTML = '';
    container.appendChild(vid);

    const api = {
        getCurrentTime: () => vid.currentTime,
        getDuration:    () => isFinite(vid.duration) ? vid.duration : 0,
        seekTo:         (t) => { vid.currentTime = t; },
        playVideo:      () => vid.play(),
        pauseVideo:     () => vid.pause(),
        setPlaybackRate:(r) => { vid.playbackRate = r; },
        destroy:        () => { vid.pause(); vid.src = ''; vid.remove(); },
    };

    vid.addEventListener('loadedmetadata', () => { if (onReady) onReady({ target: api }); });
    vid.addEventListener('ended', () => { if (onEnded) onEnded(); });
    vid.addEventListener('error', () => console.warn('動画読み込みエラー:', url));

    return api;
}

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
    'ゔ':['vu'],
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
    'てぃ':['thi'],'でぃ':['dhi'],
    'ゔぁ':['va'],'ゔぃ':['vi'],'ゔぇ':['ve'],'ゔぉ':['vo'],
    'ゔゃ':['vya'],'ゔゅ':['vyu'],'ゔょ':['vyo'],
    'つぁ':['tsa'],'つぃ':['tsi'],'つぇ':['tse'],'つぉ':['tso'],
    'てぇ':['the'],'てゅ':['thu'],
    'でぁ':['dha'],'でぇ':['dhe'],'でゅ':['dhu'],
    'とぁ':['twa'],'とぃ':['twi'],'とぅ':['twu'],'とぇ':['twe'],'とぉ':['two'],
    'どぁ':['dwa'],'どぃ':['dwi'],'どぅ':['dwu'],'どぇ':['dwe'],'どぉ':['dwo'],
    'くぁ':['kwa'],'ぐぁ':['gwa'],
    'うぁ':['wha'],'うぉ':['who'],
    'いぇ':['ye']
};

// ===== 難易度計算 =====
// ===== 難易度自動判定 =====
function analyzeDifficulty(song) {
    if (!song.lyrics || song.lyrics.length === 0) return null;

    // 1ループで全集計
    let totalKana = 0, repeatCount = 0, prevKana = '';
    const timeline = []; // {time, keys} per line

    for (const l of song.lyrics) {
        const kana = l.kana || [];
        if (kana.length === 0) continue;
        // ローマ字換算打数
        const ra = convertToRomaji(kana);
        const keys = ra.reduce((s, c) => s + c.current.length, 0);
        timeline.push({ time: l.time, keys });
        totalKana += keys;
        for (const k of kana) {
            if (k === prevKana) repeatCount++;
            prevKana = k;
        }
    }

    if (totalKana === 0) return null;

    const duration = timeline.length > 0 ? timeline[timeline.length - 1].time : 1;
    if (duration <= 0) return null;

    // 平均秒速
    const avgKps = totalKana / duration;

    // 瞬間秒速：隣接2行間の密度の最大値（ウィンドウ最低1秒）
    let peakKps = 0;
    for (let i = 0; i < timeline.length; i++) {
        const t0 = i === 0 ? 0 : timeline[i - 1].time;
        const t1 = timeline[i].time;
        const window = Math.max(t1 - t0, 1.0); // 最低1秒
        const density = timeline[i].keys / window;
        if (density > peakKps) peakKps = density;
    }

    const repeatRate = repeatCount / totalKana;

    // スコア計算
    // 瞬間秒速を最重要（0〜40点）: 8打/秒でMAX
    const peakScore   = Math.min(peakKps / 8, 1) * 40;
    // 平均秒速 補助（-10〜25点）
    const avgScore    = Math.max(-10, Math.min((avgKps - 1.5) / 6 * 25, 25));
    // 総打数 体力（0〜20点）: 1000打でMAX
    const bodyScore   = Math.min(totalKana / 1000, 1) * 20;
    // 連打（0〜5点）
    const spamScore   = repeatRate * 5;
    // 短曲ペナルティ: 90秒未満でペナルティ
    const shortFactor = Math.min(duration / 90, 1);

    const score = (peakScore + avgScore + bodyScore + spamScore) * shortFactor;

    // スコア→レベル変換（既存維持）
    const scoreToLevel = (s) => {
        if (s >= 90)  return { level: 15, plus: true  };
        if (s >= 80)  return { level: 15, plus: false };
        if (s >= 70)  return { level: 14, plus: true  };
        if (s >= 60)  return { level: 14, plus: false };
        if (s >= 50)  return { level: 13, plus: true  };
        if (s >= 40)  return { level: 13, plus: false };
        if (s >= 30)  return { level: 12, plus: true  };
        if (s >= 20)  return { level: 12, plus: false };
        if (s >= 15)  return { level: 11, plus: true  };
        if (s >= 10)  return { level: 11, plus: false };
        if (s >= 8)   return { level: 10, plus: true  };
        if (s >= 6)   return { level: 10, plus: false };
        if (s >= 5)   return { level: 9,  plus: true  };
        if (s >= 4)   return { level: 9,  plus: false };
        if (s >= 3)   return { level: 8,  plus: true  };
        if (s >= 2)   return { level: 8,  plus: false };
        if (s >= 1.5) return { level: 7,  plus: true  };
        if (s >= 1.2) return { level: 7,  plus: false };
        if (s >= 1.0) return { level: 6,  plus: false };
        if (s >= 0.8) return { level: 5,  plus: false };
        if (s >= 0.6) return { level: 4,  plus: false };
        if (s >= 0.4) return { level: 3,  plus: false };
        if (s >= 0.2) return { level: 2,  plus: false };
        return          { level: 1,  plus: false };
    };
    const levelToName = (level, plus) => {
        if (plus && level === 15) return 'ULTIMA';
        if (level >= 14) return 'MASTER';
        if (level >= 11 || (level === 10 && plus)) return 'EXPERT';
        if (level >= 7)  return 'ADVANCED';
        return 'BASIC';
    };
    const nameToColor = n =>
        n === 'BASIC' ? '#00ac7e' : n === 'ADVANCED' ? '#fc8207' :
        n === 'EXPERT' ? '#f22922' : n === 'MASTER' ? '#921cec' : '#000000';

    const { level, plus } = scoreToLevel(score);
    const name = levelToName(level, plus);

    return { level, plus, over15: plus && level === 15, name, color: nameToColor(name), totalChars: totalKana };
}

function getDifficultyInfo(song) {
    // WORLD'S END
    if (song.worldsEnd !== undefined && song.worldsEnd !== null && song.worldsEnd !== '') {
        return { isWorldsEnd: true, isInst: false, weChar: song.worldsEnd, name: "WORLD'S END", color: null, level: null, over15: false, totalChars: 0 };
    }

    // ローマ字換算打数
    const romajiCount = (s) => {
        if (!s.lyrics) return 0;
        return s.lyrics.reduce((acc, l) => {
            const ra = convertToRomaji(l.kana || []);
            return acc + ra.reduce((a, c) => a + c.current.length, 0);
        }, 0);
    };

    // 手動override
    if (song.override) {
        const o = song.override;
        const name  = o.name  || 'BASIC';
        const color = o.name === 'BASIC'    ? '#00ac7e'
                    : o.name === 'ADVANCED' ? '#fc8207'
                    : o.name === 'EXPERT'   ? '#f22922'
                    : o.name === 'MASTER'   ? '#921cec'
                    : '#000000';
        return { isWorldsEnd: false, isInst: false, name, color, level: o.level ?? 1, over15: o.over15 ?? false, totalChars: romajiCount(song) };
    }

    // Inst
    const kanaCount = song.lyrics ? song.lyrics.reduce((s, l) => s + (l.kana?.length || 0), 0) : 0;
    if (kanaCount === 0) {
        return { isWorldsEnd: false, isInst: true, name: 'Inst', color: '#1e90ff', level: null, over15: false, totalChars: 0 };
    }

    // 自動判定
    const result = analyzeDifficulty(song);
    if (!result) {
        return { isWorldsEnd: false, isInst: true, name: 'Inst', color: '#1e90ff', level: null, over15: false, totalChars: 0 };
    }

    return {
        isWorldsEnd: false,
        isInst: false,
        name: result.name,
        color: result.color,
        level: result.level,
        over15: result.over15,
        totalChars: result.totalChars
    };
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
            color: var(--text3);
            -webkit-text-stroke: 0;
            paint-order: stroke fill;
        }
        .lyric-scroll-line.past {
            font-size: clamp(0.85rem, 1.9vw, 1.4rem);
            color: var(--text3);
            opacity: 0.6;
        }
        .lyric-scroll-line.active {
            font-size: clamp(1.6rem, 4.2vw, 3.2rem);
            color: var(--text);
            -webkit-text-stroke: 0;
            paint-order: stroke fill;
            text-shadow: none;
        }
        .lyric-scroll-line.near {
            font-size: clamp(1rem, 2.3vw, 1.7rem);
            color: var(--text2);
        }
        #lyrics-prelude-label {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: clamp(1.2rem, 2.5vw, 2rem);
            font-weight: bold;
            color: var(--text3);
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
        #norma-gauge-wrapper { position: relative; margin: 0 auto 10px; width: 100%; }
        #norma-top-bar {
            position: relative;
            height: 72px !important;
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
        .nseg.pre-norma { height: 32px !important; }
        .nseg.at-norma  { height: 50px !important; }
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
            pointer-events: none; z-index: 99999; opacity: 0;
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
            display: flex; gap: 6px; align-items: center; justify-content: center;
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

        /* ジャンル折りたたみ */
        .genre-section { margin-bottom: 6px; }
        .genre-header {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 14px; border-radius: 10px;
            cursor: pointer; user-select: none;
            font-weight: 700; font-size: 0.88rem;
            transition: opacity 0.15s;
            border: 1px solid rgba(0,0,0,0.08);
        }
        @media (prefers-color-scheme: dark) {
            .genre-header { border-color: rgba(255,255,255,0.1); }
        }
        .genre-header:hover { opacity: 0.85; }
        .genre-arrow { font-size: 0.7rem; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); display: inline-block; }
        .genre-section.open .genre-arrow { transform: rotate(90deg); }
        .genre-count { font-size: 0.75rem; font-weight: 400; opacity: 0.7; margin-left: auto; }
        .genre-body { overflow: hidden; max-height: 0; transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1); }
        .genre-section.open .genre-body { max-height: 2000px; }
        .genre-songs { padding: 4px 0 4px 8px; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }

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
            min-width: 360px;
            max-width: 520px;
            height: 100px;
        }
        #game-info-overlay.visible { display: flex; }

        /* 難易度ブロック */
        #gio-diff {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px 26px;
            min-width: 155px;
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
            font-size: 0.66rem;
            font-weight: 800;
            letter-spacing: 0.14em;
            opacity: 0.9;
            text-transform: uppercase;
            line-height: 1;
            margin-bottom: 3px;
            text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }
        #gio-diff-name {
            font-size: 1.55rem;
            font-weight: 900;
            letter-spacing: 0.05em;
            line-height: 1.1;
            text-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }
        #gio-diff-name.we-text {
            font-size: 1.15rem;
            letter-spacing: 0.02em;
        }
        #gio-speed-badge {
            font-size: 0.78rem;
            font-weight: 900;
            opacity: 0.92;
            letter-spacing: 0.05em;
            margin-top: 3px;
            line-height: 1;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }

        /* 曲名ブロック */
        #gio-title {
            flex: 1;
            background: rgba(0,0,0,0.82);
            color: #fff;
            padding: 0 16px;
            font-size: 1rem;
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
            padding: 4px 18px;
            min-width: 72px;
            border-left: 1px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
        }
        #gio-level-label {
            font-size: 0.54rem;
            letter-spacing: 0.1em;
            opacity: 0.65;
            text-transform: uppercase;
            line-height: 1;
            margin-bottom: 2px;
        }
        #gio-level-num {
            font-size: 2rem;
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

        /* ===== ゲーム画面レイアウト ===== */
        #game-screen {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            width: 100%;
            padding: 0 !important;
            gap: 0;
        }
        /* 順序 */
        #game-screen .score-display         { order: 1; }
        #game-screen .combo-gauge-container { order: 2; width: 100%; max-width: 640px; box-sizing: border-box; }
        #game-screen .youtube-container     { order: 3; }
        #game-screen #lyrics-scroll-panel   { order: 4; }
        #game-screen .lyrics-display        { order: 5; }
        #game-screen .input-field           { order: 6; }

        /* スコアバー: 上部横並び */
        #game-screen .score-display {
            width: 100%;
            max-width: 100%;
            display: flex !important;
            flex-direction: row;
            justify-content: center;
            gap: 24px;
            padding: 5px 16px;
            margin-bottom: 0;
            border-radius: 0;
            border-left: none; border-right: none; border-top: none;
            font-size: 0.8rem;
        }
        #game-screen .score-display div { margin: 0; }
        #game-screen #score { font-size: 1rem; }

        /* 動画: 16:9固定 */
        #game-screen .youtube-container {
            width: 100%;
            max-width: 640px;
            padding-bottom: calc(min(100vw, 640px) * 9 / 16);
            height: 0;
            margin: 0;
        }

        /* 歌詞scroll */
        #game-screen #lyrics-scroll-panel {
            width: 100%;
            margin: 0;
            height: clamp(160px, 28vh, 260px);
        }

        /* ローマ字・歌詞表示 */
        #game-screen .lyrics-display { width: 100%; max-width: 100%; margin: 4px auto 2px; }

        /* 入力欄 */
        #game-screen .input-field { margin: 4px auto 6px; }

        /* ノルマゲージ高さ（元の値） */
        #game-screen #norma-top-bar   { height: 60px !important; }
        #game-screen .nseg.pre-norma  { height: 26px !important; }
        #game-screen .nseg.at-norma   { height: 42px !important; }

        /* ===== COMBOパネル ===== */
        #combo-panel {
            position: fixed;
            right: clamp(12px, 3vw, 40px);
            top: 50%;
            transform: translateY(-50%);
            display: none;
            flex-direction: column;
            align-items: center;
            pointer-events: none;
            z-index: 100;
            opacity: 0;
            pointer-events: none;
        }
        @media (min-width: 1100px) {
            #combo-panel { display: flex; }
        }
        #combo-panel.hidden { opacity: 0; }
        #combo-panel.visible { opacity: 1; }
        #combo-label-text {
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.18em;
            color: var(--text3);
            margin-bottom: 2px;
            text-align: center;
        }
        #combo-number {
            font-size: clamp(3rem, 6vw, 5rem);
            font-weight: 900;
            line-height: 1;
            letter-spacing: -0.02em;
            background: linear-gradient(180deg, #fff2f3 0%, #fbddfd 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            display: inline-block;
            text-align: center;
            filter: drop-shadow(0 0 2px rgba(180,100,180,0.5)) drop-shadow(0 0 6px rgba(180,100,180,0.3));
        }
        @media (prefers-color-scheme: dark) {
            #combo-number { filter: none; }
        }
        #combo-number.pop {
            transform: scale(0.75);
            transition: none;
        }
        #combo-number:not(.pop) {
            transition: transform 0.1s ease-out;
        }
        .btn-edit {
            background: var(--surface2); color: var(--text2);
            border: 1px solid var(--border); border-radius: 6px;
            padding: 2px 10px; font-size: 0.78em; cursor: pointer;
            font-family: inherit;
        }
        .btn-edit:hover { background: var(--surface); color: var(--text); }

        /* ===== 録画モード16:9オーバーレイ ===== */
        #rec-overlay {
            display: none;
            position: fixed; inset: 0; z-index: 50000;
            background: #000;
            align-items: center; justify-content: center;
        }
        #rec-overlay.active { display: flex; }
        #rec-frame {
            position: relative;
            aspect-ratio: 16/9;
            width: min(100vw, 177.78vh);
            height: min(56.25vw, 100vh);
            overflow: hidden;
            background: var(--bg);
        }
        #rec-frame #game-screen {
            position: absolute !important; inset: 0 !important;
            width: 100% !important; height: 100% !important;
            top: 0 !important; left: 0 !important;
            visibility: visible !important;
        }

        /* ===== かな表示行 ===== */
        #kana-line {
            font-size: clamp(0.75rem, 1.6vw, 1.1rem);
            letter-spacing: 0.08em;
            text-align: center;
            min-height: 1.4em;
            color: var(--text2);
            font-family: 'Yu Gothic', 'Hiragino Kaku Gothic ProN', sans-serif;
        }
        #kana-line .k-correct   { color: var(--correct); }
        #kana-line .k-current   { color: var(--text); border-bottom: 2px solid var(--text); }
        #kana-line .k-remaining { color: var(--text2); }

        /* ===== 認証・ランキング ===== */
        #auth-bar {
            display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
            padding: 8px 12px; margin-bottom: 10px;
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 10px; font-size: 0.85rem;
        }
        #auth-bar input {
            padding: 5px 10px; border: 1px solid var(--border); border-radius: 6px;
            background: var(--bg); color: var(--text); font-size: 0.85rem;
            font-family: inherit; width: 130px;
        }
        #auth-bar input:focus { outline: none; border-color: var(--text2); }
        .auth-btn {
            padding: 5px 14px; border: 1px solid var(--border); border-radius: 6px;
            background: var(--surface2); color: var(--text); font-size: 0.82rem;
            cursor: pointer; font-family: inherit; font-weight: 600;
            transition: background 0.15s;
        }
        .auth-btn:hover { background: var(--border); }
        .auth-btn.primary { background: var(--text); color: var(--bg); border-color: var(--text); }
        .auth-btn.primary:hover { opacity: 0.85; }
        #auth-status { font-size: 0.82rem; color: var(--text2); }
        #auth-msg { font-size: 0.78rem; color: #e05; min-width: 0; }

        /* ランキングモーダル */
        #ranking-modal {
            display: none; position: fixed; inset: 0; z-index: 2000;
            background: rgba(0,0,0,0.6); align-items: center; justify-content: center;
        }
        #ranking-modal.active { display: flex; }
        #ranking-box {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 14px; padding: 20px; width: min(480px, 92vw);
            max-height: 80vh; display: flex; flex-direction: column; gap: 10px;
        }
        #ranking-box h2 { font-size: 1rem; color: var(--text); margin: 0; }
        #ranking-list { overflow-y: auto; flex: 1; }
        .ranking-row {
            display: grid; grid-template-columns: 28px 1fr 90px 60px;
            gap: 6px; align-items: center; padding: 6px 4px;
            border-bottom: 1px solid var(--border); font-size: 0.82rem;
        }
        .ranking-row:last-child { border-bottom: none; }
        .rank-num { font-weight: 700; color: var(--text2); text-align: center; }
        .rank-num.gold   { color: #f0a020; }
        .rank-num.silver { color: #a0a8b8; }
        .rank-num.bronze { color: #c07840; }
        .rank-me { background: rgba(128,128,255,0.08); border-radius: 4px; }
        .rank-score { font-weight: 700; text-align: right; color: var(--text); }
        .rank-miss  { font-size: 0.75rem; color: var(--text3); text-align: right; }
        .ranking-close-btn {
            align-self: flex-end; padding: 6px 18px;
            background: var(--surface2); border: 1px solid var(--border);
            border-radius: 6px; cursor: pointer; font-size: 0.85rem;
            color: var(--text); font-family: inherit;
        }
        .ranking-close-btn:hover { background: var(--border); }
        .song-item-rank-btn {
            font-size: 0.7rem; padding: 2px 8px; border-radius: 10px;
            border: 1px solid var(--border); background: transparent;
            color: var(--text3); cursor: pointer; font-family: inherit;
            white-space: nowrap; transition: all 0.15s;
        }
        .song-item-rank-btn:hover { background: var(--surface2); color: var(--text); }

        /* リザルトランキング */
        #result-ranking { margin-top: 14px; }
        #result-ranking h3 { font-size: 0.88rem; color: var(--text2); margin-bottom: 6px; }
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
                <input type="checkbox" id="cb-record">
                録画モード（16:9・最高画質）
            </label>
            <label class="confirm-automode" id="speed-row" style="flex-direction:column;gap:6px;">
                <span style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" id="cb-speed" onchange="onSpeedCheckChange(this)">
                    倍速モード
                </span>
                <select id="speed-select" onchange="playbackSpeed=parseFloat(this.value);updateGameInfoOverlay(true);" style="display:none;padding:4px 10px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:inherit;font-size:0.9rem;cursor:pointer;">
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
    injectAuthBar();
    injectLoginPrompt();
    injectRankingModal();
    injectSortUI();
    injectAllJusticeOverlay();
    injectRecordUI();
    setupAudio();
    setupEventListeners();

    window.addEventListener('resize', () => {
        drawNormaStaff();
    });

    // lyrics-data*.js を順番に読み込んでSONGSに結合
    async function loadLyricsFiles() {
        let songs = typeof SONGS !== 'undefined' && Array.isArray(SONGS) ? [...SONGS] : [];
        // SONGS2, SONGS3... をHTMLで読み込んだ場合に結合
        for (let i = 2; i <= 9; i++) {
            const v = window['SONGS' + i];
            if (Array.isArray(v)) songs = songs.concat(v);
        }
        // lyrics-data.jsだけfetchフォールバック
        if (songs.length === 0) {
            try {
                const text = await fetch('./lyrics-data.js').then(r => { if (!r.ok) throw 0; return r.text(); });
                const safe = text.replace(/^\s*(const|let|var)\s+SONGS\s*=/, 'var __SONGS =');
                const result = new Function(safe + '\n; return typeof __SONGS !== "undefined" ? __SONGS : null;')();
                if (Array.isArray(result)) songs = result;
            } catch(e) { console.warn('lyrics-data.js fetch失敗:', e); }
        }
        window.SONGS = songs;
        createSongList();
    }
    loadLyricsFiles();
});

// ===== ログインプロンプト =====
function injectLoginPrompt() {
    const modal = document.createElement('div');
    modal.id = 'login-prompt';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;width:min(360px,90vw);display:flex;flex-direction:column;gap:12px;">
            <h2 style="font-size:1rem;margin:0;color:var(--text);">ログイン / 新規登録</h2>
            <input type="text"     id="lp-user" placeholder="ユーザー名" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:0.9rem;font-family:inherit;">
            <input type="password" id="lp-pass" placeholder="パスワード" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:0.9rem;font-family:inherit;">
            <span id="lp-msg" style="font-size:0.8rem;color:#e05;min-height:1em;"></span>
            <div style="display:flex;gap:8px;">
                <button class="auth-btn primary" style="flex:1;" onclick="handleLoginPrompt()">ログイン</button>
                <button class="auth-btn" style="flex:1;" onclick="handleRegisterPrompt()">新規登録</button>
            </div>
            <button class="auth-btn" onclick="closeLoginPrompt()" style="font-size:0.8rem;">キャンセル</button>
        </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) closeLoginPrompt(); });
    // Enterキー
    modal.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleLoginPrompt(); });
    });
    document.body.appendChild(modal);
}

function showLoginPrompt() {
    const modal = document.getElementById('login-prompt');
    if (!modal) return;
    modal.style.display = 'flex';
    document.getElementById('lp-user')?.focus();
}

function closeLoginPrompt() {
    const modal = document.getElementById('login-prompt');
    if (modal) modal.style.display = 'none';
}

function setLpMsg(msg) {
    const el = document.getElementById('lp-msg');
    if (el) el.textContent = msg;
}

async function handleLoginPrompt() {
    const user = document.getElementById('lp-user')?.value.trim();
    const pass = document.getElementById('lp-pass')?.value;
    if (!user || !pass) { setLpMsg('入力してください'); return; }
    setLpMsg('...');
    try {
        await doLogin(user, pass);
        closeLoginPrompt();
        renderAuthBar();
        showSongSelect();
    } catch(e) { setLpMsg(e.message); }
}

async function handleRegisterPrompt() {
    const user = document.getElementById('lp-user')?.value.trim();
    const pass = document.getElementById('lp-pass')?.value;
    if (!user || !pass) { setLpMsg('入力してください'); return; }
    setLpMsg('...');
    try {
        await doRegister(user, pass);
        closeLoginPrompt();
        renderAuthBar();
        showSongSelect();
    } catch(e) { setLpMsg(e.message); }
}

// ===== 認証バー注入 =====
function injectAuthBar() {
    const songList = document.getElementById('song-list');
    if (!songList) return;
    const bar = document.createElement('div');
    bar.id = 'auth-bar';
    songList.parentNode.insertBefore(bar, songList);
    renderAuthBar();
}

function renderAuthBar() {
    const bar = document.getElementById('auth-bar');
    if (!bar) return;
    if (authUsername) {
        bar.innerHTML = `
            <span id="auth-status">👤 ${authUsername}</span>
            <button class="auth-btn" onclick="doLogout()">ログアウト</button>
            <span id="auth-msg"></span>
        `;
    } else {
        bar.innerHTML = `
            <input type="text"     id="auth-user" placeholder="ユーザー名">
            <input type="password" id="auth-pass" placeholder="パスワード">
            <button class="auth-btn primary" onclick="handleLogin()">ログイン</button>
            <button class="auth-btn"         onclick="handleRegister()">新規登録</button>
            <span id="auth-msg"></span>
        `;
        // Enterキー対応
        bar.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
        });
    }
}

function setAuthMsg(msg, isError = true) {
    const el = document.getElementById('auth-msg');
    if (el) { el.textContent = msg; el.style.color = isError ? '#e05' : 'var(--text2)'; }
}

async function handleLogin() {
    const user = document.getElementById('auth-user')?.value.trim();
    const pass = document.getElementById('auth-pass')?.value;
    if (!user || !pass) { setAuthMsg('入力してください'); return; }
    setAuthMsg('...', false);
    try {
        await doLogin(user, pass);
        renderAuthBar();
    } catch(e) { setAuthMsg(e.message); }
}

async function handleRegister() {
    const user = document.getElementById('auth-user')?.value.trim();
    const pass = document.getElementById('auth-pass')?.value;
    if (!user || !pass) { setAuthMsg('入力してください'); return; }
    setAuthMsg('...', false);
    try {
        await doRegister(user, pass);
        renderAuthBar();
    } catch(e) { setAuthMsg(e.message); }
}

// ===== ランキングモーダル注入 =====
function injectRankingModal() {
    const modal = document.createElement('div');
    modal.id = 'ranking-modal';
    modal.innerHTML = `
        <div id="ranking-box">
            <h2 id="ranking-title">ランキング</h2>
            <div id="ranking-list"><p style="color:var(--text3);text-align:center;padding:20px;">読み込み中...</p></div>
            <button class="ranking-close-btn" onclick="closeRankingModal()">閉じる</button>
        </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) closeRankingModal(); });
    document.body.appendChild(modal);
}

async function showRankingModal(song) {
    const modal = document.getElementById('ranking-modal');
    const title = document.getElementById('ranking-title');
    const list  = document.getElementById('ranking-list');
    if (!modal) return;
    title.textContent = `🏆 ${song.title}`;
    list.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px;">読み込み中...</p>';
    modal.classList.add('active');
    try {
        const data = await fetchRanking(song.id);
        if (!data.ranking || data.ranking.length === 0) {
            list.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px;">まだスコアがありません</p>';
            return;
        }
        list.innerHTML = data.ranking.map((r, i) => {
            const numClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            const meClass  = r.username === authUsername ? 'rank-me' : '';
            return `<div class="ranking-row ${meClass}">
                <span class="rank-num ${numClass}">${i + 1}</span>
                <span>${r.username}</span>
                <span class="rank-score">${r.score.toLocaleString()}</span>
                <span class="rank-miss">${r.miss_count}miss</span>
            </div>`;
        }).join('');
    } catch(e) {
        list.innerHTML = `<p style="color:#e05;text-align:center;padding:20px;">${e.message}</p>`;
    }
}

function closeRankingModal() {
    document.getElementById('ranking-modal')?.classList.remove('active');
}

// ===== ゲーム情報オーバーレイ注入 =====
function injectRecordUI() {
    const gio = document.createElement('div');
    gio.id = 'game-info-overlay';
    gio.innerHTML = `
        <div id="gio-diff">
            <div id="gio-diff-label">DIFFICULTY</div>
            <div id="gio-diff-name">MASTER</div>
            <div id="gio-speed-badge" style="display:none"></div>
        </div>
        <div id="gio-title">曲名</div>
        <div id="gio-level">
            <div id="gio-level-label">LEVEL</div>
            <div id="gio-level-num">15<sup style="font-size:0.6em">+</sup></div>
        </div>
    `;
    document.body.appendChild(gio);

    // COMBOパネル
    const cp = document.createElement('div');
    cp.id = 'combo-panel';
    cp.innerHTML = `<div id="combo-label-text">COMBO</div><div id="combo-number">0</div>`;
    document.body.appendChild(cp);
}

function onSpeedCheckChange(cb) {
    const sel = document.getElementById('speed-select');
    if (sel) sel.style.display = cb.checked ? 'block' : 'none';
    if (!cb.checked) playbackSpeed = 1.0;
    else playbackSpeed = parseFloat(sel?.value || '1.0');
    updateGameInfoOverlay(true);
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
            : diff.plus
            ? `${diff.level}<sup style="font-size:0.55em;vertical-align:top">+</sup>`
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

    allJusticeActive = true;

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
            overlay.addEventListener('animationend', () => {
                allJusticeActive = false;
                if (pendingEndGame) { pendingEndGame = false; endGame(); }
            }, { once: true });
        }
    };
    rafId = requestAnimationFrame(expand);
}

// ===== ソートUI注入 =====
// ===== ジャンル定義 =====
const GENRES = [
    { id: 'pops',        label: 'ポップス',          color: '#49d5eb' },
    { id: 'kids',        label: 'キッズ',            color: '#fcd000' },
    { id: 'anime',       label: 'アニメ',            color: '#fe90d2' },
    { id: 'vocaloid',    label: 'ボーカロイド™曲',   color: '#cbcfde' },
    { id: 'game',        label: 'ゲームミュージック', color: '#cc8aeb' },
    { id: 'variety',     label: 'バラエティ',         color: '#0acc2a' },
    { id: 'classic',     label: 'クラシック',         color: '#ded523' },
    { id: 'namco',       label: 'ナムコオリジナル',   color: '#ff7028' },
    { id: 'pjsk',        label: 'プロジェクトセカイ', color: '#abe1fa' },
    { id: 'chunithm',    label: 'CHUNITHM',           color: '#fffa25' },
    { id: 'maimai',      label: 'maimai',              color: '#ff66ce' },
    { id: 'ongeki',      label: 'オンゲキ',            color: '#51e06e' },
    { id: 'worlds_end',  label: "WORLD'S END",         color: null }, // WEの色は動的
    { id: 'uncategorized', label: '未分類',            color: '#888888' },
];

function getGenreIds(song) {
    const diff = getDifficultyInfo(song);
    const ids = [];
    if (song.genre)  ids.push(song.genre);
    if (song.genre2) ids.push(song.genre2);
    if (song.genre3) ids.push(song.genre3);
    // WE曲は必ずworlds_endジャンルに追加（他ジャンルも維持）
    if (diff.isWorldsEnd && !ids.includes('worlds_end')) ids.unshift('worlds_end');
    return ids.length > 0 ? ids : ['uncategorized'];
}

function injectSortUI() {
    const songList = document.getElementById('song-list');
    if (!songList || document.getElementById('sort-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'sort-bar';
    bar.className = 'sort-bar';
    bar.innerHTML = `
        <span class="sort-label">並び替え:</span>
        <button class="sort-btn"        id="sort-btn-default" onclick="setSortOrder('default')">追加順</button>
        <button class="sort-btn active" id="sort-btn-diff"    onclick="setSortOrder('difficulty')">難易度順</button>
        <button class="sort-btn"        id="sort-btn-yomi"    onclick="setSortOrder('yomi')">五十音順</button>
        <button class="sort-btn"        id="sort-btn-genre"   onclick="setSortOrder('genre')">ジャンル別</button>
    `;
    songList.parentNode.insertBefore(bar, songList);
}

function setSortOrder(order) {
    songSortOrder = order;
    ['default','diff','yomi','genre'].forEach(k => {
        const el = document.getElementById(`sort-btn-${k}`);
        if (el) el.classList.toggle('active', order === (k === 'diff' ? 'difficulty' : k));
    });
    createSongList();
}

// ===== 曲リスト（難易度バッジ付き） =====
function createSongList() {
    const songList = document.getElementById('song-list');
    if (!songList) return;
    songList.innerHTML = '';

    const allSongs = typeof SONGS !== 'undefined' ? SONGS
                   : typeof window.SONGS !== 'undefined' ? window.SONGS
                   : [];
    if (allSongs.length === 0) {
        songList.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px;">曲が見つかりません。lyrics-data.js を確認してください。</p>';
        return;
    }

    // ソート
    let songs = [...allSongs];
    if (songSortOrder === 'difficulty') {
        songs.sort((a, b) => {
            const da = getDifficultyInfo(a);
            const db = getDifficultyInfo(b);
            const rank = d => d.isInst ? 10000 : d.isWorldsEnd ? 9999 : (d.over15 ? 9997 : (d.level ?? 0));
            return rank(da) - rank(db);
        });
    } else if (songSortOrder === 'yomi') {
        songs.sort((a, b) => {
            const ya = a.yomi || a.title || '';
            const yb = b.yomi || b.title || '';
            return ya.localeCompare(yb, 'ja');
        });
    }

    if (songSortOrder === 'genre') {
        renderGenreList(songs, songList);
        return;
    }

    songs.forEach(song => songList.appendChild(makeSongItem(song)));
}

function makeSongItem(song) {
    const diff = getDifficultyInfo(song);
    const item = document.createElement('div');
    item.className = 'song-item';
    item.onclick = () => {
        if (!authToken) { showLoginPrompt(); return; }
        selectSong(song);
    };

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
        const lvLabel = diff.over15 ? '15+' : (diff.plus ? `${diff.level}+` : diff.level);
        badge.innerHTML = `${diff.name} Lv.${lvLabel}`;
    }

    const rankBtn = document.createElement('button');
    rankBtn.className = 'song-item-rank-btn';
    rankBtn.textContent = '🏆';
    rankBtn.title = 'ランキングを見る';
    rankBtn.onclick = e => { e.stopPropagation(); showRankingModal(song); };

    item.appendChild(titleSpan);
    item.appendChild(badge);
    item.appendChild(rankBtn);
    return item;
}

function renderGenreList(songs, container) {
    // ジャンルごとに曲を振り分け
    const map = new Map();
    GENRES.forEach(g => map.set(g.id, []));

    songs.forEach(song => {
        const ids = getGenreIds(song);
        ids.forEach(id => {
            if (!map.has(id)) map.set(id, []);
            map.get(id).push(song);
        });
    });

    GENRES.forEach(g => {
        const list = map.get(g.id) || [];
        if (list.length === 0) return;

        // WE用色（グラデーション文字）
        const isWE = g.id === 'worlds_end';
        const bgColor = isWE ? 'linear-gradient(90deg,#ff0000,#ff7700,#ffee00,#00cc00,#0099ff,#8800cc)' : g.color;
        const textColor = isWE ? '#fff' : (isLight(g.color) ? '#222' : '#fff');

        const section = document.createElement('div');
        section.className = 'genre-section';
        section.dataset.genreId = g.id;

        const header = document.createElement('div');
        header.className = 'genre-header';
        header.style.background = isWE ? 'linear-gradient(90deg,rgba(255,0,0,0.15),rgba(136,0,204,0.15))' : hexToRgba(g.color, 0.2);
        header.style.color = g.color || '#fff';
        header.innerHTML = `<span class="genre-arrow">▶</span><span>${g.label}</span><span class="genre-count">${list.length}曲</span>`;
        header.onclick = () => {
            section.classList.toggle('open');
        };

        const body = document.createElement('div');
        body.className = 'genre-body';
        const inner = document.createElement('div');
        inner.className = 'genre-songs';
        list.forEach(song => inner.appendChild(makeSongItem(song)));
        body.appendChild(inner);

        section.appendChild(header);
        section.appendChild(body);
        container.appendChild(section);
    });
}

function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith('#')) return `rgba(128,128,128,${alpha})`;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function isLight(hex) {
    if (!hex || !hex.startsWith('#')) return false;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (r*299 + g*587 + b*114) / 1000 > 160;
}

// ===== 画面切り替え =====
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const t = document.getElementById(id);
    if (t) t.classList.add('active');
}

function showTitleScreen() {
    const cp = document.getElementById('combo-panel');
    if (cp) { cp.classList.remove('visible'); cp.classList.add('hidden'); }
    switchScreen('title-screen');
}

function showSongSelect() {
    if (!authToken) {
        showLoginPrompt();
        return;
    }
    if (player) { try { player.pauseVideo(); } catch(e){} }
    updateGameInfoOverlay(false);
    const cp = document.getElementById('combo-panel');
    if (cp) { cp.classList.remove('visible'); cp.classList.add('hidden'); }
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
    if (diff.isInst) {
        document.getElementById('cs-total').textContent = '---';
        document.getElementById('cs-lines').textContent = '---';
    } else {
        // WE・通常曲ともローマ字換算打数を表示
        const weTotal = song.lyrics ? song.lyrics.reduce((acc, l) => {
            const ra = convertToRomaji(l.kana || []);
            return acc + ra.reduce((s, c) => s + c.current.length, 0);
        }, 0) : 0;
        document.getElementById('cs-total').textContent = weTotal || '---';
        document.getElementById('cs-lines').textContent = song.lyrics ? song.lyrics.length : '---';
    }

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

    if (isDirectVideoUrl(song.videoUrl)) {
        // 直リンク動画：HTMLビデオで duration 取得（再生はしない）
        const container = document.getElementById('confirm-yt-player');
        player = makeHtmlVideoPlayer(container, song.videoUrl, {
            onReady: onConfirmPlayerReady,
        });
    } else {
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
            if (!diff.isInst && duration > 0 && diff.totalChars > 0) {
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
async function startGameFromConfirm() {
    autoMode = document.getElementById('cb-automode')?.checked || false;
    recordMode = document.getElementById('cb-record')?.checked || false;

    // 倍速
    const cbSpeed = document.getElementById('cb-speed');
    const selSpeed = document.getElementById('speed-select');
    playbackSpeed = (cbSpeed?.checked && selSpeed) ? parseFloat(selSpeed.value) : 1.0;

    // 録画モード：画面共有を先に取得
    if (recordMode) {
        const ok = await enterRecordMode();
        if (!ok) { recordMode = false; return; }
    }

    // confirm用プレイヤーを破棄
    if (player) { try { player.destroy(); } catch(e){} player = null; }

    switchScreen('game-screen');
    initGame();

    // オートモードは入力欄を非表示
    const inp = document.getElementById('input-field');
    if (inp) inp.style.display = autoMode ? 'none' : '';

    // game-screen が visible になったのでプレイヤー作成
    if (isDirectVideoUrl(currentSong.videoUrl)) {
        const container = document.getElementById('youtube-player');
        player = makeHtmlVideoPlayer(container, currentSong.videoUrl, {
            onReady: (e) => {
                e.target.seekTo(0);
                e.target.setPlaybackRate(playbackSpeed);
                e.target.playVideo();
                startTracking();
            },
            onEnded: endGame,
        });
    } else {
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
}

// ===== ゲーム初期化 =====
function initGame() {
    // ダウンロードボタンを隠す
    const dlBtn = document.getElementById('rec-download-btn');
    if (dlBtn) dlBtn.style.display = 'none';
    allJusticeActive = false;
    pendingEndGame = false;
    const savedDuration = gameState.totalDuration;
    gameState = {
        score: 0, correctCount: 0, missCount: 0, missedLines: 0,
        currentRomaji: [], currentCharIndex: 0, currentCharPosition: 0,
        totalKeystrokes: 0, lineTypedChars: 0,
        totalLyricChars: 0, totalNorma: 0, totalTypedChars: 0,
        completedCurrentLine: false, completedUnits: 0, totalUnits: 0,
        totalDuration: savedDuration,
        currentCombo: 0, maxCombo: 0, everMissed: false, comboVisible: false,
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
    } else {
        // Inst曲：仮のtotalNormaを設定してゲージが時間比例で動くようにする
        gameState.totalNorma = 1010000;
        gameState.totalLyricChars = 1010000;
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

    // COMBOパネル初期化（Inst以外は常に表示）
    const comboPanel = document.getElementById('combo-panel');
    const comboNum   = document.getElementById('combo-number');
    const isInstSong = getDifficultyInfo(currentSong).isInst;
    if (comboPanel && comboNum) {
        comboNum.textContent = '0';
        if (isInstSong) {
            comboPanel.classList.remove('visible');
            comboPanel.classList.add('hidden');
        } else {
            gameState.comboVisible = true;
            comboPanel.classList.remove('hidden');
            comboPanel.classList.add('visible');
        }
    }

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
                const ratio = Math.min(t / gameState.totalDuration, 1);
                gameState.score = Math.floor(ratio * 1010000);
                gameState.totalTypedChars = gameState.score;
                updateScore();
                updateNormaGauge();
                const jl = document.getElementById('japanese-line');
                if (jl) jl.textContent = '歌詞なし';
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
                    let forcedKeys = 0;
                    while (gameState.currentCharIndex < gameState.currentRomaji.length) {
                        const cur = gameState.currentRomaji[gameState.currentCharIndex];
                        const remaining = cur.current.length - gameState.currentCharPosition;
                        gameState.correctCount        += remaining;
                        gameState.totalKeystrokes     += remaining;
                        gameState.totalTypedChars     += remaining;
                        gameState.lineTypedChars      += remaining;
                        forcedKeys                   += remaining;
                        gameState.completedUnits++;
                        gameState.score = gameState.totalUnits > 0
                            ? Math.floor(gameState.completedUnits * 1010000 / gameState.totalUnits) : 0;
                        gameState.currentCharIndex++;
                        gameState.currentCharPosition = 0;
                    }
                    for (let i = 0; i < forcedKeys; i++) updateCombo(true);
                    gameState.completedCurrentLine = true;
                    displayRomaji(); // kanaも全打済み表示
                } else {
                    gameState.missedLines++;
                    updateCombo(false);
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

    const panel = document.createElement('div');
    panel.id = 'lyrics-scroll-panel';
    const inner = document.createElement('div');
    inner.id = 'lyrics-scroll-inner';
    panel.appendChild(inner);
    jl.parentNode.insertBefore(panel, jl);

    // 前奏ラベル
    const prelude = document.createElement('div');
    prelude.id = 'lyrics-prelude-label';
    const isInstSong2 = currentSong && getDifficultyInfo(currentSong).isInst;
    prelude.textContent = isInstSong2 ? '歌詞なし' : '前奏';
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
    gameState._currentKanaUnits   = buildKanaUnits(lyric.kana || []);
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
        const kl = document.getElementById('kana-line');
        if (kl) kl.innerHTML = '';
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
        updateCombo(true);

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
        if (kana[i] === 'っ') {
            if (i + 1 < kana.length) {
                // っ+コンボ（例: っゔぃ）
                if (i + 2 < kana.length) {
                    const combo = kana[i + 1] + kana[i + 2];
                    if (COMBO_ROMAJI[combo]) {
                        const c = COMBO_ROMAJI[combo][0][0];
                        result.push({ options: [c, 'xtu', 'ltu'], current: c });
                        i++; continue;
                    }
                }
                // っ+単体
                const nxt = ROMAJI_TABLE[kana[i + 1]];
                if (nxt && nxt[0]) {
                    result.push({ options: [nxt[0][0], 'xtu', 'ltu'], current: nxt[0][0] });
                    i++; continue;
                }
            }
            // 末尾っ
            result.push({ options: ['ltu', 'xtu'], current: 'ltu' });
            i++; continue;
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

// ===== kanaユニット構築（convertToRomajiと同じ分割ロジック） =====
function buildKanaUnits(kana) {
    const units = [];
    let i = 0;
    while (i < kana.length) {
        // っ処理
        if (kana[i] === 'っ') {
            if (i + 1 < kana.length) {
                const nxt = kana[i + 1];
                const combo = nxt + (kana[i + 2] || '');
                if (COMBO_ROMAJI[combo]) { units.push('っ' + combo); i += 3; continue; }
                if (ROMAJI_TABLE[nxt]) { units.push('っ' + nxt); i += 2; continue; }
            }
            units.push('っ'); i++; continue;
        }
        // コンボ
        if (i + 1 < kana.length) {
            const combo = kana[i] + kana[i + 1];
            if (COMBO_ROMAJI[combo]) { units.push(combo); i += 2; continue; }
        }
        units.push(kana[i]); i++;
    }
    return units;
}

// ===== ローマ字表示 =====
function displayRomaji() {
    const el = document.getElementById('romaji-line');
    if (!el) return;

    // kana-line を romaji-line の直後に確保
    let kanaEl = document.getElementById('kana-line');
    if (!kanaEl) {
        kanaEl = document.createElement('div');
        kanaEl.id = 'kana-line';
        el.parentNode.insertBefore(kanaEl, el.nextSibling);
    }

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

    // かな表示（コンボ単位）
    const kanaUnits = gameState._currentKanaUnits || [];
    let kanaHtml = '';
    kanaUnits.forEach((k, i) => {
        if (i < gameState.currentCharIndex)
            kanaHtml += `<span class="k-correct">${k}</span>`;
        else if (i === gameState.currentCharIndex)
            kanaHtml += `<span class="k-current">${k}</span>`;
        else
            kanaHtml += `<span class="k-remaining">${k}</span>`;
    });
    kanaEl.innerHTML = kanaHtml;
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
        for (let i = 0; i < input.length; i++) updateCombo(true);
        updateNormaGauge();
        if (gameState.currentCharIndex >= gameState.currentRomaji.length) {
            gameState.completedCurrentLine = true;
            e.target.disabled = true;
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
        updateCombo(false);
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

function updateCombo(hit) {
    const panel = document.getElementById('combo-panel');
    const numEl = document.getElementById('combo-number');
    if (!panel || !numEl) return;
    if (hit) {
        gameState.currentCombo++;
        if (gameState.currentCombo > gameState.maxCombo) gameState.maxCombo = gameState.currentCombo;
        // ポップアニメーション
        if (comboPopTimer) { clearTimeout(comboPopTimer); comboPopTimer = null; numEl.classList.remove('pop'); }
        void numEl.offsetWidth;
        numEl.classList.add('pop');
        comboPopTimer = setTimeout(() => { numEl.classList.remove('pop'); comboPopTimer = null; }, 100);
    } else {
        gameState.everMissed = true;
        gameState.currentCombo = 0;
        gameState.comboVisible = false;
    }
    numEl.textContent = gameState.currentCombo;
}

// ===== COMBOパネル更新 =====
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

    // インスト曲：scoreに合わせてトップバー・セグメント更新
    if (!currentSong || !currentSong.lyrics || currentSong.lyrics.length === 0) {
        const charsPerSegI = totalChars / 10;
        const normasegsI   = Math.max(1, Math.min(10, Math.round(gameState.totalNorma / charsPerSegI)));
        const typed        = gameState.totalTypedChars;
        const cleared      = typed >= gameState.totalNorma;
        const completedI   = Math.min(10, Math.floor(typed / charsPerSegI));
        const segProgress  = (typed % charsPerSegI) / charsPerSegI;
        topFill.style.width = (segProgress * 100).toFixed(2) + '%';
        topFill.style.background = cleared
            ? 'linear-gradient(to right, #ffff75 0%, #ffd040 40%, #f07802 100%)'
            : 'linear-gradient(to right, #164dac 0%, #164dac 55%, #1efdc6 85%, #ffffff 100%)';
        const clearLabel = document.getElementById('norma-clear-label');
        if (clearLabel) clearLabel.style.opacity = cleared ? '1' : '0';
        for (let i = 0; i < 10; i++) {
            const seg = document.getElementById('nseg-' + i);
            if (!seg) continue;
            if (i < completedI) {
                seg.style.background = i < normasegsI - 1
                    ? 'linear-gradient(to bottom, #4bffff 0%, #3df5ea 50%, #3decde 100%)'
                    : 'linear-gradient(to bottom, #e67606 0%, #f0a020 50%, #ebba30 100%)';
            } else {
                seg.style.background = '#474911';
            }
        }
        return;
    }

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
async function endGame() {
    if (allJusticeActive) { pendingEndGame = true; return; }
    if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
    autoTypeTimers.forEach(t => clearTimeout(t));
    autoTypeTimers = [];

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
    if (recordMode) stopRecording();

    // COMBOパネルを非表示
    const cp = document.getElementById('combo-panel');
    if (cp) { cp.classList.remove('visible'); cp.classList.add('hidden'); }

    // 最大COMBO数をリザルトに表示
    let maxComboEl = document.getElementById('result-max-combo');
    if (!maxComboEl) {
        maxComboEl = document.createElement('p');
        maxComboEl.id = 'result-max-combo';
        const kpsEl = document.getElementById('final-kps')?.parentElement;
        if (kpsEl) kpsEl.parentNode.insertBefore(maxComboEl, kpsEl.nextSibling);
        else document.querySelector('.result-details')?.appendChild(maxComboEl);
    }
    maxComboEl.textContent = `最大コンボ数: ${gameState.maxCombo}`;

    // スコア送信 & リザルトランキング表示
    if (authToken && currentSong && !autoMode) {
        // ベストスコアより高い場合のみ送信
        try {
            const best = await apiRequest('GET', `/scores/me/${encodeURIComponent(currentSong.id)}`);
            if (!best.best || gameState.score > best.best.score) {
                await submitScore(currentSong, gameState.score, gameState.missCount, gameState.maxCombo);
            }
        } catch(e) {
            // 取得失敗時はとりあえず送信（サーバー側でも最高値のみ保持）
            await submitScore(currentSong, gameState.score, gameState.missCount, gameState.maxCombo);
        }
    }
    if (authToken && currentSong) {
        showResultRanking(currentSong);
    }
}

async function showResultRanking(song) {
    // コンテナ作成または再利用
    let el = document.getElementById('result-ranking');
    if (!el) {
        el = document.createElement('div');
        el.id = 'result-ranking';
        const rc = document.querySelector('.result-content') || document.querySelector('.result-details');
        if (rc) rc.appendChild(el);
    }
    el.innerHTML = '<h3>🏆 このスコアのランキング</h3><p style="color:var(--text3);font-size:0.82rem;">読み込み中...</p>';

    // スコア送信後に取得するため少し待つ
    await new Promise(r => setTimeout(r, 600));
    try {
        const data = await fetchRanking(song.id);
        if (!data.ranking || data.ranking.length === 0) {
            el.innerHTML = '<h3>🏆 このスコアのランキング</h3><p style="color:var(--text3);font-size:0.82rem;">まだスコアがありません</p>';
            return;
        }
        const rows = data.ranking.slice(0, 10).map((r, i) => {
            const numClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            const meClass  = r.username === authUsername ? 'rank-me' : '';
            return `<div class="ranking-row ${meClass}">
                <span class="rank-num ${numClass}">${i + 1}</span>
                <span>${r.username}</span>
                <span class="rank-score">${r.score.toLocaleString()}</span>
                <span class="rank-miss">${r.miss_count}miss</span>
            </div>`;
        }).join('');
        el.innerHTML = `<h3>🏆 このスコアのランキング（上位10位）</h3>
            <div id="ranking-list">${rows}</div>
            <button class="ranking-close-btn" style="margin-top:8px;" onclick="showRankingModal(window._currentSongForRanking)">全部見る</button>`;
        window._currentSongForRanking = song;
    } catch(e) {
        el.innerHTML = `<h3>🏆 ランキング</h3><p style="color:#e05;font-size:0.82rem;">${e.message}</p>`;
    }
}

// ===== もう一度（確認画面から再スタート） =====
function replaySong() {
    if (!currentSong) return;
    showConfirmScreen(currentSong);
}
