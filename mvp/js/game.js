import {
    canPlace,
    createEmptyBoard,
    findClears,
    GRID_SIZE,
    hasAnyValidMove,
    placeShape
} from "./board.js";
import { calcRoundScore, nextComboState } from "./scoring.js";
import { randomColorIndex, randomShape } from "./shapes.js";

const BEST_KEY = "blockblast_mvp_best";

export function loadBestScore() {
    return parseInt(localStorage.getItem(BEST_KEY) || "0", 10);
}

export function saveBestScore(score) {
    localStorage.setItem(BEST_KEY, String(score));
}

function createPiece() {
    return {
        shape: randomShape(),
        colorIndex: randomColorIndex(),
        used: false
    };
}

export function createHand() {
    return [createPiece(), createPiece(), createPiece()];
}

export class Game {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = createEmptyBoard();
        this.hand = createHand();
        this.score = 0;
        this.combo = -1;
        this.noClearRounds = 0;
        this.best = loadBestScore();
        this.gameOver = false;
        this.dragIndex = -1;
        this.dragX = 0;
        this.dragY = 0;
        this.ghost = null;
        this.flashCells = [];
        this.flashUntil = 0;
        this.preClearCells = [];
        this.preClearUntil = 0;
        this.pendingClearRows = [];
        this.pendingClearCols = [];
        this.clearParticles = [];
        this.lastRoundScore = 0;
    }

    remainingPieces() {
        return this.hand.filter((p) => !p.used);
    }

    refillHandIfNeeded() {
        if (this.hand.every((p) => p.used)) {
            this.hand = createHand();
        }
    }

    checkGameOver() {
        if (!hasAnyValidMove(this.board, this.hand)) {
            this.gameOver = true;
            if (this.score > this.best) {
                this.best = this.score;
                saveBestScore(this.best);
            }
        }
    }

    startDrag(index, x, y) {
        if (this.gameOver || this.hand[index]?.used) return false;
        this.dragIndex = index;
        this.dragX = x;
        this.dragY = y;
        return true;
    }

    moveDrag(x, y) {
        if (this.dragIndex < 0) return;
        this.dragX = x;
        this.dragY = y;
    }

    setGhost(ghost) {
        this.ghost = ghost;
    }

    endDrag(anchorRow, anchorCol) {
        if (this.dragIndex < 0) return false;

        const piece = this.hand[this.dragIndex];
        this.dragIndex = -1;
        this.ghost = null;

        if (!piece || piece.used) return false;
        if (anchorRow == null || anchorCol == null) return false;
        if (!canPlace(this.board, anchorRow, anchorCol, piece.shape)) return false;

        placeShape(this.board, anchorRow, anchorCol, piece.shape, piece.colorIndex);
        piece.used = true;

        const { rows, cols } = findClears(this.board);
        const clearCount = rows.length + cols.length;

        const comboState = nextComboState(clearCount, this.combo, this.noClearRounds);
        this.combo = comboState.combo;
        this.noClearRounds = comboState.noClearRounds;

        this.lastRoundScore = calcRoundScore(clearCount, this.combo);

        if (clearCount > 0) {
            const clearCells = [];
            for (const r of rows) {
                for (let c = 0; c < GRID_SIZE; c++) clearCells.push({ row: r, col: c });
            }
            for (const c of cols) {
                for (let r = 0; r < GRID_SIZE; r++) {
                    if (!rows.includes(r)) clearCells.push({ row: r, col: c });
                }
            }
            this.preClearCells = clearCells;
            this.preClearUntil = performance.now() + 140;
            this.pendingClearRows = rows;
            this.pendingClearCols = cols;
            this.flashCells = [];
            this.flashUntil = 0;
        }

        this.score += this.lastRoundScore;
        if (this.score > this.best) {
            this.best = this.score;
            saveBestScore(this.best);
        }

        this.refillHandIfNeeded();
        this.checkGameOver();
        return true;
    }

    cancelDrag() {
        this.dragIndex = -1;
        this.ghost = null;
    }

    get draggingPiece() {
        return this.dragIndex >= 0 ? this.hand[this.dragIndex] : null;
    }
}
