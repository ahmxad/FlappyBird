// Flappy Bird Game using Phaser 3

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 800 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let bird;
let pipes;
let scoreText;
let highScoreText;
let score = 0;
let highScore = localStorage.getItem("flappyHighScore") || 0;
let gameOver = false;
let gameStarted = false;
let pipeTimer;
let background;
let ground;
let startText;
let gameOverText;
let restartText;
let flapSound;
let hitSound;
let scoreSound;
let isPaused = false;
let pauseButton;
let pauseText;
let pauseButtonClicked = false;

// Graphics generation functions
function createBirdGraphics(scene) {
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

  // Bird body (yellow)
  graphics.fillStyle(0xffd700, 1);
  graphics.fillCircle(20, 20, 18);

  // Bird belly (lighter yellow)
  graphics.fillStyle(0xfff4bd, 1);
  graphics.fillCircle(22, 24, 10);

  // Bird eye (white)
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(28, 14, 8);

  // Bird pupil (black)
  graphics.fillStyle(0x000000, 1);
  graphics.fillCircle(30, 14, 4);

  // Bird beak (orange)
  graphics.fillStyle(0xff6b35, 1);
  graphics.fillTriangle(34, 20, 48, 22, 34, 28);

  // Bird wing (orange)
  graphics.fillStyle(0xe8a317, 1);
  graphics.fillEllipse(14, 22, 14, 8);

  graphics.generateTexture("bird", 50, 40);
  graphics.destroy();
}

function createPipeGraphics(scene) {
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

  // Pipe body - green gradient effect
  graphics.fillStyle(0x2ecc71, 1);
  graphics.fillRect(0, 0, 60, 400);

  // Left shadow
  graphics.fillStyle(0x27ae60, 1);
  graphics.fillRect(0, 0, 8, 400);

  // Right highlight
  graphics.fillStyle(0x58d68d, 1);
  graphics.fillRect(52, 0, 8, 400);

  // Center highlight
  graphics.fillStyle(0x82e0aa, 1);
  graphics.fillRect(24, 0, 12, 400);

  graphics.generateTexture("pipe", 60, 400);
  graphics.destroy();
}

function createPipeCapGraphics(scene) {
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

  // Pipe cap
  graphics.fillStyle(0x2ecc71, 1);
  graphics.fillRect(0, 0, 72, 30);

  // Left shadow
  graphics.fillStyle(0x27ae60, 1);
  graphics.fillRect(0, 0, 8, 30);

  // Right highlight
  graphics.fillStyle(0x58d68d, 1);
  graphics.fillRect(64, 0, 8, 30);

  // Top highlight
  graphics.fillStyle(0x82e0aa, 1);
  graphics.fillRect(8, 2, 56, 4);

  graphics.generateTexture("pipeCap", 72, 30);
  graphics.destroy();
}

function createBackgroundGraphics(scene) {
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  const width = scene.scale.width;
  const height = scene.scale.height;

  // Sky gradient (from top to bottom)
  // Sky (Simple blue)
  graphics.fillStyle(0x87ceeb, 1);
  graphics.fillRect(0, 0, width, height);

  // Sun
  graphics.fillStyle(0xffff00, 1); // Bright yellow
  graphics.fillCircle(width - 100, 100, 40);

  // Sun glow/rays
  graphics.fillStyle(0xffff00, 0.3);
  graphics.fillCircle(width - 100, 100, 60);
  graphics.fillStyle(0xffff00, 0.1);
  graphics.fillCircle(width - 100, 100, 80);

  // Distant hills / Bushes
  graphics.fillStyle(0x2ecc71, 0.8); // Darker green, higher opacity
  for (let i = 0; i < width; i += 200) {
    graphics.fillCircle(i, height - 30, 150);
  }

  graphics.generateTexture("background", width, height);
  graphics.destroy();
}

