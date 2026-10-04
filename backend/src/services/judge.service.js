import { generateResponse } from './ai.service.js';
import { ApiError } from '../utils/ApiError.js';
import { JUDGE_HYPERPARAMETERS } from '../config/hyperparameters.js';

const JUDGE_PROVIDER = "gemini";
const JUDGE_MODEL = "models/gemini-3.6-flash";
const FALLBACK_PROVIDER = "openrouter";
const FALLBACK_MODEL = "liquid/lfm-2.5-2.6b:free";

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
    ...JUDGE_HYPERPARAMETERS,
    max_tokens: 600
  };

  try {
    let rawText = "";
    try {
      rawText = await generateResponse(JUDGE_PROVIDER, JUDGE_MODEL, messages, judgeOptions);
    } catch (primaryErr) {
      console.warn(`Primary judge (${JUDGE_MODEL}) failed: ${primaryErr.message}. Trying fallback (${FALLBACK_MODEL})...`);
      rawText = await generateResponse(FALLBACK_PROVIDER, FALLBACK_MODEL, messages, judgeOptions);
    }

    let cleanJson = (rawText || "").trim();
    if (cleanJson.includes("```json")) {
      cleanJson = cleanJson.split("```json")[1].split("```")[0].trim();
    } else if (cleanJson.includes("```")) {
      cleanJson = cleanJson.split("```")[1].split("```")[0].trim();
    }

    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    const parsed = JSON.parse(cleanJson);
    if (parsed.modelA && parsed.modelB && parsed.verdict) {
      return parsed;
    }
    throw new Error("Missing required evaluation keys in parsed JSON");
  } catch (err) {
    console.log(`ℹ️ AI Judge LLM evaluation unavailable (${err.message}). Using Heuristic AI Judge Evaluator...`);
    
    // Heuristic benchmark evaluation with dynamic, differentiated multi-criteria scoring
    const textA = (responseA || "").trim();
    const textB = (responseB || "").trim();
    const lenA = textA.length;
    const lenB = textB.length;

    const isErrA = !textA || textA.startsWith("[Error") || textA.startsWith("HTTP error");
    const isErrB = !textB || textB.startsWith("[Error") || textB.startsWith("HTTP error");

    const evalText = (text, len, isErr) => {
      if (isErr) {
        return { accuracy: 2, formatting: 3, logic: 2, conciseness: 4, overallScore: 2.75 };
      }

      const hasCode = text.includes("```");
      const hasBullets = /(?:^|\n)\s*[-*•\d]\.?\s+/m.test(text);
      const hasStructure = text.includes("\n\n") || hasBullets || hasCode;
      const hasReasoningWords = /\b(because|therefore|since|step|first|second|conclude|result|thus)\b/i.test(text);

      // Formatting score (1-10)
      let formatting = 6 + (hasStructure ? 2 : 0) + (hasCode ? 1 : 0) + (hasBullets ? 1 : 0);
      formatting = Math.min(10, Math.max(4, formatting));

      // Logic score (1-10)
      let logic = 6 + (hasReasoningWords ? 2 : 0) + (len > 80 ? 1 : 0) + (len > 250 ? 1 : 0);
      logic = Math.min(10, Math.max(4, logic));

      // Conciseness score (1-10)
      let conciseness = 8;
      if (len > 1200) conciseness = 6;
      else if (len > 600) conciseness = 7;
      else if (len < 40) conciseness = 5;

      // Accuracy score (1-10)
      let accuracy = 7 + (len > 100 ? 1 : 0) + (hasReasoningWords ? 1 : 0);
      accuracy = Math.min(10, Math.max(5, accuracy));

      const overallScore = Math.round(((accuracy + formatting + logic + conciseness) / 4) * 100) / 100;
      return { accuracy, formatting, logic, conciseness, overallScore };
    };

    const scoreA = evalText(textA, lenA, isErrA);
    const scoreB = evalText(textB, lenB, isErrB);

    let verdict = "TIE";
    if (scoreA.overallScore > scoreB.overallScore) verdict = "A";
    else if (scoreB.overallScore > scoreA.overallScore) verdict = "B";

    return {
      modelA: scoreA,
      modelB: scoreB,
      verdict,
      reasoning: `Deterministic Heuristic Evaluation: ${
        verdict === 'TIE' 
          ? 'Both models provided balanced, well-structured completions' 
          : `Model ${verdict} demonstrated higher structural quality, clarity, and reasoning completeness.`
      }`
    };
  }
}
