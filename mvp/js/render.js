import { GRID_SIZE } from "./board.js";
import { BLOCK_COLORS, forEachCell, getShapeAnchor } from "./shapes.js";

const GAP = 3;
const BOARD_BG = "#0f3460";
const CELL_BG = "#1a4a7a";
const DRAG_LIFT_RATIO = 2.2;
const TRAY_CELL_RATIO = 0.42;
const DRAG_CELL_RATIO = 0.92;

export class Layout {
  constructor(canvas) {
    this.canvas = canvas;
    this.boardX = 0;
    this.boardY = 0;
    this.cellSize = 40;
    this.boardSize = 0;
    this.trayY = 0;
    this.traySlotW = 0;
    this.trayH = 0;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    const w = rect.width;
    const h = rect.height;
    const pad = 16;
    const trayH = Math.min(160, h * 0.28);
    const boardArea = Math.min(w - pad * 2, h - trayH - pad * 2);

    this.cellSize = boardArea / GRID_SIZE;
    this.boardSize = this.cellSize * GRID_SIZE;
    this.boardX = (w - this.boardSize) / 2;
    this.boardY = pad + (h - trayH - pad * 2 - this.boardSize) / 2;
    this.trayY = this.boardY + this.boardSize + pad;
    this.trayH = trayH - pad;
    this.traySlotW = w / 3;
    this.dpr = dpr;
  }

  boardToPixel(row, col) {
    return {
      x: this.boardX + col * this.cellSize,
      y: this.boardY + row * this.cellSize,
    };
  }

  pixelToBoard(x, y) {
    const col = Math.round((x - this.boardX - this.cellSize / 2) / this.cellSize);
    const row = Math.round((y - this.boardY - this.cellSize / 2) / this.cellSize);
    return { row, col };
  }

  traySlotCenter(index) {
    return {
      x: this.traySlotW * index + this.traySlotW / 2,
      y: this.trayY + this.trayH / 2,
    };
  }

  hitTraySlot(x, y) {
    if (y < this.trayY || y > this.trayY + this.trayH) return -1;
    const index = Math.floor(x / this.traySlotW);
    return index >= 0 && index < 3 ? index : -1;
  }
}

export function getDragVisual(layout) {
  return {
    liftOffset: Math.max(72, layout.cellSize * DRAG_LIFT_RATIO),
    cellSize: layout.cellSize * DRAG_CELL_RATIO,
  };
}

export function getDragCenter(game, layout) {
  const { liftOffset } = getDragVisual(layout);
  return { x: game.dragX, y: game.dragY - liftOffset };
}

function getShapeBounds(shape) {
  let minR = Infinity;
  let minC = Infinity;
  let maxR = -Infinity;
  let maxC = -Infinity;
  forEachCell(shape, (r, c) => {
    minR = Math.min(minR, r);
    minC = Math.min(minC, c);
    maxR = Math.max(maxR, r);
    maxC = Math.max(maxC, c);
  });
  return { minR, minC, maxR, maxC };
}

function getShapeOrigin(centerX, centerY, shape, cellSize) {
  const anchor = getShapeAnchor(shape);
  const { minR, minC, maxR, maxC } = getShapeBounds(shape);
  const w = (maxC - minC + 1) * cellSize;
  const h = (maxR - minR + 1) * cellSize;
  return {
    x: centerX - w / 2 - (anchor.col - minC) * cellSize,
    y: centerY - h / 2 - (anchor.row - minR) * cellSize,
  };
}

