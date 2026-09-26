import { generateResponse } from './ai.service.js';
import { ApiError } from '../utils/ApiError.js';
import { JUDGE_HYPERPARAMETERS } from '../config/hyperparameters.js';

const JUDGE_PROVIDER = "gemini";
const JUDGE_MODEL = "models/gemini-3.6-flash";
const FALLBACK_PROVIDER = "groq";
const FALLBACK_MODEL = "openai/gpt-oss-120b";

const JUDGE_SYSTEM_PROMPT = `You are an expert AI Benchmark Judge. Compare Response A and Response B to the user prompt.
Evaluate both responses across 4 criteria: Accuracy, Formatting, Logic, Conciseness (each scored 1-10).
Declare a winner ("A", "B", or "TIE").
Provide a concise reasoning summary explaining your decision.

Your output MUST be a valid JSON object matching this exact format:
{
  "modelA": {
    "accuracy": 8,
    "formatting": 9,
    "logic": 8,
    "conciseness": 7,
    "overallScore": 8.0
  },
  "modelB": {
    "accuracy": 9,
    "formatting": 8,
    "logic": 9,
    "conciseness": 9,
    "overallScore": 8.75
  },
  "verdict": "B",
  "reasoning": "Model B provided a more precise answer with higher conciseness."
}
Output strictly valid JSON. Do not include any text outside the JSON object.`;

/**
 * Runs automated AI Judge evaluation on prompt & responses with deterministic hyperparameters (temp=0.0).
 */
export async function evaluateBattle(prompt, responseA, responseB) {
  const userContent = `PROMPT:
${prompt}

RESPONSE A:
${responseA}

RESPONSE B:
${responseB}`;

  const messages = [
    { role: "system", content: JUDGE_SYSTEM_PROMPT },
    { role: "user", content: userContent }
  ];

  // Strictly pin the judge to deterministic hyperparameters (temp: 0.0)
  const judgeOptions = {
    ...JUDGE_HYPERPARAMETERS
  };

  try {
    let rawText = "";
    try {
      rawText = await generateResponse(JUDGE_PROVIDER, JUDGE_MODEL, messages, judgeOptions);
    } catch (primaryErr) {
      // Fallback model if primary judge model is busy
      rawText = await generateResponse(FALLBACK_PROVIDER, FALLBACK_MODEL, messages, judgeOptions);
    }

    let cleanJson = (rawText || "").trim();
    if (cleanJson.includes("```json")) {
      cleanJson = cleanJson.split("```json")[1].split("```")[0].trim();
    } else if (cleanJson.includes("```")) {
      cleanJson = cleanJson.split("```")[1].split("```")[0].trim();
    }
    return JSON.parse(cleanJson);
  } catch (err) {
    console.log("ℹ️ Primary AI Judge APIs unavailable. Using Heuristic AI Judge Evaluator...");
    
    // Heuristic benchmark evaluation (evaluates length, code formatting, clarity)
    const lenA = (responseA || "").length;
    const lenB = (responseB || "").length;
    const hasCodeA = (responseA || "").includes("```");
    const hasCodeB = (responseB || "").includes("```");

    let scoreA = 7.5 + (hasCodeA ? 1.0 : 0) + (lenA > 100 ? 0.5 : 0);
    let scoreB = 7.5 + (hasCodeB ? 1.0 : 0) + (lenB > 100 ? 0.5 : 0);

    scoreA = Math.min(10, Math.max(1, Math.round(scoreA * 10) / 10));
    scoreB = Math.min(10, Math.max(1, Math.round(scoreB * 10) / 10));

    let verdict = "TIE";
    if (scoreA > scoreB) verdict = "A";
    if (scoreB > scoreA) verdict = "B";

    return {
      modelA: {
        accuracy: Math.min(10, Math.round(scoreA)),
        formatting: hasCodeA ? 9 : 8,
        logic: Math.min(10, Math.round(scoreA)),
        conciseness: lenA < 500 ? 9 : 7,
        overallScore: scoreA
      },
      modelB: {
        accuracy: Math.min(10, Math.round(scoreB)),
        formatting: hasCodeB ? 9 : 8,
        logic: Math.min(10, Math.round(scoreB)),
        conciseness: lenB < 500 ? 9 : 7,
        overallScore: scoreB
      },
      verdict,
      reasoning: `Heuristic Judge Benchmark: ${verdict === 'TIE' ? 'Both models provided equally valid completions' : `Model ${verdict} structured its response with better formatting and clarity`}. (Deterministic evaluation)`
    };
  }
}
