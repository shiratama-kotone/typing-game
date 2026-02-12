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
    comboCount: 0,
    completedCurrentLine: false
};

// ローマ字変換テーブル
const ROMAJI_TABLE = {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
    'ぁ':['la', 'xa'], 'ぃ':['li', 'xi'], 'ぅ':['lu', 'xu'], 'ぇ':['le', 'xe'], 'ぉ':['lo', 'xo'],
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
    // 英小文字
    'a': ['a'], 'b': ['b'], 'c': ['c'], 'd': ['d'], 'e': ['e'],
    'f': ['f'], 'g': ['g'], 'h': ['h'], 'i': ['i'], 'j': ['j'],
    'k': ['k'], 'l': ['l'], 'm': ['m'], 'n': ['n'], 'o': ['o'],
    'p': ['p'], 'q': ['q'], 'r': ['r'], 's': ['s'], 't': ['t'],
    'u': ['u'], 'v': ['v'], 'w': ['w'], 'x': ['x'], 'y': ['y'], 'z': ['z'],
    // 数字
    '0': ['0'], '1': ['1'], '2': ['2'], '3': ['3'], '4': ['4'],
    '5': ['5'], '6': ['6'], '7': ['7'], '8': ['8'], '9': ['9'],
    // スペース
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

// 初期化
window.addEventListener('DOMContentLoaded', () => {
    setupAudio();
    setupEventListeners();
    createSongList();
});

// YouTube IFrame API準備完了時
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

function showTitleScreen() {
    switchScreen('title-screen');
}

function showSongSelect() {
    switchScreen('song-select-screen');
}

// 曲選択
function selectSong(song) {
    currentSong = song;
    startGame();
}

// ゲーム開始
function startGame() {
    switchScreen('game-screen');
    initGame();
    
    // YouTube Player作成
    if (player) {
        player.destroy();
    }
    
    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: currentSong.youtubeId,
        playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,  // アノテーション非表示
            cc_load_policy: 0,  // 字幕デフォルトOFF
            playsinline: 1      // インライン再生
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

// プレイヤー準備完了
function onPlayerReady(event) {
    console.log('プレイヤー準備完了');
    event.target.playVideo();
    startTracking();
}

// プレイヤー状態変更
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
        comboCount: 0,
        completedCurrentLine: false
    };
    
    currentLyricIndex = 0;
    startTime = Date.now();
    
    updateScore();
    updateComboGauge();
    
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
        checkLyricTiming(currentTime);
    }, 100);
}

// 歌詞タイミングチェック
function checkLyricTiming(currentTime) {
    if (!currentSong || !currentSong.lyrics) return;
    
    // 次の歌詞のタイミングをチェック
    if (currentLyricIndex < currentSong.lyrics.length) {
        const currentLyric = currentSong.lyrics[currentLyricIndex];
        
        if (currentTime >= currentLyric.time) {
            // 前の行が未完了なら減点
            if (currentLyricIndex > 0 && !gameState.completedCurrentLine) {
                gameState.missedLines++;
                gameState.score = Math.max(0, gameState.score - 100);
                updateScore();
            }
            
            loadLyric(currentLyric);
            currentLyricIndex++;
            gameState.completedCurrentLine = false;
        }
    }
}

