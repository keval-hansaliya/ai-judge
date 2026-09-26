/**
 * Centralized Hyperparameter Definitions for AI Judge Arena & Benchmark Suite
 * Single source of truth to guarantee fair and standardized evaluation across models.
 */

// Live Interactive Arena Battles (natural conversational variety)
export const ARENA_HYPERPARAMETERS = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 2048,
  frequency_penalty: 0.0,
  presence_penalty: 0.0
};

// Benchmark Test Suite (strictly deterministic, zero-sampling-noise for reproducible rankings)
export const BENCHMARK_HYPERPARAMETERS = {
  temperature: 0.0,
  top_p: 1.0,
  max_tokens: 1536,
  frequency_penalty: 0.0,
  presence_penalty: 0.0
};

// Automated LLM-as-a-Judge Evaluation (pinned to zero temperature for stable rubric grading)
export const JUDGE_HYPERPARAMETERS = {
  temperature: 0.0,
  top_p: 1.0,
  max_tokens: 2048,
  frequency_penalty: 0.0,
  presence_penalty: 0.0
};

// Category-specific presets for live Arena if desired
export const CATEGORY_PRESETS = {
  General: { temperature: 0.7, top_p: 0.9, max_tokens: 2048, frequency_penalty: 0.0, presence_penalty: 0.0 },
  Coding: { temperature: 0.2, top_p: 0.85, max_tokens: 2048, frequency_penalty: 0.0, presence_penalty: 0.0 },
  Math: { temperature: 0.1, top_p: 0.8, max_tokens: 2048, frequency_penalty: 0.0, presence_penalty: 0.0 },
  Reasoning: { temperature: 0.3, top_p: 0.9, max_tokens: 2048, frequency_penalty: 0.0, presence_penalty: 0.0 },
  Creative: { temperature: 0.8, top_p: 0.95, max_tokens: 2048, frequency_penalty: 0.0, presence_penalty: 0.0 }
};
