import { prisma } from '../config/db.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { evaluateBattle } from '../services/judge.service.js';
import { runStandardBenchmark, getLatestBenchmarkReport } from '../services/benchmark.service.js';

export const judgeEvaluation = asyncHandler(async (req, res) => {
  const { battleId, prompt, responseA, responseB } = req.body;

  let targetPrompt = prompt;
  let targetResponseA = responseA;
  let targetResponseB = responseB;

  if (battleId) {
    const battle = await prisma.battle.findUnique({
      where: { id: parseInt(battleId) }
    });

    if (!battle) {
      throw new ApiError(404, "Battle not found");
    }

    targetPrompt = battle.prompt;
    targetResponseA = battle.responseA;
    targetResponseB = battle.responseB;
  }

  if (!targetPrompt || !targetResponseA || !targetResponseB) {
    throw new ApiError(400, "Battle ID or (prompt, responseA, responseB) are required for AI Judge evaluation");
  }

  const evaluation = await evaluateBattle(targetPrompt, targetResponseA, targetResponseB);

  res.status(200).json(
    new ApiResponse(200, evaluation, "Automated AI Judge evaluation completed successfully")
  );
});

export const runBenchmark = asyncHandler(async (req, res) => {
  const report = await runStandardBenchmark();
  res.status(200).json(
    new ApiResponse(200, report, "Standardized benchmark suite executed successfully")
  );
});

export const getBenchmark = asyncHandler(async (req, res) => {
  let report = getLatestBenchmarkReport();
  if (!report) {
    // If no run cached yet, trigger initial run
    report = await runStandardBenchmark();
  }

  res.status(200).json(
    new ApiResponse(200, report, "Latest benchmark report retrieved successfully")
  );
});
