import {
    _decorator,
    Component,
    Enum,
    Node,
    Prefab,
    Vec3,
    sys,
    UITransform,
    find,
    log,
    Label,
    macro,
    instantiate,
    Material,
    CCInteger,
    ResolutionPolicy,
    view,
} from "cc";
import { WinEndPage } from "../misc/endPages/WinEndPage";
import { AudioManager } from "./AudioManager";
import { eventManager, GameEvent } from "./EventManager";
import { Board } from "../board/Board";
import { ComboAniSuper } from "../misc/comboAni/ComboAniSuper";
import { EndPage } from "../misc/endPages/EndPage";
import { DragOptionsContainer } from "../dragOptions/DragOptionsContainer";

import { Logger } from "../utils/logger";
import { Tip } from "../misc/Tip";
import { ObjectPoolManager } from "./ObjectPoolManager";
import { isPlatformTiktok, jump2DownloadPage, Tool } from "../utils/tool";
import { gameLevelConfigs } from "../configs/gameLevelConfigs";
import { Revive } from "../misc/UI/Revive";
import { Analytics } from "../utils/Analytics";
import { LineHintShakeStyle } from "../dragOptions/lineHintShake/LineHintShakeStyle";
import super_html_playable from "../utils/super_html_playable";
const { ccclass, property } = _decorator;

export { LineHintShakeStyle };
const { localStorage } = sys;
@ccclass("GameManager")
export class GameManager extends Component {
    private static _instance: GameManager = null;
    isGameOver = false;
    @property({ type: Boolean, tooltip: "是否开启oneByOne模式" })
    oneByOne = true;
    @property(Prefab)
    blockPrefab: Prefab = null;
    private _gameLevel = 0;
    highScoreAniPlayed = false;
    @property(Prefab)
    encouragePrefab: Prefab = null;
    @property(Prefab)
    bonusLabelPrefab: Prefab = null;
    @property(Prefab)
    EliminateAniPrefab: Prefab = null;
    @property(Prefab)
    EliminateAniColorfulPrefab: Prefab = null;
    @property(Prefab)
    AllEliminateSpineMixPrefab: Prefab = null;
    @property({ type: Prefab, tooltip: "预消除动画" })
    preClearAniPrefab: Prefab = null;
    @property({ type: Prefab, tooltip: "预消除动画,unique模式下使用" })
    uniquePreClearAniPrefab: Prefab = null;
    @property(Prefab)
    revivePrefab: Prefab = null;
    @property({ type: Number, tooltip: "复活次数" })
    reviveTimes: number = 1;
    revivePage: Node = null;
    @property(Node)
    comboAni: Node = null!;
    @property(Node)
    winEndPage: WinEndPage = null!;
    @property(Node)
    loseEndPage: WinEndPage = null!;
    @property({ type: Number, tooltip: "纯色方块索引,0为不设置，因为1-7是范围值" })
    pureBlockIndex = 0;
    _placeTimes: number = 0;
    isFirstGenerate: boolean = true;
    @property({ tooltip: "是否开启特定消除动画" })
    enableSpecificEliminateAnimation: boolean = false;
    @property({ tooltip: "是否播放分数增加动画" })
    enableScoreAnimation: boolean = true;

    @property({ tooltip: "是否播放最高分增加动画" })
    enableBestScoreAnimation: boolean = true;

    @property({ tooltip: "消除后 Encourage 相对消除完成的基准延迟（秒）" })
    encouragePlayDelayBase = 0.7;

