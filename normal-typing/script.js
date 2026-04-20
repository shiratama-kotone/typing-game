// グローバル変数
let wordsData = null;
let currentMode = null;
let currentRank = null;
let gameTimer = null;
let startTime = null;

// サウンドエフェクト (音楽プレイヤー変数は削除)
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
    'わ':['wa'],'を':['wo'],'ん':['nn','n'],'ー':['-']
};

// 拗音組み合わせローマ字
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
    'でゅ': ['dhu']
};

// 初期化
window.addEventListener('DOMContentLoaded', async () => {
    await loadWords();
    setupAudio();
    setupEventListeners();
});

// サウンドエフェクトの設定 (音楽プレイヤー関連は削除)
function setupAudio() {
    typingSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%82%BF%E3%82%A4%E3%83%94%E3%83%B3%E3%82%B0-%E3%83%91%E3%83%B3%E3%82%BF%E3%82%B0%E3%83%A9%E3%83%95%E5%8D%982.mp3');
    typingSound.volume = 0.2;

    missSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/%E3%83%9F%E3%82%B9.mp3');
    missSound.volume = 0.3;

    bonusSound = new Audio('https://github.com/shiratama-kotone/typing-game/raw/refs/heads/main/assets/mario-1up_eSTTTOB.mp3');
    bonusSound.volume = 0.4;
}

// サウンド再生
function playTypingSound() { if (typingSound) { typingSound.currentTime = 0; typingSound.play().catch(e => {}); } }
function playMissSound() { if (missSound) { missSound.currentTime = 0; missSound.play().catch(e => {}); } }
function playBonusSound() { if (bonusSound) { bonusSound.currentTime = 0; bonusSound.play().catch(e => {}); } }

// 単語データ読み込み
async function loadWords() {
    try {
        const response = await fetch('words.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        wordsData = await response.json();
    } catch (error) {
        console.error('単語データの読み込みに失敗:', error);
    }
}

// イベントリスナー
function setupEventListeners() {
    const inputField = document.getElementById('input-field');
    if (inputField) {
        inputField.addEventListener('input', handleInput);
    }
    document.addEventListener('keydown', handleRankSelectKeydown);
}

// 画面切り替え
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');
}

function showTitleScreen() { switchScreen('title-screen'); }
function showModeSelect() { switchScreen('mode-select-screen'); }
function showRankSelect() { switchScreen('rank-select-screen'); createRankCarousel(); }

// 段位カルーセル作成
function createRankCarousel() {
    const carousel = document.getElementById('rank-carousel');
    if (!carousel) return;
    carousel.innerHTML = '';
    const unlockedRanks = getUnlockedRanks();
    let selectedIndex = 0;
    updateRankCarousel(selectedIndex);
    carousel.dataset.selectedIndex = selectedIndex;
}

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
        if (index > unlockedRanks) rankBox.classList.add('locked');
        if (index === selectedIndex) rankBox.classList.add('selected');
        carousel.appendChild(rankBox);
    }
}

// 段位選択キー操作
function handleRankSelectKeydown(e) {
    const rankScreen = document.getElementById('rank-select-screen');
    if (!rankScreen || !rankScreen.classList.contains('active')) return;
    const carousel = document.getElementById('rank-carousel');
    if (!carousel) return;

    let currentIndex = parseInt(carousel.dataset.selectedIndex || 0);
    const unlockedRanks = getUnlockedRanks();
    
    if (e.key === 'ArrowLeft') currentIndex = Math.max(0, currentIndex - 1);
    else if (e.key === 'ArrowRight') currentIndex = Math.min(unlockedRanks, currentIndex + 1);
    else if (e.key === 'Enter') { startRankMode(currentIndex); return; }
    else return;

    carousel.dataset.selectedIndex = currentIndex;
    updateRankCarousel(currentIndex);
}

function getUnlockedRanks() { return parseInt(localStorage.getItem('unlockedRanks') || 0); }
function unlockNextRank(index) {
    const unlocked = getUnlockedRanks();
    if (index === unlocked && index < RANKS.length - 1) {
        localStorage.setItem('unlockedRanks', index + 1);
        showRankUnlockAnimation(RANKS[index + 1].name);
    }
}

