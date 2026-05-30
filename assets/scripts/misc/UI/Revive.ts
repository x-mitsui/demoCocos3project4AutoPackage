import { _decorator, Color, Component, find, Node, ProgressBar, UIOpacity } from "cc";
import { SkinsManager } from "../../configs/Skins/SkinsManager";
import { Tool } from "../../utils/tool";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { RadicalProgress } from "./RadicalProgress";
import { StartAnimationCfg, StartDragonAnimation } from "../StartDragonAnimation";
import { Logger } from "../../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("Revive")
export class Revive extends Component {
    radicalProgress: RadicalProgress = null;
    countdownNode: Node = null;
    buttonNode: Node = null;

    private bar: ProgressBar = null;

    @property({ tooltip: "复活倒计时时长" })
    duration: number = 5;

    _isClickReviveBtn = false; //是否点击了复活按钮

    isForceWin: boolean = false;
    init(isForceWin: boolean) {
        this.isForceWin = isForceWin;
    }
    protected onLoad(): void {
        this.radicalProgress = this.node.getChildByName("ProgressNode").getComponent(RadicalProgress);
        this.countdownNode = this.node.getChildByName("Countdown");
        this.buttonNode = this.node.getChildByName("Button");

        this.bar = find("Bar", this.radicalProgress.node).getComponent(ProgressBar);

        this.initCountdownColors();
        this.initBtnColors();
        this.initProgressNodeColors();

        this.initBtn();
    }
    // active 启动
    protected start(): void {
        this.startCountdown();
    }

    initBtn() {
        this.buttonNode.on(Node.EventType.TOUCH_END, this.onBtnClick, this);
    }

    onBtnClick() {
        Logger.info("Revive:onBtnClick", "this._isClickReviveBtn:", this._isClickReviveBtn);
        this._isClickReviveBtn = true;
        eventManager.emit(GameEvent.GAME_REVIVE);
        this.node.destroy();
    }

    startCountdown() {
        this.radicalProgress.startCountdown(this.duration, () => {
            if (this._isClickReviveBtn) return;

            eventManager.emit(GameEvent.GAME_END, this.isForceWin); // 放心，reviveTimes已经减少了，如果为0，则有机会直接调出结束页面
            this.node.active = false;
        });
        this.buttonNode.getComponent(StartDragonAnimation).play();
        this.countdownNode.getComponent(StartDragonAnimation).play();
    }

    onDestroy() {}

    initProgressNodeColors() {
        const progressbarColors = SkinsManager.getInstance().getReviveProgressbarColors();

        const progressbarLine = this.radicalProgress.node.getChildByName("Line");
        const progressbar = this.radicalProgress.node.getChildByName("Bar");
        const bg = this.radicalProgress.node.getChildByName("BG");
        Tool.setSpriteColor(progressbar, new Color(progressbarColors.progressbar.gradientStart));
        Tool.setSpriteColor(progressbarLine, new Color(progressbarColors.progressbarLine.gradientStart));
        Tool.setSpriteColor(bg, new Color(progressbarColors.progressbarBg.gradientStart));
    }

    initCountdownColors() {
        const countdownColors = SkinsManager.getInstance().getReviveCountdownColors();
        const particle = this.countdownNode.getChildByName("Particle");
        const numberOutline = this.countdownNode.getChildByName("NumberOutline");
        const number = this.countdownNode.getChildByName("Number");
        Tool.setDragonBoneColor(particle, new Color(countdownColors.parameter3.gradientStart));
        Tool.setDragonBoneColor(numberOutline, new Color(countdownColors.parameter2.gradientStart));
        Tool.setDragonBoneColor(number, new Color(countdownColors.parameter1.gradientStart));
    }

    initBtnColors() {
        const btnColors = SkinsManager.getInstance().getReviveBtnColors();
        const btnBg = this.buttonNode.getChildByName("BG");
        const btnIcon = this.buttonNode.getChildByName("IconAndText");
        Tool.setDragonBoneColor(btnBg, new Color(btnColors.parameter2.gradientStart));
        Tool.setDragonBoneColor(btnIcon, new Color(btnColors.parameter1.gradientStart));
    }
}
