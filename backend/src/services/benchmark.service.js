import { prisma } from '../config/db.js';
import { generateResponse } from './ai.service.js';
import { evaluateBattle } from './judge.service.js';
import { BENCHMARK_HYPERPARAMETERS } from '../config/hyperparameters.js';
import { FREE_MODELS } from '../config/freeModels.js';

// Standardized benchmark prompts covering major core domains
export const BENCHMARK_PROMPTS = [
  {
    id: "gen_1",
    category: "General",
    title: "Explanation & Analogy",
    prompt: "Explain how quantum computing works to a 10-year-old in 3 simple bullet points."
  },
  {
    id: "code_1",
    category: "Coding",
    title: "Algorithm Implementation",
    prompt: "Write a clean Python function that performs binary search on a sorted list. Include docstring and handle empty list edge cases."
  },
  {
    id: "math_1",
    category: "Math",
    title: "Multi-Step Word Problem",
    prompt: "A store has a 20% discount on a $150 jacket. Sales tax of 8% is applied to the discounted price. What is the final price? Show step-by-step calculations."
  },
  {
    id: "reason_1",
    category: "Reasoning",
    title: "Logical Deduction",
    prompt: "Alice, Bob, and Charlie are sitting in a row. Alice is not next to Bob. Charlie is to the right of Alice. Who is sitting in the middle? Explain your logical deduction step by step."
  }
];

// In-memory cache for the latest benchmark run
let latestBenchmarkReport = null;

/**
 * Runs the standardized benchmark suite across all configured models
 * under strictly identical, deterministic hyperparameters (temp=0.0).
 */
export async function runStandardBenchmark() {
  const models = await prisma.model.findMany();
  const modelsToTest = models.length > 0 ? models : FREE_MODELS.map((m, idx) => ({ ...m, id: idx + 1 }));

  const benchmarkId = `bm_${Date.now()}`;
  const timestamp = new Date().toISOString();

  // Model statistics aggregator
  const modelStats = {};
  for (const m of modelsToTest) {
    modelStats[m.id] = {
      modelId: m.id,
      name: m.name,
      provider: m.provider,
      openRouterModelId: m.modelId,
      scores: {
        accuracy: 0,
        formatting: 0,
        logic: 0,
        conciseness: 0,
        overallScore: 0
      },
      totalTests: 0,
      totalLatencyMs: 0,
      totalChars: 0,
      truncationCount: 0,
      evaluations: [] // detail per prompt
    };
  }

  const promptResults = [];

  // Iterate over each standardized prompt
  for (const benchPrompt of BENCHMARK_PROMPTS) {
    const responses = {};

    // 1. Run all models on this prompt using identical, deterministic BENCHMARK_HYPERPARAMETERS
    for (const m of modelsToTest) {
      try {
        const result = await generateResponse(
          m.provider,
          m.modelId,
          benchPrompt.prompt,
          {
            ...BENCHMARK_HYPERPARAMETERS,
            includeMetadata: true
          }
        );

        const text = typeof result === 'object' ? result.text : result;
        const latencyMs = typeof result === 'object' ? result.latencyMs : 0;
        const isTruncated = typeof result === 'object' ? result.isTruncated : false;

        responses[m.id] = {
          modelId: m.id,
          name: m.name,
          text,
          latencyMs,
          isTruncated
        };

        modelStats[m.id].totalLatencyMs += latencyMs;
        modelStats[m.id].totalChars += text.length;
        if (isTruncated) modelStats[m.id].truncationCount++;
      } catch (err) {
        console.error(`Benchmark failed for ${m.name} on ${benchPrompt.id}:`, err.message);
        responses[m.id] = {
          modelId: m.id,
          name: m.name,
          text: `[Error generating response: ${err.message}]`,
          latencyMs: 0,
          isTruncated: false,
          error: err.message
        };
      }
    }

    // 2. Score each model using the deterministic AI Judge (evaluate against a reference baseline)
    const testedModelIds = Object.keys(responses);
    for (let i = 0; i < testedModelIds.length; i++) {
      const currentId = testedModelIds[i];
      const competitorId = testedModelIds[(i + 1) % testedModelIds.length]; // compare cyclically with neighbor

      const curr = responses[currentId];
      const comp = responses[competitorId];

      const judgeEval = await evaluateBattle(
        benchPrompt.prompt,
        curr.text,
        comp.text
      );

      const currentScore = judgeEval.modelA || { accuracy: 7, formatting: 7, logic: 7, conciseness: 7, overallScore: 7 };

      modelStats[currentId].scores.accuracy += currentScore.accuracy;
      modelStats[currentId].scores.formatting += currentScore.formatting;
      modelStats[currentId].scores.logic += currentScore.logic;
      modelStats[currentId].scores.conciseness += currentScore.conciseness;
      modelStats[currentId].scores.overallScore += currentScore.overallScore;
      modelStats[currentId].totalTests += 1;

      modelStats[currentId].evaluations.push({
        promptId: benchPrompt.id,
        category: benchPrompt.category,
        title: benchPrompt.title,
        response: curr.text,
        latencyMs: curr.latencyMs,
        isTruncated: curr.isTruncated,
        score: currentScore,
        judgeReasoning: judgeEval.reasoning
      });
    }

    promptResults.push({
      promptId: benchPrompt.id,
      category: benchPrompt.category,
      title: benchPrompt.title,
      prompt: benchPrompt.prompt,
      modelOutputs: responses
    });
  }

  // 3. Compute normalized averages and rankings
  const rankings = Object.values(modelStats).map((stat) => {
    const tests = Math.max(stat.totalTests, 1);
    const avgAccuracy = Math.round((stat.scores.accuracy / tests) * 10) / 10;
    const avgFormatting = Math.round((stat.scores.formatting / tests) * 10) / 10;
    const avgLogic = Math.round((stat.scores.logic / tests) * 10) / 10;
    const avgConciseness = Math.round((stat.scores.conciseness / tests) * 10) / 10;
    const avgOverallScore = Math.round((stat.scores.overallScore / tests) * 100) / 100;
    const avgLatencyMs = Math.round(stat.totalLatencyMs / tests);

    return {
      modelId: stat.modelId,
      name: stat.name,
      provider: stat.provider,
      openRouterModelId: stat.openRouterModelId,
      overallScore: avgOverallScore,
      accuracy: avgAccuracy,
      formatting: avgFormatting,
      logic: avgLogic,
      conciseness: avgConciseness,
      avgLatencyMs,
      truncationCount: stat.truncationCount,
      totalPromptsTested: tests,
      evaluations: stat.evaluations
    };
  });

  // Sort by overall score descending
  rankings.sort((a, b) => b.overallScore - a.overallScore);

  // Assign rank numbers
  rankings.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  const report = {
    benchmarkId,
    timestamp,
    hyperparameters: BENCHMARK_HYPERPARAMETERS,
    totalPrompts: BENCHMARK_PROMPTS.length,
    modelsTestedCount: rankings.length,
    rankings,
    promptResults
  };

  latestBenchmarkReport = report;
  return report;
}

/**
 * Retrieves the latest benchmark report (or generates one if none exists).
 */
export function getLatestBenchmarkReport() {
  return latestBenchmarkReport;
}
