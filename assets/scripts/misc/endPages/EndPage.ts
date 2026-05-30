import { _decorator, Component, director } from "cc";
import { jump2DownloadPage } from "../../utils/tool";
import { Logger } from "../../utils/logger";
import { Analytics } from "../../utils/Analytics";
const { ccclass, property } = _decorator;

@ccclass("EndPage")
export abstract class EndPage extends Component {
    @property({ type: Boolean, tooltip: "是否可以重玩" })
    isCanReplay: boolean = false;
    abstract show();
    onJumpButtonClick() {
        Analytics.trackCtaClicked();
        jump2DownloadPage();
        if (this.isCanReplay) {
            Analytics.trackChallengeFailed();
            Analytics.trackChallengeRetry();
            window.location.reload();
        }
    }
}
