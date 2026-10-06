const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

// -----------------------------
// Basic GD-like physics settings
// -----------------------------
const PHYSICS = {
    gravity: 1800,
    jumpVelocity: -620,
    runSpeed: 300,
    playerSize: 34,
    groundY: 450,
    fixedStep: 1 / 120
};

const level = {
    width: 5600,

    // Rectangular solid blocks: x, y, width, height
    solids: [
        {x: 0,    y: 450, w: 900, h: 90},
        {x: 1030, y: 450, w: 800, h: 90},
        {x: 1940, y: 450, w: 1000, h: 90},
        {x: 3060, y: 450, w: 700, h: 90},
        {x: 3900, y: 450, w: 1700, h: 90},

        // Small platforms
        {x: 900,  y: 490, w: 130, h: 50},
        {x: 1830, y: 500, w: 110, h: 40},
        {x: 2940, y: 500, w: 120, h: 40},
        {x: 3760, y: 500, w: 140, h: 40}
    ],

    spikes: [
        {x: 600,  y: 416, size: 34},
        {x: 670,  y: 416, size: 34},
        {x: 1180, y: 416, size: 34},
        {x: 1510, y: 416, size: 34},
        {x: 2130, y: 416, size: 34},
        {x: 2180, y: 416, size: 34},
        {x: 2530, y: 416, size: 34},
        {x: 3280, y: 416, size: 34},
        {x: 3340, y: 416, size: 34},
        {x: 4210, y: 416, size: 34},
        {x: 4580, y: 416, size: 34},
        {x: 4920, y: 416, size: 34}
    ],

    finishX: 5350
};

const player = {
    x: 120,
    y: 400,
    vx: PHYSICS.runSpeed,
    vy: 0,
    grounded: false,
    rotation: 0,
    dead: false,
    won: false
};

let cameraX = 0;
let jumpQueued = false;
let accumulator = 0;
let previousTime = performance.now();

function reset() {
    player.x = 120;
    player.y = 400;
    player.vx = PHYSICS.runSpeed;
    player.vy = 0;
    player.grounded = false;
    player.rotation = 0;
    player.dead = false;
    player.won = false;
    cameraX = 0;
    jumpQueued = false;
}

function queueJump() {
    if (!player.dead && !player.won) jumpQueued = true;
}

window.addEventListener("keydown", e => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        queueJump();
    }
    if (e.code === "KeyR") reset();
});

canvas.addEventListener("pointerdown", queueJump);

