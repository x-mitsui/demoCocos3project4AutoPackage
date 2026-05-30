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
    Label,
    tween,
    v3,
    Vec3,
    UIOpacity,
    dragonBones,
    Graphics,
    Tween,
    sp,
} from "cc";

import super_html_playable from "./super_html_playable";
import { getJumpUrl } from "../configs/config";
import { GradientConfig, SkinsManager } from "../configs/Skins/SkinsManager";
import { Logger } from "./logger";
import { disableSpinePremultipliedAlpha } from "./spineCompat";
import { DEV } from "cc/env";

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
            format: Texture2D.PixelFormat.RGBA8888,
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

    /**
     * 在按钮（或同类 UI）右上角创建红点提示。父节点坐标系原点在中心。
     * @param btnNode 作为红点父节点的按钮节点
     * @param radius 圆点半径，默认 10
     * @returns 红点节点，便于后续隐藏或销毁
     */
    addBadgeDotAtRightTop(btnNode: Node, option?: { radius?: number; offsetX?: number; offsetY?: number }): Node {
        const { radius = 10, offsetX = 0, offsetY = 0 } = option || {};
        const btnSize = btnNode.getComponent(UITransform)?.contentSize;

        const dot = new Node("BadgeDot");
        dot.parent = btnNode;

        const g = dot.addComponent(Graphics);
        g.fillColor = new Color(0xf8, 0x46, 0x46, 0xff);
        g.circle(0, 0, radius);
        g.fill();

        const halfW = btnSize ? btnSize.width / 2 : 40;
        const halfH = btnSize ? btnSize.height / 2 : 40;
        dot.setPosition(halfW + offsetX, halfH + offsetY, 0);

        const ut = dot.getComponent(UITransform) || dot.addComponent(UITransform);
        ut.setContentSize(radius * 2, radius * 2);

        return dot;
    },
    removeBadgeDotAtRightTop(btnNode: Node): void {
        this.stopBadgeDot(btnNode);
        const dot = btnNode.getChildByName("BadgeDot");
        if (dot) {
            dot.destroy();
        }
    },
    // 停止动画
    stopBadgeDot(btnNode: Node): void {
        Tween.stopAllByTarget(btnNode);
        btnNode.setScale(1, 1, 1);
        btnNode.angle = 0;
    },

    /**
     * 俏皮提醒动画：左右摇摆若干次 + 弹跳缩放，间隔 repeatDelaySec 后循环，直到 shouldStop 为 true 或节点失效。
     */
    playBadgeDot(btnNode: Node, shouldStop?: () => boolean, repeatDelaySec = 0): void {
        if (shouldStop?.() || !btnNode?.isValid) return;
        const origin = btnNode.scale.clone();
        const interval = 3;
        const playOnce = () => {
            if (shouldStop?.() || !btnNode?.isValid) return;
            tween(btnNode)
                .to(0.07, { angle: 12 }, { easing: "quadOut" })
                .to(0.07, { angle: -12 }, { easing: "quadInOut" })
                .to(0.07, { angle: 10 }, { easing: "quadInOut" })
                .to(0.07, { angle: -10 }, { easing: "quadInOut" })
                .to(0.07, { angle: 8 }, { easing: "quadInOut" })
                .to(0.07, { angle: 0 }, { easing: "quadIn" })
                .to(0.12, { scale: new Vec3(origin.x * 1.25, origin.y * 1.25, 1) }, { easing: "backOut" })
                .to(0.12, { scale: origin }, { easing: "elasticOut" })
                .delay(interval)
                .call(playOnce)
                .start();
        };
        playOnce();
    },

    getRealWinSize: () => {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
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

    /**
     * 数字增长动画（丝滑版本）
     * @param label Label 组件
     * @param from 起始值
     * @param to 目标值
     * @param duration 动画时长（秒）
     * @param onComplete 完成回调（可选）
     */
    animateNumber(
        label: Label,
        from: number,
        to: number,
        duration: number,
        onUpdate?: (current: number) => void,
        onComplete?: () => void,
    ): void {
        const startTime = performance.now();
        const difference = to - from;

        const updateNumber = (currentTime: number) => {
            const elapsed = (currentTime - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1.0);

            // 使用 easeOutCubic 缓动函数
            const eased = 1 - Math.pow(1 - progress, 3);

            // 使用浮点数计算，只在显示时取整，避免卡顿
            const current = from + difference * eased;
            label.string = Math.round(current).toString();
            if (onUpdate) {
                onUpdate(current);
            }
            if (progress < 1.0) {
                requestAnimationFrame(updateNumber);
            } else {
                // 确保最终值准确
                label.string = to.toString();
                if (onComplete) {
                    onComplete();
                }
            }
        };

        requestAnimationFrame(updateNumber);
    },

    /**
     * 为 Sprite 设置渐变材质属性
     * @param sprite Sprite 组件
     * @param gradientConfig 渐变配置
     * @returns 是否设置成功
     */
    setGradientMaterial(spriteOrLabel: Sprite | Label, gradientConfig: GradientConfig): boolean {
        if (!spriteOrLabel) {
            Logger.warn("[Tool] Sprite 或 Label 组件不存在");
            return false;
        }

        // 对于 Label，需要先获取或创建自定义材质
        let material;
        if (spriteOrLabel instanceof Label) {
            // Label 需要使用 customMaterial 或 sharedMaterial
            material = spriteOrLabel.customMaterial || spriteOrLabel.getMaterial(0);

            // 如果没有自定义材质，需要克隆一个
            if (!material) {
                Logger.warn("[Tool] Label 没有材质");
                return false;
            }

            // 克隆材质以避免影响其他使用相同材质的组件
            const clonedMaterial = new (material.constructor as any)();
            clonedMaterial.copy(material);
            spriteOrLabel.customMaterial = clonedMaterial;
            material = clonedMaterial;
        } else {
            // Sprite 使用 getMaterialInstance
            material = spriteOrLabel.getMaterialInstance(0);
        }

        if (!material) {
            Logger.warn("[Tool] 无法获取材质实例");
            return false;
        }

        // 设置渐变属性
        material.setProperty("startColor", SkinsManager.hexToColor(gradientConfig.gradientStart));
        material.setProperty("endColor", SkinsManager.hexToColor(gradientConfig.gradientEnd));
        material.setProperty("gradientAngle", gradientConfig.angle);
        material.setProperty("gradientIntensity", gradientConfig.intensity);

        return true;
    },

    /**
     * 为节点设置渐变材质属性（自动检测 Sprite 或 Label 组件）
     * @param node 节点
     * @param gradientConfig 渐变配置
     * @returns 是否设置成功
     */
    setNodeGradient(node: Node, gradientConfig: GradientConfig): boolean {
        if (!node) {
            Logger.warn("[Tool] 节点不存在");
            return false;
        }

        // 优先尝试 Sprite 组件
        let sprite = node.getComponent(Sprite);
        if (sprite) {
            return this.setGradientMaterial(sprite, gradientConfig);
        }

        // 尝试 Label 组件
        const label = node.getComponent(Label);
        if (label) {
            return this.setGradientMaterial(label, gradientConfig);
        }

        Logger.warn("[Tool] 节点上没有找到 Sprite 或 Label 组件");
        return false;
    },
    iterateShape(
        shape: number[][],
        callback: (
            offsetRow: number,
            offsetCol: number,
            /** 这个是shape中每个方块的特别指定的blockIndex，而非shape同级的blockIndex */
            specificBlockIndex?: number,
        ) => void,
    ) {
        let isOffsetFirstFind = false;
        let offset2OriginFirst: number[] = [];
        for (let y_origin_offset = 0; y_origin_offset < shape.length; y_origin_offset++) {
            const colBitmaps = shape[y_origin_offset];
            if (!colBitmaps) continue; // 如果为0，则跳过
            for (let x_origin_offset = 0; x_origin_offset < colBitmaps.length; x_origin_offset++) {
                const colBit = colBitmaps[x_origin_offset];
                if (!colBit) continue;
                if (!isOffsetFirstFind) {
                    offset2OriginFirst = [y_origin_offset, x_origin_offset];
                    isOffsetFirstFind = true;
                }
                const offsetRow = y_origin_offset - offset2OriginFirst[0];
                const offsetCol = x_origin_offset - offset2OriginFirst[1];
                callback(offsetRow, offsetCol, colBit);
            }
        }
    },
    get isDev(): boolean {
        return DEV;
    },
    bezierTo(target: Node, duration: number, p1: Vec3, cp: Vec3, p2: Vec3, opts?: any) {
        opts = opts || Object.create(null);
        const twoBezier = (t: number, p1: Vec3, cp: Vec3, p2: Vec3) => {
            const x = (1 - t) * (1 - t) * p1.x + 2 * t * (1 - t) * cp.x + t * t * p2.x;
            const y = (1 - t) * (1 - t) * p1.y + 2 * t * (1 - t) * cp.y + t * t * p2.y;
            return v3(x, y, 0);
        };
        opts.onUpdate = (_arg: Vec3, ratio: number) => {
            target.setPosition(twoBezier(ratio, p1, cp, p2));
        };
        return tween(target).to(duration, {}, opts);
    },
    /**
     * 宝石飞行动画（上勾拳轨迹）
     * @param gemNode   要飞行的宝石节点（已挂在正确父节点下，位置已设置好）
     * @param startPos  起始位置（父节点本地坐标）
     * @param destPos   目标位置（父节点本地坐标）
     * @param col       所在列（0-7），用于判断左右蓄力方向
     * @param seqIdx    错开序号（0-7），控制依次起跳间隔
     * @param onArrive  到达目标时的回调
     */
    flyGemTo(gemNode: Node, startPos: Vec3, destPos: Vec3, col: number, seqIdx: number, onArrive?: () => void) {
        const isLeft = col < 4;
        const xDrift = isLeft ? -90 : 90;
        const windupDelta = v3(xDrift, -200, 0);
        const windupPos = v3(startPos.x + xDrift, startPos.y - 200, 0);
        const c1 = v3(windupPos.x + (isLeft ? -50 : 50), windupPos.y - 40, 0);
        const c2 = v3(destPos.x + (isLeft ? -80 : 80), destPos.y - 250, 0);
        const spinDir = isLeft ? -1 : 1;

        const STAGGER = 0.1; //间隔时间
        const SCALE_DUR = 0.12;

        tween(gemNode)
            .delay(seqIdx * STAGGER)
            .to(SCALE_DUR, { scale: v3(1.2, 1.2, 1) }, { easing: "backOut" })
            .by(0.35, { position: windupDelta, eulerAngles: v3(0, 0, spinDir * -120) }, { easing: "sineOut" })
            .call(() => {
                const uiOpacity = gemNode.getComponent(UIOpacity) || gemNode.addComponent(UIOpacity);
                tween(uiOpacity)
                    // .to(0.04, { scale: v3(0.4, 2.0, 1) }, { easing: "sineIn" })
                    // .to(0.04, { scale: v3(1.8, 0.5, 1) }, { easing: "sineOut" })
                    .to(0.25, { opacity: 0.5 }, { easing: "sineOut" })
                    // .delay(0.12 + 0.04 + 0.04 + 0.05)
                    .call(() => {
                        onArrive?.();
                        gemNode.destroy();
                    })
                    .start();

                Tool.bezierTo3(gemNode, 0.15, windupPos, c1, c2, destPos, {
                    easing: "circIn",
                    onUpdate: (_: any, ratio: number) => {
                        const totalSpin = spinDir * 720;
                        gemNode.setRotationFromEuler(0, 0, totalSpin * ratio * Math.pow(1 - ratio, 0.4));
                        const stretch = 1 + 0.5 * Math.pow(ratio * (1 - ratio) * 4, 0.7);
                        gemNode.setScale(1 / stretch, stretch, 1);
                    },
                }).start();
            })
            .start();
    },
    bezierTo3(target: Node, duration: number, p1: Vec3, cp1: Vec3, cp2: Vec3, p2: Vec3, opts?: any) {
        opts = opts || Object.create(null);
        const threeBezier = (t: number, p1: Vec3, cp1: Vec3, cp2: Vec3, p2: Vec3) => {
            const x =
                (1 - t) * (1 - t) * (1 - t) * p1.x +
                3 * t * (1 - t) * (1 - t) * cp1.x +
                3 * t * t * (1 - t) * cp2.x +
                t * t * t * p2.x;
            const y =
                (1 - t) * (1 - t) * (1 - t) * p1.y +
                3 * t * (1 - t) * (1 - t) * cp1.y +
                3 * t * t * (1 - t) * cp2.y +
                t * t * t * p2.y;
            return v3(x, y, 0);
        };
        opts.onUpdate = (_arg: Vec3, ratio: number) => {
            target.setPosition(threeBezier(ratio, p1, cp1, cp2, p2));
        };
        return tween(target).to(duration, {}, opts);
    },
    setDragonBoneColor(node: Node, color: Color) {
        node.getComponent(dragonBones.ArmatureDisplay).color = color;
    },
    setSpriteColor(node: Node, color: Color) {
        node.getComponent(Sprite).color = color;
    },
    adaptHeight(node: Node) {
        const frameSize = view.getFrameSize();
        const visibleSize = view.getVisibleSize();
        const visibleScale = visibleSize.width / visibleSize.height;
        const frameScale = frameSize.width / frameSize.height;
        const contentSize = node.getComponent(UITransform).contentSize;
        if (visibleScale > frameScale) {
            const scale = ((visibleSize.width / frameSize.width) * frameSize.height) / visibleSize.height;
            Logger.info("Resize:resize2FrameSize1:", "scale:", scale);
            node.scale = v3(scale, scale, 1);
        } else {
            // const scale = ((visibleSize.height / frameSize.height) * frameSize.width) / visibleSize.width;
            // Logger.info("Resize:resize2FrameSize2:", "scale:", scale);
            // node.scale = v3(scale, scale, 1);
        }
    },
};

