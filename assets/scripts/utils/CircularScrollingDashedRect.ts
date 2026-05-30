import { gameLevelConfigs } from "./../configs/gameLevelConfigs/index";
import { _decorator, Component, Graphics, math, Vec2, Node, find, Enum } from "cc";
import { Board } from "../board/Board";
import { BlockSize } from "../configs/config";
import { Logger } from "./logger";
import { eventManager, GameEvent } from "../managers/EventManager";
import { SuperBlock } from "../dragOptions/block/SuperBlock";
import { GameManager } from "../managers/GameManager";
const { ccclass, property } = _decorator;

// 线条样式枚举
enum LineStyle {
    DashedWithGap = 0, // 虚线+空白（默认）
    AlternatingColors = 1, // 双色交替（无空白）
    RainbowColor = 2, // 彩虹变色（无空白，全谱循环）
}

// 路径模式枚举
enum PathMode {
    Rectangle = 0, // 使用 size 属性生成矩形路径
    CustomPath = 1, // 手动指定网格坐标路径点
    AutoGenerate = 2, // 通过 shape 矩阵自动生成轮廓路径
}

@ccclass("StableScrollingDashedRect")
export class StableScrollingDashedRect extends Component {
    graphics: Graphics = null;

    @property({ type: Enum(PathMode), tooltip: "路径模式" })
    pathMode: PathMode = PathMode.Rectangle;

    @property({
        type: math.Size,
        visible() {
            return this.pathMode === PathMode.Rectangle;
        },
        tooltip: "矩形大小（仅矩形模式有效）",
    })
    size: math.Size = new math.Size(500, 500);

    @property({
        type: [Vec2],
        visible() {
            return this.pathMode === PathMode.CustomPath;
        },
        tooltip: "路径点的棋盘坐标 (x=row, y=col)",
    })
    gridPoints: Vec2[] = [
        new Vec2(6.5, -0.5),
        new Vec2(7.5, -0.5),
        new Vec2(7.5, 2.5),
        new Vec2(6.5, 2.5),
        new Vec2(6.5, 1.5),
        new Vec2(5.5, 1.5),
        new Vec2(5.5, 0.5),
        new Vec2(6.5, 0.5),
    ];

    @property({
        type: Vec2,
        visible() {
            return this.pathMode === PathMode.AutoGenerate;
        },
        tooltip: "自动生成模式：shape 内第一个非零方块在棋盘上的坐标 (x=row, y=col)",
    })
    shapeFirstBlockRowCol: Vec2 = new Vec2(6, 0);

    @property({ type: Enum(LineStyle), tooltip: "线条样式" })
    lineStyle: LineStyle = LineStyle.DashedWithGap;

    @property({ tooltip: "顺时针方向滚动（false 为逆时针）" })
    clockwise: boolean = true;

    @property({ tooltip: "虚线段长度" })
    dashLength: number = 30;

    @property({
        tooltip: "虚线间隔（虚线+空白 及 彩虹变色 模式有效）",
        visible() {
            return this.lineStyle === LineStyle.DashedWithGap || this.lineStyle === LineStyle.RainbowColor;
        },
    })
    interval: number = 12;

    @property({ tooltip: "主颜色（十六进制，如 #000000）" })
    primaryColor: string = "#000000";

    @property({
        tooltip: "次颜色（十六进制，仅双色交替模式有效）",
        visible() {
            return this.lineStyle === LineStyle.AlternatingColors;
        },
    })
    secondaryColor: string = "#FFFFFF";

    @property({
        tooltip: "彩虹变色速度（度/秒，仅彩虹模式有效）",
        visible() {
            return this.lineStyle === LineStyle.RainbowColor;
        },
    })
    colorCycleSpeed: number = 120;

    @property({ tooltip: "线宽" })
    lineWidth: number = 10;

    @property({ tooltip: "滚动速度" })
    scrollSpeed: number = 50;

    boardNode: Node = null;

