import { Node } from "cc";
import { Answer } from "../../configs/config";
import { Logger } from "../../utils/logger";

export type BoardCalcResult = {
    allShapes: number[][][];
    allRegions: { row: number; col: number }[][];
};

/**
 * 算法接口：所有难度的算法模块都需要实现此函数签名
 * @param blockNodes  棋盘节点数组（null/undefined 表示空位）
 * @param specifiedShapesCache 可用的形状池
 */
export type BoardCalcFn = (blockNodes: Node[][], specifiedShapesCache: Answer[]) => BoardCalcResult;

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

/**
 * 比较两个形状矩阵是否一模一样，即完美匹配
 */
export function areShapesEqual(shape1: number[][], shape2: number[][]): boolean {
    if (shape1.length !== shape2.length) return false;
    for (let i = 0; i < shape1.length; i++) {
        if (shape1[i].length !== shape2[i].length) return false;
        for (let j = 0; j < shape1[i].length; j++) {
            if (shape1[i][j] !== shape2[i][j]) return false;
        }
    }
    return true;
}

/**
 * 检查形状是否可以放置在棋盘的任意位置
 */
export function canShapeBePlaced(shape: number[][], blockNodes: Node[][]): boolean {
    for (let startRow = 0; startRow < 8; startRow++) {
        for (let startCol = 0; startCol < 8; startCol++) {
            let canPlace = true;
            for (let shapeRow = 0; shapeRow < shape.length; shapeRow++) {
                for (let shapeCol = 0; shapeCol < shape[shapeRow].length; shapeCol++) {
                    if (shape[shapeRow][shapeCol] !== 0) {
                        const boardRow = startRow + shapeRow;
                        const boardCol = startCol + shapeCol;
                        if (boardRow >= 8 || boardCol >= 8) {
                            canPlace = false;
                            break;
                        }
                        if (blockNodes[boardRow]?.[boardCol]) {
                            canPlace = false;
                            break;
                        }
                    }
                }
                if (!canPlace) break;
            }
            if (canPlace) return true;
        }
    }
    return false;
}

/**
 * 将区域坐标转换为归一化的二维矩阵（左上角对齐）
 */
export function convertRegionToMatrix(region: { row: number; col: number }[]): number[][] {
    if (region.length === 0) return [[1]];
    const minRow = Math.min(...region.map((p) => p.row));
    const maxRow = Math.max(...region.map((p) => p.row));
    const minCol = Math.min(...region.map((p) => p.col));
    const maxCol = Math.max(...region.map((p) => p.col));
    const matrix: number[][] = Array.from({ length: maxRow - minRow + 1 }, () => Array(maxCol - minCol + 1).fill(0));
    for (const pos of region) {
        matrix[pos.row - minRow][pos.col - minCol] = 1;
    }
    return matrix;
}

function normalizeShapeToBinaryMatrix(shape: number[][]): number[][] {
    const cells: { row: number; col: number }[] = [];
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col] !== 0) cells.push({ row, col });
        }
    }
    return convertRegionToMatrix(cells);
}

function collectRowGapCells(blockNodes: Node[][], maxGapLength: number): Set<string> {
    const out = new Set<string>();
    for (let row = 0; row < 8; row++) {
        let col = 0;
        while (col < 8) {
            if (blockNodes[row][col]) {
                col++;
                continue;
            }
            const start = col;
            while (col < 8 && !blockNodes[row][col]) col++;
            const len = col - start;
            if (len <= maxGapLength) {
                for (let c = start; c < col; c++) out.add(`${row},${c}`);
            }
        }
    }
    return out;
}

function collectColGapCells(blockNodes: Node[][], maxGapLength: number): Set<string> {
    const out = new Set<string>();
    for (let col = 0; col < 8; col++) {
        let row = 0;
        while (row < 8) {
            if (blockNodes[row][col]) {
                row++;
                continue;
            }
            const start = row;
            while (row < 8 && !blockNodes[row][col]) row++;
            const len = row - start;
            if (len <= maxGapLength) {
                for (let r = start; r < row; r++) out.add(`${r},${col}`);
            }
        }
    }
    return out;
}

function collectConnectedRegionsFromCells(cells: string[]): { row: number; col: number }[][] {
    const inCells: boolean[][] = Array.from({ length: 8 }, () => Array(8).fill(false));
    const visited: boolean[][] = Array.from({ length: 8 }, () => Array(8).fill(false));
    const seeds: Array<{ row: number; col: number }> = [];
    // console.log("collectConnectedRegionsFromCells:", "cells:", cells);
    for (const key of cells) {
        // console.log("collectConnectedRegionsFromCells:", "key:", key);
        const [row, col] = key.split(",").map(Number);
        if (row < 0 || row >= 8 || col < 0 || col >= 8) continue;
        if (inCells[row][col]) continue;
        inCells[row][col] = true;
        seeds.push({ row, col });
    }
    const regions: { row: number; col: number }[][] = [];
    for (const seed of seeds) {
        if (visited[seed.row][seed.col]) continue;
        const queue: Array<{ row: number; col: number }> = [{ row: seed.row, col: seed.col }];
        const region: { row: number; col: number }[] = [];
        visited[seed.row][seed.col] = true;
        while (queue.length > 0) {
            const cur = queue.shift()!;
            region.push(cur);
            const dirs = [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
            ];
            for (const [dr, dc] of dirs) {
                const nr = cur.row + dr;
                const nc = cur.col + dc;
                if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
                if (!inCells[nr][nc] || visited[nr][nc]) continue;
                visited[nr][nc] = true;
                queue.push({ row: nr, col: nc });
            }
        }
        regions.push(region);
    }
    return regions;
}

