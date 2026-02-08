// グローバル変数
let wordsData = null;
let currentMode = null;
let currentRank = null;
let gameTimer = null;
let startTime = null;

// 音楽プレイヤー
let musicPlayer = null;
let currentTrackIndex = 0;
let isPlaying = false;
let musicTracks = [];

// サウンドエフェクト
let typingSound = null;
let missSound = null;
let bonusSound = null;

// ゲーム状態
let gameState = {
    score: 0,
    correctCount: 0,
    missCount: 0,
    currentWord: null,
    displayWord: null,
    currentRomaji: [],
    currentPosition: 0,
    currentCharIndex: 0,
    currentCharPosition: 0,
    wordList: [],
    wordIndex: 0,
    timeLeft: 60,
    totalKeystrokes: 0,
    comboCount: 0
};

// 段位定義
const RANKS = [
    { name: '五級', id: 'rank5', requirement: 150, missLimit: null },
    { name: '四級', id: 'rank4', requirement: 300, missLimit: null },
    { name: '三級', id: 'rank3', requirement: 450, missLimit: null },
    { name: '二級', id: 'rank2', requirement: 600, missLimit: null },
    { name: '一級', id: 'rank1', requirement: 750, missLimit: null },
    { name: '初段', id: 'shodan', requirement: 900, missLimit: 50 },
    { name: '二段', id: 'nidan', requirement: 1050, missLimit: 45 },
    { name: '三段', id: 'sandan', requirement: 1200, missLimit: 40 },
    { name: '四段', id: 'yondan', requirement: 1350, missLimit: 35 },
    { name: '五段', id: 'godan', requirement: 1500, missLimit: 30 },
    { name: '六段', id: 'rokudan', requirement: 1650, missLimit: 25 },
    { name: '七段', id: 'nanadan', requirement: 1800, missLimit: 20 },
    { name: '八段', id: 'hachidan', requirement: 1950, missLimit: 15 },
    { name: '九段', id: 'kyudan', requirement: 2100, missLimit: 10 },
    { name: '十段', id: 'judan', requirement: 2250, missLimit: 8 },
    { name: '皆伝', id: 'kaiden', requirement: 2400, missLimit: 6 },
    { name: '名人', id: 'meijin', requirement: 2600, missLimit: 5 },
    { name: '超人', id: 'chojin', requirement: 2800, missLimit: 4 },
    { name: '達人', id: 'tatsujin', requirement: 3000, missLimit: 3 }
];

// ローマ字変換テーブル
const ROMAJI_TABLE = {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
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
    'わ': ['wa'], 'を': ['wo'], 'ん': ['n', 'nn'],
    'ー': ['-']
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
    'てぃ': ['thi'], 'てゅ': ['thu'],
    'でぃ': ['dhi'], 'でゅ': ['dhu']
};

// 初期化
window.addEventListener('DOMContentLoaded', async () => {
    console.log('ページ読み込み完了');
    await loadWords();
    setupAudio();
    setupEventListeners();
});

