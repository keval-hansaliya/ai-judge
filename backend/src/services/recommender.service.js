import { prisma } from '../config/db.js';
import { FREE_MODELS } from '../config/freeModels.js';
import { generateResponse } from './ai.service.js';

const RECOMMENDER_SYSTEM_PROMPT = `You are the AI Model Matchmaker for LM Arena (AI Judge).
Your job is to recommend the best Large Language Model(s) from our active platform catalog for a user's specific use case and engineering constraints.

You will receive:
1. The user's described workload / prompt / use case.
2. The user's priority (e.g., 'balanced', 'quality', 'speed', 'cost').
3. The catalog of models currently available in our arena, including their live Elo ratings, provider, context window, and core strengths.

You must analyze the workload and return a STRICT JSON object with this exact structure:
{
  "domain": "Coding" | "Math" | "Reasoning" | "Creative" | "General",
  "analysis": "1-2 sentence executive assessment of workload requirements, throughput needs, and critical constraints.",
  "primaryRecommendation": {
    "modelId": "<matching modelId from catalog>",
    "modelName": "<matching name from catalog>",
    "badge": "Top Match" | "Architectural Fit" | "Quality Champion",
    "matchScore": 95, // integer 70-99 representing percentage match
    "reasoning": "Clear, technical explanation of why this specific model excels at this workload based on its architecture, Elo, and context window.",
    "strengthsHighlight": ["strength1", "strength2"],
    "tradeoff": "Any engineering caveat (e.g., higher latency, context limit, token verbosity)."
  },
  "speedRecommendation": {
    "modelId": "<matching fast modelId from catalog (Groq LPU preferred)>",
    "modelName": "<matching name from catalog>",
    "badge": "Ultra-Low Latency",
    "reasoning": "Why this model is optimal when real-time streaming (<300ms) or high TPS throughput is required."
  },
  "valueRecommendation": {
    "modelId": "<matching cost-efficient or free modelId from catalog>",
    "modelName": "<matching name from catalog>",
    "badge": "Best Value / Budget",
    "reasoning": "Why this model provides maximum ROI and efficiency for high-volume background tasks."
  },
  "keyEngineeringTip": "A practical developer tip for this workload (e.g., temperature setting, system prompt formatting, structured JSON enforcement)."
}

CRITICAL RULES:
- Output STRICT JSON only. No markdown formatting, no backticks, no text before or after.
- You MUST only recommend modelId values that exist in the provided catalog.
- If the workload mentions speed, low latency, real-time, or streaming, prioritize Groq LPU models.
- If the workload involves huge documents or contracts, prioritize 1M context models (like Gemini 3.5 Flash Lite).
- If the workload is coding/software engineering, prioritize models with code synthesis strengths.`;

/**
 * Deterministic fallback recommendation engine in case AI service is unavailable or rate-limited.
 */
