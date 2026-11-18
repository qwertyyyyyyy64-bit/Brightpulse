
"use strict";

// ========================================
// GALAXY HUB - COMPLETE JAVASCRIPT
// ========================================

const $ = (id) => document.getElementById(id);

// ========================================
// AUDIO SYSTEM
// No external audio files required
// ========================================

let audioContext = null;
let soundEnabled = true;

function playSound(type = "tap") {
    if (!soundEnabled) return;

    try {
        if (!audioContext) {
            audioContext = new (
                window.AudioContext ||
                window.webkitAudioContext
            )();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const sounds = {
            tap: [520, 0.045, "sine"],
            start: [660, 0.12, "sine"],
            eat: [880, 0.14, "triangle"],
            jump: [460, 0.09, "square"],
            score: [740, 0.10, "sine"],
            over: [180, 0.25, "triangle"],
            error: [250, 0.12, "square"]
        };

        const [frequency, duration, wave] =
            sounds[type] || sounds.tap;

        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(
            frequency,
            audioContext.currentTime
        );

        if (type === "eat" || type === "score" || type === "start") {
            oscillator.frequency.exponentialRampToValueAtTime(
                frequency * 1.35,
                audioContext.currentTime + duration
            );
        }

        if (type === "over") {
            oscillator.frequency.exponentialRampToValueAtTime(
                80,
                audioContext.currentTime + duration
            );
        }

        gain.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.12,
            audioContext.currentTime + 0.015
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + duration
        );

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration + 0.02);

    } catch (error) {
        console.warn("Audio unavailable:", error);
    }
}

// Play a light sound for interface taps.
// Game-specific controls use their own sounds.
document.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("button");

    if (!button) return;

    if (
        button.classList.contains("direction-btn") ||
        button.id === "restart" ||
        button.id === "exitGame"
    ) {
        return;
    }

    playSound("tap");
});

// ========================================
// PAGE NAVIGATION
// ========================================

function openPage(id) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("active", page.id === id);
    });

    if (id === "games") {
        resetGameSelection();
    } else {
        stopGame();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ========================================
// LIVE TIME AND DATE
// ========================================

function updateDateTime() {
    const now = new Date();

    $("time").textContent = now.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    $("date").textContent = now.toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

updateDateTime();
setInterval(updateDateTime, 1000);

// ========================================
// AUTOMATIC CURRENCY CONVERTER
// ========================================

const currencySymbols = {
    PHP: "₱",
    USD: "$",
    EUR: "€"
};

let exchangeRates = {};
let rateLastUpdated = {};
let rateLoading = false;

const RATE_REFRESH_TIME = 5 * 60 * 1000;

// Get exchange rates
async function getExchangeRate(from, to) {

    const now = Date.now();

    // Use cached rate if it is still fresh
    if (
        exchangeRates[from] &&
        rateLastUpdated[from] &&
        now - rateLastUpdated[from] < RATE_REFRESH_TIME
    ) {
        return exchangeRates[from][to];
    }

    try {

        const response = await fetch(
            `https://open.er-api.com/v6/latest/${from}`
        );

        if (!response.ok) {
            throw new Error("Unable to retrieve exchange rate");
        }

        const data = await response.json();

        if (
            data.result !== "success" ||
            !data.rates
        ) {
            throw new Error("Exchange rate unavailable");
        }

        exchangeRates[from] = data.rates;
        rateLastUpdated[from] = now;

        return data.rates[to];

    } catch (error) {

        console.error("Currency error:", error);

        // Use previously saved in-memory rates if available
        if (exchangeRates[from]) {
            return exchangeRates[from][to];
        }

        throw error;
    }
}

// Main converter
async function convertCurrency() {

    const amount = Number($("amount").value);

    const from = $("fromCurrency").value;
    const to = $("toCurrency").value;

    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {
        $("result").textContent = "Invalid amount";
        return;
    }

    if (from === to) {

        $("result").textContent =
            currencySymbols[to] +
            amount.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

        $("rateNote").textContent =
            "Same currency selected.";

        return;
    }

    const convertButton = $("convert");

    convertButton.disabled = true;
    convertButton.textContent = "Updating Rate...";

    try {

        const rate = await getExchangeRate(from, to);

        if (!Number.isFinite(rate)) {
            throw new Error("Rate unavailable");
        }

        const converted = amount * rate;

        $("result").textContent =
            currencySymbols[to] +
            converted.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            });

        const updated = new Date();

        $("rateNote").textContent =
            `1 ${from} = ${rate.toFixed(5)} ${to} | Updated ${updated.toLocaleTimeString("en-PH")}`;

    } catch (error) {

        $("result").textContent = "Rate unavailable";

        $("rateNote").textContent =
            "Please check your internet connection.";

    } finally {

        convertButton.disabled = false;
        convertButton.textContent = "Convert ✦";

    }
}

// Convert button
$("convert").addEventListener(
    "click",
    convertCurrency
);

// Automatically convert when amount changes
$("amount").addEventListener(
    "input",
    convertCurrency
);

// Automatically convert when currencies change
$("fromCurrency").addEventListener(
    "change",
    convertCurrency
);

$("toCurrency").addEventListener(
    "change",
    convertCurrency
);

// Swap currencies
$("swap").addEventListener("click", () => {

    const from = $("fromCurrency");
    const to = $("toCurrency");

    const temp = from.value;

    from.value = to.value;
    to.value = temp;

    convertCurrency();

});