    @property({
        tooltip: "自动生成模式：shape来源于第几个 DragOption 的形状（0-2）",
        visible() {
            return this.pathMode === PathMode.AutoGenerate;
        },
    })
    autoShapeDragOptionIndex: number = 0;
    @property({
        type: [Array],
        visible() {
            return this.pathMode === PathMode.AutoGenerate;
        },
    })
    autoShape: number[][] = [
        [0, 1, 0],
        [1, 1, 1],
    ];
    private _totalLength: number = 0;
    private _globalOffset: number = 0;
    private _isScrolling: boolean = false;
    private _accumulatedTime: number = 0;
    private _redrawInterval: number = 0.033;
    private _frameCounter: number = 0;
    private _lastRenderedOffset: number = -1;
    private _minOffsetChange: number = 0.1;
    private _cachedPaths = null;
    private _isVisible: boolean = false;
    private _colorHue: number = 0; // 彩虹模式全局色相偏移（0-360）

    onLoad() {
        this.boardNode = find("Canvas/Board");
        if (!this.graphics) {
            this.graphics = this.getComponent(Graphics);
        }

        if (!this.graphics) {
            Logger.error("StableScrollingDashedRect:onLoad:", "❌ 未找到 Graphics 组件！");
            return;
        }

        this.precalculatePaths();
        this._totalLength = this.calculateTotalLength();

        Logger.warn(
            "StableScrollingDashedRect:onLoad:",
            `总周长: ${this._totalLength}, 虚线段长度: ${this.dashLength + this.interval}`,
        );

        // 初始时不绘制，等待 GAME_START_TIP 事件
        this.addListeners();

        this.initShapeFirstBlockRowColAndAutoShapeDragOptionIndex();
    }
    initShapeFirstBlockRowColAndAutoShapeDragOptionIndex() {
        const config = gameLevelConfigs[GameManager.instance.gameLevel];
        const { shapeFirstBlockRowCol, autoShapeDragOptionIndex } = config.scrollingDashedConfig;
        this.shapeFirstBlockRowCol.set(shapeFirstBlockRowCol.x, shapeFirstBlockRowCol.y);
        this.autoShapeDragOptionIndex = autoShapeDragOptionIndex;
    }
    onDestroy() {
        eventManager.off(GameEvent.FIRST_OPTION_LANDED, this.onFirstOptionLanded, this);
        eventManager.off(GameEvent.GAME_START_TIP, this.onGameStartTip, this);
    }

    addListeners() {
        eventManager.on(GameEvent.FIRST_OPTION_LANDED, this.onFirstOptionLanded, this);
        eventManager.on(GameEvent.GAME_START_TIP, this.onGameStartTip, this);
    }

    onGameStartTip() {
        // 如果是自动生成模式，从 DragOption 中获取 shape
        if (this.pathMode === PathMode.AutoGenerate) {
            this.extractShapeFromDragOption();
            this.precalculatePaths();
            this._totalLength = this.calculateTotalLength();
        }

        // 事件触发后显示虚线框并开始滚动
        this._isVisible = true;
        this._isScrolling = true;
        this.drawDashedRect();
        Logger.info("StableScrollingDashedRect:onGameStartTip:", "虚线框已显示并开始滚动");
    }

