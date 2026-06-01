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
  if (performance.now() > game.flashUntil && game.flashCells.length) {
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