// 音楽とサウンドエフェクトの設定
function setupAudio() {
    // 音楽トラックリスト（ランダム順）
    const tracks = [
        'https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/8%E7%95%AA%E5%87%BA%E5%8F%A3%E3%80%90%E9%9D%9E%E5%85%AC%E5%BC%8F%E3%82%A4%E3%83%A1%E3%83%BC%E3%82%B8%E3%82%BD%E3%83%B3%E3%82%B0%E3%80%91Full%20ver%20%E9%8F%A1%E9%9F%B3%E3%83%AA%E3%83%B3-EO%E3%82%A8%E3%82%AA-%208%E7%95%AA%E5%87%BA%E5%8F%A3.mp3.m4a',
        'https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/DECO27%20-%20%E3%83%86%E3%83%AC%E3%83%91%E3%82%B7%20feat%20%E5%88%9D%E9%9F%B3%E3%83%9F%E3%82%AF_31032025%20(2).mp3',
        'https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%80%90%E6%9D%B1%E6%96%B9MV%E3%80%91Help%20me,%20ERINNNNNN%E3%80%90%E3%83%93%E3%83%BC%E3%83%88%E3%81%BE%E3%82%8A%E3%81%8A%E3%80%91.mp3.m4a',
        'https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%82%82%E3%81%BA%E3%82%82%E3%81%BA%20-%20Long%20Ver..mp3',
        'https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%82%A4%E3%82%AC%E3%82%AF%20-%20%E9%87%8D%E9%9F%B3%E3%83%86%E3%83%88.mp3.m4a',
        'https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%83%94%E3%83%8E%E3%82%AD%E3%82%AA%E3%83%94%E3%83%BC%20-%20T%E6%B0%8F%E3%81%AE%E8%A9%B1%E3%82%92%E4%BF%A1%E3%81%98%E3%82%8B%E3%81%AA%20feat%20%E5%88%9D%E9%9F%B3%E3%83%9F%E3%82%AF%E3%83%BB%E9%87%8D%E9%9F%B3%E3%83%86%E3%83%88%20%20Don%E2%80%99t%20Believe%20in%20T.mp3.m4a',
        'https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E6%80%AA%E7%8D%A3%E3%81%AB%E3%81%AA%E3%82%8A%E3%81%9F%E3%81%84.mp3',
        'https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E6%9F%8A%E3%83%9E%E3%82%B0%E3%83%8D%E3%82%BF%E3%82%A4%E3%83%88%20-%20%E3%83%9E%E3%83%BC%E3%82%B7%E3%83%A3%E3%83%AB%E3%83%BB%E3%83%9E%E3%82%AD%E3%82%B7%E3%83%9E%E3%82%A4%E3%82%B6%E3%83%BC%20%20%E5%8F%AF%E4%B8%8D.mp3',
        'https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E7%86%B1%E7%95%B0%E5%B8%B8%20-%20%E3%82%BB%E3%82%AB%E3%82%A4Ver..mp3'
    ];
    
    // ランダムシャッフル
    musicTracks = shuffleArray([...tracks]);
    
    // 音楽プレイヤー初期化
    musicPlayer = new Audio();
    musicPlayer.volume = 0.3;
    musicPlayer.loop = false;
    
    // 曲が終わったら次の曲へ
    musicPlayer.addEventListener('ended', () => {
        nextTrack();
    });
    
    // 最初の曲をロード（再生はしない）
    if (musicTracks.length > 0) {
        musicPlayer.src = musicTracks[0];
    }
    
    // サウンドエフェクト
    typingSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%82%BF%E3%82%A4%E3%83%94%E3%83%B3%E3%82%B0-%E3%83%91%E3%83%B3%E3%82%BF%E3%82%B0%E3%83%A9%E3%83%95%E5%8D%982.mp3');
    typingSound.volume = 0.2;
    
    missSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%83%9F%E3%82%B9.mp3');
    missSound.volume = 0.3;
    
    bonusSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/mario-1up_eSTTTOB.mp3');
    bonusSound.volume = 0.4;
}

// 音楽プレイヤー操作
function togglePlay() {
    if (!musicPlayer) return;
    
    if (isPlaying) {
        musicPlayer.pause();
        isPlaying = false;
        const playBtn = document.getElementById('play-btn');
        if (playBtn) playBtn.textContent = '▶';
    } else {
        musicPlayer.play().catch(e => console.log('再生エラー:', e));
        isPlaying = true;
        const playBtn = document.getElementById('play-btn');
        if (playBtn) playBtn.textContent = '⏸';
    }
}

