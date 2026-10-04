/**
 * List of verified, active multi-provider models for Arena battles, benchmarks, and playground.
 * Supports: Groq (ultra-fast LPUs), Google Gemini, and OpenRouter Free-tier models.
 */
export const FREE_MODELS = [
  // ── Groq Provider (High-Throughput LPUs) ──
  {
    name: "GPT-OSS 120B (Groq)",
    provider: "groq",
    modelId: "openai/gpt-oss-120b",
    contextWindow: "128K",
    strengths: ["Frontier Reasoning", "Coding", "Long Context"],
    description: "High-capacity 120-billion parameter open model served with blazing speed on Groq LPUs."
  },
  {
    name: "GPT-OSS 20B (Groq)",
    provider: "groq",
    modelId: "openai/gpt-oss-20b",
    contextWindow: "128K",
    strengths: ["Instant Speed", "General QA", "Math"],
    description: "Lightweight 20B reasoning model engineered for near-instantaneous token generation."
  },
  {
    name: "Qwen 3.8 27B (Groq)",
    provider: "groq",
    modelId: "qwen/qwen3.8-27b",
    contextWindow: "32K",
    strengths: ["Multilingual", "STEM", "Code"],
    description: "Alibaba's advanced 27B model renowned for deep multilingual comprehension and coding."
  },
  {
    name: "Allam 2 7B (Groq)",
    provider: "groq",
    modelId: "allam-2-7b",
    contextWindow: "8K",
    strengths: ["Conversational", "Concise", "Agile"],
    description: "Efficient 7-billion parameter compact model optimized for agile conversational exchanges."
  },

  // ── Google Gemini Provider ──
  {
    name: "Gemini 3.5 Flash Lite (Google)",
    provider: "gemini",
    modelId: "gemini-3.5-flash-lite",
    contextWindow: "1M",
    strengths: ["Massive 1M Context", "Deep Logic", "General Knowledge"],
    description: "Google DeepMind's efficient flash architecture featuring an industry-leading 1-million token context window."
  },

  // ── OpenRouter Free Tier Models ──
  {
    name: "DeepSeek V4 Flash (Free)",
    provider: "openrouter",
    modelId: "deepseek/deepseek-v4-flash-0731:free",
    contextWindow: "64K",
    strengths: ["Mathematical Logic", "Code Synthesis"],
    description: "DeepSeek's next-generation flash model optimized for technical reasoning and algorithmic analysis."
  },
  {
    name: "Nemotron 3.5 Lightning (Free)",
    provider: "openrouter",
    modelId: "nvidia/nemotron-3.5-lightning:free",
    contextWindow: "128K",
    strengths: ["Instruction Adherence", "Technical QA"],
    description: "NVIDIA's customized open architecture tuned for precise instruction following."
  },
  {
    name: "Liquid LFM 2.5 (Free)",
    provider: "openrouter",
    modelId: "liquid/lfm-2.5-2.6b:free",
    contextWindow: "32K",
    strengths: ["Dynamic Memory", "Non-Transformer State"],
    description: "Liquid AI's non-transformer architecture offering continuous state-space neural modeling."
  },
  {
    name: "Ling 3.0 Flash Fin (Free)",
    provider: "openrouter",
    modelId: "inclusionai/ling-3.0-flash-fin:free",
    contextWindow: "32K",
    strengths: ["Financial Analysis", "Quantitative Logic"],
    description: "Domain-specialized financial and numerical analysis language model."
  },
  {
    name: "Cohere North Mini Code (Free)",
    provider: "openrouter",
    modelId: "cohere/north-mini-code:free",
    contextWindow: "32K",
    strengths: ["Code Review", "Bug Fixing", "Python/JS"],
    description: "Cohere's code-specialized miniature model engineered for software engineering prompts."
  },
  {
    name: "Dots 3 Note Preview (Free)",
    provider: "openrouter",
    modelId: "dots-studio/dots-3-note-preview:free",
    contextWindow: "32K",
    strengths: ["Creative Drafting", "Summarization"],
    description: "Specialized text synthesizer tailored for structured notes and creative drafting."
  }
];