// Enter key
$("amount").addEventListener("keydown", event => {

    if (event.key === "Enter") {
        convertCurrency();
    }

});

// Automatically refresh exchange rates every 5 minutes
setInterval(() => {

    if ($("currency").classList.contains("active")) {

        exchangeRates = {};
        rateLastUpdated = {};

        convertCurrency();

    }

}, RATE_REFRESH_TIME);


// ========================================
// GALAXY HUB - ANIMATED GAME ENGINE
// ========================================

const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = 800;
const GAME_HEIGHT = 420;

let game = "flappy";
let running = false;
let score = 0;
let animationFrame = 0;
let lastTime = 0;
let gameState = {};

const snakePad = $("snakePad");

const random = (min, max) =>
    Math.random() * (max - min) + min;

const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

// ========================================
// GALAXY PARTICLES
// ========================================

let galaxyStars = Array.from({ length: 100 }, () => ({
    x: random(0, GAME_WIDTH),
    y: random(0, GAME_HEIGHT),
    size: random(1, 2.5),
    alpha: random(0.2, 0.9),
    speed: random(0.15, 0.7)
}));

let particles = [];

function createParticles(x, y, amount, color) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x,
            y,
            vx: random(-3, 3),
            vy: random(-3, 2),
            life: 1,
            size: random(2, 5),
            color
        });
    }
}

function updateParticles(dt) {
    particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.04 * dt;
        p.life -= 0.025 * dt;
    });

    particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

// ========================================
// ANIMATED BACKGROUND
// ========================================

