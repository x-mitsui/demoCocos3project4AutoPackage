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
export const gemstone3 = {
    percent: 0.23,
    gemCountOfEachOption: 2,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 2, y: 0 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 3,
        targetCol: 0.5,
        dragOptionIndex: 0,
        offset2FirstRow: 1,
        offset2FirstCol: 0,
    },
    desti: [
        {
            blockIdx: B,
            destiScore: 7,
        },
        {
            blockIdx: C,
            destiScore: 7,
        },
        {
            blockIdx: D,
            destiScore: 7,
        },
        {
            blockIdx: E,
            destiScore: 7,
        },
        {
            blockIdx: A,
            destiScore: 7,
        },
    ],
    ques: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, B, 1, B, 1, B, 0, 0],
        [0, 0, 1, 0, 1, 0, 0, 0],
        [0, C, 1, E, 1, C, 0, 0],
        [0, 1, A, 1, A, 1, 0, 0],
        [0, D, 1, E, 1, D, 0, 0],
        [0, 1, D, 1, D, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0],
    ],
    answers: [
        {
            shapes: [
                [
                    [1, 1],
                    [A, 0],
                    [E, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, 1],
                    [0, B],
                    [C, 1],
                ],
            ],
        },
        {
            shapes: [[[1, D, 1, D, 1]]],
        },
    ],
};