/** TikTok 渠道包（inject_channel_adapter 里 s_name 一般为 tiktok） */
export const isPlatformTiktok = () => window["super_html_channel"] === "tiktok";

/** Google 渠道包 */
export const isPlatformGoogle = () => window["super_html_channel"] === "google";

export const jump2DownloadPage = (): void => {
    const jumpUrl = getJumpUrl();
    // /// @ts-ignore
    // if (typeof window.ExitApi !== 'undefined' && window.ExitApi.exit) {
    //     /// @ts-ignore
    //     window.ExitApi.exit();
    // }
    // // @ts-ignore
    // if (window.mraid) {

    //     /// @ts-ignore
    //     window.mraid.open(jumpUrl);
    // } else {
    //     window.open(jumpUrl, "_blank");
    // }
    super_html_playable.download(jumpUrl);
};

export const getSkeletonComponent = (node: Node) => {
    if (sp) {
        const sk = node.getComponent(sp.Skeleton);
        disableSpinePremultipliedAlpha(sk);
        return sk;
    }
    return null;
};

export function getRandomTwoIndices(arr: any[]) {
    if (arr.length < 2) throw new Error("Too short");
    const allIndices = Array.from({ length: arr.length }, (_, i) => i);
    // 简单洗牌（Fisher-Yates）
    for (let i = allIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
    }
    return [allIndices[0], allIndices[1]];
}
