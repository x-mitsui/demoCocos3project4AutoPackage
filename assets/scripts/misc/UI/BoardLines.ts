import { _decorator, Color, Component, Graphics, UITransform } from "cc";
import { BlockSize } from "../../configs/config";
import { SkinsManager } from "../../configs/Skins/SkinsManager";
import { eventManager, GameEvent } from "../../managers/EventManager";
import { Logger } from "../../utils/logger";
const { ccclass, property } = _decorator;

@ccclass("BoardLines")
export class BoardLines extends Component {
    @property
    horizonalCount: number = 9;
    @property
    verticalCount: number = 9;
    strokeColor: Color = new Color(255, 255, 255, 255);
    space = 120;
    private _g: Graphics = null;

    onLoad() {
        this.space = BlockSize.width;
        this.strokeColor = new Color(255, 255, 255, 255);
        this.drawLines();
        eventManager.on(GameEvent.GAME_COLOR_CHANGE, this.changeLinesColor, this);
    }

    drawLines() {
        const totalW = this.space * (this.verticalCount - 1);
        const totalH = this.space * (this.horizonalCount - 1);

        const uiTransform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        uiTransform.setContentSize(totalW, totalH);

        const g = this._g ?? (this._g = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics));
        g.clear();
        // g.lineWidth = this.lineThickness;

        const lineColor = SkinsManager.getInstance().getLineColor();

        if (lineColor) {
            g.strokeColor = new Color().fromHEX(lineColor);
        }

        // g.strokeColor = this.strokeColor;

        // 锚点在中心，坐标从左上角 (-totalW/2, totalH/2) 开始
        const startX = -totalW / 2;
        const startY = totalH / 2;

        // 横线
        for (let i = 0; i < this.horizonalCount; i++) {
            const y = startY - this.space * i;
            g.moveTo(startX, y);
            g.lineTo(startX + totalW, y);
        }
        // 竖线
        for (let i = 0; i < this.verticalCount; i++) {
            const x = startX + this.space * i;
            g.moveTo(x, startY);
            g.lineTo(x, startY - totalH);
        }
        g.stroke();
    }

    changeLinesColor() {
        const lineColor = SkinsManager.getInstance().getLineColor();
        Logger.info("BoardLines:changeLinesColor:", "lineColor:", lineColor);
        if (lineColor && this._g) {
            this._g.strokeColor = new Color().fromHEX(lineColor);
            this._g.stroke();
        }
    }
}
