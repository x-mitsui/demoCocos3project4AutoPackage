import {
    _decorator,
    Component,
    Node,
    AudioSource,
    AudioClip,
    resources,
    director,
    log,
    Event,
} from "cc";

const { ccclass, property } = _decorator;

@ccclass("AudioManager")
export class AudioManager extends Component {
    @property(AudioClip)
    clearEffect: AudioClip = null!;
    @property(AudioClip)
    failEffect: AudioClip = null!;
    @property(AudioClip)
    clickEffect: AudioClip = null!;
    @property(AudioClip)
    comboEffects: AudioClip[] = [];
    @property(AudioClip)
    placeEffect: AudioClip = null!;
    @property(AudioClip)
    winEffect: AudioClip = null!;
    private static _instance: AudioManager;
    private audioSource: AudioSource;

    public static get instance(): AudioManager {
        return this._instance;
    }

    protected onLoad(): void {
        if (AudioManager._instance) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
        this.audioSource = this.node.addComponent(AudioSource);
    }
    playClearEffect() {
        this.playEffect(this.clearEffect);
    }
    playFailEffect() {
        this.playEffect(this.failEffect);
    }
    playClickEffect() {
        this.playEffect(this.clickEffect);
    }
    playComboEffect(combo: number) {
        this.playEffect(this.comboEffects[combo % this.comboEffects.length]);
    }
    playPlaceEffect() {
        this.playEffect(this.placeEffect);
    }
    playWinEffect() {
        this.playEffect(this.winEffect);
    }

    // 播放音效（不循环）
    playEffect(sound: AudioClip | string, volume: number = 1.0) {
        if (!sound) {
            // log("playEffect: sound is null");
            return;
        }
        if (!this.audioSource) {
            // log("playEffect: audioSource is not initialized");
            return;
        }
        // log("playEffectxx:", sound);
        if (sound instanceof AudioClip) {
            // log("playEffect:", sound);
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
    playBGM(sound: AudioClip | string, volume: number = 0.6) {
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
