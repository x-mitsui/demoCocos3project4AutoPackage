import { forEachCell, getShapeAnchor } from "./shapes.js";

export const GRID_SIZE = 8;

export function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

/** board[row][col] = { colorIndex } | null */
export function canPlace(board, anchorRow, anchorCol, shape) {
  const anchor = getShapeAnchor(shape);
  let ok = true;
  forEachCell(shape, (sr, sc) => {
    const br = anchorRow + (sr - anchor.row);
    const bc = anchorCol + (sc - anchor.col);
    if (br < 0 || br >= GRID_SIZE || bc < 0 || bc >= GRID_SIZE || board[br][bc]) {
      ok = false;
    }
  });
  return ok;
}

export function placeShape(board, anchorRow, anchorCol, shape, colorIndex) {
  const anchor = getShapeAnchor(shape);
  forEachCell(shape, (sr, sc) => {
    const br = anchorRow + (sr - anchor.row);
    const bc = anchorCol + (sc - anchor.col);
    board[br][bc] = { colorIndex };
  });
}

export function getClearsAfterPlace(board, anchorRow, anchorCol, shape) {
  const simulated = board.map((row) => row.map((cell) => cell));
  placeShape(simulated, anchorRow, anchorCol, shape, 0);
  return findClears(simulated);
}

export function findClears(board) {
  const rows = [];
  const cols = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) rows.push(r);
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!board[r][c]) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }
  return { rows, cols };
}

export function applyClears(board, rows, cols) {
  for (const r of rows) {
    for (let c = 0; c < GRID_SIZE; c++) board[r][c] = null;
  }
  for (const c of cols) {
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!rows.includes(r)) board[r][c] = null;
    }
  }
}

export function canShapeFitAnywhere(board, shape) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlace(board, r, c, shape)) return true;
    }
  }
  return false;
}

export function hasAnyValidMove(board, pieces) {
  return pieces.some((piece) => piece && canShapeFitAnywhere(board, piece.shape));
}