function nextTrack() {
    if (!musicPlayer || musicTracks.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length;
    musicPlayer.src = musicTracks[currentTrackIndex];
    
    if (isPlaying) {
        musicPlayer.play().catch(e => console.log('再生エラー:', e));
    }
}

function prevTrack() {
    if (!musicPlayer || musicTracks.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex - 1 + musicTracks.length) % musicTracks.length;
    musicPlayer.src = musicTracks[currentTrackIndex];
    
    if (isPlaying) {
        musicPlayer.play().catch(e => console.log('再生エラー:', e));
    }
}

// サウンドエフェクト再生
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

// 単語データ読み込み
async function loadWords() {
    try {
        console.log('単語データを読み込み中...');
        const response = await fetch('words.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        wordsData = await response.json();
        console.log('単語データ読み込み成功:', wordsData);
    } catch (error) {
        console.error('単語データの読み込みに失敗:', error);
        alert('単語データの読み込みに失敗しました。words.jsonファイルが同じフォルダにあるか確認してください。');
    }
}

// イベントリスナー設定
function setupEventListeners() {
    const inputField = document.getElementById('input-field');
    if (inputField) {
        inputField.addEventListener('input', handleInput);
    }
    
    // 音楽プレイヤー
    const playBtn = document.getElementById('play-btn');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
    
    document.addEventListener('keydown', handleRankSelectKeydown);
    console.log('イベントリスナー設定完了');
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

function showModeSelect() {
    switchScreen('mode-select-screen');
}

function showRankSelect() {
    switchScreen('rank-select-screen');
    createRankCarousel();
}

// 段位カルーセル作成
function createRankCarousel() {
    const carousel = document.getElementById('rank-carousel');
    if (!carousel) return;
    
    carousel.innerHTML = '';
    
    const unlockedRanks = getUnlockedRanks();
    let selectedIndex = 0;
    
    const displayStart = Math.max(0, selectedIndex - 2);
    const displayEnd = Math.min(RANKS.length - 1, selectedIndex + 2);
    
    for (let index = displayStart; index <= displayEnd; index++) {
        const rank = RANKS[index];
        const rankBox = document.createElement('div');
        rankBox.className = 'rank-box';
        rankBox.textContent = rank.name;
        rankBox.dataset.index = index;
        
        if (index > unlockedRanks) {
            rankBox.classList.add('locked');
        }
        
        if (index === selectedIndex) {
            rankBox.classList.add('selected');
        }
        
        carousel.appendChild(rankBox);
    }
    
    carousel.dataset.selectedIndex = selectedIndex;
}

// カルーセル更新
function updateRankCarousel(selectedIndex) {
    const carousel = document.getElementById('rank-carousel');
    if (!carousel) return;
    
    carousel.innerHTML = '';
    
    const unlockedRanks = getUnlockedRanks();
    
    const displayStart = Math.max(0, selectedIndex - 2);
    const displayEnd = Math.min(RANKS.length - 1, selectedIndex + 2);
    
    for (let index = displayStart; index <= displayEnd; index++) {
        const rank = RANKS[index];
        const rankBox = document.createElement('div');
        rankBox.className = 'rank-box';
        rankBox.textContent = rank.name;
        rankBox.dataset.index = index;
        
        if (index > unlockedRanks) {
            rankBox.classList.add('locked');
        }
        
        if (index === selectedIndex) {
            rankBox.classList.add('selected');
        }
        
        carousel.appendChild(rankBox);
    }
}

// 段位選択キー操作
function handleRankSelectKeydown(e) {
    const rankScreen = document.getElementById('rank-select-screen');
    if (!rankScreen || !rankScreen.classList.contains('active')) {
        return;
    }
    
    const carousel = document.getElementById('rank-carousel');
    if (!carousel) return;
    
    const currentIndex = parseInt(carousel.dataset.selectedIndex || 0);
    const unlockedRanks = getUnlockedRanks();
    let newIndex = currentIndex;
    
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        newIndex = Math.max(0, currentIndex - 1);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        newIndex = Math.min(unlockedRanks, currentIndex + 1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex <= unlockedRanks) {
            startRankMode(currentIndex);
        }
        return;
    } else {
        return;
    }
    
    carousel.dataset.selectedIndex = newIndex;
    updateRankCarousel(newIndex);
}

// 解放済み段位取得
function getUnlockedRanks() {
    const unlocked = localStorage.getItem('unlockedRanks');
    return unlocked ? parseInt(unlocked) : 0;
}

// 段位解放
function unlockNextRank(currentRankIndex) {
    const unlockedRanks = getUnlockedRanks();
    if (currentRankIndex === unlockedRanks && currentRankIndex < RANKS.length - 1) {
        localStorage.setItem('unlockedRanks', currentRankIndex + 1);
        showRankUnlockAnimation(RANKS[currentRankIndex + 1].name);
        return true;
    }
    return false;
}

// 段位解放演出
function showRankUnlockAnimation(rankName) {
    const overlay = document.getElementById('rank-unlock-overlay');
    const text = document.getElementById('unlock-text');
    
    if (!overlay || !text) return;
    
    text.textContent = `${rankName} 解禁 !!`;
    overlay.classList.add('active');
    
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 5000);
}

// 通常モード開始
async function startNormalMode() {
    console.log('通常モード開始');
    if (!wordsData) {
        console.log('単語データ未読み込み、読み込み開始');
        await loadWords();
    }
    
    if (!wordsData) {
        alert('単語データの読み込みに失敗しました');
        return;
    }
    
    console.log('ゲーム初期化開始');
    currentMode = 'normal';
    currentRank = null;
    initGame();
    switchScreen('game-screen');
    startGame();
}

// 段位測定モード開始
async function startRankMode(rankIndex) {
    console.log('段位モード開始:', rankIndex, RANKS[rankIndex]);
    if (!wordsData) {
        console.log('単語データ未読み込み、読み込み開始');
        await loadWords();
    }
    
    if (!wordsData) {
        alert('単語データの読み込みに失敗しました');
        return;
    }
    
    console.log('ゲーム初期化開始');
    currentMode = 'rank';
    currentRank = RANKS[rankIndex];
    initGame();
    switchScreen('game-screen');
    startGame();
}

// ゲーム初期化
function initGame() {
    console.log('initGame開始');
    gameState = {
        score: 0,
        correctCount: 0,
        missCount: 0,
        currentWord: null,
        displayWord: null,
        currentRomaji: [],
        currentPosition: 0,
        currentCharIndex: 0,
        currentCharPosition: 0,
        wordList: [],
        wordIndex: 0,
        timeLeft: 60,
        totalKeystrokes: 0,
        comboCount: 0
    };
    
    if (!wordsData) {
        console.error('単語データが読み込まれていません');
        return;
    }
    
    const allWords = [
        ...wordsData.short,
        ...wordsData.medium,
        ...wordsData.long
    ];
    
    console.log('全単語数:', allWords.length);
    
    gameState.wordList = shuffleArray([...allWords]);
    
    const scoreEl = document.getElementById('score');
    const inputField = document.getElementById('input-field');
    
    if (scoreEl) scoreEl.textContent = '0';
    if (inputField) inputField.value = '';
    
    if (currentMode === 'rank') {
        const gauges = document.getElementById('gauges');
        const timeDisplay = document.getElementById('time-display');
        const correctGaugeText = document.getElementById('correct-gauge-text');
        const correctGauge = document.getElementById('correct-gauge');
        const missGaugeText = document.getElementById('miss-gauge-text');
        const missGauge = document.getElementById('miss-gauge');
        const timeEl = document.getElementById('time');
        
        if (gauges) gauges.style.display = 'flex';
        if (correctGaugeText) correctGaugeText.textContent = `0 / ${currentRank.requirement}`;
        if (correctGauge) correctGauge.style.width = '0%';
        
        if (currentRank.missLimit !== null) {
            if (missGaugeText) missGaugeText.textContent = currentRank.missLimit;
            if (missGauge) missGauge.style.width = '100%';
        } else {
            if (missGaugeText) missGaugeText.textContent = '∞';
            if (missGauge) missGauge.style.width = '100%';
        }
        
        if (timeDisplay) timeDisplay.style.display = 'block';
        if (timeEl) timeEl.textContent = '60';
    } else {
        const gauges = document.getElementById('gauges');
        const timeDisplay = document.getElementById('time-display');
        const timeEl = document.getElementById('time');
        
        if (gauges) gauges.style.display = 'none';
        if (timeDisplay) timeDisplay.style.display = 'block';
        if (timeEl) timeEl.textContent = '60';
    }
    
    console.log('initGame完了');
}

// ゲーム開始
function startGame() {
    console.log('startGame開始');
    startTime = Date.now();
    loadNextWord();
    
    gameTimer = setInterval(() => {
        gameState.timeLeft--;
        const timeEl = document.getElementById('time');
        if (timeEl) timeEl.textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    setTimeout(() => {
        const inputField = document.getElementById('input-field');
        if (inputField) {
            inputField.value = '';
            inputField.focus();
        }
    }, 100);
    
    console.log('startGame完了');
}

// 次の単語読み込み
function loadNextWord() {
    if (!wordsData) {
        console.error('単語データが読み込まれていません');
        return;
    }
    
    if (gameState.wordIndex >= gameState.wordList.length) {
        const allWords = [
            ...wordsData.short,
            ...wordsData.medium,
            ...wordsData.long
        ];
        gameState.wordList = shuffleArray([...allWords]);
        gameState.wordIndex = 0;
    }
    
    const wordObj = gameState.wordList[gameState.wordIndex++];
    gameState.currentWord = wordObj.kana;
    gameState.displayWord = wordObj.word;
    gameState.currentRomaji = convertToRomaji(gameState.currentWord);
    gameState.currentCharIndex = 0;
    gameState.currentCharPosition = 0;
    
    console.log('新しい単語:', gameState.displayWord, '読み:', gameState.currentWord.join(''));
    
    displayWord();
}

// ひらがなをローマ字に変換（拗音は組み合わせで扱う）
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
        
        // 2文字組み合わせチェック（拗音など）
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
        
        // 「ん」の特殊処理
        if (hiraganaArray[i] === 'ん') {
            if (i === hiraganaArray.length - 1) {
                result.push({
                    options: ['nn'],
                    current: 'nn'
                });
            } else {
                const nextChar = hiraganaArray[i + 1];
                const nextRomaji = ROMAJI_TABLE[nextChar];
                if (nextRomaji && nextRomaji[0] && !'aiueoyn'.includes(nextRomaji[0][0])) {
                    result.push({
                        options: ['nn', 'n'],
                        current: 'nn'
                    });
                } else {
                    result.push({
                        options: ['nn'],
                        current: 'nn'
                    });
                }
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

// 単語表示
function displayWord() {
    const japaneseWordEl = document.getElementById('japanese-word');
    const romajiWordEl = document.getElementById('romaji-word');
    
    if (!japaneseWordEl || !romajiWordEl) return;
    
    japaneseWordEl.textContent = gameState.displayWord || gameState.currentWord.join('');
    
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
    
    romajiWordEl.innerHTML = romajiHTML;
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
    
    // 現在選択中のローマ字パターンでマッチするか
    if (expectedPart.startsWith(input)) {
        matched = true;
        gameState.currentCharPosition += input.length;
        gameState.correctCount += input.length;
        gameState.totalKeystrokes += input.length;
        gameState.score += 5 * input.length;
        gameState.comboCount += input.length;
        
        // タイピング音再生
        playTypingSound();
        
        // 100ノーミスボーナスチェック
        if (gameState.comboCount >= 100) {
            playBonusSound();
            gameState.timeLeft += 10;
            gameState.comboCount = 0;
            
            // 時間更新
            const timeEl = document.getElementById('time');
            if (timeEl) timeEl.textContent = gameState.timeLeft;
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
                
                // タイピング音再生
                playTypingSound();
                
                // 100ノーミスボーナスチェック
                if (gameState.comboCount >= 100) {
                    playBonusSound();
                    gameState.timeLeft += 10;
                    gameState.comboCount = 0;
                    
                    // 時間更新
                    const timeEl = document.getElementById('time');
                    if (timeEl) timeEl.textContent = gameState.timeLeft;
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
        
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = gameState.score;
        
        updateGauges();
        
        if (gameState.currentCharIndex >= gameState.currentRomaji.length) {
            loadNextWord();
        } else {
            displayWord();
        }
    } else {
        // ミス
        gameState.missCount++;
        gameState.totalKeystrokes++;
        gameState.score = Math.max(0, gameState.score - 3);
        gameState.comboCount = 0; // コンボリセット
        
        // ミス音再生
        playMissSound();
        
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = gameState.score;
        e.target.value = '';
        
        updateGauges();
        
        if (currentMode === 'rank' && currentRank.missLimit !== null) {
            if (gameState.missCount >= currentRank.missLimit) {
                endGame();
            }
        }
    }
}

// ゲージ更新
function updateGauges() {
    // 100ノーミスゲージ
    const comboPercent = (gameState.comboCount % 100);
    const comboGauge = document.getElementById('combo-gauge');
    const comboGaugeText = document.getElementById('combo-gauge-text');
    
    if (comboGauge) comboGauge.style.width = comboPercent + '%';
    if (comboGaugeText) comboGaugeText.textContent = `${gameState.comboCount % 100} / 100`;
    
    if (currentMode === 'rank') {
        const correctPercent = Math.min(100, (gameState.correctCount / currentRank.requirement) * 100);
        const correctGauge = document.getElementById('correct-gauge');
        const correctGaugeText = document.getElementById('correct-gauge-text');
        
        if (correctGauge) correctGauge.style.width = correctPercent + '%';
        if (correctGaugeText) {
            correctGaugeText.textContent = `${gameState.correctCount} / ${currentRank.requirement}`;
        }
        
        if (currentRank.missLimit !== null) {
            const remainingMiss = currentRank.missLimit - gameState.missCount;
            const missPercent = Math.max(0, (remainingMiss / currentRank.missLimit) * 100);
            const missGauge = document.getElementById('miss-gauge');
            const missGaugeText = document.getElementById('miss-gauge-text');
            
            if (missGauge) missGauge.style.width = missPercent + '%';
            if (missGaugeText) missGaugeText.textContent = Math.max(0, remainingMiss);
        }
    }
}

// ゲーム終了
function endGame() {
    console.log('ゲーム終了');
    
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    const elapsedTime = (Date.now() - startTime) / 1000;
    const kps = elapsedTime > 0 ? (gameState.totalKeystrokes / elapsedTime).toFixed(2) : 0;
    
    const finalScore = document.getElementById('final-score');
    const finalCorrect = document.getElementById('final-correct');
    const finalKps = document.getElementById('final-kps');
    const finalMiss = document.getElementById('final-miss');
    
    if (finalScore) finalScore.textContent = gameState.score;
    if (finalCorrect) finalCorrect.textContent = gameState.correctCount;
    if (finalKps) finalKps.textContent = kps;
    if (finalMiss) finalMiss.textContent = gameState.missCount;
    
    let passed = false;
    const resultAnimation = document.getElementById('result-animation');
    const resultContent = document.getElementById('result-content');
    
    if (currentMode === 'rank') {
        const metRequirement = gameState.correctCount >= currentRank.requirement;
        const withinMissLimit = currentRank.missLimit === null || gameState.missCount < currentRank.missLimit;
        
        passed = metRequirement && withinMissLimit;
        
        if (passed) {
            if (resultAnimation) resultAnimation.innerHTML = '<div class="pass-animation">合　格</div>';
            if (resultContent) resultContent.classList.remove('fail');
            
            saveHighScore();
            
            const rankIndex = RANKS.findIndex(r => r.id === currentRank.id);
            unlockNextRank(rankIndex);
        } else {
            if (resultAnimation) resultAnimation.innerHTML = '<div class="fail-animation">不合格</div>';
            if (resultContent) resultContent.classList.add('fail');
        }
    } else {
        if (resultAnimation) resultAnimation.innerHTML = '';
        if (resultContent) resultContent.classList.remove('fail');
        saveHighScore();
    }
    
    switchScreen('result-screen');
}

// 最高スコア保存
function saveHighScore() {
    const key = currentMode === 'rank' ? `highscore_${currentRank.id}` : 'highscore_normal';
    const currentHigh = parseInt(localStorage.getItem(key) || 0);
    
    const highScoreText = document.getElementById('high-score-text');
    
    if (!highScoreText) return;
    
    if (gameState.score > currentHigh) {
        localStorage.setItem(key, gameState.score);
        highScoreText.textContent = `🎉 新記録！ 前回: ${currentHigh}`;
    } else {
        highScoreText.textContent = `最高スコア: ${currentHigh}`;
    }
}

// メニューに戻る
function backToMenu() {
    showModeSelect();
}

// 配列シャッフル
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
