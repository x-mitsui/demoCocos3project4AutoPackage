// EventManager.ts
import { EventTarget } from "cc";

// 定义游戏中所有可能的事件类型，便于管理
export enum GameEvent {
    ENCOURAGE = "encourage",
    PRE_CLEAR_ANI = "pre-clear-ani",
    GAME_ELIMINATE_BEFORE_START = "game-eliminate-before-start",
    GAME_ELIMINATE_START = "game-eliminate-start",
    GAME_ELIMINATE = "game-eliminate",
    GAME_ELIMINATE_START_TRUE = "game-eliminate-start-true", // 全部的消除动画开始
    GAME_REVIVE_PAGE_SHOW = "game-revive-page-show",
    GAME_REVIVE = "game-revive",
    GAME_COLOR_CHANGE = "game-color-change",
    GAME_START = "game-start",
    GAME_START_TIP = "game-start-tip",
    GAME_START_COUNT_DOWN = "game-start-count-down",
    GAME_BORAD_FULL_START = "game-board-full-start",
    GAME_ALL_ELIMINATE_START = "game-all-eliminate-start",
    TOUCH_START_FIRST_OPTION = "touch-start-first-option",
    FIRST_OPTION_LANDED = "first-option-landed",
    GAME_WIN = "game-win",
    GAME_SCORE_UPDATE = "game-score-update",
    GAME_BEST_SCORE_UPDATE = "game-best-score-update",
    GAME_HEART_SHOW = "game-heart-show",
    GAME_HEART_HIDE = "game-heart-hide",
    GAME_CLEAR_ANIMATION_START = "game-clear-animation-start",
    /** GameManager.noClearRounds 变化（有消除时为 0，连续空放后为 1、2、3…），payload 为当前值 */
    GAME_NO_CLEAR_ROUNDS_CHANGED = "game-no-clear-rounds-changed",
    /** Combo 连击数 +1（有消除的一手，payload 为当前 combo，0 起） */
    GAME_COMBO_STEP = "game-combo-step",
    GAME_HIGH_ANI_PLAY = "game-high-ani-play",
    GAME_SOUND_TOGGLE = "game-sound-toggle",
    GAME_END = "game-end",
    GAME_COMBO_ANIMATION_END = "game-combo-animation-end",
    GEM_COUNT_CHANGE = "gem-count-change",
    PHOTO_REFRESH = "photo-refresh",
    BTN_REPLAY_CLICK = "btn-replay-click",
}

// 创建全局单例
export const eventManager = new EventTarget();
