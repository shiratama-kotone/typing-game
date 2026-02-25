// グローバル変数
let player = null;
let currentSong = null;
let currentLyricIndex = 0;
let startTime = null;
let updateInterval = null;

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
    completedUnits: 0,   // ★ 完了したひらがな単位数
    totalUnits: 0,       // ★ 曲全体のひらがな単位数
    totalDuration: 0     // ★ 追加：曲の長さ
};

// ローマ字変換テーブル
const ROMAJI_TABLE = {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
    'ぁ':['la','xa'], 'ぃ':['li','xi'], 'ぅ':['lu','xu'], 'ぇ':['le','xe'], 'ぉ':['lo','xo'],
    'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'さ': ['sa'], 'し': ['si', 'shi'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
    'ざ': ['za'], 'じ': ['zi', 'ji'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'た': ['ta'], 'ち': ['ti', 'chi'], 'つ': ['tu', 'tsu'], 'て': ['te'], 'と': ['to'],
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['hu', 'fu'], 'へ': ['he'], 'ほ': ['ho'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'を': ['wo'], 'ん': ['nn', 'n'],
    'ー': ['-'],
    'a': ['a'], 'b': ['b'], 'c': ['c'], 'd': ['d'], 'e': ['e'],
    'f': ['f'], 'g': ['g'], 'h': ['h'], 'i': ['i'], 'j': ['j'],
    'k': ['k'], 'l': ['l'], 'm': ['m'], 'n': ['n'], 'o': ['o'],
    'p': ['p'], 'q': ['q'], 'r': ['r'], 's': ['s'], 't': ['t'],
    'u': ['u'], 'v': ['v'], 'w': ['w'], 'x': ['x'], 'y': ['y'], 'z': ['z'],
    '0': ['0'], '1': ['1'], '2': ['2'], '3': ['3'], '4': ['4'],
    '5': ['5'], '6': ['6'], '7': ['7'], '8': ['8'], '9': ['9'],
    ' ': [' ']
};

// 拗音組み合わせローマ字
const COMBO_ROMAJI = {
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'しゃ': ['sya', 'sha'], 'しゅ': ['syu', 'shu'], 'しょ': ['syo', 'sho'],
    'ちゃ': ['tya', 'cha'], 'ちゅ': ['tyu', 'chu'], 'ちょ': ['tyo', 'cho'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'じゃ': ['zya', 'ja', 'jya'], 'じゅ': ['zyu', 'ju', 'jyu'], 'じょ': ['zyo', 'jo', 'jyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
    'ふぁ': ['fa'], 'ふぃ': ['fi'], 'ふぇ': ['fe'], 'ふぉ': ['fo'],
    'うぃ': ['wi'], 'うぇ': ['we'],
    'てぃ': ['thi'], 'でぃ': ['dhi']
};

// 虹色CSS + italic CSS を注入
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
        .rainbow-text {
            animation: rainbow 1.5s linear infinite;
            font-weight: bold;
        }
        #final-score, #final-rank {
            font-style: italic;
        }
    `;
    document.head.appendChild(style);
})();

// 初期化
window.addEventListener('DOMContentLoaded', () => {
    setupAudio();
    setupEventListeners();
    createSongList();
});

function onYouTubeIframeAPIReady() {
    console.log('YouTube API準備完了');
}

// サウンド設定
function setupAudio() {
    typingSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%82%BF%E3%82%A4%E3%83%94%E3%83%B3%E3%82%B0-%E3%83%91%E3%83%B3%E3%82%BF%E3%82%B0%E3%83%A9%E3%83%95%E5%8D%982.mp3');
    typingSound.volume = 0.2;
    missSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%83%9F%E3%82%B9.mp3');
    missSound.volume = 0.3;
    bonusSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/mario-1up_eSTTTOB.mp3');
    bonusSound.volume = 0.4;
}

// イベントリスナー設定
function setupEventListeners() {
    const inputField = document.getElementById('input-field');
    if (inputField) {
        inputField.addEventListener('input', handleInput);
    }
}

// 曲リスト作成
function createSongList() {
    const songList = document.getElementById('song-list');
    if (!songList) return;
    songList.innerHTML = '';
    SONGS.forEach(song => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.textContent = song.title;
        songItem.onclick = () => selectSong(song);
        songList.appendChild(songItem);
    });
}

// 画面切り替え
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function showTitleScreen() { switchScreen('title-screen'); }
function showSongSelect()   { switchScreen('song-select-screen'); }

// 曲選択
function selectSong(song) {
    currentSong = song;
    startGame();
}

// ゲーム開始
function startGame() {
    switchScreen('game-screen');
    initGame();

    if (player) {
        player.destroy();
    }

    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: currentSong.youtubeId,
        host: 'https://www.youtube.com',
        playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    console.log('プレイヤー準備完了');
    gameState.totalDuration = event.target.getDuration();
    event.target.playVideo();
    startTracking();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        endGame();
    }
}

// ゲーム初期化
function initGame() {
    gameState = {
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

    currentLyricIndex = 0;
    startTime = Date.now();

    if (currentSong && currentSong.lyrics && currentSong.lyrics.length > 0) {
        let totalChars = 0;
        let totalUnits = 0;
        currentSong.lyrics.forEach(lyric => {
            const romajiArray = convertToRomaji(lyric.kana);
            totalUnits += romajiArray.length;
            totalChars += romajiArray.reduce((sum, c) => sum + c.current.length, 0);
        });
        gameState.totalLyricChars = totalChars;
        gameState.totalNorma = Math.ceil(totalChars * 0.4);
        gameState.totalUnits = totalUnits;
    } else {
        gameState.totalNorma = 0;
    }

    const japaneseLineEl = document.getElementById('japanese-line');
    const nextLineEl     = document.getElementById('next-line');
    const romajiLineEl   = document.getElementById('romaji-line');
    if (japaneseLineEl) japaneseLineEl.textContent = '';
    if (nextLineEl)     nextLineEl.textContent = '';
    if (romajiLineEl)   romajiLineEl.innerHTML = '';

    updateScore();
    updateNormaGauge();

    const inputField = document.getElementById('input-field');
    if (inputField) {
        inputField.value = '';
        inputField.disabled = true;
    }
}

// 歌詞追跡開始
function startTracking() {
    updateInterval = setInterval(() => {
        if (!player) return;
        const currentTime = player.getCurrentTime();
        
        // 歌詞なし曲の場合
        if (!currentSong.lyrics || currentSong.lyrics.length === 0) {
            if (gameState.totalDuration > 0) {
                gameState.score = Math.floor((currentTime / gameState.totalDuration) * 1010000);
                updateScore();
                const japaneseLineEl = document.getElementById('japanese-line');
                if (japaneseLineEl) japaneseLineEl.textContent = '歌詞無し';
            }
            return;
        }

        checkLyricTiming(currentTime);
    }, 10);
}

// 歌詞タイミングチェック
function checkLyricTiming(currentTime) {
    if (!currentSong || !currentSong.lyrics) return;

    if (currentLyricIndex < currentSong.lyrics.length) {
        const currentLyric = currentSong.lyrics[currentLyricIndex];
        if (currentTime >= currentLyric.time) {
            if (currentLyricIndex > 0 && !gameState.completedCurrentLine) {
                gameState.missedLines++;
            }
            loadLyric(currentLyric);
            currentLyricIndex++;
            gameState.completedCurrentLine = false;
        }
    }
}

// 歌詞読み込み
function loadLyric(lyric) {
    gameState.currentRomaji       = convertToRomaji(lyric.kana);
    gameState.currentCharIndex    = 0;
    gameState.currentCharPosition = 0;
    gameState.lineTypedChars      = 0;

    const japaneseLineEl = document.getElementById('japanese-line');
    const nextLineEl     = document.getElementById('next-line');
    if (japaneseLineEl) japaneseLineEl.textContent = lyric.text;

    if (nextLineEl && currentLyricIndex + 1 < currentSong.lyrics.length) {
        nextLineEl.textContent = `次は ${currentSong.lyrics[currentLyricIndex + 1].text}`;
    } else if (nextLineEl) {
        nextLineEl.textContent = '';
    }

    displayRomaji();
    updateNormaGauge();

    const inputField = document.getElementById('input-field');
    if (inputField) {
        inputField.disabled = false;
        inputField.focus();
    }
}

// ひらがなをローマ字に変換
function convertToRomaji(hiraganaArray) {
    const result = [];
    let i = 0;
    while (i < hiraganaArray.length) {
        if (hiraganaArray[i] === 'っ' && i + 1 < hiraganaArray.length) {
            const nextChar   = hiraganaArray[i + 1];
            const nextRomaji = ROMAJI_TABLE[nextChar];
            if (nextRomaji && nextRomaji[0]) {
                result.push({ options: [nextRomaji[0][0], 'xtu', 'ltu'], current: nextRomaji[0][0] });
                i++;
                continue;
            }
        }
        if (i + 1 < hiraganaArray.length) {
            const combo = hiraganaArray[i] + hiraganaArray[i + 1];
            if (COMBO_ROMAJI[combo]) {
                result.push({ options: COMBO_ROMAJI[combo], current: COMBO_ROMAJI[combo][0] });
                i += 2;
                continue;
            }
        }
        if (hiraganaArray[i] === 'ん') {
            result.push(i === hiraganaArray.length - 1
                ? { options: ['nn'], current: 'nn' }
                : { options: ['n', 'nn'], current: 'n' });
            i++;
            continue;
        }
        const char = hiraganaArray[i];
        if (ROMAJI_TABLE[char]) {
            result.push({ options: ROMAJI_TABLE[char], current: ROMAJI_TABLE[char][0] });
        }
        i++;
    }
    return result;
}

// ローマ字表示
function displayRomaji() {
    const romajiLineEl = document.getElementById('romaji-line');
    if (!romajiLineEl) return;
    let romajiHTML = '';
    for (let i = 0; i < gameState.currentRomaji.length; i++) {
        const charObj = gameState.currentRomaji[i];
        const romaji  = charObj.current;
        for (let j = 0; j < romaji.length; j++) {
            if (i < gameState.currentCharIndex) {
                romajiHTML += `<span class="correct">${romaji[j]}</span>`;
            } else if (i === gameState.currentCharIndex) {
                if (j < gameState.currentCharPosition)
                    romajiHTML += `<span class="correct">${romaji[j]}</span>`;
                else if (j === gameState.currentCharPosition)
                    romajiHTML += `<span class="current">${romaji[j]}</span>`;
                else
                    romajiHTML += `<span class="remaining">${romaji[j]}</span>`;
            } else {
                romajiHTML += `<span class="remaining">${romaji[j]}</span>`;
            }
        }
    }
    romajiLineEl.innerHTML = romajiHTML;
}

// 入力処理
function handleInput(e) {
    const input = e.target.value.toLowerCase();
    if (input.length === 0 || gameState.currentCharIndex >= gameState.currentRomaji.length) return;

    const currentChar  = gameState.currentRomaji[gameState.currentCharIndex];
    const expectedPart = currentChar.current.substring(gameState.currentCharPosition);

    let matched = false;

    const applyMatch = (len, option) => {
        if (option) currentChar.current = option;
        gameState.currentCharPosition += len;
        gameState.correctCount        += len;
        gameState.totalKeystrokes     += len;
        gameState.totalTypedChars     += len;
        gameState.lineTypedChars      += len;
        playTypingSound();
        if (gameState.currentCharPosition >= currentChar.current.length) {
            gameState.completedUnits++;
            gameState.score = gameState.totalUnits > 0
                ? Math.floor(gameState.completedUnits * 1010000 / gameState.totalUnits)
                : 0;
            gameState.currentCharIndex++;
            gameState.currentCharPosition = 0;
        }
    };

    if (expectedPart.startsWith(input)) {
        matched = true;
        applyMatch(input.length, null);
    } else {
        for (let option of currentChar.options) {
            const optionExpected = option.substring(gameState.currentCharPosition);
            if (optionExpected.startsWith(input)) {
                matched = true;
                applyMatch(input.length, option);
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

// スコア更新
function updateScore() {
    const scoreEl   = document.getElementById('score');
    const correctEl = document.getElementById('correct-count');
    const missEl    = document.getElementById('miss-count');
    if (scoreEl)   scoreEl.textContent   = gameState.score;
    if (correctEl) correctEl.textContent = gameState.correctCount;
    if (missEl)    missEl.textContent    = gameState.missCount;
}

// ノルマゲージ更新
function updateNormaGauge() {
    const normaGauge     = document.getElementById('norma-gauge');
    const normaGaugeText = document.getElementById('norma-gauge-text');

    if (gameState.totalNorma <= 0) {
        if (normaGauge)     normaGauge.style.width = '0%';
        if (normaGaugeText) normaGaugeText.textContent = '-';
        return;
    }

    const cleared = gameState.totalTypedChars >= gameState.totalNorma;
    const pct     = Math.min(Math.floor((gameState.totalTypedChars / gameState.totalNorma) * 100), 100);

    if (normaGauge) {
        normaGauge.style.width      = pct + '%';
        normaGauge.style.background = cleared ? '#4caf50' : '';
    }
    if (normaGaugeText) {
        normaGaugeText.textContent = cleared
            ? 'クリア!'
            : `${gameState.totalTypedChars} / ${gameState.totalNorma}`;
    }
}

// ランク判定
function getRank(score) {
    if (score >= 1009000) return { label: 'SSS', sup: '+', rainbow: true  };
    if (score >= 1007500) return { label: 'SSS', sup: '',  rainbow: true  };
    if (score >= 1005000) return { label: 'SS',  sup: '+', rainbow: false };
    if (score >= 1000000) return { label: 'SS',  sup: '',  rainbow: false };
    if (score >= 990000)  return { label: 'S',   sup: '+', rainbow: false };
    if (score >= 975000)  return { label: 'S',   sup: '',  rainbow: false };
    if (score >= 950000)  return { label: 'AAA', sup: '',  rainbow: false };
    if (score >= 925000)  return { label: 'AA',  sup: '',  rainbow: false };
    if (score >= 900000)  return { label: 'A',   sup: '',  rainbow: false };
    if (score >= 800000)  return { label: 'BBB', sup: '',  rainbow: false };
    if (score >= 700000)  return { label: 'BB',  sup: '',  rainbow: false };
    if (score >= 600000)  return { label: 'B',   sup: '',  rainbow: false };
    if (score >= 500000)  return { label: 'C',   sup: '',  rainbow: false };
    return                       { label: 'D',   sup: '',  rainbow: false };
}

// サウンド再生
function playTypingSound() {
    if (typingSound) { typingSound.currentTime = 0; typingSound.play().catch(() => {}); }
}
function playMissSound() {
    if (missSound) { missSound.currentTime = 0; missSound.play().catch(() => {}); }
}
function playBonusSound() {
    if (bonusSound) { bonusSound.currentTime = 0; bonusSound.play().catch(() => {}); }
}

// ゲーム終了
function endGame() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }

    // ★追加：歌詞なし曲（インスト曲）の場合は最後に1010000点に上書き
    if (!currentSong.lyrics || currentSong.lyrics.length === 0) {
        gameState.score = 1010000;
    } else {
        // 通常の歌詞あり曲は最大値をキャップ
        gameState.score = Math.min(gameState.score, 1010000);
    }

    const elapsedTime = (Date.now() - startTime) / 1000;
    const kps = elapsedTime > 0 ? (gameState.totalKeystrokes / elapsedTime).toFixed(2) : 0;

    const rank = getRank(gameState.score);

    let rankInner = '';
    const cls = rank.rainbow ? ' class="rainbow-text"' : '';
    rankInner += `<span${cls}>${rank.label}</span>`;
    if (rank.sup) rankInner += `<sup${cls}>${rank.sup}</sup>`;

    const finalScore       = document.getElementById('final-score');
    const finalRank        = document.getElementById('final-rank');
    const finalCorrect     = document.getElementById('final-correct');
    const finalMiss        = document.getElementById('final-miss');
    const finalMissedLines = document.getElementById('final-missed-lines');
    const finalKps         = document.getElementById('final-kps');

    if (finalScore)       finalScore.textContent       = gameState.score;
    if (finalRank)        finalRank.innerHTML           = rankInner;
    if (finalCorrect)     finalCorrect.textContent     = gameState.correctCount;
    if (finalMiss)        finalMiss.textContent        = gameState.missCount;
    if (finalMissedLines) finalMissedLines.textContent = gameState.missedLines;
    if (finalKps)         finalKps.textContent         = kps;

    switchScreen('result-screen');
}

// もう一度プレイ
function replaySong() {
    if (currentSong) {
        startGame();
    }
}