// ─────────────────────────────────────────────
// C1 算法：提取棋盘上所有连续空隙区域（BFS）
// ─────────────────────────────────────────────

/**
 * C1 算法实现
 * 用 BFS 找出棋盘上所有连续的空隙区域（≤9格），返回形状矩阵和原始坐标。
 */
export const calcShapesC1: BoardCalcFn = (blockNodes: Node[][], specifiedShapesCache: Answer[]): BoardCalcResult => {
    const allShapes: number[][][] = [];
    const allRegions: { row: number; col: number }[][] = [];
    const visited = new Set<string>();

    // 收集所有空位置
    const emptySpaces: { row: number; col: number }[] = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (!blockNodes[row][col]) {
                emptySpaces.push({ row, col });
            }
        }
    }
    Logger.info("calcShapesC1:", "emptySpaces:", JSON.stringify(emptySpaces));

    // BFS 找到所有连续的空位置区域
    for (const empty of emptySpaces) {
        const key = `${empty.row},${empty.col}`;
        if (visited.has(key)) continue;

        const region: { row: number; col: number }[] = [];
        const queue: { row: number; col: number }[] = [empty];
        visited.add(key);

        while (queue.length > 0) {
            const current = queue.shift()!;
            region.push(current);

            const directions = [
                { row: -1, col: 0 },
                { row: 1, col: 0 },
                { row: 0, col: -1 },
                { row: 0, col: 1 },
            ];

            for (const dir of directions) {
                const newRow = current.row + dir.row;
                const newCol = current.col + dir.col;
                const newKey = `${newRow},${newCol}`;
                if (
                    newRow >= 0 &&
                    newRow < 8 &&
                    newCol >= 0 &&
                    newCol < 8 &&
                    !visited.has(newKey) &&
                    !blockNodes[newRow][newCol]
                ) {
                    visited.add(newKey);
                    queue.push({ row: newRow, col: newCol });
                }
            }
        }

        if (region.length > 0) {
            if (region.length <= 9) {
                allShapes.push(convertRegionToMatrix(region));
                allRegions.push(region);
            } else {
                Logger.info("calcShapesC1:", `发现大区域（${region.length}格），跳过`);
            }
        }
    }

    Logger.info("calcShapesC1:", "BFS完成:", { allRegions: JSON.stringify(allRegions) });

    return { allShapes, allRegions };
};

export const calcShapesC2: BoardCalcFn = (blockNodes: Node[][], specifiedShapesCache: Answer[]): BoardCalcResult => {
    const maxGapLength = 3;

    // 1) 分别提取行空隙与列空隙（长度 > 4 的段直接忽略）
    const rowGapCells = collectRowGapCells(blockNodes, maxGapLength);
    const colGapCells = collectColGapCells(blockNodes, maxGapLength);

    // 2) 将两类空隙做并集，再做连通区域聚合
    const mergedGapCellKeys = Array.from(rowGapCells).concat(Array.from(colGapCells));
    const regions = collectConnectedRegionsFromCells(mergedGapCellKeys);

    // 3) 将指定形状池归一化成可匹配集合（只看非零格布局）
    const normalizedCacheShapes = specifiedShapesCache.reduce((acc: number[][][], answer) => {
        const shapes = answer.shapes || [];
        for (const shape of shapes) {
            acc.push(normalizeShapeToBinaryMatrix(shape));
        }
        return acc;
    }, []);

    // 4) 仅保留与 cache 中某个形状完全一致的区域
    const allShapes: number[][][] = [];
    const allRegions: { row: number; col: number }[][] = [];
    for (const region of regions) {
        if (region.length === 0 || region.length > 9) continue;
        const matrix = convertRegionToMatrix(region);
        const isMatched = normalizedCacheShapes.some((cacheShape) => areShapesEqual(cacheShape, matrix));
        if (!isMatched) continue;
        allRegions.push(region);
        allShapes.push(matrix);
    }

    Logger.info(
        "calcShapesC2:",
        "row/col gap merge matched:",
        JSON.stringify({
            rowGapCells: rowGapCells.size,
            colGapCells: colGapCells.size,
            mergedGapCells: regions.reduce((acc, region) => acc + region.length, 0),
            regions: regions.length,
            matchedRegions: allRegions.length,
            matchedRegionCells: allRegions,
            matchedShapes: allShapes,
        }),
    );

    return { allShapes, allRegions };
};
