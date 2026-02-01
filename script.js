// グローバル変数
let wordsData = null;
let currentMode = null;
let currentRank = null;
let gameTimer = null;
let startTime = null;

// ゲーム状態
let gameState = {
    score: 0,
    correctCount: 0,
    missCount: 0,
    currentWord: null,
    currentRomaji: [],
    currentPosition: 0,
    wordList: [],
    wordIndex: 0,
    timeLeft: 60,
    totalKeystrokes: 0
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
    'わ': ['wa'], 'を': ['wo'], 'ん': ['nn', 'n'],
    'ゃ': ['xya', 'lya'], 'ゅ': ['xyu', 'lyu'], 'ょ': ['xyo', 'lyo'],
    'ぁ': ['xa', 'la'], 'ぃ': ['xi', 'li'], 'ぅ': ['xu', 'lu'], 'ぇ': ['xe', 'le'], 'ぉ': ['xo', 'lo'],
    'っ': ['xtu', 'ltu', 'ltsu'],
    'ー': ['-']
};

// 初期化
window.addEventListener('DOMContentLoaded', async () => {
    console.log('ページ読み込み完了');
    await loadWords();
    setupEventListeners();
});

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
    
    // 表示する段位の範囲を計算（選択中を中心に前後2つずつ）
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
    
    // 初期選択
    carousel.dataset.selectedIndex = selectedIndex;
}