function buildFallbackRecommendation(useCase, priority, catalog) {
  const text = (useCase || '').toLowerCase();

  // Detect domain
  let domain = 'General';
  if (/(code|coding|python|javascript|typescript|bug|function|react|sql|api|regex|git|html|css|dev)/i.test(text)) {
    domain = 'Coding';
  } else if (/(math|calculus|algebra|equation|integral|probability|statistics|bayes|formula|proof)/i.test(text)) {
    domain = 'Math';
  } else if (/(logic|reasoning|riddle|deduc|puzzle|fallacy|argue|debate|philosoph)/i.test(text)) {
    domain = 'Reasoning';
  } else if (/(story|poem|novel|creative|character|roleplay|script|metaphor|marketing|copywriting|tone)/i.test(text)) {
    domain = 'Creative';
  }

  // Sort catalog by Elo descending
  const sorted = [...catalog].sort((a, b) => (b.elo || 1000) - (a.elo || 1000));

  // Find domain or general top model
  let primary = sorted[0];
  if (domain === 'Coding') {
    primary = catalog.find(m => m.name.includes('120B') || m.name.includes('Qwen') || m.name.includes('Code') || m.name.includes('DeepSeek')) || sorted[0];
  } else if (domain === 'Math') {
    primary = catalog.find(m => m.name.includes('DeepSeek') || m.name.includes('120B') || m.name.includes('20B')) || sorted[0];
  } else if (domain === 'Reasoning') {
    primary = catalog.find(m => m.name.includes('120B') || m.name.includes('Gemini') || m.name.includes('Nemotron')) || sorted[0];
  } else if (domain === 'Creative') {
    primary = catalog.find(m => m.name.includes('Dots') || m.name.includes('Gemini') || m.name.includes('120B')) || sorted[0];
  }

  // Speed pick (Groq LPU preferred)
  const speedPick = catalog.find(m => m.provider?.toLowerCase() === 'groq' && (m.name.includes('20B') || m.name.includes('Allam'))) ||
    catalog.find(m => m.provider?.toLowerCase() === 'groq') || sorted[1] || sorted[0];

  // Value pick (OpenRouter free or lightweight)
  const valuePick = catalog.find(m => m.name.includes('DeepSeek') || m.name.includes('Nemotron') || m.name.includes('Liquid') || m.name.includes('Flash Lite')) ||
    sorted[sorted.length - 1] || sorted[0];

  return {
    domain,
    analysis: `Identified ${domain} workload requirements emphasizing ${priority === 'speed' ? 'ultra-fast inference throughput' : priority === 'cost' ? 'cost efficiency' : 'solution precision and rubric quality'}.`,
    primaryRecommendation: {
      modelId: primary.modelId,
      modelName: primary.name,
      badge: priority === 'speed' ? 'Speed Optimized' : 'Top Match',
      matchScore: 94,
      reasoning: `Ranked at Arena Elo ${primary.elo || 1000} with ${primary.contextWindow || '128K'} context. Exhibits proven strength in ${primary.strengths ? primary.strengths.join(', ') : 'multi-turn reasoning'}.`,
      strengthsHighlight: primary.strengths || ['High Accuracy', 'Robust Reasoning'],
      tradeoff: primary.provider === 'groq' ? 'Subject to LPU rate limits during peak hours.' : 'Slightly higher generation latency than compact parameter models.'
    },
    speedRecommendation: {
      modelId: speedPick.modelId,
      modelName: speedPick.name,
      badge: 'Ultra-Low Latency',
      reasoning: `Powered by Groq LPUs for near-instant token streaming (>250 tok/s), ideal for user-interactive chat or live agents.`
    },
    valueRecommendation: {
      modelId: valuePick.modelId,
      modelName: valuePick.name,
      badge: 'Best Value / Budget',
      reasoning: `High performance-to-cost ratio, suited for high-volume automated pipeline runs and scalable background jobs.`
    },
    keyEngineeringTip: domain === 'Coding'
      ? 'Pin temperature to 0.1-0.2 and provide concise input/output signatures to maximize syntactical accuracy.'
      : domain === 'Math'
      ? 'Request step-by-step reasoning or Chain-of-Thought in your prompt for rigorous accuracy verification.'
      : 'Use structured markdown or JSON formatting constraints to ensure deterministic output schemas.'
  };
}

/**
 * Generates an intelligent model recommendation for a given user use case.
 *
 * @param {object} params
 * @param {string} params.useCase - The user's workload description
 * @param {string} [params.priority='balanced'] - User priority ('balanced' | 'quality' | 'speed' | 'cost')
 * @returns {Promise<object>} Recommendation analysis
 */
