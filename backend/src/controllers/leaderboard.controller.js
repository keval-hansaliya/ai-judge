import { prisma } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { calculateElo } from '../services/elo.service.js';

export const getLeaderboard = asyncHandler(async (req, res) => {
  const { category } = req.query;

  if (!category || category === 'All') {
    const models = await prisma.model.findMany({
      orderBy: { elo: 'desc' },
      select: {
        id: true,
        name: true,
        elo: true,
        wins: true,
        losses: true,
        ties: true,
        totalBattles: true
      }
    });

    return res.status(200).json(
      new ApiResponse(200, models, "Global leaderboard retrieved successfully")
    );
  }

  // Category-specific domain leaderboard
  const models = await prisma.model.findMany();
  const categoryBattles = await prisma.battle.findMany({
    where: {
      category: category,
      winner: { not: null }
    },
    orderBy: { createdAt: 'asc' }
  });

  const modelStats = {};
  models.forEach(m => {
    modelStats[m.id] = {
      id: m.id,
      name: m.name,
      elo: 1000,
      wins: 0,
      losses: 0,
      ties: 0,
      totalBattles: 0
    };
  });

  for (const battle of categoryBattles) {
    const mA = modelStats[battle.modelAId];
    const mB = modelStats[battle.modelBId];

    if (!mA || !mB) continue;

    const { newRatingA, newRatingB } = calculateElo(mA.elo, mB.elo, battle.winner);
    mA.elo = newRatingA;
    mB.elo = newRatingB;

    mA.totalBattles++;
    mB.totalBattles++;

    if (battle.winner === 'A') {
      mA.wins++;
      mB.losses++;
    } else if (battle.winner === 'B') {
      mB.wins++;
      mA.losses++;
    } else {
      mA.ties++;
      mB.ties++;
    }
  }

  const sortedList = Object.values(modelStats).sort((a, b) => b.elo - a.elo);

  res.status(200).json(
    new ApiResponse(200, sortedList, `${category} category leaderboard retrieved successfully`)
  );
});