function drawBackground(dt = 0) {
    const gradient = ctx.createLinearGradient(
        0, 0, GAME_WIDTH, GAME_HEIGHT
    );

    gradient.addColorStop(0, "#11163a");
    gradient.addColorStop(0.5, "#10102d");
    gradient.addColorStop(1, "#070b1d");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    galaxyStars.forEach(star => {
        star.x -= star.speed * dt;

        if (star.x < 0) {
            star.x = GAME_WIDTH;
            star.y = random(0, GAME_HEIGHT);
        }

        ctx.globalAlpha =
            star.alpha * (0.65 + Math.sin(Date.now() * 0.002 + star.x) * 0.25);

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
}

// ========================================
// GAME SELECTION
// ========================================

function startGame(type) {
    game = type;

    $("gameSelect").classList.add("hidden");
    $("gameStage").classList.remove("hidden");

    snakePad.classList.toggle("hidden", type !== "snake");

    $("startGameBtn").classList.remove("hidden");
    $("startGameBtn").textContent = "▶ START GAME";

    const gameInfo = {
        flappy: {
            name: "Flappy Bird",
            label: "SKY SURVIVAL",
            hint: "Press START GAME, then tap or press SPACE to fly."
        },
        snake: {
            name: "Snake Game",
            label: "STAR HUNTER",
            hint: "Press START GAME to collect glowing stars."
        },
        dino: {
            name: "Dinosaur Jump",
            label: "GALAXY RUNNER",
            hint: "Press START GAME, then tap or press SPACE to jump."
        }
    };

    const info = gameInfo[type];

    $("gameName").textContent = info.name;
    $("gameLabel").textContent = info.label;
    $("gameHint").textContent = info.hint;

    particles = [];
    playSound("start");
    resetGame(false);
}

function beginGame() {
    if (running) return;

    $("startGameBtn").classList.add("hidden");
    $("gameHint").textContent = "Game started! Good luck!";

    resetGame(true);
}

function resetGameSelection() {
    $("gameSelect").classList.remove("hidden");
    $("gameStage").classList.add("hidden");
    snakePad.classList.add("hidden");
    $("startGameBtn").classList.remove("hidden");

    stopGame();
}

function stopGame() {
    running = false;
    cancelAnimationFrame(animationFrame);
}

// ========================================
// GAME RESET
// ========================================

function resetGame(autoStart = true) {
    cancelAnimationFrame(animationFrame);

    running = autoStart;
    score = 0;
    lastTime = 0;
    particles = [];

    $("score").textContent = "0";

    if (game === "flappy") {
        gameState = {
            bird: {
                x: 180,
                y: 205,
                vy: 0,
                wing: 0,
                rotation: 0
            },
            pipes: [],
            spawn: 0,
            dead: false,
            backgroundOffset: 0
        };
    }

    if (game === "snake") {
        const initialSnake = [
            { x: 12, y: 10 },
            { x: 11, y: 10 },
            { x: 10, y: 10 }
        ];

        gameState = {
            snake: initialSnake,
            previousSnake: initialSnake.map(p => ({ ...p })),
            dir: { x: 1, y: 0 },
            next: { x: 1, y: 0 },
            food: { x: 20, y: 12 },
            tick: 0,
            moveProgress: 0,
            dead: false,
            cols: 40,
            rows: 21,
            foodPulse: 0
        };

        placeSnakeFood();
    }

    if (game === "dino") {
        gameState = {
            dino: {
                x: 105,
                y: 330,
                vy: 0,
                onGround: true,
                leg: 0,
                rotation: 0
            },
            cactus: [],
            spawn: 0,
            dead: false,
            ground: 330,
            speed: 4,
            groundOffset: 0,
            clouds: [
                { x: 160, y: 85, speed: 0.5 },
                { x: 490, y: 125, speed: 0.8 },
                { x: 720, y: 65, speed: 0.4 }
            ]
        };
    }

    drawGame();

    if (autoStart) {
        animationFrame = requestAnimationFrame(loop);
    }
}

// ========================================
// SCORE
// ========================================

function addScore(amount = 1) {
    score += amount;
    $("score").textContent = score;

    const x = game === "flappy" ? 400 : 150;
    const y = game === "dino" ? 120 : 100;

    createParticles(x, y, 10, "#ffe18a");
}

// ========================================
// GAME OVER
// ========================================

function gameOver() {
    if (gameState.dead) return;

    gameState.dead = true;
    running = false;

    cancelAnimationFrame(animationFrame);

    createParticles(400, 210, 25, "#ff7b9c");
    drawGame();

    ctx.fillStyle = "#060817dd";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.textAlign = "center";

    ctx.shadowColor = "#a78bfa";
    ctx.shadowBlur = 18;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Orbitron, sans-serif";
    ctx.fillText("GAME OVER", 400, 185);

    ctx.shadowBlur = 0;

    ctx.font = "20px Inter, sans-serif";
    ctx.fillStyle = "#8cecff";
    ctx.fillText(`Score: ${score}`, 400, 225);

    ctx.font = "14px Inter, sans-serif";
    ctx.fillStyle = "#d8d5ff";
    ctx.fillText("Press Restart to play again", 400, 260);

    $("gameHint").textContent =
        "Game over! Press Restart to try again.";

    playSound("over");
}

// ========================================
// MAIN GAME LOOP
// ========================================

function loop(time) {
    if (!running) return;

    const dt = lastTime
        ? Math.min((time - lastTime) / 16.67, 2)
        : 1;

    lastTime = time;

    updateGame(dt);
    updateParticles(dt);
    drawGame(dt);

    if (running) {
        animationFrame = requestAnimationFrame(loop);
    }
}

// ========================================
// DRAW GAME
// ========================================

function drawGame(dt = 0) {
    drawBackground(dt);

    if (game === "flappy") drawFlappy();
    else if (game === "snake") drawSnake();
    else if (game === "dino") drawDino();

    drawParticles();
}

// ========================================
// FLAPPY BIRD - ANIMATED
// ========================================

function drawFlappy() {
    const s = gameState;

    // Galaxy ground
    const groundGradient = ctx.createLinearGradient(
        0, 350, 0, 420
    );

    groundGradient.addColorStop(0, "#26376a");
    groundGradient.addColorStop(1, "#11152e");

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, 350, 800, 70);

    // Pipes
    s.pipes.forEach(p => {
        const gap = 150;

        const pipeGradient = ctx.createLinearGradient(
            p.x, 0, p.x + 62, 0
        );

        pipeGradient.addColorStop(0, "#159b83");
        pipeGradient.addColorStop(0.5, "#66f5c8");
        pipeGradient.addColorStop(1, "#168d80");

        ctx.save();

        ctx.fillStyle = pipeGradient;
        ctx.shadowColor = "#4df5c0";
        ctx.shadowBlur = 12;

        ctx.fillRect(p.x, 0, 62, p.top);
        ctx.fillRect(
            p.x,
            p.top + gap,
            62,
            350 - (p.top + gap)
        );

        ctx.fillRect(p.x - 5, p.top - 18, 72, 18);
        ctx.fillRect(p.x - 5, p.top + gap, 72, 18);

        ctx.restore();
    });

    // Bird
    const bird = s.bird;

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    // Body
    ctx.fillStyle = "#ffdc76";
    ctx.shadowColor = "#ffc857";
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Animated wing
    const wingAngle = Math.sin(bird.wing) * 0.7;

    ctx.save();
    ctx.translate(-6, 4);
    ctx.rotate(wingAngle);

    ctx.fillStyle = "#f7a940";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Eye
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(8, -5, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#101329";
    ctx.beginPath();
    ctx.arc(11, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = "#ff8d8d";
    ctx.beginPath();
    ctx.moveTo(19, 2);
    ctx.lineTo(34, 7);
    ctx.lineTo(19, 11);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "#dce6ff";
    ctx.font = "13px Orbitron";
    ctx.fillText("FLAP THROUGH THE PORTALS", 22, 30);
}

// ========================================
// SNAKE - SMOOTH GALAXY SNAKE
// ========================================

function drawSnake() {
    const s = gameState;

    const cols = s.cols;
    const rows = s.rows;

    const cell = GAME_WIDTH / cols;
    const boardHeight = cell * rows;
    const ox = 0;
    const oy = (GAME_HEIGHT - boardHeight) / 2;

    ctx.fillStyle = "#0b1027";
    ctx.fillRect(ox, oy, GAME_WIDTH, boardHeight);

    // Grid
    ctx.strokeStyle = "#20294a";
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(ox + x * cell, oy);
        ctx.lineTo(ox + x * cell, oy + boardHeight);
        ctx.stroke();
    }

    for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + y * cell);
        ctx.lineTo(ox + GAME_WIDTH, oy + y * cell);
        ctx.stroke();
    }

    // Animated food
    const pulse = 1 + Math.sin(Date.now() * 0.006) * 0.16;

    const fx = ox + s.food.x * cell + cell / 2;
    const fy = oy + s.food.y * cell + cell / 2;

    ctx.save();

    ctx.fillStyle = "#ffda7b";
    ctx.shadowColor = "#ffda7b";
    ctx.shadowBlur = 15;

    drawStar(
        fx,
        fy,
        5,
        cell * 0.38 * pulse,
        cell * 0.18 * pulse
    );

    ctx.restore();

    // Smooth movement interpolation
    const progress = clamp(s.moveProgress, 0, 1);

    s.snake.forEach((p, i) => {
        const previous = s.previousSnake[i] || p;

        const xPosition =
            previous.x + (p.x - previous.x) * progress;

        const yPosition =
            previous.y + (p.y - previous.y) * progress;

        const x = ox + xPosition * cell;
        const y = oy + yPosition * cell;

        const size = cell - 2;

        const gradient = ctx.createLinearGradient(
            x, y, x + cell, y + cell
        );

        if (i === 0) {
            gradient.addColorStop(0, "#a5fff2");
            gradient.addColorStop(1, "#42d9c5");
        } else {
            gradient.addColorStop(0, "#63e5c6");
            gradient.addColorStop(1, "#269b91");
        }

        ctx.save();

        ctx.fillStyle = gradient;

        if (i === 0) {
            ctx.shadowColor = "#50ffe0";
            ctx.shadowBlur = 12;
        }

        ctx.beginPath();
        ctx.roundRect(
            x + 1,
            y + 1,
            size,
            size,
            Math.max(3, cell * 0.25)
        );
        ctx.fill();

        ctx.shadowBlur = 0;

        // Head eyes
        if (i === 0) {
            ctx.fillStyle = "#10253b";

            const eyeSize = Math.max(2, cell * 0.12);

            ctx.beginPath();
            ctx.arc(
                x + cell * 0.35,
                y + cell * 0.32,
                eyeSize,
                0,
                Math.PI * 2
            );

            ctx.arc(
                x + cell * 0.68,
                y + cell * 0.32,
                eyeSize,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        ctx.restore();
    });

    ctx.fillStyle = "#dce6ff";
    ctx.font = "13px Orbitron";
    ctx.fillText("COLLECT THE STAR", 18, 25);
}

// ========================================
// STAR DRAWING
// ========================================

function drawStar(cx, cy, points, outer, inner) {
    let angle = -Math.PI / 2;

    ctx.beginPath();
    ctx.moveTo(
        cx + Math.cos(angle) * outer,
        cy + Math.sin(angle) * outer
    );

    for (let i = 0; i < points; i++) {
        angle += Math.PI / points;

        ctx.lineTo(
            cx + Math.cos(angle) * inner,
            cy + Math.sin(angle) * inner
        );

        angle += Math.PI / points;

        ctx.lineTo(
            cx + Math.cos(angle) * outer,
            cy + Math.sin(angle) * outer
        );
    }

    ctx.closePath();
    ctx.fill();
}

// ========================================
// SNAKE FOOD PLACEMENT
// ========================================

function placeSnakeFood() {
    const s = gameState;

    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 1000) {
        s.food = {
            x: Math.floor(Math.random() * s.cols),
            y: Math.floor(Math.random() * s.rows)
        };

        valid = !s.snake.some(p =>
            p.x === s.food.x && p.y === s.food.y
        );

        attempts++;
    }
}

// ========================================
// DINOSAUR - ANIMATED RUNNER
// ========================================

function drawDino() {
    const s = gameState;

    // Moving clouds
    s.clouds.forEach(cloud => {
        ctx.fillStyle = "#39476f";
        ctx.globalAlpha = 0.5;

        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 15, 0, Math.PI * 2);
        ctx.arc(cloud.x + 17, cloud.y - 8, 20, 0, Math.PI * 2);
        ctx.arc(cloud.x + 35, cloud.y, 14, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;

    // Ground
    const groundGradient = ctx.createLinearGradient(
        0, s.ground, 0, 420
    );

    groundGradient.addColorStop(0, "#293965");
    groundGradient.addColorStop(1, "#11152e");

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, s.ground, 800, 90);

    // Moving ground marks
    ctx.strokeStyle = "#8396c7";
    ctx.lineWidth = 2;

    for (let i = 0; i < 25; i++) {
        const x = (i * 45 - s.groundOffset % 45);

        ctx.beginPath();
        ctx.moveTo(x, s.ground + 22);
        ctx.lineTo(x + 15, s.ground + 22);
        ctx.stroke();
    }

    // Cactus obstacles
    s.cactus.forEach(c => {
        ctx.save();

        ctx.fillStyle = "#54d9a8";
        ctx.shadowColor = "#54d9a8";
        ctx.shadowBlur = 12;

        ctx.fillRect(
            c.x,
            s.ground - c.h,
            24,
            c.h
        );

        ctx.fillRect(
            c.x - 12,
            s.ground - c.h + 22,
            12,
            10
        );

        ctx.fillRect(
            c.x + 24,
            s.ground - c.h + 38,
            12,
            10
        );

        ctx.restore();
    });

    // Dinosaur
    const d = s.dino;

    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rotation);

    // Body
    ctx.fillStyle = "#b5c8ff";
    ctx.shadowColor = "#8ba8ff";
    ctx.shadowBlur = 10;

    ctx.fillRect(0, -42, 34, 42);
    ctx.fillRect(23, -58, 28, 23);

    ctx.shadowBlur = 0;

    // Tail
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(-18, -20);
    ctx.lineTo(0, -14);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#0b1024";
    ctx.fillRect(42, -50, 5, 5);

    // Animated legs
    const legMovement = Math.sin(d.leg) * 9;

    ctx.fillStyle = "#b5c8ff";

    ctx.save();
    ctx.translate(9, -4);
    ctx.rotate(d.onGround ? legMovement * 0.04 : 0);
    ctx.fillRect(-4, 0, 9, 15);
    ctx.restore();

    ctx.save();
    ctx.translate(28, -4);
    ctx.rotate(d.onGround ? -legMovement * 0.04 : 0);
    ctx.fillRect(-4, 0, 9, 15);
    ctx.restore();

    ctx.restore();

    ctx.fillStyle = "#dce6ff";
    ctx.font = "13px Orbitron";
    ctx.fillText("JUMP THE CACTUS", 22, 30);
}

// ========================================
// UPDATE GAME
// ========================================

function updateGame(dt) {
    const s = gameState;

    // ------------------------------------
    // FLAPPY BIRD
    // ------------------------------------

    if (game === "flappy") {
        const bird = s.bird;

        bird.vy += 0.34 * dt;
        bird.y += bird.vy * dt;

        bird.wing += 0.35 * dt;

        bird.rotation = clamp(
            bird.vy * 0.06,
            -0.45,
            0.8
        );

        s.spawn += dt;

        if (s.spawn > 92) {
            s.spawn = 0;

            const top = 55 + Math.random() * 175;

            s.pipes.push({
                x: 820,
                top,
                passed: false
            });
        }

        s.pipes.forEach(p => {
            p.x -= 3.1 * dt;

            if (!p.passed && p.x + 62 < bird.x) {
                p.passed = true;
                addScore();
                playSound("score");
            }

            const gap = 150;

            if (
                bird.x + 15 > p.x &&
                bird.x - 15 < p.x + 62 &&
                (
                    bird.y - 13 < p.top ||
                    bird.y + 13 > p.top + gap
                )
            ) {
                gameOver();
            }
        });

        s.pipes = s.pipes.filter(p => p.x > -80);

        if (bird.y < 0 || bird.y > 350) {
            gameOver();
        }

        return;
    }

    // ------------------------------------
    // SNAKE
    // ------------------------------------

    if (game === "snake") {
        s.tick += dt;
        s.moveProgress = clamp(s.tick / 7, 0, 1);

        s.foodPulse += 0.08 * dt;

        if (s.tick >= 7) {
            s.tick -= 7;

            s.previousSnake = s.snake.map(p => ({ ...p }));

            s.dir = { ...s.next };

            const head = {
                x: s.snake[0].x + s.dir.x,
                y: s.snake[0].y + s.dir.y
            };

            // Wall collision
            if (
                head.x < 0 ||
                head.x >= s.cols ||
                head.y < 0 ||
                head.y >= s.rows
            ) {
                gameOver();
                return;
            }

            const eating =
                head.x === s.food.x &&
                head.y === s.food.y;

            const body = eating
                ? s.snake
                : s.snake.slice(0, -1);

            // Self collision
            if (body.some(p =>
                p.x === head.x && p.y === head.y
            )) {
                gameOver();
                return;
            }

            s.snake.unshift(head);

            if (eating) {
                const cell = GAME_WIDTH / s.cols;

                createParticles(
                    head.x * cell + cell / 2,
                    head.y * cell + (GAME_HEIGHT - cell * s.rows) / 2 + cell / 2,
                    15,
                    "#ffe18a"
                );

                addScore(5);
                playSound("eat");
                placeSnakeFood();
            } else {
                s.snake.pop();
            }

            s.moveProgress = 0;
        }

        return;
    }

    // ------------------------------------
    // DINOSAUR
    // ------------------------------------

    const d = s.dino;

    d.vy += 0.65 * dt;
    d.y += d.vy * dt;

    if (d.y >= s.ground) {
        if (!d.onGround) {
            createParticles(d.x + 15, s.ground - 3, 7, "#a9caff");
        }

        d.y = s.ground;
        d.vy = 0;
        d.onGround = true;
        d.rotation = 0;
    } else {
        d.onGround = false;
        d.rotation = clamp(d.vy * 0.015, -0.2, 0.2);
    }

    if (d.onGround) {
        d.leg += 0.35 * dt;
    }

    // Ground movement
    s.groundOffset += s.speed * dt;

    // Cloud movement
    s.clouds.forEach(cloud => {
        cloud.x -= cloud.speed * dt;

        if (cloud.x < -60) {
            cloud.x = 850;
        }
    });

    // Obstacle generation
    s.spawn += dt;

    if (s.spawn > 85) {
        s.spawn = 0;

        s.cactus.push({
            x: 820,
            h: 35 + Math.random() * 35,
            passed: false
        });
    }

    s.cactus.forEach(c => {
        c.x -= s.speed * dt;

        if (
            c.x < d.x + 35 &&
            c.x + 24 > d.x &&
            d.y > s.ground - c.h + 10
        ) {
            gameOver();
        }

        if (!c.passed && c.x + 24 < d.x) {
            c.passed = true;
            addScore();
            playSound("score");
        }
    });

    s.cactus = s.cactus.filter(c => c.x > -40);

    // Gradually increase difficulty
    s.speed = Math.min(7, 4 + score * 0.03);
}

// ========================================
// GAME ACTIONS
// ========================================

function flap() {
    if (game !== "flappy" || !running) return;

    gameState.bird.vy = -7.4;

    createParticles(
        gameState.bird.x - 15,
        gameState.bird.y,
        3,
        "#ffe18a"
    );

    playSound("jump");
}

function jump() {
    if (game !== "dino" || !running) return;

    const d = gameState.dino;

    if (d.onGround) {
        d.vy = -12;
        d.onGround = false;

        createParticles(d.x + 10, d.y, 6, "#a9caff");

        playSound("jump");
    }
}

// ========================================
// SNAKE DIRECTION
// ========================================

function changeSnakeDirection(direction) {
    if (game !== "snake" || !running) return;

    const directions = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
    };

    const next = directions[direction];

    if (!next) return;

    if (
        next.x === -gameState.dir.x &&
        next.y === -gameState.dir.y
    ) {
        return;
    }

    gameState.next = next;
}

