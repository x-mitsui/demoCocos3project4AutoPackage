/** 标准方块形状池（与主项目 SpecifiedShapesCache 对齐的子集） */
export const SHAPE_POOL = [
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  [[1, 1], [1, 1], [1, 1]],
  [[1, 1, 1], [1, 1, 1]],
  [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
  [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1], [0, 1], [0, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[1, 1], [1, 0], [1, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0], [1, 1], [1, 0]],
  [[1, 1, 1], [0, 1, 0]],
  [[0, 1], [1, 1], [0, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1], [1, 1], [1, 0]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 0], [1, 1], [0, 1]],
  [[0, 1], [1, 1]],
  [[1, 0], [1, 1]],
  [[1, 1], [1, 0]],
  [[1, 1], [0, 1]],
  [[1], [1], [1], [1]],
  [[1, 1, 1, 1]],
  [[1], [1], [1]],
  [[1, 1, 1]],
  [[1], [1]],
  [[1, 1]],
  [[1]],
];

export const BLOCK_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#ffe66d",
  "#6c5ce7",
  "#fd79a8",
  "#00b894",
];

export function randomShape() {
  const shape = SHAPE_POOL[Math.floor(Math.random() * SHAPE_POOL.length)];
  return shape.map((row) => [...row]);
}

export function randomColorIndex() {
  return Math.floor(Math.random() * BLOCK_COLORS.length);
}

/** 形状锚点：第一个非空格（与主项目 first block 语义一致） */
export function getShapeAnchor(shape) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 0) return { row: r, col: c };
    }
  }
  return { row: 0, col: 0 };
}

export function forEachCell(shape, fn) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 0) fn(r, c);
    }
  }
}

export function cloneShape(shape) {
  return shape.map((row) => [...row]);
}
