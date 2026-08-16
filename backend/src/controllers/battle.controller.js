import { prisma } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateResponse } from '../services/ai.service.js';
import { calculateElo } from '../services/elo.service.js';

export const createBattle = asyncHandler(async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new ApiError(400, "Prompt is required and must be a non-empty string");
  }

  if (prompt.length > 2000) {
    throw new ApiError(400, "Prompt exceeds maximum allowed length of 2000 characters");
  }

  // 1. Select 2 random different models
  const models = await prisma.model.findMany();
  if (models.length < 2) {
    throw new ApiError(500, "Not enough models seeded in the database to run a battle");
  }

  // Shuffle and pick 2 unique models
  const shuffled = models.sort(() => 0.5 - Math.random());
  const modelA = shuffled[0];
  const modelB = shuffled[1];

  // 2. Fetch responses in parallel (reduces overall latency)
  const [responseA, responseB] = await Promise.all([
    generateResponse(modelA.provider, modelA.modelId, prompt),
    generateResponse(modelB.provider, modelB.modelId, prompt)
  ]);

  // 3. Save the battle details in the database (keeping model identity hidden from response)
  const battle = await prisma.battle.create({
    data: {
      userId: req.user.id,
      prompt: prompt.trim(),
      modelAId: modelA.id,
      modelBId: modelB.id,
      responseA,
      responseB
    }
  });

  // 4. Return anonymous responses to the frontend/user to eliminate bias
  res.status(201).json(
    new ApiResponse(
      201,
      {
        battleId: battle.id,
        prompt: battle.prompt,
        responseA: battle.responseA,
        responseB: battle.responseB
      },
      "Battle initiated. Responses generated anonymously."
    )
  );
});

export const voteBattle = asyncHandler(async (req, res) => {
  const battleId = parseInt(req.params.id);
  const { winner } = req.body; // Expected: "A", "B", "TIE"

  if (isNaN(battleId)) {
    throw new ApiError(400, "Invalid battle ID");
  }

  if (!["A", "B", "TIE"].includes(winner)) {
    throw new ApiError(400, "Winner must be either 'A', 'B', or 'TIE'");
  }

  // Execute database updates inside an atomic transaction with row locking
  const result = await prisma.$transaction(async (tx) => {
    // 1. Lock the battle row to prevent duplicate votes from race conditions
    const battles = await tx.$queryRaw`
      SELECT * FROM "Battle" WHERE id = ${battleId} FOR UPDATE
    `;
    const battle = battles[0];

    if (!battle) {
      throw new ApiError(404, "Battle not found");
    }

    if (battle.winner !== null) {
      throw new ApiError(409, "This battle has already been voted on");
    }

    // 2. Lock both model rows in the database to prevent concurrent rating calculation issues
    const models = await tx.$queryRaw`
      SELECT * FROM "Model" WHERE id IN (${battle.modelAId}, ${battle.modelBId}) FOR UPDATE
    `;

    const modelA = models.find(m => m.id === battle.modelAId);
    const modelB = models.find(m => m.id === battle.modelBId);

    if (!modelA || !modelB) {
      throw new ApiError(500, "Associated models for this battle could not be found");
    }

    // 3. Compute the new Elo ratings
    const { newRatingA, newRatingB } = calculateElo(modelA.elo, modelB.elo, winner);

    // 4. Determine wins, losses, and ties modifications
    let winsA = modelA.wins, lossesA = modelA.losses, tiesA = modelA.ties;
    let winsB = modelB.wins, lossesB = modelB.losses, tiesB = modelB.ties;

    if (winner === 'A') {
      winsA++;
      lossesB++;
    } else if (winner === 'B') {
      lossesA++;
      winsB++;
    } else if (winner === 'TIE') {
      tiesA++;
      tiesB++;
    }

    // 5. Update Model A stats & Elo
    await tx.model.update({
      where: { id: modelA.id },
      data: {
        elo: newRatingA,
        wins: winsA,
        losses: lossesA,
        ties: tiesA,
        totalBattles: modelA.totalBattles + 1
      }
    });

    // 6. Update Model B stats & Elo
    await tx.model.update({
      where: { id: modelB.id },
      data: {
        elo: newRatingB,
        wins: winsB,
        losses: lossesB,
        ties: tiesB,
        totalBattles: modelB.totalBattles + 1
      }
    });

    // 7. Update Battle status with the winner and timestamp
    const updatedBattle = await tx.battle.update({
      where: { id: battle.id },
      data: {
        winner,
        votedAt: new Date()
      }
    });

    // 8. Return response containing true model identities now that voting is complete
    return {
      battleId: updatedBattle.id,
      winner: updatedBattle.winner,
      modelA: {
        name: modelA.name,
        oldElo: modelA.elo,
        newElo: newRatingA
      },
      modelB: {
        name: modelB.name,
        oldElo: modelB.elo,
        newElo: newRatingB
      }
    };
  });

  res.status(200).json(
    new ApiResponse(200, result, "Vote recorded and Elo ratings updated successfully")
  );
});
