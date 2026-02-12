// Flappy Bird - Vanilla JS Implementation

// --- Configuration ---
const config = {
    gravity: 0.25,
    jumpStrength: -4.5,
    pipeSpeed: 5,
    pipeSpawnRate: 2500, // ms
    pipeGap: 175,
    groundHeight: 80
};

const pauseBtn = {
    x: 10,
    y: 10,
    width: 40,
    height: 40
};

// --- State ---
let canvas, ctx;
let width, height;
let frames = 0;
let score = 0;
let gameState = 'START'; // START, PLAYING, GAMEOVER, PAUSED
let lastTime = 0;
let pipes = [];
let bird;
let lastPipeSpawn = 0;

// --- Assets (Procedural Graphics) ---
const assets = {};

function createAssets() {
    // 1. Bird
    const birdCanvas = document.createElement('canvas');
    birdCanvas.width = 50;
    birdCanvas.height = 40;
    const bCtx = birdCanvas.getContext('2d');
    
    // Body
    bCtx.fillStyle = '#FFD700'; // Gold
    bCtx.beginPath(); bCtx.arc(20, 20, 18, 0, Math.PI * 2); bCtx.fill();
    // Belly
    bCtx.fillStyle = '#FFF4BD';
    bCtx.beginPath(); bCtx.arc(22, 24, 10, 0, Math.PI * 2); bCtx.fill();
    // Eye
    bCtx.fillStyle = '#FFFFFF';
    bCtx.beginPath(); bCtx.arc(28, 14, 8, 0, Math.PI * 2); bCtx.fill();
    // Pupil
    bCtx.fillStyle = '#000000';
    bCtx.beginPath(); bCtx.arc(30, 14, 4, 0, Math.PI * 2); bCtx.fill();
    // Beak
    bCtx.fillStyle = '#FF6B35';
    bCtx.beginPath(); bCtx.moveTo(34, 20); bCtx.lineTo(48, 22); bCtx.lineTo(34, 28); bCtx.fill();
    // Wing
    bCtx.fillStyle = '#E8A317';
    bCtx.beginPath(); bCtx.ellipse(14, 22, 14, 8, 0, 0, Math.PI * 2); bCtx.fill();
    
    assets.bird = birdCanvas;

    // 2. Pipe (Vertical)
    const pipeW = 60;
    const pipeH = 400; // Arbitrary max height
    const pipeCanvas = document.createElement('canvas');
    pipeCanvas.width = pipeW;
    pipeCanvas.height = pipeH;
    const pCtx = pipeCanvas.getContext('2d');
    
    // Body gradient
    const grad = pCtx.createLinearGradient(0, 0, pipeW, 0);
    grad.addColorStop(0, '#27ae60');
    grad.addColorStop(0.5, '#2ecc71');
    grad.addColorStop(1, '#27ae60');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, pipeW, pipeH);
    // Highlights
    pCtx.fillStyle = '#58d68d'; pCtx.fillRect(52, 0, 8, pipeH);
    pCtx.fillStyle = '#82e0aa'; pCtx.fillRect(24, 0, 12, pipeH);
    pCtx.strokeStyle = '#2d3436'; pCtx.lineWidth = 2; pCtx.strokeRect(0, 0, pipeW, pipeH);

    assets.pipe = pipeCanvas;

    // 3. Pipe Cap
    const capW = 72;
    const capH = 30;
    const capCanvas = document.createElement('canvas');
    capCanvas.width = capW;
    capCanvas.height = capH;
    const cCtx = capCanvas.getContext('2d');
    
    // Cap gradient
    const cGrad = cCtx.createLinearGradient(0, 0, capW, 0);
    cGrad.addColorStop(0, '#27ae60');
    cGrad.addColorStop(0.5, '#2ecc71');
    cGrad.addColorStop(1, '#27ae60');
    cCtx.fillStyle = cGrad;
    cCtx.fillRect(0, 0, capW, capH);
    cCtx.fillStyle = '#58d68d'; cCtx.fillRect(64, 0, 8, capH);
    cCtx.fillStyle = '#82e0aa'; cCtx.fillRect(8, 2, 56, 4);
    cCtx.strokeStyle = '#2d3436'; cCtx.lineWidth = 2; cCtx.strokeRect(0, 0, capW, capH);

    assets.pipeCap = capCanvas;
}

// --- Game Objects ---
class Bird {
    constructor() {
        this.reset();
        this.width = 40; // Collision box width
        this.height = 30; // Collision box height
    }

    reset() {
        this.x = width / 3;
        this.y = height / 2;
        this.velocity = 0;
        this.rotation = 0;
    }

