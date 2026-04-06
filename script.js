/*
  Guess The Number — Game Logic
  Features: Sound Effects, Timer, Local Storage Scores, Leaderboard
*/

// Grab all the elements we need from the page
const input = document.getElementById('guessnumber');
const checkBtn = document.getElementById('CheckBtn');
const result = document.getElementById('result');
const resultText = result.querySelector('.result-text');
const resultIcon = result.querySelector('.result-icon');
const scoreValue = document.getElementById('scoreValue');
const bestValue = document.getElementById('bestValue');
const difficultyBtns = document.querySelectorAll('.seg-btn');
const hintBtn = document.getElementById('hintBtn');
const hintsLeft = document.getElementById('hintsLeft');
const resetBtn = document.getElementById('resetBtn');
const maxRangeDisplay = document.getElementById('maxRange');
const attemptsLeft = document.getElementById('attemptsLeft');
const guessList = document.getElementById('guessList');
const historyCount = document.getElementById('historyCount');
const victoryOverlay = document.getElementById('victoryOverlay');
const victoryNumber = document.getElementById('victoryNumber');
const victoryScore = document.getElementById('victoryScore');
const warmthIndicator = document.getElementById('warmthIndicator');
const timerLabel = document.getElementById('timerLabel');
const timerBarFill = document.getElementById('timerBarFill');
const soundToggle = document.getElementById('soundToggle');
const soundOnIcon = document.getElementById('soundOnIcon');
const soundOffIcon = document.getElementById('soundOffIcon');
const playerNameInput = document.getElementById('playerNameInput');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardOverlay = document.getElementById('leaderboardOverlay');
const closeLeaderboard = document.getElementById('closeLeaderboard');
const leaderboardList = document.getElementById('leaderboardList');
const clearLeaderboard = document.getElementById('clearLeaderboard');
const lbTabs = document.querySelectorAll('.lb-tab');
const startBtn = document.getElementById('startBtn');

// Game difficulty settings
const settings = {
    easy:   { max: 50,  attempts: 10, timeLimit: 60, label: 'Easy'   },
    medium: { max: 100, attempts: 10, timeLimit: 60, label: 'Medium' },
    hard:   { max: 200, attempts: 8,  timeLimit: 60, label: 'Hard'   }
};

// Game state
let currentMode = 'medium';
let maxRange = settings.medium.max;
let rand = Math.floor(Math.random() * maxRange) + 1;
let attempts = settings.medium.attempts;
let hints = 1;
let guesses = [];
let lastDiff = null;
let isAnimating = false;
let soundEnabled = true;
let timerInterval = null;
let timeLeft = settings.medium.timeLimit;
let gameStarted = false;
let lbFilterDiff = 'all';


// Audio — created lazily on first use (browsers require a user gesture first)
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;

        const profiles = {
            tick: [{ freq: 880, dur: 0.06, vol: 0.08, wave: 'square', delay: 0 }],
            guess: [
                { freq: 440, dur: 0.1, vol: 0.1, wave: 'sine', delay: 0 },
                { freq: 520, dur: 0.1, vol: 0.08, wave: 'sine', delay: 0.08 }
            ],
            warm: [
                { freq: 600, dur: 0.18, vol: 0.12, wave: 'sine', delay: 0 },
                { freq: 800, dur: 0.18, vol: 0.1, wave: 'sine', delay: 0.12 }
            ],
            cold: [{ freq: 220, dur: 0.25, vol: 0.1, wave: 'sawtooth', delay: 0 }],
            hint: [
                { freq: 523.25, dur: 0.15, vol: 0.1, wave: 'sine', delay: 0 },
                { freq: 659.25, dur: 0.15, vol: 0.1, wave: 'sine', delay: 0.1 }
            ],
            gameover: [
                { freq: 300, dur: 0.3, vol: 0.12, wave: 'sawtooth', delay: 0 },
                { freq: 200, dur: 0.4, vol: 0.1, wave: 'sawtooth', delay: 0.25 }
            ],
            victory: [
                { freq: 523.25, dur: 0.4, vol: 0.15, wave: 'sine', delay: 0 },
                { freq: 659.25, dur: 0.4, vol: 0.15, wave: 'sine', delay: 0.15 },
                { freq: 783.99, dur: 0.4, vol: 0.15, wave: 'sine', delay: 0.3 },
                { freq: 1046.50, dur: 0.5, vol: 0.15, wave: 'sine', delay: 0.45 }
            ],
            timeout: [
                { freq: 350, dur: 0.2, vol: 0.1, wave: 'square', delay: 0 },
                { freq: 200, dur: 0.5, vol: 0.12, wave: 'sawtooth', delay: 0.2 }
            ]
        };

        const notes = profiles[type];
        if (!notes) return;

        notes.forEach(({ freq, dur, vol, wave, delay }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = wave;
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);
            const t = now + delay;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(vol, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.start(t);
            osc.stop(t + dur + 0.05);
        });
    } catch (e) {
        console.warn('Audio error:', e);
    }
}