    @property({
        tooltip:
            "本手既破纪录会播新高分全屏动画、又会播 Encourage 时，在 encouragePlayDelayBase 上额外再延后的秒数，便于与新高分错开；0 表示不额外延后",
    })
    encourageExtraDelayWhenHighScoreAni = 0.85;
    @property({ tooltip: "是否开启变色模式" })
    enableChangeColor: boolean = false;
    @property({ tooltip: "是否开启彩色预消除动画" })
    enableColorfulPreEliminateAnimation: boolean = false;
    @property({ tooltip: "是否开启彩色边框消除动画" })
    enableColorfulBorderEliminateAnimation: boolean = false;
    @property({ tooltip: "preClear 渐变方块使用径向（中心→外）渐变，false=线性上下渐变" })
    enableRadialColorBlock: boolean = false;
    @property({ tooltip: "preClear 渐变方块使用风车旋转效果（优先级高于径向），会有持续旋转动画" })
    enableWindmillColorBlock: boolean = false;
    @property({ tooltip: "风车渐变是否顺时针旋转（enableWindmillColorBlock 开启时生效）" })
    enableWindmillClockwise: boolean = true;
    @property({ tooltip: "渐变方块呼吸亮度幅度（0=不呼吸）" })
    colorBlockBreathAmplitude: number = 0.3;
    @property({ tooltip: "是否开启彩色选项" })
    enableColorfulDragOption: boolean = false;
    @property({ tooltip: "是否开启根据配置上色消除动画,bb默认为true；bc默认为false；" })
    enableEliminateAnimationByConfig: boolean = true;
    @property({ tooltip: "是否开启消除方块坠落动画" })
    enableBlockFallAnimation: boolean = false;
    @property({ tooltip: "是否开启背景的呼吸动画" })
    enableBackgroundBreatheAnimation: boolean = false;
    _enableLineHintShake = false;
    @property({
        type: Enum(LineHintShakeStyle),
        tooltip:
            "与 enableLineHintShake 同时生效：波浪缩放、同行列同步小角旋转、或 Soccer 蓄能加速转圈（见 dragOptions/lineHintShake/）",
    })
    lineHintShakeStyle: LineHintShakeStyle = LineHintShakeStyle.None;
    @property({ tooltip: "是否开启photo模式" })
    enablePhotoMode: boolean = false;
    @property({ tooltip: "是否开启预消除发光置顶" })
    enablePreClearZIndexTopMode: boolean = false;
    @property({ tooltip: "photo模式下，Photo节点的四周也要有类似于ShaderBlock的上下左右高光等" })
    enablePhotoEdges: boolean = false;
    @property({
        type: Material,
        tooltip: "photoEdge.effect 对应的材质，enablePhotoEdges 开启时应用到 Photo 节点",
    })
    photoEdgeMaterial: Material = null;

    @property({ tooltip: "是否开启全屏填满才消除" })
    enableOnlyFullScreenEliminate: boolean = false;
    objectPoolSizeLabel: Label | null = null; // 对象池大小标签
    _score: number = 0;
    private _displayScore: number = 0; // 当前显示的分数
    private _targetScore: number = 0; // 目标分数
    private _isAnimatingScore: boolean = false; // 是否正在播放分数动画

    private _displayBestScore: number = 0; // 当前显示的最高分
    private _targetBestScore: number = 0; // 目标最高分
    private _isAnimatingBestScore: boolean = false; // 是否正在播放最高分动画
    private _gemConfig: { blockIdx: number; destiScore: number }[] = [];

    @property({ tooltip: "是否开启自动适配" })
    enableAutoAdaption: boolean = false;

    combo: number = -1;
    noClearRounds: number = 0; // 持续未清除的轮数，连续3次会导致combo中断
    cleanTimes: number = 0;

    totalPlacements = 10;

    /** setScoreWithClearCount 在 score += 前写入，供 Board 取 Encourage 额外延迟后清零 */
    private _pendingEncourageExtraDelay = 0;

    public static get instance(): GameManager {
        return this._instance;
    }

