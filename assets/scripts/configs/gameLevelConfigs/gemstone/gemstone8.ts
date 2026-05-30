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
export const gemstone8 = {
    percent: 0.22,
    gemCountOfEachOption: 2,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 0, y: 2 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 0,
        targetCol: 4,
        dragOptionIndex: 0,
        offset2FirstRow: 0,
        offset2FirstCol: 2,
    },
    desti: [
        {
            blockIdx: D,
            destiScore: 28,
        },
        {
            blockIdx: E,
            destiScore: 28,
        },
    ],
    ques: [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, E, E, E, E, E, E, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, D, D, D, D, D, D, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, E, E, E, E, E, E, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, D, D, D, D, D, D, 0],
    ],
    answers: [
        {
            shapes: [[[1, 1, E, E, 1]]],
        },

        {
            shapes: [
                [
                    [E, D],
                    [E, 0],
                    [1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, D],
                    [0, E],
                    [1, E],
                ],
            ],
        },
        {
            shapes: [[[1, D, 1, 1, 1]]],
        },

        {
            shapes: [[[D, D, D, D]]],
        },
        {
            shapes: [
                [
                    [1, 0],
                    [D, E],
                    [1, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [0, 1],
                    [D, E],
                    [0, 1],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, E, E],
                    [D, 0, 0],
                ],
            ],
        },
        {
            shapes: [
                [
                    [1, D, D],
                    [0, 0, E],
                ],
            ],
        },
        {
            shapes: [
                [
                    [D, E],
                    [E, D],
                ],
            ],
        },
        {
            shapes: [[[D, D, D]]],
        },
        {
            shapes: [[[E, E, E]]],
        },
    ],
};
