import { prisma } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateResponse, streamResponse } from '../services/ai.service.js';
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

  const initialTurns = [
    {
      turn: 1,
      prompt: prompt.trim(),
      responseA,
      responseB
    }
  ];

  // 3. Save the battle details in the database (keeping model identity hidden from response)
  const battle = await prisma.battle.create({
    data: {
      userId: req.user.id,
      prompt: prompt.trim(),
      modelAId: modelA.id,
      modelBId: modelB.id,
      responseA,
      responseB,
      turns: initialTurns
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
        responseB: battle.responseB,
        turns: initialTurns
      },
      "Battle initiated. Responses generated anonymously."
    )
  );
});

export const streamBattle = asyncHandler(async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new ApiError(400, "Prompt is required and must be a non-empty string");
  }

  const models = await prisma.model.findMany();
  if (models.length < 2) {
    throw new ApiError(500, "Not enough models seeded in the database to run a battle");
  }

  const shuffled = models.sort(() => 0.5 - Math.random());
  const modelA = shuffled[0];
  const modelB = shuffled[1];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const sendSSE = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendSSE('init', { prompt: prompt.trim() });

  let fullA = "";
  let fullB = "";

  try {
    await Promise.all([
      streamResponse(modelA.provider, modelA.modelId, prompt, (chunk) => {
        fullA += chunk;
        sendSSE('chunk_a', { text: chunk });
      }),
      streamResponse(modelB.provider, modelB.modelId, prompt, (chunk) => {
        fullB += chunk;
        sendSSE('chunk_b', { text: chunk });
      })
    ]);

    const initialTurns = [
      { turn: 1, prompt: prompt.trim(), responseA: fullA, responseB: fullB }
    ];

    const battle = await prisma.battle.create({
      data: {
        userId: req.user.id,
        prompt: prompt.trim(),
        modelAId: modelA.id,
        modelBId: modelB.id,
        responseA: fullA,
        responseB: fullB,
        turns: initialTurns
      }
    });

    sendSSE('done', {
      battleId: battle.id,
      turns: initialTurns
    });
  } catch (err) {
    sendSSE('error', { message: err.message || "Streaming failed" });
  } finally {
    res.end();
  }
});

export const streamTurn = asyncHandler(async (req, res) => {
  const battleId = parseInt(req.params.id);
  const { prompt } = req.body;

  if (isNaN(battleId)) {
    throw new ApiError(400, "Invalid battle ID");
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new ApiError(400, "Prompt is required and must be a non-empty string");
  }

  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { modelA: true, modelB: true }
  });

  if (!battle) {
    throw new ApiError(404, "Battle not found");
  }

  if (battle.winner !== null) {
    throw new ApiError(409, "Cannot add follow-up prompt to a battle that has already been voted on");
  }

  const existingTurns = Array.isArray(battle.turns) ? battle.turns : [
    { turn: 1, prompt: battle.prompt, responseA: battle.responseA, responseB: battle.responseB }
  ];

  const messagesA = [];
  const messagesB = [];

  for (const t of existingTurns) {
    messagesA.push({ role: 'user', content: t.prompt });
    messagesA.push({ role: 'assistant', content: t.responseA });

    messagesB.push({ role: 'user', content: t.prompt });
    messagesB.push({ role: 'assistant', content: t.responseB });
  }

  messagesA.push({ role: 'user', content: prompt.trim() });
  messagesB.push({ role: 'user', content: prompt.trim() });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const sendSSE = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendSSE('init', { prompt: prompt.trim(), turn: existingTurns.length + 1 });

  let newResponseA = "";
  let newResponseB = "";

  try {
    await Promise.all([
      streamResponse(battle.modelA.provider, battle.modelA.modelId, messagesA, (chunk) => {
        newResponseA += chunk;
        sendSSE('chunk_a', { text: chunk });
      }),
      streamResponse(battle.modelB.provider, battle.modelB.modelId, messagesB, (chunk) => {
        newResponseB += chunk;
        sendSSE('chunk_b', { text: chunk });
      })
    ]);

    const newTurn = {
      turn: existingTurns.length + 1,
      prompt: prompt.trim(),
      responseA: newResponseA,
      responseB: newResponseB
    };

    const updatedTurns = [...existingTurns, newTurn];

    await prisma.battle.update({
      where: { id: battleId },
      data: {
        turns: updatedTurns,
        responseA: newResponseA,
        responseB: newResponseB
      }
    });

    sendSSE('done', {
      battleId,
      turns: updatedTurns
    });
  } catch (err) {
    sendSSE('error', { message: err.message || "Streaming turn failed" });
  } finally {
    res.end();
  }
});

export const appendTurn = asyncHandler(async (req, res) => {
  const battleId = parseInt(req.params.id);
  const { prompt } = req.body;

  if (isNaN(battleId)) {
    throw new ApiError(400, "Invalid battle ID");
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new ApiError(400, "Prompt is required and must be a non-empty string");
  }

  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { modelA: true, modelB: true }
  });

  if (!battle) {
    throw new ApiError(404, "Battle not found");
  }

  if (battle.winner !== null) {
    throw new ApiError(409, "Cannot add follow-up prompt to a battle that has already been voted on");
  }

  // Parse existing turns array
  const existingTurns = Array.isArray(battle.turns) ? battle.turns : [
    { turn: 1, prompt: battle.prompt, responseA: battle.responseA, responseB: battle.responseB }
  ];

  // Reconstruct conversation history for Model A and Model B
  const messagesA = [];
  const messagesB = [];

  for (const t of existingTurns) {
    messagesA.push({ role: 'user', content: t.prompt });
    messagesA.push({ role: 'assistant', content: t.responseA });

    messagesB.push({ role: 'user', content: t.prompt });
    messagesB.push({ role: 'assistant', content: t.responseB });
  }

  // Append current follow-up prompt
  messagesA.push({ role: 'user', content: prompt.trim() });
  messagesB.push({ role: 'user', content: prompt.trim() });

  // Fetch responses in parallel
  const [newResponseA, newResponseB] = await Promise.all([
    generateResponse(battle.modelA.provider, battle.modelA.modelId, messagesA),
    generateResponse(battle.modelB.provider, battle.modelB.modelId, messagesB)
  ]);

  const newTurn = {
    turn: existingTurns.length + 1,
    prompt: prompt.trim(),
    responseA: newResponseA,
    responseB: newResponseB
  };

  const updatedTurns = [...existingTurns, newTurn];

  const updatedBattle = await prisma.battle.update({
    where: { id: battleId },
    data: {
      turns: updatedTurns,
      responseA: newResponseA,
      responseB: newResponseB
    }
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        battleId: updatedBattle.id,
        turns: updatedTurns
      },
      "Follow-up turn generated successfully."
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