// Toggle sound on/off and remember the preference
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundOnIcon.style.display = soundEnabled ? '' : 'none';
    soundOffIcon.style.display = soundEnabled ? 'none' : '';
    soundToggle.setAttribute('title', soundEnabled ? 'Sound On' : 'Sound Off');
    localStorage.setItem('gtn_sound', soundEnabled ? '1' : '0');
});

function loadSoundPref() {
    const stored = localStorage.getItem('gtn_sound');
    if (stored === '0') {
        soundEnabled = false;
        soundOnIcon.style.display = 'none';
        soundOffIcon.style.display = '';
    }
}


// Timer
function startTimer() {
    clearInterval(timerInterval);
    timeLeft = settings[currentMode].timeLimit;
    renderTimer();

    timerInterval = setInterval(() => {
        timeLeft--;
        renderTimer();

        if (timeLeft <= 10) playSound('tick');

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function renderTimer() {
    if (!gameStarted) {
        timerLabel.textContent = `⏱ ${settings[currentMode].timeLimit}s`;
        timerBarFill.style.width = '100%';
        timerBarFill.style.background = 'linear-gradient(90deg, #7fb069, #a8d08d)';
        timerBarFill.classList.remove('timer-urgent');
        return;
    }

    const total = settings[currentMode].timeLimit;
    const pct = Math.max(0, (timeLeft / total) * 100);
    timerLabel.textContent = `⏱ ${timeLeft}s`;
    timerBarFill.style.width = pct + '%';

    // Shift colour from green to amber to red as time runs low
    if (pct > 60) {
        timerBarFill.style.background = 'linear-gradient(90deg, #7fb069, #a8d08d)';
    } else if (pct > 30) {
        timerBarFill.style.background = 'linear-gradient(90deg, #e8a840, #f0c060)';
    } else {
        timerBarFill.style.background = 'linear-gradient(90deg, #c96b6b, #e88080)';
    }

    timerBarFill.classList.toggle('timer-urgent', pct <= 20);
}

function handleTimeout() {
    if (isAnimating) return;
    isAnimating = true;
    playSound('timeout');
    setResultState('cold', `⏰ Time's up! The number was ${rand}.`);
    input.disabled = true;
    checkBtn.disabled = true;
    hintBtn.disabled = true;

    setTimeout(() => {
        resetGame();
        isAnimating = false;
    }, 2500);
}


// Warmth indicator — shows how close the guess is to the target
function getDistancePercent(guess, target, max) {
    const distance = Math.abs(guess - target);
    return Math.max(0, 100 - (distance / max) * 100);
}

function updateWarmthIndicator(guess) {
    const percent = getDistancePercent(guess, rand, maxRange);
    warmthIndicator.innerHTML = `<div class="warmth-fill" style="width: ${percent}%"></div>`;
}

function updateRangeFill() {
    const rangeFill = document.querySelector('.range-fill');
    const percent = ((rand - 1) / maxRange) * 100;
    setTimeout(() => { rangeFill.style.width = percent + '%'; }, 500);
}


// Update all the visible numbers on screen
function updateDisplay() {
    maxRangeDisplay.textContent = maxRange;
    attemptsLeft.textContent = attempts;
    hintsLeft.textContent = hints;
    scoreValue.textContent = attempts;
    historyCount.textContent = guesses.length;
    input.min = 1;
    input.max = maxRange;
    input.placeholder = `Enter a number 1–${maxRange}`;
}

function updateGuessList() {
    guessList.innerHTML = '';
    guesses.slice(-8).forEach((g) => {
        const chip = document.createElement('span');
        chip.textContent = g;
        guessList.appendChild(chip);
    });
    historyCount.textContent = guesses.length;
}


// High score (stored locally)
function loadHighScore() {
    const s = parseInt(localStorage.getItem('gtn_highscore') || '0', 10) || 0;
    bestValue.textContent = s;
    return s;
}

function updateHighScoreIfNeeded() {
    const prev = parseInt(localStorage.getItem('gtn_highscore') || '0', 10) || 0;
    if (attempts > prev) {
        localStorage.setItem('gtn_highscore', String(attempts));
        bestValue.textContent = attempts;
        return true;
    }
    return false;
}


// Leaderboard — stored in localStorage, capped at 50 entries
const LB_KEY = 'gtn_leaderboard';

function loadLeaderboard() {
    try {
        return JSON.parse(localStorage.getItem(LB_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveLeaderboard(data) {
    localStorage.setItem(LB_KEY, JSON.stringify(data));
}

function addLeaderboardEntry(score) {
    const name = playerNameInput.value.trim() || 'Anonymous';
    const data = loadLeaderboard();
    data.push({
        name,
        score,
        difficulty: currentMode,
        date: new Date().toLocaleDateString()
    });
    data.sort((a, b) => b.score - a.score);
    saveLeaderboard(data.slice(0, 50));
}

function renderLeaderboard(diff) {
    const data = loadLeaderboard();
    const filtered = diff === 'all' ? data : data.filter(e => e.difficulty === diff);
    filtered.sort((a, b) => b.score - a.score);

    if (filtered.length === 0) {
        leaderboardList.innerHTML = '<p class="lb-empty">No scores yet. Start playing!</p>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];

    leaderboardList.innerHTML = filtered.slice(0, 15).map((entry, i) => `
        <div class="lb-row ${i === 0 ? 'lb-top' : ''}">
            <span class="lb-rank">${medals[i] || (i + 1)}</span>
            <span class="lb-name">${escapeHtml(entry.name)}</span>
            <span class="lb-diff lb-diff-${entry.difficulty}">${entry.difficulty}</span>
            <span class="lb-score">${entry.score}</span>
            <span class="lb-date">${entry.date}</span>
        </div>
    `).join('');
}

// Safely escape user input before putting it in HTML
function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function openLeaderboard() {
    lbFilterDiff = 'all';
    lbTabs.forEach(t => t.classList.toggle('active', t.dataset.diff === 'all'));
    renderLeaderboard('all');
    leaderboardOverlay.classList.add('active');
    closeLeaderboard.focus();
}

function closeLeaderboardModal() {
    leaderboardOverlay.classList.remove('active');
}

leaderboardBtn.addEventListener('click', openLeaderboard);
closeLeaderboard.addEventListener('click', closeLeaderboardModal);

leaderboardOverlay.addEventListener('click', (e) => {
    if (e.target === leaderboardOverlay) closeLeaderboardModal();
});

clearLeaderboard.addEventListener('click', () => {
    if (confirm('Clear all leaderboard scores?')) {
        saveLeaderboard([]);
        renderLeaderboard(lbFilterDiff);
    }
});

lbTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        lbFilterDiff = tab.dataset.diff;
        lbTabs.forEach(t => t.classList.toggle('active', t === tab));
        renderLeaderboard(lbFilterDiff);
    });
});


// Confetti burst on win
function fireGoldConfetti() {
    if (typeof confetti !== 'function') return;
    const colors = ['#d4a853', '#e8c068', '#f0d990', '#a69070'];
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors, shapes: ['circle', 'square'], scalar: 1.2 });
    setTimeout(() => {
        confetti({ particleCount: 50, spread: 100, origin: { y: 0.7 }, colors, shapes: ['circle'], scalar: 0.8 });
    }, 150);
}


// Icons for each result state
const icons = {
    default: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    warm:    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M2 12h20M6 6l12 12M18 6L6 18"/></svg>`,
    cold:    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M2 12h20"/></svg>`,
    success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 6L9 17l-5-5"/></svg>`,
    victory: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
};

function setResultState(state, text) {
    result.className = 'result-message ' + state;
    resultText.textContent = text;
    resultIcon.innerHTML = icons[state] || icons.default;
}


// Victory screen
function showVictory() {
    stopTimer();
    victoryNumber.textContent = rand;
    victoryScore.textContent = attempts;
    victoryOverlay.classList.add('active');

    fireGoldConfetti();
    playSound('victory');
    updateHighScoreIfNeeded();
    addLeaderboardEntry(attempts);

    setTimeout(() => {
        victoryOverlay.classList.remove('active');
        resetGame();
    }, 3500);
}


// Reset everything back to a fresh game
function resetGame() {
    stopTimer();
    gameStarted = false;
    rand = Math.floor(Math.random() * maxRange) + 1;
    attempts = settings[currentMode].attempts;
    hints = 1;
    guesses = [];
    lastDiff = null;

    input.value = '';
    input.disabled = true;
    checkBtn.disabled = true;
    hintBtn.disabled = true;

    setResultState('default', 'Press Start Game to begin!');
    updateDisplay();
    updateGuessList();
    updateRangeFill();
    warmthIndicator.innerHTML = '';
    renderTimer();

    startBtn.style.display = '';
    startBtn.focus();
}

function startGame() {
    if (gameStarted) return;
    gameStarted = true;

    input.disabled = false;
    checkBtn.disabled = false;
    hintBtn.disabled = false;
    startBtn.style.display = 'none';

    setResultState('default', 'Test your intuition');
    startTimer();
    input.focus();
}

function setDifficulty(mode) {
    currentMode = mode;
    maxRange = settings[mode].max;

    difficultyBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    resetGame();
}


// Hint — reveals whether the number is odd/even and which half it's in
function provideHint() {
    if (hints <= 0) return;

    const parity = rand % 2 === 0 ? 'even' : 'odd';
    const midpoint = Math.floor(maxRange / 2);
    const range = rand <= midpoint ? `1–${midpoint}` : `${midpoint + 1}–${maxRange}`;

    setResultState('default', `The number is ${parity}, somewhere in ${range}.`);
    playSound('hint');

    hints--;
    hintsLeft.textContent = hints;
    if (hints <= 0) hintBtn.disabled = true;
}


// Check the player's guess
function check() {
    if (isAnimating || !gameStarted) return;

    const guess = Number(input.value);

    if (!guess || guess < 1 || guess > maxRange) {
        setResultState('default', `Please enter a number between 1 and ${maxRange}.`);
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 400);
        return;
    }

    guesses.push(guess);
    updateGuessList();
    updateWarmthIndicator(guess);
    playSound('guess');

    const diff = Math.abs(guess - rand);
    const warmth = lastDiff === null ? '' :
        diff < lastDiff ? ' (warmer!)' :
        diff > lastDiff ? ' (colder...)' : '';
    lastDiff = diff;

    if (guess === rand) {
        isAnimating = true;
        setResultState('victory', `Correct! It was ${rand}. 🎉`);
        playSound('victory');
        setTimeout(() => {
            showVictory();
            isAnimating = false;
        }, 800);
        return;
    }

    attempts--;
    attemptsLeft.textContent = attempts;
    scoreValue.textContent = attempts;

    if (guess < rand) {
        const state = (lastDiff !== null && diff < lastDiff) ? 'warm' : 'cold';
        setResultState(state, `Too low — go higher.${warmth}`);
        playSound(state);
    } else {
        const state = (lastDiff !== null && diff < lastDiff) ? 'warm' : 'cold';
        setResultState(state, `Too high — go lower.${warmth}`);
        playSound(state);
    }

    if (attempts <= 0) {
        isAnimating = true;
        stopTimer();
        playSound('gameover');
        addLeaderboardEntry(0);
        setResultState('cold', `Out of guesses! The number was ${rand}.`);
        setTimeout(() => {
            resetGame();
            isAnimating = false;
        }, 2500);
    }
}


// Remember the player's name between sessions
function loadPlayerName() {
    const name = localStorage.getItem('gtn_player_name') || '';
    playerNameInput.value = name;
}

playerNameInput.addEventListener('input', () => {
    localStorage.setItem('gtn_player_name', playerNameInput.value.trim());
});


// Wire up all buttons
startBtn.addEventListener('click', startGame);
checkBtn.addEventListener('click', check);
hintBtn.addEventListener('click', provideHint);
resetBtn.addEventListener('click', resetGame);

difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => setDifficulty(btn.dataset.mode));
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); check(); }
});

// Press '.' anywhere to jump focus to the input
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLeaderboardModal();
    if (e.key === '.' && document.activeElement !== playerNameInput) {
        e.preventDefault();
        if (input.disabled) {
            resetGame();
            setTimeout(() => input.focus(), 50);
        } else {
            input.focus();
            input.select();
        }
    }
});


// Start everything up
loadSoundPref();
loadPlayerName();
updateDisplay();
loadHighScore();
updateRangeFill();
renderTimer();
startBtn.focus();