    /**
     * 从指定的 DragOption 中提取 shape 矩阵
     */
    private extractShapeFromDragOption() {
        const dragOptionsContainer = find("Canvas/DragOptionsContainer");
        if (!dragOptionsContainer || dragOptionsContainer.children.length <= this.autoShapeDragOptionIndex) {
            Logger.warn(
                "StableScrollingDashedRect:extractShapeFromDragOption:",
                `找不到 DragOptionsContainer 或子节点索引 ${this.autoShapeDragOptionIndex} 不存在`,
            );
            return;
        }

        const targetDragOption = dragOptionsContainer.children[this.autoShapeDragOptionIndex];

        // 收集所有 SuperBlock
        const blocks: Array<{ node: Node; block: SuperBlock }> = [];
        for (const child of targetDragOption.children) {
            const blockComp = child.getComponent(SuperBlock);
            if (blockComp) {
                blocks.push({ node: child, block: blockComp });
            }
        }

        if (blocks.length === 0) {
            Logger.warn("StableScrollingDashedRect:extractShapeFromDragOption:", "DragOption 中找不到 SuperBlock");
            return;
        }

        // 找到边界范围
        let minRow = Infinity;
        let maxRow = -Infinity;
        let minCol = Infinity;
        let maxCol = -Infinity;

        for (const { block } of blocks) {
            const row = block.offset2FirstBlockRow;
            const col = block.offset2FirstBlockCol;
            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
        }

        // 创建 shape 矩阵
        const rows = maxRow - minRow + 1;
        const cols = maxCol - minCol + 1;
        const shape: number[][] = [];
        for (let i = 0; i < rows; i++) {
            shape.push(new Array(cols).fill(0));
        }

        // 填充 shape
        for (const { block } of blocks) {
            const row = block.offset2FirstBlockRow - minRow;
            const col = block.offset2FirstBlockCol - minCol;
            shape[row][col] = 1;
        }

        this.autoShape = shape;
        Logger.info(
            "StableScrollingDashedRect:extractShapeFromDragOption:",
            `成功从 DragOption[${this.autoShapeDragOptionIndex}] 提取 shape`,
            shape,
        );
    }

    /**
     * 停止滚动，隐藏虚线框
     */
    onFirstOptionLanded() {
        this._isVisible = false;
        this._isScrolling = false;
        // 清除绘制内容
        if (this.graphics) {
            this.graphics.clear();
        }
        this.enabled = false;
        this.node.active = false;
        Logger.info("StableScrollingDashedRect:onFirstOptionLanded:", "虚线框已隐藏");
    }

    update(deltaTime: number) {
        if (!this._isScrolling || !this.graphics || !this._isVisible) return;

        this._accumulatedTime += deltaTime;
        this._frameCounter++;

        // 基于固定帧数控制重绘，避免浮点精度问题
        const targetFrames = Math.max(1, Math.floor(60 * this._redrawInterval));
        if (this._frameCounter < targetFrames) {
            return;
        }

        // 使用累积时间计算偏移量，避免每帧的微小误差
        const deltaOffset = this._accumulatedTime * this.scrollSpeed;
        this._globalOffset += this.clockwise ? -deltaOffset : deltaOffset;

        // 彩虹模式：同步推进全局色相
        if (this.lineStyle === LineStyle.RainbowColor) {
            this._colorHue = (this._colorHue + this._accumulatedTime * this.colorCycleSpeed) % 360;
        }

        // 使用模运算处理循环，确保精确的循环边界
        this._globalOffset = ((this._globalOffset % this._totalLength) + this._totalLength) % this._totalLength;

        // 只有当偏移量变化超过阈值时才重绘，避免微小变化导致的频繁重绘
        const offsetChange = Math.abs(this._globalOffset - this._lastRenderedOffset);
        if (offsetChange >= this._minOffsetChange || this._frameCounter >= targetFrames * 2) {
            this.drawDashedRect();
            this._lastRenderedOffset = this._globalOffset;
        }

        // 重置累积器
        this._accumulatedTime = 0;
        this._frameCounter = 0;
    }
    /**
     * 将单个网格坐标 (row, col) 转换为世界坐标
     */
    private gridToWorld(row: number, col: number): Vec2 {
        const boardComp = this.boardNode?.getComponent(Board);
        const originNode = boardComp?.originNode;
        if (originNode) {
            const worldPos = originNode.getPosition();
            return new Vec2(worldPos.x + col * BlockSize.width, worldPos.y - row * BlockSize.height);
        }
        Logger.warn("StableScrollingDashedRect:gridToWorld:", "⚠️ Board/originNode 未找到，降级使用默认格子大小 60");
        return new Vec2(col * 60, -row * 60);
    }

    /**
     * 获取自定义路径点数组（世界坐标）
     */
    private getCustomPoints(): Vec2[] {
        return this.gridPoints.map((p) => this.gridToWorld(p.x, p.y));
    }

