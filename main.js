const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const screenWelcome = document.getElementById('screen-welcome');
const screenResult = document.getElementById('screen-result');
const screenLoss = document.getElementById('screen-loss');
const screenPause = document.getElementById('screen-pause');
const hud = document.getElementById('ui-hud');

const inputName = document.getElementById('input-name');
const btnStart = document.getElementById('btn-start');
const btnsRestart = document.querySelectorAll('.btn-restart');
const hudName = document.getElementById('hud-name');
const hudTime = document.getElementById('hud-time');
const hudPower = document.getElementById('hud-power');
const powerFill = document.getElementById('power-fill');
const resName = document.getElementById('res-name');
const resTime = document.getElementById('res-time');
const lossTime = document.getElementById('loss-time');

let gameState = 'welcome';
let playerName = '';
let startTime = 0;
let flightTime = 0;
let lastFrameTime = 0;
let gameSpeed = 3;
let spawnTimer = 0;

let batteryCharge = 50;
let lastBatteryDecreaseTime = 0;

const player = {
  x: 50,
  y: 300,
  width: 40,
  height: 30,
  speed: 5,
  color: '#00d2ff'
};

let walls = [];
let batteries = [];
let particles = [];

const keys = { w: false, s: false };

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  if (screen) {
    screen.classList.remove('hidden');
    screen.classList.add('active');
  }
}

inputName.addEventListener('input', (e) => {
  btnStart.disabled = e.target.value.trim() === '';
});

btnStart.addEventListener('click', () => {
  playerName = inputName.value.trim();
  startGame();
});

btnsRestart.forEach(btn => {
  btn.addEventListener('click', () => {
    startGame();
  });
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW' || e.key === 'w' || e.key === 'ц') keys.w = true;
  if (e.code === 'KeyS' || e.key === 's' || e.key === 'ы') keys.s = true;

  if (e.code === 'Escape') {
    togglePause();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW' || e.key === 'w' || e.key === 'ц') keys.w = false;
  if (e.code === 'KeyS' || e.key === 's' || e.key === 'ы') keys.s = false;
});

function togglePause() {
  if (gameState === 'playing') {
    gameState = 'paused';
    screenPause.classList.remove('hidden');
    screenPause.classList.add('active');
  } else if (gameState === 'paused') {
    gameState = 'playing';
    screenPause.classList.remove('active');
    screenPause.classList.add('hidden');
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

function startGame() {
  gameState = 'playing';
  batteryCharge = 50;
  flightTime = 0;
  startTime = Date.now();
  lastBatteryDecreaseTime = Date.now();
  walls = [];
  batteries = [];
  particles = [];
  player.y = canvas.height / 2;
  spawnTimer = 0;

  hudName.textContent = playerName;
  updateHUD();
  showScreen(null);
  hud.classList.remove('hidden');
  hud.classList.add('active');

  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateHUD() {
  hudTime.textContent = formatTime(flightTime);
  hudPower.textContent = Math.round(batteryCharge);
  powerFill.style.width = Math.max(0, batteryCharge) + '%';

  if (batteryCharge > 50) powerFill.style.background = '#00ff00';
  else if (batteryCharge > 20) powerFill.style.background = 'orange';
  else powerFill.style.background = 'red';
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 1.0,
      color: color
    });
  }
}

function spawnGameObjects() {
  spawnTimer += gameSpeed;

  if (spawnTimer >= 300) {
    spawnTimer = 0;

    const wallWidth = 50;
    const safeGap = 250;
    const maxWallHeight = canvas.height - safeGap;

    const wallHeight = Math.floor(Math.random() * (maxWallHeight - 50)) + 50;
    const isTop = Math.random() > 0.5;

    const wall = {
      x: canvas.width,
      y: isTop ? 0 : canvas.height - wallHeight,
      w: wallWidth,
      h: wallHeight
    };
    walls.push(wall);

    let batteryY;

    if (isTop) {
      batteryY = wallHeight + (canvas.height - wallHeight) / 2;
    } else {
      batteryY = (canvas.height - wallHeight) / 2;
    }

    batteryY -= 15;

    batteries.push({
      x: canvas.width + 150,
      y: batteryY,
      w: 20,
      h: 30,
      taken: false
    });
  }
}

function gameLoop(timestamp) {
  if (gameState !== 'playing') return;

  const now = Date.now();

  flightTime = now - startTime;

  if (now - lastBatteryDecreaseTime >= 1000) {
    batteryCharge -= 1;
    lastBatteryDecreaseTime = now;

    if (batteryCharge <= 0) {
      batteryCharge = 0;
      finishGame('result');
      return;
    }
  }

  if (keys.w) player.y -= player.speed;
  if (keys.s) player.y += player.speed;

  if (player.y < 0) player.y = 0;
  if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

  spawnGameObjects();

  for (let i = walls.length - 1; i >= 0; i--) {
    walls[i].x -= gameSpeed;

    if (checkCollision(player, walls[i])) {
      createExplosion(player.x + player.width / 2, player.y + player.height / 2, 'orange');
      draw();
      setTimeout(() => finishGame('loss'), 100);
      return;
    }

    if (walls[i].x + walls[i].w < 0) {
      walls.splice(i, 1);
    }
  }

  for (let i = batteries.length - 1; i >= 0; i--) {
    batteries[i].x -= gameSpeed;

    if (!batteries[i].taken && checkCollision(player, batteries[i])) {
      batteries[i].taken = true;
      batteryCharge + 5 >= 100 ? batteryCharge = 100 : batteryCharge += 5;
      createExplosion(batteries[i].x, batteries[i].y, '#00ff00');
      batteries.splice(i, 1);
      continue;
    }

    if (batteries[i].x + batteries[i].w < 0) {
      batteries.splice(i, 1);
    }
  }

  draw();
  updateHUD();

  requestAnimationFrame(gameLoop);
}

function checkCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.y + rect1.height > rect2.y
  );
}

function draw() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a1a');
  gradient.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  const offset = -(flightTime / 5) % 50;
  ctx.beginPath();
  for (let x = offset; x < canvas.width; x += 50) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  ctx.stroke();

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.fillStyle = '#eee';
  if (Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.fillRect(player.x - 5, player.y - 5, 20, 5);
    ctx.fillRect(player.x + 25, player.y - 5, 20, 5);
  } else {
    ctx.fillRect(player.x - 5, player.y, 20, 5);
    ctx.fillRect(player.x + 25, player.y, 20, 5);
  }

  ctx.fillStyle = '#8b4513';
  ctx.strokeStyle = '#5a2d0c';
  ctx.lineWidth = 2;
  walls.forEach(w => {
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeRect(w.x, w.y, w.w, w.h);

    ctx.beginPath();
    ctx.moveTo(w.x, w.y + w.h / 2);
    ctx.lineTo(w.x + w.w, w.y + w.h / 2);
    ctx.stroke();
  });

  batteries.forEach(b => {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(b.x + 5, b.y - 4, 10, 4);
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    ctx.fillText('⚡', b.x + 2, b.y + 22);
  });

  particles.forEach((p, index) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();

    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.05;

    if (p.life <= 0) particles.splice(index, 1);
  });
  ctx.globalAlpha = 1.0;
}

function finishGame(reason) {
  gameState = reason;
  hud.classList.remove('active');
  hud.classList.add('hidden');

  const finalTimeString = formatTime(flightTime);

  if (reason === 'result') {
    resName.textContent = playerName;
    resTime.textContent = finalTimeString;
    showScreen(screenResult);
  } else {
    lossTime.textContent = finalTimeString;
    showScreen(screenLoss);
  }
}