function aabb(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

function playerBox() {
    return {
        x: player.x,
        y: player.y,
        w: PHYSICS.playerSize,
        h: PHYSICS.playerSize
    };
}

function die() {
    player.dead = true;
}

function updatePhysics(dt) {
    if (player.dead || player.won) return;

    const oldY = player.y;

    // Horizontal movement
    player.vx = PHYSICS.runSpeed;
    player.x += player.vx * dt;

    // Gravity
    player.vy += PHYSICS.gravity * dt;
    player.y += player.vy * dt;

    // Jump
    if (jumpQueued && player.grounded) {
        player.vy = PHYSICS.jumpVelocity;
        player.grounded = false;
    }
    jumpQueued = false;

    // Solid collision: resolve only the top of blocks for this first engine test.
    player.grounded = false;

    for (const s of level.solids) {
        const box = playerBox();

        if (aabb(box, s)) {
            // Falling onto a surface
            if (player.vy >= 0 && oldY + PHYSICS.playerSize <= s.y + 8) {
                player.y = s.y - PHYSICS.playerSize;
                player.vy = 0;
                player.grounded = true;
            }
            // Hit underside
            else if (player.vy < 0 && oldY >= s.y + s.h - 8) {
                player.y = s.y + s.h;
                player.vy = 0;
            }
        }
    }

    // Falling below the level
    if (player.y > H + 100) die();

    // Spike collision
    const p = playerBox();

    for (const spike of level.spikes) {
        const hit = {
            x: spike.x + 5,
            y: spike.y + 8,
            w: spike.size - 10,
            h: spike.size - 8
        };

        if (aabb(p, hit)) {
            die();
            break;
        }
    }

    // Simple cube rotation while airborne
    if (!player.grounded) {
        player.rotation += dt * 8;
    } else {
        // Snap rotation to the nearest 90 degrees
        player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
    }

    if (player.x >= level.finishX) {
        player.won = true;
    }

    // Camera follows the player
    const targetCamera = player.x - 260;
    cameraX += (targetCamera - cameraX) * Math.min(1, dt * 8);
    cameraX = Math.max(0, Math.min(cameraX, level.width - W));
}

function drawBackground() {
    ctx.fillStyle = "#16203a";
    ctx.fillRect(0, 0, W, H);

    // Background grid
    const grid = 60;
    const offset = -((cameraX * 0.25) % grid);

    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;

    for (let x = offset; x < W; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }

    for (let y = 30; y < H; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
}

function drawSolids() {
    for (const s of level.solids) {
        const x = s.x - cameraX;

        ctx.fillStyle = "#35a7e8";
        ctx.fillRect(x, s.y, s.w, s.h);

        ctx.fillStyle = "#66d4ff";
        ctx.fillRect(x, s.y, s.w, 7);

        ctx.strokeStyle = "#0a527e";
        ctx.strokeRect(x, s.y, s.w, s.h);
    }
}

function drawSpikes() {
    for (const spike of level.spikes) {
        const x = spike.x - cameraX;
        const y = spike.y;
        const s = spike.size;

        ctx.beginPath();
        ctx.moveTo(x, y + s);
        ctx.lineTo(x + s / 2, y);
        ctx.lineTo(x + s, y + s);
        ctx.closePath();

        ctx.fillStyle = "#eee";
        ctx.fill();
        ctx.strokeStyle = "#777";
        ctx.stroke();
    }
}

function drawFinish() {
    const x = level.finishX - cameraX;

    ctx.fillStyle = "#55ff88";
    ctx.fillRect(x, 260, 8, 190);

    ctx.beginPath();
    ctx.moveTo(x + 8, 270);
    ctx.lineTo(x + 100, 300);
    ctx.lineTo(x + 8, 330);
    ctx.closePath();

    ctx.fillStyle = "#55ff88";
    ctx.fill();
}

function drawPlayer() {
    ctx.save();

    const cx = player.x - cameraX + PHYSICS.playerSize / 2;
    const cy = player.y + PHYSICS.playerSize / 2;

    ctx.translate(cx, cy);
    ctx.rotate(player.rotation);

    ctx.fillStyle = player.dead ? "#ff5555" : "#42ff75";
    ctx.fillRect(
        -PHYSICS.playerSize / 2,
        -PHYSICS.playerSize / 2,
        PHYSICS.playerSize,
        PHYSICS.playerSize
    );

    ctx.strokeStyle = "#d9ffe2";
    ctx.lineWidth = 3;
    ctx.strokeRect(
        -PHYSICS.playerSize / 2,
        -PHYSICS.playerSize / 2,
        PHYSICS.playerSize,
        PHYSICS.playerSize
    );

    ctx.fillStyle = "#16203a";
    ctx.fillRect(-9, -8, 6, 6);
    ctx.fillRect(4, -8, 6, 6);

    ctx.restore();
}

function drawHUD() {
    const percent = Math.min(
        100,
        Math.floor((player.x / level.finishX) * 100)
    );

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(15, 15, 190, 52);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`TEST LEVEL`, 28, 38);

    ctx.font = "14px Arial";
    ctx.fillText(`${percent}%`, 28, 57);

    if (player.dead || player.won) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = "center";

        ctx.fillStyle = player.won ? "#55ff88" : "#ff6666";
        ctx.font = "bold 42px Arial";
        ctx.fillText(player.won ? "LEVEL COMPLETE!" : "YOU DIED", W / 2, H / 2 - 20);

        ctx.fillStyle = "#fff";
        ctx.font = "18px Arial";
        ctx.fillText("Press R to restart", W / 2, H / 2 + 25);

        ctx.textAlign = "left";
    }
}

function render() {
    drawBackground();
    drawSolids();
    drawSpikes();
    drawFinish();
    drawPlayer();
    drawHUD();
}

function gameLoop(now) {
    let frameTime = Math.min(0.1, (now - previousTime) / 1000);
    previousTime = now;

    accumulator += frameTime;

    while (accumulator >= PHYSICS.fixedStep) {
        updatePhysics(PHYSICS.fixedStep);
        accumulator -= PHYSICS.fixedStep;
    }

    render();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