    onLoad() {
        Analytics.trackLoading();
        if (GameManager._instance) {
            this.node.destroy();
            return;
        }
        GameManager._instance = this;
        // 关闭多点触摸
        macro.ENABLE_MULTI_TOUCH = false;
        this.initBestScore();
        // AudioManager.instance.playBGM();
        ObjectPoolManager.instance.initPool("Block", this.blockPrefab, 60);
        if (Tool.isDev) {
            this.initObjectPoolSizeLabel();
        }
        Logger.info("GameManager:onLoad:", "this._gameLevel:", this._gameLevel);
        Logger.info(
            "GameManager:onLoad:",
            "gameLevelConfigs[this._gameLevel].desti:",
            gameLevelConfigs[this._gameLevel].desti,
        );
        this.gemConfig = gameLevelConfigs[this._gameLevel].desti;
        Logger.info("GameManager:onLoad:", "this.gemConfig:", this.gemConfig);

        eventManager.on(GameEvent.GAME_END, this.playEndPage, this);
        eventManager.once(
            GameEvent.GAME_START,
            () => {
                Analytics.trackDisplayed();
                Analytics.trackChallengeStarted();
            },
            this,
        );
        Analytics.trackLoaded();
        this.scheduleOnce(() => {
            this.repos4Tiktok();
        }, 0.1);
        super_html_playable.remove_loader_placeholder();
        if (this.enableAutoAdaption) {
            view.resizeWithBrowserSize(true);
            if (sys.isBrowser && typeof window !== "undefined") {
                window.addEventListener("resize", this.onAdaptResize);
                window.visualViewport?.addEventListener("resize", this.onAdaptResize);
            }
            view.on("canvas-resize", this.onAdaptResize, this);
            this.onAdaptResize();
        }
    }

    private getViewportAspectRatio(): number {
        if (sys.isBrowser && typeof window !== "undefined") {
            const vv = window.visualViewport;
            if (vv && vv.height > 0) {
                return vv.width / vv.height;
            }
            if (window.innerHeight > 0) {
                return window.innerWidth / window.innerHeight;
            }
        }
        const frame = view.getFrameSize();
        if (frame.height > 0) {
            return frame.width / frame.height;
        }
        return 1080 / 1920;
    }

    private readonly onAdaptResize = (): void => {
        this.unschedule(this._applyScreenAdaption);
        this.scheduleOnce(this._applyScreenAdaption, 0.05);
    };

    private readonly _applyScreenAdaption = (): void => {
        const ratio = this.getViewportAspectRatio();
        const design = view.getDesignResolutionSize();
        const designW = design.width > 0 ? design.width : 1080;
        const designH = design.height > 0 ? design.height : 1920;
        view.setDesignResolutionSize(
            designW,
            designH,
            ratio > 1 ? ResolutionPolicy.FIXED_HEIGHT : ResolutionPolicy.FIXED_WIDTH,
        );
    };