/** 锚点格中心像素坐标（与主项目 getFirstBlockRowCol 语义一致） */
export function getShapeAnchorScreenPos(shape, centerX, centerY, cellSize) {
  const anchor = getShapeAnchor(shape);
  const origin = getShapeOrigin(centerX, centerY, shape, cellSize);
  return {
    x: origin.x + anchor.col * cellSize + cellSize / 2,
    y: origin.y + anchor.row * cellSize + cellSize / 2,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCell(ctx, x, y, size, color, alpha = 1) {
  const inset = GAP / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRect(ctx, x + inset, y + inset, size - GAP, size - GAP, size * 0.18);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(ctx, x + inset + 2, y + inset + 2, size - GAP - 8, (size - GAP) * 0.35, size * 0.1);
  ctx.fill();
  ctx.restore();
}

function drawShapeAt(ctx, shape, colorIndex, centerX, centerY, cellSize, alpha = 1) {
  const origin = getShapeOrigin(centerX, centerY, shape, cellSize);
  forEachCell(shape, (sr, sc) => {
    drawCell(ctx, origin.x + sc * cellSize, origin.y + sr * cellSize, cellSize, BLOCK_COLORS[colorIndex], alpha);
  });
}

function drawShapeOnBoard(ctx, layout, shape, colorIndex, anchorRow, anchorCol, alpha = 1) {
  const anchor = getShapeAnchor(shape);
  forEachCell(shape, (sr, sc) => {
    const br = anchorRow + (sr - anchor.row);
    const bc = anchorCol + (sc - anchor.col);
    const { x, y } = layout.boardToPixel(br, bc);
    drawCell(ctx, x, y, layout.cellSize, BLOCK_COLORS[colorIndex], alpha);
  });
}

export function drawFrame(ctx, layout, game) {
  const { dpr } = layout;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, layout.canvas.width / dpr, layout.canvas.height / dpr);

  drawBoard(ctx, layout, game);

  if (game.ghost) {
    drawGhost(ctx, layout, game);
  }

  drawTray(ctx, layout, game);

  if (game.draggingPiece) {
    const { cellSize } = getDragVisual(layout);
    const center = getDragCenter(game, layout);
    drawShapeAt(ctx, game.draggingPiece.shape, game.draggingPiece.colorIndex, center.x, center.y, cellSize);
  }

  if (game.flashUntil > performance.now()) {
    drawFlash(ctx, layout, game);
  }

  if (game.lastRoundScore > 0 && game.flashUntil > performance.now()) {
    drawFloatingScore(ctx, layout, game);
  }
}

function drawBoard(ctx, layout, game) {
  const { boardX, boardY, boardSize, cellSize } = layout;
  roundRect(ctx, boardX - 8, boardY - 8, boardSize + 16, boardSize + 16, 12);
  ctx.fillStyle = BOARD_BG;
  ctx.fill();

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const { x, y } = layout.boardToPixel(r, c);
      const cell = game.board[r][c];
      if (cell) {
        drawCell(ctx, x, y, cellSize, BLOCK_COLORS[cell.colorIndex]);
      } else {
        drawCell(ctx, x, y, cellSize, CELL_BG, 0.55);
      }
    }
  }
}

function drawTray(ctx, layout, game) {
  for (let i = 0; i < 3; i++) {
    const piece = game.hand[i];
    if (!piece || piece.used) continue;
    if (game.dragIndex === i) continue;
    const center = layout.traySlotCenter(i);
    drawShapeAt(ctx, piece.shape, piece.colorIndex, center.x, center.y, layout.cellSize * TRAY_CELL_RATIO);
  }
}

/** 棋盘上吸附的半透明 ghost（主项目 showDragShadow） */
function drawGhost(ctx, layout, game) {
  const { row, col, shape, colorIndex } = game.ghost;
  drawShapeOnBoard(ctx, layout, shape, colorIndex, row, col, 0.38);
}

function drawFlash(ctx, layout, game) {
  const t = (game.flashUntil - performance.now()) / 180;
  for (const { row, col } of game.flashCells) {
    const { x, y } = layout.boardToPixel(row, col);
    drawCell(ctx, x, y, layout.cellSize, "#ffffff", 0.35 * t);
  }
}

function drawFloatingScore(ctx, layout, game) {
  ctx.save();
  ctx.font = "bold 22px Segoe UI, sans-serif";
  ctx.fillStyle = "#ffe66d";
  ctx.textAlign = "center";
  ctx.fillText(`+${game.lastRoundScore}`, layout.boardX + layout.boardSize / 2, layout.boardY - 6);
  ctx.restore();
}

function isShapeInsideBoard(anchorRow, anchorCol, shape) {
  const anchor = getShapeAnchor(shape);
  let inside = true;
  forEachCell(shape, (sr, sc) => {
    const br = anchorRow + (sr - anchor.row);
    const bc = anchorCol + (sc - anchor.col);
    if (br < 0 || br >= GRID_SIZE || bc < 0 || bc >= GRID_SIZE) inside = false;
  });
  return inside;
}

function canPlaceGhost(board, anchorRow, anchorCol, shape) {
  const anchor = getShapeAnchor(shape);
  let ok = true;
  forEachCell(shape, (sr, sc) => {
    const br = anchorRow + (sr - anchor.row);
    const bc = anchorCol + (sc - anchor.col);
    if (br < 0 || br >= GRID_SIZE || bc < 0 || bc >= GRID_SIZE || board[br][bc]) ok = false;
  });
  return ok;
}

/** 由抬起方块的锚点格换算棋盘 ghost，与主项目 DragHandler + getFirstBlockRowCol 一致 */
export function computeGhost(layout, game) {
  if (!game.draggingPiece) return null;

  const { cellSize } = getDragVisual(layout);
  const center = getDragCenter(game, layout);
  const anchorPx = getShapeAnchorScreenPos(game.draggingPiece.shape, center.x, center.y, cellSize);
  const { row, col } = layout.pixelToBoard(anchorPx.x, anchorPx.y);
  const shape = game.draggingPiece.shape;

  if (!isShapeInsideBoard(row, col, shape)) return null;
  if (!canPlaceGhost(game.board, row, col, shape)) return null;

  return {
    row,
    col,
    valid: true,
    shape,
    colorIndex: game.draggingPiece.colorIndex,
  };
}
