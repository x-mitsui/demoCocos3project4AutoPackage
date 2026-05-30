import { _decorator, Component, AudioSource, AudioClip, resources, log } from "cc";
import super_html_playable from "../utils/super_html_playable";
import { eventManager, GameEvent } from "./EventManager";
import { Logger } from "../utils/logger";
const { ccclass, property } = _decorator;

/** 随机旋律一小段：`clips` 为 0..n-1 级数（0=do），须与 randomEffectClips 顺序一致；`delays.length === clips.length - 1` */
export type RandomMelodySegment = {
    name?: string;
    clips: number[];
    tempo: number;
    delays?: number[];
};

@ccclass("AudioManager")
export class AudioManager extends Component {
    @property(AudioClip)
    clickBtnEffect: AudioClip = null!;
    @property(AudioClip)
    touchEffect: AudioClip = null!;
    @property(AudioClip)
    placeEffect: AudioClip = null!;
    @property(AudioClip)
    clearEffect: AudioClip = null!;
    @property(AudioClip)
    comboEffects: AudioClip[] = [];
    @property(AudioClip)
    winEffect: AudioClip = null!;
    @property(AudioClip)
    failEffect: AudioClip = null!;
    @property(AudioClip)
    goodEffect: AudioClip = null!;
    @property(AudioClip)
    greatEffect: AudioClip = null!;
    @property(AudioClip)
    excellectEffect: AudioClip = null!;
    @property(AudioClip)
    amazingEffect: AudioClip = null!;
    @property(AudioClip)
    unbelievableEffect: AudioClip = null!;
    @property(AudioClip)
    refreshEffect: AudioClip = null!;
    // @property(AudioClip)
    // bgm: AudioClip = null!;
    @property(AudioClip)
    diEffect: AudioClip = null!;
    @property(AudioClip)
    showBtnEffect: AudioClip = null!;
    @property(AudioClip)
    newHighScoreEffect: AudioClip = null!;
    @property(AudioClip)
    gemDestiPanelEffect: AudioClip = null!;
    @property(AudioClip)
    gemFly2DestiEffect: AudioClip = null!;
    @property(AudioClip)
    gemShowEffect: AudioClip = null!;
    @property(AudioClip)
    endPageShowGemEffect: AudioClip = null!;
    @property(AudioClip)
    countdownEffect: AudioClip = null!;
    @property(AudioClip)
    kickEffect: AudioClip = null!;
    @property(AudioClip)
    allEliminateEffects: AudioClip[] = [];
    private isSoundOn = true;

    private static _instance: AudioManager | null = null;
    private audioSource: AudioSource;

    public static get instance(): AudioManager {
        return this._instance!;
    }
    protected onLoad(): void {
        if (AudioManager._instance) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
        this.audioSource = this.node.addComponent(AudioSource);
        eventManager.on(GameEvent.GAME_SOUND_TOGGLE, this.onSoundToggle, this);
    }