function showRankUnlockAnimation(name) {
    const overlay = document.getElementById('rank-unlock-overlay');
    const text = document.getElementById('unlock-text');
    if (overlay && text) {
        text.textContent = `${name} 解禁 !!`;
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 5000);
    }
}

// ゲーム開始処理
async function startNormalMode() { currentMode = 'normal'; currentRank = null; initGame(); switchScreen('game-screen'); startGame(); }
async function startRankMode(index) { currentMode = 'rank'; currentRank = RANKS[index]; initGame(); switchScreen('game-screen'); startGame(); }

function initGame() {
    gameState = {
        score: 0, correctCount: 0, missCount: 0, currentWord: null, displayWord: null,
        currentRomaji: [], currentPosition: 0, currentCharIndex: 0, currentCharPosition: 0,
        wordList: shuffleArray([...wordsData.short, ...wordsData.medium, ...wordsData.long]),
        wordIndex: 0, timeLeft: 60, totalKeystrokes: 0, comboCount: 0
    };
    document.getElementById('score').textContent = '0';
    document.getElementById('time').textContent = '60';
    updateGauges();
}

function startGame() {
    startTime = Date.now();
    loadNextWord();
    gameTimer = setInterval(() => {
        gameState.timeLeft--;
        document.getElementById('time').textContent = gameState.timeLeft;
        if (gameState.timeLeft <= 0) endGame();
    }, 1000);
    const inputField = document.getElementById('input-field');
    inputField.value = '';
    inputField.focus();
}

function loadNextWord() {
    if (gameState.wordIndex >= gameState.wordList.length) gameState.wordIndex = 0;
    const wordObj = gameState.wordList[gameState.wordIndex++];
    gameState.currentWord = wordObj.kana;
    gameState.displayWord = wordObj.word;
    gameState.currentRomaji = convertToRomaji(gameState.currentWord);
    gameState.currentCharIndex = 0;
    gameState.currentCharPosition = 0;
    displayWord();
}

// ローマ字変換ロジック
function convertToRomaji(hiraganaArray) {
    const result = [];
    let i = 0;
    while (i < hiraganaArray.length) {
        if (hiraganaArray[i] === 'っ' && i + 1 < hiraganaArray.length) {
            const nextRomaji = ROMAJI_TABLE[hiraganaArray[i + 1]];
            if (nextRomaji) {
                result.push({ options: [nextRomaji[0][0], 'xtu', 'ltu'], current: nextRomaji[0][0] });
                i++; continue;
            }
        }
        if (i + 1 < hiraganaArray.length) {
            const combo = hiraganaArray[i] + hiraganaArray[i + 1];
            if (COMBO_ROMAJI[combo]) {
                result.push({ options: COMBO_ROMAJI[combo], current: COMBO_ROMAJI[combo][0] });
                i += 2; continue;
            }
        }
        if (hiraganaArray[i] === 'ん') {
            result.push(i === hiraganaArray.length - 1 ? { options: ['nn'], current: 'nn' } : { options: ['n', 'nn'], current: 'n' });
            i++; continue;
        }
        const char = hiraganaArray[i];
        if (ROMAJI_TABLE[char]) result.push({ options: ROMAJI_TABLE[char], current: ROMAJI_TABLE[char][0] });
        i++;
    }
    return result;
}

function displayWord() {
    const japaneseWordEl = document.getElementById('japanese-word');
    const romajiWordEl = document.getElementById('romaji-word');
    japaneseWordEl.textContent = gameState.displayWord || gameState.currentWord.join('');
    let romajiHTML = '';
    gameState.currentRomaji.forEach((charObj, i) => {
        const romaji = charObj.current;
        for (let j = 0; j < romaji.length; j++) {
            let cls = 'remaining';
            if (i < gameState.currentCharIndex || (i === gameState.currentCharIndex && j < gameState.currentCharPosition)) cls = 'correct';
            else if (i === gameState.currentCharIndex && j === gameState.currentCharPosition) cls = 'current';
            romajiHTML += `<span class="${cls}">${romaji[j]}</span>`;
        }
    });
    romajiWordEl.innerHTML = romajiHTML;
}