// ========================================
// SNAKE TOUCH PAD
// ========================================

snakePad.addEventListener("pointerdown", event => {
    const button = event.target.closest("[data-direction]");

    if (!button) return;

    event.preventDefault();

    changeSnakeDirection(button.dataset.direction);
    playSound("tap");
});

// ========================================
// KEYBOARD CONTROLS
// ========================================

function keyGame(event) {
    const gamePageActive =
        $("games").classList.contains("active");

    if (!gamePageActive) return;

    if (game === "flappy" && event.code === "Space") {
        event.preventDefault();
        flap();
        return;
    }

    if (
        game === "dino" &&
        (
            event.code === "Space" ||
            event.code === "ArrowUp"
        )
    ) {
        event.preventDefault();
        jump();
        return;
    }

    if (game === "snake" && running) {
        const key = event.key.toLowerCase();

        const directions = {
            arrowup: "up",
            w: "up",
            arrowdown: "down",
            s: "down",
            arrowleft: "left",
            a: "left",
            arrowright: "right",
            d: "right"
        };

        const direction = directions[key];

        if (direction) {
            event.preventDefault();
            changeSnakeDirection(direction);
        }
    }
}

window.addEventListener("keydown", keyGame);

// ========================================
// CANVAS TOUCH CONTROLS
// ========================================