    update() {
        if (gameState === 'PLAYING') {
            this.velocity += config.gravity;
            this.y += this.velocity;
            
            // Rotation based on velocity
            if (this.velocity < 0) this.rotation = -25 * Math.PI / 180;
            else {
                this.rotation += 2 * Math.PI / 180;
                if (this.rotation > 70 * Math.PI / 180) this.rotation = 70 * Math.PI / 180;
            }

            // Floor collision
            if (this.y + this.height/2 >= height - config.groundHeight) {
                this.y = height - config.groundHeight - this.height/2;
                gameOver();
            }
            
            // Ceiling collision
            if (this.y - this.height/2 <= 0) {
                this.y = this.height/2;
                this.velocity = 0;
            }
        } else if (gameState === 'START') {
            // Floating animation
            this.y = height / 2 + Math.sin(Date.now() / 300) * 10;
            this.rotation = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        // Draw centered
        ctx.drawImage(assets.bird, -assets.bird.width/2, -assets.bird.height/2);
        
        // Debug hitbox
        // ctx.strokeStyle = 'red';
        // ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        ctx.restore();
    }

    flap() {
        this.velocity = config.jumpStrength;
    }
}

class Pipe {
    constructor(x, y, isBottom) {
        this.x = x;
        this.y = y; // y is the edge of the opening
        this.isBottom = isBottom;
        this.width = 60;
        this.scored = false;
    }

    update() {
        this.x -= config.pipeSpeed;
    }

    draw() {
        // Draw pipe body
        // Determine height based on position
        // If bottom, draw from y down. If top, draw from y up.
        
        if (this.isBottom) {
            // Draw Cap
            ctx.drawImage(assets.pipeCap, this.x - 6, this.y);
            // Draw Body
            // We can draw a long pipe segment below
            ctx.drawImage(assets.pipe, this.x, this.y + 30);
        } else {
            // Top Pipe
            // Draw Cap
            ctx.drawImage(assets.pipeCap, this.x - 6, this.y - 30);
            // Draw Body
            // We need to draw the body going UP from y-30.
            // Since drawImage draws down, we can translate/scale or just draw a clipped version??
            // Easier: just draw a really long pipe at y-30-400
            ctx.save();
            ctx.translate(this.x, this.y - 30);
            ctx.scale(1, -1); // Flip vertically
            ctx.drawImage(assets.pipe, 0, 0); 
            ctx.restore();
        }
        
        // Debug hitbox
        // ctx.strokeStyle = 'blue';
        // if (this.isBottom) ctx.strokeRect(this.x, this.y, 60, height - this.y);
        // else ctx.strokeRect(this.x, 0, 60, this.y);
    }
    
    getBounds() {
        if (this.isBottom) {
            return { x: this.x, y: this.y, w: 60, h: height - this.y };
        } else {
            return { x: this.x, y: 0, w: 60, h: this.y };
        }
    }
}

// --- Core Functions ---

function init() {
    const container = document.getElementById('game-container');
    canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');
    container.appendChild(canvas);
    
    width = canvas.width;
    height = canvas.height;
    createAssets();
    
    bird = new Bird();
    
    // Resize handler
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        width = canvas.width;
        height = canvas.height;
        bird.x = width / 3;
    });

    // Input
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') handleInput();
        if (e.code === 'KeyP') togglePause();
        if (e.code === 'Enter') {
            if (gameState === 'PLAYING') togglePause();
            else handleInput();
        }
    });
    
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if clicked on pause button
        if (x >= pauseBtn.x && x <= pauseBtn.x + pauseBtn.width &&
            y >= pauseBtn.y && y <= pauseBtn.y + pauseBtn.height) {
            togglePause();
        } else {
            handleInput();
        }
    });
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        
        // Check if clicked on pause button
        if (x >= pauseBtn.x && x <= pauseBtn.x + pauseBtn.width &&
            y >= pauseBtn.y && y <= pauseBtn.y + pauseBtn.height) {
            togglePause();
        } else {
            handleInput();
        }
    }, { passive: false });

    loop();
}

function handleInput() {
    if (gameState === 'START') {
        gameState = 'PLAYING';
        bird.flap();
    } else if (gameState === 'PLAYING') {
        bird.flap();
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        bird.flap();
    } else if (gameState === 'GAMEOVER') {
        resetGame();
    }
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        // bird.flap(); // Optional: flap on resume from toggle? Maybe not if just unpausing via P/Enter
    }
}

function resetGame() {
    bird.reset();
    pipes = [];
    score = 0;
    gameState = 'START';
    lastTime = 0;
}

function gameOver() {
    gameState = 'GAMEOVER';
    // Shake effect
    canvas.style.transform = 'translate(5px, 5px)';
    setTimeout(() => canvas.style.transform = 'translate(-5px, -5px)', 50);
    setTimeout(() => canvas.style.transform = 'translate(0, 0)', 100);
}

function spawnPipes(timestamp) {
    if (timestamp - lastPipeSpawn > config.pipeSpawnRate) {
        lastPipeSpawn = timestamp;
        
        const minPipeH = 50;
        const maxPipeH = height - config.groundHeight - config.pipeGap - minPipeH;
        
        // Random height for top pipe
        const topHeight = Math.floor(Math.random() * (maxPipeH - minPipeH + 1)) + minPipeH;
        
        const bottomY = topHeight + config.pipeGap;
        
        pipes.push(new Pipe(width, topHeight, false)); // Top pipe (y is bottom edge)
        pipes.push(new Pipe(width, bottomY, true));    // Bottom pipe (y is top edge)
    }
}