    /**
     * 预计算路径点
     */
    private precalculatePaths() {
        if (this.pathMode === PathMode.CustomPath && this.gridPoints.length >= 2) {
            const customPoints = this.getCustomPoints();
            Logger.warn("CircularScrollingDashedRect", "customPoints", customPoints);
            this._cachedPaths = [];
            for (let i = 0; i < customPoints.length; i++) {
                const start = customPoints[i];
                const end = customPoints[(i + 1) % customPoints.length];
                this._cachedPaths.push({
                    start: new Vec2(start.x, start.y),
                    end: new Vec2(end.x, end.y),
                });
            }
            Logger.warn(
                "StableScrollingDashedRect:precalculatePaths:",
                `✅ 使用自定义路径，共 ${customPoints.length} 个点`,
                "customPoints",
                customPoints,
            );
        } else if (this.pathMode === PathMode.AutoGenerate) {
            const loops = this.generateLoopsFromShape(this.autoShape);
            Logger.info("StableScrollingDashedRect:precalculatePaths:", "autoLoops", loops);
            this._cachedPaths = [];
            let totalVerts = 0;
            for (const loop of loops) {
                if (loop.length < 2) continue;
                const worldPoints = loop.map(([row, col]) => this.gridToWorld(row, col));
                totalVerts += worldPoints.length;
                for (let i = 0; i < worldPoints.length; i++) {
                    const start = worldPoints[i];
                    const end = worldPoints[(i + 1) % worldPoints.length];
                    this._cachedPaths.push({
                        start: new Vec2(start.x, start.y),
                        end: new Vec2(end.x, end.y),
                    });
                }
            }
            if (this._cachedPaths.length > 0) {
                Logger.warn(
                    "StableScrollingDashedRect:precalculatePaths:",
                    `✅ 自动生成路径，${loops.length} 个轮廓环，共 ${totalVerts} 个顶点`,
                );
            } else {
                Logger.error("StableScrollingDashedRect:precalculatePaths:", "❌ 自动生成路径失败，shape 未设置或无效");
            }
        } else {
            const halfWidth = this.size.width / 2;
            const halfHeight = this.size.height / 2;
            this._cachedPaths = [
                { start: new Vec2(-halfWidth, halfHeight), end: new Vec2(halfWidth, halfHeight) },
                { start: new Vec2(halfWidth, halfHeight), end: new Vec2(halfWidth, -halfHeight) },
                { start: new Vec2(halfWidth, -halfHeight), end: new Vec2(-halfWidth, -halfHeight) },
                { start: new Vec2(-halfWidth, -halfHeight), end: new Vec2(-halfWidth, halfHeight) },
            ];
            Logger.warn("StableScrollingDashedRect:precalculatePaths:", `✅ 使用矩形路径`);
        }
    }

    /**
     * 计算路径总长度
     */
    private calculateTotalLength(): number {
        let total = 0;
        for (const path of this._cachedPaths) {
            const dx = path.end.x - path.start.x;
            const dy = path.end.y - path.start.y;
            total += Math.sqrt(dx * dx + dy * dy);
        }
        return total;
    }

    drawDashedRect() {
        const g = this.graphics!;
        g.clear();
        g.lineWidth = this.lineWidth;

        let pathOffset = 0;
        for (const path of this._cachedPaths) {
            if (this.lineStyle === LineStyle.DashedWithGap) {
                this.drawDashedLineWithGap(g, path.start, path.end);
            } else if (this.lineStyle === LineStyle.AlternatingColors) {
                this.drawAlternatingColorLine(g, path.start, path.end);
            } else {
                this.drawRainbowColorLine(g, path.start, path.end, pathOffset);
            }
            const dx = path.end.x - path.start.x;
            const dy = path.end.y - path.start.y;
            pathOffset += Math.sqrt(dx * dx + dy * dy);
        }

        // DashedWithGap 统一 stroke；AlternatingColors 和 RainbowColor 已逐段 stroke
        if (this.lineStyle === LineStyle.DashedWithGap) {
            g.stroke();
        }
    }

