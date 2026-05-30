import {
    BRUSH_GEM_BLUE_4_EDGE,
    BRUSH_GREEN_DROP,
    BRUSH_ORANGE_5_EDGE,
    BRUSH_YELLOW_8_EDGE,
    BRUSH_RED_HEART,
    BRUSH_PURPLE_6_EDGE,
} from "../blockKinds";
// 机器人布局
const A = BRUSH_GEM_BLUE_4_EDGE;
const B = BRUSH_GREEN_DROP;
const C = BRUSH_ORANGE_5_EDGE;
const D = BRUSH_YELLOW_8_EDGE;
const E = BRUSH_RED_HEART;
const F = BRUSH_PURPLE_6_EDGE;
export const gemstone7 = {
    percent: 0.16,
    gemCountOfEachOption: 2,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 4, y: 3 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 4.5,
        targetCol: 4,
        dragOptionIndex: 0,
        offset2FirstRow: 1,
        offset2FirstCol: 0,
    },
    desti: [
        {
            blockIdx: B,
            destiScore: 21,
        },
        {
            blockIdx: D,
            destiScore: 21,
        },
        {
            blockIdx: F,
            destiScore: 21,
        },
    ],
    ques: [
        [0, 1, 0, 0, 0, 0, 1, 0],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [0, 1, B, 0, 0, D, 1, 0],
        [0, 1, 0, 0, F, 0, 1, 0],
        [0, 1, 0, F, 0, 0, 1, 0],
        [0, 1, D, 0, 0, B, 1, 0],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [0, 1, 0, 0, 0, 0, 1, 0],
    ],
    answers: [
        {
            shapes: [
                [
                    [0, 1, B],
                    [D, 1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, 1],
                    [B, D],
                    [1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 0],
                    [0, D],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 0],
                    [0, D],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 0],
                    [0, D],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, D],
                    [B, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, B],
                    [F, 0],
                ],
            ],
        },
    ],
};