    protected start(): void {
        if (gameLevelConfigs[this._gameLevel].totalPlacements) {
            this.totalPlacements = gameLevelConfigs[this._gameLevel].totalPlacements;
        }
        Logger.info("GameManager:start:", "this.totalPlacements:", this.totalPlacements);
    }
    repos4Tiktok() {
        if (isPlatformTiktok()) {
            const ui = find("Canvas/UI");
            const board = find("Canvas/Board");
            const bg = find("Canvas/BG");
            const dashedRect = find("Canvas/DashedRect");
            const dragOptionsContainer = find("Canvas/DragOptionsContainer");
            const dragOptionsShadowContainer = find("Canvas/DragOptionsShadowContainer");
            ui.y = ui.y + 120;
            board.y = board.y + 120;
            dashedRect.y = dashedRect.y + 120;
            bg.y = bg.y + 120;
            dragOptionsContainer.y = dragOptionsContainer.y + 170;
            dragOptionsShadowContainer.y = dragOptionsShadowContainer.y + 170;
        }
    }
    get enableLineHintShake() {
        return this.lineHintShakeStyle !== LineHintShakeStyle.None;
    }
    get placeTimes() {
        return this._placeTimes;
    }
    set placeTimes(value: number) {
        this._placeTimes = value;
        Logger.info("GameManager:placeTimes:", GameManager.instance.placeTimes);
        if (value <= 0) return;

        // 按关卡总步数比例上报进度里程碑（每关 answers 数 × 3 块/轮）
        const totalPlacements = this.totalPlacements;
        if (value === Math.floor(totalPlacements * 0.25)) Analytics.trackChallengePass25();
        else if (value === Math.floor(totalPlacements * 0.5)) Analytics.trackChallengePass50();
        else if (value === Math.floor(totalPlacements * 0.75)) Analytics.trackChallengePass75();

        if (value % this.totalPlacements === 0) {
            Analytics.trackChallengeSolved();
            jump2DownloadPage();
        }
        // if (value > totalPlacements) {
        //     jump2DownloadPage();
        // }
    }
    initObjectPoolSizeLabel() {
        if (!this.objectPoolSizeLabel) {
            const node = new Node("ObjectPoolSizeLabel");
            this.objectPoolSizeLabel = node.addComponent(Label);
            node.parent = find("Canvas/UI");
            node.setPosition(-300, 900);
            this.objectPoolSizeLabel.fontSize = 40;
            this.objectPoolSizeLabel.lineHeight = 40;
        }
        this.objectPoolSizeLabel.string = "";
        this.schedule(this.updateObjectPoolSizeLabel, 0.1);
    }
    updateObjectPoolSizeLabel() {
        this.objectPoolSizeLabel.string = `对象池大小: ${ObjectPoolManager.instance.getPoolSize()}`;
    }
    onDestroy(): void {
        if (this.enableAutoAdaption) {
            if (sys.isBrowser && typeof window !== "undefined") {
                window.removeEventListener("resize", this.onAdaptResize);
                window.visualViewport?.removeEventListener("resize", this.onAdaptResize);
            }
            view.off("canvas-resize", this.onAdaptResize, this);
            this.unschedule(this._applyScreenAdaption);
        }
        ObjectPoolManager.instance.clearAll();
        this.unschedule(this.updateObjectPoolSizeLabel);
    }
    initBestScore() {
        const bestScoreSpecific = gameLevelConfigs[this._gameLevel].bestScoreSpecific;
        this.setBestScore(bestScoreSpecific || 210);
        const bestScore = this.getBestScore();
        this._displayBestScore = bestScore;
        this._targetBestScore = bestScore;

        this.scheduleOnce(() => {
            eventManager.emit(GameEvent.GAME_BEST_SCORE_UPDATE, bestScore);
            // 初始化显示分数为0
            eventManager.emit(GameEvent.GAME_SCORE_UPDATE, 0);
        }, 0.1);
    }
    get gameLevel() {
        return this._gameLevel;
    }
    set gameLevel(level: number) {
        this._gameLevel = level;
    }
    get gemConfig(): { blockIdx: number; destiScore: number }[] {
        return this._gemConfig;
    }
    isAllGemDestiScoreAchieved(): boolean {
        return this._gemConfig.every((item) => item.destiScore <= 0);
    }
    private set gemConfig(value: { blockIdx: number; destiScore: number }[]) {
        if (value) this._gemConfig = JSON.parse(JSON.stringify(value));
    }
    get score(): number {
        return this._score;
    }
    private set score(value: number) {
        log("GameManager set score:", value);
        this._score = value;
        this._targetScore = value;

        // 根据配置决定是否播放分数动画
        if (this.enableScoreAnimation) {
            // 播放动画
            if (!this._isAnimatingScore) {
                this._isAnimatingScore = true;
                this.animateScore();
            }
        } else {
            // 直接设置，不播放动画
            this._displayScore = value;
            eventManager.emit(GameEvent.GAME_SCORE_UPDATE, this._displayScore);
        }

        // 检查最高分
        const currentBestScore = this.getBestScore();
        if (this._score > currentBestScore) {
            // 最高分有变化，更新目标最高分
            this._targetBestScore = this._score;

            if (!this.highScoreAniPlayed && localStorage.getItem("firstplay") != "1") {
                this.highScoreAniPlayed = true;
                sys.localStorage.setItem("bestScore", this._score.toString());
                Logger.info("GameManager setBestScore", this._score);
                eventManager.emit(GameEvent.GAME_HIGH_ANI_PLAY, this._score);
            } else {
                sys.localStorage.setItem("bestScore", this._score.toString());
                Logger.info("GameManager setBestScore", this._score);
            }

            // 根据配置决定是否播放最高分动画
            if (this.enableBestScoreAnimation) {
                // 播放动画
                if (!this._isAnimatingBestScore) {
                    this._isAnimatingBestScore = true;
                    this.animateBestScore();
                }
            } else {
                // 直接设置，不播放动画
                this._displayBestScore = this._targetBestScore;
                eventManager.emit(GameEvent.GAME_BEST_SCORE_UPDATE, this._displayBestScore);
            }
        }
    }