    protected onDestroy(): void {
        this._odePreviewGen++;
        this.unscheduleAllCallbacks();
        eventManager.off(GameEvent.GAME_SOUND_TOGGLE, this.onSoundToggle, this);
        if (AudioManager._instance === this) {
            AudioManager._instance = null;
        }
    }
    // setSoundOn(isSound: boolean) {
    //     this.isSoundOn = isSound;
    //     if (!isSound) {
    //         this.stop();
    //     } else {
    //     }
    // }
    onSoundToggle(isSound: boolean) {
        Logger.info("AudioManager:onSoundToggle:", "isSound:", isSound);
        this.isSoundOn = isSound;
        if (!isSound) {
            this.stop();
        } else {
            this.resume();
        }
    }
    playKickEffect() {
        this.playEffect(this.kickEffect);
    }
    playClickBtnEffect() {
        this.playEffect(this.clickBtnEffect);
    }
    playTouchEffect() {
        this.playEffect(this.touchEffect);
    }
    playPlaceEffect() {
        this.playEffect(this.placeEffect);
    }
    playClearEffect() {
        this.playEffect(this.clearEffect);
    }
    playComboEffect(combo: number) {
        // this.scheduleOnce(() => {
        this.playEffect(this.comboEffects[combo % this.comboEffects.length], 1);
        // }, 0.5);
    }
    playWinEffect() {
        this.playEffect(this.winEffect, 0.3);
    }
    playFailEffect() {
        this.playEffect(this.failEffect);
    }
    playGoodEffect() {
        this.playEffect(this.goodEffect);
    }
    playGreatEffect() {
        this.playEffect(this.greatEffect);
    }
    playExcellectEffect() {
        this.playEffect(this.excellectEffect);
    }
    playAmazingEffect() {
        this.playEffect(this.amazingEffect);
    }
    playUnbelievableEffect() {
        this.playEffect(this.unbelievableEffect);
    }
    playRefreshEffect() {
        this.playEffect(this.refreshEffect);
    }
    playShowBtnEffect() {
        this.playEffect(this.showBtnEffect);
    }
    playDiEffect() {
        this.playEffect(this.diEffect, 0.2);
    }
    playNewHighScoreEffect() {
        this.playEffect(this.newHighScoreEffect);
    }
    playGemDestiPanelEffect() {
        this.playEffect(this.gemDestiPanelEffect);
    }
    playGemFly2DestiEffect() {
        this.playEffect(this.gemFly2DestiEffect);
    }
    playGemShowEffect() {
        this.playEffect(this.gemShowEffect);
    }
    playEndPageShowGemEffect() {
        this.playEffect(this.endPageShowGemEffect);
    }
    playCountdownEffect() {
        this.playEffect(this.countdownEffect);
    }
    eliminateEffectIndex = 0;
    /** 预览连播 token：每次重新开始都递增，旧排程自动失效 */
    private _eliminatePreviewGen = 0;
    playEliminateEffect() {
        this.playEffect(this.allEliminateEffects[this.eliminateEffectIndex++ % this.allEliminateEffects.length]);
    }
    // 从头到尾循环播放所有消除音效
    playAllEliminateEffect4WinEndPage() {
        const gen = ++this._eliminatePreviewGen;
        const clips = this.allEliminateEffects.filter(Boolean);
        if (!clips.length) {
            Logger.warn("AudioManager:playAllEliminateEffect4WinEndPage:", "allEliminateEffects 为空");
            return;
        }
        this._scheduleEliminateLoopRound(gen, clips);
    }
    private _scheduleEliminateLoopRound(gen: number, clips: AudioClip[]) {
        if (gen !== this._eliminatePreviewGen) return;
        let startAt = 0;
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            this.scheduleOnce(() => {
                if (gen !== this._eliminatePreviewGen) return;
                this.playEffect(clip);
            }, startAt);
            startAt += this._durationOfEliminateClip(clip);
        }
        this.scheduleOnce(() => {
            if (gen !== this._eliminatePreviewGen) return;
            this._scheduleEliminateLoopRound(gen, clips);
        }, startAt);
    }
    private _durationOfEliminateClip(clip: AudioClip) {
        const c = clip as unknown as { getDuration?: () => number; duration?: number };
        const d = typeof c.getDuration === "function" ? c.getDuration() : c.duration;
        const safeDuration = typeof d === "number" && isFinite(d) && d > 0 ? d : 0.18;
        // 每个音效后留一点空隙，听感更清晰
        return safeDuration + 0.03;
    }
    @property(AudioClip)
    randomEffectClips: AudioClip[] = [];
    /**
     * `clips`：**0=do, 1=re, … 6=ti**（与 `randomEffectClips` 下标 0..6 对齐；若有第 8 个 clip 可作高八度 do）。
     * `delays`：相邻两音间隔（秒），长度**必须**为 `clips.length - 1`。
     */
    randomMelodySegments: RandomMelodySegment[] = [
        { name: "欢乐女神", clips: [2, 2, 3, 4], tempo: 0.16, delays: [0.14, 0.14, 0.16] },
        { name: "圣洁美丽", clips: [4, 3, 2, 1], tempo: 0.16, delays: [0.14, 0.14, 0.18] },
        { name: "灿烂光芒", clips: [0, 0, 1, 2], tempo: 0.16, delays: [0.14, 0.14, 0.16] },
        { name: "照大地", clips: [2, 1, 1], tempo: 0.16, delays: [0.18, 0.24] },
        { name: "我们怀着", clips: [2, 2, 3, 4], tempo: 0.16, delays: [0.14, 0.14, 0.16] },
        { name: "火样热情", clips: [4, 3, 2, 1], tempo: 0.16, delays: [0.14, 0.14, 0.18] },
        { name: "来到你的", clips: [0, 0, 1, 2], tempo: 0.16, delays: [0.14, 0.14, 0.16] },
        { name: "圣殿里", clips: [1, 0, 0], tempo: 0.16, delays: [0.18, 0.24] },
        { name: "你的威力", clips: [1, 1, 2, 0], tempo: 0.16, delays: [0.14, 0.14, 0.18] },
        { name: "能把我们", clips: [1, 2, 3, 2, 0], tempo: 0.16, delays: [0.14, 0.14, 0.14, 0.18] },
        { name: "重新团结", clips: [1, 2, 3, 2, 1], tempo: 0.16, delays: [0.14, 0.14, 0.14, 0.18] },
        { name: "在一起", clips: [0, 1, 4], tempo: 0.16, delays: [0.14, 0.28] },
        { name: "欢乐颂-再现1", clips: [2, 2, 3, 4], tempo: 0.16, delays: [0.14, 0.14, 0.16] },
        { name: "欢乐颂-再现2", clips: [4, 3, 2, 1], tempo: 0.16, delays: [0.14, 0.14, 0.16] },
        { name: "欢乐颂-再现3", clips: [0, 0, 1, 2], tempo: 0.16, delays: [0.14, 0.14, 0.16] },
        { name: "结束", clips: [1, 0, 0], tempo: 0.16, delays: [0.22, 0.32] },
    ];
    randomIndex = 0;
    /** 连续试听「欢乐颂」全段时递增，用于取消未完成的 schedule */
    private _odePreviewGen = 0;

    playRandomEffect() {
        const segs = this.randomMelodySegments;
        if (!segs.length) return;
        const effect = segs[this.randomIndex++ % segs.length];
        this._scheduleRandomEffectNotes(effect, 0);
    }

    /** 按 `randomMelodySegments` 顺序整首循环连播（段间留空），便于试听；销毁节点或再次调用本方法会停止上一轮 */
    playAllRandomEffect() {
        const gen = ++this._odePreviewGen;
        const segs = this.randomMelodySegments;
        if (!segs.length) {
            Logger.warn("AudioManager:playAllRandomEffect:", "randomMelodySegments 为空");
            return;
        }
        this._scheduleMelodyLoopRound(gen);
    }

    /** 排程一整轮各段音符，结束后用同一 `gen` 再排下一轮（循环直至 gen 失效或 onDestroy） */
    private _scheduleMelodyLoopRound(gen: number) {
        if (gen !== this._odePreviewGen) return;
        const segs = this.randomMelodySegments;
        if (!segs.length) return;
        let segmentStart = 0;
        for (let i = 0; i < segs.length; i++) {
            const effect = segs[i];
            this._scheduleRandomEffectNotes(effect, segmentStart, gen);
            segmentStart += this._durationOfRandomEffectSegment(effect);
        }
        const roundDuration = segmentStart;
        this.scheduleOnce(() => {
            if (gen !== this._odePreviewGen) return;
            this._scheduleMelodyLoopRound(gen);
        }, roundDuration);
    }

    private _scheduleRandomEffectNotes(effect: RandomMelodySegment, timeOffset = 0, previewGen?: number) {
        const useDelays =
            effect.delays && effect.delays.length === effect.clips.length - 1 && effect.delays.every((d) => d > 0);
        let t = 0;
        const nClip = Math.max(1, this.randomEffectClips.length);
        effect.clips.forEach((degree, i) => {
            const fireAt = timeOffset + t;
            const clipIndex = ((degree % nClip) + nClip) % nClip;
            this.scheduleOnce(() => {
                if (previewGen !== undefined && previewGen !== this._odePreviewGen) return;
                this.playEffect(this.randomEffectClips[clipIndex]);
            }, fireAt);
            if (i < effect.clips.length - 1) {
                t += useDelays ? effect.delays![i] : effect.tempo;
            }
        });
    }

    /**
     * 一小段在时间轴上的占位：从首音到末音的间隔之和 + 末音后的休止。
     * 末音后用「本句最后一个音程间隔」或一拍 `tempo`，与乐谱里句尾换气一致，避免下一句抢拍。
     */
    private _durationOfRandomEffectSegment(effect: RandomMelodySegment) {
        const useDelays =
            effect.delays && effect.delays.length === effect.clips.length - 1 && effect.delays.every((d) => d > 0);
        let span = 0;
        for (let i = 0; i < effect.clips.length - 1; i++) {
            span += useDelays ? effect.delays![i] : effect.tempo;
        }
        const restAfterLastNote =
            useDelays && effect.delays!.length > 0 ? effect.delays[effect.delays!.length - 1] : effect.tempo;
        return span + restAfterLastNote;
    }
    playBGM() {
        // this._playBGM(this.bgm);
    }
    stopBGM() {
        this.audioSource.stop();
    }
    // 播放音效（不循环）
    playEffect(sound: AudioClip | string, volume: number = 1.0) {
        if (!super_html_playable.is_audio() || !this.isSoundOn) {
            return;
        }
        if (sound instanceof AudioClip) {
            Logger.info("AudioManager:playEffect:", "sound:", sound);
            this.audioSource.playOneShot(sound, volume);
        } else {
            resources.load(sound, AudioClip, (err, clip) => {
                if (!err) {
                    this.audioSource.playOneShot(clip, volume);
                }
            });
        }
    }

    // 播放背景音乐（循环）
    private _playBGM(sound: AudioClip | string, volume: number = 0.6) {
        if (!super_html_playable.is_audio() || !this.isSoundOn) {
            return;
        }
        if (sound instanceof AudioClip) {
            this.audioSource.stop();
            this.audioSource.clip = sound;
            this.audioSource.loop = true;
            this.audioSource.play();
            this.audioSource.volume = volume;
        } else {
            resources.load(sound, AudioClip, (err, clip) => {
                if (!err) {
                    this.audioSource.stop();
                    this.audioSource.clip = clip;
                    this.audioSource.loop = true;
                    this.audioSource.play();
                    this.audioSource.volume = volume;
                }
            });
        }
    }

    // 暂停音乐
    pause() {
        this.audioSource.pause();
    }

    // 恢复播放
    resume() {
        this.audioSource.play();
    }

    // 停止播放
    stop() {
        this.audioSource.stop();
    }

    // 设置音量
    setVolume(volume: number) {
        this.audioSource.volume = volume;
    }
}
