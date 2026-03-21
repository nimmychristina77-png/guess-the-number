const input = document.getElementById('guessnumber');
const checkBtn = document.getElementById('CheckBtn');
const result = document.getElementById('result');
const scoreEl = document.getElementById('score');
const trophy = document.getElementById('trophy');
const bestValue = document.getElementById('bestValue');
const difficulty = document.getElementById('difficulty');
const hintBtn = document.getElementById('hintBtn');
const resetBtn = document.getElementById('resetBtn');
const rangelabel = document.getElementById('rangelabel');
const difficultyLabel = document.getElementById('difficultyLabel');
const attemptsLeft = document.getElementById('attemptsLeft');
const hintsLeft = document.getElementById('hintsLeft');
const guessList = document.getElementById('guessList');

const settings = {
    easy: { max: 50, attempts: 10, label: 'Easy'},
    medium: { max: 100, attempts: 10, label: 'Medium'},
    hard: { max: 200, attempts: 8, label: 'Hard'}
};

let maxRange = settings.medium.max;
let rand = Math.floor(Math.random() * maxRange) + 1;
let tot = settings.medium.attempts;
let hints = 1;
let guesses = [];
let lastDiff = null;

function updateScore(){
    scoreEl.innerText = 'Score: ' + tot;
}

function updateMeta(){
    rangelabel.textContent = '1 - ' + maxRange;
    attemptsLeft.textContent = String(tot);
    hintsLeft.textContent = String(hints);
    input.min = '1';
    input.max = String(maxRange);
    input.placeholder = 'Enter a number 1-' + maxRange;
}

function updateGuessList(){
    guessList.innerHTML = '';
    guesses.slice(-8).forEach((g) => {
        const chip = document.createElement('span');
        chip.textContent = g;
        guessList.appendChild(chip);
    });
}

function loadHighScore(){
    const s = parseInt(localStorage.getItem('gtn_highscore') || '0', 10) || 0;
    bestValue.textContent = s;
    return s;
}

function updateHighScoreIfNeeded(){
    const prev = parseInt(localStorage.getItem('gtn_highscore') || '0', 10) || 0;
    if (tot > prev){
        localStorage.setItem('gtn_highscore', String(tot));
        bestValue.textContent = tot;
        return true;
    }
    return false;
}

function fireConfetti(){
    if (typeof confetti === 'function'){
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        confetti({ particleCount: 60, spread: 120, origin: { y: 0.6 } });
    }
}

function playVictorySound(){
    try{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const freqs = [880, 988, 1318, 1760];
        let t = 0;
        freqs.forEach((f) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            gain.gain.value = 0.0001;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + t);
            gain.gain.linearRampToValueAtTime(0.12, now + t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22);
            osc.stop(now + t + 0.25);
            t += 0.12;
        });
    }
    catch(e){
        console.warn('Audio error', e);
    }
}

function endGame(message){
    result.textContent = message;
    result.classList.add('celebrate');
    checkBtn.disabled = true;
    input.disabled = true;
    hintBtn.disabled = true;
    fireConfetti();
    playVictorySound();
    trophy.classList.add('show');
    updateHighScoreIfNeeded();
    setTimeout(() =>
        result.classList.remove('celebrate'), 1200
    );
    setTimeout(() => {
        trophy.classList.remove('show');
        resetGame();
    }, 2600);
}

function resetGame(){
    rand = Math.floor(Math.random() * maxRange) + 1;
    tot = settings[difficulty.value].attempts;
    hints = 1;
    guesses = [];
    lastDiff = null;
    input.value = '';
    input.disabled = false;
    checkBtn.disabled = false;
    hintBtn.disabled = false;
    result.textContent = 'Enter a number and press Check.';
    updateScore();
    updateMeta();
    updateGuessList();
    input.focus();
}

function applyDifficulty(){
    const config = settings[difficulty.value];
    maxRange = config.max;
    difficultyLabel.textContent = config.label;
    resetGame();
}

function provideHint(){
    if (hints <= 0) return;
    const parity = rand % 2 === 0 ? 'even' : 'odd';
    const bucket = rand <= maxRange / 2 ? `1-${Math.floor(maxRange / 2)}` : `${Math.floor(maxRange / 2) + 1}-${maxRange}`;
    result.textContent = `Hint: The number is ${parity}, range ${bucket}.`;
    hints -= 1;
    updateMeta();
    hintBtn.disabled = hints <= 0;
}

function check(){
    const guess = Number(input.value);
    if (!guess || guess < 1 || guess > maxRange){
        result.textContent = 'Please enter a number between 1 and ' + maxRange + '.';
        return;
    }

    guesses.push(guess);
    updateGuessList();
    const diff = Math.abs(guess - rand);
    const warmth = lastDiff === null ? '' : diff < lastDiff ? ' (warmer)' : diff > lastDiff ? ' (colder)' : ' (same)';
    lastDiff = diff;

    if (guess === rand){
        result.textContent = 'Your guess is right! The number was ' + rand + '.';
        endGame('You won! Final Score: ' + tot);
        return;
    }
    tot -= 1;
    if (guess < rand){
        result.textContent = 'Too low! Try a larger number.' + warmth;
    }
    else{
        result.textContent = 'Too high! Try a smaller number.' + warmth;
    }

    updateScore();
    updateMeta();

    if (tot <= 0){
        endGame('Game over. The correct number was ' + rand + '.');
    }
}

checkBtn.addEventListener('click', check);
hintBtn.addEventListener('click', provideHint);
resetBtn.addEventListener('click', resetGame);
difficulty.addEventListener('change', applyDifficulty);
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') check();
});

document.addEventListener('keydown', function(e){
    if (e.key === '.'){
        if (input.disabled){
            resetGame();
            setTimeout(() => input.focus(), 40);
        }
        else{
            input.focus();
            input.select();
        }
        e.preventDefault();
    }
});

updateScore();
updateMeta();
updateGuessList();
loadHighScore();