    /**
     * 模式1：虚线+空白
     */
    private drawDashedLineWithGap(g: Graphics, start: Vec2, end: Vec2) {
        const direction = new Vec2(end.x - start.x, end.y - start.y);
        const length = direction.length();
        const dirNormalized = direction.normalize();
        const totalSegment = this.dashLength + this.interval;

        // 设置主颜色
        g.strokeColor = math.Color.fromHEX(new math.Color(), this.primaryColor);

        // 简化偏移计算：从负偏移开始，实现平滑进入效果
        const effectiveOffset = this._globalOffset % totalSegment;
        let currentPos = -effectiveOffset;

        while (currentPos < length) {
            // 只绘制可见部分
            if (currentPos + this.dashLength > 0) {
                const dashStart = Math.max(currentPos, 0);
                const dashEnd = Math.min(currentPos + this.dashLength, length);

                if (dashEnd > dashStart) {
                    const startPoint = new Vec2(
                        start.x + dirNormalized.x * dashStart,
                        start.y + dirNormalized.y * dashStart,
                    );
                    const endPoint = new Vec2(start.x + dirNormalized.x * dashEnd, start.y + dirNormalized.y * dashEnd);

                    g.moveTo(startPoint.x, startPoint.y);
                    g.lineTo(endPoint.x, endPoint.y);
                }
            }

            currentPos += totalSegment;
        }
    }

    /**
     * 模式2：双色交替（无空白）
     */
    private drawAlternatingColorLine(g: Graphics, start: Vec2, end: Vec2) {
        const direction = new Vec2(end.x - start.x, end.y - start.y);
        const length = direction.length();
        const dirNormalized = direction.normalize();
        const totalSegment = this.dashLength * 2; // 双色，每段长度

        // 简化偏移计算
        const effectiveOffset = this._globalOffset % totalSegment;
        let currentPos = -effectiveOffset;

        while (currentPos < length) {
            // 计算当前段的索引（决定颜色）
            const segmentIndex = Math.floor((currentPos + effectiveOffset) / this.dashLength);
            const isPrimary = segmentIndex % 2 === 0;

            // 设置颜色
            g.strokeColor = math.Color.fromHEX(new math.Color(), isPrimary ? this.primaryColor : this.secondaryColor);

            // 计算当前段的起止位置
            const dashStart = Math.max(currentPos, 0);
            const dashEnd = Math.min(currentPos + this.dashLength, length);

            if (dashEnd > dashStart) {
                const startPoint = new Vec2(
                    start.x + dirNormalized.x * dashStart,
                    start.y + dirNormalized.y * dashStart,
                );
                const endPoint = new Vec2(start.x + dirNormalized.x * dashEnd, start.y + dirNormalized.y * dashEnd);

                g.moveTo(startPoint.x, startPoint.y);
                g.lineTo(endPoint.x, endPoint.y);
                g.stroke(); // 每个颜色段单独绘制
            }

            currentPos += this.dashLength;
        }
    }

    /**
     * 模式3：彩虹变色虚线
     * 沿整条路径形成彩虹渐变，全局色相随时间偏移，形成流动感
     * 间隔复用 interval 属性
     */
    private drawRainbowColorLine(g: Graphics, start: Vec2, end: Vec2, pathOffset: number) {
        const direction = new Vec2(end.x - start.x, end.y - start.y);
        const length = direction.length();
        const dirNormalized = direction.normalize();
        const totalSegment = this.dashLength + this.interval;

        const effectiveOffset = this._globalOffset % totalSegment;
        let currentPos = -effectiveOffset;

        while (currentPos < length) {
            if (currentPos + this.dashLength > 0) {
                const dashStart = Math.max(currentPos, 0);
                const dashEnd = Math.min(currentPos + this.dashLength, length);

                if (dashEnd > dashStart) {
                    const midPos = (dashStart + dashEnd) / 2 + pathOffset;
                    const hue = (this._colorHue + (midPos / this._totalLength) * 360) % 360;
                    g.strokeColor = this._hslToColor(hue, 1.0, 0.6);

                    const startPoint = new Vec2(
                        start.x + dirNormalized.x * dashStart,
                        start.y + dirNormalized.y * dashStart,
                    );
                    const endPoint = new Vec2(start.x + dirNormalized.x * dashEnd, start.y + dirNormalized.y * dashEnd);
                    g.moveTo(startPoint.x, startPoint.y);
                    g.lineTo(endPoint.x, endPoint.y);
                    g.stroke();
                }
            }
            currentPos += totalSegment;
        }
    }