export async function recommendModelForUseCase({ useCase, priority = 'balanced' }) {
  if (!useCase || typeof useCase !== 'string' || useCase.trim().length < 3) {
    throw new Error('Please provide a valid use case description (at least 3 characters).');
  }

  // 1. Fetch live models from database to incorporate current Elo ratings
  const dbModels = await prisma.model.findMany({
    select: {
      id: true,
      name: true,
      provider: true,
      modelId: true,
      elo: true,
      wins: true,
      losses: true,
      ties: true,
      totalBattles: true
    }
  });

  // 2. Merge database Elo stats with static metadata (contextWindow, strengths, description)
  const catalog = (dbModels.length > 0 ? dbModels : FREE_MODELS).map(m => {
    const meta = FREE_MODELS.find(fm => fm.modelId === m.modelId) || {};
    return {
      id: m.id,
      name: m.name,
      provider: m.provider,
      modelId: m.modelId,
      elo: m.elo || 1000,
      totalBattles: m.totalBattles || 0,
      contextWindow: meta.contextWindow || '32K',
      strengths: meta.strengths || ['General Intelligence'],
      description: meta.description || ''
    };
  });

  const catalogSummary = catalog.map(m =>
    `- ${m.name} (modelId: "${m.modelId}", provider: "${m.provider}", Elo: ${m.elo}, Context: ${m.contextWindow}, Strengths: [${m.strengths.join(', ')}])`
  ).join('\n');

  const promptUserMessage = `USER WORKLOAD DESCRIPTION:
"""${useCase.trim()}"""

USER PRIORITY: ${priority}

AVAILABLE MODEL CATALOG IN OUR ARENA:
${catalogSummary}

Analyze the workload requirements and return the recommendation JSON.`;

  // 3. Attempt LLM generation using Gemini or Groq
  try {
    const messages = [
      { role: 'system', content: RECOMMENDER_SYSTEM_PROMPT },
      { role: 'user', content: promptUserMessage }
    ];

    let rawResponse = '';
    try {
      // First try Gemini
      rawResponse = await generateResponse('gemini', 'models/gemini-3.6-flash', messages, {
        temperature: 0.2,
        max_tokens: 2048
      });
    } catch {
      // Fallback to Groq GPT-OSS
      rawResponse = await generateResponse('groq', 'openai/gpt-oss-120b', messages, {
        temperature: 0.2,
        max_tokens: 2048
      });
    }

    if (rawResponse) {
      // Clean up markdown fences or extract JSON block
      let cleaned = rawResponse.trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);

      // Validate that primary model exists in catalog
      const primaryExists = catalog.some(m => m.modelId === parsed?.primaryRecommendation?.modelId);
      if (parsed && parsed.primaryRecommendation && primaryExists) {
        // Attach db id for frontend table highlighting if present
        const dbMatched = catalog.find(m => m.modelId === parsed.primaryRecommendation.modelId);
        if (dbMatched) {
          parsed.primaryRecommendation.databaseId = dbMatched.id;
          parsed.primaryRecommendation.elo = dbMatched.elo;
          parsed.primaryRecommendation.provider = dbMatched.provider;
          parsed.primaryRecommendation.contextWindow = dbMatched.contextWindow;
        }

        const speedMatched = catalog.find(m => m.modelId === parsed?.speedRecommendation?.modelId);
        if (speedMatched) {
          parsed.speedRecommendation.databaseId = speedMatched.id;
          parsed.speedRecommendation.elo = speedMatched.elo;
          parsed.speedRecommendation.provider = speedMatched.provider;
        }

        const valueMatched = catalog.find(m => m.modelId === parsed?.valueRecommendation?.modelId);
        if (valueMatched) {
          parsed.valueRecommendation.databaseId = valueMatched.id;
          parsed.valueRecommendation.elo = valueMatched.elo;
          parsed.valueRecommendation.provider = valueMatched.provider;
        }

        return parsed;
      }
    }
  } catch (llmErr) {
    console.warn('[Recommender] LLM call failed or produced unparseable JSON, falling back to heuristic engine:', llmErr.message);
  }

  // 4. Return robust deterministic fallback
  const fallback = buildFallbackRecommendation(useCase, priority, catalog);
  const primaryDb = catalog.find(m => m.modelId === fallback.primaryRecommendation.modelId);
  if (primaryDb) {
    fallback.primaryRecommendation.databaseId = primaryDb.id;
    fallback.primaryRecommendation.elo = primaryDb.elo;
    fallback.primaryRecommendation.provider = primaryDb.provider;
    fallback.primaryRecommendation.contextWindow = primaryDb.contextWindow;
  }
  const speedDb = catalog.find(m => m.modelId === fallback.speedRecommendation.modelId);
  if (speedDb) {
    fallback.speedRecommendation.databaseId = speedDb.id;
    fallback.speedRecommendation.elo = speedDb.elo;
    fallback.speedRecommendation.provider = speedDb.provider;
  }
  const valueDb = catalog.find(m => m.modelId === fallback.valueRecommendation.modelId);
  if (valueDb) {
    fallback.valueRecommendation.databaseId = valueDb.id;
    fallback.valueRecommendation.elo = valueDb.elo;
    fallback.valueRecommendation.provider = valueDb.provider;
  }

  return fallback;
}