    /**
     * 通用的数值动画方法
     * @param currentValue 当前显示值的引用键名
     * @param targetValueKey 目标值的引用键名（每次递归时实时读取，防止中途更新丢失）
     * @param event 要触发的事件
     * @param animatingFlag 动画标志的引用键名
     */
    private animateValue(currentValue: string, targetValueKey: string, event: string, animatingFlag: string): void {
        const targetValue = this[targetValueKey]; // 每次都实时读取最新目标值
        if (this[currentValue] < targetValue) {
            // 每次增加1
            this[currentValue]++;

            // 触发更新事件
            eventManager.emit(event, this[currentValue]);

            // 每10ms更新一次
            this.scheduleOnce(() => {
                this.animateValue(currentValue, targetValueKey, event, animatingFlag);
            }, 0.01);
        } else {
            // 动画完成
            this[currentValue] = targetValue;
            this[animatingFlag] = false;
            eventManager.emit(event, this[currentValue]);
        }
    }

    /**
     * 分数动画：逐步增加显示分数
     */
    private animateScore(): void {
        this.animateValue("_displayScore", "_targetScore", GameEvent.GAME_SCORE_UPDATE, "_isAnimatingScore");
    }

    /**
     * 最高分动画：逐步增加显示最高分
     */
    private animateBestScore(): void {
        this.animateValue(
            "_displayBestScore",
            "_targetBestScore",
            GameEvent.GAME_BEST_SCORE_UPDATE,
            "_isAnimatingBestScore",
        );
    }

    getBaseScore(lines: number): number {
        if (lines <= 0) return 0;
        if (lines === 1) return 10;
        if (lines === 2) return 20;
        if (lines === 3) return 30;
        if (lines === 4) return 120;
        return 200;
    }

    setScoreWithoutClearCount(score: number) {
        this.score += score;
    }

    setScoreWithClearCount(clearCount: number, blockIndex: number, centerLocalPos: Vec3) {
        const comboAniSize = this.comboAni.getComponent(UITransform).contentSize;
        const boardSize = find("Canvas/Board").getComponent(UITransform).contentSize;
        let minX = -boardSize.width / 2 + comboAniSize.width / 2;
        let maxX = boardSize.width / 2 - comboAniSize.width / 2;
        let minY = -boardSize.height / 2 + comboAniSize.height / 2;
        let maxY = boardSize.height / 2 - comboAniSize.height / 2;
        if (centerLocalPos.x < minX) {
            centerLocalPos.x = minX;
        }
        if (centerLocalPos.x > maxX) {
            centerLocalPos.x = maxX;
        }
        if (centerLocalPos.y < minY) {
            centerLocalPos.y = minY;
        }
        if (centerLocalPos.y > maxY) {
            centerLocalPos.y = maxY;
        }

        if (clearCount > 0) {
            this.combo++;
            // eventManager.emit(GameEvent.GAME_COMBO_STEP, this.combo);
            AudioManager.instance.playComboEffect(this.combo + 1);
            AudioManager.instance.playRandomEffect();
            if (this.combo > 0) {
                this.comboAni
                    .getComponent(ComboAniSuper)
                    .playComboAnimation(blockIndex, this.combo, centerLocalPos, () => {
                        eventManager.emit(GameEvent.GAME_COMBO_ANIMATION_END);
                    });

                eventManager.emit(GameEvent.GAME_HEART_SHOW);
            }
            this.noClearRounds = 0;
            eventManager.emit(GameEvent.GAME_NO_CLEAR_ROUNDS_CHANGED, this.noClearRounds);
        } else {
            this.noClearRounds++;
            eventManager.emit(GameEvent.GAME_NO_CLEAR_ROUNDS_CHANGED, this.noClearRounds);
            if (this.noClearRounds >= 3) {
                this.combo = -1;
                eventManager.emit(GameEvent.GAME_HEART_HIDE);
            }
        }

        const curRoundScore = this.combo * this.getBaseScore(clearCount) + clearCount * 8;
        const nextTotal = this._score + curRoundScore;
        // 勿在此调用 getBestScore()：其会写 firstplay，破坏与 score setter 里「是否播新高分」一致性的判断
        const bestBefore = parseInt(localStorage.getItem("bestScore") || "0", 10);
        const firstplayFlag = localStorage.getItem("firstplay");
        const willBreakRecord = nextTotal > bestBefore;
        const willPlayHighScoreFullAni =
            clearCount > 0 && willBreakRecord && !this.highScoreAniPlayed && firstplayFlag != "1";
        this._pendingEncourageExtraDelay =
            willPlayHighScoreFullAni && this.encourageExtraDelayWhenHighScoreAni > 0
                ? this.encourageExtraDelayWhenHighScoreAni
                : 0;
        this.score += curRoundScore;
        return curRoundScore;
    }