    /** HSL → math.Color（h: 0-360, s/l: 0-1） */
    private _hslToColor(h: number, s: number, l: number): math.Color {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0,
            g2 = 0,
            b = 0;
        if (h < 60) {
            r = c;
            g2 = x;
            b = 0;
        } else if (h < 120) {
            r = x;
            g2 = c;
            b = 0;
        } else if (h < 180) {
            r = 0;
            g2 = c;
            b = x;
        } else if (h < 240) {
            r = 0;
            g2 = x;
            b = c;
        } else if (h < 300) {
            r = x;
            g2 = 0;
            b = c;
        } else {
            r = c;
            g2 = 0;
            b = x;
        }
        return new math.Color(Math.round((r + m) * 255), Math.round((g2 + m) * 255), Math.round((b + m) * 255), 255);
    }

    // 调试方法：输出当前状态
    debugStatus() {
        Logger.warn("StableScrollingDashedRect:debugStatus:", `当前偏移: ${this._globalOffset.toFixed(3)}`);
        Logger.warn("StableScrollingDashedRect:debugStatus:", `总周长: ${this._totalLength}`);
        Logger.warn("StableScrollingDashedRect:debugStatus:", `帧计数: ${this._frameCounter}`);
    }

    // 控制方法
    startScrolling() {
        this._isScrolling = true;
        Logger.warn("StableScrollingDashedRect:startScrolling:", "▶️ 开始滚动");
    }

    pauseScrolling() {
        this._isScrolling = false;
        Logger.warn("StableScrollingDashedRect:pauseScrolling:", "⏸️ 暂停滚动");
    }

    stopScrolling() {
        this._isScrolling = false;
        this._globalOffset = 0;
        this.drawDashedRect();
        Logger.warn("StableScrollingDashedRect:stopScrolling:", "⏹️ 停止滚动");
    }

    // 动态调整参数
    setSmoothness(level: number) {
        // level: 1-5，1最平滑但性能要求高，5最性能但可能不够平滑
        this._redrawInterval = Math.max(0.016, Math.min(0.1, 0.033 * level));
        this._minOffsetChange = 0.05 * level;
    }

    /**
     * 动态设置自定义路径点（网格坐标）
     * @param gridPoints 网格坐标数组 (x=row, y=col)，至少需要2个点
     */
    setCustomPath(gridPoints: Vec2[]) {
        if (gridPoints.length < 2) {
            Logger.error("StableScrollingDashedRect:setCustomPath:", "❌ 自定义路径至少需要2个点！");
            return;
        }
        this.gridPoints = gridPoints.map((p) => new Vec2(p.x, p.y));
        this.pathMode = PathMode.CustomPath;
        this._refresh(`✅ 已设置自定义路径，共 ${gridPoints.length} 个网格点`);
    }

    // /**
    //  * 自动生成模式：根据 shape 矩阵和首个方块的棋盘位置生成轮廓路径
    //  * @param shape 形状矩阵（0 为空，非 0 为方块）
    //  * @param firstBlockRowCol shape 内第一个非零方块在棋盘上的坐标 (x=row, y=col)
    //  */
    // setAutoGeneratePath() {
    //     const shape = [
    //         [0, 1, 0],
    //         [1, 1, 1],
    //     ];
    //     this.autoShape = shape;
    //     this.pathMode = PathMode.AutoGenerate;
    //     this._refresh(`✅ 已设置自动生成路径`);
    // }

    /**
     * 切换回矩形模式
     */
    useRectangleMode() {
        this.pathMode = PathMode.Rectangle;
        this._refresh(`✅ 已切换到矩形模式`);
    }

