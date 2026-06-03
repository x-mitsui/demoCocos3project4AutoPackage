import { GRID_SIZE } from "./board.js";
import { forEachCell, getBlockPalette, getShapeAnchor } from "./shapes.js";

const GAP = 1;
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
            y: this.boardY + row * this.cellSize
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
            y: this.trayY + this.trayH / 2
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
        cellSize: layout.cellSize * DRAG_CELL_RATIO
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
        y: centerY - h / 2 - (anchor.row - minR) * cellSize
    };
}

/** 锚点格中心像素坐标（与主项目 getFirstBlockRowCol 语义一致） */
export function getShapeAnchorScreenPos(shape, centerX, centerY, cellSize) {
    const anchor = getShapeAnchor(shape);
    const origin = getShapeOrigin(centerX, centerY, shape, cellSize);
    return {
        x: origin.x + anchor.col * cellSize + cellSize / 2,
        y: origin.y + anchor.row * cellSize + cellSize / 2
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

function fillPoly(ctx, points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fill();
}

/**
 * 主项目 ShaderBlock 平面倒角：外框 + 中心面 + 四边梯形棱面（45° 拼角）
 * borderWidth ≈ 0.02, bevelWidth ≈ 0.13
 */
function drawShaderBlock(ctx, bx, by, bs, palette, alpha = 1) {
    const border = Math.max(1, bs * 0.02);
    const bevel = Math.max(2, bs * 0.13);
    const ix = bx + border;
    const iy = by + border;
    const is = bs - border * 2;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = palette.frame;
    ctx.fillRect(bx, by, bs, bs);

    ctx.fillStyle = palette.center;
    ctx.fillRect(ix + bevel, iy + bevel, is - bevel * 2, is - bevel * 2);

    fillPoly(
        ctx,
        [
            [ix + bevel, iy + is - bevel],
            [ix + is - bevel, iy + is - bevel],
            [ix + is, iy + is],
            [ix, iy + is]
        ],
        palette.bottom
    );

    fillPoly(
        ctx,
        [
            [ix + is - bevel, iy + bevel],
            [ix + is, iy],
            [ix + is, iy + is],
            [ix + is - bevel, iy + is - bevel]
        ],
        palette.right
    );

    fillPoly(
        ctx,
        [
            [ix, iy],
            [ix + bevel, iy + bevel],
            [ix + bevel, iy + is - bevel],
            [ix, iy + is]
        ],
        palette.left
    );

    fillPoly(
        ctx,
        [
            [ix, iy],
            [ix + is, iy],
            [ix + is - bevel, iy + bevel],
            [ix + bevel, iy + bevel]
        ],
        palette.top
    );

    ctx.restore();
}

function drawEmptyCell(ctx, x, y, size, color, alpha) {
    const inset = GAP / 2;
    const bx = x + inset;
    const by = y + inset;
    const bs = size - GAP;
    const r = Math.max(2, bs * 0.12);

    ctx.save();
    ctx.globalAlpha = alpha;
    roundRect(ctx, bx, by, bs, bs, r);
    ctx.fillStyle = color;
    ctx.fill();
    roundRect(ctx, bx + 2, by + 2, bs - 4, bs - 4, r * 0.8);
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function drawCell(ctx, x, y, size, colorIndex, alpha = 1, empty = false) {
    if (empty) {
        drawEmptyCell(ctx, x, y, size, CELL_BG, alpha);
        return;
    }

    const inset = GAP / 2;
    drawShaderBlock(ctx, x + inset, y + inset, size - GAP, getBlockPalette(colorIndex), alpha);
}

function drawShapeAt(ctx, shape, colorIndex, centerX, centerY, cellSize, alpha = 1) {
    const origin = getShapeOrigin(centerX, centerY, shape, cellSize);
    forEachCell(shape, (sr, sc) => {
        drawCell(
            ctx,
            origin.x + sc * cellSize,
            origin.y + sr * cellSize,
            cellSize,
            colorIndex,
            alpha
        );
    });
}

function drawShapeOnBoard(ctx, layout, shape, colorIndex, anchorRow, anchorCol, alpha = 1) {
    const anchor = getShapeAnchor(shape);
    forEachCell(shape, (sr, sc) => {
        const br = anchorRow + (sr - anchor.row);
        const bc = anchorCol + (sc - anchor.col);
        const { x, y } = layout.boardToPixel(br, bc);
        drawCell(ctx, x, y, layout.cellSize, colorIndex, alpha);
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
        drawShapeAt(
            ctx,
            game.draggingPiece.shape,
            game.draggingPiece.colorIndex,
            center.x,
            center.y,
            cellSize
        );
    }

    if (game.preClearUntil > performance.now()) {
        drawPreClear(ctx, layout, game);
    }

    if (game.flashUntil > performance.now()) {
        drawFlash(ctx, layout, game);
    }

    if (game.clearParticles?.length) {
        drawClearParticles(ctx, game);
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
                drawCell(ctx, x, y, cellSize, cell.colorIndex);
            } else {
                drawCell(ctx, x, y, cellSize, 0, 0.55, true);
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
        drawShapeAt(
            ctx,
            piece.shape,
            piece.colorIndex,
            center.x,
            center.y,
            layout.cellSize * TRAY_CELL_RATIO
        );
    }
}

/** 棋盘上吸附的半透明 ghost（主项目 showDragShadow） */
function drawGhost(ctx, layout, game) {
    const { row, col, shape, colorIndex } = game.ghost;
    drawShapeOnBoard(ctx, layout, shape, colorIndex, row, col, 0.38);
}

function drawPreClear(ctx, layout, game) {
    const duration = 140;
    const progress = 1 - (game.preClearUntil - performance.now()) / duration;
    const t = Math.max(0, Math.min(1, progress));
    const alpha = (1 - t) * 0.28;
    const scale = 1 + (1 - t) * 0.03;
    const inset = GAP / 2;

    for (const { row, col } of game.preClearCells) {
        const { x, y } = layout.boardToPixel(row, col);
        const bs = layout.cellSize - GAP;
        const cx = x + inset + bs / 2;
        const cy = y + inset + bs / 2;
        const size = bs * scale;
        const bx = cx - size / 2;
        const by = cy - size / 2;
        const radius = Math.max(3, size * 0.13);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        roundRect(ctx, bx, by, size, size, radius);
        ctx.fill();

        ctx.globalAlpha = alpha * 1.5;
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = Math.max(1, layout.cellSize * 0.02);
        roundRect(ctx, bx + 1, by + 1, size - 2, size - 2, radius * 0.92);
        ctx.stroke();

        ctx.restore();
    }
}

function drawFlash(ctx, layout, game) {
    const duration = 260;
    const progress = 1 - (game.flashUntil - performance.now()) / duration;
    const t = Math.max(0, Math.min(1, progress));
    const fade = 1 - t;
    const alpha = fade * 0.42;
    const scale = 1 + fade * 0.08;
    const inset = GAP / 2;

    for (const { row, col } of game.flashCells) {
        const { x, y } = layout.boardToPixel(row, col);
        const bs = layout.cellSize - GAP;
        const cx = x + inset + bs / 2;
        const cy = y + inset + bs / 2;
        const size = bs * scale;
        const bx = cx - size / 2;
        const by = cy - size / 2;
        const radius = Math.max(3, size * 0.14);

        ctx.save();
        ctx.shadowColor = "rgba(255, 255, 255, 0.45)";
        ctx.shadowBlur = layout.cellSize * 0.15;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        roundRect(ctx, bx, by, size, size, radius);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = Math.max(1, layout.cellSize * 0.02);
        roundRect(ctx, bx + 1, by + 1, size - 2, size - 2, radius * 0.9);
        ctx.stroke();
        ctx.restore();
    }
}

function drawClearParticles(ctx, game) {
    ctx.save();
    for (const p of game.clearParticles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawFloatingScore(ctx, layout, game) {
    ctx.save();
    ctx.font = "bold 22px Segoe UI, sans-serif";
    ctx.fillStyle = "#ffe66d";
    ctx.textAlign = "center";
    ctx.fillText(
        `+${game.lastRoundScore}`,
        layout.boardX + layout.boardSize / 2,
        layout.boardY - 6
    );
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
    const anchorPx = getShapeAnchorScreenPos(
        game.draggingPiece.shape,
        center.x,
        center.y,
        cellSize
    );
    const { row, col } = layout.pixelToBoard(anchorPx.x, anchorPx.y);
    const shape = game.draggingPiece.shape;

    if (!isShapeInsideBoard(row, col, shape)) return null;
    if (!canPlaceGhost(game.board, row, col, shape)) return null;

    return {
        row,
        col,
        valid: true,
        shape,
        colorIndex: game.draggingPiece.colorIndex
    };
}
