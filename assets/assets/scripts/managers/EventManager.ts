// EventManager.ts
import { EventTarget } from "cc";

// 定义游戏中所有可能的事件类型，便于管理
export enum GameEvent {
    FIRST_OPTION_LANDED = "first-option-landed"
}

// 创建全局单例
export const eventManager = new EventTarget();
