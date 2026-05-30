import { ImageAsset, SpriteFrame, Texture2D } from "cc";

export class PhotoTextureCache {
    private static _tileFrames: (SpriteFrame | null)[] = [];
    private static _size: number = 0;

    static setSquareCanvas(canvas: HTMLCanvasElement): void {
        const size = Math.max(0, Math.min(canvas.width, canvas.height));
        if (size <= 0) return;

        const tile = Math.floor(size / 8);
        const alignedSize = Math.max(8, tile * 8);
        if (alignedSize !== size) {
            const alignedCanvas = document.createElement("canvas");
            alignedCanvas.width = alignedSize;
            alignedCanvas.height = alignedSize;
            const ctx = alignedCanvas.getContext("2d");
            if (!ctx) return;
            const sx = Math.floor((size - alignedSize) / 2);
            const sy = Math.floor((size - alignedSize) / 2);
            ctx.drawImage(canvas, sx, sy, alignedSize, alignedSize, 0, 0, alignedSize, alignedSize);
            canvas = alignedCanvas;
        }

        this._size = canvas.width;
        this._tileFrames = new Array(64).fill(null);

        const tileSize = this._size / 8;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const tileCanvas = document.createElement("canvas");
                tileCanvas.width = tileSize;
                tileCanvas.height = tileSize;
                const tileCtx = tileCanvas.getContext("2d");
                if (!tileCtx) continue;

                tileCtx.drawImage(canvas, col * tileSize, row * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);

                const imageAsset = new ImageAsset(tileCanvas);
                const tex = new Texture2D();
                tex.image = imageAsset;
                const sf = new SpriteFrame();
                sf.packable = false;
                sf.texture = tex;
                this._tileFrames[row * 8 + col] = sf;
            }
        }
    }

    static getTileSpriteFrame(row: number, col: number): SpriteFrame | null {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this._tileFrames[row * 8 + col] ?? null;
    }
}
