import { Color, Node, NodePool, Prefab, Sprite, Tween, UIOpacity, instantiate } from "cc";
import { Logger } from "../utils/logger";
import { prepareBlockForPool } from "../utils/prepareBlockForPool";

interface PoolEntry {
    pool: NodePool;
    prefab: Prefab;
}

export class ObjectPoolManager {
    private static _instance: ObjectPoolManager;
    public static get instance(): ObjectPoolManager {
        if (!this._instance) {
            this._instance = new ObjectPoolManager();
        }
        return this._instance;
    }
    private constructor() {}

    private _poolDict: Map<string, PoolEntry> = new Map();

    /**
     * 初始化一个对象池
     * @param objPoolKey 唯一标识符
     * @param prefab     对应预制体（同时保存，扩容时使用）
     * @param size       初始容量
     */
    public initPool(objPoolKey: string, prefab: Prefab, size: number = 5): void {
        if (this._poolDict.has(objPoolKey)) return;

        const pool = new NodePool();
        this._poolDict.set(objPoolKey, { pool, prefab });

        for (let i = 0; i < size; ++i) {
            pool.put(instantiate(prefab));
        }
        Logger.info(`对象池 "${objPoolKey}" 初始化完成，初始大小: ${size}`);
    }

    /**
     * 从对象池取出一个节点。
     * 池空时自动用保存的 prefab 扩容，节点初始化由调用方负责。
     * @param objPoolKey 唯一标识符
     */
    public get(objPoolKey: string): Node | null {
        const entry = this._poolDict.get(objPoolKey);
        if (!entry) {
            Logger.error(`对象池 "${objPoolKey}" 未初始化！`);
            return null;
        }

        const node = entry.pool.size() > 0 ? entry.pool.get() : instantiate(entry.prefab); // 池空则按需扩容，put 回来时自动归池

        if (entry.pool.size() === 0) {
            Logger.info(`对象池 "${objPoolKey}" 已空，创建新实例。`);
        }

        node.active = true;
        const uiOpacity = node.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = 255;
        }
        const compSprite = node.getComponent(Sprite);
        if (compSprite) {
            compSprite.color = new Color(255, 255, 255, 255);
        }
        Logger.info(`节点已从对象池取出: key=${objPoolKey}, name=${node.name}, 剩余=${entry.pool.size()}`);
        return node;
    }

    /**
     * 将节点回收到对象池
     * @param objPoolKey 唯一标识符
     * @param node       要回收的节点
     */
    public put(objPoolKey: string, node: Node): void {
        const entry = this._poolDict.get(objPoolKey);
        if (!entry) {
            Logger.error(`尝试回收节点到不存在的对象池: ${objPoolKey}，节点将被销毁`);
            node.destroy();
            return;
        }

        if (objPoolKey === "Block") {
            prepareBlockForPool(node);
        }

        node.active = false;
        node.removeFromParent();
        Tween.stopAllByTarget(node);

        entry.pool.put(node);
        Logger.info(`节点已回收到对象池: key=${objPoolKey}, name=${node.name}, 当前大小=${entry.pool.size()}`);
    }

    /**
     * 获取指定对象池当前空闲节点数量；不传 key 则返回所有池的空闲总数
     */
    public getPoolSize(objPoolKey?: string): number {
        if (objPoolKey !== undefined) {
            return this._poolDict.get(objPoolKey)?.pool.size() ?? 0;
        }
        let total = 0;
        for (const { pool } of this._poolDict.values()) {
            total += pool.size();
        }
        return total;
    }

    /**
     * 清空指定对象池
     */
    public clear(objPoolKey: string): void {
        const entry = this._poolDict.get(objPoolKey);
        if (entry) {
            entry.pool.clear();
            this._poolDict.delete(objPoolKey);
            Logger.info(`已清空对象池: ${objPoolKey}`);
        }
    }

    /**
     * 清空所有对象池（通常在切换场景时调用）
     */
    public clearAll(): void {
        for (const { pool } of this._poolDict.values()) {
            pool.clear();
        }
        this._poolDict.clear();
        Logger.info("已清空所有对象池。");
    }
}
