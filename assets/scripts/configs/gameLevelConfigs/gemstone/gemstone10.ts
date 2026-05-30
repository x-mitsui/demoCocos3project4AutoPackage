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
export const gemstone10 = {
    percent: 0.25,
    gemCountOfEachOption: 2,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 6, y: 5 },
        autoShapeDragOptionIndex: 1,
    },
    tipConfig: {
        targetRow: 6.5,
        targetCol: 6,
        dragOptionIndex: 1,
        offset2FirstRow: 1,
        offset2FirstCol: 1,
    },
    desti: [
        {
            blockIdx: A,
            destiScore: 18,
        },
        {
            blockIdx: E,
            destiScore: 18,
        },
    ],
    ques: [
        [0, 0, 1, 1, 1, 1, 0, 0],
        [0, E, 0, 0, 0, 0, E, 0],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1],
        [0, E, 0, 0, 0, 0, E, 0],
        [0, 0, A, 0, 0, A, 0, 0],
        [1, 1, 0, 0, 0, 0, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    answers: [
        {
            shapes: [
                [
                    [0, 1, 0],
                    [1, E, 1],
                ],
            ],
        },
        {
            shapes: [
                [
                    [A, 0, 0],
                    [1, E, 1],
                ],
            ],
        },
        {
            shapes: [[[1, A, E, 1, 1]]],
        },
    ],
};