function checkCollisions() {
    const birdBox = {
        x: bird.x - bird.width/2 + 5, // Tighten hitbox slightly
        y: bird.y - bird.height/2 + 5,
        w: bird.width - 10,
        h: bird.height - 10
    };

    pipes.forEach(pipe => {
        const p = pipe.getBounds();
        
        if (birdBox.x < p.x + p.w &&
            birdBox.x + birdBox.w > p.x &&
            birdBox.y < p.y + p.h &&
            birdBox.y + birdBox.h > p.y) {
            gameOver();
        }
    });
}

function drawBackground() {
    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#87CEEB'); // Sky Blue
    grad.addColorStop(1, '#E0F7FA'); 
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    
    // Sun
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.arc(width - 100, 100, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(width - 100, 100, 60, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1.0;

    // Distant hills
    ctx.fillStyle = '#2ECC71';
    for (let i = 0; i < width; i += 200) {
        ctx.beginPath();
        ctx.arc(i, height - config.groundHeight + 20, 120, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGround() {
    ctx.fillStyle = '#DEB887'; // Dirt
    ctx.fillRect(0, height - config.groundHeight, width, config.groundHeight);
    
    ctx.fillStyle = '#7CFC00'; // Grass top
    ctx.fillRect(0, height - config.groundHeight, width, 15);
    
    // Scrolling texture
    const offset = (frames * 2) % 30;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = -30; i < width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i - offset, height - config.groundHeight);
        ctx.lineTo(i - offset + 10, height - config.groundHeight + 15);
        ctx.lineTo(i - offset - 10, height - config.groundHeight + 15);
        ctx.fill();
    }
}

function drawUI() {
    // Score
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = '700 60px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.strokeText(score, width / 2, 80);
    ctx.fillText(score, width / 2, 80);
    
    // Texts based on state
    if (gameState === 'START') {
        drawText('Click or Space to Start', height/2 + 50, 30);
    } else if (gameState === 'GAMEOVER') {
        drawText('GAME OVER', height/2 - 20, 50, '#FF0000');
        drawText(`Score: ${score}`, height/2 + 40, 30);
        drawText('Click to Restart', height/2 + 90, 20);
    } else if (gameState === 'PAUSED') {
        drawText('PAUSED', height/2, 50);
    }
    
    drawPauseButton();
}

function drawPauseButton() {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    if (gameState === 'PAUSED') {
        // Draw Play Icon (Triangle)
        ctx.beginPath();
        ctx.moveTo(pauseBtn.x + 10, pauseBtn.y + 10);
        ctx.lineTo(pauseBtn.x + 35, pauseBtn.y + 20);
        ctx.lineTo(pauseBtn.x + 10, pauseBtn.y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else {
        // Draw Pause Icon (Two Bars)
        ctx.fillRect(pauseBtn.x + 8, pauseBtn.y + 8, 8, 24);
        ctx.strokeRect(pauseBtn.x + 8, pauseBtn.y + 8, 8, 24);
        
        ctx.fillRect(pauseBtn.x + 24, pauseBtn.y + 8, 8, 24);
        ctx.strokeRect(pauseBtn.x + 24, pauseBtn.y + 8, 8, 24);
    }
}

function drawText(text, y, size, color='#FFFFFF') {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3; // thinner stroke for smaller text
    ctx.font = `700 ${size}px "Segoe UI", Arial`;
    ctx.textAlign = 'center';
    ctx.strokeText(text, width / 2, y);
    ctx.fillText(text, width / 2, y);
}

// --- Loop ---

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    
    drawBackground();
    
    if (gameState === 'PLAYING') {
        spawnPipes(timestamp);
        
        // Update Pipes
        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].update();
            pipes[i].draw();
            
            // Score
            if (!pipes[i].scored && pipes[i].x + pipes[i].width < bird.x) {
                // Determine if this is the pair we count (just count one of the pair)
                // Actually, just check if it's the top pipe to avoid double counting
                if (!pipes[i].isBottom) {
                    score++;
                    pipes[i].scored = true;
                    // Optional: Play sound
                }
            }

            // Remove offscreen
            if (pipes[i].x + pipes[i].width < -50) {
                pipes.splice(i, 1);
            }
        }
        
        checkCollisions();

        drawGround();
    
        bird.update();
        bird.draw();
        
    } else {
        // Draw static pipes if waiting/gameover/paused
        pipes.forEach(p => p.draw());
        drawGround();
        bird.draw();
        if (gameState !== 'PAUSED') bird.update(); // Only update bird animation if not paused (though START has animation)
        if (gameState === 'START') bird.update();
    }
    
    drawUI();

    lastTime = timestamp;
    frames++;
    requestAnimationFrame(loop);
}

// Start
window.onload = init;
