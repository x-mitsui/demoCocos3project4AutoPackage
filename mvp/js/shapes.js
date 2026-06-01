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

/** 与主项目 skin_1000 ShaderBlock 一致：外框 + 中心 + 四边倒角面色 */
export const BLOCK_PALETTES = [
  {
    frame: "#620707",
    center: "#ce3938",
    top: "#ee7e7f",
    left: "#e04e4d",
    bottom: "#821e25",
    right: "#881e1e",
  },
  {
    frame: "#0a3d42",
    center: "#2db5a9",
    top: "#7adfd8",
    left: "#4ecdc4",
    bottom: "#1a6b64",
    right: "#15857c",
  },
  {
    frame: "#562f00",
    center: "#ebc13a",
    top: "#f8e370",
    left: "#fcd44c",
    bottom: "#b4771b",
    right: "#c4981b",
  },
  {
    frame: "#222d6d",
    center: "#5370e6",
    top: "#8db4ff",
    left: "#5379f2",
    bottom: "#2b3d95",
    right: "#3856cc",
  },
  {
    frame: "#5a1038",
    center: "#fd79a8",
    top: "#ffb3cc",
    left: "#ff8fb8",
    bottom: "#b83d6e",
    right: "#c23568",
  },
  {
    frame: "#053f13",
    center: "#50c449",
    top: "#8ceda1",
    left: "#6ddc78",
    bottom: "#187630",
    right: "#1a8535",
  },
];

export function getBlockPalette(colorIndex) {
  return BLOCK_PALETTES[colorIndex % BLOCK_PALETTES.length];
}

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
