/**
 * Arena battle categories — used in Arena form and Leaderboard filter.
 */
export const CATEGORIES = ['General', 'Coding', 'Math', 'Reasoning', 'Creative'];

/**
 * Category icons for visually rich category selectors.
 */
export const CATEGORY_ICONS = {
  General: '🌐',
  Coding: '💻',
  Math: '📐',
  Reasoning: '🧠',
  Creative: '🎨',
};

/**
 * Leaderboard category filter — includes "All" as global view.
 */
export const LB_CATEGORIES = ['All', 'General', 'Coding', 'Math', 'Reasoning', 'Creative'];

/**
 * Category-specific example prompts to seed the prompt textarea.
 */
export const CATEGORY_PLACEHOLDERS = {
  Coding: 'e.g. Write a Python function for binary search...',
  Math: 'e.g. Solve integral of x^2 * e^x dx step by step...',
  Reasoning: 'e.g. A bat and ball cost $1.10. The bat costs $1 more than the ball...',
  Creative: 'e.g. Write a short sci-fi story about quantum AI...',
  General: 'e.g. Give 3 quick tips to stay fit and healthy...',
};

/**
 * Random prompts per category — used by the "Random Prompt" button in the Arena.
 */
export const RANDOM_PROMPTS = {
  General: [
    'What are 3 underrated habits that dramatically improve focus and mental clarity?',
    'Explain the concept of opportunity cost with a real-world everyday example.',
    'What is the difference between intelligence and wisdom?',
    'Give me a compelling argument for and against social media.',
    'What makes a great leader? Describe 5 key traits with examples.',
  ],
  Coding: [
    'Write a Python function that finds the longest palindromic substring in a string.',
    'Implement a debounce function in JavaScript with TypeScript types.',
    'Explain the difference between BFS and DFS, then implement both in Python.',
    'Write a SQL query to find the top 3 products by revenue per category.',
    'Design a rate limiter in Python using a sliding window algorithm.',
  ],
  Math: [
    'Solve the integral of x² · eˣ dx step by step using integration by parts.',
    'Prove that the square root of 2 is irrational.',
    'Explain Bayes theorem with a worked medical diagnosis example.',
    'What is the sum of the infinite series 1 + 1/2 + 1/4 + 1/8 + ...? Show derivation.',
    'Find all solutions to the equation z³ = 1 in the complex plane.',
  ],
  Reasoning: [
    'A bat and ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?',
    'There are 3 boxes: one has apples, one has oranges, one has both. All labels are wrong. You can pick one fruit from one box. How do you label all correctly?',
    'If all Bloops are Razzies, and all Razzies are Lazzies, are all Bloops definitely Lazzies?',
    'A man builds a house with four walls, each facing south. A bear walks by. What color is the bear?',
    'You have two ropes, each takes exactly 1 hour to burn but burns unevenly. How do you measure 45 minutes?',
  ],
  Creative: [
    'Write a 200-word short story where the villain turns out to be a time-traveling librarian.',
    'Compose a haiku sequence (5 haikus) about the lifecycle of a star.',
    'Write a product listing for a magic potion that causes people to speak only in rhymes.',
    'Describe a futuristic city in the year 2150 where AI and humans share equal governance.',
    'Write a dialogue between Isaac Newton and a modern-day machine learning researcher.',
  ],
};

/**
 * Returns a random prompt string for a given category.
 * @param {string} category
 * @returns {string}
 */
export function getRandomPrompt(category) {
  const pool = RANDOM_PROMPTS[category] || RANDOM_PROMPTS.General;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Provider metadata for badge icons and accent colors.
 */
export const PROVIDER_META = {
  Groq: {
    name: 'Groq LPUs',
    icon: '⚡',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.4)',
    tag: 'Ultra-Fast LPU',
  },
  Google: {
    name: 'Google AI',
    icon: '♊',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    tag: 'DeepMind 1M',
  },
  OpenRouter: {
    name: 'OpenRouter',
    icon: '🌐',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    tag: 'Multi-Cloud',
  },
};

/**
 * Multi-provider model pool for Named Playground and Arena evaluations.
 * Combines ultra-fast Groq models, Google Gemini, and verified OpenRouter models.
 */
export const AVAILABLE_MODELS = [
  // ── Groq (Ultra-Fast LPUs) ──
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B (Groq)',
    provider: 'Groq',
    contextWindow: '128K',
    strengths: ['Frontier Reasoning', 'Coding', 'Long Context'],
    description: 'High-capacity 120-billion parameter open model served with blazing speed on Groq LPUs.',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B (Groq)',
    provider: 'Groq',
    contextWindow: '128K',
    strengths: ['Instant Speed', 'General QA', 'Math'],
    description: 'Lightweight 20B reasoning model engineered for near-instantaneous token generation.',
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B (Groq)',
    provider: 'Groq',
    contextWindow: '32K',
    strengths: ['Multilingual', 'STEM', 'Code'],
    description: "Alibaba's advanced 27B model renowned for deep multilingual comprehension and coding.",
  },
  {
    id: 'allam-2-7b',
    name: 'Allam 2 7B (Groq)',
    provider: 'Groq',
    contextWindow: '8K',
    strengths: ['Conversational', 'Concise', 'Agile'],
    description: 'Efficient 7-billion parameter compact model optimized for agile conversational exchanges.',
  },

  // ── Google Gemini ──
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite (Google)',
    provider: 'Google',
    contextWindow: '1M',
    strengths: ['Massive 1M Context', 'Deep Logic', 'General Knowledge'],
    description: "Google DeepMind's efficient flash architecture featuring an industry-leading 1-million token context window.",
  },

  // ── OpenRouter Free Models ──
  {
    id: 'deepseek/deepseek-v4-flash-0731:free',
    name: 'DeepSeek V4 Flash (Free)',
    provider: 'OpenRouter',
    contextWindow: '64K',
    strengths: ['Mathematical Logic', 'Code Synthesis'],
    description: "DeepSeek's next-generation flash model optimized for technical reasoning and algorithmic analysis.",
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron 3.5 Lightning (Free)',
    provider: 'OpenRouter',
    contextWindow: '128K',
    strengths: ['Instruction Adherence', 'Technical QA'],
    description: "NVIDIA's customized open architecture tuned for precise instruction following.",
  },
  {
    id: 'liquid/lfm-2.5-2.6b:free',
    name: 'Liquid LFM 2.5 (Free)',
    provider: 'OpenRouter',
    contextWindow: '32K',
    strengths: ['Dynamic Memory', 'Non-Transformer'],
    description: "Liquid AI's non-transformer architecture offering continuous state-space neural modeling.",
  },
  {
    id: 'inclusionai/ling-3.0-flash-fin:free',
    name: 'Ling 3.0 Flash Fin (Free)',
    provider: 'OpenRouter',
    contextWindow: '32K',
    strengths: ['Financial Analysis', 'Quantitative Logic'],
    description: 'Domain-specialized financial and numerical analysis language model.',
  },
  {
    id: 'cohere/north-mini-code:free',
    name: 'Cohere North Mini Code (Free)',
    provider: 'OpenRouter',
    contextWindow: '32K',
    strengths: ['Code Review', 'Bug Fixing', 'Python/JS'],
    description: "Cohere's code-specialized miniature model engineered for software engineering prompts.",
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    name: 'Dots 3 Note Preview (Free)',
    provider: 'OpenRouter',
    contextWindow: '32K',
    strengths: ['Creative Drafting', 'Summarization'],
    description: 'Specialized text synthesizer tailored for structured notes and creative drafting.',
  },
];

