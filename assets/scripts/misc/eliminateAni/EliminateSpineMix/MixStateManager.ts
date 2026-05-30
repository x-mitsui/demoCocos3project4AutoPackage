import { _decorator, CCBoolean, CCInteger, Component, Node } from "cc";
import { eventManager, GameEvent } from "../../../managers/EventManager";
import { Logger } from "../../../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("MixStateManager")
export class MixStateManager extends Component {
    private static _instance: MixStateManager = null;
    public static get instance(): MixStateManager {
        return this._instance;
    }
    // @property({type:CCBoolean,tooltip:"是否开启"})

    onLoad() {
        if (MixStateManager._instance) {
            this.node.destroy();
            return;
        }
        MixStateManager._instance = this;
        eventManager.on(GameEvent.GAME_ELIMINATE_BEFORE_START, this.onEliminateBeforeStart, this);
    }

    /** 服务于换皮肤的模式, */
    @property({ type: CCInteger, tooltip: "服务于换皮肤模式" })
    skinCfgCounter: number = 0;

    @property
    tokenCount = 0;
    @property
    tokenLimit = 10;

    /** 刷新token限制 */
    onEliminateBeforeStart(payload: { eliminateCount: number }) {
        this.tokenLimit = payload.eliminateCount;
    }

    addToken(count: number, onLimit: () => void, onDestroy: () => void) {
        this.tokenCount += count;
        Logger.info("MixStateManager:addToken:", "-----", this.tokenCount, this.tokenLimit);
        if (this.tokenCount === this.tokenLimit) {
            this.tokenCount = 0;
            onLimit();
        }

        onDestroy();
    }
}
