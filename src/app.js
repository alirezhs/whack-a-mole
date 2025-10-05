// app.js - اصلاح‌شده برای Vite

console.log('Script started');

// ES Module import - بدون try/catch
import { 
    difficultySettings,
    increaseScore,
    spawnMole,
    resetMolePosition,
    getCurrentSpeed,
    getInitialTime,
    shouldChangeSpeed,
    isValidDifficulty
} from './gameLogic.js';

// Utility to log
let logBuffer = '';
function log(message) {
    console.log(message);
    logBuffer += message + '\n';
}
function saveLogFile() {
    const blob = new Blob([logBuffer], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'whackamole_log.txt';
    a.click();
}

// DOM elements
let squares, timeLeft, score, highScore, final, startButton, pauseButton, restartButton, resetHighScoreButton, highScoreMessage, difficultyButtons;

// Initialize DOM elements
function initializeDOM() {
    log('initializeDOM called');
    squares = document.querySelectorAll('.square');
    timeLeft = document.querySelector('#time-left');
    score = document.querySelector('#score');
    highScore = document.querySelector('#high-score');
    final = document.querySelector('#final-score');
    startButton = document.querySelector('#start-button');
    pauseButton = document.querySelector('#pause-button');
    restartButton = document.querySelector('#restart-button');
    resetHighScoreButton = document.querySelector('#reset-highscore-button');
    highScoreMessage = document.querySelector('#high-score-message');
    difficultyButtons = document.querySelectorAll('.difficulty-btn');

    if (!timeLeft || !squares || squares.length === 0 || !startButton || !score || difficultyButtons.length === 0) {
        log('Error: some DOM elements missing');
        return false;
    }
    log('DOM initialized successfully');
    return true;
}

// Audio
let hitSound = new Audio('audio/whack01.mp3');

let result = 0, hit = null, currentTime = 30, timer = null, countDownTimer = null, isGameRunning = false, isGamePaused = false;

// Difficulty
let currentDifficulty = localStorage.getItem('whackAMoleCurrentDifficulty');
if (!isValidDifficulty(currentDifficulty)) {
    currentDifficulty = 'easy';
    localStorage.setItem('whackAMoleCurrentDifficulty', currentDifficulty);
}

// Initial time
currentTime = getInitialTime(currentDifficulty) || 30;

// Timer UI
function updateTimerUI() {
    if (timeLeft) timeLeft.textContent = currentTime;
}

// Difficulty button
function setActiveDifficultyButton() {
    if (difficultyButtons) {
        difficultyButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level === currentDifficulty);
        });
    }
}

// High score functions
function getHighScore(difficulty = currentDifficulty) {
    return parseInt(localStorage.getItem(`whackAMoleHighScore_${difficulty}`)) || 0;
}

function setHighScore(value, difficulty = currentDifficulty) {
    localStorage.setItem(`whackAMoleHighScore_${difficulty}`, value);
    if (difficulty === currentDifficulty && highScore) highScore.textContent = value;
}

function updateHighScoreDisplay() {
    if (highScore) highScore.textContent = getHighScore();
}

function checkHighScore() {
    const currentHigh = getHighScore();
    if (result > currentHigh) {
        setHighScore(result);
        if (highScoreMessage) {
            highScoreMessage.textContent = "🎉 New High Score! 🎉";
            highScoreMessage.style.display = 'block';
            setTimeout(() => highScoreMessage.style.display = 'none', 3000);
        }
    }
}

function resetHighScore() {
    if (confirm(`Reset ${currentDifficulty.toUpperCase()} High Score?`)) {
        setHighScore(0);
        if (highScoreMessage) {
            highScoreMessage.textContent = "High Score Reset!";
            highScoreMessage.style.display = 'block';
            setTimeout(() => highScoreMessage.style.display = 'none', 2000);
        }
    }
}

// Game logic
function resetGame(keepTime = false) {
    clearInterval(timer);
    clearInterval(countDownTimer);
    result = 0;
    if (score) score.textContent = result;
    if (final) final.textContent = '';
    if (squares) squares.forEach(s => s.classList.remove('mole'));
    resetMolePosition();
    isGamePaused = false;
    isGameRunning = false;
    if (startButton) startButton.disabled = false;
    if (pauseButton) {
        pauseButton.disabled = true;
        pauseButton.textContent = 'Pause';
    }
    if (restartButton) restartButton.disabled = true;
    if (!keepTime) currentTime = getInitialTime(currentDifficulty);
    updateTimerUI();
    updateHighScoreDisplay();
}

function startGame() {
    if (isGameRunning) return;
    resetGame(true);
    isGameRunning = true;
    if (startButton) startButton.disabled = true;
    if (pauseButton) pauseButton.disabled = false;
    if (restartButton) restartButton.disabled = false;
    moveMole();
    countDownTimer = setInterval(countDown, 1000);
}

function pauseGame() {
    if (!isGameRunning) return;
    if (!isGamePaused) {
        clearInterval(timer);
        clearInterval(countDownTimer);
        if (pauseButton) pauseButton.textContent = 'Resume';
        isGamePaused = true;
    } else {
        moveMole();
        countDownTimer = setInterval(countDown, 1000);
        if (pauseButton) pauseButton.textContent = 'Pause';
        isGamePaused = false;
    }
}

function randomSquare() {
    squares.forEach(s => s.classList.remove('mole'));
    const idx = spawnMole(9, true);
    if (squares[idx]) {
        squares[idx].classList.add('mole');
        hit = squares[idx].id;
    }
}

function moveMole() {
    clearInterval(timer);
    const speed = getCurrentSpeed(currentTime, currentDifficulty);
    timer = setInterval(randomSquare, speed);
}

function countDown() {
    currentTime--;
    updateTimerUI();
    if (shouldChangeSpeed(currentTime, currentDifficulty)) moveMole();
    if (currentTime <= 0) {
        clearInterval(timer);
        clearInterval(countDownTimer);
        if (final) final.textContent = `Your final score: ${result}`;
        checkHighScore();
        if (squares) squares.forEach(s => s.classList.remove('mole'));
        isGameRunning = false;
        if (startButton) startButton.disabled = true;
        if (pauseButton) pauseButton.disabled = true;
        if (restartButton) restartButton.disabled = false;
        saveLogFile();
    }
}

// Square click listeners
function setupSquareListeners() {
    squares.forEach(square => {
        square.addEventListener('mousedown', () => {
            if (square.id === hit && isGameRunning && !isGamePaused) {
                result = increaseScore(result, currentDifficulty, currentTime);
                if (score) score.textContent = result;
                hit = null;
                hitSound.currentTime = 0;
                hitSound.play().catch(()=>{});
            }
        });
    });
}

// Difficulty handler
function setDifficulty(difficulty) {
    currentDifficulty = difficulty;
    localStorage.setItem('whackAMoleCurrentDifficulty', difficulty);
    setActiveDifficultyButton();
    resetGame();
}

// Event listeners
function setupEventListeners() {
    if (startButton) startButton.addEventListener('click', startGame);
    if (pauseButton) pauseButton.addEventListener('click', pauseGame);
    if (restartButton) restartButton.addEventListener('click', () => resetGame());
    if (resetHighScoreButton) resetHighScoreButton.addEventListener('click', resetHighScore);
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isGameRunning) setDifficulty(btn.dataset.level);
        });
    });
    setupSquareListeners();
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (initializeDOM()) {
        setActiveDifficultyButton();
        updateTimerUI();
        updateHighScoreDisplay();
        setupEventListeners();
    }
});