// 歌詞読み込み
function loadLyric(lyric) {
    gameState.currentRomaji = convertToRomaji(lyric.kana);
    gameState.currentCharIndex = 0;
    gameState.currentCharPosition = 0;
    
    const japaneseLineEl = document.getElementById('japanese-line');
    const nextLineEl = document.getElementById('next-line');
    
    if (japaneseLineEl) {
        japaneseLineEl.textContent = lyric.text;
    }
    
   // 次の歌詞を表示
if (nextLineEl && currentLyricIndex + 1 < currentSong.lyrics.length) {
    nextLineEl.textContent = `次は ${currentSong.lyrics[currentLyricIndex + 1].text}`;
} else if (nextLineEl) {
    nextLineEl.textContent = '';
}
    
    displayRomaji();
    
    // 入力フィールド有効化
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
        // 促音チェック
        if (hiraganaArray[i] === 'っ' && i + 1 < hiraganaArray.length) {
            const nextChar = hiraganaArray[i + 1];
            const nextRomaji = ROMAJI_TABLE[nextChar];
            if (nextRomaji && nextRomaji[0]) {
                const consonant = nextRomaji[0][0];
                result.push({
                    options: [consonant, 'xtu', 'ltu'],
                    current: consonant
                });
                i++;
                continue;
            }
        }
        
        // 2文字組み合わせチェック
        if (i + 1 < hiraganaArray.length) {
            const combo = hiraganaArray[i] + hiraganaArray[i + 1];
            if (COMBO_ROMAJI[combo]) {
                result.push({
                    options: COMBO_ROMAJI[combo],
                    current: COMBO_ROMAJI[combo][0]
                });
                i += 2;
                continue;
            }
        }
        
        // 「ん」の処理
        if (hiraganaArray[i] === 'ん') {
            if (i === hiraganaArray.length - 1) {
                // 最後の「ん」はnn固定
                result.push({ options: ['nn'], current: 'nn' });
            } else {
                // 途中の「ん」はn表示、nnでも打てる
                result.push({ options: ['n', 'nn'], current: 'n' });
            }
            i++;
            continue;
        }
        
        // 通常の文字
        const char = hiraganaArray[i];
        if (ROMAJI_TABLE[char]) {
            result.push({
                options: ROMAJI_TABLE[char],
                current: ROMAJI_TABLE[char][0]
            });
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
        const romaji = charObj.current;
        
        for (let j = 0; j < romaji.length; j++) {
            if (i < gameState.currentCharIndex) {
                romajiHTML += `<span class="correct">${romaji[j]}</span>`;
            } else if (i === gameState.currentCharIndex) {
                if (j < gameState.currentCharPosition) {
                    romajiHTML += `<span class="correct">${romaji[j]}</span>`;
                } else if (j === gameState.currentCharPosition) {
                    romajiHTML += `<span class="current">${romaji[j]}</span>`;
                } else {
                    romajiHTML += `<span class="remaining">${romaji[j]}</span>`;
                }
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
    
    if (input.length === 0 || gameState.currentCharIndex >= gameState.currentRomaji.length) {
        return;
    }
    
    const currentChar = gameState.currentRomaji[gameState.currentCharIndex];
    const currentRomaji = currentChar.current;
    const expectedPart = currentRomaji.substring(gameState.currentCharPosition);
    
    let matched = false;
    
    if (expectedPart.startsWith(input)) {
        matched = true;
        gameState.currentCharPosition += input.length;
        gameState.correctCount += input.length;
        gameState.totalKeystrokes += input.length;
        gameState.score += 5 * input.length;
        gameState.comboCount += input.length;
        
        playTypingSound();
        
        // 100ノーミスボーナス
        if (gameState.comboCount >= 100) {
            playBonusSound();
            gameState.comboCount = 0;
        }
        
        if (gameState.currentCharPosition >= currentRomaji.length) {
            gameState.currentCharIndex++;
            gameState.currentCharPosition = 0;
        }
    } else {
        // 別のパターンを試す
        for (let option of currentChar.options) {
            const optionExpected = option.substring(gameState.currentCharPosition);
            if (optionExpected.startsWith(input)) {
                matched = true;
                currentChar.current = option;
                gameState.currentCharPosition += input.length;
                gameState.correctCount += input.length;
                gameState.totalKeystrokes += input.length;
                gameState.score += 5 * input.length;
                gameState.comboCount += input.length;
                
                playTypingSound();
                
                if (gameState.comboCount >= 100) {
                    playBonusSound();
                    gameState.comboCount = 0;
                }
                
                if (gameState.currentCharPosition >= option.length) {
                    gameState.currentCharIndex++;
                    gameState.currentCharPosition = 0;
                }
                break;
            }
        }
    }
    
    if (matched) {
        e.target.value = '';
        updateScore();
        updateComboGauge();
        
        // 行完了チェック
        if (gameState.currentCharIndex >= gameState.currentRomaji.length) {
            gameState.completedCurrentLine = true;
            e.target.disabled = true;
        } else {
            displayRomaji();
        }
    } else {
        // ミス
        gameState.missCount++;
        gameState.totalKeystrokes++;
        gameState.score = Math.max(0, gameState.score - 3);
        gameState.comboCount = 0;
        
        playMissSound();
        
        e.target.value = '';
        updateScore();
        updateComboGauge();
    }
}

// スコア更新
function updateScore() {
    const scoreEl = document.getElementById('score');
    const correctEl = document.getElementById('correct-count');
    const missEl = document.getElementById('miss-count');
    
    if (scoreEl) scoreEl.textContent = gameState.score;
    if (correctEl) correctEl.textContent = gameState.correctCount;
    if (missEl) missEl.textContent = gameState.missCount;
}

// コンボゲージ更新
function updateComboGauge() {
    const comboPercent = gameState.comboCount % 100;
    const comboGauge = document.getElementById('combo-gauge');
    const comboGaugeText = document.getElementById('combo-gauge-text');
    
    if (comboGauge) comboGauge.style.width = comboPercent + '%';
    if (comboGaugeText) comboGaugeText.textContent = `${gameState.comboCount % 100} / 100`;
}

// サウンド再生
function playTypingSound() {
    if (typingSound) {
        typingSound.currentTime = 0;
        typingSound.play().catch(e => {});
    }
}

function playMissSound() {
    if (missSound) {
        missSound.currentTime = 0;
        missSound.play().catch(e => {});
    }
}

function playBonusSound() {
    if (bonusSound) {
        bonusSound.currentTime = 0;
        bonusSound.play().catch(e => {});
    }
}

// ゲーム終了
function endGame() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    
    // 最後の行が未完了なら減点
    if (!gameState.completedCurrentLine && currentLyricIndex > 0) {
        gameState.missedLines++;
        gameState.score = Math.max(0, gameState.score - 100);
    }
    
    const elapsedTime = (Date.now() - startTime) / 1000;
    const kps = elapsedTime > 0 ? (gameState.totalKeystrokes / elapsedTime).toFixed(2) : 0;
    
    // リザルト表示
    const finalScore = document.getElementById('final-score');
    const finalCorrect = document.getElementById('final-correct');
    const finalMiss = document.getElementById('final-miss');
    const finalMissedLines = document.getElementById('final-missed-lines');
    const finalKps = document.getElementById('final-kps');
    
    if (finalScore) finalScore.textContent = gameState.score;
    if (finalCorrect) finalCorrect.textContent = gameState.correctCount;
    if (finalMiss) finalMiss.textContent = gameState.missCount;
    if (finalMissedLines) finalMissedLines.textContent = gameState.missedLines;
    if (finalKps) finalKps.textContent = kps;
    
    switchScreen('result-screen');
}

// もう一度プレイ
function replaySong() {
    if (currentSong) {
        startGame();
    }
}
