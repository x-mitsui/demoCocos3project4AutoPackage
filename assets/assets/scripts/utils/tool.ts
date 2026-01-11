import {
    _decorator,
    Camera,
    UITransform,
    view,
    Node,
    Sprite,
    Texture2D,
    SpriteFrame,
    Color,
    find
} from "cc";
import { getJumpUrl } from "../configs/config";

export const Tool = {
    /**
     * 为节点添加一个纯色的背景
     * @param node 节点
     * @param color 颜色
     * @param size 大小
     * @returns 创建的节点
     */
    addColorBG(node: Node, color: Color, size?: { width: number; height: number }): Node {
        const compSprite = node.addComponent(Sprite);
        const texture = new Texture2D();
        texture.reset({
            width: 1,
            height: 1,
            format: Texture2D.PixelFormat.RGBA8888
        });
        // 填充白色像素数据（后续通过color调整到目标颜色）
        const whitePixel = new Uint8Array([255, 255, 255, 255]);
        texture.uploadData(whitePixel);

        const spriteFrame = new SpriteFrame();
        spriteFrame.texture = texture;
        compSprite.spriteFrame = spriteFrame;
        compSprite.color = color;

        if (size) {
            const compUiTransform = node.getComponent(UITransform);
            if (compUiTransform) {
                compUiTransform.setContentSize(size.width, size.height);
            }
        }

        return node;
    },

    getRealWinSize: () => {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    },

    // 获取 UI 坐标系中“网页可视区域底部”的 Y 坐标（相对于 Canvas）
    getViewportBottomInUI(): number {
        const visibleSize = view.getVisibleSize(); // 当前可见区域尺寸（受适配影响）
        // const canvas = this.node.getComponent(UITransform)?.uiTransfrom; // 如果挂在 Canvas 下
        // 更简单：Canvas 默认锚点居中，高度为 designResolution
        const halfHeight = visibleSize.height / 2;
        return -halfHeight; // 因为原点在中心，底部是负值
    },

    // 获取世界坐标系中“网页可视区域底部”的 Y 坐标
    getViewportBottomInWorld(camera: Camera): number {
        const visibleSize = view.getVisibleSize();
        const halfHeight = visibleSize.height / 2;

        // 假设主摄像机跟随默认设置（正交，居中）
        const cameraPos = camera.node.getWorldPosition();
        return cameraPos.y - halfHeight;
    },

    getMaxMinOffset(shape: number[][]) {
        let minOffsetX = Number.MAX_VALUE;
        let maxOffsetX = -Number.MAX_VALUE;
        let minOffsetY = Number.MAX_VALUE;
        let maxOffsetY = -Number.MAX_VALUE;

        shape.forEach((p) => {
            const [offsetX, offsetY] = p;
            if (offsetX < minOffsetX) minOffsetX = offsetX;
            if (offsetX > maxOffsetX) maxOffsetX = offsetX;
            if (offsetY < minOffsetY) minOffsetY = offsetY;
            if (offsetY > maxOffsetY) maxOffsetY = offsetY;
        });
        return {
            minOffsetX,
            maxOffsetX,
            minOffsetY,
            maxOffsetY
        };
    },

    getCanvasNode() {
        // 从 Canvas 节点开始查找 DragOptionsShadowContainer
        // 先尝试从当前节点向上查找 Canvas
        let canvas = this.node;
        while (canvas && canvas.name !== "Canvas") {
            canvas = canvas.parent;
        }

        // 如果没找到，尝试使用 find 查找
        if (!canvas) {
            canvas = find("Canvas");
        }
        return canvas;
    },

    getRandomTwoIndices(arr: any[]) {
        if (arr.length < 2) throw new Error("Too short");
        const allIndices = Array.from({ length: arr.length }, (_, i) => i);
        // 简单洗牌（Fisher-Yates）
        for (let i = allIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
        }
        return [arr[allIndices[0]], arr[allIndices[1]]];
    }
};

export const jump2DownloadPage = (): void => {
    const jumpUrl = getJumpUrl();
    /// @ts-ignore
    if (typeof window.ExitApi !== "undefined" && window.ExitApi.exit) {
        /// @ts-ignore
        window.ExitApi.exit();
    }
    // @ts-ignore
    if (window.mraid) {
        /// @ts-ignore
        window.mraid.open(jumpUrl);
    } else {
        window.open(jumpUrl, "_blank");
    }
};
