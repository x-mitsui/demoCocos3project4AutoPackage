import { _decorator, Component, Label } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { isPlatformTiktok } from "../utils/tool";
const { ccclass, property } = _decorator;

@ccclass("BestScoreBrush")
export class BestScoreBrush extends Component {
    private _scoreLabel: Label = null;
    onLoad() {
        if (isPlatformTiktok()) {
            this.node.y -= 35;
        }
        this._scoreLabel = this.node.getChildByName("Score").getComponent(Label);
        eventManager.on(GameEvent.GAME_BEST_SCORE_UPDATE, this.setBestScore, this);
    }

    onDestroy() {
        eventManager.off(GameEvent.GAME_BEST_SCORE_UPDATE, this.setBestScore, this);
    }
    setBestScore(score: number) {
        this._scoreLabel.string = score.toString();
    }
}
