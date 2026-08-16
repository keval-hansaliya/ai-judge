const K_FACTOR = 32;

/**
 * Calculates new ELO ratings for two models based on the battle result.
 * @param {number} ratingA - Current Elo of Model A
 * @param {number} ratingB - Current Elo of Model B
 * @param {string} result - The outcome of the battle ("A", "B", or "TIE")
 * @returns {object} Object containing { newRatingA, newRatingB }
 */
export const calculateElo = (ratingA, ratingB, result) => {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  let scoreA = 0.5;
  let scoreB = 0.5;

  if (result === 'A') {
    scoreA = 1;
    scoreB = 0;
  } else if (result === 'B') {
    scoreA = 0;
    scoreB = 1;
  }

  const newRatingA = Math.round(ratingA + K_FACTOR * (scoreA - expectedA));
  const newRatingB = Math.round(ratingB + K_FACTOR * (scoreB - expectedB));

  return {
    newRatingA,
    newRatingB
  };
};