function createGroundGraphics(scene) {
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  const width = scene.scale.width;

  // Ground base (brown)
  graphics.fillStyle(0xdeb887, 1);
  graphics.fillRect(0, 0, width, 80);

  // Grass top
  graphics.fillStyle(0x7cfc00, 1);
  graphics.fillRect(0, 0, width, 15);

  // Grass detail
  graphics.fillStyle(0x32cd32, 1);
  for (let i = 0; i < width; i += 10) {
    graphics.fillTriangle(i, 15, i + 5, 0, i + 10, 15);
  }

  // Dirt texture
  graphics.fillStyle(0xcd853f, 0.5);
  for (let i = 0; i < width; i += 30) {
    graphics.fillCircle(i + 15, 40, 8);
    graphics.fillCircle(i + 5, 60, 6);
  }

  graphics.generateTexture("ground", width, 80);
  graphics.destroy();
}

function preload() {
  // Create all textures programmatically
  createBirdGraphics(this);
  createPipeGraphics(this);
  createPipeCapGraphics(this);
  createBackgroundGraphics(this);
  createGroundGraphics(this);
}

function create() {
  // Add background
  background = this.add.image(this.scale.width / 2, this.scale.height / 2, "background");

  // Create ground
  ground = this.add.tileSprite(this.scale.width / 2, this.scale.height - 40, this.scale.width, 80, "ground");

  // Create physics ground (invisible)
  const groundPhysics = this.add.rectangle(this.scale.width / 2, this.scale.height - 20, this.scale.width, 40, 0x000000, 0);
  this.physics.add.existing(groundPhysics, true);

  // Create ceiling (invisible)
  const ceiling = this.add.rectangle(this.scale.width / 2, -20, this.scale.width, 40, 0x000000, 0);
  this.physics.add.existing(ceiling, true);

  // Create bird
  bird = this.physics.add.sprite(this.scale.width / 3, this.scale.height / 2, "bird");
  bird.setScale(0.8);
  bird.setCollideWorldBounds(false);
  bird.body.allowGravity = false;
  bird.setDepth(10);

  // Create pipes group (regular group, we'll move pipes manually)
  pipes = this.add.group();

  // Score display
  scoreText = this.add
    .text(this.scale.width / 2, 50, "0", {
      fontSize: "64px",
      fontFamily: "Arial Black",
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setDepth(20);

  // High score display
  highScoreText = this.add
    .text(this.scale.width / 2, 100, `Best: ${highScore}`, {
      fontSize: "24px",
      fontFamily: "Arial",
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(20);

  // Start text
  startText = this.add
    .text(this.scale.width / 2, this.scale.height / 2 + 50, "Click or Press SPACE\nto Start", {
      fontSize: "28px",
      fontFamily: "Arial",
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(20);

  // Game over text (hidden initially)
  gameOverText = this.add
    .text(this.scale.width / 2, this.scale.height / 2 - 50, "GAME OVER", {
      fontSize: "48px",
      fontFamily: "Arial Black",
      fill: "#FF0000",
      stroke: "#000000",
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setDepth(20)
    .setVisible(false);

  // Restart text (hidden initially)
  restartText = this.add
    .text(this.scale.width / 2, this.scale.height / 2 + 50, "Click or Press SPACE\nto Restart", {
      fontSize: "24px",
      fontFamily: "Arial",
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(20)
    .setVisible(false);

  // Pause button
  pauseButton = this.add
    .text(this.scale.width - 40, 40, "⏸️", {
      fontSize: "32px",
    })
    .setOrigin(0.5)
    .setDepth(30)
    .setInteractive({ useHandCursor: true });

  pauseButton.on(
    "pointerdown",
    function () {
      pauseButtonClicked = true;
      togglePause.call(this);
    },
    this,
  );

  pauseText = this.add
    .text(this.scale.width / 2, this.scale.height / 2, "PAUSED\n\nPress P or click ⏸️ to resume", {
      fontSize: "24px",
      fontFamily: "Arial",
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: 5,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(30)
    .setVisible(false);

  // Collisions
  this.physics.add.collider(bird, groundPhysics, hitGround, null, this);
  this.physics.add.collider(bird, ceiling, hitCeiling, null, this);
  this.physics.add.overlap(bird, pipes, hitPipe, null, this);

  // Input handling
  this.input.on("pointerdown", flap, this);
  this.input.keyboard.on("keydown-SPACE", flap, this);
  this.input.keyboard.on("keydown-P", togglePause, this);

  // Bird floating animation before game starts
  this.tweens.add({
    targets: bird,
    y: bird.y + 15,
    duration: 500,
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  });
}

function togglePause() {
  if (!gameStarted || gameOver) return;

  isPaused = !isPaused;

  if (isPaused) {
    // Pause the game
    bird.body.allowGravity = false;
    bird.body.setVelocity(0, 0);
    pauseButton.setText("▶️");
    pauseText.setVisible(true);
    if (pipeTimer) pipeTimer.paused = true;
  } else {
    // Resume the game
    bird.body.allowGravity = true;
    pauseButton.setText("⏸️");
    pauseText.setVisible(false);
    if (pipeTimer) pipeTimer.paused = false;
  }
}

function flap(pointer) {
  // Ignore if pause button was just clicked
  if (pauseButtonClicked) {
    pauseButtonClicked = false;
    return;
  }

  if (isPaused) {
    togglePause.call(this);
    return;
  }

  if (gameOver) {
    restartGame.call(this);
    return;
  }

  if (!gameStarted) {
    startGame.call(this);
  }

  if (!gameOver) {
    bird.setVelocityY(-300);

    // Bird flap animation
    this.tweens.add({
      targets: bird,
      angle: -20,
      duration: 100,
      ease: "Power2",
    });
  }
}

function startGame() {
  gameStarted = true;
  startText.setVisible(false);

  // Stop floating animation and enable gravity
  this.tweens.killTweensOf(bird);
  bird.body.allowGravity = true;

  // Start spawning pipes
  pipeTimer = this.time.addEvent({
    delay: 2000,
    callback: spawnPipes,
    callbackScope: this,
    loop: true,
  });

  // Spawn first pipes immediately
  spawnPipes.call(this);
}

function spawnPipes() {
  if (gameOver) return;

  const gapSize = 175;
  const minHeight = 80;
  const maxHeight = this.scale.height - 250;
  const gapPosition = Phaser.Math.Between(minHeight + gapSize / 2, maxHeight);
  const pipeSpeed = -200;

  // Top pipe
  const topPipeHeight = gapPosition - gapSize / 2;
  const topPipe = this.add.container(this.scale.width + 100, 0);

  // Pipe body
  const topPipeBody = this.add.image(0, topPipeHeight / 2, "pipe");
  topPipeBody.setDisplaySize(60, topPipeHeight);
  topPipe.add(topPipeBody);

  // Pipe cap
  const topCap = this.add.image(0, topPipeHeight - 15, "pipeCap");
  topPipe.add(topCap);

  this.physics.add.existing(topPipe);
  topPipe.body.setSize(60, topPipeHeight);
  topPipe.body.setOffset(-30, 0);
  topPipe.body.allowGravity = false;
  topPipe.body.immovable = true;
  topPipe.pipeSpeed = pipeSpeed;
  pipes.add(topPipe);

  // Bottom pipe
  const bottomPipeY = gapPosition + gapSize / 2;
  const bottomPipeHeight = this.scale.height - 80 - bottomPipeY;
  const bottomPipe = this.add.container(this.scale.width + 100, bottomPipeY);

  // Pipe body
  const bottomPipeBody = this.add.image(0, bottomPipeHeight / 2, "pipe");
  bottomPipeBody.setDisplaySize(60, bottomPipeHeight);
  bottomPipe.add(bottomPipeBody);

  // Pipe cap
  const bottomCap = this.add.image(0, 15, "pipeCap");
  bottomPipe.add(bottomCap);

  this.physics.add.existing(bottomPipe);
  bottomPipe.body.setSize(60, bottomPipeHeight);
  bottomPipe.body.setOffset(-30, 0);
  bottomPipe.body.allowGravity = false;
  bottomPipe.body.immovable = true;
  bottomPipe.scored = false;
  bottomPipe.pipeSpeed = pipeSpeed;
  pipes.add(bottomPipe);
}

function hitGround() {
  if (!gameOver) {
    endGame.call(this);
  }
}

function hitCeiling() {
  bird.setVelocityY(100);
}

function hitPipe() {
  if (!gameOver) {
    endGame.call(this);
  }
}

function endGame() {
  gameOver = true;

  // Stop pipes from moving
  pipes.getChildren().forEach((pipe) => {
    pipe.body.setVelocityX(0);
  });

  // Stop bird
  bird.setVelocityX(0);
  bird.setVelocityY(0);
  bird.body.allowGravity = false;

  // Stop pipe spawning
  if (pipeTimer) {
    pipeTimer.remove();
  }

  // Update high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("flappyHighScore", highScore);
    highScoreText.setText(`Best: ${highScore}`);
  }

  // Show game over UI
  gameOverText.setVisible(true);
  restartText.setVisible(true);

  // Flash effect
  this.cameras.main.flash(250, 255, 0, 0);
  this.cameras.main.shake(250, 0.01);
}

function restartGame() {
  score = 0;
  gameOver = false;
  gameStarted = false;
  isPaused = false;
  pauseButton.setText("⏸️");
  pauseText.setVisible(false);

  // Reset bird
  bird.setPosition(this.scale.width / 3, this.scale.height / 2);
  bird.setVelocity(0, 0);
  bird.body.allowGravity = false;
  bird.setAngle(0);

  // Clear pipes
  pipes.clear(true, true);

  // Reset UI
  scoreText.setText("0");
  gameOverText.setVisible(false);
  restartText.setVisible(false);
  startText.setVisible(true);
  highScoreText.setText(`Best: ${highScore}`);

  // Restart floating animation
  this.tweens.add({
    targets: bird,
    y: bird.y + 15,
    duration: 500,
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  });
}

function update() {
  if (!gameStarted || gameOver || isPaused) return;

  // Rotate bird based on velocity
  if (bird.body.velocity.y > 0) {
    bird.angle = Math.min(bird.angle + 2, 70);
  }

  // Scroll ground
  ground.tilePositionX += 2;

  // Move pipes and check for collisions/scoring
  const pipesToRemove = [];

  pipes.getChildren().forEach((pipe) => {
    // Move pipe manually
    pipe.x += pipe.pipeSpeed * (1 / 60); // Assuming 60 FPS

    // Update physics body position
    if (pipe.body) {
      pipe.body.x = pipe.x - 30;
    }

    // Check collision with bird
    if (pipe.body && this.physics.overlap(bird, pipe)) {
      endGame.call(this);
      return;
    }

    // Check for scoring
    if (!pipe.scored && pipe.x + 30 < bird.x) {
      pipe.scored = true;
      // Only count every other pipe (both top and bottom share x)
      if (pipe.y > 100) {
        // This is a bottom pipe
        score++;
        scoreText.setText(score.toString());

        // Score pop animation
        this.tweens.add({
          targets: scoreText,
          scale: 1.2,
          duration: 100,
          yoyo: true,
        });
      }
    }

    // Mark for removal if off screen
    if (pipe.x < -100) {
      pipesToRemove.push(pipe);
    }
  });

  // Remove off-screen pipes
  pipesToRemove.forEach((pipe) => {
    pipes.remove(pipe, true, true);
  });

  // Check if bird fell off screen
  if (bird.y > this.scale.height) {
    endGame.call(this);
  }
}