// 入力処理
function handleInput(e) {
    const input = e.target.value.toLowerCase();
    if (input.length === 0) return;
    const currentChar = gameState.currentRomaji[gameState.currentCharIndex];
    let matched = false;

    const checkMatch = (pattern) => pattern.substring(gameState.currentCharPosition).startsWith(input);

    if (checkMatch(currentChar.current)) matched = true;
    else {
        const alt = currentChar.options.find(opt => checkMatch(opt));
        if (alt) { currentChar.current = alt; matched = true; }
    }

    if (matched) {
        playTypingSound();
        gameState.currentCharPosition += input.length;
        gameState.correctCount += input.length;
        gameState.totalKeystrokes += input.length;
        gameState.score += 5 * input.length;
        gameState.comboCount += input.length;
        if (gameState.comboCount >= 100) { playBonusSound(); gameState.timeLeft += 10; gameState.comboCount = 0; }
        if (gameState.currentCharPosition >= currentChar.current.length) { gameState.currentCharIndex++; gameState.currentCharPosition = 0; }
        if (gameState.currentCharIndex >= gameState.currentRomaji.length) loadNextWord();
    } else {
        playMissSound();
        gameState.missCount++;
        gameState.totalKeystrokes++;
        gameState.score = Math.max(0, gameState.score - 3);
        gameState.comboCount = 0;
        if (currentMode === 'rank' && currentRank.missLimit !== null && gameState.missCount >= currentRank.missLimit) endGame();
    }
    e.target.value = '';
    document.getElementById('score').textContent = gameState.score;
    updateGauges();
    displayWord();
}

function updateGauges() {
    const comboPercent = (gameState.comboCount % 100);
    document.getElementById('combo-gauge').style.width = comboPercent + '%';
    document.getElementById('combo-gauge-text').textContent = `${gameState.comboCount % 100} / 100`;

    if (currentMode === 'rank') {
        const correctPercent = Math.min(100, (gameState.correctCount / currentRank.requirement) * 100);
        document.getElementById('correct-gauge').style.width = correctPercent + '%';
        document.getElementById('correct-gauge-text').textContent = `${gameState.correctCount} / ${currentRank.requirement}`;
        if (currentRank.missLimit !== null) {
            const remainingMiss = Math.max(0, currentRank.missLimit - gameState.missCount);
            document.getElementById('miss-gauge').style.width = (remainingMiss / currentRank.missLimit * 100) + '%';
            document.getElementById('miss-gauge-text').textContent = remainingMiss;
        }
    }
}

function endGame() {
    if (gameTimer) clearInterval(gameTimer);
    const elapsedTime = (Date.now() - startTime) / 1000;
    const kps = elapsedTime > 0 ? (gameState.totalKeystrokes / elapsedTime).toFixed(2) : 0;
    document.getElementById('final-score').textContent = gameState.score;
    document.getElementById('final-correct').textContent = gameState.correctCount;
    document.getElementById('final-kps').textContent = kps;
    document.getElementById('final-miss').textContent = gameState.missCount;

    let passed = false;
    const resAnim = document.getElementById('result-animation');
    const resCont = document.getElementById('result-content');

    if (currentMode === 'rank') {
        passed = (gameState.correctCount >= currentRank.requirement) && (currentRank.missLimit === null || gameState.missCount < currentRank.missLimit);
        resAnim.innerHTML = passed ? '<div class="pass-animation">合　格</div>' : '<div class="fail-animation">不合格</div>';
        if (passed) {
            resCont.classList.remove('fail');
            unlockNextRank(RANKS.findIndex(r => r.id === currentRank.id));
        } else resCont.classList.add('fail');
    } else {
        resAnim.innerHTML = '';
        resCont.classList.remove('fail');
    }
    saveHighScore();
    switchScreen('result-screen');
}

function saveHighScore() {
    const key = currentMode === 'rank' ? `highscore_${currentRank.id}` : 'highscore_normal';
    const currentHigh = parseInt(localStorage.getItem(key) || 0);
    const highScoreText = document.getElementById('high-score-text');
    if (gameState.score > currentHigh) {
        localStorage.setItem(key, gameState.score);
        highScoreText.textContent = `🎉 新記録！ 前回: ${currentHigh}`;
    } else highScoreText.textContent = `最高スコア: ${currentHigh}`;
}

function backToMenu() { showModeSelect(); }
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
