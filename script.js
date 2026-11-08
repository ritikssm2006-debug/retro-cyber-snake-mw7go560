(function() {
  const CFG = {"title":"Retro Cyber Snake","tagline":"Eat glowing data orbs, grow longer, don't crash","genre":"snake","theme":{"primary":"#4ade80","accent":"#38bdf8","bg":"#020f06"},"playerSpeed":6,"difficulty":3,"lives":1,"targetScore":120,"rewardCoupon":"SNAKEMASTER","rewardText":"High score achieved! Use code SNAKEMASTER at checkout!","instructions":"Arrow keys or on-screen arrows to steer. Collect green energy orbs."};
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  
  // Audio synthesizer via Web Audio API (zero audio files needed)
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playSound(type) {
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (type === "laser") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "coin") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "hit") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === "win") {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.connect(g);
          g.connect(audioCtx.destination);
          o.type = "square";
          o.frequency.setValueAtTime(freq, now + i * 0.1);
          g.gain.setValueAtTime(0.2, now + i * 0.1);
          g.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.25);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.25);
        });
      } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {}
  }

  // Dimensions
  const W = 600;
  const H = 700;
  canvas.width = W;
  canvas.height = H;

  // Game state
  let state = "PLAYING"; // PLAYING, WON, GAMEOVER
  let score = 0;
  let lives = CFG.lives;
  let particles = [];

  function addParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color,
        life: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
      } else {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  // Keys
  const keys = {};
  window.addEventListener("keydown", (e) => {
    initAudio();
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  // On-screen touch buttons
  const leftBtn = document.getElementById("btnLeft");
  const rightBtn = document.getElementById("btnRight");
  const actionBtn = document.getElementById("btnAction");
  let touchLeft = false, touchRight = false, touchAction = false;
  
  if (leftBtn) {
    const setL = (v) => { initAudio(); touchLeft = v; };
    leftBtn.addEventListener("touchstart", (e) => { e.preventDefault(); setL(true); });
    leftBtn.addEventListener("touchend", () => setL(false));
    leftBtn.addEventListener("mousedown", () => setL(true));
    leftBtn.addEventListener("mouseup", () => setL(false));
  }
  if (rightBtn) {
    const setR = (v) => { initAudio(); touchRight = v; };
    rightBtn.addEventListener("touchstart", (e) => { e.preventDefault(); setR(true); });
    rightBtn.addEventListener("touchend", () => setR(false));
    rightBtn.addEventListener("mousedown", () => setR(true));
    rightBtn.addEventListener("mouseup", () => setR(false));
  }
  if (actionBtn) {
    const setA = (v) => { initAudio(); touchAction = v; };
    actionBtn.addEventListener("touchstart", (e) => { e.preventDefault(); setA(true); });
    actionBtn.addEventListener("touchend", () => setA(false));
    actionBtn.addEventListener("mousedown", () => setA(true));
    actionBtn.addEventListener("mouseup", () => setA(false));
  }

  // Mouse / Pointer canvas tracking
  let pointerX = W / 2;
  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = (e.clientX - rect.left) * (W / rect.width);
  });
  canvas.addEventListener("pointerdown", () => {
    initAudio();
    touchAction = true;
    setTimeout(() => { touchAction = false; }, 100);
  });

  // ------------------------------------------------------------- Engine Selection
  let updateGame = () => {}, renderGame = () => {}, resetGame = () => {};

  if (CFG.genre === "space_shooter") {
    // Space Shooter Engine
    let player = { x: W / 2, y: H - 70, w: 40, h: 44, speed: CFG.playerSpeed * 1.3 };
    let bullets = [];
    let enemies = [];
    let shootTimer = 0;
    let spawnTimer = 0;

    resetGame = () => {
      score = 0;
      lives = CFG.lives;
      state = "PLAYING";
      player.x = W / 2;
      bullets = [];
      enemies = [];
      particles = [];
    };

    updateGame = () => {
      if (keys["ArrowLeft"] || keys["KeyA"] || touchLeft) player.x -= player.speed;
      if (keys["ArrowRight"] || keys["KeyD"] || touchRight) player.x += player.speed;
      player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

      shootTimer++;
      if ((keys["Space"] || touchAction) && shootTimer > 14) {
        shootTimer = 0;
        bullets.push({ x: player.x - 10, y: player.y, w: 4, h: 14 });
        bullets.push({ x: player.x + 10, y: player.y, w: 4, h: 14 });
        playSound("laser");
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= 12;
        if (bullets[i].y < -20) bullets.splice(i, 1);
      }

      spawnTimer++;
      const interval = Math.max(25, 60 - CFG.difficulty * 8);
      if (spawnTimer > interval) {
        spawnTimer = 0;
        const isBig = Math.random() > 0.7;
        enemies.push({
          x: Math.random() * (W - 60) + 30,
          y: -40,
          w: isBig ? 48 : 32,
          h: isBig ? 48 : 32,
          speed: (Math.random() * 2 + 1.5) * (0.8 + CFG.difficulty * 0.2),
          hp: isBig ? 3 : 1,
          color: isBig ? CFG.theme.accent : CFG.theme.primary
        });
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += e.speed;

        // Collision with bullets
        for (let b = bullets.length - 1; b >= 0; b--) {
          const bl = bullets[b];
          if (bl.x > e.x - e.w/2 && bl.x < e.x + e.w/2 && bl.y > e.y - e.h/2 && bl.y < e.y + e.h/2) {
            bullets.splice(b, 1);
            e.hp--;
            addParticles(bl.x, bl.y, CFG.theme.primary, 4);
            if (e.hp <= 0) {
              addParticles(e.x, e.y, e.color, 16);
              enemies.splice(i, 1);
              score += 15;
              playSound("coin");
              if (score >= CFG.targetScore) {
                state = "WON";
                playSound("win");
              }
              break;
            }
          }
        }

        // Collision with player
        if (e && Math.abs(e.x - player.x) < (e.w + player.w) / 2.5 && Math.abs(e.y - player.y) < (e.h + player.h) / 2.5) {
          addParticles(e.x, e.y, "#f43f5e", 20);
          enemies.splice(i, 1);
          lives--;
          playSound("hit");
          if (lives <= 0) {
            state = "GAMEOVER";
            playSound("gameover");
          }
        }

        if (e && e.y > H + 50) enemies.splice(i, 1);
      }
    };

    renderGame = () => {
      // Stars background
      ctx.fillStyle = CFG.theme.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      for (let s = 0; s < 40; s++) {
        const sx = (s * 37 + Date.now() * 0.04) % W;
        const sy = (s * 53 + Date.now() * 0.08) % H;
        ctx.fillRect(sx, sy, s % 3 === 0 ? 2 : 1, s % 3 === 0 ? 2 : 1);
      }

      // Player Ship
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.fillStyle = CFG.theme.primary;
      ctx.beginPath();
      ctx.moveTo(0, -player.h / 2);
      ctx.lineTo(player.w / 2, player.h / 2);
      ctx.lineTo(0, player.h / 3);
      ctx.lineTo(-player.w / 2, player.h / 2);
      ctx.closePath();
      ctx.fill();
      // Cockpit
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      // Jet flame
      ctx.fillStyle = CFG.theme.accent;
      ctx.beginPath();
      ctx.moveTo(-6, player.h / 2);
      ctx.lineTo(0, player.h / 2 + Math.random() * 12 + 6);
      ctx.lineTo(6, player.h / 2);
      ctx.fill();
      ctx.restore();

      // Bullets
      ctx.fillStyle = CFG.theme.primary;
      for (const b of bullets) {
        ctx.shadowColor = CFG.theme.primary;
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - b.w/2, b.y, b.w, b.h);
      }
      ctx.shadowBlur = 0;

      // Enemies
      for (const e of enemies) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(e.x - 4, e.y - 4, 3, 3);
        ctx.fillRect(e.x + 2, e.y - 4, 3, 3);
      }
    };

  } else if (CFG.genre === "catch_items") {
    // Catch & Collect Promo Engine
    let basket = { x: W / 2, y: H - 60, w: 90, h: 26, speed: CFG.playerSpeed * 1.5 };
    let items = [];
    let spawnTimer = 0;

    resetGame = () => {
      score = 0;
      lives = CFG.lives;
      state = "PLAYING";
      items = [];
      particles = [];
    };

    updateGame = () => {
      if (keys["ArrowLeft"] || keys["KeyA"] || touchLeft) basket.x -= basket.speed;
      if (keys["ArrowRight"] || keys["KeyD"] || touchRight) basket.x += basket.speed;
      basket.x = Math.max(basket.w / 2, Math.min(W - basket.w / 2, basket.x));

      spawnTimer++;
      if (spawnTimer > Math.max(20, 48 - CFG.difficulty * 6)) {
        spawnTimer = 0;
        const isBomb = Math.random() < 0.28;
        items.push({
          x: Math.random() * (W - 80) + 40,
          y: -30,
          size: 20,
          isBomb,
          speed: (Math.random() * 2.5 + 2.5) * (0.8 + CFG.difficulty * 0.15)
        });
      }

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.speed;

        // Catch collision
        if (item.y + item.size >= basket.y && item.y - item.size <= basket.y + basket.h &&
            item.x >= basket.x - basket.w/2 - 10 && item.x <= basket.x + basket.w/2 + 10) {
          if (item.isBomb) {
            addParticles(item.x, item.y, "#f43f5e", 18);
            lives--;
            playSound("hit");
            if (lives <= 0) {
              state = "GAMEOVER";
              playSound("gameover");
            }
          } else {
            addParticles(item.x, item.y, CFG.theme.primary, 14);
            score += 20;
            playSound("coin");
            if (score >= CFG.targetScore) {
              state = "WON";
              playSound("win");
            }
          }
          items.splice(i, 1);
          continue;
        }

        // Missed good item
        if (item.y > H + 30) {
          if (!item.isBomb) {
            lives--;
            playSound("hit");
            if (lives <= 0) {
              state = "GAMEOVER";
              playSound("gameover");
            }
          }
          items.splice(i, 1);
        }
      }
    };

    renderGame = () => {
      ctx.fillStyle = CFG.theme.bg;
      ctx.fillRect(0, 0, W, H);

      // Basket
      ctx.fillStyle = CFG.theme.primary;
      ctx.shadowColor = CFG.theme.primary;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(basket.x - basket.w / 2, basket.y, basket.w, basket.h, 12);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Basket stripes
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(basket.x - 20, basket.y + 4, 40, 4);

      // Falling items
      for (const item of items) {
        if (item.isBomb) {
          ctx.fillStyle = "#f43f5e";
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("💣", item.x, item.y + 5);
        } else {
          ctx.fillStyle = CFG.theme.accent;
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#000000";
          ctx.font = "bold 15px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("★", item.x, item.y + 5);
        }
      }
    };

  } else if (CFG.genre === "flappy_runner") {
    // Tap Runner Engine
    let bird = { y: H / 2, vy: 0, gravity: 0.38, jump: -6.8, size: 18 };
    let pipes = [];
    let pipeTimer = 0;

    resetGame = () => {
      score = 0;
      lives = CFG.lives;
      state = "PLAYING";
      bird.y = H / 2;
      bird.vy = 0;
      pipes = [];
      particles = [];
    };

    updateGame = () => {
      bird.vy += bird.gravity;
      bird.y += bird.vy;

      if ((keys["Space"] || touchAction) && bird.vy > -2) {
        bird.vy = bird.jump;
        addParticles(100, bird.y + 10, CFG.theme.accent, 5);
        playSound("laser");
      }

      pipeTimer++;
      const speed = 3.5 + CFG.difficulty * 0.5;
      if (pipeTimer > 85) {
        pipeTimer = 0;
        const gap = Math.max(140, 190 - CFG.difficulty * 10);
        const topH = Math.random() * (H - gap - 160) + 70;
        pipes.push({ x: W + 30, topH, gap, passed: false });
      }

      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= speed;

        // Collision detection
        if (100 + bird.size > p.x && 100 - bird.size < p.x + 56) {
          if (bird.y - bird.size < p.topH || bird.y + bird.size > p.topH + p.gap) {
            addParticles(100, bird.y, "#f43f5e", 20);
            state = "GAMEOVER";
            playSound("gameover");
          }
        }

        if (!p.passed && p.x + 56 < 100) {
          p.passed = true;
          score += 1;
          playSound("coin");
          if (score >= CFG.targetScore) {
            state = "WON";
            playSound("win");
          }
        }

        if (p.x < -80) pipes.splice(i, 1);
      }

      if (bird.y > H - 20 || bird.y < 10) {
        state = "GAMEOVER";
        playSound("gameover");
      }
    };

    renderGame = () => {
      ctx.fillStyle = CFG.theme.bg;
      ctx.fillRect(0, 0, W, H);

      // Pipes / Gates
      for (const p of pipes) {
        ctx.fillStyle = CFG.theme.primary;
        ctx.fillRect(p.x, 0, 56, p.topH);
        ctx.fillRect(p.x, p.topH + p.gap, 56, H - p.topH - p.gap);
        // Gate energy beam
        ctx.strokeStyle = CFG.theme.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x - 2, p.topH - 10, 60, 10);
        ctx.strokeRect(p.x - 2, p.topH + p.gap, 60, 10);
      }

      // Runner Player
      ctx.fillStyle = CFG.theme.accent;
      ctx.shadowColor = CFG.theme.accent;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(100, bird.y, bird.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(106, bird.y - 4, 4, 4);
    };

  } else if (CFG.genre === "brick_breaker") {
    // Brick Breaker Engine
    let paddle = { x: W / 2, w: 100, h: 18, speed: CFG.playerSpeed * 1.4 };
    let ball = { x: W / 2, y: H - 100, vx: 4, vy: -5, r: 8 };
    let bricks = [];

    const initBricks = () => {
      bricks = [];
      const cols = 7;
      const rows = 4 + Math.min(2, CFG.difficulty);
      const bW = (W - 80) / cols;
      const bH = 22;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          bricks.push({
            x: 40 + c * bW,
            y: 60 + r * (bH + 6),
            w: bW - 6,
            h: bH,
            alive: true,
            color: r % 2 === 0 ? CFG.theme.primary : CFG.theme.accent
          });
        }
      }
    };

    resetGame = () => {
      score = 0;
      lives = CFG.lives;
      state = "PLAYING";
      ball.x = W / 2;
      ball.y = H - 100;
      ball.vx = (Math.random() > 0.5 ? 4 : -4) * (0.8 + CFG.difficulty * 0.15);
      ball.vy = -5 * (0.8 + CFG.difficulty * 0.15);
      initBricks();
      particles = [];
    };
    initBricks();

    updateGame = () => {
      if (keys["ArrowLeft"] || keys["KeyA"] || touchLeft) paddle.x -= paddle.speed;
      if (keys["ArrowRight"] || keys["KeyD"] || touchRight) paddle.x += paddle.speed;
      paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall bounces
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = -ball.vx; playSound("laser"); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -ball.vx; playSound("laser"); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = -ball.vy; playSound("laser"); }

      // Paddle bounce
      if (ball.y + ball.r >= H - 55 && ball.y - ball.r <= H - 35 &&
          ball.x >= paddle.x - paddle.w/2 && ball.x <= paddle.x + paddle.w/2) {
        ball.vy = -Math.abs(ball.vy);
        const hitOffset = (ball.x - paddle.x) / (paddle.w / 2);
        ball.vx = hitOffset * 6.5;
        addParticles(ball.x, ball.y, CFG.theme.primary, 8);
        playSound("coin");
      }

      // Brick collision
      let allCleared = true;
      for (const b of bricks) {
        if (!b.alive) continue;
        allCleared = false;
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
            ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
          b.alive = false;
          ball.vy = -ball.vy;
          addParticles(b.x + b.w/2, b.y + b.h/2, b.color, 12);
          score += 10;
          playSound("coin");
          if (score >= CFG.targetScore) {
            state = "WON";
            playSound("win");
          }
          break;
        }
      }

      if (allCleared) {
        state = "WON";
        playSound("win");
      }

      // Ball fell out
      if (ball.y > H + 20) {
        lives--;
        playSound("hit");
        if (lives <= 0) {
          state = "GAMEOVER";
          playSound("gameover");
        } else {
          ball.x = paddle.x;
          ball.y = H - 90;
          ball.vx = (Math.random() > 0.5 ? 4 : -4);
          ball.vy = -5;
        }
      }
    };

    renderGame = () => {
      ctx.fillStyle = CFG.theme.bg;
      ctx.fillRect(0, 0, W, H);

      // Paddle
      ctx.fillStyle = CFG.theme.primary;
      ctx.beginPath();
      ctx.roundRect(paddle.x - paddle.w / 2, H - 55, paddle.w, paddle.h, 8);
      ctx.fill();

      // Ball
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      // Bricks
      for (const b of bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 4);
        ctx.fill();
      }
    };

  } else {
    // Retro Cyber Snake Engine
    const gridSize = 20;
    const tileCountX = W / gridSize;
    const tileCountY = (H - 80) / gridSize;
    let snake = [{ x: 12, y: 15 }, { x: 11, y: 15 }, { x: 10, y: 15 }];
    let dx = 1, dy = 0;
    let nextDx = 1, nextDy = 0;
    let food = { x: 18, y: 15 };
    let stepTimer = 0;

    const spawnFood = () => {
      food.x = Math.floor(Math.random() * (tileCountX - 2)) + 1;
      food.y = Math.floor(Math.random() * (tileCountY - 2)) + 1;
    };

    resetGame = () => {
      score = 0;
      lives = 1;
      state = "PLAYING";
      snake = [{ x: 12, y: 15 }, { x: 11, y: 15 }, { x: 10, y: 15 }];
      dx = 1; dy = 0; nextDx = 1; nextDy = 0;
      spawnFood();
      particles = [];
    };

    updateGame = () => {
      if ((keys["ArrowLeft"] || keys["KeyA"] || touchLeft) && dx === 0) { nextDx = -1; nextDy = 0; }
      if ((keys["ArrowRight"] || keys["KeyD"] || touchRight) && dx === 0) { nextDx = 1; nextDy = 0; }
      if (keys["ArrowUp"] && dy === 0) { nextDx = 0; nextDy = -1; }
      if (keys["ArrowDown"] && dy === 0) { nextDx = 0; nextDy = 1; }

      stepTimer++;
      const speedInterval = Math.max(4, 10 - CFG.difficulty);
      if (stepTimer < speedInterval) return;
      stepTimer = 0;

      dx = nextDx;
      dy = nextDy;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      // Wall crash
      if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
        state = "GAMEOVER";
        playSound("gameover");
        return;
      }

      // Self crash
      for (const seg of snake) {
        if (seg.x === head.x && seg.y === head.y) {
          state = "GAMEOVER";
          playSound("gameover");
          return;
        }
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        score += 15;
        addParticles(food.x * gridSize + 10, food.y * gridSize + 10, CFG.theme.accent, 12);
        playSound("coin");
        spawnFood();
        if (score >= CFG.targetScore) {
          state = "WON";
          playSound("win");
        }
      } else {
        snake.pop();
      }
    };

    renderGame = () => {
      ctx.fillStyle = CFG.theme.bg;
      ctx.fillRect(0, 0, W, H);

      // Grid border
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.strokeRect(0, 0, W, tileCountY * gridSize);

      // Food
      ctx.fillStyle = CFG.theme.accent;
      ctx.shadowColor = CFG.theme.accent;
      ctx.shadowBlur = 10;
      ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
      ctx.shadowBlur = 0;

      // Snake body
      snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? "#ffffff" : CFG.theme.primary;
        ctx.fillRect(seg.x * gridSize + 1, seg.y * gridSize + 1, gridSize - 2, gridSize - 2);
      });
    };
  }

  // ------------------------------------------------------------- Loop & HUD
  function loop() {
    if (state === "PLAYING") {
      updateGame();
    }
    renderGame();
    updateParticles();

    // HUD (Score & Lives)
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SCORE: " + score + " / " + CFG.targetScore, 18, 26);
    ctx.textAlign = "right";
    ctx.fillText("LIVES: " + "❤️ ".repeat(Math.max(0, lives)), W - 18, 26);

    // Overlays
    const overlay = document.getElementById("gameOverlay");
    const titleEl = document.getElementById("overlayTitle");
    const subEl = document.getElementById("overlaySub");
    const couponEl = document.getElementById("overlayCoupon");

    if (state === "WON") {
      if (overlay) overlay.style.display = "flex";
      if (titleEl) titleEl.innerText = "🏆 YOU WON!";
      if (subEl) subEl.innerText = CFG.rewardText || "Score target reached!";
      if (couponEl) {
        couponEl.style.display = CFG.rewardCoupon ? "block" : "none";
        couponEl.innerHTML = "Coupon Code: <strong>" + CFG.rewardCoupon + "</strong>";
      }
    } else if (state === "GAMEOVER") {
      if (overlay) overlay.style.display = "flex";
      if (titleEl) titleEl.innerText = "GAME OVER";
      if (subEl) subEl.innerText = "Final Score: " + score + ". Try again!";
      if (couponEl) couponEl.style.display = "none";
    } else {
      if (overlay) overlay.style.display = "none";
    }

    requestAnimationFrame(loop);
  }

  const restartBtn = document.getElementById("btnRestart");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      initAudio();
      resetGame();
    });
  }

  requestAnimationFrame(loop);
})();