    private _refresh(logMsg: string) {
        this.precalculatePaths();
        this._totalLength = this.calculateTotalLength();
        this._globalOffset = 0;
        Logger.warn("StableScrollingDashedRect:", `${logMsg}，总长度: ${this._totalLength.toFixed(2)}`);
        this.drawDashedRect();
    }

    /** 四邻接连通分量（对角相邻不算同一分量） */
    private getOrthogonalComponents(blocks: Set<string>): Set<string>[] {
        const remaining = new Set(blocks);
        const components: Set<string>[] = [];

        while (remaining.size > 0) {
            const start = remaining.values().next().value as string;
            const comp = new Set<string>();
            const queue = [start];
            remaining.delete(start);
            comp.add(start);

            while (queue.length > 0) {
                const key = queue.shift()!;
                const [r, c] = key.split(",").map(Number);
                for (const [nr, nc] of [
                    [r - 1, c],
                    [r + 1, c],
                    [r, c - 1],
                    [r, c + 1],
                ]) {
                    const nk = `${nr},${nc}`;
                    if (!remaining.has(nk)) continue;
                    remaining.delete(nk);
                    comp.add(nk);
                    queue.push(nk);
                }
            }
            components.push(comp);
        }
        return components;
    }

    /** 单格包围矩形（棋盘网格坐标，已加锚点偏移） */
    private singleCellRectLoop(
        row: number,
        col: number,
        anchorR: number,
        anchorC: number,
    ): [number, number][] {
        const r0 = row - 0.5 + anchorR;
        const r1 = row + 0.5 + anchorR;
        const c0 = col - 0.5 + anchorC;
        const c1 = col + 0.5 + anchorC;
        return [
            [r0, c0],
            [r0, c1],
            [r1, c1],
            [r1, c0],
        ];
    }

