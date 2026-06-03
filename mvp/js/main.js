import { applyClears } from "./board.js";
import { Game } from "./game.js";
import { computeGhost, drawFrame, Layout } from "./render.js";

const canvas = document.getElementById("game");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const finalScoreEl = document.getElementById("final-score");

const layout = new Layout(canvas);
const game = new Game();

/** 与主项目 DragHandler 的 comfortCoefficient 类似，拖拽时略增位移 */
const COMFORT = 0.35;
let lastPointer = { x: 0, y: 0 };

function updateHud() {
  scoreEl.textContent = String(game.score);
  bestEl.textContent = String(game.best);
}

function showGameOver() {
  finalScoreEl.textContent = String(game.score);
  overlay.classList.remove("hidden");
}

function hideGameOver() {
  overlay.classList.add("hidden");
}

function restart() {
  game.reset();
  hideGameOver();
  updateHud();
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX ?? e.touches?.[0]?.clientX;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function refreshGhost() {
  game.setGhost(computeGhost(layout, game));
}

function onPointerDown(e) {
  if (game.gameOver) return;
  const { x, y } = pointerPos(e);
  const slot = layout.hitTraySlot(x, y);
  if (slot < 0 || game.hand[slot]?.used) return;
  if (!game.startDrag(slot, x, y)) return;
  lastPointer = { x, y };
  refreshGhost();
  canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
}

function onPointerMove(e) {
  if (game.dragIndex < 0) return;
  const { x, y } = pointerPos(e);
  const dx = x - lastPointer.x;
  const dy = y - lastPointer.y;
  game.moveDrag(game.dragX + dx * (1 + COMFORT), game.dragY + dy * (1 + COMFORT));
  lastPointer = { x, y };
  refreshGhost();
  e.preventDefault();
}

function onPointerUp(e) {
  if (game.dragIndex < 0) return;
  const ghost = game.ghost;
  if (ghost?.valid) {
    game.endDrag(ghost.row, ghost.col);
    updateHud();
    if (game.gameOver) showGameOver();
  } else {
    game.cancelDrag();
  }
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  e.preventDefault();
}

function loop() {
  const now = performance.now();
  if (game.preClearCells.length && now > game.preClearUntil) {
    game.flashCells = game.preClearCells;
    game.preClearCells = [];
    game.flashUntil = now + 260;
    game.preClearUntil = 0;
    game.clearParticles = [];
    for (const cell of game.flashCells) {
      const { x, y } = layout.boardToPixel(cell.row, cell.col);
      const centerX = x + layout.cellSize / 2;
      const centerY = y + layout.cellSize / 2;
      const count = Math.max(4, Math.floor(layout.cellSize / 8));
      for (let i = 0; i < count; i++) {
        game.clearParticles.push({
          x: centerX,
          y: centerY,
          vx: (Math.random() - 0.5) * 3.2,
          vy: (Math.random() - 0.5) * 3.2,
          life: 1,
          size: 1.6 + Math.random() * 1.8
        });
      }
    }
    applyClears(game.board, game.pendingClearRows, game.pendingClearCols);
    game.pendingClearRows = [];
    game.pendingClearCols = [];
  }
  if (game.clearParticles.length) {
    for (const p of game.clearParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life -= 0.05;
    }
    game.clearParticles = game.clearParticles.filter((p) => p.life > 0);
  }
  if (now > game.flashUntil && game.flashCells.length) {
    game.flashCells = [];
    game.lastRoundScore = 0;
  }
  drawFrame(canvas.getContext("2d"), layout, game);
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);

window.addEventListener("resize", () => layout.resize());
document.getElementById("restart").addEventListener("click", restart);
document.getElementById("play-again").addEventListener("click", restart);

updateHud();
requestAnimationFrame(() => layout.resize());
loop();