    /** Board 在 schedule Encourage 时调用：返回本手额外延迟并清零，避免残留到下一手 */
    takeEncourageExtraDelay(): number {
        const d = this._pendingEncourageExtraDelay;
        this._pendingEncourageExtraDelay = 0;
        return d;
    }

    getBestScore() {
        const bestScore = parseInt(sys.localStorage.getItem("bestScore") || "0");
        // if (bestScore == 0) {
        //     localStorage.setItem("firstplay", "1");
        // }
        localStorage.setItem("firstplay", "0");
        return bestScore;
    }
    setBestScore(score: number) {
        sys.localStorage.setItem("bestScore", score.toString());
    }

    /**
     * 是否强制胜利
     * @param isForceWin 是否强制胜利
     */
    playEndPage(isForceWin: boolean = false) {
        localStorage.setItem("firstplay", "0");
        const boardNode = find("Canvas/Board");
        AudioManager.instance.stopBGM();
        const board = boardNode.getComponent(Board);

        if (GameManager.instance.revivePrefab && this.reviveTimes > 0) {
            this.reviveTimes--;
            this.showRevivePage(isForceWin);
        } else {
            if (this.isGameOver) return;
            this.isGameOver = true;
            board.fillUpAnimation(
                () => {},
                () => {
                    this.showEndPage(isForceWin);
                },
            );
        }
    }
    showRevivePage(isForceWin: boolean) {
        // if (this.revivePage) {
        //     this.revivePage.active = true;
        //     return;
        // }
        this.revivePage = instantiate(GameManager.instance.revivePrefab);
        this.revivePage.parent = find("Canvas/UI");
        this.revivePage.getComponent(Revive).init(isForceWin);
    }
    showEndPage(isForceWin: boolean) {
        Analytics.trackEndcardShown();
        if (this.score >= this.getBestScore() || isForceWin) {
            Analytics.trackCompleted();
            this.winEndPage.getComponent(EndPage).show();
        } else {
            Logger.info(
                "GameManager:playEndPage:",
                "this.score:",
                this.score,
                "this.getBestScore():",
                this.getBestScore(),
            );
            Analytics.trackChallengeFailed();
            this.loseEndPage.getComponent(EndPage).show();
        }
    }
    playNextQuestion() {
        this._gameLevel++;
        Logger.info("GameManager:playNextQuestion:", "this._gameLevel:", this._gameLevel);
        // let isAutoGenerate = false;

        const boardNode = find("Canvas/Board");
        const board = boardNode.getComponent(Board);
        // const isAutoGenerate = gameLevelConfigs[this._gameLevel]?.theEnd || false;
        // if (!isAutoGenerate) {
        board.initPuzzles();
        if (this._gameLevel === 1) {
            this.placeTimes = 0; // 重置放置次数，用于触发 FIRST_OPTION_LANDED 事件
            this.isFirstGenerate = true; // 重置是否是第一次生成，用于触发 GAME_START_TIP 事件
            const compTip = find("Canvas/Tip").getComponent(Tip);
            if (compTip) {
                compTip.targetRow = 3;
                compTip.targetCol = 4;
                compTip.offset2FirstRow = 1;
                compTip.offset2FirstCol = 0;
            }
        }
        const dragOptionsContainer = find("Canvas/DragOptionsContainer").getComponent(DragOptionsContainer);
        dragOptionsContainer.nextQues();
        if (this._gameLevel >= 2) {
            GameManager.instance.oneByOne = false;
        }
    }
}
