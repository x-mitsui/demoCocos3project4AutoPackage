import { _decorator, Component, find, instantiate, log, Node, Prefab, Vec3 } from "cc";
import { DragOption } from "./DragOption";
import { DragOptionConfig } from "../configs/types";
import { Board } from "../board/Board";
import { GameManager } from "../managers/GameManager";
import { EndPage } from "../misc/EndPage";
import { Tool } from "../utils/tool";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;
/**
 * 拖动选项容器
 * 1. 可配置拖动选项DragOptionPrefab数量，一般3个或4个，暂定3个
 * 2. 每次用完所有选项要刷新，按配置重新创建，如果配置用完就随机
 */
@ccclass("DragOptionsContainer")
export class DragOptionsContainer extends Component {
    @property({ type: Prefab })
    dragOptionPrefab: Prefab = null;

    @property
    dragOptionsCount: number = 3;

    @property({ tooltip: "拖动选项的基础 Y 坐标（相对于容器中心）" })
    baseY: number = -650;

    @property({ type: Node })
    maskNode: Node = null!;

    private _allConfigs: DragOptionConfig[] = [];
    private _curDragOptionConfigIndex: number = 0; // 配置是按顺序依次使用的，这个索引记录一下，如果用完配置，需要其它测量生成选项
    boardNode: Node = null!;
    curOptions: Node[] = [];
    dragOptionsShadowContainerNode: Node = null!; // 阴影容器节点

    init(boardNode: Node) {
        this.boardNode = boardNode;
        this.dragOptionsShadowContainerNode = find("Canvas/DragOptionsShadowContainer");
    }

    onLoad() {
        log("DragOptionsContainer onLoad");
        this.node.on("check-refill", this.checkAndRefill, this);
    }

    onDestroy() {
        this.node.off("check-refill", this.checkAndRefill, this);
    }

    checkAndRefill() {
        if (this.node.children.length === 0) {
            this.generateRound();
        }
    }

    start() {
        this._allConfigs = GameManager.instance.dragOptionsConfig;
        this.generateRound();
    }
    // prettier-ignore
    randomCacheConfigs: DragOptionConfig[] = [
        {
            "blockColorIdx": 0,
            "shape": [
                [0,  0], [1, 0], [2, 0],
                [0,  1]
            ]
        },
        {
            "blockColorIdx": 1,
            "shape": [
                [0, 0],
                [0, 1], [1, 1], [2, 1]  
            ]
        },
        {
            "blockColorIdx": 2,
            "shape": [
                [0, 0],
                [0, 1], [1, 1], [2, 1],
                [0, 2],
            ]
        },
        {
            "blockColorIdx": 3,
            "shape": [
                [0, 0],
                [0, 1], [1, 1],
            ]
        }, {
            "blockColorIdx": 4,
            "shape": [
                [0, 0],
                [0, 1], [1, 1], [2, 1]  
            ]
        }, {
            "blockColorIdx": 4,
            "shape": [
                [0,  0], [1, 0], [2, 0],
                [0,  1]
            ]
        },
    ] as DragOptionConfig[];
    /**
     * 根据当前Board的空隙生成一个DragOption的配置
     * 找到连续的空位置区域，生成一个可以放置的形状配置
     */
    generateConfigByEmptySpace() {
        const CompBoard = this.boardNode.getComponent(Board);
        // log("CompBoard.blockNodes:", CompBoard.blockNodes);

        // 收集所有空位置
        const emptySpaces: { row: number; col: number }[] = [];
        for (let row = 0; row < CompBoard.blockNodes.length; row++) {
            for (let col = 0; col < CompBoard.blockNodes[row].length; col++) {
                if (!CompBoard.blockNodes[row][col]) {
                    emptySpaces.push({ row, col });
                }
            }
        }

        if (emptySpaces.length === 0) {
            // 如果没有空位置，返回一个单点配置
            return {
                blockColorIdx: Math.floor(Math.random() * 5),
                shape: [[0, 0]]
            };
        }

        // 使用 BFS 找到连续的空位置区域
        const visited = new Set<string>();
        const regions: { row: number; col: number }[][] = [];

        for (const empty of emptySpaces) {
            const key = `${empty.row},${empty.col}`;
            if (visited.has(key)) continue;

            // BFS 找到所有相邻的空位置
            const region: { row: number; col: number }[] = [];
            const queue: { row: number; col: number }[] = [empty];
            visited.add(key);

            while (queue.length > 0) {
                const current = queue.shift()!;
                region.push(current);

                // 检查四个方向：上、下、左、右
                const directions = [
                    { row: -1, col: 0 }, // 上
                    { row: 1, col: 0 }, // 下
                    { row: 0, col: -1 }, // 左
                    { row: 0, col: 1 } // 右
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
                        !CompBoard.blockNodes[newRow][newCol]
                    ) {
                        visited.add(newKey);
                        queue.push({ row: newRow, col: newCol });
                    }
                }
            }

            if (region.length > 0) {
                regions.push(region);
            }
        }

