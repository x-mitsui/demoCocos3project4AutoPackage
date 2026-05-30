import { X } from "../blockKinds";
import { GameLevelConfig } from "../types";

export const oneByOne2: GameLevelConfig = {
    totalPlacements: 9,
    bestScoreSpecific: 300,
    scrollingDashedConfig: {
        shapeFirstBlockRowCol: { x: 0, y: 3 },
        autoShapeDragOptionIndex: 0,
    },
    tipConfig: {
        targetRow: 0,
        targetCol: 5,
        dragOptionIndex: 0,
        offset2FirstRow: 0,
        offset2FirstCol: 2,
    },
    ques: [
        [X, X, X, X, X, X, X, X],
        [X, X, X, X, X, X, X, X],
        [5, 4, 2, 6, 0, 7, 1, 3],
        [5, 4, 2, 6, 0, 7, 1, 3],
        [5, 4, 2, 6, 0, 7, 1, 3],
        [X, X, X, X, X, X, X, X],
        [X, X, X, X, X, X, X, X],
        [X, X, X, X, X, X, X, X],
    ],
    answers: [
        null,
        {
            blockIndex: 4,
            shapes: [[[1], [1], [1]]],
        },
        null,
    ],
};
