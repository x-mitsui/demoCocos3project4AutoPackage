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
export const gemstone6 = {
    percent: 0.16,
    gemCountOfEachOption: 2,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 1, y: 3 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 1.5,
        targetCol: 4,
        dragOptionIndex: 0,
        offset2FirstRow: 1,
        offset2FirstCol: 0,
    },
    desti: [
        {
            blockIdx: C,
            destiScore: 21,
        },
        {
            blockIdx: E,
            destiScore: 21,
        },
    ],
    ques: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, C, 0, 0, 0, 0, 0, 0],
        [0, 0, C, 0, 0, E, 0, 0],
        [0, C, 0, 0, E, 0, 0, 0],
        [0, 0, C, 0, 0, E, 0, 0],
        [0, C, 0, 0, E, 0, 0, 0],
        [0, 0, C, 0, 0, E, 0, 0],
        [0, C, 0, 0, E, 0, 0, 0],
    ],
    answers: [
        {
            shapes: [
                [
                    [0, 1, E],
                    [C, 1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, E, C],
                    [1, 1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 0],
                    [E, C],
                    [1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, 1, E],
                    [C, 1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, E, C],
                    [1, 1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, 0],
                    [E, C],
                    [1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, 1, E],
                    [C, 1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, E, C],
                    [1, 1, 0],
                ],
            ],
        },
        {
            shapes: [[[E, C]]],
        },
    ],
};