    /**
     * 从 shape 提取轮廓环（棋盘网格坐标，已加 shapeFirstBlockRowCol 偏移）
     * 单格分量各自一圈矩形；正交连通的多格分量合并外轮廓
     */
    private generateLoopsFromShape(shape: number[][]): [number, number][][] {
        if (!shape || shape.length === 0) return [];

        const blocks = new Set<string>();
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) blocks.add(`${row},${col}`);
            }
        }
        if (blocks.size === 0) return [];

        const anchorR = this.shapeFirstBlockRowCol.x;
        const anchorC = this.shapeFirstBlockRowCol.y;
        const loops: [number, number][][] = [];

        for (const comp of this.getOrthogonalComponents(blocks)) {
            if (comp.size === 1) {
                const [r, c] = comp.values().next().value!.split(",").map(Number);
                loops.push(this.singleCellRectLoop(r, c, anchorR, anchorC));
            } else {
                loops.push(...this.generateMergedOutlineLoops(comp, anchorR, anchorC));
            }
        }

        Logger.info("StableScrollingDashedRect:generateLoopsFromShape", loops);
        return loops;
    }

    /** 正交连通多格：边界边合并后 CCW 成环 */
    private generateMergedOutlineLoops(
        blocks: Set<string>,
        anchorR: number,
        anchorC: number,
    ): [number, number][][] {
        const hasBlock = (row: number, col: number) => blocks.has(`${row},${col}`);

        const edgeKey = (r1: number, c1: number, r2: number, c2: number) => {
            if (r1 < r2 || (r1 === r2 && c1 <= c2)) return `${r1},${c1},${r2},${c2}`;
            return `${r2},${c2},${r1},${c1}`;
        };

        const boundaryEdges = new Map<string, [number, number, number, number]>();
        const toggleEdge = (r1: number, c1: number, r2: number, c2: number) => {
            const key = edgeKey(r1, c1, r2, c2);
            if (boundaryEdges.has(key)) boundaryEdges.delete(key);
            else boundaryEdges.set(key, [r1, c1, r2, c2]);
        };

        for (const blockKey of blocks) {
            const [r, c] = blockKey.split(",").map(Number);
            if (!hasBlock(r - 1, c)) toggleEdge(r - 0.5, c - 0.5, r - 0.5, c + 0.5);
            if (!hasBlock(r, c + 1)) toggleEdge(r - 0.5, c + 0.5, r + 0.5, c + 0.5);
            if (!hasBlock(r + 1, c)) toggleEdge(r + 0.5, c + 0.5, r + 0.5, c - 0.5);
            if (!hasBlock(r, c - 1)) toggleEdge(r + 0.5, c - 0.5, r - 0.5, c - 0.5);
        }

        if (boundaryEdges.size === 0) return [];

        const vtxKey = (r: number, c: number) => `${r},${c}`;
        const adj = new Map<string, Array<[number, number]>>();
        for (const [r1, c1, r2, c2] of boundaryEdges.values()) {
            const k1 = vtxKey(r1, c1);
            const k2 = vtxKey(r2, c2);
            if (!adj.has(k1)) adj.set(k1, []);
            if (!adj.has(k2)) adj.set(k2, []);
            adj.get(k1)!.push([r2, c2]);
            adj.get(k2)!.push([r1, c1]);
        }

        const usedEdges = new Set<string>();
        const loops: [number, number][][] = [];

        const pickNextCCW = (
            fromR: number,
            fromC: number,
            curR: number,
            curC: number,
            candidates: Array<[number, number]>,
        ): [number, number] | null => {
            const dr = curR - fromR;
            const dc = curC - fromC;
            let best: [number, number] | null = null;
            let bestCross = -Infinity;
            for (const [nr, nc] of candidates) {
                if (nr === fromR && nc === fromC) continue;
                const er = nr - curR;
                const ec = nc - curC;
                const cross = dc * er - dr * ec;
                if (cross > bestCross) {
                    bestCross = cross;
                    best = [nr, nc];
                }
            }
            return best;
        };

        while (usedEdges.size < boundaryEdges.size) {
            let startR = Infinity;
            let startC = Infinity;
            let startEdge: [number, number, number, number] | null = null;

            for (const edge of boundaryEdges.values()) {
                const key = edgeKey(edge[0], edge[1], edge[2], edge[3]);
                if (usedEdges.has(key)) continue;
                for (const [r, c] of [
                    [edge[0], edge[1]],
                    [edge[2], edge[3]],
                ] as [number, number][]) {
                    if (r < startR || (r === startR && c < startC)) {
                        startR = r;
                        startC = c;
                        startEdge = edge;
                    }
                }
            }

            if (!startEdge) break;

            let fromR: number;
            let fromC: number;
            let curR: number;
            let curC: number;

            if (startEdge[0] === startR && startEdge[1] === startC) {
                fromR = startEdge[0];
                fromC = startEdge[1];
                curR = startEdge[2];
                curC = startEdge[3];
            } else {
                fromR = startEdge[2];
                fromC = startEdge[3];
                curR = startEdge[0];
                curC = startEdge[1];
            }

            const loop: [number, number][] = [];
            const loopStartR = fromR;
            const loopStartC = fromC;

            for (let guard = 0; guard <= boundaryEdges.size + 2; guard++) {
                loop.push([fromR + anchorR, fromC + anchorC]);

                const ek = edgeKey(fromR, fromC, curR, curC);
                if (usedEdges.has(ek)) break;
                usedEdges.add(ek);

                if (guard > 0 && curR === loopStartR && curC === loopStartC) break;

                const neighbors = adj.get(vtxKey(curR, curC)) ?? [];
                const candidates: Array<[number, number]> = [];
                for (const [nr, nc] of neighbors) {
                    const nk = edgeKey(curR, curC, nr, nc);
                    if (!usedEdges.has(nk)) candidates.push([nr, nc]);
                }

                const next = pickNextCCW(fromR, fromC, curR, curC, candidates);
                if (!next) break;

                fromR = curR;
                fromC = curC;
                [curR, curC] = next;
            }

            if (loop.length >= 3) loops.push(loop);
        }

        return loops;
    }
}