        // 选择一个合适的区域（优先选择2-4个方块的区域）
        let selectedRegion: { row: number; col: number }[] = [];

        // 优先选择大小在2-4之间的区域
        const suitableRegions = regions.filter((r) => r.length >= 2 && r.length <= 4);
        if (suitableRegions.length > 0) {
            selectedRegion = suitableRegions[Math.floor(Math.random() * suitableRegions.length)];
        } else {
            // 如果没有合适的，选择最大的区域，但限制在4个方块以内
            const sortedRegions = regions.sort((a, b) => b.length - a.length);
            if (sortedRegions.length > 0) {
                selectedRegion = sortedRegions[0].slice(0, 4);
            } else {
                // 如果还是没有，就选择一个空位置
                selectedRegion = [emptySpaces[0]];
            }
        }

        // 将区域转换为相对于中心点的偏移格式
        // 计算中心点（使用第一个位置作为中心，或者计算实际中心）
        const centerRow = selectedRegion[0].row;
        const centerCol = selectedRegion[0].col;

        // 转换为相对于中心点的偏移
        const shape: [number, number][] = selectedRegion.map((pos) => {
            // offsetX = col - centerCol (列偏移)
            // offsetY = centerRow - row (行偏移，注意Y轴向上为正)
            const offsetX = pos.col - centerCol;
            const offsetY = centerRow - pos.row; // 注意：Y轴向上为正
            return [offsetX, offsetY];
        });

        // 随机选择一个颜色索引（0-4）
        const blockColorIdx = Math.floor(Math.random() * 5);

        // log("生成的配置:", { blockColorIdx, shape, selectedRegion });

        return {
            blockColorIdx,
            shape
        };
    }
    /**
     * 生成新的一轮选项
     */
    generateRound() {
        // log("newemptySpaces:", this.generateConfigByEmptySpace());
        this.node.removeAllChildren();
        // 清除阴影容器中的所有子节点
        if (this.dragOptionsShadowContainerNode) {
            this.dragOptionsShadowContainerNode.removeAllChildren();
        }
        if (this._allConfigs.length === 0) {
            Logger.error("DragOptionsContainer.generateRound", "_allConfigs is empty");
        }
        // 找到此轮所有的DragOption配置
        let curRoundDragOptionConfigs: DragOptionConfig[] = [];
        // 按顺序选择配置
        if (this._curDragOptionConfigIndex < this._allConfigs.length) {
            for (let i = 0; i < this.dragOptionsCount; i++) {
                const config = this._allConfigs[this._curDragOptionConfigIndex];
                curRoundDragOptionConfigs.push(config);
                this._curDragOptionConfigIndex++;
            }
        } else {
            // 随机生成3个，其中两个从池子里找，另外一个根据当前Board的空隙生成，以确保有空隙可以放置
            // 根据数组长度随机生成两个索引
            curRoundDragOptionConfigs.push(...Tool.getRandomTwoIndices(this.randomCacheConfigs));
            const config4Empty = this.generateConfigByEmptySpace();
            curRoundDragOptionConfigs.push(config4Empty as unknown as DragOptionConfig);
            // log("selectedConfigs:", selectedConfigs);
        }

        // 计算布局位置，水平排列
        // 假设每个DragOption间隔 350
        const spacing = 350;
        const startX = -((this.dragOptionsCount - 1) * spacing) / 2;

        curRoundDragOptionConfigs.forEach((config, index) => {
            if (!this.dragOptionPrefab) return;

            const dragOptionNode = instantiate(this.dragOptionPrefab);
            this.curOptions.push(dragOptionNode);
            dragOptionNode.parent = this.node;

            const dragOption = dragOptionNode.getComponent(DragOption);
            if (dragOption) {
                dragOption.config = config;
                const x = startX + index * spacing;
                // 确保传入 Vec3
                dragOption.render(new Vec3(x, this.baseY, 0));
            }
        });
    }

    /**
     * 检查所有选项是否都无法放置，如果都无法放置则显示 mask 节点
     */
    checkAndShowMask() {
        if (!this.maskNode || this.node.children.length === 0) {
            return;
        }
        const CompBoard = this.boardNode.getComponent(Board);
        // 检查每个选项是否可以在网格中的任意位置放置
        let canPlaceAny = false;
        for (const dragOptionNode of this.node.children) {
            // 遍历所有可能的网格位置
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (
                        CompBoard.checkDragOptionCanPlace(
                            row,
                            col,
                            dragOptionNode.getComponent(DragOption).config.shape
                        )
                    ) {
                        canPlaceAny = true;
                        break;
                    }
                }
                if (canPlaceAny) {
                    break;
                }
            }
            if (canPlaceAny) {
                break;
            }
        }

        // 如果所有选项都无法放置，显示 mask 节点
        if (!canPlaceAny) {
            this.maskNode.active = true;
            GameManager.instance.endPage.getComponent(EndPage).playParticle();
        } else {
            this.maskNode.active = false;
        }
    }
}
