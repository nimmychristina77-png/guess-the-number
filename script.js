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

const settings = {
    easy: { max: 50, attempts: 10, label: 'Easy' },
    medium: { max: 100, attempts: 10, label: 'Medium' },
    hard: { max: 200, attempts: 8, label: 'Hard' }
};

let currentMode = 'medium';
let maxRange = settings.medium.max;
let rand = Math.floor(Math.random() * maxRange) + 1;
let attempts = settings.medium.attempts;
let hints = 1;
let guesses = [];
let lastDiff = null;
let isAnimating = false;

function getDistancePercent(guess, target, max) {
    const maxDistance = max;
    const distance = Math.abs(guess - target);
    return Math.max(0, 100 - (distance / maxDistance) * 100);
}

function updateWarmthIndicator(guess) {
    const percent = getDistancePercent(guess, rand, maxRange);
    warmthIndicator.innerHTML = `<div class="warmth-fill" style="width: ${percent}%"></div>`;
}

function updateRangeFill() {
    const rangeFill = document.querySelector('.range-fill');
    const percent = ((rand - 1) / maxRange) * 100;
    setTimeout(() => {
        rangeFill.style.width = percent + '%';
    }, 500);
}

function updateDisplay() {
    maxRangeDisplay.textContent = maxRange;
    attemptsLeft.textContent = attempts;
    hintsLeft.textContent = hints;
    scoreValue.textContent = attempts;
    historyCount.textContent = guesses.length;
    input.min = 1;
    input.max = maxRange;
    input.placeholder = `Enter a number 1-${maxRange}`;
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

function fireGoldConfetti() {
    if (typeof confetti === 'function') {
        const colors = ['#d4a853', '#e8c068', '#f0d990', '#a69070'];
        
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: colors,
            shapes: ['circle', 'square'],
            scalar: 1.2
        });
        
        setTimeout(() => {
            confetti({
                particleCount: 50,
                spread: 100,
                origin: { y: 0.7 },
                colors: colors,
                shapes: ['circle'],
                scalar: 0.8
            });
        }, 150);
    }
}

function playVictorySound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            const startTime = now + i * 0.15;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
            
            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    } catch (e) {
        console.warn('Audio not available');
    }
}

function setResultState(state, text) {
    result.className = 'result-message ' + state;
    resultText.textContent = text;
    
    const icons = {
        default: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
        warm: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M2 12h20M6 6l12 12M18 6L6 18"/></svg>',
        cold: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M2 12h20"/></svg>',
        success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 6L9 17l-5-5"/></svg>',
        victory: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
    };
    
    resultIcon.innerHTML = icons[state] || icons.default;
}

function showVictory() {
    victoryNumber.textContent = rand;
    victoryScore.textContent = attempts;
    victoryOverlay.classList.add('active');
    
    fireGoldConfetti();
    playVictorySound();
    updateHighScoreIfNeeded();
    
    setTimeout(() => {
        victoryOverlay.classList.remove('active');
        resetGame();
    }, 3000);
}

function resetGame() {
    rand = Math.floor(Math.random() * maxRange) + 1;
    attempts = settings[currentMode].attempts;
    hints = 1;
    guesses = [];
    lastDiff = null;
    
    input.value = '';
    input.disabled = false;
    checkBtn.disabled = false;
    hintBtn.disabled = false;
    
    setResultState('default', 'Test your intuition');
    updateDisplay();
    updateGuessList();
    updateRangeFill();
    warmthIndicator.innerHTML = '';
    
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

function provideHint() {
    if (hints <= 0) return;
    
    const parity = rand % 2 === 0 ? 'even' : 'odd';
    const midpoint = Math.floor(maxRange / 2);
    const range = rand <= midpoint 
        ? `1-${midpoint}` 
        : `${midpoint + 1}-${maxRange}`;
    
    setResultState('default', `The number is ${parity}, in range ${range}.`);
    
    hints -= 1;
    hintsLeft.textContent = hints;
    
    if (hints <= 0) {
        hintBtn.disabled = true;
    }
}

function check() {
    if (isAnimating) return;
    
    const guess = Number(input.value);
    
    if (!guess || guess < 1 || guess > maxRange) {
        setResultState('default', `Enter a number between 1 and ${maxRange}.`);
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 400);
        return;
    }
    
    guesses.push(guess);
    updateGuessList();
    updateWarmthIndicator(guess);
    
    const diff = Math.abs(guess - rand);
    const warmth = lastDiff === null ? '' : 
        diff < lastDiff ? ' (warmer)' : 
        diff > lastDiff ? ' (colder)' : '';
    lastDiff = diff;
    
    if (guess === rand) {
        isAnimating = true;
        setResultState('victory', `Correct! It was ${rand}.`);
        
        setTimeout(() => {
            showVictory();
            isAnimating = false;
        }, 800);
        return;
    }
    
    attempts -= 1;
    attemptsLeft.textContent = attempts;
    scoreValue.textContent = attempts;
    
    if (guess < rand) {
        const state = diff < lastDiff ? 'warm' : 'cold';
        setResultState(state, `Too low. Go higher.${warmth}`);
    } else {
        const state = diff < lastDiff ? 'warm' : 'cold';
        setResultState(state, `Too high. Go lower.${warmth}`);
    }
    
    if (attempts <= 0) {
        isAnimating = true;
        setResultState('cold', `Game over. The number was ${rand}.`);
        
        setTimeout(() => {
            resetGame();
            isAnimating = false;
        }, 2500);
    }
}

checkBtn.addEventListener('click', check);

hintBtn.addEventListener('click', provideHint);

resetBtn.addEventListener('click', resetGame);

difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setDifficulty(btn.dataset.mode);
    });
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        check();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === '.') {
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

updateDisplay();
loadHighScore();
updateRangeFill();
input.focus();
