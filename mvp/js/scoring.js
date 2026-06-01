/** 与主项目 GameManager.getBaseScore 一致 */
export function getBaseScore(clearCount) {
  if (clearCount <= 0) return 0;
  if (clearCount === 1) return 10;
  if (clearCount === 2) return 20;
  if (clearCount === 3) return 30;
  if (clearCount === 4) return 120;
  return 200;
}

/**
 * 计分：combo * baseScore + clearCount * 8
 * combo 从 -1 开始，连续消除时递增；连续 3 手未消除则重置为 -1
 */
export function calcRoundScore(clearCount, combo) {
  if (clearCount <= 0) return 0;
  return combo * getBaseScore(clearCount) + clearCount * 8;
}

export function nextComboState(clearCount, combo, noClearRounds) {
  if (clearCount > 0) {
    return { combo: combo + 1, noClearRounds: 0 };
  }
  const rounds = noClearRounds + 1;
  return {
    combo: rounds >= 3 ? -1 : combo,
    noClearRounds: rounds,
  };
}