canvas.addEventListener("pointerdown", event => {
    if (!running) return;

    if (game === "flappy") flap();
    if (game === "dino") jump();
});

// Snake swipe controls
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", event => {
    if (game !== "snake") return;

    const touch = event.changedTouches[0];

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener("touchend", event => {
    if (game !== "snake" || !running) return;

    const touch = event.changedTouches[0];

    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
        changeSnakeDirection(dx > 0 ? "right" : "left");
    } else {
        changeSnakeDirection(dy > 0 ? "down" : "up");
    }
}, { passive: true });

// ========================================
// GAME BUTTONS
// ========================================

$("startGameBtn").addEventListener("click", () => {
    playSound("start");
    beginGame();
});

$("restart").addEventListener("click", () => {
    playSound("start");

    $("startGameBtn").classList.add("hidden");

    resetGame(true);
});

$("exitGame").addEventListener(
    "click",
    resetGameSelection
);

// ========================================
// END OF ANIMATED GAME ENGINE
// ========================================

// ========================================
// SCIENTIFIC CALCULATOR
// ========================================

let calcExpr = "";
let ans = 0;

const screen = $("calcScreen");
const exprLabel = $("calcExpression");

function renderCalc() {
    screen.value = calcExpr || "0";
    exprLabel.textContent =
        calcExpr || "Ready for a calculation";
}