// カルーセル更新
function updateRankCarousel(selectedIndex) {
    const carousel = document.getElementById('rank-carousel');
    if (!carousel) return;
    
    carousel.innerHTML = '';
    
    const unlockedRanks = getUnlockedRanks();
    
    // 表示する段位の範囲を計算
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
    
    // 選択を更新してカルーセルを再描画
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
        currentRomaji: [],
        currentPosition: 0,
        wordList: [],
        wordIndex: 0,
        timeLeft: currentMode === 'normal' ? 60 : 999,
        totalKeystrokes: 0
    };
    
    // 単語データチェック
    if (!wordsData) {
        console.error('単語データが読み込まれていません');
        return;
    }
    
    // 単語リスト作成
    const allWords = [
        ...wordsData.short,
        ...wordsData.medium,
        ...wordsData.long
    ];
    
    console.log('全単語数:', allWords.length);
    
    // シャッフル
    gameState.wordList = shuffleArray([...allWords]);
    
    // UI初期化
    const scoreEl = document.getElementById('score');
    const inputField = document.getElementById('input-field');
    
    if (scoreEl) scoreEl.textContent = '0';
    if (inputField) inputField.value = '';
    
    // ゲージ初期化
    if (currentMode === 'rank') {
        const gauges = document.getElementById('gauges');
        const timeDisplay = document.getElementById('time-display');
        const correctGaugeText = document.getElementById('correct-gauge-text');
        const correctGauge = document.getElementById('correct-gauge');
        const missGaugeText = document.getElementById('miss-gauge-text');
        const missGauge = document.getElementById('miss-gauge');
        
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
        
        if (timeDisplay) timeDisplay.style.display = 'none';
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
    
    if (currentMode === 'normal') {
        gameTimer = setInterval(() => {
            gameState.timeLeft--;
            const timeEl = document.getElementById('time');
            if (timeEl) timeEl.textContent = gameState.timeLeft;
            
            if (gameState.timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }
    
    // 入力フィールドにフォーカス
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
        // 単語が足りない場合は再シャッフル
        const allWords = [
            ...wordsData.short,
            ...wordsData.medium,
            ...wordsData.long
        ];
        gameState.wordList = shuffleArray([...allWords]);
        gameState.wordIndex = 0;
    }
    
    gameState.currentWord = gameState.wordList[gameState.wordIndex++];
    gameState.currentRomaji = convertToRomaji(gameState.currentWord);
    gameState.currentPosition = 0;
    
    console.log('新しい単語:', gameState.currentWord.join(''));
    
    displayWord();
}

// ひらがなをローマ字に変換
function convertToRomaji(hiraganaArray) {
    const result = [];
    
    for (let i = 0; i < hiraganaArray.length; i++) {
        const char = hiraganaArray[i];
        
        // 促音処理
        if (char === 'っ') {
            if (i + 1 < hiraganaArray.length) {
                const nextChar = hiraganaArray[i + 1];
                const nextRomaji = ROMAJI_TABLE[nextChar];
                if (nextRomaji && nextRomaji[0]) {
                    const firstChar = nextRomaji[0][0];
                    result.push([firstChar, 'xtu', 'ltu']);
                    continue;
                }
            }
            result.push(ROMAJI_TABLE['っ']);
            continue;
        }
        
        // 拗音処理
        if (i + 1 < hiraganaArray.length) {
            const nextChar = hiraganaArray[i + 1];
            if (['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'].includes(nextChar)) {
                const comboRomaji = getComboRomaji(char, nextChar);
                if (comboRomaji) {
                    result.push(comboRomaji);
                    i++;
                    continue;
                }
            }
        }
        
        // 「ん」の処理
        if (char === 'ん') {
            if (i === hiraganaArray.length - 1) {
                // 最後の「ん」はnn固定
                result.push(['nn']);
            } else {
                // 途中の「ん」
                const nextChar = hiraganaArray[i + 1];
                const nextRomaji = ROMAJI_TABLE[nextChar];
                if (nextRomaji && nextRomaji[0]) {
                    const firstChar = nextRomaji[0][0];
                    // n + aiueoyna以外ならnでもOK
                    if (!'aiueoyn'.includes(firstChar)) {
                        result.push(['nn', 'n']);
                    } else {
                        result.push(['nn']);
                    }
                } else {
                    result.push(['nn', 'n']);
                }
            }
            continue;
        }
        
        // 通常の文字
        if (ROMAJI_TABLE[char]) {
            result.push(ROMAJI_TABLE[char]);
        }
    }
    
    return result;
}

// 拗音組み合わせローマ字取得
function getComboRomaji(char, smallChar) {
    const combinations = {
        'き': { 'ゃ': ['kya'], 'ゅ': ['kyu'], 'ょ': ['kyo'] },
        'し': { 'ゃ': ['sya', 'sha'], 'ゅ': ['syu', 'shu'], 'ょ': ['syo', 'sho'] },
        'ち': { 'ゃ': ['tya', 'cha'], 'ゅ': ['tyu', 'chu'], 'ょ': ['tyo', 'cho'] },
        'に': { 'ゃ': ['nya'], 'ゅ': ['nyu'], 'ょ': ['nyo'] },
        'ひ': { 'ゃ': ['hya'], 'ゅ': ['hyu'], 'ょ': ['hyo'] },
        'み': { 'ゃ': ['mya'], 'ゅ': ['myu'], 'ょ': ['myo'] },
        'り': { 'ゃ': ['rya'], 'ゅ': ['ryu'], 'ょ': ['ryo'] },
        'ぎ': { 'ゃ': ['gya'], 'ゅ': ['gyu'], 'ょ': ['gyo'] },
        'じ': { 'ゃ': ['zya', 'ja'], 'ゅ': ['zyu', 'ju'], 'ょ': ['zyo', 'jo'] },
        'び': { 'ゃ': ['bya'], 'ゅ': ['byu'], 'ょ': ['byo'] },
        'ぴ': { 'ゃ': ['pya'], 'ゅ': ['pyu'], 'ょ': ['pyo'] },
        'ふ': { 'ぁ': ['fa'], 'ぃ': ['fi'], 'ぇ': ['fe'], 'ぉ': ['fo'] },
        'う': { 'ぃ': ['wi'], 'ぇ': ['we'] },
        'て': { 'ぃ': ['thi'], 'ゅ': ['thu'] },
        'で': { 'ぃ': ['dhi'], 'ゅ': ['dhu'] }
    };
    
    if (combinations[char] && combinations[char][smallChar]) {
        return combinations[char][smallChar];
    }
    
    return null;
}

// 単語表示
function displayWord() {
    const japaneseWordEl = document.getElementById('japanese-word');
    const romajiWordEl = document.getElementById('romaji-word');
    
    if (!japaneseWordEl || !romajiWordEl) return;
    
    japaneseWordEl.textContent = gameState.currentWord.join('');
    
    // ローマ字表示（現在の入力位置を強調）
    let romajiHTML = '';
    let charIndex = 0;
    
    for (let i = 0; i < gameState.currentRomaji.length; i++) {
        const options = gameState.currentRomaji[i];
        const displayRomaji = options[0]; // 最初のオプションを表示
        
        for (let j = 0; j < displayRomaji.length; j++) {
            if (charIndex < gameState.currentPosition) {
                romajiHTML += `<span class="correct">${displayRomaji[j]}</span>`;
            } else if (charIndex === gameState.currentPosition) {
                romajiHTML += `<span class="current">${displayRomaji[j]}</span>`;
            } else {
                romajiHTML += `<span class="remaining">${displayRomaji[j]}</span>`;
            }
            charIndex++;
        }
    }
    
    romajiWordEl.innerHTML = romajiHTML;
}

// 入力処理
function handleInput(e) {
    const input = e.target.value.toLowerCase();
    
    if (input.length === 0) return;
    
    // 現在の文字の全ローマ字候補を取得
    let currentCharOptions = [];
    let currentCharStart = 0;
    let charsSoFar = 0;
    
    for (let i = 0; i < gameState.currentRomaji.length; i++) {
        const romajiOptions = gameState.currentRomaji[i];
        const romajiLength = romajiOptions[0].length;
        
        if (gameState.currentPosition >= charsSoFar && gameState.currentPosition < charsSoFar + romajiLength) {
            currentCharOptions = romajiOptions;
            currentCharStart = charsSoFar;
            break;
        }
        
        charsSoFar += romajiLength;
    }
    
    if (currentCharOptions.length === 0) {
        return;
    }
    
    // 入力が正しいか確認
    const inputFromStart = input.substring(0, input.length);
    const expectedStart = gameState.currentPosition - currentCharStart;
    
    let matched = false;
    
    for (let option of currentCharOptions) {
        const expectedPart = option.substring(expectedStart, expectedStart + inputFromStart.length);
        
        if (inputFromStart === expectedPart) {
            matched = true;
            gameState.currentPosition++;
            gameState.correctCount++;
            gameState.totalKeystrokes++;
            gameState.score += 5;
            
            // スコア更新
            const scoreEl = document.getElementById('score');
            if (scoreEl) scoreEl.textContent = gameState.score;
            
            // ゲージ更新
            updateGauges();
            
            // 単語完成チェック
            let totalLength = 0;
            for (let romaji of gameState.currentRomaji) {
                totalLength += romaji[0].length;
            }
            
            if (gameState.currentPosition >= totalLength) {
                // 次の単語へ
                e.target.value = '';
                loadNextWord();
            } else {
                e.target.value = '';
                displayWord();
            }
            
            // 段位モードのノルマチェック
            if (currentMode === 'rank' && gameState.correctCount >= currentRank.requirement) {
                endGame();
            }
            
            break;
        }
    }
    
    if (!matched) {
        // ミス
        gameState.missCount++;
        gameState.totalKeystrokes++;
        gameState.score = Math.max(0, gameState.score - 3);
        
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = gameState.score;
        e.target.value = '';
        
        // ゲージ更新
        updateGauges();
        
        // 段位モードのミス判定
        if (currentMode === 'rank' && currentRank.missLimit !== null) {
            if (gameState.missCount >= currentRank.missLimit) {
                endGame();
            }
        }
    }
}

// ゲージ更新
function updateGauges() {
    if (currentMode === 'rank') {
        // 正打鍵ゲージ
        const correctPercent = Math.min(100, (gameState.correctCount / currentRank.requirement) * 100);
        const correctGauge = document.getElementById('correct-gauge');
        const correctGaugeText = document.getElementById('correct-gauge-text');
        
        if (correctGauge) correctGauge.style.width = correctPercent + '%';
        if (correctGaugeText) {
            correctGaugeText.textContent = `${gameState.correctCount} / ${currentRank.requirement}`;
        }
        
        // ミスゲージ
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
    
    // リザルト表示
    const finalScore = document.getElementById('final-score');
    const finalCorrect = document.getElementById('final-correct');
    const finalKps = document.getElementById('final-kps');
    const finalMiss = document.getElementById('final-miss');
    
    if (finalScore) finalScore.textContent = gameState.score;
    if (finalCorrect) finalCorrect.textContent = gameState.correctCount;
    if (finalKps) finalKps.textContent = kps;
    if (finalMiss) finalMiss.textContent = gameState.missCount;
    
    // 合格判定
    let passed = false;
    const resultAnimation = document.getElementById('result-animation');
    const resultContent = document.getElementById('result-content');
    
    if (currentMode === 'rank') {
        const metRequirement = gameState.correctCount >= currentRank.requirement;
        const withinMissLimit = currentRank.missLimit === null || gameState.missCount < currentRank.missLimit;
        
        passed = metRequirement && withinMissLimit;
        
        if (passed) {
            // 合格
            if (resultAnimation) resultAnimation.innerHTML = '<div class="pass-animation">合　格</div>';
            if (resultContent) resultContent.classList.remove('fail');
            
            // 最高スコア保存
            saveHighScore();
            
            // 段位解放チェック
            const rankIndex = RANKS.findIndex(r => r.id === currentRank.id);
            unlockNextRank(rankIndex);
        } else {
            // 不合格
            if (resultAnimation) resultAnimation.innerHTML = '<div class="fail-animation">不合格</div>';
            if (resultContent) resultContent.classList.add('fail');
        }
    } else {
        // 通常モード
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
