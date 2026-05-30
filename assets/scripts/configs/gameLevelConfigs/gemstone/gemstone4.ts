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
export const gemstone4 = {
    percent: 0.23,
    gemCountOfEachOption: 2,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 6, y: 0 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 6.5,
        targetCol: 1,
        dragOptionIndex: 0,
        offset2FirstRow: 1,
        offset2FirstCol: 0,
    },
    desti: [
        {
            blockIdx: B,
            destiScore: 22,
        },
        {
            blockIdx: C,
            destiScore: 22,
        },
        {
            blockIdx: D,
            destiScore: 22,
        },
        {
            blockIdx: F,
            destiScore: 22,
        },
        {
            blockIdx: A,
            destiScore: 22,
        },
    ],
    ques: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 0, 0, 0, 0, F, D],
        [0, 1, A, 0, 0, B, 0, F],
        [0, 0, 1, 1, C, 1, 0, B],
        [0, 0, 0, A, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0],
    ],
    answers: [
        {
            shapes: [
                [
                    [0, C, 1],
                    [1, A, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 0],
                    [A, B],
                    [1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, C],
                    [0, C],
                    [1, 1],
                ],
            ],
        },
    ],
};
