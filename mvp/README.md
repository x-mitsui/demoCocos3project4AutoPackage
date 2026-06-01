# Block Blast MVP

纯 Canvas 实现的 Block Blast 玩法最小可玩版本，不依赖 Cocos 引擎。

## 玩法

- 8×8 棋盘，底部 3 个可选方块
- 拖拽方块到棋盘放置
- 满行或满列自动消除并计分
- 三个方块用完后刷新下一批
- 任意方块都无法放置时游戏结束

## 运行

需要本地 HTTP 服务（ES Module 不支持 `file://` 直接打开）：

```bash
# 在项目根目录
npx serve mvp

# 或
cd mvp && python -m http.server 8080
```

浏览器访问 `http://localhost:3000`（或对应端口）。

## 目录

```
mvp/
├── index.html
├── style.css
├── README.md
└── js/
    ├── main.js      # 入口、输入、主循环
    ├── game.js      # 游戏状态
    ├── board.js     # 棋盘逻辑
    ├── shapes.js    # 形状池
    ├── scoring.js   # 计分
    └── render.js    # Canvas 渲染
```

## 与主项目差异

MVP 仅保留核心循环，未包含：Spine 动画、皮肤系统、关卡配置、宝石模式、智能出题算法等。
