import { _decorator, Component, Label, Node } from "cc";
import { eventManager, GameEvent } from "../managers/EventManager";
import { SkinsManager } from "../configs/Skins/SkinsManager";
import { Tool } from "../utils/tool";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("BestScore")
export class BestScore extends Component {
    private _crown: Node = null;
    private _crownScore: Node = null;
    onLoad() {
        this._crown = this.node.getChildByName("Crown");
        this._crownScore = this.node.getChildByName("CrownScore");
        this.initColors();
        eventManager.on(GameEvent.GAME_BEST_SCORE_UPDATE, this.setBestScore, this);
    }
    initColors() {
        const skinsManager = SkinsManager.getInstance();
        const crownColor = skinsManager.getCrownColor();
        const crownScoreColor = skinsManager.getCrownScoreColor();
        Logger.info("BestScore initColors", crownColor, crownScoreColor);
        if (crownColor) {
            Tool.setNodeGradient(this._crown, crownColor);
        }
        if (crownScoreColor) {
            Tool.setNodeGradient(this._crownScore, crownScoreColor);
        }
    }
    onDestroy() {
        eventManager.off(GameEvent.GAME_BEST_SCORE_UPDATE, this.setBestScore, this);
    }
    setBestScore(score: number) {
        this._crownScore.getComponent(Label).string = score.toString();
    }
}
