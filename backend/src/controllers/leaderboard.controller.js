import { prisma } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getLeaderboard = asyncHandler(async (req, res) => {
  const models = await prisma.model.findMany({
    orderBy: {
      elo: 'desc'
    },
    select: {
      name: true,
      elo: true,
      wins: true,
      losses: true,
      ties: true,
      totalBattles: true
    }
  });

  res.status(200).json(
    new ApiResponse(200, models, "Leaderboard retrieved successfully")
  );
});