// Factorial
function factorial(n) {
    if (
        !Number.isInteger(n) ||
        n < 0 ||
        n > 170
    ) {
        throw Error("Factorial requires integer 0–170");
    }

    let result = 1;

    for (let i = 2; i <= n; i++) {
        result *= i;
    }

    return result;
}

// ========================================
// CALCULATOR EVALUATION
// ========================================

function calculate() {
    try {
        if (!calcExpr.trim()) return;

        let expression = calcExpr;

        expression = expression
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/π/g, "Math.PI")
            .replace(/\bAns\b/g, String(ans))
            .replace(/\be\b/g, "Math.E")
            .replace(/\^/g, "**");

        // Scientific functions
        expression = expression
            .replace(/sqrt\(/g, "Math.sqrt(")
            .replace(/abs\(/g, "Math.abs(")
            .replace(/log\(/g, "Math.log10(")
            .replace(/ln\(/g, "Math.log(");

        // Degree-based trigonometry
        expression = expression
            .replace(/sin\(/g, "Math.sin(Math.PI/180*")
            .replace(/cos\(/g, "Math.cos(Math.PI/180*")
            .replace(/tan\(/g, "Math.tan(Math.PI/180*");

        // Factorials
        expression = expression.replace(
            /(\d+(?:\.\d+)?|\))!/g,
            "factorial($1)"
        );

        // Percentages
        expression = expression.replace(
            /(\d+(?:\.\d+)?)%/g,
            "($1/100)"
        );

        // Modulo
        expression = expression.replace(
            /(\d+(?:\.\d+)?)\s*mod\s*(\d+(?:\.\d+)?)/g,
            "($1%$2)"
        );

        // Allow only expected mathematical syntax
        if (!/^[0-9+\-*/().,%\sA-Za-z_*]+$/.test(expression)) {
            throw Error("Invalid expression");
        }

        if (
            /window|document|constructor|eval|Function|alert|prompt/.test(
                expression
            )
        ) {
            throw Error("Invalid expression");
        }

        const result = Function(
            "factorial",
            '"use strict"; return (' + expression + ')'
        )(factorial);

        if (
            typeof result !== "number" ||
            !Number.isFinite(result)
        ) {
            throw Error("Not a real number");
        }

        ans = result;

        exprLabel.textContent = calcExpr + " =";

        calcExpr = String(
            Number(result.toPrecision(12))
        );

        screen.value = calcExpr;

        playSound("score");

    } catch (error) {
        exprLabel.textContent =
            error.message || "Invalid expression";

        screen.value = "Error";
        calcExpr = "";

        playSound("error");
    }
}

// ========================================
// CALCULATOR BUTTONS
// ========================================

$("calcButtons").addEventListener("click", event => {
    const button = event.target.closest("button");

    if (!button) return;

    const value = button.dataset.value;
    const action = button.dataset.action;

    if (action === "clear") {
        calcExpr = "";
        renderCalc();
        return;
    }

    if (action === "backspace") {
        calcExpr = calcExpr.slice(0, -1);
        renderCalc();
        return;
    }

    if (action === "equals") {
        calculate();
        return;
    }

    if (value) {
        if (screen.value === "Error") {
            calcExpr = "";
        }

        calcExpr += value;
        renderCalc();
    }
});

// ========================================
// CALCULATOR KEYBOARD
// ========================================

window.addEventListener("keydown", event => {
    if (!$("calculator").classList.contains("active")) {
        return;
    }

    // Do not intercept keys used by games
    if (event.target.tagName === "INPUT") {
        return;
    }

    if (/^[0-9.]$/.test(event.key)) {
        calcExpr += event.key;
        renderCalc();
    } else if (
        ["+", "-", "/", "*", "(", ")", "%", "^"].includes(
            event.key
        )
    ) {
        calcExpr +=
            event.key === "*"
                ? "×"
                : event.key === "/"
                ? "÷"
                : event.key;

        renderCalc();
    } else if (event.key === "Enter") {
        event.preventDefault();
        calculate();
    } else if (event.key === "Backspace") {
        calcExpr = calcExpr.slice(0, -1);
        renderCalc();
    } else if (event.key === "Escape") {
        calcExpr = "";
        renderCalc();
    }
});

// ========================================
// INITIALIZATION
// ========================================

drawBackground();

renderCalc();

// Automatically load currency conversion
convertCurrency();

// =========================================
// JAPANESE LEARNING PORTAL
// =========================================

const japaneseLessons = {

    hiragana: {
        title: "Hiragana",
        subtitle: "The basic Japanese phonetic alphabet.",

        characters: [
            ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
            ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
            ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
            ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
            ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
            ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
            ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
            ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
            ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
            ["わ", "wa"], ["を", "wo"], ["ん", "n"]
        ]
    },

    katakana: {
        title: "Katakana",
        subtitle: "Often used for foreign words and names.",

        characters: [
            ["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"],
            ["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"],
            ["サ", "sa"], ["シ", "shi"], ["ス", "su"], ["セ", "se"], ["ソ", "so"],
            ["タ", "ta"], ["チ", "chi"], ["ツ", "tsu"], ["テ", "te"], ["ト", "to"],
            ["ナ", "na"], ["ニ", "ni"], ["ヌ", "nu"], ["ネ", "ne"], ["ノ", "no"],
            ["ハ", "ha"], ["ヒ", "hi"], ["フ", "fu"], ["ヘ", "he"], ["ホ", "ho"],
            ["マ", "ma"], ["ミ", "mi"], ["ム", "mu"], ["メ", "me"], ["モ", "mo"],
            ["ヤ", "ya"], ["ユ", "yu"], ["ヨ", "yo"],
            ["ラ", "ra"], ["リ", "ri"], ["ル", "ru"], ["レ", "re"], ["ロ", "ro"],
            ["ワ", "wa"], ["ヲ", "wo"], ["ン", "n"]
        ]
    },

    kanji: {
        title: "Kanji",
        subtitle: "Common Japanese characters and their meanings.",

        characters: [
            ["日", "nichi", "Sun / Day"],
            ["月", "getsu", "Moon / Month"],
            ["火", "ka", "Fire"],
            ["水", "sui", "Water"],
            ["木", "moku", "Tree / Wood"],
            ["金", "kin", "Gold / Money"],
            ["土", "do", "Earth / Soil"],
            ["山", "yama", "Mountain"],
            ["川", "kawa", "River"],
            ["人", "hito", "Person"],
            ["大", "dai", "Big"],
            ["小", "shou", "Small"],
            ["中", "naka", "Inside / Middle"],
            ["上", "ue", "Above"],
            ["下", "shita", "Below"],
            ["学校", "gakkou", "School"],
            ["先生", "sensei", "Teacher"],
            ["学生", "gakusei", "Student"],
            ["友", "tomo", "Friend"],
            ["愛", "ai", "Love"],
            ["空", "sora", "Sky"],
            ["花", "hana", "Flower"],
            ["雨", "ame", "Rain"],
            ["犬", "inu", "Dog"],
            ["猫", "neko", "Cat"]
        ]
    }
};


// Display selected Japanese lesson

function showJapaneseTab(type, clickedButton) {

    const lesson = japaneseLessons[type];

    if (!lesson) return;

    const heading = document.getElementById("japaneseHeading");
    const subtitle = document.getElementById("japaneseSubtitle");
    const content = document.getElementById("japaneseContent");

    if (!heading || !subtitle || !content) return;

    heading.textContent = lesson.title;
    subtitle.textContent = lesson.subtitle;

    // Update active tab

    document.querySelectorAll(".japanese-tab").forEach(button => {
        button.classList.remove("active");
    });

    if (clickedButton) {
        clickedButton.classList.add("active");
    }

    // Create character cards

    content.innerHTML = "";

    lesson.characters.forEach(character => {

        const symbol = character[0];
        const pronunciation = character[1];
        const meaning = character[2] || "";

        const card = document.createElement("button");

        card.type = "button";
        card.className = "japanese-card";

        card.innerHTML = `
            <span class="japanese-character">${symbol}</span>
            <span class="japanese-romaji">${pronunciation}</span>
            ${meaning ? `<span class="japanese-meaning">${meaning}</span>` : ""}
        `;

        // Reveal pronunciation or meaning when clicked

        card.addEventListener("click", () => {

            card.classList.toggle("revealed");

            const romaji = card.querySelector(".japanese-romaji");

            if (card.classList.contains("revealed")) {
                romaji.textContent = meaning || pronunciation.toUpperCase();
            } else {
                romaji.textContent = pronunciation;
            }

        });

        content.appendChild(card);

    });
}


// Initialize the Japanese portal

document.addEventListener("DOMContentLoaded", () => {
    showJapaneseTab("hiragana",
        document.querySelector(".japanese-tab")
    );
});

/* =========================================
   TASHII HUB SETTINGS FUNCTIONALITY
========================================= */

function toggleHubSettings(event) {

    if (event) {
        event.stopPropagation();
    }

    const menu = document.getElementById("hubSettings");
    const toggle = document.getElementById("settingsToggle");

    if (!menu || !toggle) return;

    menu.classList.toggle("show");

    const isOpen = menu.classList.contains("show");

    toggle.setAttribute("aria-expanded", String(isOpen));
}


// NAVIGATE TO SELECTED PORTAL

function navigateHub(pageId) {

    // Use your existing page navigation function.
    openPage(pageId);

    // Close settings menu.
    const menu = document.getElementById("hubSettings");
    const toggle = document.getElementById("settingsToggle");

    if (menu) {
        menu.classList.remove("show");
    }

    if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
    }
}


// CLOSE MENU WHEN CLICKING OUTSIDE

document.addEventListener("click", function(event) {

    const menu = document.getElementById("hubSettings");
    const toggle = document.getElementById("settingsToggle");

    if (!menu || !toggle) return;

    if (
        !menu.contains(event.target) &&
        !toggle.contains(event.target)
    ) {
        menu.classList.remove("show");
        toggle.setAttribute("aria-expanded", "false");
    }

});


/* =================================
   TASHII.IO AUTO-HIDE ASSISTANT
================================= */

const tashiiMessages = {
    currency: "Welcome to the Peso Converter! 💰 Convert currencies and check their equivalent values!",
    games: "Ready to play? 🎮 Choose a game, press START, and enjoy!",
    calculator: "Welcome to the Scientific Calculator! 🧮 Calculate mathematical expressions and solve equations!",
    japanese: "Konnichiwa! 🇯🇵 Learn Hiragana, Katakana, and Kanji characters here!",
    home: "Welcome back to TASHII HUB! ✨ Choose a portal and let's explore!",
    default: "Hello! I'm TASHII.IO, your friendly robot assistant! 🤖"
};

let tashiiTimer = null;

function tashiiSpeak(message) {
    const assistant = document.getElementById("tashiiAssistant");
    const text = document.getElementById("tashiiText");

    if (!assistant || !text) return;

    // Cancel previous timer
    clearTimeout(tashiiTimer);

    // Show robot and message
    assistant.classList.remove("tashii-idle", "tashii-hidden");
    assistant.classList.add("tashii-speaking");

    text.textContent = message;

    // Hide message after 5 seconds
    tashiiTimer = setTimeout(function() {
        assistant.classList.add("tashii-idle");
        assistant.classList.remove("tashii-speaking", "tashii-hidden");
    }, 3000);
}

// Tap the robot to hear a greeting
function tashiiGreeting() {
    tashiiSpeak(
        "Hello again! 👋 I'm TASHII.IO! Tap any portal button and I'll explain what it does! 😊"
    );
}

// Detect portal buttons
document.addEventListener("click", function(event) {

    const button = event.target.closest("button");

    if (!button) return;

    // Ignore robot controls
    if (
        button.closest("#tashiiAssistant") ||
        button.id === "settingsToggle"
    ) return;

    const text = button.innerText.toLowerCase();

    let message = null;

    if (text.includes("peso converter") ||
        text.includes("currency")) {
        message = tashiiMessages.currency;
    }

    else if (text.includes("games") ||
             text.includes("play arcade")) {
        message = tashiiMessages.games;
    }

    else if (text.includes("scientific calculator") ||
             text.includes("calculator")) {
        message = tashiiMessages.calculator;
    }

    else if (text.includes("japanese learning") ||
             text.includes("hiragana") ||
             text.includes("katakana") ||
             text.includes("kanji")) {
        message = tashiiMessages.japanese;
    }

    else if (text.includes("back to galaxy") ||
             text.includes("home")) {
        message = tashiiMessages.home;
    }

    if (message) {
        tashiiSpeak(message);
    }
});

// Initial greeting
window.addEventListener("load", function() {
    setTimeout(function() {
        tashiiSpeak(
            "Hello! 👋 Welcome to TASHII HUB! I'm TASHII.IO, your friendly robot assistant! 😊"
        );
    }, 1000);
});

