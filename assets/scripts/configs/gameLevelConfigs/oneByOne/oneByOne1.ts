import { X } from "../blockKinds";
import { GameLevelConfig } from "../types";

export const oneByOne1: GameLevelConfig = {
    // totalPlacements: 9,
    // bestScoreSpecific: 300,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 4, y: 3 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 4,
        targetCol: 4,
        dragOptionIndex: 0,
        offset2FirstRow: 0,
        offset2FirstCol: 1,
    },
    ques: [
        [X, X, X, 5, 5, 5, X, X],
        [X, X, X, 4, 4, 4, X, X],
        [X, X, X, 2, 2, 2, X, X],
        [X, X, X, 6, 6, 6, X, X],
        [X, X, X, 0, 0, 0, X, X],
        [X, X, X, 7, 7, 7, X, X],
        [X, X, X, 1, 1, 1, X, X],
        [X, X, X, 3, 3, 3, X, X],
    ],
    answers: [
        null,
        {
            // blockIndex: 4,
            shapes: [[[4, 4, 4]]],
        },
        null,
    ],
};
